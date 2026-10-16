// This graph is schematic: choose fewest surveyed connections, never infer metres or ETA.
export function effectiveStatus(item, now = Date.now()) {
  if (item.status !== 'open') return item.status;
  if (!item.updated || now - Date.parse(item.updated) > 86400000) return 'unknown';
  return 'open';
}
export function residentialRoute(nodes, edges, start, end, wheelchair, now = Date.now()) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  if (!byId.has(start) || !byId.has(end)) return null;
  if (effectiveStatus(byId.get(start), now) !== 'open' || effectiveStatus(byId.get(end), now) !== 'open') return null;
  const queue = [{ nodes: [start], edges: [] }], seen = new Set([start]);
  while (queue.length) {
    const route = queue.shift(), current = route.nodes.at(-1);
    if (current === end) return route;
    for (const edge of edges) {
      if (effectiveStatus(edge, now) !== 'open' || (wheelchair && (!edge.accessible || edge.kind === 'stairs'))) continue;
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (!next || seen.has(next) || !byId.has(next) || effectiveStatus(byId.get(next), now) !== 'open') continue;
      seen.add(next);
      queue.push({ nodes: [...route.nodes, next], edges: [...route.edges, edge.id] });
    }
  }
  return null;
}
