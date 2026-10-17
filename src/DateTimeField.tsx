import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Wheel from './PickerWheel';
import './bookings.css';

type Props = { label: string; value: string; onChange: (value: string, time?: string) => void; min?: string; mode?: 'date' | 'month'; time?: string; times?: string[]; required?: boolean };
const malaysiaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const pretty = (value: string, monthOnly = false) => value ? new Date(value + (monthOnly ? '-01' : '') + 'T12:00:00Z').toLocaleDateString('en-MY', { ...(monthOnly ? { year: 'numeric' as const } : { day: 'numeric' as const }), month: 'long', timeZone: 'UTC' }) : '';
export default function DateTimeField(props: Props) {
  const [open, setOpen] = useState(false);
  return <span className="date-time-field">
    <button type="button" className="date-time-trigger" onClick={() => setOpen(true)} aria-label={props.label} aria-haspopup="dialog">{props.value ? `${pretty(props.value, props.mode === 'month')}${props.time ? ` · ${props.time}` : ''}` : props.label}<span aria-hidden="true">▦</span></button>
    {props.required && <input className="picker-required" aria-label={props.label} tabIndex={-1} required value={props.value} onChange={() => {}} onInvalid={e => { e.preventDefault(); setOpen(true); }} />}
    {open && createPortal(<Picker {...props} close={() => setOpen(false)} />, document.body)}
  </span>;
}
function Picker({ label, value, min, mode = 'date', time, times, onChange, close }: Props & { close: () => void }) {
  const today = malaysiaToday();
  const initial = value || (mode === 'month' ? today.slice(0, 7) : today);
  const [draft, setDraft] = useState(min && initial < min ? min : initial);
  const [slot, setSlot] = useState(time && times?.includes(time) ? time : times?.[0] || '');
  const ref = useRef<HTMLDialogElement>(null), id = useId();
  useEffect(() => { const previous = document.activeElement as HTMLElement; ref.current?.showModal(); return () => { previous?.focus(); }; }, []);
  const month = draft.slice(0, 7), year = Number(draft.slice(0, 4));
  const options = mode === 'month' ? Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`).filter(d => !min || d >= min).map(d => ({ value: d, label: pretty(d, true) })) : Array.from({ length: new Date(Date.UTC(year, Number(month.slice(5)), 0)).getUTCDate() }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`).filter(d => !min || d >= min).map(d => ({ value: d, label: d === today ? 'Today' : new Date(d + 'T12:00:00Z').toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) }));
  function move(delta: number) {
    const d = new Date(Date.UTC(year + (mode === 'month' ? delta : 0), Number(month.slice(5)) - 1 + (mode === 'date' ? delta : 0), 1, 12));
    const next = d.toISOString().slice(0, mode === 'month' ? 7 : 10);
    setDraft(min && next < min ? min : next);
  }
  return <dialog ref={ref} className="booking-picker-dialog unified-picker" aria-labelledby={id} onCancel={e => { e.preventDefault(); close(); }} onKeyDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
    <div className="picker-grip" /><span className="contact-eyebrow">{label.toUpperCase()} · MALAYSIA TIME</span>
    <h2 id={id}>Select {mode === 'month' ? 'month' : times ? 'date & time' : 'date'}</h2><p>Scroll to choose your preferred {mode === 'month' ? 'month' : times ? 'slot' : 'date'}.</p>
    <div className="picker-month-nav"><button type="button" aria-label={mode === 'month' ? 'Previous year' : 'Previous month'} disabled={!!min && (mode === 'month' ? draft.slice(0, 4) <= min.slice(0, 4) : month <= min.slice(0, 7))} onClick={() => move(-1)}>‹</button><span>{mode === 'month' ? year : pretty(month, true)}</span><button type="button" aria-label={mode === 'month' ? 'Next year' : 'Next month'} onClick={() => move(1)}>›</button></div>
    <div className={`picker-column-labels ${!times ? 'single-wheel' : ''}`}><span>{mode === 'month' ? 'MONTH' : 'DATE'}</span>{times && <span>TIME</span>}</div>
    <div className={`picker-wheels ${!times ? 'single-wheel' : ''}`}><div className="wheel-selection-band" /><Wheel label="Selected date" options={options} value={draft} onChange={setDraft} />{times && <Wheel label="Selected time" options={times.map(t => ({ value: t, label: t }))} value={slot} onChange={setSlot} />}</div>
    <p className="picker-summary" aria-live="polite">{pretty(draft, mode === 'month')}{times ? ` · ${slot}` : ''}</p>
    <div className="picker-actions"><button type="button" onClick={close}>Cancel</button><button type="button" disabled={!options.some(o => o.value === draft) || !!times && !times.includes(slot)} onClick={() => { onChange(draft, slot); close(); }}>Confirm</button></div>
  </dialog>;
}
