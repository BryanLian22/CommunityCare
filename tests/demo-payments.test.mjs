import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
process.env.DATABASE_PATH = ':memory:';
const { server } = await import('../server/app.mjs');
const { db } = await import('../server/db.mjs');
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;
async function request(path, method = 'GET', body, cookie = '') {
  const r = await fetch(base + path, { method, headers: { 'Content-Type':'application/json','X-CommunityCare-Request':'1',Origin:'http://localhost:5173',Cookie:cookie }, ...(body ? { body:JSON.stringify(body) } : {}) });
  return { status:r.status, data:await r.json(), cookie:r.headers.get('set-cookie')?.split(';')[0] };
}
try {
  const password = 'Demo testing password 123';
  const a = await request('/auth/register','POST',{name:'Alice',email:'demo-a@example.test',password});
  const b = await request('/auth/register','POST',{name:'Bob',email:'demo-b@example.test',password});
  const id = randomUUID(), now = new Date().toISOString();
  db.prepare('INSERT INTO household_bills(id,user_id,kind,period,due_date,amount_cents,created,updated,history,client_key) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,a.data.user.id,'electricity','2026-11','2026-12-01',30000,now,now,'[]',randomUUID());
  const body = { bill_id:id,revision:1,amount_cents:30000,method:'card',outcome:'success',client_key:randomUUID() };
  await test('anonymous and other residents cannot pay or see another resident bill', async () => {
    assert.equal((await request('/demo-payments','POST',body)).status,401);
    assert.equal((await request('/demo-payments','POST',body,b.cookie)).status,404);
    assert.equal((await request('/admin/demo-payments','GET',null,a.cookie)).status,403);
  });
  await test('amount and revision must match server; no client price override', async () => {
    assert.equal((await request('/demo-payments','POST',{...body,amount_cents:1},a.cookie)).status,409);
    assert.equal((await request('/demo-payments','POST',{...body,revision:0},a.cookie)).status,409);
  });
  await test('declined and cancelled attempts persist without paying the bill', async () => {
    for (const outcome of ['failed','cancelled']) assert.equal((await request('/demo-payments','POST',{...body,outcome,client_key:randomUUID()},a.cookie)).status,200);
    assert.equal(db.prepare('SELECT sum(amount_cents) AS total FROM demo_payments WHERE outcome=?').get('success').total,null);
  });
  await test('success updates the shared bill once, including on retries', async () => {
    const results = await Promise.all([request('/demo-payments','POST',body,a.cookie),request('/demo-payments','POST',body,a.cookie)]);
    assert.equal(results[0].status,200);assert.equal(results[1].status,200);
    assert.equal(results[0].data.payment.id,results[1].data.payment.id);
    assert.equal(db.prepare('SELECT count(*) AS n FROM demo_payments WHERE outcome=?').get('success').n,1);
    const bill=db.prepare('SELECT * FROM household_bills WHERE id=?').get(id);
    assert.equal(bill.paid_cents,30000);assert.equal(bill.revision,2);assert.equal(JSON.parse(bill.history)[0].action,'demo_payment');
    assert.equal((await request('/demo-payments','POST',{...body,client_key:randomUUID()},a.cookie)).status,409);
    const data=(await request('/household','GET',null,a.cookie)).data;
    assert.equal(data.bills[0].demo_payments.length,3);assert.equal(data.bills[0].outstanding_cents,0);
    assert.equal((await request('/household','GET',null,b.cookie)).data.bills.length,0);
  });
  await test('administrators can inspect separate demo transactions', async () => {
    db.prepare("UPDATE users SET role='admin' WHERE id=?").run(b.data.user.id);
    assert.equal((await request('/admin/demo-payments','GET',null,b.cookie)).data.payments.length,3);
    const adminBill=(await request('/admin/bills','GET',null,b.cookie)).data.bills[0];
    assert.equal(adminBill.outstanding_cents,0);assert.equal(adminBill.payment_status,'paid');
  });
  await test('earlier successful demo payments sync on upgrade only once', async () => {
    const { initializeDemoPayments } = await import('../server/demo-payments.mjs');
    db.prepare('UPDATE household_bills SET paid_cents=0,revision=1,history=? WHERE id=?').run('[]',id);
    db.prepare("UPDATE demo_payments SET applied=0 WHERE outcome='success'").run();
    initializeDemoPayments(db); initializeDemoPayments(db);
    const row=db.prepare('SELECT * FROM household_bills WHERE id=?').get(id);
    assert.equal(row.paid_cents,30000);assert.equal(row.revision,2);assert.equal(JSON.parse(row.history).length,1);
  });
} finally { await new Promise(resolve=>server.close(resolve)); db.close(); }
