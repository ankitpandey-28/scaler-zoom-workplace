"""SQLite persistence. Each operation owns its connection and transaction."""
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from .security import hash_password


def now():
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def database():
    filename = os.getenv('DATABASE_PATH', 'backend/zoom.db')
    Path(filename).parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(filename, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys = ON')
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


SCHEMA = '''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, display_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL, expires_at TEXT, authenticated INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY CHECK(length(id) = 11), host_user_id INTEGER NOT NULL REFERENCES users(id),
    host_session TEXT REFERENCES sessions(token), title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '', scheduled_at TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK(duration_minutes BETWEEN 15 AND 480),
    kind TEXT NOT NULL CHECK(kind IN ('instant', 'scheduled')),
    status TEXT NOT NULL CHECK(status IN ('scheduled', 'active', 'ended', 'cancelled')),
    created_at TEXT NOT NULL, started_at TEXT, ended_at TEXT
);
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY, meeting_id TEXT NOT NULL REFERENCES meetings(id),
    session_token TEXT NOT NULL REFERENCES sessions(token), user_id INTEGER REFERENCES users(id), display_name TEXT NOT NULL,
    is_host INTEGER NOT NULL DEFAULT 0 CHECK(is_host IN (0,1)),
    joined_at TEXT NOT NULL, left_at TEXT, removed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_id TEXT NOT NULL REFERENCES meetings(id),
    participant_id TEXT NOT NULL REFERENCES participants(id), body TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_meetings_schedule ON meetings(status, scheduled_at);
CREATE INDEX IF NOT EXISTS ix_participants_meeting ON participants(meeting_id, left_at);
CREATE INDEX IF NOT EXISTS ix_messages_meeting ON messages(meeting_id, id);
'''


def meeting_id(connection):
    while True:
        value = str(secrets.randbelow(90_000_000_000) + 10_000_000_000)
        if not connection.execute('SELECT 1 FROM meetings WHERE id=?', (value,)).fetchone():
            return value


def initialize():
    with database() as connection:
        connection.execute('PRAGMA journal_mode = WAL')
        connection.executescript(SCHEMA)
        # Additive migrations preserve meetings from the original default-user build.
        additions = {
            'users': [('password_hash', "TEXT NOT NULL DEFAULT ''"), ('created_at', "TEXT NOT NULL DEFAULT ''")],
            'sessions': [('expires_at', 'TEXT'), ('authenticated', 'INTEGER NOT NULL DEFAULT 0')],
            'participants': [('user_id', 'INTEGER REFERENCES users(id)')],
        }
        for table, columns in additions.items():
            existing = {row['name'] for row in connection.execute(f'PRAGMA table_info({table})')}
            for name, definition in columns:
                if name not in existing:
                    connection.execute(f'ALTER TABLE {table} ADD COLUMN {name} {definition}')
        connection.execute("INSERT OR IGNORE INTO users (id,display_name,email,created_at) VALUES (1, 'Ankit Sharma', 'ankit.sharma@example.com', ?)", (now(),))
        if not connection.execute('SELECT password_hash FROM users WHERE id=1').fetchone()['password_hash']:
            connection.execute('UPDATE users SET password_hash=?,created_at=? WHERE id=1', (hash_password('ZoomDemo123!'), now()))
        connection.execute('CREATE INDEX IF NOT EXISTS ix_meetings_host ON meetings(host_user_id, scheduled_at)')
        connection.execute('CREATE INDEX IF NOT EXISTS ix_participants_user ON participants(user_id, meeting_id)')
        if connection.execute('SELECT COUNT(*) FROM meetings').fetchone()[0] == 0:
            current = datetime.now(timezone.utc)
            examples = [
                ('Design team standup', 'Daily check-in, priorities, and blockers.', current + timedelta(hours=1), 30, 'scheduled'),
                ('Product design review', 'Review the latest designs and gather feedback.', current + timedelta(hours=3), 60, 'scheduled'),
                ('Weekly team sync', 'A quick catch-up on this week’s progress.', current + timedelta(days=1), 45, 'scheduled'),
                ('Sprint planning', 'Plan the next sprint together.', current - timedelta(days=1), 60, 'ended'),
                ('Engineering catch-up', 'Architecture discussion and project updates.', current - timedelta(days=2), 30, 'ended'),
            ]
            for title, description, scheduled, duration, status in examples:
                connection.execute('''INSERT INTO meetings
                    (id,host_user_id,title,description,scheduled_at,duration_minutes,kind,status,created_at,started_at,ended_at)
                    VALUES (?,1,?,?,?,?, 'scheduled', ?,?,?,?)''',
                    (meeting_id(connection), title, description, scheduled.isoformat(), duration,
                     status, now(), scheduled.isoformat() if status == 'ended' else None,
                     (scheduled + timedelta(minutes=duration)).isoformat() if status == 'ended' else None))
        # A process restart cannot preserve a WebSocket. Close stale attendance records.
        connection.execute('UPDATE participants SET left_at=? WHERE left_at IS NULL', (now(),))
        connection.execute("UPDATE meetings SET status='ended',ended_at=? WHERE status='active'", (now(),))
