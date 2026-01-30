"""
Transaction endpoints for expense tracking.

Note: LLM-based categorization will be handled by your teammate.
These endpoints provide the basic CRUD operations.
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

router = APIRouter()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    request: TransactionCreate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Create a new transaction.
    
    - Creates a transaction record for the authenticated user
    - If category is not provided, it will be None (LLM categorization can be added later)
    - transaction_at defaults to current time if not provided
    
    Future enhancement (for LLM team):
    - Call TransactionAgent to auto-categorize if category is None
    - Detect anomalies and set is_anomaly/anomaly_reason
    - Update user patterns context
    """
    # Create transaction with user's ID
    transaction = Transaction(
        user_id=current_user.id,
        amount=request.amount,
        currency=request.currency,
        merchant=request.merchant,
        category=request.category,
        note=request.note,
        source=request.source,
        transaction_at=request.transaction_at or datetime.utcnow(),
        # AI fields - to be populated by LLM team
        ai_category_confidence=None,
        is_anomaly=False,
        anomaly_reason=None,
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    # TODO (LLM team): Call TransactionAgent here for:
    # 1. Auto-categorization if category is None
    # 2. Anomaly detection
    # 3. Pattern updates
    # Example:
    # from app.ai.agents import TransactionAgent
    # agent = TransactionAgent(db, current_user)
    # transaction = await agent.process(transaction)
    
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
