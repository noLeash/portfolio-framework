from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.portfolio import Portfolio
from models.project_group import ProjectGroup
from schema.project_groups import (
    AssignGroupRequest,
    CreateGroupRequest,
    GroupOrder,
    GroupSchema,
    UpdateGroupRequest,
)
from utils.auth import get_current_user
import crud.project_group as crud_group

group_router = APIRouter()


def get_owned_group(db: Session, group_id: UUID, user: User) -> ProjectGroup:
    group = crud_group.get_group(db, group_id, user.id)
    if not group:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Group with ID {group_id} not found")
    return group


def ensure_group_name_available(db: Session, name: str, user: User, exclude_id: UUID | None = None):
    existing = crud_group.get_group_by_name(db, name, user.id)
    if existing and existing.id != exclude_id:
        raise HTTPException(status.HTTP_409_CONFLICT, f"A group named {name} already exists")


@group_router.get("", response_model=list[GroupSchema])
def list_groups(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return crud_group.list_groups(db, user.id)


@group_router.post("", response_model=GroupSchema, status_code=status.HTTP_201_CREATED)
def create_group(
    body: CreateGroupRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    name = body.name.strip()
    ensure_group_name_available(db, name, user)
    group = ProjectGroup(
        user_id=user.id,
        name=name,
        description=(body.description or "").strip() or None,
        position=crud_group.next_group_position(db, user.id),
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


# Declared before /{group_id} so "assign" and "reorder" aren't parsed as group IDs
@group_router.post("/assign", response_model=list[GroupSchema])
def assign_portfolios(
    body: AssignGroupRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Moves the portfolios into the group, or out of any group when group_id is null."""
    if body.group_id is not None:
        get_owned_group(db, body.group_id, user)

    portfolios = db.query(Portfolio).filter(Portfolio.id.in_(body.portfolio_ids)).all()
    # get_current_user returns a UserToken whose id is a str, not a UUID
    owned = {p.id for p in portfolios if str(p.user_id) == str(user.id)}
    missing = [str(pid) for pid in body.portfolio_ids if pid not in owned]
    if missing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Portfolios not found: {', '.join(missing)}")

    for portfolio in portfolios:
        portfolio.group_id = body.group_id
    db.commit()
    return crud_group.list_groups(db, user.id)


@group_router.patch("/reorder", response_model=list[GroupSchema])
def reorder_groups(
    body: GroupOrder,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    groups = {g.id: g for g in crud_group.list_groups(db, user.id)}
    for position, group_id in enumerate(body.order):
        if group_id in groups:
            groups[group_id].position = position
    db.commit()
    return crud_group.list_groups(db, user.id)


@group_router.patch("/{group_id}", response_model=GroupSchema)
def update_group(
    group_id: UUID,
    body: UpdateGroupRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    group = get_owned_group(db, group_id, user)
    if body.name is not None and body.name.strip() != group.name:
        name = body.name.strip()
        ensure_group_name_available(db, name, user, exclude_id=group.id)
        group.name = name
    if "description" in body.model_fields_set:
        group.description = (body.description or "").strip() or None
    db.commit()
    db.refresh(group)
    return group


@group_router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Deletes the group; its portfolios stay, ungrouped (ON DELETE SET NULL)."""
    group = get_owned_group(db, group_id, user)
    db.delete(group)
    db.commit()
