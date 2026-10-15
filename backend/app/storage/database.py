"""Tiny SQLite metadata store initializer.

The running MVP keeps rich objects in memory for fast local jobs. SQLite is
still initialized so deployments have a stable local metadata location and can
add durable repositories without changing the filesystem contract.
"""

import sqlite3
from pathlib import Path


def initialize_database(data_dir: Path) -> Path:
    data_dir.mkdir(parents=True, exist_ok=True)
    path = data_dir / "datawitness.sqlite3"
    with sqlite3.connect(path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute("INSERT OR IGNORE INTO schema_version(version) VALUES (1)")
    return path
