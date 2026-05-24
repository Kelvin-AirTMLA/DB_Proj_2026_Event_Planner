"""Create event — requires Postgres with schema + seed."""

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.usefixtures("require_db")

SEED_ORGANIZER_EMAIL = "hello@nlevents.eu"
SEED_PASSWORD = "demo123"


def _organizer_token(client: TestClient) -> str:
    r = client.post(
        "/api/auth/login/organizer",
        json={"email": SEED_ORGANIZER_EMAIL, "password": SEED_PASSWORD},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_create_event_as_organizer(client: TestClient) -> None:
    token = _organizer_token(client)
    r = client.post(
        "/api/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "event_name": "Pytest Created Event",
            "venue_id": 1,
            "start_datetime": "2026-12-01 10:00:00",
            "end_datetime": "2026-12-01 18:00:00",
            "status": "pending",
            "category": "workshop",
            "price_eur": 20.0,
            "tickets_available": 30,
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["event_id"] > 0
    assert data["event"]["event_name"] == "Pytest Created Event"
    assert data["ticket_type"]["ticket_name"] == "Standard"


def test_create_event_guest_forbidden(
    client: TestClient, unique_user: dict[str, str]
) -> None:
    reg = client.post("/api/auth/register", json=unique_user)
    assert reg.status_code == 200, reg.text
    token = reg.json()["access_token"]
    r = client.post(
        "/api/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "event_name": "Should Fail",
            "venue_id": 1,
            "start_datetime": "2026-12-02 10:00:00",
            "end_datetime": "2026-12-02 18:00:00",
        },
    )
    assert r.status_code == 403
