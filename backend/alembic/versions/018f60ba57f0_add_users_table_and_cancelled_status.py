"""add users table and cancelled status

Revision ID: 018f60ba57f0
Revises: b1302cb13f41
Create Date: 2026-03-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '018f60ba57f0'
down_revision: Union[str, None] = 'b1302cb13f41'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'cancelled' to job_status enum
    op.execute("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'cancelled'")
    
    # Create users table only if it doesn't exist
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR NOT NULL PRIMARY KEY,
            name VARCHAR,
            email VARCHAR,
            created_at TIMESTAMP WITHOUT TIME ZONE,
            updated_at TIMESTAMP WITHOUT TIME ZONE,
            clerk_user_id VARCHAR NOT NULL UNIQUE
        )
    """)


def downgrade() -> None:
    op.drop_table('users')
    # Note: PostgreSQL doesn't support removing enum values easily
