from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from app.config import settings


@contextmanager
def get_cursor() -> Iterator[psycopg.Cursor]:
    conn = psycopg.connect(settings.database_url_psycopg, row_factory=dict_row)
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
