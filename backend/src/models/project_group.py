from typing import Optional
import datetime as dt

from sqlalchemy import UUID, ForeignKey, Integer, String, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

from uuid import UUID as UUIDType, uuid4


class ProjectGroup(Base):
    """A category that portfolios are filed under; each portfolio has at most one."""
    __tablename__ = "project_group"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_project_group_user_name"),
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
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    portfolios: Mapped[list["Portfolio"]] = relationship(
        back_populates="group", order_by="Portfolio.position"
    )

    @property
    def portfolio_count(self) -> int:
        return len(self.portfolios)
