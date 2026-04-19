"""Add auth_provider, google_sub, password_reset columns; make hashed_password nullable

Revision ID: 003
Revises: 002
Create Date: 2026-04-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add auth_provider column (default 'email' for existing users)
    op.add_column('users', sa.Column('auth_provider', sa.String(20), nullable=False, server_default='email'))

    # Add google_sub column with unique constraint
    op.add_column('users', sa.Column('google_sub', sa.String(255), nullable=True))
    op.create_index('ix_users_google_sub', 'users', ['google_sub'], unique=True)

    # Make hashed_password nullable (Google-only users won't have one)
    op.alter_column('users', 'hashed_password', existing_type=sa.String(255), nullable=True)

    # Password reset columns
    op.add_column('users', sa.Column('password_reset_token', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('password_reset_expires', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'password_reset_expires')
    op.drop_column('users', 'password_reset_token')
    op.alter_column('users', 'hashed_password', existing_type=sa.String(255), nullable=False)
    op.drop_index('ix_users_google_sub', table_name='users')
    op.drop_column('users', 'google_sub')
    op.drop_column('users', 'auth_provider')
