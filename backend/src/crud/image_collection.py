from uuid import UUID
from sqlalchemy import func
from sqlalchemy.orm import Session
from models.image_collection import ImageCollection, ImageCollectionItem


def list_collections(db: Session, user_id: UUID):
    return (
        db.query(ImageCollection)
        .filter(ImageCollection.user_id == user_id)
        .order_by(ImageCollection.created_at)
        .all()
    )

def get_collection(db: Session, collection_id: UUID, user_id: UUID):
    return (
        db.query(ImageCollection)
        .filter(ImageCollection.id == collection_id, ImageCollection.user_id == user_id)
        .first()
    )

def get_active_collection(db: Session):
    return db.query(ImageCollection).filter(ImageCollection.is_active.is_(True)).first()

def get_item(db: Session, collection_id: UUID, item_id: UUID):
    return (
        db.query(ImageCollectionItem)
        .filter(ImageCollectionItem.id == item_id, ImageCollectionItem.collection_id == collection_id)
        .first()
    )

def next_item_position(db: Session, collection_id: UUID) -> int:
    last = (
        db.query(func.max(ImageCollectionItem.position))
        .filter(ImageCollectionItem.collection_id == collection_id)
        .scalar()
    )
    return 0 if last is None else last + 1

def deactivate_all(db: Session):
    # clear the current landing page first so the one-active index isn't violated
    db.query(ImageCollection).filter(ImageCollection.is_active.is_(True)).update({"is_active": False})
    db.flush()
