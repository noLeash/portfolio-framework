from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context
import os
from dotenv import load_dotenv

from app_config import settings
from database import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import Models
from models import user, portfolio, image_collection, project_group

# ---------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------
from pathlib import Path
# from dotenv import load_dotenv

BASE_DIR = Path().resolve().parents[0]   # adjust if needed
print(f"BASE_DIR: {BASE_DIR}")
env_path = BASE_DIR / "backend" / "src" / ".env.local"               # if .env.local is inside backend/
print(f"env_path: {env_path}")

# print("Looking for:", env_path)
load_dotenv(env_path, override=False)   

pg_user = os.getenv("POSTGRES_USER")  # or app_config.settings.POSTGRES_USER
pg_password = os.getenv("POSTGRES_PASSWORD")  # or app_config.settings.POSTGRES_PASSWORD
pg_host = os.getenv("POSTGRES_HOST")  # or app_config.settings.POSTGRES_HOST
pg_db = os.getenv("POSTGRES_DB")  # or app_config.settings.POSTGRES_DB
pg_port = 5432 #os.getenv("POSTGRES_PORT")  # or app_config.settings.POSTGRES_PORT

DATABASE_URL = (
    f"postgresql+psycopg://{pg_user}:{pg_password}"
    f"@{pg_host}:{pg_port}/{pg_db}"
)

print(f"DATABASE: {f"postgresql+psycopg://{pg_user}:********"
    f"@{pg_host}:{pg_port}/{pg_db}"}")

config.set_main_option("sqlalchemy.url", DATABASE_URL)
# print("DATABASE_URL:", DATABASE_URL, os.getenv("POSTGRES_USER"))
# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
