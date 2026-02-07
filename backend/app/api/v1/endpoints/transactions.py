"""
Transaction endpoints for expense tracking.

Now integrated with TransactionAgent for:
- Auto-categorization when category not provided
- Anomaly detection
- Pattern updates
"""
from datetime import datetime
from typing import Annotated, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import get_db, CurrentUser
from app.models.user import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    CategoryCorrectionRequest,
    TransactionResponse,
    TransactionListResponse,
    VoiceTransactionResponse,
    ReceiptTransactionResponse,
)
from app.ai.agents import TransactionAgent
from app.ai.context_manager import ContextManager
from app.ai.feedback import log_category_correction

router = APIRouter()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    request: TransactionCreate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Create a new transaction with AI processing.
    
    - Creates a transaction record for the authenticated user
    - If category is not provided, TransactionAgent auto-categorizes
    - Detects anomalies and sets is_anomaly/anomaly_reason
    - All processing is traced via Opik for observability
    """
    # Initialize AI components
    context_manager = ContextManager(db)
    agent = TransactionAgent(context_manager)
    
    # Prepare transaction dict for agent
    transaction_data = {
        "amount": float(request.amount),
        "merchant": request.merchant,
        "category": request.category,  # May be None
        "timestamp": (request.transaction_at or datetime.utcnow()).isoformat(),
    }
    
    # Default values
    ai_category = request.category or "other"
    ai_confidence = None
    spend_class = request.spend_class
    spend_class_confidence = None
    spend_class_reason = None
    is_anomaly = False
    anomaly_reason = None
    opik_trace_id = None
    
    # Run AI processing for anomaly + spend-class enrichment.
    try:
        result = await agent.process(str(current_user.id), transaction_data)
        if not request.category:
            ai_category = result.category
        ai_confidence = str(result.category_confidence)
        is_anomaly = result.is_anomaly
        anomaly_reason = result.anomaly_reason
        if spend_class is None:
            spend_class = result.spend_class
            spend_class_confidence = (
                str(result.spend_class_confidence)
                if result.spend_class_confidence is not None
                else None
            )
            spend_class_reason = result.spend_class_reason
        else:
            spend_class_reason = "User selected spend class"
            spend_class_confidence = "1.0"
        opik_trace_id = result.opik_trace_id
    except Exception as e:
        # Log but don't fail - graceful degradation
        import traceback
        print(f"AI processing failed: {e}")
        print(f"Full traceback: {traceback.format_exc()}")
        if not request.category:
            ai_category = "other"
        ai_confidence = "0.0"
    
    # Create transaction with AI results
    transaction = Transaction(
        user_id=current_user.id,
        amount=str(request.amount),
        currency=request.currency,
        merchant=request.merchant,
        category=ai_category,
        note=request.note,
        source=request.source,
        transaction_at=request.transaction_at or datetime.utcnow(),
        ai_category_confidence=ai_confidence,
        spend_class=spend_class,
        spend_class_confidence=spend_class_confidence,
        spend_class_reason=spend_class_reason,
        is_anomaly=is_anomaly,
        anomaly_reason=anomaly_reason,
        opik_trace_id=opik_trace_id,
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return transaction


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=50, ge=1, le=100, description="Max transactions to return"),
    offset: int = Query(default=0, ge=0, description="Number of transactions to skip"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    start_date: Optional[datetime] = Query(default=None, description="Filter transactions after this date"),
    end_date: Optional[datetime] = Query(default=None, description="Filter transactions before this date"),
    merchant: Optional[str] = Query(default=None, description="Filter by merchant (partial match)"),
):
    """
    List transactions for the authenticated user with optional filters.
    
    Supports:
    - Pagination (limit/offset)
    - Category filter
    - Date range filter
    - Merchant search (partial match)
    
    Returns transactions ordered by transaction_at descending (newest first).
    """
    # Base query - only user's transactions
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    # Apply filters
    if category:
        query = query.filter(Transaction.category == category)
    
    if start_date:
        query = query.filter(Transaction.transaction_at >= start_date)
    
    if end_date:
        query = query.filter(Transaction.transaction_at <= end_date)
    
    if merchant:
        # Case-insensitive partial match
        query = query.filter(Transaction.merchant.ilike(f"%{merchant}%"))
    
    # Get total count before pagination
    total = query.count()
    
    # Apply ordering and pagination
    transactions = (
        query
        .order_by(desc(Transaction.transaction_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    return TransactionListResponse(
        transactions=transactions,
        total=total,
        limit=limit,
        offset=offset,
        has_more=(offset + len(transactions)) < total,
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Get a specific transaction by ID.
    
    Only returns transaction if it belongs to the authenticated user.
    """
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id)
        .filter(Transaction.user_id == current_user.id)
        .first()
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return transaction


