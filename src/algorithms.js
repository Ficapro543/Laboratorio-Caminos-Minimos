class MinHeap {
  constructor() {
    this.h = [];
  }

  push(dist, node) {
    this.h.push([dist, node]);
    let i = this.h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.h[p][0] <= this.h[i][0]) break;
      [this.h[p], this.h[i]] = [this.h[i], this.h[p]];
      i = p;
    }
  }

  pop() {
    if (!this.h.length) return null;
    const top = this.h[0];
    const last = this.h.pop();
    if (this.h.length) {
      this.h[0] = last;
      this._dn(0);
    }
    return top;
  }

  _dn(i) {
    const n = this.h.length;
    while (true) {
      let m = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.h[l][0] < this.h[m][0]) m = l;
      if (r < n && this.h[r][0] < this.h[m][0]) m = r;
      if (m === i) break;
      [this.h[m], this.h[i]] = [this.h[i], this.h[m]];
      i = m;
    }
  }

  peek() {
    return this.h[0];
  }

  get size() {
    return this.h.length;
  }
}

const INF = Infinity;
const fmt = (v) => (v === INF ? '∞' : Number.isFinite(v) ? v.toFixed(1) : '∞');

function makeAdj(graph) {
  const adj = {};
  Object.keys(graph.nodes).forEach((n) => {
    adj[n] = [];
  });
  Object.values(graph.edges).forEach((e) => {
    if (!adj[e.from] || !adj[e.to]) return;
    adj[e.from].push({ to: e.to, w: e.weight, eid: e.id });
    if (!graph.directed) adj[e.to].push({ to: e.from, w: e.weight, eid: e.id });
  });
  return adj;
}

function makeRevAdj(graph) {
  const radj = {};
  Object.keys(graph.nodes).forEach((n) => {
    radj[n] = [];
  });
  Object.values(graph.edges).forEach((e) => {
    if (!radj[e.to]) return;
    radj[e.to].push({ to: e.from, w: e.weight, eid: e.id });
    if (!graph.directed && radj[e.from]) radj[e.from].push({ to: e.to, w: e.weight, eid: e.id });
  });
  return radj;
}

function reconstructPath(prev, src, tgt) {
  if (!tgt) return [];
  const path = [];
  let cur = tgt;
  const seen = new Set();
  while (cur !== null && !seen.has(cur)) {
    path.unshift(cur);
    seen.add(cur);
    cur = prev[cur];
  }
  return path[0] === src ? path : [];
}

function runDijkstraArray(graph, src, tgt) {
  const adj = makeAdj(graph);
  const ns = Object.keys(graph.nodes);
  const dist = {};
  const prev = {};
  const closed = new Set();
  ns.forEach((n) => {
    dist[n] = INF;
    prev[n] = null;
  });
  dist[src] = 0;
  const steps = [];
  let ops = 0;
  let relax = 0;
  let edgeProc = 0;
  for (let iter = 0; iter < ns.length; iter++) {
    let u = null;
    ns.forEach((n) => {
      if (!closed.has(n) && (u === null || dist[n] < dist[u])) u = n;
    });
    ops += ns.length;
    if (u === null || dist[u] === INF) break;
    closed.add(u);
    const rn = [];
    adj[u].forEach(({ to, w, eid }) => {
      edgeProc++;
      if (!closed.has(to) && dist[u] + w < dist[to]) {
        dist[to] = dist[u] + w;
        prev[to] = u;
        relax++;
        rn.push({ from: u, to, eid });
      }
    });
    steps.push({
      current: u,
      visited: new Set(closed),
      dist: { ...dist },
      relaxed: rn,
      frontier: ns.filter((n) => !closed.has(n) && dist[n] < INF),
      msg: `Escaneo lineal → mínimo: ${u} (d=${fmt(dist[u])}). ${rn.length} relajaciones.`,
      ops,
      relax,
      edgeProc,
    });
    if (u === tgt) break;
  }
  const path = reconstructPath(prev, src, tgt);
  return { steps, dist, prev, path, ops: { ops, relax, edgeProc, visited: closed.size } };
}

