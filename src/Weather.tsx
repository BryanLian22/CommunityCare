import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import './weather.css';
type Place = { name: string; latitude: number; longitude: number };
type WeatherData = {
  location: Place;
  timezone: string;
  fetchedAt: number;
  current: {
    time: number;
    temperature: number;
    feelsLike: number | null;
    code: number | null;
    wind: number | null;
    humidity: number | null
  };
  hourly: { time: number; temperature: number | null; code: number | null; rain: number | null }[];
  daily: { time: number; code: number | null; high: number | null; low: number | null; rain: number | null }[];
  air: { aqi: number; time: number } | null
};
const value = (n: number | null | undefined, suffix = '') => n === null || n === undefined ? '—' : `${Math.round(n)}${suffix}`;
export function weatherDescription(code: number | null) {
  if (code === null) return 'Condition unavailable';
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([80, 81, 82].includes(code)) return 'Rain showers';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Condition unavailable'
}
function WeatherIcon({ code }: { code: number | null }) {
  return <span className="weather-live-icon" aria-hidden="true">
    {code !== null && [95, 96, 99].includes(code) ? '☈' : code === 0 || code === 1 ? '☀' : code !== null && code >= 51 ? '☂' : '☁'}
  </span>
}
const aqiLabel = (n: number) => n <= 50 ? 'Good' : n <= 100 ? 'Moderate' : n <= 150 ? 'Unhealthy for sensitive groups' : n <= 200 ? 'Unhealthy' : n <= 300 ? 'Very unhealthy' : 'Hazardous';
export default function Weather() {
  const [location, setLocation] = useState<Place | null>(null), [data, setData] = useState<WeatherData | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [settings, setSettings] = useState(false), [query, setQuery] = useState(''), [results, setResults] = useState<Place[]>([]), [searchDone, setSearchDone] = useState(false), [searching, setSearching] = useState(false), [busy, setBusy] = useState(false), [locating, setLocating] = useState(false), [locationError, setLocationError] = useState(''), [reload, setReload] = useState(0), [expanded, setExpanded] = useState(false);
  const searchSeq = useRef(0), mounted = useRef(true), lock = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    api<{ location: Place | null }>('/weather/location').then(d => {
      if (active) {
        setLocation(d.location);
        setSettings(!d.location)
      }
    }).catch(e => {
      if (active) {
        setError(e.message);
        setSettings(true)
      }
    }).finally(() => {
      if (active) setLoading(false)
    });
    return () => {
      active = false;
      mounted.current = false
    }
  }, []);
  useEffect(() => {
    if (!location) return;
    let active = true;
    setLoading(true);
    setError('');
    api<WeatherData>('/weather').then(d => {
      if (active) setData(d)
    }).catch(e => {
      if (active) setError(e.message)
    }).finally(() => {
      if (active) setLoading(false)
    });
    return () => {
      active = false
    }
  }, [location, reload]);
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) setReload(n => n + 1)
    };
    const timer = window.setInterval(refresh, 600000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh)
    }
  }, []);
  async function save(place: Place) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setLocationError('');
    try {
      const d = await api<{ location: Place }>('/weather/location', 'PATCH', place);
      if (mounted.current) {
        setData(null);
        setLocation(d.location);
        setSettings(false);
        setResults([])
      }
    } catch (e) {
      if (mounted.current) setLocationError((e as Error).message)
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false)
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      setLocationError('Location is unavailable. Search for your city instead.');
      return
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(p => {
      if (!mounted.current) return;
      setLocating(false);
      void save({ name: 'My approximate location', latitude: p.coords.latitude, longitude: p.coords.longitude })
    }, () => {
      if (mounted.current) {
        setLocating(false);
        setLocationError('Location permission was denied or unavailable. Search for your city instead.')
      }
    }, { timeout: 10000, maximumAge: 300000 })
  }
  const stale = !!data && (!!error || Date.now() - data.current.time * 1000 > 10800000);
  const fmt = (t: number, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-MY', { timeZone: data?.timezone || 'UTC', ...options }).format(new Date(t * 1000));
  return <div className="live-weather">
    <section className="environment-card">
      <header className="weather-location-heading">
        <div>
          <span className="contact-eyebrow">LOCAL WEATHER</span>
          <h3>{location?.name || 'Choose your area'}</h3>
        </div>
        <button onClick={() => setSettings(!settings)}>{settings ? 'Close' : 'Change'}</button>
      </header>
      {settings && <div className="weather-settings">
        <form onSubmit={async e => {
          e.preventDefault();
          const seq = ++searchSeq.current;
          setSearching(true);
          setSearchDone(false);
          setLocationError('');
          try {
            const d = await api<{ locations: Place[] }>(`/weather/search?q=${encodeURIComponent(query.trim())}`);
            if (mounted.current && seq === searchSeq.current) {
              setResults(d.locations);
              setSearchDone(true)
            }
          } catch (e) {
            if (mounted.current && seq === searchSeq.current) setLocationError((e as Error).message)
          } finally {
            if (mounted.current) setSearching(false)
          }
        }}>
          <label>City or town<input required minLength={2} maxLength={100} placeholder="e.g. Kuala Lumpur, Johor Bahru" value={query} onChange={e => {
            searchSeq.current++;
            setQuery(e.target.value);
            setResults([]);
            setSearchDone(false)
          }} /></label>
          <button disabled={searching || busy || locating}>{searching ? 'Searching…' : 'Search'}</button>
        </form>
        <div className="weather-city-results">
          {results.map((p, i) => <button key={i} disabled={busy || locating} onClick={() => void save(p)}>{p.name}</button>)}
          {searchDone && !results.length && <p>No cities found. Try another spelling.</p>}
        </div>
        <div className="weather-location-actions">
          <button disabled={busy || locating} onClick={locate}>{locating ? 'Finding location…' : 'Use my location'}</button>
          <button disabled={busy || locating} onClick={() => void save({ name: 'Kuala Lumpur, Malaysia', latitude: 3.139, longitude: 101.687 })}>Use Kuala Lumpur</button>
        </div>
        <p className="weather-small">Your chosen area is saved to your account. Approximate coordinates are sent to Open-Meteo for weather; GPS is requested only when you press “Use my location”.</p>
        {locationError && <p className="contact-error" role="alert">{locationError}</p>}
      </div>}
      {error && <p className="contact-error" role="alert">
        {error}
        {data ? ' Showing the last result; it may be out of date.' : ''}
      </p>}
      {loading && <p role="status">Loading weather…</p>}
      {!location && !loading && <p className="weather-small">Search for your city or choose your location to load live weather.</p>}
      {data && <>
        <div className="environment-top">
          <div className="weather-now">
            <WeatherIcon code={data.current.code} />
            <div>
              <b>{value(data.current.temperature, '°')}</b>
              <small>{weatherDescription(data.current.code)} · Feels like {value(data.current.feelsLike, '°')}</small>
            </div>
          </div>
          <span className={`live-badge ${stale ? 'weather-stale' : ''}`}>
            <i />
            {stale ? 'LAST RESULT' : 'LIVE DATA'}
          </span>
        </div>
        <div className="environment-stats">
          <div>
            <small>U.S. AQI</small>
            <b>{value(data.air?.aqi)}</b>
            <span className="weather-stat-detail">{data.air ? aqiLabel(data.air.aqi) : 'Unavailable'}</span>
          </div>
          <div><small>RAIN · THIS HOUR</small><b>{value(data.hourly[0]?.rain, '%')}</b></div>
          <div><small>WIND</small><b>
            {value(data.current.wind)}
            <em>km/h</em>
          </b></div>
        </div>
        <div className="weather-update-meta">
          <span>Conditions {fmt(data.current.time, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · {data.timezone}</span>
          <button disabled={loading || busy} onClick={() => setReload(n => n + 1)}>Refresh</button>
        </div>
        <p className="weather-small">Model-estimated conditions · humidity {value(data.current.humidity, '%')}. {data.air ? `Air estimate ${fmt(data.air.time, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.` : 'Air-quality data is currently unavailable.'}</p>
      </>}
      {location && !data && !loading && <button className="weather-retry" onClick={() => setReload(n => n + 1)}>Retry weather</button>}
    </section>
    {data && <section className="weather-outlook">
      <header>
        <div>
          <span className="contact-eyebrow">WEATHER OUTLOOK</span>
          <h3>Next three days</h3>
        </div>
        <span className="weather-model-badge">Forecast</span>
      </header>
      <div className="weather-days">
        {data.daily.map(d => <article key={d.time}>
          <strong>{fmt(d.time, { weekday: 'short', day: 'numeric' })}</strong>
          <WeatherIcon code={d.code} />
          <b>
            {value(d.high, '°')}
            <span>{value(d.low, '°')}</span>
          </b>
          <small>{weatherDescription(d.code)}</small>
          <small>Rain max {value(d.rain, '%')}</small>
        </article>)}
      </div>
      <button className="weather-expand" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide hourly forecast' : 'View hourly forecast'}
        <span>›</span>
      </button>
      {expanded && <div className="weather-hours">
        {data.hourly.map(h => <div key={h.time}>
          <time>{fmt(h.time, { hour: 'numeric' })}</time>
          <WeatherIcon code={h.code} />
          <b>{value(h.temperature, '°')}</b>
          <small>Rain {value(h.rain, '%')}</small>
        </div>)}
      </div>}
      <p className="weather-small">Forecasts can change. Official storm warnings and flood-risk alerts are not connected.</p>
    </section>}
    <p className="weather-attribution">Weather: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · Air quality: <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">CAMS via Open-Meteo</a><br />Refreshes every 10 minutes while this page is open.</p>
  </div>
}
