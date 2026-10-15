from contextlib import asynccontextmanager
from fastapi import FastAPI

# Routes
from routes.app_bootstrap import bootstrap
from routes.auth import auth
from routes.admin import admin

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
    docs_url="/docs",
    redoc_url="/redoc",
    description="gcomollo API",
    openapi_url="/openapi.json",
    root_path="/api",
    lifespan=lifespan
)

app.include_router(admin, prefix="/admin", tags=["Admin"])
app.include_router(bootstrap, prefix="/bootstrap", tags=["Bootstrap"])
app.include_router(auth, prefix="/auth", tags=["Auth"])