const cache = new Map()
let nextRequest = 0
export function point(value) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every(Number.isFinite) ||
    Math.abs(value[0]) > 180 ||
    Math.abs(value[1]) > 85
  )
    throw Object.assign(
      new Error("Choose valid start and destination coordinates."),
      { status: 400 },
    )
  return value
}
async function remote(url) {
  const key = url.toString(),
    saved = cache.get(key)
  if (saved && saved.expires > Date.now()) return saved.data
  // One upstream request per second across all users of this process.
  if (Date.now() < nextRequest)
    throw Object.assign(
      new Error("Map service is busy. Please try again in a moment."),
      { status: 429 },
    )
  nextRequest = Date.now() + 1100
  const response = await fetch(url, {
    headers: { "User-Agent": "CommunityCare/2.0 (resident route planner)" },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error("Map provider unavailable")
  const data = await response.json()
  if (cache.size >= 100) cache.delete(cache.keys().next().value)
  cache.set(key, { data, expires: Date.now() + 300000 })
  return data
}
export async function searchPlaces(q) {
  const url = new URL("https://photon.komoot.io/api/")
  url.search = new URLSearchParams({ q, limit: "6", lang: "en" }).toString()
  const data = await remote(url)
  return (data.features || [])
    .filter((f) => f.geometry?.type === "Point")
    .map((f) => ({
      coordinates: point(f.geometry.coordinates),
      name: [
        f.properties.name,
        f.properties.street,
        f.properties.housenumber,
        f.properties.city || f.properties.town,
        f.properties.state,
        f.properties.country,
      ]
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(", "),
    }))
    .filter((p) => p.name)
}
export async function routeBetween(start, end, mode) {
  point(start)
  point(end)
  if (!["walk", "drive"].includes(mode))
    throw Object.assign(new Error("Choose walking or driving."), {
      status: 400,
    })
  const url = new URL(
    `https://routing.openstreetmap.de/routed-${
      mode === "walk" ? "foot" : "car"
    }/route/v1/driving/${start.join(",")};${end.join(",")}`,
  )
  url.search = "steps=true&overview=full&geometries=geojson&radiuses=200;200"
  const data = await remote(url),
    r = data.routes?.[0]
  if (data.code !== "Ok" || !r)
    throw Object.assign(
      new Error(
        "No route found near these places. Choose a nearby road or entrance.",
      ),
      { status: 422 },
    )
  return {
    distance: r.distance,
    duration: r.duration,
    coordinates: r.geometry.coordinates,
    steps: r.legs
      .flatMap((l) => l.steps)
      .map((s) => ({
        distance: s.distance,
        name: s.name,
        type: s.maneuver.type,
        modifier: s.maneuver.modifier || "",
        exit: s.maneuver.exit,
        coordinates: s.maneuver.location,
      })),
    snapped: data.waypoints.map((w) => ({
      coordinates: w.location,
      distance: w.distance,
    })),
    calculatedAt: new Date().toISOString(),
  }
}
