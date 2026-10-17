import { initializeHousehold } from './household.mjs';
import { initializeResidential } from './residential.mjs';
import seedFacilities from '../shared/facilities.json' with {type: 'json'};
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const databasePath = process.env.DATABASE_PATH || fileURLToPath(new URL('../data/communitycare.sqlite', import.meta.url));
if (databasePath !== ':memory:') mkdirSync(dirname(resolve(databasePath)), { recursive: true });
export const db = new DatabaseSync(databasePath);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
// Existing installations need the optional contact number column added once.
if (!db.prepare('PRAGMA table_info(users)').all().some(column => column.name === 'phone')) {
  db.exec("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
}
initializeResidential(db);
initializeHousehold(db);
// Seed once per name, preserving administrator changes on every later startup.
for (const f of seedFacilities) db.prepare('INSERT OR IGNORE INTO facilities(id,name,category,description,icon,created,updated) VALUES(?,?,?,?,?,?,?)').run(randomUUID(), f.name, f.category, f.description, f.icon, new Date().toISOString(), new Date().toISOString());
// Preserve any facility already referenced by an older database.
for (const r of db.prepare("SELECT DISTINCT facility FROM records WHERE kind='bookings' AND facility IS NOT NULL").all()) db.prepare("INSERT OR IGNORE INTO facilities(id,name,category,description,icon,created,updated) VALUES(?,?,'Community','Community facility','sports',?,?)").run(randomUUID(), r.facility, new Date().toISOString(), new Date().toISOString());
export const publicUser = u => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone ?? '',
  role: u.role,
  active: !!u.active,
  largeText: !!u.large_text,
  contrast: !!u.contrast,
  locations: db.prepare('SELECT id,residence,block,floor FROM resident_locations WHERE user_id=? ORDER BY rowid').all(u.id),
  created: u.created
});
