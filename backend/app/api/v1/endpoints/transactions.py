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
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.api.deps import get_db, CurrentUser
from app.models.user import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionListResponse,
)
from app.ai.agents import TransactionAgent
from app.ai.context_manager import ContextManager

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
    ai_category = request.category
    ai_confidence = None
    is_anomaly = False
    anomaly_reason = None
    
    # Run AI processing if category not provided
    if not request.category:
        try:
            result = await agent.process(str(current_user.id), transaction_data)
            ai_category = result.category
            ai_confidence = str(result.category_confidence)
            is_anomaly = result.is_anomaly
            anomaly_reason = result.anomaly_reason
        except Exception as e:
            # Log but don't fail - graceful degradation
            print(f"AI processing failed: {e}")
            ai_category = "other"
            ai_confidence = "0.0"
    
    # Create transaction with AI results
    transaction = Transaction(
        user_id=current_user.id,
        amount=request.amount,
        currency=request.currency,
        merchant=request.merchant,
        category=ai_category,
        note=request.note,
        source=request.source,
        transaction_at=request.transaction_at or datetime.utcnow(),
        ai_category_confidence=ai_confidence,
        is_anomaly=is_anomaly,
        anomaly_reason=anomaly_reason,
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
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    category: Optional[str] = None,
    merchant: Optional[str] = None,
    note: Optional[str] = None,
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
    
    # Update only provided fields
    if category is not None:
        transaction.category = category
    if merchant is not None:
        transaction.merchant = merchant
    if note is not None:
        transaction.note = note
    
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
