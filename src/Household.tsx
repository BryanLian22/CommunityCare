import DemoPayment, { DemoPaymentHistory, downloadDemoReceipt, type DemoTransaction } from './DemoPayment';
import DateTimeField from './DateTimeField';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api, type User } from './api';
import './Household.css';

type Bill = {
  demo_payments?: DemoTransaction[];
  id: string; user_id: string; kind: string; period: string; due_date: string;
  amount_cents: number; paid_cents: number; outstanding_cents: number;
  payment_status: string; overdue: boolean; note: string; revision: number;
  resident_name?: string; resident_email?: string;
  history: { action: string; at: string; amount_cents: number; note: string }[];
};
type Pass = {
  id: string; visitor_name: string; phone: string; plate: string; visit_date: string;
  token: string; status: string; effective_status: string; can_enter: boolean;
  revision: number; resident_name?: string; resident_email?: string; check_in: string; check_out: string;
};
type HouseholdData = { bills: Bill[]; passes: Pass[]; today: string };
const kinds: Record<string, string> = { electricity: 'Electricity bill', water: 'Water bill', management: 'Management fee' };
const money = (cents: number) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(cents / 100);
const dateLabel = (date: string) => new Date(date + 'T12:00:00+08:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' });
function toCents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Enter an amount with up to two decimal places.');
  const [whole, decimal = ''] = value.split('.');
  return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
}
function useLive<T>(path: string) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState('');
  const mounted = useRef(false);
  const generation = useRef(0);
  async function refresh() {
    const id = ++generation.current;
    try { const result = await api<T>(path); if (mounted.current && id === generation.current) { setData(result); setError(''); } }
    catch (e) { if (mounted.current && id === generation.current) setError((e as Error).message); }
  }
  useEffect(() => {
    mounted.current = true; void refresh();
    const tick = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = setInterval(tick, 15000); window.addEventListener('focus', tick);
    return () => { mounted.current = false; generation.current++; clearInterval(timer); window.removeEventListener('focus', tick); };
  }, [path]);
  return { data, error, refresh };
}
function BillDetails({ bill }: { bill: Bill }) {
  return <details className="hh-bill"><summary><span className={`hh-category ${bill.kind}`}>{bill.kind === 'electricity' ? 'ϟ' : bill.kind === 'water' ? '◉' : '▤'}</span><span><b>{kinds[bill.kind]}</b><small>{bill.period} · Due {dateLabel(bill.due_date)}</small></span><span className="hh-bill-amount"><b>{money(bill.outstanding_cents)}</b><small className={bill.overdue ? 'hh-overdue' : ''}>{bill.overdue ? 'Overdue' : bill.payment_status.replaceAll('_', ' ')}</small></span></summary><div className="hh-bill-detail"><p>Bill total: {money(bill.amount_cents)} · Recorded paid: {money(bill.paid_cents)}</p>{bill.note && <p>{bill.note}</p>}<small>Reference: {bill.id}</small><ol>{bill.history.map((h, i) => <li key={i}>{h.action === 'demo_payment' ? `Demo payment recorded: ${money(h.amount_cents)}` : h.action === 'payment' ? `Payment recorded: ${money(h.amount_cents)}` : h.action === 'void' ? 'Bill voided' : 'Bill issued'}<small>{new Date(h.at).toLocaleString()} · {h.note}</small></li>)}</ol></div></details>;
}
function PassCard({ pass, cancel }: { pass: Pass; cancel?: () => void }) {
  const [qr, setQr] = useState(''), [qrError, setQrError] = useState('');
  const link = `${window.location.origin}/?visitor_pass=${pass.token}`;
  useEffect(() => {
    let alive = true; setQr('');
    QRCode.toDataURL(link, { width: 300, margin: 4, errorCorrectionLevel: 'M' }).then(url => { if (alive) setQr(url); }).catch(() => { if (alive) setQrError('Could not generate the image. Use the pass code below.'); });
    return () => { alive = false; };
  }, [link]);
  return <article className="hh-pass"><header><div><small>VISITOR PARKING PASS</small><h3>{pass.plate}</h3></div><span className={`hh-pill ${pass.effective_status}`}>{pass.effective_status.replaceAll('_', ' ')}</span></header><p><b>{pass.visitor_name}</b><br />{pass.phone} · {dateLabel(pass.visit_date)}</p>
    {pass.effective_status === 'active' && <><div className="hh-qr">{qr ? <img src={qr} alt={`Visitor QR pass for ${pass.plate}`} /> : <p>{qrError || 'Generating QR…'}</p>}</div><p className="hh-caption">Show this pass at the guard house. Valid for one entry on the visit date (Malaysia time). Parking is subject to available bays.</p>{qr && <a className="hh-download" href={qr} download={`visitor-${pass.plate}-${pass.visit_date}.png`}>Download QR code</a>}</>}
    {pass.effective_status !== 'active' && <p className="hh-caption">{pass.effective_status === 'checked_in' ? 'Visitor has entered. Management can record their exit.' : 'This pass is no longer valid for entry.'}</p>}
    <details className="hh-code"><summary>Pass code / scan alternative</summary><code>{pass.token}</code><p>Management can paste this code into Visitor parking → Verify pass.</p></details>
    {pass.check_in && <p className="hh-caption">Entered: {new Date(pass.check_in).toLocaleString()}</p>}{pass.check_out && <p className="hh-caption">Exited: {new Date(pass.check_out).toLocaleString()}</p>}
    {cancel && pass.effective_status === 'active' && <button className="hh-cancel" onClick={cancel}>Cancel this pass</button>}
  </article>;
}

