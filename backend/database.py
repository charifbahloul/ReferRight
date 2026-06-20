import sqlite3
import logging
import os
from contextlib import contextmanager

DB_PATH = os.environ.get('DB_PATH', os.path.join(os.path.dirname(__file__), 'referral_demo.db'))

logger = logging.getLogger(__name__)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db_cursor():
    conn = get_connection()
    try:
        cur = conn.cursor()
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    with open(schema_path, 'r') as f:
        sql = f.read()
    conn = get_connection()
    try:
        conn.executescript(sql)
        conn.commit()
        logger.info("Database initialized from schema.sql")
    finally:
        conn.close()


def query(sql: str, params: tuple = ()) -> list[dict]:
    with db_cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
        return [dict(r) for r in rows]


def query_one(sql: str, params: tuple = ()):
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: tuple = ()) -> int:
    """Execute INSERT/UPDATE/DELETE. Returns lastrowid."""
    with db_cursor() as cur:
        cur.execute(sql, params)
        return cur.lastrowid
