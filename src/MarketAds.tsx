import { useEffect, useState } from 'react';
import './MarketAds.css';
const slides = [
  { tag: 'HOME COMFORT', title: 'Keep your home cool', copy: 'Request air-conditioner servicing from your community team.', service: 'Air conditioner', icon: '❄', tone: 'cool' },
  { tag: 'REPAIRS MADE SIMPLE', title: 'Small fixes, less hassle', copy: 'Tell management what needs fixing. Track your request in the app.', service: 'General repair', icon: '⌂', tone: 'repair' },
  { tag: 'CARE FOR YOUR HOME', title: 'Doors & locks, sorted', copy: 'Request help with a faulty door or arrange a locksmith visit.', service: 'Locksmith', icon: '◇', tone: 'secure' }
];
export default function MarketAds({ onRequest }: { onRequest: (service: string) => void }) {
  const [index, setIndex] = useState(0), [paused, setPaused] = useState(false), [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false), [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches); sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (paused || hovered || focused || reduced) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') setIndex(i => (i + 1) % slides.length); }, 5000);
    return () => clearInterval(timer);
  }, [paused, hovered, focused, reduced]);
  return <section className="market-carousel" aria-label="Community service highlights" aria-roledescription="carousel" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
    <div className="market-carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
      {slides.map((slide, i) => <article key={slide.tag} className={`market-carousel-slide ${slide.tone}`} aria-hidden={i !== index} inert={i !== index}>
        <span className="market-carousel-badge">COMMUNITY SERVICES</span><div className="market-carousel-copy"><small>{slide.tag}</small><h2>{slide.title}</h2><p>{slide.copy}</p><button onClick={() => onRequest(slide.service)}>Request service <span aria-hidden="true">→</span></button></div><span className="market-carousel-icon" aria-hidden="true">{slide.icon}</span>
      </article>)}
    </div>
    <div className="market-carousel-controls"><button aria-label="Previous advertisement" onClick={() => setIndex((index + slides.length - 1) % slides.length)}>‹</button><div className="market-carousel-dots">{slides.map((s, i) => <button key={s.tag} aria-label={`Show advertisement ${i + 1}: ${s.title}`} aria-pressed={i === index} onClick={() => setIndex(i)} />)}</div><button aria-label="Next advertisement" onClick={() => setIndex((index + 1) % slides.length)}>›</button><button className="market-carousel-pause" aria-label={paused ? 'Resume automatic slides' : 'Pause automatic slides'} onClick={() => setPaused(!paused)} disabled={reduced}>{paused || reduced ? '▶' : 'Ⅱ'}</button></div>
  </section>;
}
