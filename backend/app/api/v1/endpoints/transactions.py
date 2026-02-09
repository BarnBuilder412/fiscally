"""
Transaction endpoints for expense tracking.

Now integrated with TransactionAgent for:
- Auto-categorization when category not provided
- Anomaly detection
- Pattern updates
"""
from datetime import datetime, timedelta
import base64
import binascii
import hashlib
import logging
import os
import tempfile
from typing import Annotated, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form, Request
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
    SmsBatchIngestRequest,
    SmsBatchIngestResponse,
    VALID_CATEGORIES,
)
from app.ai.agents import TransactionAgent
from app.ai.context_manager import ContextManager
from app.ai.feedback import log_category_correction, log_spend_class_correction
from app.services.currency_conversion import convert_amount, CurrencyConversionError

router = APIRouter()
logger = logging.getLogger(__name__)

VOICE_MAX_UPLOAD_BYTES = 12 * 1024 * 1024
VOICE_MIME_EXTENSION_MAP = {
    "audio/m4a": ".m4a",
    "audio/mp4": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/aac": ".aac",
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/3gpp": ".3gp",
    "audio/3gp": ".3gp",
    "audio/amr": ".amr",
}


def _normalized_text(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def _guess_voice_suffix(filename: Optional[str], mime_type: Optional[str]) -> str:
    """Choose a stable file extension for temporary audio files."""
    ext = os.path.splitext(filename or "")[1].lower()
    if ext and 2 <= len(ext) <= 6:
        return ext
    return VOICE_MIME_EXTENSION_MAP.get((mime_type or "").lower(), ".m4a")


def _extract_audio_from_base64(audio_base64: str) -> tuple[bytes, Optional[str]]:
    """
    Decode base64 audio payload.

    Supports both plain base64 and data URI payloads:
    - "<base64>"
    - "data:audio/m4a;base64,<base64>"
    """
    payload = audio_base64.strip()
    mime_type: Optional[str] = None

    if payload.startswith("data:") and "," in payload:
        header, payload = payload.split(",", 1)
        # Example header: data:audio/m4a;base64
        mime_part = header.split(";")[0]
        if mime_part.startswith("data:"):
            mime_type = mime_part[5:].lower() or None
    payload = "".join(payload.split())

    try:
        decoded = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid audio_base64 payload",
        ) from exc

    if not decoded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio payload",
        )

    return decoded, mime_type


