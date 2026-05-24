import uuid

import pytest
from fastapi.testclient import TestClient

from app.db import get_cursor
from app.main import app


@pytest.fixture(scope="session")
def db_available() -> bool:
    try:
        with get_cursor() as cur:
            cur.execute("SELECT 1")
        return True
    except Exception:
        return False


@pytest.fixture
def require_db(db_available: bool) -> None:
    if not db_available:
        pytest.skip(
            "PostgreSQL not reachable — start DB and apply schema/seed (see schema/README.md)"
        )


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def unique_user() -> dict[str, str]:
    suffix = uuid.uuid4().hex[:8]
    return {
        "email": f"pytest_{suffix}@example.com",
        "username": f"pytest_{suffix}",
        "full_name": "Pytest User",
        "password": "demo12345",
    }
