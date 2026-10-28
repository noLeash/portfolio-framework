
import enum
from typing import Optional
import datetime as dt

from sqlalchemy import UUID, BigInteger, Enum, Float, ForeignKey, Index, Integer, String, DateTime, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from models.user import User

from uuid import UUID as UUIDType, uuid4


class MediaType(str, enum.Enum):
    image = "image"
    video = "video"


class PortfolioMedia(Base):
    __tablename__ = "portfolio_media"
    __table_args__ = (
        Index("ix_portfolio_media_portfolio_position", "portfolio_id", "position"),
    )

    id: Mapped[UUIDType] = mapped_column(UUID, primary_key=True, default=uuid4)
    portfolio_id: Mapped[UUIDType] = mapped_column(
        UUID, ForeignKey("portfolio.id", ondelete="CASCADE"), nullable=False
    )
    media_type: Mapped[MediaType] = mapped_column(
        Enum(MediaType, name="media_type"), nullable=False, server_default=MediaType.image.value
    )
    filename: Mapped[str] = mapped_column(String, nullable=False) # filename
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True) # description
    alt_text: Mapped[Optional[str]] = mapped_column(String, nullable=True) # alt text
    original_path: Mapped[str] = mapped_column(String, nullable=False) # path
    thumbnail_path: Mapped[Optional[str]] = mapped_column(String, nullable=True) # path, poster frame for videos
    small_path: Mapped[Optional[str]] = mapped_column(String, nullable=True) # path
    medium_path: Mapped[Optional[str]] = mapped_column(String, nullable=True) # path
    large_path: Mapped[Optional[str]] = mapped_column(String, nullable=True) # path
    content_type: Mapped[str] = mapped_column(String, nullable=False)
    size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    original_width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # original width
    original_height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # original height
    duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # seconds, videos only
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    portfolio: Mapped["Portfolio"] = relationship(back_populates="media", foreign_keys=[portfolio_id])
    published_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deleted_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class Portfolio(Base):
    __tablename__ = "portfolio"

    # read server-generated values (timestamps) back after INSERT/UPDATE
    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[UUIDType] = mapped_column(UUID, primary_key=True, index=True, default=uuid4)
    user_id: Mapped[UUIDType] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[Optional[str]] = mapped_column(String, unique=True)
    # URL form of the name (lower snake case); kept in sync by the routes, see utils/slug.py
    slug: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    orig_width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    orig_height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    orig_file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String)
    folder: Mapped[str] = mapped_column(String, nullable=False)
    style: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    published_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deleted_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    # deleting a group leaves its portfolios ungrouped
    group_id: Mapped[Optional[UUIDType]] = mapped_column(
        UUID, ForeignKey("project_group.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # the cover shown on the index page; purging the media clears it
    primary_media_id: Mapped[Optional[UUIDType]] = mapped_column(
        UUID, ForeignKey("portfolio_media.id", ondelete="SET NULL", use_alter=True), nullable=True
    )
    media: Mapped[list["PortfolioMedia"]] = relationship(
        back_populates="portfolio",
        order_by="PortfolioMedia.position",
        foreign_keys="PortfolioMedia.portfolio_id",
    )
    # post_update: portfolio and portfolio_media point at each other, so this
    # is written in a second UPDATE after both rows exist
    primary_media: Mapped[Optional["PortfolioMedia"]] = relationship(
        foreign_keys=[primary_media_id], post_update=True
    )
    group: Mapped[Optional["ProjectGroup"]] = relationship(back_populates="portfolios")

    @property
    def cover_media(self) -> Optional["PortfolioMedia"]:
        """The primary media, or the first visible one with a preview image when
        none is chosen (or the chosen one was deleted)."""
        if self.primary_media is not None and self.primary_media.deleted_at is None:
            return self.primary_media
        return next((m for m in self.media if m.deleted_at is None and m.large_path), None)