def _compute_sms_dedupe_key(
    amount: float,
    merchant: Optional[str],
    category: str,
    transaction_at: datetime,
    sender: Optional[str],
) -> str:
    payload = "|".join(
        [
            f"{amount:.2f}",
            _normalized_text(merchant),
            _normalized_text(category),
            transaction_at.replace(second=0, microsecond=0).isoformat(),
            _normalized_text(sender),
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _infer_category_from_receipt_keywords(
    merchant: Optional[str],
    line_items: list[str],
) -> Optional[str]:
    """Heuristic category fallback for receipt flows when AI returns 'other'."""
    corpus = f"{merchant or ''} {' '.join(line_items)}".lower()
    if not corpus.strip():
        return None

    rules = [
        ("food_delivery", ["swiggy", "zomato", "domino", "pizza", "delivery"]),
        ("restaurant", ["restaurant", "cafe", "coffee", "dine", "meal", "burger", "kfc", "mcdonald"]),
        ("groceries", ["grocery", "supermarket", "mart", "vegetable", "milk", "bigbasket", "dmart"]),
        ("transport", ["uber", "ola", "rapido", "metro", "fuel", "petrol", "diesel", "taxi"]),
        ("shopping", ["amazon", "flipkart", "myntra", "store", "fashion", "electronics", "mall"]),
        ("bills", ["electricity", "water", "broadband", "internet", "recharge", "utility"]),
        ("health", ["pharmacy", "hospital", "clinic", "medicine", "medic"]),
        ("education", ["school", "college", "course", "tuition", "bookstore", "exam"]),
        ("entertainment", ["movie", "cinema", "netflix", "spotify", "game", "theatre"]),
    ]
    for category, keywords in rules:
        if any(keyword in corpus for keyword in keywords):
            return category
    return None


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
    if request.source == "sms" and request.raw_sms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="raw_sms is not accepted. Keep SMS content on-device and send only structured fields.",
        )

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
    except Exception:
        # Log but don't fail - graceful degradation
        logger.exception(
            "Transaction AI enrichment failed for user_id=%s source=%s",
            current_user.id,
            request.source,
        )
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
        raw_sms=None,  # Privacy policy: raw SMS is never persisted server-side.
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
    source: Optional[str] = Query(default=None, description="Filter by source: manual|voice|sms|receipt"),
    spend_class: Optional[str] = Query(default=None, description="Filter by spend class: need|want|luxury"),
    is_anomaly: Optional[bool] = Query(default=None, description="Filter anomaly transactions"),
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

    if source:
        query = query.filter(Transaction.source == source)

    if spend_class:
        query = query.filter(Transaction.spend_class == spend_class)

    if is_anomaly is not None:
        query = query.filter(Transaction.is_anomaly == is_anomaly)
    
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


@router.post("/sms/batch", response_model=SmsBatchIngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_sms_batch(
    request: SmsBatchIngestRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Ingest parsed SMS transactions in batch with duplicate protection.

    This endpoint is Android-SMS specific and keeps ingestion idempotent by
    checking short-window matches for amount/merchant/timestamp/signature.
    Raw SMS bodies are intentionally not accepted.
    """
    context_manager = ContextManager(db)
    agent = TransactionAgent(context_manager)
    user_id = str(current_user.id)
    user_context = await context_manager.load_full_context(user_id)
    fallback_currency = (
        user_context.get("profile", {}).get("identity", {}).get("currency")
        or user_context.get("profile", {}).get("currency")
        or "INR"
    )

    created_count = 0
    duplicate_count = 0
    failed_count = 0
    created_transaction_ids: list[str] = []

    for item in request.transactions:
        try:
            amount_value = float(item.amount)
            merchant = item.merchant.strip() if item.merchant else None
            category = item.category or "other"
            transaction_at = item.transaction_at or datetime.utcnow()
            currency = (item.currency or fallback_currency).upper()
            dedupe_key = item.sms_signature or item.dedupe_key or _compute_sms_dedupe_key(
                amount=amount_value,
                merchant=merchant,
                category=category,
                transaction_at=transaction_at,
                sender=item.sms_sender,
            )
            dedupe_key = dedupe_key.strip().lower()

            # Duplicate check in a tight time window to avoid repeated ingestion.
            window_start = transaction_at - timedelta(minutes=2)
            window_end = transaction_at + timedelta(minutes=2)
            candidates = (
                db.query(Transaction)
                .filter(
                    Transaction.user_id == current_user.id,
                    Transaction.source == "sms",
                    Transaction.transaction_at >= window_start,
                    Transaction.transaction_at <= window_end,
                )
                .all()
            )
            signature_marker = f"sig:{dedupe_key}"
            legacy_marker = f"key:{dedupe_key[:16]}"
            is_duplicate = any(
                abs(float(tx.amount) - amount_value) < 0.01
                and _normalized_text(tx.merchant) == _normalized_text(merchant)
                and (
                    signature_marker in _normalized_text(tx.note)
                    or legacy_marker in _normalized_text(tx.note)
                )
                for tx in candidates
            )
            if is_duplicate:
                duplicate_count += 1
                continue

            ai_category = category
            ai_confidence = "1.0" if item.category else "0.0"
            spend_class = None
            spend_class_confidence = None
            spend_class_reason = None
            is_anomaly = False
            anomaly_reason = None
            opik_trace_id = None

            try:
                ai_result = await agent.process(
                    user_id,
                    {
                        "amount": amount_value,
                        "merchant": merchant,
                        "category": item.category,
                        "timestamp": transaction_at.isoformat(),
                    },
                )
                ai_category = item.category or ai_result.category
                ai_confidence = str(ai_result.category_confidence)
                spend_class = ai_result.spend_class
                spend_class_confidence = (
                    str(ai_result.spend_class_confidence)
                    if ai_result.spend_class_confidence is not None
                    else None
                )
                spend_class_reason = ai_result.spend_class_reason
                is_anomaly = ai_result.is_anomaly
                anomaly_reason = ai_result.anomaly_reason
                opik_trace_id = ai_result.opik_trace_id
            except Exception:
                logger.warning(
                    "SMS batch AI enrichment failed for user_id=%s dedupe_key=%s",
                    current_user.id,
                    dedupe_key,
                    exc_info=True,
                )

            note_suffix = f"Auto-tracked via SMS [sig:{dedupe_key}]"
            created = Transaction(
                user_id=current_user.id,
                amount=str(item.amount),
                currency=currency,
                merchant=merchant,
                category=ai_category,
                note=note_suffix,
                source="sms",
                raw_sms=None,
                transaction_at=transaction_at,
                ai_category_confidence=ai_confidence,
                spend_class=spend_class,
                spend_class_confidence=spend_class_confidence,
                spend_class_reason=spend_class_reason,
                is_anomaly=is_anomaly,
                anomaly_reason=anomaly_reason,
                opik_trace_id=opik_trace_id,
            )
            db.add(created)
            db.commit()
            db.refresh(created)
            created_count += 1
            created_transaction_ids.append(str(created.id))
        except Exception:
            db.rollback()
            failed_count += 1
            logger.warning(
                "SMS batch ingest failed for one transaction user_id=%s",
                current_user.id,
                exc_info=True,
            )

    return SmsBatchIngestResponse(
        received_count=len(request.transactions),
        created_count=created_count,
        duplicate_count=duplicate_count,
        failed_count=failed_count,
        created_transaction_ids=created_transaction_ids,
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

    original_spend_class = transaction.spend_class
    original_spend_class_confidence = transaction.spend_class_confidence
    spend_class_changed = False

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
        spend_class_changed = updates["spend_class"] != original_spend_class
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
        except Exception:
            logger.warning(
                "Transaction update AI enrichment failed for transaction_id=%s",
                transaction_id,
                exc_info=True,
            )
    
    db.commit()
    db.refresh(transaction)

    if (
        spend_class_changed
        and transaction.opik_trace_id
        and original_spend_class
        and transaction.spend_class
    ):
        try:
            confidence = float(original_spend_class_confidence or "0")
        except (TypeError, ValueError):
            confidence = 0.0
        log_spend_class_correction(
            trace_id=transaction.opik_trace_id,
            original_spend_class=original_spend_class,
            corrected_spend_class=transaction.spend_class,
            transaction_id=str(transaction.id),
            confidence=confidence,
        )
    
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
    request: Request,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[Optional[UploadFile], File(default=None)] = None,
    audio_base64: Annotated[Optional[str], Form(default=None)] = None,
    mime_type: Annotated[Optional[str], Form(default=None)] = None,
):
    """
    Parse voice input to transaction data.
    
    Accepts either:
    1. Multipart upload (`file`)
    2. Base64 audio payload (`audio_base64`)

    2. Transcribes using Whisper
    3. Parses intent using LLM
    4. Returns structured data for confirmation
    """
    # Backward compatibility: support JSON {"audio_base64": "..."} requests.
    if file is None and not audio_base64:
        content_type = (request.headers.get("content-type") or "").lower()
        if "application/json" in content_type:
            try:
                payload = await request.json()
                if isinstance(payload, dict):
                    audio_base64 = payload.get("audio_base64")
                    mime_type = payload.get("mime_type")
            except Exception:
                logger.warning(
                    "Failed to parse JSON body fallback for voice transaction user_id=%s",
                    current_user.id,
                    exc_info=True,
                )

    if file is None and not audio_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either 'file' or 'audio_base64'",
        )

    audio_bytes: bytes
    resolved_mime_type: Optional[str] = None
    suffix = ".m4a"

    if file is not None:
        resolved_mime_type = (file.content_type or "").lower() or None
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded audio file is empty",
            )
        suffix = _guess_voice_suffix(file.filename, resolved_mime_type)
    else:
        audio_bytes, extracted_mime = _extract_audio_from_base64(audio_base64 or "")
        resolved_mime_type = (mime_type or extracted_mime or "").lower() or None
        suffix = _guess_voice_suffix(None, resolved_mime_type)

    if len(audio_bytes) > VOICE_MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file too large",
        )

    # Initialize AI components
    context_manager = ContextManager(db)
    from app.ai.llm_client import llm_client

    # Save audio to temp file for Whisper ingestion.
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    
    try:
        # Transcribe
        transcript = (await llm_client.transcribe_audio(tmp_path)).strip()
        if not transcript:
            return VoiceTransactionResponse(
                amount=0.0,
                merchant=None,
                category="other",
                confidence=0.0,
                needs_clarification=True,
                clarification_question="I couldn't hear that clearly. Please try again.",
                transcript="",
                fallback_used=True,
                parse_source="fallback",
            )
        
        # Load context for better parsing
        user_context = await context_manager.load_full_context(str(current_user.id))
        
        # Parse intent
        result = await llm_client.parse_voice_input(transcript, user_context)

        # Defensive normalization so response always matches schema.
        try:
            amount = float(result.get("amount", 0.0))
        except (TypeError, ValueError):
            amount = 0.0
        if amount < 0:
            amount = 0.0

        category = result.get("category")
        if not isinstance(category, str) or not category.strip():
            category = "other"
        category = category.strip().lower()
        if category not in VALID_CATEGORIES:
            category = "other"

        merchant = result.get("merchant")
        if merchant is not None:
            merchant = str(merchant).strip()[:255] or None

        try:
            confidence = float(result.get("confidence", 0.0))
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))

        needs_clarification = result.get("needs_clarification", False)
        if isinstance(needs_clarification, str):
            needs_clarification = needs_clarification.lower() in {"true", "1", "yes"}
        else:
            needs_clarification = bool(needs_clarification)

        clarification_question = result.get("clarification_question")
        if clarification_question is not None:
            clarification_question = str(clarification_question).strip()[:255] or None

        # Force clarification when amount is missing/invalid.
        if amount <= 0:
            needs_clarification = True
            clarification_question = (
                clarification_question
                or "I couldn't detect the amount. Please say it once more."
            )

        return VoiceTransactionResponse(
            amount=amount,
            merchant=merchant,
            category=category,
            confidence=confidence,
            needs_clarification=needs_clarification,
            clarification_question=clarification_question,
            transcript=transcript,
            fallback_used=False,
            parse_source="llm_parse",
        )
        
    except Exception:
        logger.exception("Voice processing failed for user_id=%s", current_user.id)
        return VoiceTransactionResponse(
            amount=0.0,
            merchant=None,
            category="other",
            confidence=0.0,
            needs_clarification=True,
            clarification_question="I hit a temporary issue processing that audio. Please try again.",
            transcript=None,
            fallback_used=True,
            parse_source="fallback",
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
        if extracted_text:
            parsed = await llm_client.parse_receipt_text(extracted_text, user_context=user_context)
        else:
            # Scanned PDF fallback: extract embedded image and run vision parse.
            image_bytes = None
            image_mime = None
            for page in reader.pages:
                try:
                    page_images = getattr(page, "images", []) or []
                    for image in page_images:
                        raw_bytes = getattr(image, "data", None)
                        if not raw_bytes:
                            continue
                        image_bytes = raw_bytes
                        image_name = (getattr(image, "name", "") or "").lower()
                        if image_name.endswith(".png"):
                            image_mime = "image/png"
                        elif image_name.endswith(".webp"):
                            image_mime = "image/webp"
                        else:
                            image_mime = "image/jpeg"
                        break
                    if image_bytes:
                        break
                except Exception:
                    continue

            if not image_bytes:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="No readable text or image found in PDF",
                )
            parsed = await llm_client.parse_receipt_image(
                image_bytes,
                image_mime or "image/jpeg",
                user_context=user_context,
            )
    elif content_type.startswith("image/"):
        parsed = await llm_client.parse_receipt_image(content, content_type, user_context=user_context)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Upload image or PDF.",
        )

    amount = parsed.get("amount", 0.0)
    try:
        parsed_amount = float(amount)
    except (TypeError, ValueError):
        parsed_amount = 0.0

    if parsed_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unable to determine payable amount from receipt",
        )

    merchant = parsed.get("merchant")
    parsed_category = parsed.get("category")
    if isinstance(parsed_category, str):
        parsed_category = parsed_category.strip().lower()
        if parsed_category not in VALID_CATEGORIES:
            parsed_category = None
    else:
        parsed_category = None
    primary_currency = (
        user_context.get("profile", {}).get("identity", {}).get("currency")
        or user_context.get("profile", {}).get("currency")
        or "INR"
    ).upper()
    parsed_currency = (parsed.get("currency") or primary_currency).upper()

    conversion_reason: Optional[str] = None
    if parsed_currency != primary_currency:
        try:
            converted_amount, fx_rate = await convert_amount(parsed_amount, parsed_currency, primary_currency)
            parsed_amount = converted_amount
            conversion_reason = (
                f"Converted from {parsed_currency} to {primary_currency} at live market rate "
                f"({fx_rate:.4f})."
            )
            parsed_currency = primary_currency
        except CurrencyConversionError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Unable to convert receipt amount from {parsed_currency} to {primary_currency}: {exc}",
            ) from exc

    line_items = parsed.get("line_items") or []
    line_item_names = []
    if isinstance(line_items, list):
        for item in line_items[:4]:
            if isinstance(item, dict):
                name = item.get("name")
                if isinstance(name, str) and name.strip():
                    line_item_names.append(name.strip())
    merchant_signal = (merchant or "").strip()
    if line_item_names:
        joined_items = ", ".join(line_item_names)
        merchant_signal = f"{merchant_signal} | Items: {joined_items}".strip(" |")

    transaction_payload = {
        "amount": parsed_amount,
        "merchant": merchant_signal or merchant,
        # Force agent categorization; parsed category is used as fallback only.
        "category": None,
        "timestamp": parsed.get("transaction_at") or datetime.utcnow().isoformat(),
        "receipt_category_hint": parsed_category,
    }

    ai_result = await agent.process(user_id, transaction_payload)

    ai_category = (ai_result.category or "").strip().lower()
    if ai_category not in VALID_CATEGORIES:
        ai_category = "other"
    heuristic_category = _infer_category_from_receipt_keywords(merchant_signal or merchant, line_item_names)
    if ai_category != "other":
        final_category = ai_category
    elif parsed_category and parsed_category != "other":
        final_category = parsed_category
    elif heuristic_category:
        final_category = heuristic_category
    else:
        final_category = "other"
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

    # Duplicate suppression for rapid re-uploads of the same receipt.
    duplicate_window_start = transaction_at - timedelta(hours=6)
    duplicate_window_end = transaction_at + timedelta(hours=6)
    candidates = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_at >= duplicate_window_start,
            Transaction.transaction_at <= duplicate_window_end,
        )
        .all()
    )
    merchant_norm = _normalized_text(merchant)
    duplicate_txn = next(
        (
            txn
            for txn in candidates
            if abs(float(txn.amount) - parsed_amount) < 0.01
            and _normalized_text(txn.merchant) == merchant_norm
        ),
        None,
    )

    if duplicate_txn:
        duplicate_reason = "Possible duplicate receipt detected. Reused existing transaction."
        if conversion_reason:
            duplicate_reason = f"{conversion_reason} {duplicate_reason}"
        return ReceiptTransactionResponse(
            amount=parsed_amount,
            currency=parsed_currency,
            merchant=merchant,
            category=final_category,
            spend_class=spend_class,
            confidence=float(parsed.get("confidence", 0.0)),
            needs_review=bool(parsed.get("needs_review", False)),
            duplicate_suspected=True,
            reason=duplicate_reason,
            transaction=duplicate_txn,
            extracted_items=parsed.get("line_items") or [],
        )

    created = Transaction(
        user_id=current_user.id,
        amount=str(parsed_amount),
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

    response_reason = parsed.get("reason")
    if conversion_reason:
        response_reason = f"{conversion_reason} {response_reason}".strip() if response_reason else conversion_reason

    return ReceiptTransactionResponse(
        amount=parsed_amount,
        currency=parsed_currency,
        merchant=merchant,
        category=final_category,
        spend_class=spend_class,
        confidence=float(parsed.get("confidence", 0.0)),
        needs_review=bool(parsed.get("needs_review", False)),
        duplicate_suspected=False,
        reason=response_reason,
        transaction=created,
        extracted_items=parsed.get("line_items") or [],
    )
