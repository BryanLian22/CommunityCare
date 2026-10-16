import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "./Routes.css"
import { api } from "./api"
type Point = [number, number]
type Place = { name: string; coordinates: Point }
type Step = {
  distance: number
  name: string
  type: string
  modifier: string
  exit?: number
  coordinates: Point
}
type Route = {
  distance: number
  duration: number
  coordinates: Point[]
  steps: Step[]
  snapped: { coordinates: Point; distance: number }[]
  calculatedAt: string
}
type Fix = { coordinates: Point; accuracy: number; time: number }
const latlng = (p: Point): L.LatLngTuple => [p[1], p[0]]
const distance = (n: number) =>
  n < 1000 ? `${Math.round(n)} m` : `${(n / 1000).toFixed(1)} km`
function instruction(s: Step) {
  if (s.type === "arrive") return "Arrive at your destination"
  if (s.type === "depart") return `Head onto ${s.name || "the route"}`
  if (s.type.includes("roundabout") || s.type === "rotary")
    return `At the roundabout${s.exit ? `, take exit ${s.exit}` : ""}${
      s.name ? ` onto ${s.name}` : ""
    }`
  return `${
    s.type === "turn" ? "Turn" : s.type.replaceAll("_", " ")
  } ${s.modifier.replaceAll("_", " ")}${s.name ? ` onto ${s.name}` : ""}`.trim()
}
function PlaceField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: Place | null
  onChange: (p: Place | null) => void
  disabled: boolean
}) {
  const [query, setQuery] = useState(value?.name || ""),
    [results, setResults] = useState<Place[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  const generation = useRef(0)
  useEffect(() => {
    if (value) setQuery(value.name)
    setResults([])
    generation.current++
  }, [value])
  async function search() {
    const id = ++generation.current
    setBusy(true)
    setError("")
    try {
      const r = await api<{ places: Place[] }>(
        `/navigation/search?q=${encodeURIComponent(query)}`,
      )
      if (id === generation.current) {
        setResults(r.places)
        if (!r.places.length)
          setError("No places found. Include the city or postcode.")
      }
    } catch (e) {
      if (id === generation.current) setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="nav-field">
      <label>
        {label}
        <div className="nav-search-row">
          <input
            value={query}
            disabled={disabled}
            placeholder="Place, address or postcode"
            onChange={(e) => {
              generation.current++
              setQuery(e.target.value)
              setResults([])
              if (value) onChange(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim().length >= 3 && !busy) {
                e.preventDefault()
                void search()
              }
            }}
          />
          <button
            type="button"
            disabled={disabled || busy || query.trim().length < 3}
            onClick={search}
          >
            {busy ? "…" : "Search"}
          </button>
        </div>
      </label>
      {value && <small className="nav-selected">✓ Location selected</small>}
      {error && <p role="status">{error}</p>}
      {results.length > 0 && (
        <ul className="nav-results">
          {results.map((p, i) => (
            <li key={i}>
              <button
                onClick={() => {
                  onChange(p)
                  setResults([])
                }}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
export default function Routes() {
  const [start, setStart] = useState<Place | null>(null),
    [end, setEnd] = useState<Place | null>(null),
    [mode, setMode] = useState<"walk" | "drive">("walk"),
    [route, setRoute] = useState<Route | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fix, setFix] = useState<Fix | null>(null),
    [tracking, setTracking] = useState(false),
    [follow, setFollow] = useState(true),
    [clock, setClock] = useState(Date.now()),
    [tileError, setTileError] = useState(false)
  const host = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    routeLayer = useRef<L.LayerGroup | null>(null),
    gpsLayer = useRef<L.LayerGroup | null>(null),
    watch = useRef<number | null>(null),
    generation = useRef(0),
    mounted = useRef(true),
    useGpsStart = useRef(false)
  function stop() {
    if (watch.current !== null) {
      navigator.geolocation.clearWatch(watch.current)
      watch.current = null
    }
    setTracking(false)
  }
  useEffect(() => {
    mounted.current = true
    const timer = setInterval(() => setClock(Date.now()), 5000)
    return () => {
      mounted.current = false
      generation.current++
      clearInterval(timer)
      if (watch.current !== null)
        navigator.geolocation.clearWatch(watch.current)
    }
  }, [])
  useEffect(() => {
    if (!host.current) return
    const m = L.map(host.current, { scrollWheelZoom: false }).setView(
      [3.139, 101.687],
      11,
    )
    map.current = m
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    })
      .on("tileerror", () => setTileError(true))
      .addTo(m)
    routeLayer.current = L.layerGroup().addTo(m)
    gpsLayer.current = L.layerGroup().addTo(m)
    m.on("dragstart", () => setFollow(false))
    const resize = new ResizeObserver(() => m.invalidateSize())
    resize.observe(host.current)
    return () => {
      resize.disconnect()
      m.remove()
      map.current = null
    }
  }, [])
  useEffect(() => {
    const layer = routeLayer.current,
      m = map.current
    if (!layer || !m) return
    layer.clearLayers()
    if (route) {
      L.polyline(route.coordinates.map(latlng), {
        color: "#fff",
        weight: 10,
      }).addTo(layer)
      L.polyline(route.coordinates.map(latlng), {
        color: "#13765c",
        weight: 6,
      }).addTo(layer)
      m.fitBounds(L.latLngBounds(route.coordinates.map(latlng)), {
        padding: [30, 30],
        maxZoom: 16,
      })
    }
    for (const [p, color, title] of [
      [start, "#16765d", "Starting point"],
      [end, "#d77337", "Destination"],
    ] as const) {
      if (p)
        L.circleMarker(latlng(p.coordinates), {
          radius: 9,
          color: "#fff",
          weight: 3,
          fillColor: color,
          fillOpacity: 1,
        })
          .bindTooltip(title)
          .addTo(layer)
    }
    if (!route && (end || start))
      m.setView(latlng((end || start)!.coordinates), 14)
  }, [route, start, end])
  useEffect(() => {
    const layer = gpsLayer.current
    if (!layer || !fix) return
    layer.clearLayers()
    L.circle(latlng(fix.coordinates), {
      radius: fix.accuracy,
      color: "#3478c9",
      weight: 1,
      fillOpacity: 0.08,
    }).addTo(layer)
    L.circleMarker(latlng(fix.coordinates), {
      radius: 7,
      color: "#fff",
      weight: 3,
      fillColor: "#287fe0",
      fillOpacity: 1,
    })
      .bindTooltip("Your GPS location")
      .addTo(layer)
    if (follow && tracking)
      map.current?.setView(
        latlng(fix.coordinates),
        Math.max(map.current.getZoom(), 16),
      )
  }, [fix, follow, tracking])
  function invalidate() {
    generation.current++
    setBusy(false)
    setRoute(null)
    setError("")
    stop()
  }
  function locate(live = false) {
    setError("")
    if (!navigator.geolocation) {
      setError(
        "Location is unavailable in this browser. Search for a starting point.",
      )
      return
    }
    if (!window.isSecureContext) {
      setError(
        "GPS requires HTTPS or localhost. You can still search for your starting point.",
      )
      return
    }
    stop()
    const receive = (p: GeolocationPosition) => {
      if (!mounted.current) return
      const f: Fix = {
        coordinates: [p.coords.longitude, p.coords.latitude],
        accuracy: p.coords.accuracy,
        time: p.timestamp,
      }
      setFix(f)
      setClock(Date.now())
      if (!live) {
        invalidate()
        useGpsStart.current = true
        setStart({ name: "My GPS location", coordinates: f.coordinates })
      }
      if (live) setTracking(true)
    }
    const failed = (e: GeolocationPositionError) => {
      if (!mounted.current) return
      setError(
        e.code === 1
          ? "Location permission was denied. Allow location in browser settings or search for a starting point."
          : "GPS signal unavailable. Move outdoors and try again.",
      )
      stop()
    }
    if (live) {
      setTracking(true)
      setFollow(true)
      watch.current = navigator.geolocation.watchPosition(receive, failed, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000,
      })
    } else
      navigator.geolocation.getCurrentPosition(receive, failed, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      })
  }
  async function calculate(from = start) {
    if (!from || !end) return
    const id = ++generation.current
    setBusy(true)
    setError("")
    setRoute(null)
    try {
      const result = await api<Route>("/navigation/route", "POST", {
        start: from.coordinates,
        end: end.coordinates,
        mode,
      })
      if (mounted.current && id === generation.current) setRoute(result)
    } catch (e) {
      if (mounted.current && id === generation.current)
        setError((e as Error).message)
    } finally {
      if (mounted.current && id === generation.current) setBusy(false)
    }
  }
  const stale = !!fix && clock - fix.time > 20000
  const google = end
    ? `https://www.google.com/maps/dir/?api=1&destination=${end.coordinates[1]},${end.coordinates[0]}&travelmode=${
        mode === "walk" ? "walking" : "driving"
      }&dir_action=navigate${
        start && !useGpsStart.current
          ? `&origin=${start.coordinates[1]},${start.coordinates[0]}`
          : ""
      }`
    : ""
  return (
    <section className="live-routes">
      <header className="nav-heading">
        <div>
          <span className="nav-eyebrow">EXPLORE WITH CONFIDENCE</span>
          <h1>Everyday journeys</h1>
          <p>Find a place. Plan your way there.</p>
        </div>
        <span className="nav-compass" aria-hidden="true">
          ↗
        </span>
      </header>
      <div className="nav-planner">
        <div className="nav-modes" aria-label="Travel mode">
          {(["walk", "drive"] as const).map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => {
                invalidate()
                setMode(m)
              }}
            >
              {m === "walk" ? "Walking" : "Driving"}
            </button>
          ))}
        </div>
        <PlaceField
          label="Starting point"
          value={start}
          disabled={busy}
          onChange={(p) => {
            invalidate()
            useGpsStart.current = false
            setStart(p)
          }}
        />
        <div className="nav-small-actions">
          <button onClick={() => locate()}>⌖ Use my location</button>
          <button
            disabled={!start && !end}
            onClick={() => {
              invalidate()
              useGpsStart.current = false
              setStart(end)
              setEnd(start)
            }}
          >
            ⇅ Swap
          </button>
        </div>
        <PlaceField
          label="Destination"
          value={end}
          disabled={busy}
          onChange={(p) => {
            invalidate()
            setEnd(p)
          }}
        />
        <button
          className="nav-primary"
          disabled={!start || !end || busy}
          onClick={() => calculate()}
        >
          {busy ? "Finding your route…" : "Find directions →"}
        </button>
      </div>
      {error && (
        <div className="nav-message" role="alert">
          {error}
        </div>
      )}
      <div className="nav-map-wrap">
        <div
          ref={host}
          className="nav-live-map"
          aria-label="Interactive route map"
        />
        <div className="nav-map-controls">
          <button
            disabled={!route}
            onClick={() => {
              setFollow(false)
              if (route)
                map.current?.fitBounds(
                  L.latLngBounds(route.coordinates.map(latlng)),
                  { padding: [30, 30] },
                )
            }}
          >
            View route
          </button>
          <button
            disabled={!fix}
            onClick={() => {
              setFollow(true)
              if (fix) map.current?.setView(latlng(fix.coordinates), 16)
            }}
          >
            ⌖ Recenter
          </button>
        </div>
      </div>
      {tileError && (
        <p className="nav-message">
          Some map tiles could not load. Directions are still available below;
          check your connection.
        </p>
      )}
      {fix && (
        <p className="nav-gps" role="status">
          <i className={tracking && !stale ? "active" : ""} />
          {tracking
            ? stale
              ? "GPS signal stale"
              : "GPS tracking on"
            : "Last GPS position"}{" "}
          · ±{Math.round(fix.accuracy)} m ·{" "}
          {new Date(fix.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      )}
      {route ? (
        <section className="nav-summary">
          <span className="nav-eyebrow">
            YOUR {mode === "walk" ? "WALKING" : "DRIVING"} ROUTE
          </span>
          <div className="nav-metrics">
            <strong>
              {Math.max(1, Math.round(route.duration / 60))}
              <small> min</small>
            </strong>
            <span>
              {distance(route.distance)}
              <small>Estimated journey</small>
            </span>
          </div>
          <p>To {end?.name}</p>
          {route.snapped.some((w) => w.distance > 30) && (
            <p className="nav-message">
              The route starts/ends on a nearby mapped path. Check the entrance
              and final approach.
            </p>
          )}
          <div className="nav-action-grid">
            <button
              className="nav-primary"
              onClick={() => (tracking ? stop() : locate(true))}
            >
              {tracking ? "Stop GPS tracking" : "Start live GPS"}
            </button>
            <button
              disabled={!fix || stale || busy}
              onClick={() => {
                if (fix) {
                  const p = {
                    name: "My GPS location",
                    coordinates: fix.coordinates,
                  }
                  useGpsStart.current = true
                  setStart(p)
                  void calculate(p)
                }
              }}
            >
              Re-route from GPS
            </button>
          </div>
          <details className="nav-directions" open>
            <summary>
              Step-by-step directions <span>{route.steps.length} steps</span>
            </summary>
            <ol>
              {route.steps.map((s, i) => (
                <li key={i}>
                  <button
                    onClick={() => {
                      setFollow(false)
                      map.current?.setView(latlng(s.coordinates), 17)
                    }}
                  >
                    <span className="nav-step-number">{i + 1}</span>
                    <span>
                      {instruction(s)}
                      <small>{distance(s.distance)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </details>
        </section>
      ) : (
        <div className="nav-empty">
          <b>Your journey starts here</b>
          <p>
            Select a start and destination to see the route, distance and
            directions.
          </p>
        </div>
      )}
      {end && (
        <a
          className="nav-google"
          href={google}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Google Maps ↗
          <small>Continue with voice and turn-by-turn navigation</small>
        </a>
      )}
      <aside className="nav-footnote">
        <b>Travel with care</b>
        <p>
          In-app GPS follows your position while this screen is open. Use
          “Re-route from GPS” if you leave the route. Estimates exclude live
          traffic. Walking routes are not verified wheelchair-accessible;
          stairs, slopes and lift status must be checked locally.
        </p>
        <p>
          Search terms and route coordinates are sent to mapping providers.
          Location is used only after you request it and is not saved to your
          account.
        </p>
        <p>
          Routes:{" "}
          <a
            href="https://routing.openstreetmap.de/about.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            OSRM / FOSSGIS
          </a>{" "}
          · Search: Photon ·{" "}
          <a
            href="https://www.openstreetmap.org/fixthemap"
            target="_blank"
            rel="noopener noreferrer"
          >
            Report a map issue
          </a>
        </p>
      </aside>
    </section>
  )
}
