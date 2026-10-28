from database import SessionLocal
from models.portfolio import Portfolio, PortfolioMedia
from sqlalchemy.orm import Session
from utils.slug import unique_slug


def get_portfolio_by_id(db: Session, portfolio_id: int):
    return db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()

def get_portfolio_by_name(db: Session, portfolio_name: str):
    return db.query(Portfolio).filter(Portfolio.name == portfolio_name).first()

def get_portfolio_by_slug(db: Session, slug: str):
    return db.query(Portfolio).filter(Portfolio.slug == slug).first()

def unique_portfolio_slug(db: Session, name: str, exclude_id=None) -> str:
    def is_taken(slug: str) -> bool:
        query = db.query(Portfolio.id).filter(Portfolio.slug == slug)
        if exclude_id is not None:
            query = query.filter(Portfolio.id != exclude_id)
        return query.first() is not None
    return unique_slug(name, is_taken)

def get_image_by_id(db: Session, image_id: int):
    query = db.query(PortfolioMedia).filter(PortfolioMedia.id == image_id).first()
    if not query:
        return None
    return query

def create_portfolio(db: Session, portfolio: Portfolio):
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio

def update_portfolio(db: Session, portfolio: Portfolio):
    db.merge(portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio

def delete_portfolio(db: Session, portfolio: Portfolio):
    db.delete(portfolio)
    db.commit()

def list_portfolios(db: Session):
    return db.query(Portfolio).all()