export default function HouseholdHome() {
  const { data, error, refresh } = useLive<HouseholdData>('/household');
  const [checkout, setCheckout] = useState<Bill | null>(null);
  const [billsOpen, setBillsOpen] = useState(false), [parkingOpen, setParkingOpen] = useState(false), [history, setHistory] = useState(false);
  const [form, setForm] = useState({ visitor_name: '', phone: '', plate: '', visit_date: '' });
  const requestKey = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [selected, setSelected] = useState<Pass | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Pass | null>(null);
  const selectedPass = data?.passes.find(p => p.id === selected?.id) || selected;
  async function create(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setMessage('');
    try {
      const result = await api<{ pass: Pass }>('/visitor-passes', 'POST', { ...form, client_key: requestKey.current });
      setSelected(result.pass); requestKey.current = crypto.randomUUID(); setForm({ visitor_name: '', phone: '', plate: '', visit_date: '' }); await refresh();
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (!cancelTarget || busy) return; setBusy(true); setMessage('');
    try { await api(`/visitor-passes/${cancelTarget.id}/cancel`, 'POST', { revision: cancelTarget.revision }); setSelected(null); setCancelTarget(null); await refresh(); }
    catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  const demoBills = data?.bills;
  const total = demoBills?.reduce((sum,b) => sum+b.outstanding_cents,0) || 0;
  return <section className="hh-home">
    <div className="hh-heading"><div><span>YOUR HOUSEHOLD</span><h2>Bills & payments</h2></div><button onClick={refresh} aria-label="Refresh bills and visitor passes">↻</button></div>
    {error && <p className="hh-error" role="alert">{error} Displayed records may be out of date.</p>}
    <div className="hh-balance"><div><small>DEMO OUTSTANDING BALANCE</small><strong>{data ? money(total) : 'Loading…'}</strong><p>{data ? `${demoBills!.filter(b => b.outstanding_cents > 0).length} unpaid bills · ${demoBills!.filter(b => b.overdue).length} overdue` : 'Getting your latest bills'}</p></div><span aria-hidden="true">▤</span><button onClick={() => setBillsOpen(!billsOpen)} aria-expanded={billsOpen}>{billsOpen ? 'Hide details ↑' : 'View bills →'}</button></div>
    {checkout && <DemoPayment bill={{ ...checkout, title: kinds[checkout.kind] }} close={() => setCheckout(null)} onSaved={() => { setHistory(true); void refresh(); }} />}
    <div className="hh-breakdown">{Object.entries(kinds).map(([key, label]) => <button key={key} onClick={() => setBillsOpen(true)}><span className={`hh-category ${key}`}>{key === 'electricity' ? 'ϟ' : key === 'water' ? '◉' : '▤'}</span><small>{label}</small><b>{data ? money(demoBills!.filter(b => b.kind === key).reduce((sum, b) => sum + b.outstanding_cents, 0)) : '—'}</b></button>)}</div>
    {billsOpen && <div className="hh-bill-list"><div className="hh-tabs"><button aria-pressed={!history} onClick={() => setHistory(false)}>Outstanding</button><button aria-pressed={history} onClick={() => setHistory(true)}>All bills</button></div>{demoBills?.filter(b => history || b.outstanding_cents > 0).map(b => <div key={b.id}><BillDetails bill={b} /><div className="demo-bill-actions">{b.outstanding_cents > 0 && <button className="bill-pay-button" aria-label={`Pay ${money(b.outstanding_cents)} for ${kinds[b.kind]}`} onClick={() => setCheckout(b)}><span className="bill-pay-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></svg></span><span className="bill-pay-label">Pay bill</span><strong>{money(b.outstanding_cents)}</strong><svg className="bill-pay-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></button>}{!!b.demo_payments?.length && <details><summary>Demo transaction history ({b.demo_payments.length})</summary><ul>{b.demo_payments.map(p => <li key={p.id}>{money(p.amount_cents)} · {p.outcome}<small>{new Date(p.created).toLocaleString()}</small><button onClick={() => downloadDemoReceipt(p)}>Download demo {p.outcome === 'success' ? 'receipt' : 'record'}</button></li>)}</ul></details>}</div></div>)}{data && !demoBills!.some(b => history || b.outstanding_cents > 0) && <p className="hh-empty">{history ? 'No bills have been issued to your account.' : 'No outstanding bills.'}</p>}</div>}
    <button className="hh-parking-launch" onClick={() => setParkingOpen(!parkingOpen)} aria-expanded={parkingOpen}><span className="hh-parking-icon">P</span><span><b>Visitor parking</b><small>Register a guest & generate a QR pass</small></span><span>{parkingOpen ? '−' : '+'}</span></button>
    {parkingOpen && <div className="hh-parking-content"><h3>Welcome your visitor</h3><p className="hh-caption">Enter your guest’s details to create a dated entry pass.</p><form onSubmit={create}><label>Visitor name<input required maxLength={80} autoComplete="off" value={form.visitor_name} onChange={e => setForm({ ...form, visitor_name: e.target.value })} /></label><label>Phone number<input required type="tel" maxLength={30} placeholder="e.g. +60123456789" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label><div className="hh-form-row"><label>Car plate<input required maxLength={16} placeholder="e.g. WXY 1234" value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value.toUpperCase() })} /></label><label>Visit date<DateTimeField label="Visit date" required min={data?.today} value={form.visit_date} onChange={value => setForm({ ...form, visit_date: value })} /></label></div><button className="hh-primary" disabled={busy}>{busy ? 'Saving…' : 'Generate visitor QR →'}</button></form>
      {message && <p className="hh-error" role="status">{message}</p>}
      {selectedPass && <PassCard pass={selectedPass} cancel={() => setCancelTarget(selectedPass)} />}
      {cancelTarget && <div className="hh-confirm" role="alert"><p>Cancel the pass for <b>{cancelTarget.plate}</b>? Its QR code will no longer permit entry.</p><button disabled={busy} onClick={cancel}>Confirm cancellation</button><button disabled={busy} onClick={() => setCancelTarget(null)}>Keep pass</button></div>}
      <h3>My visitor passes</h3>{data?.passes.length === 0 && <p className="hh-empty">No visitor passes yet.</p>}{data?.passes.map(p => <button className="hh-pass-row" key={p.id} onClick={() => { setSelected(p); setMessage(''); }}><span><b>{p.plate} · {p.visitor_name}</b><small>{dateLabel(p.visit_date)}</small></span><span className="hh-pill">{p.effective_status.replaceAll('_', ' ')}</span></button>)}
    </div>}
  </section>;
}

