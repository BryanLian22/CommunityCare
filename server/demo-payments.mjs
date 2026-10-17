import { randomUUID } from 'node:crypto';
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
export function initializeDemoPayments(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS demo_payments (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), bill_id TEXT NOT NULL REFERENCES household_bills(id),
    client_key TEXT NOT NULL, method TEXT NOT NULL, outcome TEXT NOT NULL,
    amount_cents INTEGER NOT NULL, created TEXT NOT NULL, UNIQUE(user_id,client_key)
  ); CREATE INDEX IF NOT EXISTS demo_payment_bill ON demo_payments(bill_id);`);
  if (!db.prepare('PRAGMA table_info(demo_payments)').all().some(c => c.name === 'applied')) db.exec('ALTER TABLE demo_payments ADD COLUMN applied INTEGER NOT NULL DEFAULT 0');
  // Upgrade earlier demo-only transactions once, without exceeding the remaining bill balance.
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const payment of db.prepare("SELECT * FROM demo_payments WHERE outcome='success' AND applied=0 ORDER BY created,id").all()) applyDemoPayment(db,payment);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
function applyDemoPayment(db,payment) {
  const row = db.prepare('SELECT * FROM household_bills WHERE id=?').get(payment.bill_id);
  const amount = row && row.status !== 'void' ? Math.min(payment.amount_cents,Math.max(0,row.amount_cents-row.paid_cents)) : 0;
  if (amount) {
    const history = JSON.parse(row.history);
    history.push({ action:'demo_payment', at:payment.created, amount_cents:amount, note:`SIMULATED PAYMENT — no money charged. DEMO-${payment.id}`, payment_id:payment.id });
    db.prepare('UPDATE household_bills SET paid_cents=paid_cents+?,revision=revision+1,updated=?,history=? WHERE id=?').run(amount,new Date().toISOString(),JSON.stringify(history),row.id);
  }
  db.prepare('UPDATE demo_payments SET applied=1 WHERE id=?').run(payment.id);
}
export async function demoPaymentRoutes({ db, u, path, method, readBody, send, res, transaction, throttle }) {
  if (path === '/api/admin/demo-payments' && method === 'GET') {
    if (u.role !== 'admin') fail(403, 'Administrator access required.');
    send(res, 200, { payments: db.prepare('SELECT p.*,u.name resident_name FROM demo_payments p JOIN users u ON u.id=p.user_id ORDER BY p.created DESC LIMIT 200').all() }); return true;
  }
  if (path !== '/api/demo-payments' || method !== 'POST') return false;
  throttle('demo-payments:' + u.id, 30);
  const b = await readBody();
  if (typeof b.client_key !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(b.client_key)) fail(400, 'Invalid request key.');
  if (!['card','bank','wallet'].includes(b.method) || !['success','failed','cancelled'].includes(b.outcome)) fail(400, 'Choose a demo method and result.');
  const payment = transaction(() => {
    const prior = db.prepare('SELECT * FROM demo_payments WHERE user_id=? AND client_key=?').get(u.id,b.client_key);
    if (prior) {
      if (prior.bill_id !== b.bill_id || prior.method !== b.method || prior.outcome !== b.outcome) fail(409, 'This request key was already used.');
      return prior;
    }
    const bill = db.prepare('SELECT * FROM household_bills WHERE id=? AND user_id=?').get(b.bill_id,u.id);
    if (!bill) fail(404, 'Bill not found.');
    if (bill.status === 'void') fail(409, 'This bill has been voided.');
    const amount = Math.max(0,bill.amount_cents-bill.paid_cents);
    if (!amount) fail(409, 'This bill has no remaining demo balance.');
    if (b.revision !== bill.revision || b.amount_cents !== amount) fail(409, 'The bill changed. Close checkout and refresh your bills.');
    const result = { id: randomUUID(), user_id:u.id,bill_id:bill.id,client_key:b.client_key,method:b.method,outcome:b.outcome,amount_cents:amount,created:new Date().toISOString() };
    db.prepare('INSERT INTO demo_payments(id,user_id,bill_id,client_key,method,outcome,amount_cents,created) VALUES(?,?,?,?,?,?,?,?)').run(result.id,u.id,bill.id,b.client_key,b.method,b.outcome,amount,result.created);
    if (result.outcome === 'success') applyDemoPayment(db,result);
    return result;
  });
  send(res,200,{ payment }); return true;
}
