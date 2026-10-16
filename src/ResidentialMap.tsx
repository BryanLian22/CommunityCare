import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { effectiveStatus, residentialRoute } from '../shared/residential-routing.mjs';
import './ResidentialMap.css';

type Item = {
  id: string; name: string; category: 'node' | 'edge'; status: string; note: string;
  revision: number; updated: string; kind: string;
};
type MapNode = Item & {
  x: number; y: number; floor: number; gpsEligible: boolean;
  latitude: number | null; longitude: number | null;
};
type MapEdge = Item & { from: string; to: string; accessible: boolean };
type MapData = { nodes: MapNode[]; edges: MapEdge[]; serverTime: string };
const symbols: Record<string, string> = { guard: '◇', junction: '●', office: '▥', lift: '↕', tower: '▤', wc: '♿', garden: '♧' };
const statusNames: Record<string, string> = { open: 'Available', closed: 'Closed', maintenance: 'Under repair', unknown: 'Not confirmed' };

function useMapData() {
  const [data, setData] = useState<MapData | null>(null);
  const [error, setError] = useState('');
  const [received, setReceived] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const mounted = useRef(false), loading = useRef(false);
  async function refresh() {
    if (loading.current) return;
    loading.current = true;
    try {
      const result = await api<MapData>('/residential-map');
      if (mounted.current) { setData(result); setReceived(Date.now()); setError(''); }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally { loading.current = false; }
  }
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const tick = () => { setClock(Date.now()); if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(tick, 10000);
    window.addEventListener('focus', tick);
    return () => { mounted.current = false; clearInterval(timer); window.removeEventListener('focus', tick); };
  }, []);
  const now = data ? Date.parse(data.serverTime) + Math.max(0, clock - received) : clock;
  return { data, error, refresh, received, now, stale: !!error || !received || clock - received > 30000 };
}

function metres(a: number, b: number, c: number, d: number) {
  const rad = Math.PI / 180, dy = (c - a) * rad, dx = (d - b) * rad;
  const v = Math.sin(dy / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(dx / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v));
}

