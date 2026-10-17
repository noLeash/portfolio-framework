from database import Sessionlocal, Base
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import MappedColumn
from typing import Optional

class Portfolio(Base):
    __tablename__ = "portfolio"

    id = Column(Integer, primary_key=True, index=True)
    name: MappedColumn[Optional[str]] = Column(String, unique=True, index=True)
    description: MappedColumn[Optional[str]] = Column(String, index=True)
    folder: MappedColumn[str] = Column(String, index=True, nullable=False)
