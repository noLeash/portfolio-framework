from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from routes.s3 import list_folders as list_s3_folders

portfolio_router = APIRouter()

@portfolio_router.get("/folders")
def list_portfolio_folders():
    folders = list_s3_folders("portfolio")
    return folders