CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('resident','admin')) DEFAULT 'resident',
 active INTEGER NOT NULL DEFAULT 1, large_text INTEGER NOT NULL DEFAULT 0,
 contrast INTEGER NOT NULL DEFAULT 0, notices_read_at TEXT NOT NULL DEFAULT '', created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS records (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('bookings','reports','contacts','services')),
 payload TEXT NOT NULL, status TEXT NOT NULL, created TEXT NOT NULL,
 facility TEXT, booking_date TEXT, booking_time TEXT
);
CREATE INDEX IF NOT EXISTS record_owner ON records(user_id,kind);
CREATE UNIQUE INDEX IF NOT EXISTS facility_slot ON records(facility,booking_date,booking_time)
 WHERE kind='bookings' AND status IN ('pending','approved');
CREATE TABLE IF NOT EXISTS notices (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL,
 author_id TEXT NOT NULL REFERENCES users(id), created TEXT NOT NULL, updated TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL REFERENCES users(id),
 action TEXT NOT NULL, target_id TEXT NOT NULL, created TEXT NOT NULL
);
PRAGMA user_version = 1;
