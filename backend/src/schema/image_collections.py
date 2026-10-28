from uuid import UUID
import datetime as dt
from typing import Optional
from pydantic import Field
from schema._base import CamelModel
from schema.portfolios import MediaSchema
from models.image_collection import DisplaySize, PlaybackMode


class CollectionItemSchema(CamelModel):
    id: UUID
    display_size: DisplaySize
    playback_mode: PlaybackMode
    position: int
    portfolio_name: Optional[str] = None
    portfolio_slug: Optional[str] = None
    media: MediaSchema


class CollectionSummarySchema(CamelModel):
    id: UUID
    name: str
    description: Optional[str] = None
    is_active: bool
    item_count: int
    created_at: dt.datetime
    updated_at: Optional[dt.datetime] = None


class CollectionSchema(CollectionSummarySchema):
    items: list[CollectionItemSchema] = []


# Public landing page view
class ActiveCollectionSchema(CamelModel):
    id: UUID
    name: str
    description: Optional[str] = None
    items: list[CollectionItemSchema] = []


class CreateCollectionRequest(CamelModel):
    name: str = Field(min_length=1)
    description: Optional[str] = None


class UpdateCollectionRequest(CamelModel):
    name: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AddCollectionItemsRequest(CamelModel):
    media_ids: list[UUID] = Field(min_length=1)
    display_size: DisplaySize = DisplaySize.m
    playback_mode: PlaybackMode = PlaybackMode.modal


class UpdateCollectionItemRequest(CamelModel):
    display_size: Optional[DisplaySize] = None
    playback_mode: Optional[PlaybackMode] = None


class CollectionOrder(CamelModel):
    order: list[UUID]


# Media picker: every portfolio with its images and videos
class PickerPortfolioSchema(CamelModel):
    id: UUID
    slug: str
    name: Optional[str] = None
    media: list[MediaSchema] = []
