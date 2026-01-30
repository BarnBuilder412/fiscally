"""Initial schema - users and transactions tables

Revision ID: 001
Revises: 
Create Date: 2026-01-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        # AI Context JSONB columns
        sa.Column('profile', postgresql.JSONB(), nullable=False, default={}),
        sa.Column('patterns', postgresql.JSONB(), nullable=False, default={}),
        sa.Column('insights', postgresql.JSONB(), nullable=False, default={}),
        sa.Column('goals', postgresql.JSONB(), nullable=False, default={}),
        sa.Column('memory', postgresql.JSONB(), nullable=False, default={}),
        # Refresh token
        sa.Column('refresh_token_hash', sa.String(255), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for users table
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    
    # Create transactions table
    op.create_table(
        'transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.String(50), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False, default='INR'),
        sa.Column('merchant', sa.String(255), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('source', sa.String(50), nullable=False),
        sa.Column('raw_sms', sa.Text(), nullable=True),
        sa.Column('ai_category_confidence', sa.String(10), nullable=True),
        sa.Column('is_anomaly', sa.Boolean(), nullable=False, default=False),
        sa.Column('anomaly_reason', sa.String(255), nullable=True),
        sa.Column('transaction_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for transactions table
    op.create_index('ix_transactions_user_id', 'transactions', ['user_id'])
    op.create_index('ix_transactions_category', 'transactions', ['category'])
    op.create_index('ix_transactions_transaction_at', 'transactions', ['transaction_at'])


def downgrade() -> None:
    op.drop_index('ix_transactions_transaction_at', table_name='transactions')
    op.drop_index('ix_transactions_category', table_name='transactions')
    op.drop_index('ix_transactions_user_id', table_name='transactions')
    op.drop_table('transactions')
    
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