function runDijkstraHeap(graph, src, tgt) {
  const adj = makeAdj(graph);
  const ns = Object.keys(graph.nodes);
  const dist = {};
  const prev = {};
  const closed = new Set();
  ns.forEach((n) => {
    dist[n] = INF;
    prev[n] = null;
  });
  dist[src] = 0;
  const pq = new MinHeap();
  pq.push(0, src);
  const steps = [];
  let ops = 0;
  let relax = 0;
  let edgeProc = 0;
  while (pq.size) {
    const [d, u] = pq.pop();
    ops++;
    if (closed.has(u) || d > dist[u]) continue;
    closed.add(u);
    const rn = [];
    adj[u].forEach(({ to, w, eid }) => {
      edgeProc++;
      if (!closed.has(to) && dist[u] + w < dist[to]) {
        dist[to] = dist[u] + w;
        prev[to] = u;
        relax++;
        pq.push(dist[to], to);
        rn.push({ from: u, to, eid });
      }
    });
    steps.push({
      current: u,
      visited: new Set(closed),
      dist: { ...dist },
      relaxed: rn,
      frontier: [...new Set(pq.h.filter(([, n]) => !closed.has(n)).map(([, n]) => n))],
      msg: `Heap → extraído ${u} (d=${fmt(dist[u])}). ${rn.length} relajaciones. Heap: ${pq.size}.`,
      ops,
      relax,
      edgeProc,
    });
    if (u === tgt) break;
  }
  const path = reconstructPath(prev, src, tgt);
  return { steps, dist, prev, path, ops: { ops, relax, edgeProc, visited: closed.size } };
}

function runAStar(graph, src, tgt) {
  if (!tgt) return runDijkstraHeap(graph, src, tgt);
  const adj = makeAdj(graph);
  const ns = Object.keys(graph.nodes);
  const h = (v) => {
    if (!graph.nodes[v] || !graph.nodes[tgt]) return 0;
    const dx = graph.nodes[v].x - graph.nodes[tgt].x;
    const dy = graph.nodes[v].y - graph.nodes[tgt].y;
    return Math.sqrt(dx * dx + dy * dy) * 0.04;
  };
  const g = {};
  const f = {};
  const prev = {};
  const closed = new Set();
  ns.forEach((n) => {
    g[n] = INF;
    f[n] = INF;
    prev[n] = null;
  });
  g[src] = 0;
  f[src] = h(src);
  const pq = new MinHeap();
  pq.push(f[src], src);
  const steps = [];
  let ops = 0;
  let relax = 0;
  let edgeProc = 0;
  while (pq.size) {
    const [, u] = pq.pop();
    ops++;
    if (closed.has(u)) continue;
    closed.add(u);
    const rn = [];
    adj[u].forEach(({ to, w, eid }) => {
      edgeProc++;
      const ng = g[u] + w;
      if (ng < g[to]) {
        g[to] = ng;
        f[to] = ng + h(to);
        prev[to] = u;
        relax++;
        pq.push(f[to], to);
        rn.push({ from: u, to, eid });
      }
    });
    steps.push({
      current: u,
      visited: new Set(closed),
      dist: { ...g },
      fValues: { ...f },
      relaxed: rn,
      frontier: ns.filter((n) => !closed.has(n) && g[n] < INF),
      msg: `A*: ${u} → g=${fmt(g[u])}, h=${h(u).toFixed(1)}, f=${fmt(f[u])}. ${rn.length} relajaciones.`,
      ops,
      relax,
      edgeProc,
    });
    if (u === tgt) break;
  }
  const path = reconstructPath(prev, src, tgt);
  return { steps, dist: g, prev, path, ops: { ops, relax, edgeProc, visited: closed.size } };
}