function AdminBillCard({ bill, refresh }: { bill: Bill; refresh: () => Promise<void> }) {
  const [amount, setAmount] = useState(''), [note, setNote] = useState(''), [action, setAction] = useState<'payment' | 'void'>('payment');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setMessage('');
    try { await api(`/admin/bills/${bill.id}`, 'PATCH', { action, amount_cents: action === 'payment' ? toCents(amount) : undefined, note, revision: bill.revision }); setNote(''); setAmount(''); await refresh(); setMessage('Record updated.'); }
    catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  return <article className="hh-admin-card"><b>{bill.resident_name}</b><small>{bill.resident_email}</small><BillDetails bill={bill} />{bill.outstanding_cents > 0 && <form onSubmit={submit}><label>Action<select value={action} onChange={e => setAction(e.target.value as 'payment' | 'void')}><option value="payment">Record received payment</option>{bill.paid_cents === 0 && <option value="void">Void incorrect bill</option>}</select></label>{action === 'payment' && <label>Amount received (RM)<input required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></label>}<label>{action === 'payment' ? 'Payment reference / receipt' : 'Reason for voiding'}<input required maxLength={300} value={note} onChange={e => setNote(e.target.value)} /></label><button disabled={busy} className="hh-primary">{busy ? 'Saving…' : action === 'payment' ? 'Confirm recorded payment' : 'Confirm void bill'}</button></form>}{message && <p role="status">{message}</p>}</article>;
}
export function AdminBills({ users }: { users: User[] }) {
  const { data, error, refresh } = useLive<{ bills: Bill[] }>('/admin/bills');
  const [form, setForm] = useState({ user_id: '', kind: 'electricity', period: '', due_date: '', amount: '', note: '' });
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [query, setQuery] = useState('');
  const requestKey = useRef(crypto.randomUUID());
  async function issue(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setMessage('');
    try { await api('/admin/bills', 'POST', { ...form, amount_cents: toCents(form.amount), client_key: requestKey.current }); requestKey.current = crypto.randomUUID(); setForm({ ...form, amount: '', note: '' }); await refresh(); setMessage('Bill issued. It is now visible on the resident’s Home page.'); }
    catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="hh-admin"><h2>Bills & outstanding fees</h2><p>Issue resident bills and record payments received. Amounts use MYR. Successful demo payments automatically update these balances and are labelled in bill history. No real money is transferred.</p><form className="hh-admin-card" onSubmit={issue}><h3>Issue a bill</h3><label>Resident<select required value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}><option value="">Choose a resident</option>{users.filter(u => u.role === 'resident' && u.active).map(u => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}</select></label><div className="hh-form-row"><label>Category<select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>{Object.entries(kinds).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label>Billing month<DateTimeField label="Billing month" mode="month" required value={form.period} onChange={value => setForm({ ...form, period: value })} /></label></div><div className="hh-form-row"><label>Amount (RM)<input required inputMode="decimal" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label><label>Due date<DateTimeField label="Due date" required value={form.due_date} onChange={value => setForm({ ...form, due_date: value })} /></label></div><label>Note / unit reference<input maxLength={300} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label><button className="hh-primary" disabled={busy}>{busy ? 'Issuing…' : 'Issue bill'}</button>{message && <p role="status">{message}</p>}</form>{error && <p role="alert">{error}</p>}<label>Find bills<input placeholder="Resident, email or billing month" value={query} onChange={e => setQuery(e.target.value)} /></label><div className="hh-admin-grid">{data?.bills.filter(b => `${b.resident_name} ${b.resident_email} ${b.period} ${kinds[b.kind]}`.toLowerCase().includes(query.toLowerCase())).map(b => <AdminBillCard key={b.id} bill={b} refresh={refresh} />)}</div>{data?.bills.length === 0 && <p>No bills issued yet.</p>}<DemoPaymentHistory /></section>;
}

export function AdminVisitors() {
  const { data, error, refresh } = useLive<{ passes: Pass[]; today: string }>('/admin/visitor-passes');
  const [code, setCode] = useState(new URLSearchParams(window.location.search).get('visitor_pass') || '');
  const [verified, setVerified] = useState<Pass | null>(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [query, setQuery] = useState('');
  // A QR opens the app with an opaque token, never visitor personal information.
  async function verify(e?: React.FormEvent) {
    e?.preventDefault(); if (busy) return; setBusy(true); setMessage(''); setVerified(null);
    try {
      let token = code.trim();
      if (token.startsWith('http')) token = new URL(token).searchParams.get('visitor_pass') || '';
      const result = await api<{ pass: Pass }>('/admin/visitor-passes/verify', 'POST', { token }); setVerified(result.pass);
      const clean = new URL(window.location.href); clean.searchParams.delete('visitor_pass'); window.history.replaceState({}, '', clean);
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  async function act(pass: Pass, action: string) {
    if (busy) return; setBusy(true); setMessage('');
    try { const result = await api<{ pass: Pass }>(`/admin/visitor-passes/${pass.id}`, 'PATCH', { action, revision: pass.revision }); setVerified(result.pass); await refresh(); }
    catch (e) { setVerified(null); setMessage((e as Error).message); await refresh(); }
    finally { setBusy(false); }
  }
  const current = verified ? data?.passes.find(p => p.id === verified.id && p.revision >= verified.revision) || verified : null;
  return <section className="hh-admin"><h2>Visitor parking</h2><p>Scan the guest’s QR with your phone camera to open this page, sign in as an administrator, then verify the code. You can also paste the code or scanned URL below. Confirm the person and car plate before recording entry.</p><form className="hh-admin-card" onSubmit={verify}><label>QR code / scanned URL<input required autoComplete="off" value={code} onChange={e => { setCode(e.target.value); setVerified(null); }} /></label><button disabled={busy} className="hh-primary">Verify pass</button></form>{(message || error) && <p className="hh-error" role="alert">{message || error}</p>}
    {current && <article className="hh-admin-card"><h3>{current.can_enter ? 'Valid for entry today' : current.effective_status === 'checked_in' ? 'Visitor is checked in' : 'Not valid for entry now'}</h3><p><b>{current.plate} · {current.visitor_name}</b><br />{current.phone}<br />Visit: {dateLabel(current.visit_date)}<br />Host: {current.resident_name || 'Registered resident'}<br />Status: {current.effective_status.replaceAll('_', ' ')}</p>{current.can_enter && <button disabled={busy} className="hh-primary" onClick={() => act(current, 'check_in')}>Confirm vehicle & check in</button>}{current.effective_status === 'checked_in' && <button disabled={busy} className="hh-primary" onClick={() => act(current, 'check_out')}>Record exit</button>}{current.effective_status === 'active' && <details><summary>Cancel pass</summary><p>This will invalidate the QR code.</p><button disabled={busy} onClick={() => act(current, 'cancel')}>Confirm cancellation</button></details>}</article>}
    <label>Find visitor<input placeholder="Visitor, host, plate or date" value={query} onChange={e => setQuery(e.target.value)} /></label><div className="hh-admin-grid">{data?.passes.filter(p => `${p.visitor_name} ${p.plate} ${p.resident_name} ${p.visit_date}`.toLowerCase().includes(query.toLowerCase())).map(p => <button className="hh-pass-row" key={p.id} onClick={() => { setCode(p.token); setVerified(null); setMessage('Code selected. Click Verify pass to check its current validity.'); }}><span><b>{p.plate} · {p.visitor_name}</b><small>{dateLabel(p.visit_date)} · {p.resident_name}</small></span><span className="hh-pill">{p.effective_status.replaceAll('_', ' ')}</span></button>)}</div>{data?.passes.length === 0 && <p>No visitor passes yet.</p>}</section>;
}
