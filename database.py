import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "bythebooks.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS frameworks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT NOT NULL UNIQUE,
            description TEXT,
            governing_body TEXT,
            official_url TEXT,
            region TEXT
        );

        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS standards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL,
            title TEXT NOT NULL,
            framework_id INTEGER REFERENCES frameworks(id),
            summary TEXT,
            key_points TEXT,
            official_url TEXT,
            effective_date TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS standard_topics (
            standard_id INTEGER REFERENCES standards(id),
            topic_id INTEGER REFERENCES topics(id),
            PRIMARY KEY (standard_id, topic_id)
        );

        CREATE INDEX IF NOT EXISTS idx_standards_framework ON standards(framework_id);
        CREATE INDEX IF NOT EXISTS idx_standards_status ON standards(status);
        CREATE INDEX IF NOT EXISTS idx_standard_topics_topic ON standard_topics(topic_id);
    """)
    conn.commit()
    conn.close()
