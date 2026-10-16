import seed from '../shared/residential-map.json' with { type: 'json' };

export function initializeResidential(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS residential_map_items (
      id TEXT PRIMARY KEY, category TEXT NOT NULL, payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unknown', note TEXT NOT NULL DEFAULT '',
      revision INTEGER NOT NULL DEFAULT 1, updated TEXT NOT NULL DEFAULT ''
    );
  `);
  const insert = db.prepare('INSERT OR IGNORE INTO residential_map_items(id,category,payload) VALUES(?,?,?)');
  for (const n of seed.nodes) insert.run(n.id, 'node', JSON.stringify({ ...n, latitude: null, longitude: null }));
  for (const e of seed.edges) insert.run(e.id, 'edge', JSON.stringify({ ...e, accessible: false }));
}

export function readResidential(db) {
  const rows = db.prepare('SELECT * FROM residential_map_items ORDER BY rowid').all();
  const items = rows.map(r => ({ ...JSON.parse(r.payload), status: r.status, note: r.note, revision: r.revision, updated: r.updated, category: r.category }));
  return { nodes: items.filter(i => i.category === 'node'), edges: items.filter(i => i.category === 'edge'), serverTime: new Date().toISOString() };
}

export function updateResidential(db, id, body) {
  const bad = message => { throw Object.assign(new Error(message), { status: 400 }); };
  const row = db.prepare('SELECT * FROM residential_map_items WHERE id=?').get(id);
  if (!row) throw Object.assign(new Error('Map item not found.'), { status: 404 });
  if (!Number.isInteger(body.revision) || row.revision !== body.revision) throw Object.assign(new Error('This map item changed. Refresh before editing again.'), { status: 409 });
  if (!['open', 'closed', 'maintenance', 'unknown'].includes(body.status)) bad('Choose a valid status.');
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 70) bad('Enter a name up to 70 characters.');
  if (typeof body.note !== 'string' || body.note.length > 300) bad('Notes must be under 300 characters.');
  if (['closed', 'maintenance'].includes(body.status) && !body.note.trim()) bad('Explain the closure or repair.');
  const item = JSON.parse(row.payload);
  item.name = body.name.trim();
  if (row.category === 'node') {
    for (const key of ['x', 'y']) if (!Number.isFinite(body[key]) || body[key] < 25 || body[key] > (key === 'x' ? 355 : 400)) bad('Map position is outside the drawing.');
    item.x = body.x; item.y = body.y;
    if (item.gpsEligible) {
      const empty = body.latitude === null && body.longitude === null;
      if (!empty && (!Number.isFinite(body.latitude) || Math.abs(body.latitude) > 90 || !Number.isFinite(body.longitude) || Math.abs(body.longitude) > 180)) bad('Enter both valid GPS coordinates, or clear both.');
      item.latitude = body.latitude; item.longitude = body.longitude;
    }
  } else {
    if (typeof body.accessible !== 'boolean') bad('Confirm wheelchair suitability.');
    item.accessible = item.kind !== 'stairs' && body.accessible;
  }
  const updated = new Date().toISOString();
  const result = db.prepare('UPDATE residential_map_items SET payload=?,status=?,note=?,revision=revision+1,updated=? WHERE id=? AND revision=?')
    .run(JSON.stringify(item), body.status, body.note.trim(), updated, id, body.revision);
  if (!result.changes) throw Object.assign(new Error('Map changed. Refresh and try again.'), { status: 409 });
  return { ...item, category: row.category, status: body.status, note: body.note.trim(), revision: row.revision + 1, updated };
}
