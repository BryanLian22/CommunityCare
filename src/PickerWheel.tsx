import { useEffect, useId, useRef } from 'react';
export default function Wheel({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  const uid = useId();
  const ref = useRef<HTMLDivElement>(null), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const index = Math.max(0, options.findIndex(o => o.value === value));
  const signature = options.map(o => o.value).join('|');
  useEffect(() => {
    clearTimeout(timer.current);
    const el = ref.current;
    if (el && Math.abs(el.scrollTop - index * 48) > 2) el.scrollTop = index * 48
  }, [index, signature]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <div className="booking-wheel" role="listbox" aria-label={label} aria-activedescendant={`${uid}-${index}`} tabIndex={0} ref={ref} onKeyDown={e => {
    const offset = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!options.length) return;
    if (offset) {
      e.preventDefault();
      onChange(options[Math.max(0, Math.min(options.length - 1, index + offset))].value)
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      onChange(options[e.key === 'Home' ? 0 : options.length - 1].value)
    }
  }} onScroll={() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const nearest = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / 48)));
      if (options[nearest]) onChange(options[nearest].value)
    }, 100)
  }}>
    <div className="wheel-spacer" />
    {options.map((option, i) => <div className={option.value === value ? 'wheel-option chosen' : 'wheel-option'} id={`${uid}-${i}`} role="option" aria-selected={option.value === value} key={option.value} onClick={() => onChange(option.value)}>
      {option.label}
    </div>)}
    <div className="wheel-spacer" />
  </div>
}
