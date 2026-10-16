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
CREATE TABLE IF NOT EXISTS community_contacts (
 id TEXT PRIMARY KEY CHECK(id IN ('management','guard')),
 name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', hours TEXT NOT NULL DEFAULT '',
 description TEXT NOT NULL DEFAULT '', updated TEXT NOT NULL DEFAULT '',
 updated_by TEXT REFERENCES users(id)
);
INSERT OR IGNORE INTO community_contacts(id,name,description) VALUES
 ('management','Management Office','Bookings, maintenance and resident enquiries.'),
 ('guard','Guard House','Security assistance and visitor access.');
CREATE TABLE IF NOT EXISTS assistance_requests (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 category TEXT NOT NULL, location TEXT NOT NULL, details TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','in_progress','completed','rejected','cancelled')),
 assignee TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
 history TEXT NOT NULL DEFAULT '[]', revision INTEGER NOT NULL DEFAULT 1,
 created TEXT NOT NULL, updated TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS assistance_owner ON assistance_requests(user_id,created);
CREATE TABLE IF NOT EXISTS notifications (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL, body TEXT NOT NULL, request_id TEXT NOT NULL REFERENCES assistance_requests(id) ON DELETE CASCADE,
 audience TEXT NOT NULL CHECK(audience IN ('resident','admin')), created TEXT NOT NULL, read_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS notification_owner ON notifications(user_id,created);
CREATE TABLE IF NOT EXISTS facilities (
 id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE,
 category TEXT NOT NULL, description TEXT NOT NULL, icon TEXT NOT NULL,
 is_open INTEGER NOT NULL DEFAULT 1, closure_reason TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1, created TEXT NOT NULL, updated TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS record_notifications (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL, body TEXT NOT NULL, request_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('bookings','reports','services')),
 created TEXT NOT NULL, read_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS record_notification_owner ON record_notifications(user_id,created);
CREATE TABLE IF NOT EXISTS emergency_alerts (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_token TEXT NOT NULL, category TEXT NOT NULL, location TEXT NOT NULL,
 phone TEXT NOT NULL DEFAULT '', details TEXT NOT NULL DEFAULT '',
 latitude REAL, longitude REAL, accuracy REAL, captured_at TEXT,
 status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','acknowledged','responding','resolved','false_alarm','cancelled')),
 assignee TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', history TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1, created TEXT NOT NULL, updated TEXT NOT NULL,
 UNIQUE(user_id,client_token)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_emergency ON emergency_alerts(user_id) WHERE status IN ('submitted','acknowledged','responding');
CREATE TABLE IF NOT EXISTS emergency_notifications (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL, body TEXT NOT NULL, request_id TEXT NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
 audience TEXT NOT NULL CHECK(audience IN ('resident','admin')),created TEXT NOT NULL, read_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS emergency_notification_owner ON emergency_notifications(user_id,created);
PRAGMA user_version = 7;
