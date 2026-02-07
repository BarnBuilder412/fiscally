"""Add transaction classification and traceability fields

Revision ID: 002
Revises: 001
Create Date: 2026-02-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("spend_class", sa.String(length=20), nullable=True))
    op.add_column("transactions", sa.Column("spend_class_confidence", sa.String(length=10), nullable=True))
    op.add_column("transactions", sa.Column("spend_class_reason", sa.String(length=255), nullable=True))
    op.add_column("transactions", sa.Column("opik_trace_id", sa.String(length=100), nullable=True))

    op.create_index("ix_transactions_spend_class", "transactions", ["spend_class"], unique=False)
    op.create_index("ix_transactions_opik_trace_id", "transactions", ["opik_trace_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_transactions_opik_trace_id", table_name="transactions")
    op.drop_index("ix_transactions_spend_class", table_name="transactions")

    op.drop_column("transactions", "opik_trace_id")
    op.drop_column("transactions", "spend_class_reason")
    op.drop_column("transactions", "spend_class_confidence")
    op.drop_column("transactions", "spend_class")
