import { createPortal } from 'react-dom';
import Wheel from './PickerWheel';
import DateTimeField from './DateTimeField';
import { useEffect, useRef, useState } from 'react';
import { api } from './api';
const dayString = (d: Date) => d.toISOString().slice(0, 10);
const prettyDay = (date: string) => new Date(date + 'T12:00:00Z').toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
export default function BookingPicker({ facility, date, time, today, onCancel, onConfirm }: {
  facility: string;
  date: string;
  time: string;
  today: string;
  onCancel: () => void;
  onConfirm: (date: string, time: string) => void
}) {
  const [closure, setClosure] = useState('');
  const [draftDate, setDraftDate] = useState(date), [draftTime, setDraftTime] = useState(time), [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [reload, setReload] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const month = draftDate.slice(0, 7), monthStart = new Date(month + '-01T12:00:00Z'), daysInMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`).filter(d => d >= today).map(d => ({ value: d, label: d === today ? 'Today' : prettyDay(d) }));
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    dialog.current?.focus();
    return () => previous?.focus()
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSlots([]);
    api<{ isOpen: boolean; closureReason: string; slots: { time: string; available: boolean }[] }>(`/bookings/availability?facility=${encodeURIComponent(facility)}&date=${draftDate}`).then(r => {
      if (active) {
        setClosure(r.isOpen ? '' : r.closureReason);
        setSlots(r.slots);
        setDraftTime(old => r.slots.some(s => s.available && s.time === old) ? old : r.slots.find(s => s.available)?.time || '')
      }
    }).catch(e => {
      if (active) setError(e.message)
    }).finally(() => {
      if (active) setLoading(false)
    });
    return () => {
      active = false
    }
  }, [facility, draftDate, reload]);
  const available = slots.filter(s => s.available);
  const canConfirm = !loading && !error && available.some(s => s.time === draftTime);
  function changeDate(value: string) {
    if (value === draftDate) return;
    setLoading(true);
    setSlots([]);
    setDraftDate(value)
  }
  function moveMonth(delta: number) {
    const d = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + delta, 1, 12));
    const first = dayString(d);
    changeDate(first < today ? today : first)
  }
  return createPortal(<div className="booking-picker-overlay" onKeyDown={e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel()
    }
    if (e.key === 'Tab') {
      e.stopPropagation();
      const els = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,[tabindex="0"]') || []);
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        e.preventDefault();
        last?.focus()
      } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
        e.preventDefault();
        first?.focus()
      }
    }
  }}>
    <div className="booking-picker-dialog" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="booking-picker-title">
      <div className="picker-grip" />
      <span className="contact-eyebrow">{facility.toUpperCase()} · MALAYSIA TIME</span>
      <h2 id="booking-picker-title">Select date & time</h2>
      <p>Scroll to choose your preferred slot.</p>
      <div className="picker-month-nav">
        <button aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => moveMonth(-1)}>‹</button>
        <label>
          <span className="sr-only">Booking month</span>
          <DateTimeField label="Booking month" mode="month" value={month} min={today.slice(0, 7)} onChange={value => {
            const first = value + '-01';
            changeDate(first < today ? today : first);
          }} />
        </label>
        <button aria-label="Next month" onClick={() => moveMonth(1)}>›</button>
      </div>
      <div className="picker-column-labels">
        <span>DATE</span>
        <span>AVAILABLE TIME</span>
      </div>
      <div className="picker-wheels">
        <div className="wheel-selection-band" />
        <Wheel label="Booking day" options={days} value={draftDate} onChange={changeDate} />
        {loading ? <div className="wheel-state" role="status">Checking slots…</div> : error ? <div className="wheel-state">Unable to load</div> : available.length ? <Wheel label="Booking time" options={available.map(s => ({ value: s.time, label: s.time }))} value={draftTime} onChange={setDraftTime} /> : <div className="wheel-state">No slots<br />Choose another day</div>}
      </div>
      {error && <div role="alert" className="contact-error">
        {error}
        <button onClick={() => setReload(n => n + 1)}>Retry</button>
      </div>}
      {closure && <p role="status" className="contact-error">Closed: {closure}</p>}
      <p className="picker-summary" aria-live="polite">
        {prettyDay(draftDate)}
        {canConfirm ? `· ${draftTime}` : ''}
      </p>
      <div className="picker-actions">
        <button onClick={onCancel}>Cancel</button>
        <button disabled={!canConfirm} onClick={() => onConfirm(draftDate, draftTime)}>Confirm</button>
      </div>
    </div>
  </div>, document.body);
}