export default function ResidentialMap() {
  const { data, error, refresh, received, now, stale } = useMapData();
  const [wheelchair, setWheelchair] = useState(true);
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [selected, setSelected] = useState('lift-a');
  const [requested, setRequested] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  const locationGeneration = useRef(0);
  useEffect(() => () => { locationGeneration.current++; }, []);
  const route = data && requested && !stale ? residentialRoute(data.nodes, data.edges, start, destination, wheelchair, now) : null;
  const selectedNode = data?.nodes.find(n => n.id === selected);
  const activeNodes = new Set(route?.nodes || []), activeEdges = new Set(route?.edges || []);
  const availableLifts = data?.nodes.filter(n => n.kind === 'lift' && effectiveStatus(n, now) === 'open').length || 0;
  const routeKey = route?.edges.join('|') || 'unavailable';
  const previousRoute = useRef('');
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (requested && previousRoute.current && previousRoute.current !== routeKey) setChanged(true);
    previousRoute.current = requested ? routeKey : '';
  }, [routeKey, requested]);

  function setHere(id: string) {
    locationGeneration.current++;
    setLocating(false); setStart(id); setLocationLabel('Selected by you · not GPS'); setLocationError(''); setChanged(false);
  }
  function locate() {
    if (!data) return;
    const anchors = data.nodes.filter(n => n.gpsEligible && n.latitude !== null && n.longitude !== null);
    if (!anchors.length) { setLocationError('Management has not added outdoor GPS reference points yet. Select your location on the map.'); return; }
    if (!navigator.geolocation || !window.isSecureContext) { setLocationError('GPS needs HTTPS or localhost and location permission. You can select your location instead.'); return; }
    const id = ++locationGeneration.current;
    setLocating(true); setLocationError('');
    navigator.geolocation.getCurrentPosition(position => {
      if (id !== locationGeneration.current) return;
      setLocating(false);
      const { latitude, longitude, accuracy } = position.coords;
      const nearest = anchors.map(n => ({ n, distance: metres(latitude, longitude, n.latitude!, n.longitude!) })).sort((a, b) => a.distance - b.distance)[0];
      if (accuracy > 35 || nearest.distance > 60) { setLocationError('GPS cannot place you accurately near a configured landmark. Select “I’m here” on the map.'); return; }
      setStart(nearest.n.id); setSelected(nearest.n.id);
      setLocationLabel(`GPS near ${nearest.n.name} · ±${Math.round(accuracy)} m · ${new Date(position.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }, () => {
      if (id !== locationGeneration.current) return;
      setLocating(false); setLocationError('Could not get GPS location. Allow location access or select your location manually.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
  }

  return <section className="res-map-section" aria-label="Live residential map">
    <header className="res-map-heading"><div><span className="res-eyebrow">WITHIN YOUR COMMUNITY</span><h2>Residential navigator</h2><p>A familiar place. A clearer way around.</p></div><span className={`res-live ${stale ? 'offline' : ''}`}>{stale ? (received ? 'Status offline' : 'Connecting') : '● Live status'}</span></header>
    <div className="res-mode"><button aria-pressed={wheelchair} onClick={() => { setWheelchair(true); setChanged(false); }}>♿ Wheelchair</button><button aria-pressed={!wheelchair} onClick={() => { setWheelchair(false); setChanged(false); }}>Standard</button></div>
    <p className="res-mode-note">{wheelchair ? 'Avoids stairs and unavailable lifts. Uses only paths management has confirmed suitable for wheelchairs.' : 'Uses confirmed open connections. May include stairs.'}</p>
    {!data ? <p role="status">{error || 'Loading residential map…'} <button onClick={refresh}>Retry</button></p> : <>
      <div className="res-stats"><span><b>{stale ? '—' : availableLifts}</b> lifts available</span><span>Updated {received ? new Date(received).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}<button onClick={refresh} aria-label="Refresh residential map">↻</button></span></div>
      {stale && <p className="res-warning" role="alert">Live status is unavailable. Cached markers are shown for reference; routes are paused. {error}</p>}
      <div className="res-canvas">
        <svg viewBox="0 0 380 440" role="img" aria-label="Schematic residential map showing landmarks, lifts, paths and selected route">
          <defs><pattern id="res-grid" width="38" height="40" patternUnits="userSpaceOnUse"><path d="M38 0H0V40" fill="none" stroke="#d8e2d9" strokeWidth="1" /></pattern></defs>
          <rect width="380" height="440" fill="#eaf0e8" /><rect width="380" height="440" fill="url(#res-grid)" />
          <path d="M245 440Q260 335 380 342V440Z" fill="#d0e1cc" />
          <rect x="26" y="22" width="90" height="66" rx="12" fill="#d8e0d9" stroke="white" strokeWidth="3" />
          <rect x="269" y="22" width="90" height="66" rx="12" fill="#d8e0d9" stroke="white" strokeWidth="3" />
          {data.edges.map(e => {
            const a = data.nodes.find(n => n.id === e.from)!, b = data.nodes.find(n => n.id === e.to)!;
            return <g key={e.id}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="white" strokeWidth="15" />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={activeEdges.has(e.id) ? '#176f54' : effectiveStatus(e, now) === 'open' ? '#b9cabe' : '#bfae98'} strokeWidth={activeEdges.has(e.id) ? 6 : 3} strokeDasharray={e.kind === 'stairs' ? '3 5' : effectiveStatus(e, now) !== 'open' ? '5 5' : undefined} />
            </g>;
          })}
          {data.nodes.map(n => <g key={n.id} role="button" tabIndex={0} aria-label={`${n.name}, ${statusNames[effectiveStatus(n, now)]}. Show details`} onClick={() => setSelected(n.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(n.id); } }} className="res-marker">
            {activeNodes.has(n.id) && <circle cx={n.x} cy={n.y} r="25" fill="#b9d8c5" />}
            <rect x={n.x - 20} y={n.y - 20} width="40" height="40" rx="12" fill={selected === n.id ? '#153f32' : '#fff'} stroke={selected === n.id ? '#153f32' : '#c6d7cc'} strokeWidth="2" />
            <text x={n.x} y={n.y + 6} textAnchor="middle" fill={selected === n.id ? '#fff' : '#235b45'} fontSize="23">{symbols[n.kind] || '●'}</text>
            <circle cx={n.x + 17} cy={n.y - 17} r="5" fill={stale ? '#9b9387' : effectiveStatus(n, now) === 'open' ? '#409d73' : ['closed', 'maintenance'].includes(effectiveStatus(n, now)) ? '#c85f42' : '#b39561'} stroke="white" strokeWidth="2" />
            <text x={n.x} y={n.y + 36} textAnchor="middle" fontSize="10" fontWeight="600" fill="#355e4f" paintOrder="stroke" stroke="#edf3eb" strokeWidth="3">{n.name.length > 23 ? n.name.slice(0, 22) + '…' : n.name}</text>
            {start === n.id && <g><circle cx={n.x - 20} cy={n.y - 22} r="10" fill="#3688b7" stroke="white" strokeWidth="3" /><text x={n.x - 20} y={n.y - 18} textAnchor="middle" fontSize="10" fill="white">●</text></g>}
            {destination === n.id && <text x={n.x + 24} y={n.y + 5} fill="#b05f24" fontWeight="800" fontSize="18">⚑</text>}
          </g>)}
          <text x="20" y="422" fontSize="9" letterSpacing="1.5" fill="#698273">SCHEMATIC · NOT TO SCALE</text>
        </svg>
      </div>
      <div className="res-legend"><span>🟢 Available</span><span>🟠 Repair / closed</span><span>◌ Unconfirmed</span><span>🔵 Your position</span></div>
      {selectedNode && <div className="res-detail"><div><b>{selectedNode.name}</b><span className={`res-status status-${effectiveStatus(selectedNode, now)}`}>{stale ? 'Status unavailable' : statusNames[effectiveStatus(selectedNode, now)]}</span></div><p>{selectedNode.note || (selectedNode.kind === 'lift' ? 'Connects ground floor and Level 1.' : `Level ${selectedNode.floor} landmark.`)}</p><small>Management update: {selectedNode.updated ? new Date(selectedNode.updated).toLocaleString() : 'Not yet checked'}</small><div className="res-detail-actions"><button onClick={() => setHere(selectedNode.id)}>I’m here</button><button onClick={() => { setDestination(selectedNode.id); setRequested(true); setChanged(false); }}>Go here →</button></div></div>}
      <div className="res-trip-fields"><label>Your position<select value={start} onChange={e => setHere(e.target.value)}><option value="">Choose where you are</option>{data.nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label><label>Destination<select value={destination} onChange={e => { setDestination(e.target.value); setRequested(true); setChanged(false); }}><option value="">Choose a destination</option>{data.nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label></div>
      {start && <p className="res-location-label">● {locationLabel}</p>}
      <div className="res-trip-actions"><button onClick={locate} disabled={locating}>{locating ? 'Locating…' : '⌖ Locate near a landmark'}</button><button className="res-primary" disabled={!start || !destination || stale} onClick={() => { setRequested(true); setChanged(false); }}>Show route</button></div>
      {locationError && <p className="res-warning" role="status">{locationError}</p>}
      {requested && start && destination && <div className="res-route-result" aria-live="polite">
        {changed && <p className="res-warning">Availability changed. Your route has been recalculated.</p>}
        {route ? <><b>{start === destination ? 'You selected your current landmark' : wheelchair ? 'Wheelchair route' : 'Standard route'}</b><p>{wheelchair ? 'Step-free connections confirmed by management.' : 'Follow the listed connections.'}</p><ol>{route.edges.map((id, i) => { const e = data.edges.find(e => e.id === id)!; return <li key={id}>{e.kind === 'lift' ? 'Take ' : e.kind === 'stairs' ? 'Use ' : 'Follow '}{e.name}<small>Continue to {data.nodes.find(n => n.id === route.nodes[i + 1])?.name}</small></li>; })}</ol></> : <><b>{stale ? 'Waiting for current status' : 'No confirmed route available'}</b><p>{stale ? 'Refresh to reconnect.' : 'A required lift, landmark or path is closed or unconfirmed. Contact management for assistance; an unsafe route will not be suggested.'}</p></>}
      </div>}
    </>}
    <details className="res-explainer"><summary>About this live map</summary><p>This is a starter schematic, not a surveyed floor plan. Management must adapt landmark names/positions and verify each connection against the actual property before residents rely on it. Level 1 is drawn above ground-floor landmarks.</p><p>Status is entered by management and refreshed every 10 seconds, not received from lift sensors. “Available” expires after 24 hours without confirmation. A blue marker is a manual selection or a one-time GPS estimate near a configured outdoor landmark; it does not track indoor movement or identify your floor. Update your position as you move. Your position is not stored in the database.</p></details>
  </section>;
}

function MapItemEditor({ item, onSaved }: { item: MapNode | MapEdge; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState(item);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setDraft(item); }, [item.revision, dirty]);
  function change(value: Partial<MapNode & MapEdge>) { setDirty(true); setMessage(''); setDraft(d => ({ ...d, ...value })); }
  async function save() {
    setBusy(true); setMessage('');
    try { await api(`/admin/residential-map/${item.id}`, 'PATCH', draft); setDirty(false); await onSaved(); setMessage('Saved. Residents receive this update within 10 seconds.'); }
    catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  const node = draft as MapNode, edge = draft as MapEdge;
  return <article className="res-admin-card">
    <header><b>{item.name}</b><span>{item.kind.replaceAll('_', ' ')}</span></header>
    <label>Name<input value={draft.name} maxLength={70} onChange={e => change({ name: e.target.value })} /></label>
    <label>Status<select value={draft.status} onChange={e => change({ status: e.target.value })}>{Object.entries(statusNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label>Resident-facing note<textarea value={draft.note} maxLength={300} placeholder="Reason for closure, repair progress or access details" onChange={e => change({ note: e.target.value })} /></label>
    {item.category === 'node' ? <><div className="res-admin-coordinates"><label>Map X<input type="number" min="25" max="355" value={node.x} onChange={e => change({ x: Number(e.target.value) })} /></label><label>Map Y<input type="number" min="25" max="400" value={node.y} onChange={e => change({ y: Number(e.target.value) })} /></label></div>{node.gpsEligible && <><p>Optional surveyed outdoor GPS reference. Clear both to disable matching.</p><div className="res-admin-coordinates"><label>Latitude<input type="number" step="any" min="-90" max="90" value={node.latitude ?? ''} onChange={e => change({ latitude: e.target.value === '' ? null : Number(e.target.value) })} /></label><label>Longitude<input type="number" step="any" min="-180" max="180" value={node.longitude ?? ''} onChange={e => change({ longitude: e.target.value === '' ? null : Number(e.target.value) })} /></label></div></>}</> : <><p>Connection: {edge.from} ↔ {edge.to} ({edge.kind})</p><label className="res-admin-checkbox"><input type="checkbox" disabled={edge.kind === 'stairs'} checked={edge.accessible} onChange={e => change({ accessible: e.target.checked })} />Surveyed and suitable for wheelchair users (width, gradient, surface and step-free access checked)</label></>}
    <p className="res-admin-note">Current effective status: {statusNames[effectiveStatus(item)]}. Saving Available confirms it for 24 hours. Confirm the physical condition before saving.</p>
    {dirty && item.revision !== draft.revision && <p role="alert">Another admin changed this item. Reload before saving.</p>}
    <div className="res-trip-actions"><button className="res-primary" disabled={busy || (dirty && item.revision !== draft.revision)} onClick={save}>{busy ? 'Saving…' : 'Save / confirm status'}</button><button disabled={busy} onClick={() => { setDraft(item); setDirty(false); setMessage(''); }}>Reload item</button></div>
    {message && <p role="status">{message}</p>}
  </article>;
}

export function ResidentialMapAdmin() {
  const { data, error, refresh } = useMapData();
  const [tab, setTab] = useState<'nodes' | 'edges'>('nodes');
  return <section className="res-admin"><h2>Residential map & accessibility</h2><p>Publish lift, landmark and pathway status here. Residents see changes within 10 seconds and wheelchair routes recalculate automatically. All locations start as unconfirmed.</p><p>This starter layout must be checked against your property. The connections are defined in <code>shared/residential-map.json</code> for a new installation. Existing layouts are stored in the database. Only mark paths wheelchair-suitable after surveying them.</p><div className="res-mode"><button aria-pressed={tab === 'nodes'} onClick={() => setTab('nodes')}>Lifts & landmarks</button><button aria-pressed={tab === 'edges'} onClick={() => setTab('edges')}>Paths & accessibility</button></div>{error && <p role="alert">{error} <button onClick={refresh}>Retry</button></p>}<div className="res-admin-grid">{data?.[tab].map(item => <MapItemEditor key={item.id} item={item} onSaved={refresh} />)}</div></section>;
}
