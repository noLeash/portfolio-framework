"""add portfolio primary media

Revision ID: d81f3b6c2e54
Revises: c4e1d2a7f903
Create Date: 2026-10-27 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd81f3b6c2e54'
down_revision: Union[str, None] = 'c4e1d2a7f903'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('portfolio', sa.Column('primary_media_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_portfolio_primary_media_id_portfolio_media', 'portfolio', 'portfolio_media', ['primary_media_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_portfolio_primary_media_id_portfolio_media', 'portfolio', type_='foreignkey')
    op.drop_column('portfolio', 'primary_media_id')
