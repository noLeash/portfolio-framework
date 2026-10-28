from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models.user import User
from models.portfolio import Portfolio, PortfolioMedia
from models.image_collection import ImageCollection, ImageCollectionItem
from schema.image_collections import (
    ActiveCollectionSchema,
    AddCollectionItemsRequest,
    CollectionOrder,
    CollectionSchema,
    CollectionSummarySchema,
    CreateCollectionRequest,
    PickerPortfolioSchema,
    UpdateCollectionItemRequest,
    UpdateCollectionRequest,
)
from utils.auth import get_current_user
import crud.image_collection as crud_collection

collection_router = APIRouter()


def get_owned_collection(db: Session, collection_id: UUID, user: User) -> ImageCollection:
    collection = crud_collection.get_collection(db, collection_id, user.id)
    if not collection:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Collection with ID {collection_id} not found")
    return collection


def is_visible(item: ImageCollectionItem) -> bool:
    return item.media.deleted_at is None and item.media.portfolio.deleted_at is None


# Public: backs the landing page, so no login required
@collection_router.get("/active", response_model=ActiveCollectionSchema)
def get_active_collection(db: Session = Depends(get_db)):
    collection = crud_collection.get_active_collection(db)
    if not collection:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active collection")
    active = ActiveCollectionSchema.model_validate(collection)
    active.items = [
        schema for schema, item in zip(active.items, collection.items) if is_visible(item)
    ]
    return active


@collection_router.get("/media-options", response_model=list[PickerPortfolioSchema])
def list_media_options(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Every portfolio with its images and videos, for picking collection items."""
    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.deleted_at.is_(None))
        .options(selectinload(Portfolio.media))
        .order_by(Portfolio.position)
        .all()
    )
    return [
        PickerPortfolioSchema(
            id=p.id,
            slug=p.slug,
            name=p.name,
            media=[m for m in p.media if m.deleted_at is None],
        )
        for p in portfolios
    ]


@collection_router.get("", response_model=list[CollectionSummarySchema])
def list_collections(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return crud_collection.list_collections(db, user.id)


@collection_router.post("", response_model=CollectionSchema, status_code=status.HTTP_201_CREATED)
def create_collection(
    body: CreateCollectionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    collection = ImageCollection(user_id=user.id, name=body.name, description=body.description)
    db.add(collection)
    db.commit()
    db.refresh(collection)
    return collection


@collection_router.get("/{collection_id}", response_model=CollectionSchema)
def get_collection(collection_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_owned_collection(db, collection_id, user)


@collection_router.patch("/{collection_id}", response_model=CollectionSchema)
def update_collection(
    collection_id: UUID,
    body: UpdateCollectionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    collection = get_owned_collection(db, collection_id, user)
    if body.name is not None:
        collection.name = body.name
    if "description" in body.model_fields_set:
        collection.description = body.description
    if body.is_active is not None:
        if body.is_active and not collection.is_active:
            crud_collection.deactivate_all(db)
        collection.is_active = body.is_active
    db.commit()
    db.refresh(collection)
    return collection


@collection_router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(collection_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    collection = get_owned_collection(db, collection_id, user)
    db.delete(collection)
    db.commit()


@collection_router.post("/{collection_id}/items", response_model=CollectionSchema)
def add_collection_items(
    collection_id: UUID,
    body: AddCollectionItemsRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    collection = get_owned_collection(db, collection_id, user)
    existing = {item.media_id for item in collection.items}
    wanted = [media_id for media_id in dict.fromkeys(body.media_ids) if media_id not in existing]

    media = {
        m.id: m
        for m in db.query(PortfolioMedia).filter(PortfolioMedia.id.in_(wanted)).all()
    }
    missing = [str(media_id) for media_id in wanted if media_id not in media]
    if missing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Media not found: {', '.join(missing)}")
    # keep the order the images were picked in
    position = crud_collection.next_item_position(db, collection.id)
    for offset, media_id in enumerate(wanted):
        collection.items.append(ImageCollectionItem(
            media_id=media_id,
            display_size=body.display_size,
            playback_mode=body.playback_mode,
            position=position + offset,
        ))
    db.commit()
    db.refresh(collection)
    return collection


@collection_router.patch("/{collection_id}/items/{item_id}", response_model=CollectionSchema)
def update_collection_item(
    collection_id: UUID,
    item_id: UUID,
    body: UpdateCollectionItemRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    collection = get_owned_collection(db, collection_id, user)
    item = crud_collection.get_item(db, collection.id, item_id)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Item with ID {item_id} not found")
    if body.display_size is not None:
        item.display_size = body.display_size
    if body.playback_mode is not None:
        item.playback_mode = body.playback_mode
    db.commit()
    db.refresh(collection)
    return collection


@collection_router.delete("/{collection_id}/items/{item_id}", response_model=CollectionSchema)
def remove_collection_item(
    collection_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    collection = get_owned_collection(db, collection_id, user)
    item = crud_collection.get_item(db, collection.id, item_id)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Item with ID {item_id} not found")
    collection.items.remove(item)
    db.commit()
    db.refresh(collection)
    return collection


@collection_router.patch("/{collection_id}/reorder", response_model=CollectionSchema)
def reorder_collection_items(
    collection_id: UUID,
    body: CollectionOrder,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    collection = get_owned_collection(db, collection_id, user)
    items = {item.id: item for item in collection.items}
    if set(body.order) != set(items):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Order must list every item in the collection exactly once")
    for position, item_id in enumerate(body.order):
        items[item_id].position = position
    db.commit()
    db.expire(collection, ["items"])  # reload in the new order
    db.refresh(collection)
    return collection
