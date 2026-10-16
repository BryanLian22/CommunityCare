const cache = new Map(), pending = new Map();
const n = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Weather provider unavailable');
  return response.json()
}
export async function searchWeatherCities(query) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({ name: query, count: '8', language: 'en', format: 'json' });
  const data = await json(url);
  return (data.results || []).map(r => ({ name: [r.name, r.admin1, r.country].filter(Boolean).join(', '), latitude: r.latitude, longitude: r.longitude })).filter(r => n(r.latitude) !== null && n(r.longitude) !== null)
}
export function normalizeWeather(w, a) {
  if (n(w.current?.time) === null || n(w.current?.temperature_2m) === null || !Array.isArray(w.hourly?.time) || !Array.isArray(w.daily?.time) || typeof w.timezone !== 'string') throw new Error('Invalid weather response');
  try {
    new Intl.DateTimeFormat('en', { timeZone: w.timezone })
  } catch {
    throw new Error('Invalid timezone')
  }
  const hours = w.hourly.time.map((time, i) => ({
    time: n(time),
    temperature: n(w.hourly.temperature_2m?.[i]),
    code: n(w.hourly.weather_code?.[i]),
    rain: n(w.hourly.precipitation_probability?.[i])
  })).filter(h => h.time !== null && h.time >= Math.floor(w.current.time / 3600) * 3600).slice(0, 12);
  return {
    timezone: w.timezone,
    fetchedAt: Date.now(),
    current: {
      time: w.current.time,
      temperature: w.current.temperature_2m,
      feelsLike: n(w.current.apparent_temperature),
      code: n(w.current.weather_code),
      wind: n(w.current.wind_speed_10m),
      humidity: n(w.current.relative_humidity_2m)
    },
    hourly: hours,
    daily: w.daily.time.slice(0, 3).map((time, i) => ({
      time: n(time),
      code: n(w.daily.weather_code?.[i]),
      high: n(w.daily.temperature_2m_max?.[i]),
      low: n(w.daily.temperature_2m_min?.[i]),
      rain: n(w.daily.precipitation_probability_max?.[i])
    })).filter(d => d.time !== null),
    air: n(a?.current?.us_aqi) !== null && n(a?.current?.time) !== null ? { aqi: a.current.us_aqi, time: a.current.time } : null
  };
}
export async function getWeather(latitude, longitude) {
  const key = `${latitude},${longitude}`, cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < 600000) return cached;
  if (pending.has(key)) return pending.get(key);
  const request = (async () => {
    const common = { latitude: String(latitude), longitude: String(longitude), timezone: 'auto', timeformat: 'unixtime' };
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.search = new URLSearchParams({
      ...common,
      current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m',
      hourly: 'temperature_2m,weather_code,precipitation_probability',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      forecast_days: '3',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh'
    });
    const airUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    airUrl.search = new URLSearchParams({ ...common, current: 'us_aqi', forecast_days: '1' });
    const [w, a] = await Promise.allSettled([json(weatherUrl), json(airUrl)]);
    if (w.status === 'rejected') throw w.reason;
    const result = normalizeWeather(w.value, a.status === 'fulfilled' ? a.value : null);
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(key, result);
    return result;
  })();
  pending.set(key, request);
  try {
    return await request
  } finally {
    pending.delete(key)
  }
}
