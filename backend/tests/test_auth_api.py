"""Auth HTTP tests — require Postgres with schema + seed (user 1 and organizer 1 have password_hash)."""

import uuid

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.usefixtures("require_db")

SEED_GUEST_EMAIL = "alex.m@student.edu"
SEED_GUEST_USERNAME = "alex_m"
SEED_ORGANIZER_EMAIL = "hello@nlevents.eu"
SEED_ORGANIZER_USERNAME = "nle_events"
SEED_PASSWORD = "demo123"


def test_register_returns_token(
    client: TestClient, unique_user: dict[str, str]
) -> None:
    r = client.post("/api/auth/register", json=unique_user)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["role"] == "guest"
    assert data["user"]["username"] == unique_user["username"]
    assert data["user"]["email"] == unique_user["email"]


def test_register_duplicate_username(
    client: TestClient, unique_user: dict[str, str]
) -> None:
    first = client.post("/api/auth/register", json=unique_user)
    assert first.status_code == 200, first.text

    duplicate = {
        **unique_user,
        "email": "other_email_for_duplicate@example.com",
    }
    r = client.post("/api/auth/register", json=duplicate)
    assert r.status_code == 409
    assert r.json()["detail"] == "Username already taken"


def test_login_email_seed_user(client: TestClient) -> None:
    r = client.post(
        "/api/auth/login",
        json={"email": SEED_GUEST_EMAIL, "password": SEED_PASSWORD},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["role"] == "guest"
    assert data["user"]["user_id"] == 1


def test_login_email_wrong_password(client: TestClient) -> None:
    r = client.post(
        "/api/auth/login",
        json={"email": SEED_GUEST_EMAIL, "password": "not-the-password"},
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid email or password"


def test_login_username_seed_user(client: TestClient) -> None:
    r = client.post(
        "/api/auth/login/username",
        json={"username": SEED_GUEST_USERNAME, "password": SEED_PASSWORD},
    )
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "guest"
    assert r.json()["user"]["username"] == SEED_GUEST_USERNAME


def test_login_organizer_seed(client: TestClient) -> None:
    r = client.post(
        "/api/auth/login/organizer",
        json={"email": SEED_ORGANIZER_EMAIL, "password": SEED_PASSWORD},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["role"] == "organizer"
    assert data["organizer"]["organizer_id"] == 1
    assert data["organizer"]["username"] == SEED_ORGANIZER_USERNAME


def test_login_organizer_username_seed(client: TestClient) -> None:
    r = client.post(
        "/api/auth/login/organizer/username",
        json={"username": SEED_ORGANIZER_USERNAME, "password": SEED_PASSWORD},
    )
    assert r.status_code == 200, r.text
    assert r.json()["organizer"]["username"] == SEED_ORGANIZER_USERNAME


def test_register_organizer(client: TestClient) -> None:
    suffix = uuid.uuid4().hex[:8]
    body = {
        "email": f"org_{suffix}@example.com",
        "username": f"org_{suffix}",
        "organizer_name": "Test Org",
        "password": "demo12345",
    }
    r = client.post("/api/auth/register/organizer", json=body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["role"] == "organizer"
    assert data["organizer"]["username"] == body["username"]


def test_me_organizer(client: TestClient) -> None:
    login = client.post(
        "/api/auth/login/organizer",
        json={"email": SEED_ORGANIZER_EMAIL, "password": SEED_PASSWORD},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "organizer"
    assert r.json()["organizer"]["email"] == SEED_ORGANIZER_EMAIL


def test_me_requires_auth(client: TestClient) -> None:
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_with_token(client: TestClient, unique_user: dict[str, str]) -> None:
    reg = client.post("/api/auth/register", json=unique_user)
    assert reg.status_code == 200, reg.text
    token = reg.json()["access_token"]

    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "guest"
    assert r.json()["user"]["email"] == unique_user["email"]
    assert r.json()["user"]["username"] == unique_user["username"]
