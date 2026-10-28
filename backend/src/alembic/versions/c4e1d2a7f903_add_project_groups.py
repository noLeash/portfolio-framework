"""add project groups

Revision ID: c4e1d2a7f903
Revises: 0039a5d720fe
Create Date: 2026-10-27 17:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4e1d2a7f903'
down_revision: Union[str, None] = '0039a5d720fe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('project_group',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('position', sa.Integer(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'name', name='uq_project_group_user_name')
    )
    op.create_index(op.f('ix_project_group_user_id'), 'project_group', ['user_id'], unique=False)
    op.add_column('portfolio', sa.Column('group_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_portfolio_group_id'), 'portfolio', ['group_id'], unique=False)
    op.create_foreign_key('fk_portfolio_group_id_project_group', 'portfolio', 'project_group', ['group_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_portfolio_group_id_project_group', 'portfolio', type_='foreignkey')
    op.drop_index(op.f('ix_portfolio_group_id'), table_name='portfolio')
    op.drop_column('portfolio', 'group_id')
    op.drop_index(op.f('ix_project_group_user_id'), table_name='project_group')
    op.drop_table('project_group')
