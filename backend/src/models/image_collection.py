import enum
from typing import Optional
import datetime as dt

from sqlalchemy import UUID, Boolean, Enum, ForeignKey, Index, Integer, String, DateTime, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from models.portfolio import PortfolioMedia

from uuid import UUID as UUIDType, uuid4


class DisplaySize(str, enum.Enum):
    s = "s"
    m = "m"
    l = "l"


class PlaybackMode(str, enum.Enum):
    """How a video item plays on the landing page; ignored for images."""
    inline = "inline"  # autoplays muted and looping inside its tile
    modal = "modal"    # shows the poster; clicking opens a player


class ImageCollection(Base):
    """A curated set of portfolio images; the active one is the landing page."""
    __tablename__ = "image_collection"
    __table_args__ = (
        # at most one collection can be the live landing page
        Index("uq_image_collection_active", "is_active", unique=True, postgresql_where=text("is_active")),
    )

    # read server-generated values (timestamps) back after INSERT/UPDATE
    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[UUIDType] = mapped_column(UUID, primary_key=True, default=uuid4)
    user_id: Mapped[UUIDType] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    items: Mapped[list["ImageCollectionItem"]] = relationship(
        back_populates="collection",
        order_by="ImageCollectionItem.position",
        cascade="all, delete-orphan",
    )

    @property
    def item_count(self) -> int:
        return len(self.items)


class ImageCollectionItem(Base):
    __tablename__ = "image_collection_item"
    __table_args__ = (
        UniqueConstraint("collection_id", "media_id", name="uq_image_collection_item_media"),
        Index("ix_image_collection_item_collection_position", "collection_id", "position"),
    )

    id: Mapped[UUIDType] = mapped_column(UUID, primary_key=True, default=uuid4)
    collection_id: Mapped[UUIDType] = mapped_column(
        UUID, ForeignKey("image_collection.id", ondelete="CASCADE"), nullable=False
    )
    # deleting the image removes it from every collection
    media_id: Mapped[UUIDType] = mapped_column(
        UUID, ForeignKey("portfolio_media.id", ondelete="CASCADE"), nullable=False, index=True
    )
    display_size: Mapped[DisplaySize] = mapped_column(
        Enum(DisplaySize, name="display_size"), nullable=False, server_default=DisplaySize.m.value
    )
    playback_mode: Mapped[PlaybackMode] = mapped_column(
        Enum(PlaybackMode, name="playback_mode"), nullable=False, server_default=PlaybackMode.modal.value
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    collection: Mapped["ImageCollection"] = relationship(back_populates="items")
    media: Mapped["PortfolioMedia"] = relationship(lazy="joined")

    @property
    def portfolio_name(self) -> Optional[str]:
        # the project the hover button links to
        return self.media.portfolio.name

    @property
    def portfolio_slug(self) -> Optional[str]:
        # the URL the hover button links to
        return self.media.portfolio.slug