function runALT(graph, src, tgt) {
  const adj = makeAdj(graph);
  const ns = Object.keys(graph.nodes);
  if (!ns.length) return { steps: [], dist: {}, path: [], ops: {} };
  const xs = ns.map((n) => graph.nodes[n].x);
  const ys = ns.map((n) => graph.nodes[n].y);
  const lmarks = ns.length >= 4 ? (() => {
    const corners = [
      [Math.min(...xs), Math.min(...ys)],
      [Math.max(...xs), Math.min(...ys)],
      [Math.min(...xs), Math.max(...ys)],
      [Math.max(...xs), Math.max(...ys)],
    ];
    return [...new Set(corners.map(([lx, ly]) => ns.reduce((best, n) => {
      const d = (graph.nodes[n].x - lx) ** 2 + (graph.nodes[n].y - ly) ** 2;
      return d < best.d ? { n, d } : best;
    }, { n: ns[0], d: INF }).n))];
  })() : [ns[0]];
  const ldist = {};
  lmarks.forEach((l) => {
    ldist[l] = {};
    ns.forEach((n) => {
      const dx = graph.nodes[l].x - graph.nodes[n].x;
      const dy = graph.nodes[l].y - graph.nodes[n].y;
      ldist[l][n] = Math.sqrt(dx * dx + dy * dy) * 0.04;
    });
  });
  const altH = (v) => {
    if (!tgt) return 0;
    return lmarks.reduce((best, l) => Math.max(best, Math.abs((ldist[l][v] || 0) - (ldist[l][tgt] || 0))), 0);
  };
  const g = {};
  const f = {};
  const prev = {};
  const closed = new Set();
  ns.forEach((n) => {
    g[n] = INF;
    f[n] = INF;
    prev[n] = null;
  });
  g[src] = 0;
  f[src] = altH(src);
  const pq = new MinHeap();
  pq.push(f[src], src);
  const steps = [];
  let ops = 0;
  let relax = 0;
  let edgeProc = 0;
  while (pq.size) {
    const [, u] = pq.pop();
    ops++;
    if (closed.has(u)) continue;
    closed.add(u);
    const rn = [];
    adj[u].forEach(({ to, w, eid }) => {
      edgeProc++;
      const ng = g[u] + w;
      if (ng < g[to]) {
        g[to] = ng;
        f[to] = ng + altH(to);
        prev[to] = u;
        relax++;
        pq.push(f[to], to);
        rn.push({ from: u, to, eid });
      }
    });
    steps.push({
      current: u,
      visited: new Set(closed),
      dist: { ...g },
      relaxed: rn,
      landmarks: lmarks,
      frontier: ns.filter((n) => !closed.has(n) && g[n] < INF),
      msg: `ALT: ${u} → g=${fmt(g[u])}, h_ALT=${altH(u).toFixed(1)}. Landmarks: [${lmarks.join(',')}]`,
      ops,
      relax,
      edgeProc,
    });
    if (u === tgt) break;
  }
  const path = reconstructPath(prev, src, tgt);
  return { steps, dist: g, prev, path, landmarks: lmarks, ops: { ops, relax, edgeProc, visited: closed.size } };
}

function runBidirectional(graph, src, tgt) {
  if (!tgt || tgt === src) return { steps: [], dist: { [src]: 0 }, path: [src], ops: {} };
  const adj = makeAdj(graph);
  const radj = makeRevAdj(graph);
  const ns = Object.keys(graph.nodes);
  const df = {};
  const db = {};
  const pf = {};
  const pb = {};
  const visF = new Set();
  const visB = new Set();
  ns.forEach((n) => {
    df[n] = INF;
    db[n] = INF;
    pf[n] = null;
    pb[n] = null;
  });
  df[src] = 0;
  db[tgt] = 0;
  const pqF = new MinHeap();
  const pqB = new MinHeap();
  pqF.push(0, src);
  pqB.push(0, tgt);
  let best = INF;
  let meetNode = null;
  const steps = [];
  let ops = 0;
  let relax = 0;
  let edgeProc = 0;
  while (pqF.size || pqB.size) {
    if (pqF.size) {
      const [d, u] = pqF.pop();
      ops++;
      if (!visF.has(u) && d === df[u]) {
        visF.add(u);
        const rn = [];
        adj[u].forEach(({ to, w, eid }) => {
          edgeProc++;
          const nd = df[u] + w;
          if (nd < df[to]) {
            df[to] = nd;
            pf[to] = u;
            relax++;
            pqF.push(nd, to);
            rn.push({ from: u, to, eid });
          }
          if (visB.has(to) && nd + db[to] < best) {
            best = nd + db[to];
            meetNode = to;
          }
        });
        steps.push({
          current: u,
          visited: new Set(visF),
          visitedB: new Set(visB),
          dist: { ...df },
          distB: { ...db },
          relaxed: rn,
          dir: 'fwd',
          best,
          meetNode,
          msg: `→ Fwd: ${u} (d=${fmt(df[u])}). Mejor camino: ${best === INF ? '∞' : best.toFixed(1)}`,
          ops,
          relax,
          edgeProc,
        });
      }
    }
    if (pqB.size) {
      const [d, u] = pqB.pop();
      ops++;
      if (!visB.has(u) && d === db[u]) {
        visB.add(u);
        const rn = [];
        radj[u].forEach(({ to, w, eid }) => {
          edgeProc++;
          const nd = db[u] + w;
          if (nd < db[to]) {
            db[to] = nd;
            pb[to] = u;
            relax++;
            pqB.push(nd, to);
            rn.push({ from: u, to, eid });
          }
          if (visF.has(to) && nd + df[to] < best) {
            best = nd + df[to];
            meetNode = to;
          }
        });
        steps.push({
          current: u,
          visited: new Set(visF),
          visitedB: new Set(visB),
          dist: { ...df },
          distB: { ...db },
          relaxed: rn,
          dir: 'bwd',
          best,
          meetNode,
          msg: `← Bwd: ${u} (d=${fmt(db[u])}). Mejor camino: ${best === INF ? '∞' : best.toFixed(1)}`,
          ops,
          relax,
          edgeProc,
        });
      }
    }
    const minF = pqF.peek()?.[0] ?? INF;
    const minB = pqB.peek()?.[0] ?? INF;
    if (minF + minB >= best) break;
  }
  let path = [];
  if (meetNode && best < INF) {
    const fwd = [];
    let c = meetNode;
    while (c) {
      fwd.unshift(c);
      c = pf[c];
    }
    const bwd = [];
    c = pb[meetNode];
    while (c) {
      bwd.push(c);
      c = pb[c];
    }
    path = [...fwd, ...bwd];
  }
  return { steps, dist: df, path, best, meetNode, ops: { ops, relax, edgeProc, visited: visF.size + visB.size } };
}

