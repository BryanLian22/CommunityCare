import type { ButtonHTMLAttributes } from 'react';
import './Profile.css';
export default function CloseButton({ label = 'Close', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }) {
  return <button {...props} type="button" className={`cc-close ${className}`} aria-label={label} title={label}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
    <span>Close</span>
  </button>;
}
