from uuid import UUID
import datetime as dt
from typing import Optional
from pydantic import Field
from schema._base import CamelModel


class GroupSchema(CamelModel):
    id: UUID
    name: str
    description: Optional[str] = None
    position: int
    portfolio_count: int
    created_at: dt.datetime
    updated_at: Optional[dt.datetime] = None


class CreateGroupRequest(CamelModel):
    name: str = Field(min_length=1)
    description: Optional[str] = None


# Only fields sent are changed
class UpdateGroupRequest(CamelModel):
    name: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None


# group_id null removes the portfolios from whatever group they're in
class AssignGroupRequest(CamelModel):
    portfolio_ids: list[UUID] = Field(min_length=1)
    group_id: Optional[UUID] = None


class GroupOrder(CamelModel):
    order: list[UUID]
