from contextlib import asynccontextmanager
from fastapi import FastAPI

# Routes
from routes.app_bootstrap import bootstrap
from routes.auth import auth
from routes.admin import admin
from routes.s3 import s3_router as folders_router
from routes.portfolio import portfolio_router as portfolio_router
from routes.image_collection import collection_router
from routes.project_group import group_router


# Manage Fast API LIFESPAN
lifespanTasks = []

# Startup functions
from utils.migrations import run_migrations

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        print("FastAPI startup")
       
        lifespanTasks.append("startup complete")

        yield

    except Exception as e:
        print(f"Lifespan exception: {e}")
        raise

    finally:
        print("FastAPI shutdown")

        lifespanTasks.clear()


app = FastAPI(
    title="gcomollo API",
    version="0.1.0",
    description="gcomollo API",
    lifespan=lifespan,
    root_path="/api"
)

app.include_router(admin, prefix="/admin", tags=["Admin"])
app.include_router(bootstrap, prefix="/bootstrap", tags=["Bootstrap"])
app.include_router(auth, prefix="/auth", tags=["Auth"])
app.include_router(folders_router, prefix="/folders", tags=["Folders"])
app.include_router(portfolio_router, prefix="/portfolio", tags=["Portfolio"])
app.include_router(collection_router, prefix="/collections", tags=["Collections"])
app.include_router(group_router, prefix="/groups", tags=["Groups"])