@router.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    request: TransactionUpdate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Update a transaction's category, merchant, or note.
    
    Useful for:
    - User correcting auto-categorization
    - Adding notes after the fact
    - Fixing merchant name
    """
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id)
        .filter(Transaction.user_id == current_user.id)
        .first()
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    updates = request.model_dump(exclude_unset=True)
    if not updates:
        return transaction

    if "amount" in updates and updates["amount"] is not None:
        transaction.amount = str(updates["amount"])
    if "currency" in updates and updates["currency"] is not None:
        transaction.currency = updates["currency"]
    if "merchant" in updates:
        transaction.merchant = updates["merchant"]
    if "category" in updates:
        transaction.category = updates["category"]
    if "note" in updates:
        transaction.note = updates["note"]
    if "spend_class" in updates:
        transaction.spend_class = updates["spend_class"]
        transaction.spend_class_confidence = "1.0" if updates["spend_class"] else None
        transaction.spend_class_reason = "User updated spend class" if updates["spend_class"] else None
    if "transaction_at" in updates and updates["transaction_at"] is not None:
        transaction.transaction_at = updates["transaction_at"]

    # Re-run AI pipeline when significant fields changed, preserving user-provided category/spend_class.
    significant_fields = {"amount", "merchant", "category", "transaction_at"}
    if significant_fields.intersection(updates.keys()):
        context_manager = ContextManager(db)
        agent = TransactionAgent(context_manager)
        try:
            result = await agent.process(
                str(current_user.id),
                {
                    "amount": float(transaction.amount),
                    "merchant": transaction.merchant,
                    "category": transaction.category,
                    "timestamp": transaction.transaction_at.isoformat() if transaction.transaction_at else None,
                },
            )
            if "category" not in updates and result.category:
                transaction.category = result.category
            transaction.ai_category_confidence = str(result.category_confidence)
            transaction.is_anomaly = result.is_anomaly
            transaction.anomaly_reason = result.anomaly_reason
            if "spend_class" not in updates and result.spend_class:
                transaction.spend_class = result.spend_class
                transaction.spend_class_confidence = (
                    str(result.spend_class_confidence)
                    if result.spend_class_confidence is not None
                    else None
                )
                transaction.spend_class_reason = result.spend_class_reason
            transaction.opik_trace_id = result.opik_trace_id
        except Exception as exc:
            print(f"Update AI enrichment failed: {exc}")
    
    db.commit()
    db.refresh(transaction)
    
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Delete a transaction.
    
    Only deletes if transaction belongs to the authenticated user.
    """
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id)
        .filter(Transaction.user_id == current_user.id)
        .first()
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    db.delete(transaction)
    db.commit()
    
    return None


@router.post("/{transaction_id}/category-correction", response_model=TransactionResponse)
async def submit_category_correction(
    transaction_id: UUID,
    request: CategoryCorrectionRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """Apply user category correction and log it to Opik when trace ID exists."""
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id)
        .filter(Transaction.user_id == current_user.id)
        .first()
    )
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    original_category = transaction.category or "other"
    transaction.category = request.new_category
    db.commit()
    db.refresh(transaction)

    if transaction.opik_trace_id:
        confidence = float(transaction.ai_category_confidence or "0")
        log_category_correction(
            trace_id=transaction.opik_trace_id,
            original_category=original_category,
            corrected_category=request.new_category,
            transaction_id=str(transaction.id),
            confidence=confidence,
        )

    return transaction


