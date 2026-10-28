from uuid import UUID
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload
from models.project_group import ProjectGroup


def list_groups(db: Session, user_id: UUID):
    return (
        db.query(ProjectGroup)
        .filter(ProjectGroup.user_id == user_id)
        .options(selectinload(ProjectGroup.portfolios))
        .order_by(ProjectGroup.position, ProjectGroup.created_at)
        .all()
    )

def get_group(db: Session, group_id: UUID, user_id: UUID):
    return (
        db.query(ProjectGroup)
        .filter(ProjectGroup.id == group_id, ProjectGroup.user_id == user_id)
        .first()
    )

def get_group_by_name(db: Session, name: str, user_id: UUID):
    return (
        db.query(ProjectGroup)
        .filter(ProjectGroup.name == name, ProjectGroup.user_id == user_id)
        .first()
    )

def next_group_position(db: Session, user_id: UUID) -> int:
    last = (
        db.query(func.max(ProjectGroup.position))
        .filter(ProjectGroup.user_id == user_id)
        .scalar()
    )
    return 0 if last is None else last + 1
