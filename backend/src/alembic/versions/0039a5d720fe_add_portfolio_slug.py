"""add portfolio slug

Revision ID: 0039a5d720fe
Revises: bba546081563
Create Date: 2026-10-27 16:51:23.718488

"""
import re
import unicodedata
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0039a5d720fe'
down_revision: Union[str, None] = 'bba546081563'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Frozen copy of utils/slug.py as of this migration, so later edits there
# can't change what this backfill produces
RESERVED_SLUGS = {"api", "login", "portfolios", "dashboard", "edit", "collections"}


def slugify(text):
    ascii_text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", ascii_text.lower()).strip("_") or "portfolio"


def upgrade() -> None:
    # nullable until existing rows are backfilled
    op.add_column('portfolio', sa.Column('slug', sa.String(), nullable=True))

    conn = op.get_bind()
    taken = set()
    for id_, name in conn.execute(sa.text("SELECT id, name FROM portfolio ORDER BY created_at")):
        base = slugify(name)
        slug, n = base, 2
        while slug in RESERVED_SLUGS or slug in taken:
            slug, n = f"{base}_{n}", n + 1
        taken.add(slug)
        conn.execute(sa.text("UPDATE portfolio SET slug = :slug WHERE id = :id"), {"slug": slug, "id": id_})

    op.alter_column('portfolio', 'slug', existing_type=sa.String(), nullable=False)
    op.create_index(op.f('ix_portfolio_slug'), 'portfolio', ['slug'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_portfolio_slug'), table_name='portfolio')
    op.drop_column('portfolio', 'slug')