@router.post("/voice", response_model=VoiceTransactionResponse)
async def parse_voice_transaction(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile, File(...)],
):
    """
    Parse voice input to transaction data.
    
    1. Uploads audio file
    2. Transcribes using Whisper
    3. Parses intent using LLM
    4. Returns structured data for confirmation
    """
    # Initialize AI components
    context_manager = ContextManager(db)
    from app.ai.llm_client import llm_client
    
    # Save uploaded file temporarily
    import shutil
    import tempfile
    import os
    
    # Create temp file with same extension
    suffix = os.path.splitext(file.filename)[1] if file.filename else ".tmp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    
    try:
        # Transcribe
        transcript = await llm_client.transcribe_audio(tmp_path)
        
        # Load context for better parsing
        user_context = await context_manager.load_full_context(str(current_user.id))
        
        # Parse intent
        result = await llm_client.parse_voice_input(transcript, user_context)
        
        # Include the transcript in the response
        result["transcript"] = transcript
        
        return result
        
    except Exception as e:
        print(f"Voice processing failed: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voice processing failed: {str(e)}"
        )
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/receipt", response_model=ReceiptTransactionResponse, status_code=status.HTTP_201_CREATED)
async def parse_receipt_transaction(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile, File(...)],
):
    """
    Parse receipt/invoice file and auto-create the transaction.

    Supports:
    - Images (camera/gallery receipts)
    - PDF invoices
    """
    from io import BytesIO
    from pypdf import PdfReader
    from app.ai.llm_client import llm_client

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")

    content_type = (file.content_type or "").lower()
    context_manager = ContextManager(db)
    agent = TransactionAgent(context_manager)
    user_id = str(current_user.id)
    user_context = await context_manager.load_full_context(user_id)

    if "pdf" in content_type or (file.filename and file.filename.lower().endswith(".pdf")):
        reader = PdfReader(BytesIO(content))
        extracted_text = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
        if not extracted_text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No readable text found in PDF",
            )
        parsed = await llm_client.parse_receipt_text(extracted_text, user_context=user_context)
    elif content_type.startswith("image/"):
        parsed = await llm_client.parse_receipt_image(content, content_type, user_context=user_context)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Upload image or PDF.",
        )

    amount = parsed.get("amount", 0.0)
    merchant = parsed.get("merchant")
    category = parsed.get("category") or "other"
    parsed_currency = parsed.get("currency") or (
        user_context.get("profile", {}).get("identity", {}).get("currency") or "INR"
    )

    transaction_payload = {
        "amount": float(amount),
        "merchant": merchant,
        "category": category,
        "timestamp": parsed.get("transaction_at") or datetime.utcnow().isoformat(),
    }

    ai_result = await agent.process(user_id, transaction_payload)

    final_category = category if category else ai_result.category
    spend_class = ai_result.spend_class
    spend_class_confidence = (
        str(ai_result.spend_class_confidence)
        if ai_result.spend_class_confidence is not None
        else None
    )

    transaction_at = datetime.utcnow()
    raw_transaction_at = parsed.get("transaction_at")
    if isinstance(raw_transaction_at, str) and raw_transaction_at:
        try:
            transaction_at = datetime.fromisoformat(raw_transaction_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            pass

    created = Transaction(
        user_id=current_user.id,
        amount=str(float(amount)),
        currency=parsed_currency,
        merchant=merchant,
        category=final_category,
        note="Auto-added from receipt",
        source="receipt",
        transaction_at=transaction_at,
        ai_category_confidence=str(ai_result.category_confidence),
        spend_class=spend_class,
        spend_class_confidence=spend_class_confidence,
        spend_class_reason=ai_result.spend_class_reason,
        is_anomaly=ai_result.is_anomaly,
        anomaly_reason=ai_result.anomaly_reason,
        opik_trace_id=ai_result.opik_trace_id,
    )
    db.add(created)
    db.commit()
    db.refresh(created)

    return ReceiptTransactionResponse(
        amount=float(amount),
        currency=parsed_currency,
        merchant=merchant,
        category=final_category,
        spend_class=spend_class,
        confidence=float(parsed.get("confidence", 0.0)),
        needs_review=bool(parsed.get("needs_review", False)),
        reason=parsed.get("reason"),
        transaction=created,
        extracted_items=parsed.get("line_items") or [],
    )
