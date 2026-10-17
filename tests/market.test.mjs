import test from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_PATH = ':memory:';
const { server } = await import('../server/app.mjs');
const { db } = await import('../server/db.mjs');
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;
function client() {
  let cookie = '';
  return async (path, method = 'GET', body) => {
    const r = await fetch(base + path, { method, headers: { cookie, 'Content-Type': 'application/json', 'X-CommunityCare-Request': '1' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0];
    return { status: r.status, data: await r.json() };
  };
}
const resident = client(), admin = client();
try {
  await resident('/auth/register', 'POST', { name: 'Resident', email: 'resident@market.test', password: 'Market-test-password-123' });
  const manager = await admin('/auth/register', 'POST', { name: 'Manager', email: 'admin@market.test', password: 'Market-test-password-123' });
  db.prepare("UPDATE users SET role='admin' WHERE id=?").run(manager.data.user.id);
  await test('Market submission reaches admin and decision notifies resident', async () => {
    const payload = { service: 'Air conditioner', address: 'Block A, unit 12', phone: '+60123456789', details: 'Leaking indoor unit', date: '2099-12-01', time: '9:00 AM' };
    const created = await resident('/records/services', 'POST', payload);
    assert.equal(created.status, 201);
    const id = created.data.record.id;
    assert.equal((await resident('/records/services', 'POST', payload)).status, 409);
    const data = (await admin('/admin/data')).data;
    assert.equal(data.services[0].details, payload.details);
    assert.equal(data.services[0].phone, payload.phone);
    assert(data.notifications.some(n => n.kind === 'services' && n.requestId === id));
    assert.equal((await resident('/admin/records/' + id, 'PATCH', { status: 'approved' })).status, 403);
    assert.equal((await admin('/admin/records/' + id, 'PATCH', { status: 'approved', note: 'Arranged with technician' })).status, 200);
    assert((await resident('/notifications')).data.notifications.some(n => n.requestId === id && n.title.includes('approved')));
    const second = await resident('/records/services', 'POST', { ...payload, service: 'Locksmith' });
    assert.equal((await admin('/admin/records/' + second.data.record.id, 'PATCH', { status: 'rejected', note: 'No provider available at that time' })).status, 200);
    assert((await resident('/notifications')).data.notifications.some(n => n.requestId === second.data.record.id && n.title.includes('rejected')));
    assert.equal((await resident('/records/services', 'POST', { ...payload, date: '2020-01-01' })).status, 400);
  });
} finally { await new Promise(resolve => server.close(resolve)); db.close(); }
