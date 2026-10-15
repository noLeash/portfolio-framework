from database import Base
from models.server_default import TimestampMixin

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Index,
    Integer,
    String,
    text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import INET, UUID

class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        nullable=False,
        server_default=text("gen_random_uuid()"),
    )

    user_name: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    admin: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )

    email: Mapped[str] = mapped_column(
        String(225),
        nullable=False,
        unique=True
    )

    access_level: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )

    
    login_ips: Mapped[list["UserLoginIP"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

class UserLoginIP(Base, TimestampMixin):
    __tablename__ = "user_login_ips"
    __table_args__ = (
        Index("idx_user_login_ips_user_id", "user_id"),
        Index("idx_user_login_ips_ip_address", "ip_address"),
        Index("idx_user_login_ips_logged_in_at", "created_at"),
        Index("idx_user_login_ips_user_time", "user_id", "created_at"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.users.id", ondelete="CASCADE"),
        nullable=False,
    )

    ip_address: Mapped[str] = mapped_column(
        INET,
        nullable=False,
    )

    ip_forwared_for: Mapped[str] = mapped_column(
        INET,
        nullable=False,
    )

    user_agent: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    mobile: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    referer: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    
    language: Mapped[bool] = mapped_column(
        String(225),
        nullable=False,
        server_default=text("true"),
    )

    user: Mapped["User"] = relationship(
        back_populates="login_ips",
    )

    success: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false")
    )
    
    
    