function runBellmanFord(graph, src, tgt) {
  const ns = Object.keys(graph.nodes);
  const allEdges = [];
  Object.values(graph.edges).forEach((e) => {
    allEdges.push({ from: e.from, to: e.to, w: e.weight, eid: e.id });
    if (!graph.directed) allEdges.push({ from: e.to, to: e.from, w: e.weight, eid: e.id });
  });
  const dist = {};
  const prev = {};
  ns.forEach((n) => {
    dist[n] = INF;
    prev[n] = null;
  });
  dist[src] = 0;
  const steps = [];
  let ops = 0;
  let relax = 0;
  let edgeProc = 0;
  for (let i = 0; i < ns.length - 1; i++) {
    const rn = [];
    let changed = false;
    allEdges.forEach(({ from, to, w, eid }) => {
      ops++;
      edgeProc++;
      if (dist[from] < INF && dist[from] + w < dist[to]) {
        dist[to] = dist[from] + w;
        prev[to] = from;
        relax++;
        changed = true;
        rn.push({ from, to, eid });
      }
    });
    steps.push({
      current: null,
      visited: new Set(ns.filter((n) => dist[n] < INF)),
      dist: { ...dist },
      relaxed: rn,
      frontier: [],
      msg: `Iteración ${i + 1}/${ns.length - 1}: ${rn.length} relajaciones. Total: ${relax}.`,
      ops,
      relax,
      edgeProc,
    });
    if (!changed) break;
  }
  let negCycle = false;
  allEdges.forEach(({ from, to, w }) => {
    if (dist[from] < INF && dist[from] + w < dist[to]) negCycle = true;
  });
  const path = negCycle ? [] : reconstructPath(prev, src, tgt);
  return { steps, dist, prev, path, negCycle, ops: { ops, relax, edgeProc, visited: ns.filter((n) => dist[n] < INF).length } };
}

