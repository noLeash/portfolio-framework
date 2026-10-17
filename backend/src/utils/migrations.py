from pathlib import Path
from alembic import command
from alembic.config import Config

def run_migrations() -> None:
    project_root = Path(__file__).resolve().parent.parent
    alembic_ini = project_root / "alembic.ini"
    print(f"alembic ini - {alembic_ini}")

    cfg = Config(str(alembic_ini))
    command.upgrade(cfg, "head")