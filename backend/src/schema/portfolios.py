from pydantic import BaseModel, Field, computed_field
from uuid import UUID
import datetime as dt
from app_config import settings
from typing import Optional
from schema._base import CamelModel
from models.portfolio import MediaType

def cdn_url(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    return f"https://{settings.CLOUDFRONT_BASE_URL.strip('/')}/{path.lstrip('/')}"

class MediaSchema(CamelModel):
    media_type: MediaType
    content_type: str
    deleted_at: Optional[dt.datetime] = None
    portfolio_id: UUID
    description: Optional[str] = None
    size: Optional[int] = None
    alt_text: Optional[str] = None
    original_width: Optional[int] = None
    filename: str
    original_path: str
    original_height: Optional[int] = None
    id: UUID
    thumbnail_path: Optional[str] = None
    created_at: dt.datetime
    small_path: Optional[str] = None
    position: int
    medium_path: Optional[str] = None
    published_at: Optional[dt.datetime] = None
    large_path: Optional[str] = None
    duration: Optional[float] = None

    @computed_field
    def thumbnail_url(self) -> Optional[str]:
        return cdn_url(self.thumbnail_path)
    
    @computed_field
    def small_url(self) -> Optional[str]:
        return cdn_url(self.small_path)
    
    @computed_field
    def medium_url(self) -> Optional[str]:
        return cdn_url(self.medium_path)
    
    @computed_field
    def large_url(self) -> Optional[str]:
        return cdn_url(self.large_path)
    
    @computed_field
    def original_url(self) -> str:
        return cdn_url(self.original_path)

class EditPortfolioRequest(CamelModel):
    portfolioName: str
    id: Optional[UUID]

class PortfolioSchema(CamelModel):
    id: UUID
    slug: str
    folder: str
    style: Optional[dict] = {}
    name: Optional[str]
    description: Optional[str]
    media: list[MediaSchema] = []
    created_at: dt.datetime
    updated_at: Optional[dt.datetime]

class PortfolioRequest(CamelModel):
    portfolio_name: str
    id: Optional[UUID]
    edit: Optional[bool]

class ListPortfolioSchema(CamelModel):
    id: UUID
    slug: str
    folder: str
    name: Optional[str]
    description: Optional[str]
    position: int
    group_id: Optional[UUID] = None
    published_at: Optional[dt.datetime] = None

# Only fields sent are changed; send null to clear one
class UpdateMediaRequest(CamelModel):
    alt_text: Optional[str] = None
    description: Optional[str] = None

class PurgeDeletedResponse(CamelModel):
    purged: int  # media rows removed
    deleted_files: int  # S3 objects removed
    failed: list[UUID] = []  # media kept because some of their files couldn't be removed

class StartVideoUpload(CamelModel):
    portfolio_id: UUID
    filename: str
    content_type: str
    size: int

class StartVideoUploadResponse(CamelModel):
    video_id: UUID
    key: str
    upload_url: str

class EditPortfolioSchema(CamelModel):
    id: UUID
    slug: str
    folder: str
    style: Optional[dict] = {}
    name: Optional[str]
    description: Optional[str]
    media: list[MediaSchema] = []
    created_at: dt.datetime
    updated_at: Optional[dt.datetime]
    published_at: Optional[dt.datetime] = None
    primary_media_id: Optional[UUID] = None

# Public view of a portfolio: no S3 folder, only what visitors need
class DisplayPortfolioSchema(CamelModel):
    id: UUID
    slug: str
    name: Optional[str]
    description: Optional[str]
    style: Optional[dict] = {}
    media: list[MediaSchema] = []

# Only fields sent are changed; renaming also changes the slug (and so the URL)
class UpdatePortfolioRequest(CamelModel):
    name: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None
    # true stamps published_at (if not already published), false clears it
    published: Optional[bool] = None
    # the index page cover; null clears it (the first image is used instead)
    primary_media_id: Optional[UUID] = None

# Public site index: published portfolios, by group
class IndexPortfolioSchema(CamelModel):
    id: UUID
    slug: str
    name: Optional[str]
    description: Optional[str] = None
    # the chosen primary media, else the first image
    cover_media: Optional[MediaSchema] = None

class IndexGroupSchema(CamelModel):
    id: UUID
    name: str
    portfolios: list[IndexPortfolioSchema] = []

class PortfolioIndexSchema(CamelModel):
    groups: list[IndexGroupSchema] = []
    ungrouped: list[IndexPortfolioSchema] = []

class PortfolioOrder(CamelModel):
    order: list[UUID]

class EditPortfolioRequest(CamelModel):
    portfolio_name: str
    id: Optional[UUID]


class CreatePortfolioRequest(CamelModel):
    portfolio_name: str
    description: Optional[str]