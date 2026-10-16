import { randomUUID, randomBytes } from 'node:crypto';

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function text(value, label, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, `${label} is required (maximum ${max} characters).`);
  return value.trim();
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail(400, 'Choose a valid date.');
  return value;
}
function cents(value) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 100000000) fail(400, 'Enter a valid positive amount, up to RM 1,000,000.');
  return value;
}
function revision(row, value) {
  if (!Number.isInteger(value) || value !== row.revision) fail(409, 'This record changed. Refresh before trying again.');
}
export function initializeHousehold(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS household_bills (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL,
      period TEXT NOT NULL, due_date TEXT NOT NULL, amount_cents INTEGER NOT NULL,
      paid_cents INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'issued',
      note TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL DEFAULT 1,
      created TEXT NOT NULL, updated TEXT NOT NULL, history TEXT NOT NULL,
      client_key TEXT NOT NULL UNIQUE
    );
    CREATE INDEX IF NOT EXISTS household_bill_owner ON household_bills(user_id,due_date);
    CREATE TABLE IF NOT EXISTS visitor_passes (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), visitor_name TEXT NOT NULL,
      phone TEXT NOT NULL, plate TEXT NOT NULL, visit_date TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'active',
      revision INTEGER NOT NULL DEFAULT 1, created TEXT NOT NULL, updated TEXT NOT NULL,
      check_in TEXT NOT NULL DEFAULT '', check_out TEXT NOT NULL DEFAULT '',
      client_key TEXT NOT NULL, UNIQUE(user_id,client_key)
    );
    CREATE INDEX IF NOT EXISTS visitor_pass_owner ON visitor_passes(user_id,visit_date);
  `);
}
function bill(row) {
  return { ...row, history: JSON.parse(row.history), outstanding_cents: row.status === 'void' ? 0 : row.amount_cents - row.paid_cents,
    payment_status: row.status === 'void' ? 'void' : row.paid_cents === row.amount_cents ? 'paid' : row.paid_cents > 0 ? 'part_paid' : 'unpaid',
    overdue: row.status !== 'void' && row.paid_cents < row.amount_cents && row.due_date < today() };
}
function pass(row) {
  return { ...row, effective_status: row.status === 'active' && row.visit_date < today() ? 'expired' : row.status,
    can_enter: row.status === 'active' && row.visit_date === today() };
}
export async function householdRoutes({ db, u, path, method, readBody, send, res, audit, transaction, throttle }) {
  const reply = data => { send(res, 200, data); return true; };
  if (path === '/api/household' && method === 'GET') return reply({
    bills: db.prepare('SELECT * FROM household_bills WHERE user_id=? ORDER BY due_date DESC,created DESC').all(u.id).map(bill),
    passes: db.prepare('SELECT * FROM visitor_passes WHERE user_id=? ORDER BY visit_date DESC,created DESC').all(u.id).map(pass), today: today()
  });
  if (path === '/api/visitor-passes' && method === 'POST') {
    throttle('visitor-create:' + u.id, 30);
    const b = await readBody(), key = text(b.client_key, 'Request key', 80);
    const prior = db.prepare('SELECT * FROM visitor_passes WHERE user_id=? AND client_key=?').get(u.id, key);
    if (prior) return reply({ pass: pass(prior) });
    const name = text(b.visitor_name, 'Visitor name', 80), phone = text(b.phone, 'Phone', 30).replace(/[ ()-]/g, '');
    if (!/^\+?[0-9]{6,15}$/.test(phone)) fail(400, 'Enter a valid phone number.');
    const plate = text(b.plate, 'Car plate', 16).toUpperCase().replace(/[ -]/g, '');
    if (!/^[A-Z0-9]{2,12}$/.test(plate)) fail(400, 'Enter a car plate using 2–12 letters and numbers.');
    const visit = date(b.visit_date);
    if (visit < today() || Date.parse(visit) > Date.parse(today()) + 365 * 86400000) fail(400, 'Choose a visit date today or within the next year.');
    const duplicate = db.prepare("SELECT id FROM visitor_passes WHERE user_id=? AND plate=? AND visit_date=? AND status IN ('active','checked_in')").get(u.id, plate, visit);
    if (duplicate) fail(409, 'An active pass already exists for this vehicle on this date.');
    const id = randomUUID(), token = randomBytes(24).toString('hex'), now = new Date().toISOString();
    transaction(() => {
      db.prepare('INSERT INTO visitor_passes(id,user_id,visitor_name,phone,plate,visit_date,token,created,updated,client_key) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, u.id, name, phone, plate, visit, token, now, now, key);
      audit(u, 'create visitor parking pass', id);
    });
    return reply({ pass: pass(db.prepare('SELECT * FROM visitor_passes WHERE id=?').get(id)) });
  }
  const cancel = path.match(/^\/api\/visitor-passes\/([a-z0-9-]+)\/cancel$/);
  if (cancel && method === 'POST') {
    const b = await readBody();
    const row = db.prepare('SELECT * FROM visitor_passes WHERE id=? AND user_id=?').get(cancel[1], u.id);
    if (!row) fail(404, 'Visitor pass not found.');
    revision(row, b.revision);
    if (pass(row).effective_status !== 'active') fail(409, 'Only an active unused pass can be cancelled.');
    transaction(() => {
      db.prepare("UPDATE visitor_passes SET status='cancelled',revision=revision+1,updated=? WHERE id=?").run(new Date().toISOString(), row.id);
      audit(u, 'cancel visitor pass', row.id);
    });
    return reply({ ok: true });
  }
  if (!path.startsWith('/api/admin/bills') && !path.startsWith('/api/admin/visitor-passes')) return false;
  if (u.role !== 'admin') fail(403, 'Administrator access required.');
  if (path === '/api/admin/bills' && method === 'GET') return reply({ bills: db.prepare('SELECT b.*,u.name resident_name,u.email resident_email FROM household_bills b JOIN users u ON u.id=b.user_id ORDER BY b.created DESC').all().map(bill) });
  if (path === '/api/admin/bills' && method === 'POST') {
    const b = await readBody(), key = text(b.client_key, 'Request key', 80);
    const prior = db.prepare('SELECT * FROM household_bills WHERE client_key=?').get(key);
    if (prior) return reply({ bill: bill(prior) });
    if (!db.prepare("SELECT id FROM users WHERE id=? AND role='resident' AND active=1").get(b.user_id)) fail(400, 'Choose an active resident.');
    if (!['electricity', 'water', 'management'].includes(b.kind)) fail(400, 'Choose a bill category.');
    const period = text(b.period, 'Billing period', 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) fail(400, 'Choose a valid billing month.');
    const due = date(b.due_date), amount = cents(b.amount_cents), note = typeof b.note === 'string' ? b.note.trim() : '';
    if (note.length > 300) fail(400, 'Note is too long.');
    const id = randomUUID(), now = new Date().toISOString();
    transaction(() => {
      db.prepare('INSERT INTO household_bills(id,user_id,kind,period,due_date,amount_cents,note,created,updated,history,client_key) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,b.user_id,b.kind,period,due,amount,note,now,now,JSON.stringify([{ action: 'issued', at: now, amount_cents: amount, note }]),key);
      audit(u, 'issue ' + b.kind + ' bill', id);
    });
    return reply({ bill: bill(db.prepare('SELECT * FROM household_bills WHERE id=?').get(id)) });
  }
  const billMatch = path.match(/^\/api\/admin\/bills\/([a-z0-9-]+)$/);
  if (billMatch && method === 'PATCH') {
    const b = await readBody(), row = db.prepare('SELECT * FROM household_bills WHERE id=?').get(billMatch[1]);
    if (!row) fail(404, 'Bill not found.');
    revision(row, b.revision);
    if (row.status === 'void') fail(409, 'This bill is void.');
    const note = text(b.note, 'Payment reference or correction reason', 300), now = new Date().toISOString();
    let paid = row.paid_cents, status = row.status, amount = 0;
    if (b.action === 'payment') {
      amount = cents(b.amount_cents);
      if (amount > row.amount_cents - paid) fail(400, 'Payment exceeds the outstanding amount.');
      paid += amount;
    } else if (b.action === 'void') {
      if (paid) fail(409, 'A bill with recorded payments cannot be voided.');
      status = 'void';
    } else fail(400, 'Invalid bill action.');
    const history = [...JSON.parse(row.history), { action: b.action, at: now, amount_cents: amount, note }];
    transaction(() => {
      db.prepare('UPDATE household_bills SET paid_cents=?,status=?,revision=revision+1,updated=?,history=? WHERE id=?').run(paid,status,now,JSON.stringify(history),row.id);
      audit(u, b.action + ' bill', row.id);
    });
    return reply({ ok: true });
  }
  if (path === '/api/admin/visitor-passes' && method === 'GET') return reply({ passes: db.prepare('SELECT p.*,u.name resident_name,u.email resident_email FROM visitor_passes p JOIN users u ON u.id=p.user_id ORDER BY p.visit_date DESC,p.created DESC').all().map(pass), today: today() });
  if (path === '/api/admin/visitor-passes/verify' && method === 'POST') {
    throttle('visitor-verify:' + u.id, 120);
    const b = await readBody(), token = text(b.token, 'Pass code', 48);
    if (!/^[a-f0-9]{48}$/.test(token)) fail(400, 'Invalid pass code.');
    const row = db.prepare('SELECT p.*,u.name resident_name,u.email resident_email FROM visitor_passes p JOIN users u ON u.id=p.user_id WHERE p.token=?').get(token);
    if (!row) fail(404, 'Pass not found. Do not allow entry on this code.');
    return reply({ pass: pass(row), today: today() });
  }
  const entry = path.match(/^\/api\/admin\/visitor-passes\/([a-z0-9-]+)$/);
  if (entry && method === 'PATCH') {
    const b = await readBody(), row = db.prepare('SELECT * FROM visitor_passes WHERE id=?').get(entry[1]);
    if (!row) fail(404, 'Pass not found.');
    revision(row, b.revision);
    const now = new Date().toISOString();
    if (b.action === 'check_in') {
      if (!pass(row).can_enter) fail(409, 'Entry requires an active, unused pass for today.');
    } else if (b.action === 'check_out') {
      if (row.status !== 'checked_in') fail(409, 'This visitor is not checked in.');
    } else if (b.action === 'cancel') {
      if (pass(row).effective_status !== 'active') fail(409, 'Only an active unused pass can be cancelled.');
    } else fail(400, 'Invalid visitor action.');
    transaction(() => {
      db.prepare('UPDATE visitor_passes SET status=?,check_in=?,check_out=?,revision=revision+1,updated=? WHERE id=?').run(b.action === 'check_in' ? 'checked_in' : b.action === 'check_out' ? 'checked_out' : 'cancelled',b.action === 'check_in' ? now : row.check_in,b.action === 'check_out' ? now : row.check_out,now,row.id);
      audit(u, b.action + ' visitor', row.id);
    });
    return reply({ pass: pass(db.prepare('SELECT * FROM visitor_passes WHERE id=?').get(row.id)) });
  }
  return false;
}
