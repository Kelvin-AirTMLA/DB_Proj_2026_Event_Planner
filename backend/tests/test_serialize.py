from datetime import datetime
from decimal import Decimal

from app.serialize import serialize_row


def test_serialize_row() -> None:
    dt = datetime(2026, 5, 24, 12, 0, 0)
    row = {
        "name": "Kelvin-Air",
        "price": Decimal("19.99"),
        "created_at": dt,
    }

    out = serialize_row(row)
    assert out == {
        "name": "Kelvin-Air",
        "price": 19.99,
        "created_at": "2026-05-24T12:00:00",
    }