function runFloydWarshall(graph, src, tgt) {
  const ns = Object.keys(graph.nodes);
  const n = ns.length;
  const idx = {};
  ns.forEach((v, i) => {
    idx[v] = i;
  });
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)));
  const nxt = Array.from({ length: n }, () => Array(n).fill(null));
  Object.values(graph.edges).forEach((e) => {
    const fi = idx[e.from];
    const ti = idx[e.to];
    if (fi === undefined || ti === undefined) return;
    if (e.weight < d[fi][ti]) {
      d[fi][ti] = e.weight;
      nxt[fi][ti] = e.to;
    }
    if (!graph.directed && e.weight < d[ti][fi]) {
      d[ti][fi] = e.weight;
      nxt[ti][fi] = e.from;
    }
  });
  ns.forEach((v, i) => {
    nxt[i][i] = v;
  });
  const steps = [];
  let ops = 0;
  let relax = 0;
  for (let k = 0; k < n; k++) {
    const rn = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ops++;
        if (d[i][k] < INF && d[k][j] < INF && d[i][k] + d[k][j] < d[i][j]) {
          d[i][j] = d[i][k] + d[k][j];
          nxt[i][j] = nxt[i][k];
          relax++;
          if (rn.length < 8) rn.push({ from: ns[i], to: ns[j] });
        }
      }
    }
    const si = idx[src];
    const distObj = {};
    ns.forEach((v, ni) => {
      distObj[v] = d[si][ni];
    });
    steps.push({
      current: ns[k],
      visited: new Set(ns.slice(0, k + 1)),
      dist: distObj,
      relaxed: rn,
      frontier: [],
      msg: `Floyd-Warshall pivote k=${ns[k]} (${k + 1}/${n}). ${rn.length} actualizaciones en este pivote.`,
      ops,
      relax,
      edgeProc: ops,
    });
  }
  const si = idx[src];
  const distFinal = {};
  ns.forEach((v, ni) => {
    distFinal[v] = d[si][ni];
  });
  const path = [];
  if (tgt && distFinal[tgt] < INF) {
    let cur = src;
    while (cur !== tgt && cur !== null) {
      path.push(cur);
      const ci = idx[cur];
      const ti = idx[tgt];
      cur = nxt[ci]?.[ti] ?? null;
      if (path.length > n + 1) break;
    }
    if (cur === tgt) path.push(tgt);
  }
  return { steps, dist: distFinal, path, matrix: d, ns, ops: { ops, relax, edgeProc: ops, visited: n } };
}

const ALGOS = {
  'dijk-array': { name: 'Dijkstra — Array lineal', fn: runDijkstraArray, time: 'O(V²)', space: 'O(V)', negW: false, apsp: false, impl: 'Exacta', color: '#3b82f6', desc: 'Escaneo lineal para hallar el mínimo. Óptimo en grafos densos (m≈V²).' },
  'dijk-heap': { name: 'Dijkstra — Binary Heap', fn: runDijkstraHeap, time: 'O((V+E)logV)', space: 'O(V)', negW: false, apsp: false, impl: 'Exacta', color: '#10b981', desc: 'Min-heap estándar. Mejor localidad de caché que Fibonacci. Preferido en producción.' },
  'dijk-fib': { name: 'Dijkstra — Fibonacci Heap', fn: runDijkstraHeap, time: 'O(E+V logV)', space: 'O(V)', negW: false, apsp: false, impl: 'Exacta*', color: '#8b5cf6', desc: 'Decrease-key O(1) amortizado. Óptimo teórico. Misma lógica que heap; métricas ajustadas.' },
  'dijk-bidir': { name: 'Dijkstra Bidireccional', fn: runBidirectional, time: '≈O((V+E)logV)/2', space: 'O(V)', negW: false, apsp: false, impl: 'Exacta', color: '#f59e0b', desc: 'Búsqueda simultánea desde s y t. ~2× menos nodos. Base de CH y HL.' },
  astar: { name: 'A* (Euclidiano)', fn: runAStar, time: 'O((V+E)logV)*', space: 'O(V)', negW: false, apsp: false, impl: 'Exacta', color: '#ef4444', desc: 'Dijkstra con heurística h=distancia Euclidiana escalada. Reduce espacio de búsqueda.' },
  alt: { name: 'ALT (A*+Landmarks)', fn: runALT, time: 'O((V+E)logV)*', space: 'O(k·V)', negW: false, apsp: false, impl: 'Demostrativa', color: '#f97316', desc: 'Landmarks en esquinas del canvas. h_ALT ≥ h_euclid en muchos casos. 10–20× menos nodos.' },
  bellman: { name: 'Bellman-Ford', fn: runBellmanFord, time: 'O(V·E)', space: 'O(V)', negW: true, apsp: false, impl: 'Exacta', color: '#ec4899', desc: 'Soporta pesos negativos. Detecta ciclos negativos. Cada iteración relaja todas las aristas.' },
  floyd: { name: 'Floyd-Warshall', fn: runFloydWarshall, time: 'O(V³)', space: 'O(V²)', negW: true, apsp: true, impl: 'Exacta', color: '#06b6d4', desc: 'Todos los pares en 3 loops anidados. Solo factible n ≲ 500. Soporta pesos negativos sin ciclos.' },
};

export { MinHeap, INF, fmt, reconstructPath, runDijkstraArray, runDijkstraHeap, runAStar, runALT, runBidirectional, runBellmanFord, runFloydWarshall, ALGOS };
export default ALGOS;
