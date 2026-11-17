// A* on a small local grid. Used for free exploration; workshop travel keeps its known paths.
export function planGroundRoute(start, target, blocked, { step = 0.4, limit = 28 } = {}) {
  if ([...start,...target].some(v=>!Number.isFinite(v)||Math.abs(v)>limit)) return null;
  const size = Math.round(limit * 2 / step) + 1;
  const grid = p => p.map(v => Math.max(0, Math.min(size - 1, Math.round((v + limit) / step))));
  const world = (x, z) => [x * step - limit, z * step - limit];
  const [sx, sz] = grid(start), [tx, tz] = grid(target), key = (x, z) => z * size + x;
  const startKey = key(sx, sz), endKey = key(tx, tz), open = [], best = new Map([[startKey, 0]]), parent = new Map(), closed = new Set();
  const push = item => { let i = open.length; open.push(item); while (i) { const p = (i - 1) >> 1; if (open[p].f <= item.f) break; open[i] = open[p]; i = p; } open[i] = item; };
  const pop = () => { const first = open[0], last = open.pop(); if (open.length) { let i = 0; while (i * 2 + 1 < open.length) { let c = i * 2 + 1; if (c + 1 < open.length && open[c + 1].f < open[c].f) c++; if (open[c].f >= last.f) break; open[i] = open[c]; i = c; } open[i] = last; } return first; };
  const safe = (x, z) => x >= 0 && z >= 0 && x < size && z < size && !blocked(...world(x, z));
  if (!safe(tx, tz)) return null;
  push({ x: sx, z: sz, f: 0, g: 0 });
  while (open.length && closed.size < size * size) {
    const p = pop(), pk = key(p.x, p.z);
    if (closed.has(pk)) continue;
    if (pk === endKey) {
      const points = []; let k = endKey;
      while (k !== startKey) { points.push(world(k % size, Math.floor(k / size))); k = parent.get(k); if (k == null) return null; }
      points.reverse();
      // Collapse only collinear segments, so simplification never cuts through obstacles.
      const simplified = [];
      for (const point of points) { const a = simplified.at(-2), b = simplified.at(-1); if (a && Math.abs((b[0] - a[0]) * (point[1] - b[1]) - (b[1] - a[1]) * (point[0] - b[0])) < 1e-6) simplified.pop(); simplified.push(point); }
      return simplified;
    }
    closed.add(pk);
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
      const x = p.x + dx, z = p.z + dz;
      if (!safe(x, z) || (dx && dz && (!safe(p.x + dx, p.z) || !safe(p.x, p.z + dz)))) continue;
      const from=world(p.x,p.z),to=world(x,z);
      if([.25,.5,.75].some(t=>blocked(from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t)))continue;
      const nk = key(x, z), cost = p.g + (dx && dz ? Math.SQRT2 : 1);
      if (cost >= (best.get(nk) ?? Infinity)) continue;
      best.set(nk, cost); parent.set(nk, pk); push({ x, z, g: cost, f: cost + Math.hypot(tx - x, tz - z) });
    }
  }
  return null;
}
