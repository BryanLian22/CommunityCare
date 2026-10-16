import test from "node:test"
import assert from "node:assert/strict"
import { point, routeBetween } from "../server/navigation.mjs"
test("Navigation rejects malformed coordinates and unsupported modes before provider access", async () => {
  for (const p of [null, [], [0], [181, 0], [0, 86], ["1", 2], [NaN, 0]])
    assert.throws(() => point(p), { status: 400 })
  await assert.rejects(routeBetween([0, 0], [1, 1], "bus"), { status: 400 })
})
test("Walking uses the foot graph and returns real provider geometry and maneuvers", async () => {
  const original = globalThis.fetch
  globalThis.fetch = async (url) => {
    assert.match(String(url), /routed-foot\/route\/v1\/driving/)
    assert.match(String(url), /steps=true/)
    return {
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [
          {
            distance: 145,
            duration: 120,
            geometry: {
              coordinates: [
                [101, 3],
                [101.001, 3],
              ],
            },
            legs: [
              {
                steps: [
                  {
                    distance: 145,
                    name: "Test Road",
                    maneuver: { type: "depart", location: [101, 3] },
                  },
                ],
              },
            ],
          },
        ],
        waypoints: [
          { location: [101, 3], distance: 4 },
          { location: [101.001, 3], distance: 2 },
        ],
      }),
    }
  }
  try {
    const r = await routeBetween([101, 3], [101.001, 3], "walk")
    assert.equal(r.distance, 145)
    assert.equal(r.duration, 120)
    assert.equal(r.steps[0].name, "Test Road")
    assert.equal(r.coordinates.length, 2)
    assert.equal(r.snapped[0].distance, 4)
  } finally {
    globalThis.fetch = original
  }
})
