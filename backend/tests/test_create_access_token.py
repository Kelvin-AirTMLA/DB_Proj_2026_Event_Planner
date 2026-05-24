from datetime import datetime, timedelta, timezone
from app.security import create_access_token, decode_access_token
from app.config import settings


def test_create_access_token():
    token = create_access_token(42, "guest")
    payload = decode_access_token(token)

    assert payload["sub"] == "42"
    assert payload["role"] == "guest"
    assert "exp" in payload
