import DateTimeField from './DateTimeField';
import BookingPicker from './BookingPicker';
import { useEffect, useRef, useState } from 'react';
import { api, type Entry, type Facility } from './api';
import './bookings.css';
function FacilityIcon({ kind }: { kind: string }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    {kind === 'fitness' ? <><path d="M3 8v8m3-10v12m12-12v12m3-10v8M6 12h12" /></> : kind === 'wellness' ? <><path d="M5 15h14l-2 6H7l-2-6Zm3-3c-4-4 4-5 0-9m4 9c-4-4 4-5 0-9m4 9c-4-4 4-5 0-9" /></> : <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 5v14M3 12h18" /></>}
  </svg>
}
export const malaysiaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const clock: Record<string, string> = { '9:00 AM': '09:00', '10:30 AM': '10:30', '2:00 PM': '14:00', '4:30 PM': '16:30' };
export const bookingStarted = (r: Entry) => Date.parse(`${r.date}T${clock[r.time || '']}:00+08:00`) <= Date.now();
const label = (s: string) => s.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
type Availability = {
  isOpen: boolean;
  closureReason: string;
  facility: string;
  date: string;
  slots: { time: string; available: boolean; reason: string }[]
};
export function BookingHistory({ record: r }: { record: Entry }) {
  return <>
    {r.note && <p className="booking-note">
      <b>Management update:</b>
      {r.note}
    </p>}
    {!!r.history?.length && <details className="help-timeline">
      <summary>Booking history</summary>
      <ol>
        {r.history.map((event, i) => <li key={i}>
          <strong>{label(event.status)}</strong>
          <time>{new Date(event.at).toLocaleString()}</time>
          {event.note && <p>{event.note}</p>}
        </li>)}
      </ol>
    </details>}
  </>
}
export default function BookFacility({ initialFacility = 'Gym', facilities, onRefresh, onDone }: { initialFacility?: string; facilities: Facility[]; onRefresh: () => Promise<void>; onDone: () => void }) {
  const [facilityCatalog, setFacilityCatalog] = useState(facilities);
  useEffect(() => {
    setFacilityCatalog(facilities)
  }, [facilities]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (!document.hidden) void api<{ facilities: Facility[] }>('/facilities').then(d => {
        if (active) setFacilityCatalog(d.facilities)
      }).catch(() => { })
    };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh)
    }
  }, []);
  const [search, setSearch] = useState(''), [category, setCategory] = useState('All'), [pickerOpen, setPickerOpen] = useState(false);
  const [facility, setFacility] = useState(initialFacility), [date, setDate] = useState(malaysiaToday()), [selected, setSelected] = useState(''), [availability, setAvailability] = useState<Availability | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false), [reload, setReload] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    let sequence = 0;
    const load = async () => {
      const n = ++sequence;
      try {
        const result = await api<Availability>(`/bookings/availability?facility=${encodeURIComponent(facility)}&date=${encodeURIComponent(date)}`);
        if (active && n === sequence) {
          setAvailability(result);
          setSelected(old => result.slots.some(s => s.time === old && s.available) ? old : '');
          setError('')
        }
      } catch (e) {
        if (active && n === sequence) {
          setAvailability(null);
          setError((e as Error).message)
        }
      } finally {
        if (active && n === sequence) setLoading(false)
      }
    };
    setLoading(true);
    setAvailability(null);
    void load();
    const refresh = () => {
      if (!document.hidden) void load()
    };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh)
    }
  }, [facility, date, reload]);
  const current = availability?.facility === facility && availability.date === date ? availability : null;
  async function submit() {
    if (lock.current || !current?.slots.some(s => s.time === selected && s.available)) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await api('/records/bookings', 'POST', { facility, date, time: selected });
      setSaved(true);
      try {
        await onRefresh();
        onDone()
      } catch {
        setError('Booking saved, but the list could not refresh. Close this panel and refresh your requests.')
      }
    } catch (e) {
      setError((e as Error).message);
      setSelected('');
      setAvailability(null);
      setLoading(false)
    } finally {
      lock.current = false;
      setBusy(false)
    }
  }
  const filtered = facilityCatalog.filter(f => (category === 'All' || f.category === category) && `${f.name} ${f.category} ${f.description}`.toLowerCase().includes(search.toLowerCase()));
  const chosen = facilityCatalog.find(f => f.name === facility);
  useEffect(() => {
    if (chosen && !chosen.isOpen) {
      setPickerOpen(false);
      setSelected('')
    }
  }, [chosen?.isOpen]);
  return <section className="facility-booking">
    <div inert={pickerOpen}>
      <div className="booking-page-heading">
        <span className="contact-eyebrow">YOUR COMMUNITY, YOUR SPACE</span>
        <h2>Book a facility</h2>
        <p>Find your space. Make it your time.</p>
      </div>
      {error && <div className="contact-error" role="alert">{error}</div>}
      {saved ? <p className="contact-success" role="status">Your booking was submitted for approval.</p> : <>
        <div className="booking-step-heading">
          <span>01</span>
          <h3>Choose your space</h3>
          <small>{facilityCatalog.length} facilities</small>
        </div>
        <label className="facility-search">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="10" cy="10" r="6" />
            <path d="m15 15 5 5" />
          </svg>
          <input aria-label="Search facilities" placeholder="Search facilities…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <div className="facility-categories" aria-label="Facility categories">
          {['All', ...new Set(facilityCatalog.map(f => f.category))].map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}
        </div>
        <div className="facility-catalog" aria-label="Available facilities">
          {filtered.map(f => <button className={`facility-option ${facility === f.name ? 'is-selected' : ''}`} key={f.name} aria-pressed={facility === f.name} disabled={busy || !f.isOpen} onClick={() => {
            setSelected('');
            setFacility(f.name)
          }}>
            <span className={`facility-option-icon ${f.icon}`}><FacilityIcon kind={f.icon} /></span>
            <span className="facility-option-copy">
              <small>{f.category}</small>
              <b>{f.name}</b>
              <span>{f.description}</span>
              {!f.isOpen && <span className="facility-closed">Closed · {f.closureReason}</span>}
            </span>
            <span className="facility-radio" aria-hidden="true">{facility === f.name ? '✓' : ''}</span>
          </button>)}
          {!filtered.length && <div className="facility-no-results">No facilities match your search.<button onClick={() => {
            setSearch('');
            setCategory('All')
          }}>Clear filters</button></div>}
        </div>
        <div className="booking-step-heading">
          <span>02</span>
          <h3>Pick a date & time</h3>
        </div>
        <button className="booking-date-trigger" disabled={busy || !chosen?.isOpen} onClick={() => setPickerOpen(true)}>
          <span className="booking-calendar-icon" aria-hidden="true">▦</span>
          <span>
            <small>{selected ? 'YOUR SELECTED SLOT' : 'CHOOSE YOUR SLOT'}</small>
            <b>{new Date(date + 'T12:00:00Z').toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</b>
            <em>{selected || 'Select an available time'}</em>
          </span>
          <span aria-hidden="true">›</span>
        </button>
        {chosen && !chosen.isOpen && <p role="status" className="contact-error">Temporarily closed: {chosen.closureReason}</p>}
        <div className="booking-slot-status">
          <span>
            {loading ? 'Checking availability…' : current ? `${current.slots.filter(s => s.available).length} available slots for ${facility}` : 'Availability not loaded'}
          </span>
          <button disabled={busy || loading} onClick={() => setReload(n => n + 1)}>Refresh</button>
        </div>
        <p className="booking-timezone">Malaysia time (UTC+8) · One reservation per slot</p>
        <div className="booking-review">
          <span className="contact-eyebrow">YOUR RESERVATION</span>
          <div>
            <span className="facility-option-icon"><FacilityIcon kind={chosen?.icon || 'sports'} /></span>
            <span><b>{facility}</b><small>{date} · {selected || 'Time not selected'}</small></span>
            <span className="booking-approval-tag">Approval required</span>
          </div>
          <p>Your slot is held once submitted, while management reviews your booking.</p>
          <button className="contact-save" disabled={busy || loading || !chosen?.isOpen || !selected || !current?.slots.some(s => s.time === selected && s.available)} onClick={() => void submit()}>
            {busy ? 'Submitting…' : 'Request booking'}
          </button>
        </div>
      </>}
    </div>
    {pickerOpen && chosen?.isOpen && <BookingPicker facility={facility} date={date} time={selected} today={malaysiaToday()} onCancel={() => setPickerOpen(false)} onConfirm={(d, t) => {
      setDate(d);
      setSelected(t);
      setPickerOpen(false);
      setReload(n => n + 1)
    }} />}
  </section>

}
export function AdminBookings({ records, facilities, onRefresh }: { records: Entry[]; facilities: Facility[]; onRefresh: () => Promise<void> }) {
  const [query, setQuery] = useState(''), [facility, setFacility] = useState('all'), [status, setStatus] = useState('all'), [date, setDate] = useState('');
  const filtered = records.filter(r => (facility === 'all' || r.facility === facility) && (status === 'all' || r.status === status) && (!date || r.date === date) && `${r.residentName} ${r.residentEmail}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="admin-panel">
    <h2>Facility reservations</h2>
    <p>Approve requests before the slot starts. Pending and approved bookings reserve the slot.</p>
    <div className="booking-admin-filters">
      <input aria-label="Search booking resident" placeholder="Search resident" value={query} onChange={e => setQuery(e.target.value)} />
      <select aria-label="Filter facility" value={facility} onChange={e => setFacility(e.target.value)}>
        {['all', ...facilities.map(f => f.name)].map(f => <option key={f} value={f}>{f === 'all' ? 'All facilities' : f}</option>)}
      </select>
      <select aria-label="Filter booking status" value={status} onChange={e => setStatus(e.target.value)}>
        {['all', 'pending', 'approved', 'completed', 'rejected', 'cancelled'].map(s => <option key={s} value={s}>{label(s)}</option>)}
      </select>
      <DateTimeField label="Filter booking date" value={date} onChange={setDate} />
      <button onClick={() => {
        setQuery('');
        setFacility('all');
        setStatus('all');
        setDate('')
      }}>Clear filters</button>
    </div>
    <div className="request-grid">
      {!filtered.length && <p>No matching bookings.</p>}
      {filtered.map(r => <AdminBooking key={`${r.id}-${r.status}`} record={r} onRefresh={onRefresh} />)}
    </div>
  </section>
}
function AdminBooking({ record: r, onRefresh }: { record: Entry; onRefresh: () => Promise<void> }) {
  const [status, setStatus] = useState(''), [note, setNote] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const started = bookingStarted(r);
  const choices = r.status === 'pending' ? [...(started ? [] : ['approved']), 'rejected', 'cancelled'] : r.status === 'approved' ? [...(started ? ['completed'] : []), 'cancelled'] : [];
  return <article className="help-card">
    <div className="help-card-heading">
      <h3>{r.facility}</h3>
      <span className={`status-pill ${r.status}`}>{label(r.status)}</span>
    </div>
    <p>
      <b>{r.residentName}</b>
      <br />
      {r.residentEmail}
    </p>
    <div className="help-assignment">
      <b>{r.date} · {r.time}</b>
      <small>Malaysia time · Ref {r.id.slice(0, 8)}</small>
    </div>
    <BookingHistory record={r} />
    {started && r.status === 'pending' && <p className="help-note">This slot has passed. Reject or cancel the pending request.</p>}
    {choices.length > 0 ? <form className="help-form" onSubmit={async e => {
      e.preventDefault();
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setError('');
      try {
        await api(`/admin/records/${r.id}`, 'PATCH', { status, note, expectedStatus: r.status });
        try {
          await onRefresh()
        } catch {
          setError('Saved. Refresh the dashboard to see the latest status.')
        }
      } catch (e) {
        setError((e as Error).message)
      } finally {
        lock.current = false;
        setBusy(false)
      }
    }}>
      <label>Booking decision<select required value={status} onChange={e => setStatus(e.target.value)}>
        <option value="">Choose action</option>
        {choices.map(s => <option key={s} value={s}>{label(s)}</option>)}
      </select></label>
      <label>Note for resident<textarea maxLength={1000} required={['rejected', 'cancelled'].includes(status)} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Include a reason if rejecting or cancelling." /></label>
      {error && <p role="alert" className="contact-error">{error}</p>}
      <button className="contact-save" disabled={busy || !status}>{busy ? 'Saving…' : 'Save booking decision'}</button>
    </form> : <p className="help-note">Closed booking · retained in history</p>}
  </article>
}
