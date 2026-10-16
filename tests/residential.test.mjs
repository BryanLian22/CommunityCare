import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { initializeResidential, readResidential, updateResidential } from '../server/residential.mjs';
import { effectiveStatus, residentialRoute } from '../shared/residential-routing.mjs';

const db = new DatabaseSync(':memory:');
initializeResidential(db);
const now = Date.now();
await test('New map does not assert lift availability or wheelchair access', () => {
  const data = readResidential(db);
  assert(data.nodes.every(n => n.status === 'unknown'));
  assert(data.edges.every(e => !e.accessible));
  assert.equal(residentialRoute(data.nodes, data.edges, 'gate', 'tower-a', true), null);
});
await test('Saved status survives repeated initialization and rejects stale edits', () => {
  const item = readResidential(db).nodes.find(n => n.id === 'lift-a');
  const body = { ...item, status: 'maintenance', note: 'Motor repair in progress' };
  const result = updateResidential(db, item.id, body);
  assert.equal(result.revision, 2);
  initializeResidential(db);
  assert.equal(readResidential(db).nodes.find(n => n.id === item.id).status, 'maintenance');
  assert.throws(() => updateResidential(db, item.id, body), { status: 409 });
});
await test('Wheelchair route reroutes around a broken lift and never falls back to stairs', () => {
  const data = readResidential(db);
  for (const item of [...data.nodes, ...data.edges]) {
    item.status = 'open'; item.updated = new Date(now).toISOString(); item.accessible = item.kind !== 'stairs';
  }
  const route = () => residentialRoute(data.nodes, data.edges, 'gate', 'tower-a', true, now);
  assert(route().edges.includes('lift-a-upper'));
  data.nodes.find(n => n.id === 'lift-a').status = 'maintenance';
  assert(route().edges.includes('lift-b-upper'));
  assert(!route().edges.includes('stairs-a'));
  data.nodes.find(n => n.id === 'lift-b').status = 'closed';
  assert.equal(route(), null);
  assert(residentialRoute(data.nodes, data.edges, 'gate', 'tower-a', false, now).edges.includes('stairs-a'));
});
await test('Unknown paths, inaccessible ramps and expired confirmations block wheelchair routing', () => {
  const data = readResidential(db);
  for (const item of [...data.nodes, ...data.edges]) { item.status = 'open'; item.updated = new Date(now).toISOString(); item.accessible = true; }
  const ramp = data.edges.find(e => e.id === 'court-wc');
  ramp.accessible = false;
  assert.equal(residentialRoute(data.nodes, data.edges, 'gate', 'wc', true, now), null);
  ramp.accessible = true; ramp.status = 'unknown';
  assert.equal(residentialRoute(data.nodes, data.edges, 'gate', 'wc', true, now), null);
  assert.equal(effectiveStatus({ status: 'open', updated: new Date(now - 86400001).toISOString() }, now), 'unknown');
  assert.equal(residentialRoute(data.nodes, data.edges, 'gate', 'gate', true, now + 86400001), null);
});
db.close();

await test('Residential API enforces admin-only changes and exposes updates to residents', async () => {
  process.env.DATABASE_PATH = ':memory:';
  const { server } = await import('../server/app.mjs');
  const { db: apiDb } = await import('../server/db.mjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = '';
  async function request(path, method = 'GET', body) {
    const result = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-CommunityCare-Request': '1', cookie }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (result.headers.get('set-cookie')) cookie = result.headers.get('set-cookie').split(';')[0];
    return { status: result.status, data: await result.json() };
  }
  try {
    assert.equal((await request('/residential-map')).status, 401);
    const user = await request('/auth/register', 'POST', { name: 'Map tester', email: 'map@example.test', password: 'Map-test-password-123' });
    assert.equal(user.status, 201);
    const data = (await request('/residential-map')).data;
    const lift = data.nodes.find(n => n.id === 'lift-a');
    const body = { ...lift, status: 'maintenance', note: 'Awaiting replacement parts' };
    assert.equal((await request('/admin/residential-map/lift-a', 'PATCH', body)).status, 403);
    apiDb.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.data.user.id);
    assert.equal((await request('/admin/residential-map/lift-a', 'PATCH', body)).status, 200);
    assert.equal((await request('/admin/residential-map/lift-a', 'PATCH', body)).status, 409);
    apiDb.prepare("UPDATE users SET role='resident' WHERE id=?").run(user.data.user.id);
    const updated = (await request('/residential-map')).data.nodes.find(n => n.id === 'lift-a');
    assert.equal(updated.status, 'maintenance');
    assert.equal(updated.note, 'Awaiting replacement parts');
  } finally {
    await new Promise(resolve => server.close(resolve));
    apiDb.close();
  }
});
