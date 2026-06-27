import { useState, useEffect, useRef, useCallback } from "react";

// =====================================================
// PRIORITY QUEUE — Binary Min-Heap
// =====================================================
class MinHeap {
  constructor() { this.h = []; }
  push(dist, node) {
    this.h.push([dist, node]);
    let i = this.h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.h[p][0] <= this.h[i][0]) break;
      [this.h[p], this.h[i]] = [this.h[i], this.h[p]]; i = p;
    }
  }
  pop() {
    if (!this.h.length) return null;
    const top = this.h[0], last = this.h.pop();
    if (this.h.length) { this.h[0] = last; this._dn(0); }
    return top;
  }
  _dn(i) {
    const n = this.h.length;
    while (true) {
      let m = i, l = 2*i+1, r = 2*i+2;
      if (l < n && this.h[l][0] < this.h[m][0]) m = l;
      if (r < n && this.h[r][0] < this.h[m][0]) m = r;
      if (m === i) break;
      [this.h[m], this.h[i]] = [this.h[i], this.h[m]]; i = m;
    }
  }
  peek() { return this.h[0]; }
  get size() { return this.h.length; }
}

// =====================================================
// GRAPH UTILITIES
// =====================================================
const INF = Infinity;
const fmt = v => (v === INF ? '∞' : Number.isFinite(v) ? v.toFixed(1) : '∞');

function makeAdj(graph) {
  const adj = {};
  Object.keys(graph.nodes).forEach(n => adj[n] = []);
  Object.values(graph.edges).forEach(e => {
    if (!adj[e.from] || !adj[e.to]) return;
    adj[e.from].push({ to: e.to, w: e.weight, eid: e.id });
    if (!graph.directed) adj[e.to].push({ to: e.from, w: e.weight, eid: e.id });
  });
  return adj;
}

function makeRevAdj(graph) {
  const radj = {};
  Object.keys(graph.nodes).forEach(n => radj[n] = []);
  Object.values(graph.edges).forEach(e => {
    if (!radj[e.to]) return;
    radj[e.to].push({ to: e.from, w: e.weight, eid: e.id });
    if (!graph.directed && radj[e.from]) radj[e.from].push({ to: e.to, w: e.weight, eid: e.id });
  });
  return radj;
}

function reconstructPath(prev, src, tgt) {
  if (!tgt) return [];
  const path = []; let cur = tgt; const seen = new Set();
  while (cur !== null && !seen.has(cur)) { path.unshift(cur); seen.add(cur); cur = prev[cur]; }
  return path[0] === src ? path : [];
}

// =====================================================
// ALGORITHMS
// =====================================================

function runDijkstraArray(graph, src, tgt) {
  const adj = makeAdj(graph);
  const ns = Object.keys(graph.nodes);
  const dist = {}, prev = {}; const closed = new Set();
  ns.forEach(n => { dist[n] = INF; prev[n] = null; }); dist[src] = 0;
  const steps = []; let ops = 0, relax = 0, edgeProc = 0;
  for (let iter = 0; iter < ns.length; iter++) {
    let u = null;
    ns.forEach(n => { if (!closed.has(n) && (u === null || dist[n] < dist[u])) u = n; });
    ops += ns.length;
    if (u === null || dist[u] === INF) break;
    closed.add(u);
    const rn = [];
    adj[u].forEach(({ to, w, eid }) => {
      edgeProc++;
      if (!closed.has(to) && dist[u] + w < dist[to]) {
        dist[to] = dist[u] + w; prev[to] = u; relax++; rn.push({ from: u, to, eid });
      }
    });
    steps.push({ current: u, visited: new Set(closed), dist: { ...dist }, relaxed: rn, frontier: ns.filter(n => !closed.has(n) && dist[n] < INF), msg: `Escaneo lineal → mínimo: ${u} (d=${fmt(dist[u])}). ${rn.length} relajaciones.`, ops, relax, edgeProc });
    if (u === tgt) break;
  }
  const path = reconstructPath(prev, src, tgt);
  return { steps, dist, prev, path, ops: { ops, relax, edgeProc, visited: closed.size } };
}

function runDijkstraHeap(graph, src, tgt) {
  const adj = makeAdj(graph);
  const ns = Object.keys(graph.nodes);
  const dist = {}, prev = {}; const closed = new Set();
  ns.forEach(n => { dist[n] = INF; prev[n] = null; }); dist[src] = 0;
  const pq = new MinHeap(); pq.push(0, src);
  const steps = []; let ops = 0, relax = 0, edgeProc = 0;
  while (pq.size) {
    const [d, u] = pq.pop(); ops++;
    if (closed.has(u) || d > dist[u]) continue;
    closed.add(u);
    const rn = [];
    adj[u].forEach(({ to, w, eid }) => {
      edgeProc++;
      if (!closed.has(to) && dist[u] + w < dist[to]) {
        dist[to] = dist[u] + w; prev[to] = u; relax++; pq.push(dist[to], to); rn.push({ from: u, to, eid });
      }
    });
    steps.push({ current: u, visited: new Set(closed), dist: { ...dist }, relaxed: rn, frontier: [...new Set(pq.h.filter(([, n]) => !closed.has(n)).map(([, n]) => n))], msg: `Heap → extraído ${u} (d=${fmt(dist[u])}). ${rn.length} relajaciones. Heap: ${pq.size}.`, ops, relax, edgeProc });
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
    return Math.sqrt(dx*dx + dy*dy) * 0.04;
  };
  const g = {}, f = {}, prev = {}; const closed = new Set();
  ns.forEach(n => { g[n] = INF; f[n] = INF; prev[n] = null; });
  g[src] = 0; f[src] = h(src);
  const pq = new MinHeap(); pq.push(f[src], src);
  const steps = []; let ops = 0, relax = 0, edgeProc = 0;
  while (pq.size) {
    const [, u] = pq.pop(); ops++;
    if (closed.has(u)) continue;
    closed.add(u);
    const rn = [];
    adj[u].forEach(({ to, w, eid }) => {
      edgeProc++;
      const ng = g[u] + w;
      if (ng < g[to]) {
        g[to] = ng; f[to] = ng + h(to); prev[to] = u; relax++; pq.push(f[to], to); rn.push({ from: u, to, eid });
      }
    });
    steps.push({ current: u, visited: new Set(closed), dist: { ...g }, fValues: { ...f }, relaxed: rn, frontier: ns.filter(n => !closed.has(n) && g[n] < INF), msg: `A*: ${u} → g=${fmt(g[u])}, h=${h(u).toFixed(1)}, f=${fmt(f[u])}. ${rn.length} relajaciones.`, ops, relax, edgeProc });
    if (u === tgt) break;
  }
  const path = reconstructPath(prev, src, tgt);
  return { steps, dist: g, prev, path, ops: { ops, relax, edgeProc, visited: closed.size } };
}

function runALT(graph, src, tgt) {
  const adj = makeAdj(graph);
  const ns = Object.keys(graph.nodes);
  if (!ns.length) return { steps: [], dist: {}, path: [], ops: {} };
  const xs = ns.map(n => graph.nodes[n].x), ys = ns.map(n => graph.nodes[n].y);
  const lmarks = ns.length >= 4 ? (() => {
    const corners = [[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.min(...ys)],[Math.min(...xs),Math.max(...ys)],[Math.max(...xs),Math.max(...ys)]];
    return [...new Set(corners.map(([lx,ly]) => ns.reduce((best, n) => { const d = (graph.nodes[n].x-lx)**2+(graph.nodes[n].y-ly)**2; return d < best.d ? {n,d} : best; }, {n:ns[0],d:INF}).n))];
  })() : [ns[0]];
  const ldist = {};
  lmarks.forEach(l => {
    ldist[l] = {};
    ns.forEach(n => {
      const dx = graph.nodes[l].x - graph.nodes[n].x, dy = graph.nodes[l].y - graph.nodes[n].y;
      ldist[l][n] = Math.sqrt(dx*dx + dy*dy) * 0.04;
    });
  });
  const altH = (v) => {
    if (!tgt) return 0;
    return lmarks.reduce((best, l) => Math.max(best, Math.abs((ldist[l][v]||0) - (ldist[l][tgt]||0))), 0);
  };
  const g = {}, f = {}, prev = {}; const closed = new Set();
  ns.forEach(n => { g[n] = INF; f[n] = INF; prev[n] = null; });
  g[src] = 0; f[src] = altH(src);
  const pq = new MinHeap(); pq.push(f[src], src);
  const steps = []; let ops = 0, relax = 0, edgeProc = 0;
  while (pq.size) {
    const [, u] = pq.pop(); ops++;
    if (closed.has(u)) continue;
    closed.add(u);
    const rn = [];
    adj[u].forEach(({ to, w, eid }) => {
      edgeProc++;
      const ng = g[u] + w;
      if (ng < g[to]) { g[to] = ng; f[to] = ng + altH(to); prev[to] = u; relax++; pq.push(f[to], to); rn.push({ from: u, to, eid }); }
    });
    steps.push({ current: u, visited: new Set(closed), dist: { ...g }, relaxed: rn, landmarks: lmarks, frontier: ns.filter(n => !closed.has(n) && g[n] < INF), msg: `ALT: ${u} → g=${fmt(g[u])}, h_ALT=${altH(u).toFixed(1)}. Landmarks: [${lmarks.join(',')}]`, ops, relax, edgeProc });
    if (u === tgt) break;
  }
  const path = reconstructPath(prev, src, tgt);
  return { steps, dist: g, prev, path, landmarks: lmarks, ops: { ops, relax, edgeProc, visited: closed.size } };
}

function runBidirectional(graph, src, tgt) {
  if (!tgt || tgt === src) return { steps: [], dist: { [src]: 0 }, path: [src], ops: {} };
  const adj = makeAdj(graph); const radj = makeRevAdj(graph);
  const ns = Object.keys(graph.nodes);
  const df = {}, db = {}, pf = {}, pb = {}; const visF = new Set(), visB = new Set();
  ns.forEach(n => { df[n] = INF; db[n] = INF; pf[n] = null; pb[n] = null; });
  df[src] = 0; db[tgt] = 0;
  const pqF = new MinHeap(), pqB = new MinHeap();
  pqF.push(0, src); pqB.push(0, tgt);
  let best = INF, meetNode = null;
  const steps = []; let ops = 0, relax = 0, edgeProc = 0;
  while (pqF.size || pqB.size) {
    if (pqF.size) {
      const [d, u] = pqF.pop(); ops++;
      if (!visF.has(u) && d === df[u]) {
        visF.add(u); const rn = [];
        adj[u].forEach(({ to, w, eid }) => {
          edgeProc++; const nd = df[u] + w;
          if (nd < df[to]) { df[to] = nd; pf[to] = u; relax++; pqF.push(nd, to); rn.push({ from: u, to, eid }); }
          if (visB.has(to) && nd + db[to] < best) { best = nd + db[to]; meetNode = to; }
        });
        steps.push({ current: u, visited: new Set(visF), visitedB: new Set(visB), dist: { ...df }, distB: { ...db }, relaxed: rn, dir: 'fwd', best, meetNode, msg: `→ Fwd: ${u} (d=${fmt(df[u])}). Mejor camino: ${best === INF ? '∞' : best.toFixed(1)}`, ops, relax, edgeProc });
      }
    }
    if (pqB.size) {
      const [d, u] = pqB.pop(); ops++;
      if (!visB.has(u) && d === db[u]) {
        visB.add(u); const rn = [];
        radj[u].forEach(({ to, w, eid }) => {
          edgeProc++; const nd = db[u] + w;
          if (nd < db[to]) { db[to] = nd; pb[to] = u; relax++; pqB.push(nd, to); rn.push({ from: u, to, eid }); }
          if (visF.has(to) && nd + df[to] < best) { best = nd + df[to]; meetNode = to; }
        });
        steps.push({ current: u, visited: new Set(visF), visitedB: new Set(visB), dist: { ...df }, distB: { ...db }, relaxed: rn, dir: 'bwd', best, meetNode, msg: `← Bwd: ${u} (d=${fmt(db[u])}). Mejor camino: ${best === INF ? '∞' : best.toFixed(1)}`, ops, relax, edgeProc });
      }
    }
    const minF = pqF.peek()?.[0] ?? INF; const minB = pqB.peek()?.[0] ?? INF;
    if (minF + minB >= best) break;
  }
  let path = [];
  if (meetNode && best < INF) {
    const fwd = []; let c = meetNode; while (c) { fwd.unshift(c); c = pf[c]; }
    const bwd = []; c = pb[meetNode]; while (c) { bwd.push(c); c = pb[c]; }
    path = [...fwd, ...bwd];
  }
  return { steps, dist: df, path, best, meetNode, ops: { ops, relax, edgeProc, visited: visF.size + visB.size } };
}

function runBellmanFord(graph, src, tgt) {
  const ns = Object.keys(graph.nodes);
  const allEdges = [];
  Object.values(graph.edges).forEach(e => {
    allEdges.push({ from: e.from, to: e.to, w: e.weight, eid: e.id });
    if (!graph.directed) allEdges.push({ from: e.to, to: e.from, w: e.weight, eid: e.id });
  });
  const dist = {}, prev = {};
  ns.forEach(n => { dist[n] = INF; prev[n] = null; }); dist[src] = 0;
  const steps = []; let ops = 0, relax = 0, edgeProc = 0;
  for (let i = 0; i < ns.length - 1; i++) {
    const rn = []; let changed = false;
    allEdges.forEach(({ from, to, w, eid }) => {
      ops++; edgeProc++;
      if (dist[from] < INF && dist[from] + w < dist[to]) {
        dist[to] = dist[from] + w; prev[to] = from; relax++; changed = true; rn.push({ from, to, eid });
      }
    });
    steps.push({ current: null, visited: new Set(ns.filter(n => dist[n] < INF)), dist: { ...dist }, relaxed: rn, frontier: [], msg: `Iteración ${i+1}/${ns.length-1}: ${rn.length} relajaciones. Total: ${relax}.`, ops, relax, edgeProc });
    if (!changed) break;
  }
  let negCycle = false;
  allEdges.forEach(({ from, to, w }) => { if (dist[from] < INF && dist[from] + w < dist[to]) negCycle = true; });
  const path = negCycle ? [] : reconstructPath(prev, src, tgt);
  return { steps, dist, prev, path, negCycle, ops: { ops, relax, edgeProc, visited: ns.filter(n => dist[n] < INF).length } };
}

function runFloydWarshall(graph, src, tgt) {
  const ns = Object.keys(graph.nodes);
  const n = ns.length; const idx = {}; ns.forEach((v, i) => idx[v] = i);
  const d = Array.from({length:n}, (_, i) => Array.from({length:n}, (_, j) => i===j?0:INF));
  const nxt = Array.from({length:n}, () => Array(n).fill(null));
  Object.values(graph.edges).forEach(e => {
    const fi = idx[e.from], ti = idx[e.to];
    if (fi === undefined || ti === undefined) return;
    if (e.weight < d[fi][ti]) { d[fi][ti] = e.weight; nxt[fi][ti] = e.to; }
    if (!graph.directed && e.weight < d[ti][fi]) { d[ti][fi] = e.weight; nxt[ti][fi] = e.from; }
  });
  ns.forEach((v, i) => { nxt[i][i] = v; });
  const steps = []; let ops = 0, relax = 0;
  for (let k = 0; k < n; k++) {
    const rn = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      ops++;
      if (d[i][k] < INF && d[k][j] < INF && d[i][k]+d[k][j] < d[i][j]) {
        d[i][j] = d[i][k]+d[k][j]; nxt[i][j] = nxt[i][k]; relax++;
        if (rn.length < 8) rn.push({ from: ns[i], to: ns[j] });
      }
    }
    const si = idx[src]; const distObj = {}; ns.forEach((v, ni) => { distObj[v] = d[si][ni]; });
    steps.push({ current: ns[k], visited: new Set(ns.slice(0,k+1)), dist: distObj, relaxed: rn, frontier: [], msg: `Floyd-Warshall pivote k=${ns[k]} (${k+1}/${n}). ${rn.length} actualizaciones en este pivote.`, ops, relax, edgeProc: ops });
  }
  const si = idx[src]; const distFinal = {}; ns.forEach((v, ni) => { distFinal[v] = d[si][ni]; });
  const path = [];
  if (tgt && distFinal[tgt] < INF) {
    let cur = src;
    while (cur !== tgt && cur !== null) { path.push(cur); const ci = idx[cur]; const ti = idx[tgt]; cur = nxt[ci]?.[ti] ?? null; if (path.length > n+1) break; }
    if (cur === tgt) path.push(tgt);
  }
  return { steps, dist: distFinal, path, matrix: d, ns, ops: { ops, relax, edgeProc: ops, visited: n } };
}

// =====================================================
// GRAPH GENERATORS
// =====================================================
const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function defaultGraph() {
  return {
    directed: false,
    nodes: {
      A:{id:'A',label:'A',x:100,y:200}, B:{id:'B',label:'B',x:240,y:100}, C:{id:'C',label:'C',x:240,y:300},
      D:{id:'D',label:'D',x:390,y:100}, E:{id:'E',label:'E',x:390,y:300}, F:{id:'F',label:'F',x:530,y:200},
    },
    edges: {
      e1:{id:'e1',from:'A',to:'B',weight:4}, e2:{id:'e2',from:'A',to:'C',weight:2},
      e3:{id:'e3',from:'B',to:'C',weight:1}, e4:{id:'e4',from:'B',to:'D',weight:5},
      e5:{id:'e5',from:'B',to:'E',weight:11}, e6:{id:'e6',from:'C',to:'E',weight:5},
      e7:{id:'e7',from:'D',to:'F',weight:3}, e8:{id:'e8',from:'E',to:'F',weight:4},
      e9:{id:'e9',from:'D',to:'E',weight:2},
    }
  };
}

function genRandom(nc=8, density=0.35, directed=false) {
  const nodes={}, edges={}; let eid=0;
  const cols = Math.ceil(Math.sqrt(nc));
  for (let i=0;i<nc;i++) {
    const lb = i<26?LABELS[i]:`N${i}`;
    const r=Math.floor(i/cols),c=i%cols;
    nodes[lb]={id:lb,label:lb,x:70+c*120+(Math.random()-0.5)*30,y:70+r*120+(Math.random()-0.5)*30};
  }
  const nl = Object.keys(nodes);
  const sh = [...nl].sort(()=>Math.random()-0.5);
  for (let i=1;i<sh.length;i++) {
    const id=`e${eid++}`;
    edges[id]={id,from:sh[Math.floor(Math.random()*i)],to:sh[i],weight:1+Math.ceil(Math.random()*12)};
  }
  for (let i=0;i<nl.length;i++) for (let j=i+1;j<nl.length;j++) {
    if (Math.random()<density) {
      const exists=Object.values(edges).some(e=>(e.from===nl[i]&&e.to===nl[j])||(e.from===nl[j]&&e.to===nl[i]));
      if (!exists) { const id=`e${eid++}`; edges[id]={id,from:nl[i],to:nl[j],weight:1+Math.ceil(Math.random()*12)}; }
    }
  }
  return {directed,nodes,edges};
}

function genGrid(rows=3,cols=4) {
  const nodes={},edges={};let eid=0;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
    const id=`N${r*cols+c}`;nodes[id]={id,label:id,x:70+c*100,y:70+r*100};
  }
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
    if(c<cols-1){const id=`e${eid++}`;edges[id]={id,from:`N${r*cols+c}`,to:`N${r*cols+c+1}`,weight:1+Math.ceil(Math.random()*8)};}
    if(r<rows-1){const id=`e${eid++}`;edges[id]={id,from:`N${r*cols+c}`,to:`N${(r+1)*cols+c}`,weight:1+Math.ceil(Math.random()*8)};}
  }
  return{directed:false,nodes,edges};
}

function genRoadNetwork() {
  return {
    directed:false,
    nodes:{
      Cusco:{id:'Cusco',label:'Cusco',x:280,y:280},
      Urubamba:{id:'Urubamba',label:'Urubamba',x:140,y:180},
      Pisac:{id:'Pisac',label:'Pisac',x:360,y:150},
      Chinchero:{id:'Chinchero',label:'Chinchero',x:220,y:120},
      Ollantaytambo:{id:'Ollantaytambo',label:'Ollanta',x:80,y:260},
      Machu_Picchu:{id:'Machu_Picchu',label:'Machu P.',x:60,y:360},
      Andahuaylillas:{id:'Andahuaylillas',label:'Andah.',x:390,y:340},
      Sicuani:{id:'Sicuani',label:'Sicuani',x:460,y:400},
    },
    edges:{
      e1:{id:'e1',from:'Cusco',to:'Urubamba',weight:69},
      e2:{id:'e2',from:'Cusco',to:'Pisac',weight:33},
      e3:{id:'e3',from:'Cusco',to:'Andahuaylillas',weight:45},
      e4:{id:'e4',from:'Urubamba',to:'Chinchero',weight:28},
      e5:{id:'e5',from:'Urubamba',to:'Ollantaytambo',weight:19},
      e6:{id:'e6',from:'Pisac',to:'Chinchero',weight:37},
      e7:{id:'e7',from:'Ollantaytambo',to:'Machu_Picchu',weight:112},
      e8:{id:'e8',from:'Andahuaylillas',to:'Sicuani',weight:90},
      e9:{id:'e9',from:'Chinchero',to:'Cusco',weight:23},
    }
  };
}


// =====================================================
// APPLICATION GRAPH EXAMPLES
// =====================================================
function genOSPFNetwork() {
  return {
    directed:false,
    nodes:{
      R1:{id:'R1',label:'R1',x:70,y:145},
      R2:{id:'R2',label:'R2',x:190,y:70},
      R3:{id:'R3',label:'R3',x:190,y:220},
      R4:{id:'R4',label:'R4',x:340,y:70},
      R5:{id:'R5',label:'R5',x:340,y:220},
      R6:{id:'R6',label:'R6',x:500,y:145},
    },
    edges:{
      e1:{id:'e1',from:'R1',to:'R2',weight:2},
      e2:{id:'e2',from:'R1',to:'R3',weight:5},
      e3:{id:'e3',from:'R2',to:'R3',weight:1},
      e4:{id:'e4',from:'R2',to:'R4',weight:2},
      e5:{id:'e5',from:'R3',to:'R5',weight:3},
      e6:{id:'e6',from:'R4',to:'R5',weight:1},
      e7:{id:'e7',from:'R4',to:'R6',weight:5},
      e8:{id:'e8',from:'R5',to:'R6',weight:2},
    }
  };
}

function genRobotGrid() {
  const rows=4, cols=6;
  const blocked=new Set(['1-2','2-2','2-4']);
  const nodes={}, edges={}; let eid=0;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
    if(blocked.has(`${r}-${c}`)) continue;
    const id=`P${r}${c}`;
    const label=id==='P00'?'S':id==='P35'?'G':'·';
    nodes[id]={id,label,x:70+c*90,y:55+r*65};
  }
  const add=(a,b)=>{
    if(!nodes[a]||!nodes[b]) return;
    const id=`e${eid++}`; edges[id]={id,from:a,to:b,weight:1};
  };
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
    const id=`P${r}${c}`;
    if(!nodes[id]) continue;
    add(id,`P${r}${c+1}`);
    add(id,`P${r+1}${c}`);
  }
  return {directed:false,nodes,edges};
}

function genLogisticsNetwork() {
  return {
    directed:false,
    nodes:{
      Deposito:{id:'Deposito',label:'DEP',x:80,y:145},
      A:{id:'A',label:'A',x:205,y:60},
      B:{id:'B',label:'B',x:205,y:225},
      C:{id:'C',label:'C',x:350,y:145},
      D:{id:'D',label:'D',x:470,y:55},
      E:{id:'E',label:'E',x:520,y:220},
    },
    edges:{
      e1:{id:'e1',from:'Deposito',to:'A',weight:6},
      e2:{id:'e2',from:'Deposito',to:'B',weight:4},
      e3:{id:'e3',from:'Deposito',to:'E',weight:12},
      e4:{id:'e4',from:'A',to:'C',weight:3},
      e5:{id:'e5',from:'B',to:'C',weight:2},
      e6:{id:'e6',from:'B',to:'D',weight:5},
      e7:{id:'e7',from:'C',to:'E',weight:4},
      e8:{id:'e8',from:'D',to:'E',weight:2},
      e9:{id:'e9',from:'A',to:'D',weight:6},
    }
  };
}

function genSocialNetwork() {
  return {
    directed:false,
    nodes:{
      Ana:{id:'Ana',label:'Ana',x:65,y:145},
      Beto:{id:'Beto',label:'Beto',x:180,y:65},
      Carla:{id:'Carla',label:'Carla',x:180,y:225},
      Diego:{id:'Diego',label:'Diego',x:325,y:145},
      Eva:{id:'Eva',label:'Eva',x:445,y:60},
      Fabi:{id:'Fabi',label:'Fabi',x:445,y:225},
      Leo:{id:'Leo',label:'Leo',x:555,y:145},
    },
    edges:{
      e1:{id:'e1',from:'Ana',to:'Beto',weight:1},
      e2:{id:'e2',from:'Ana',to:'Carla',weight:1},
      e3:{id:'e3',from:'Beto',to:'Carla',weight:1},
      e4:{id:'e4',from:'Beto',to:'Diego',weight:1},
      e5:{id:'e5',from:'Carla',to:'Diego',weight:1},
      e6:{id:'e6',from:'Diego',to:'Eva',weight:1},
      e7:{id:'e7',from:'Diego',to:'Fabi',weight:1},
      e8:{id:'e8',from:'Eva',to:'Fabi',weight:1},
      e9:{id:'e9',from:'Eva',to:'Leo',weight:1},
      e10:{id:'e10',from:'Fabi',to:'Leo',weight:1},
    }
  };
}

const APPLICATION_CODE = {
  roads: `import heapq

def ruta_mas_corta(grafo, origen, destino):
    dist = {nodo: float("inf") for nodo in grafo}
    anterior = {nodo: None for nodo in grafo}
    dist[origen] = 0
    cola = [(0, origen)]

    while cola:
        costo, actual = heapq.heappop(cola)
        if costo != dist[actual]:
            continue
        if actual == destino:
            break

        for vecino, peso in grafo[actual]:
            nuevo = costo + peso
            if nuevo < dist[vecino]:
                dist[vecino] = nuevo
                anterior[vecino] = actual
                heapq.heappush(cola, (nuevo, vecino))

    camino = []
    actual = destino
    while actual is not None:
        camino.append(actual)
        actual = anterior[actual]

    return list(reversed(camino)), dist[destino]

carreteras = {
    "Cusco": [("Poroy", 12), ("Pisac", 33)],
    "Poroy": [("Ollantaytambo", 55)],
    "Pisac": [("Ollantaytambo", 48)],
    "Ollantaytambo": [("Machu Picchu", 43)],
    "Machu Picchu": []
}

camino, costo = ruta_mas_corta(
    carreteras, "Cusco", "Machu Picchu"
)
print(camino, costo)`,

  ospf: `import heapq

def dijkstra_ospf(red, router_origen):
    costo = {router: float("inf") for router in red}
    siguiente = {router: None for router in red}
    costo[router_origen] = 0
    cola = [(0, router_origen)]

    while cola:
        costo_actual, router = heapq.heappop(cola)
        if costo_actual != costo[router]:
            continue

        for vecino, costo_enlace in red[router]:
            nuevo = costo_actual + costo_enlace
            if nuevo < costo[vecino]:
                costo[vecino] = nuevo
                siguiente[vecino] = router
                heapq.heappush(cola, (nuevo, vecino))

    return costo, siguiente

red_ospf = {
    "R1": [("R2", 4), ("R3", 2)],
    "R2": [("R4", 5)],
    "R3": [("R2", 1), ("R5", 7)],
    "R4": [("R6", 3)],
    "R5": [("R6", 2)],
    "R6": []
}

costos, padres = dijkstra_ospf(red_ospf, "R1")
print("Costo hacia R6:", costos["R6"])`,

  robot: `import heapq

def a_estrella(inicio, meta, libres):
    def heuristica(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    movimientos = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    abierta = [(heuristica(inicio, meta), 0, inicio)]
    padre = {inicio: None}
    costo = {inicio: 0}

    while abierta:
        _, costo_actual, actual = heapq.heappop(abierta)
        if actual == meta:
            break

        for dx, dy in movimientos:
            vecino = (actual[0] + dx, actual[1] + dy)
            if vecino not in libres:
                continue

            nuevo = costo_actual + 1
            if nuevo < costo.get(vecino, float("inf")):
                costo[vecino] = nuevo
                padre[vecino] = actual
                prioridad = nuevo + heuristica(vecino, meta)
                heapq.heappush(abierta, (prioridad, nuevo, vecino))

    camino = []
    actual = meta
    while actual is not None:
        camino.append(actual)
        actual = padre.get(actual)

    return list(reversed(camino))

libres = {(x, y) for x in range(6) for y in range(4)}
libres -= {(2, 1), (2, 2), (4, 2)}
print(a_estrella((0, 0), (5, 3), libres))`,

  logistics: `import heapq

def costo_entrega(grafo, deposito, cliente):
    distancia = {nodo: float("inf") for nodo in grafo}
    padre = {nodo: None for nodo in grafo}
    distancia[deposito] = 0
    cola = [(0, deposito)]

    while cola:
        costo, actual = heapq.heappop(cola)
        if costo != distancia[actual]:
            continue

        for destino, tiempo in grafo[actual]:
            nuevo = costo + tiempo
            if nuevo < distancia[destino]:
                distancia[destino] = nuevo
                padre[destino] = actual
                heapq.heappush(cola, (nuevo, destino))

    ruta = []
    actual = cliente
    while actual is not None:
        ruta.append(actual)
        actual = padre[actual]

    return list(reversed(ruta)), distancia[cliente]

red_entregas = {
    "Deposito": [("A", 6), ("B", 4)],
    "A": [("C", 5), ("D", 8)],
    "B": [("C", 2), ("D", 6)],
    "C": [("E", 4)],
    "D": [("E", 3)],
    "E": []
}

ruta, minutos = costo_entrega(red_entregas, "Deposito", "E")
print("Ruta:", ruta)
print("Costo total:", minutos)`,

  social: `from collections import deque

def conexion_mas_corta(red, origen, destino):
    cola = deque([origen])
    padre = {origen: None}

    while cola:
        usuario = cola.popleft()
        if usuario == destino:
            break

        for amigo in red[usuario]:
            if amigo not in padre:
                padre[amigo] = usuario
                cola.append(amigo)

    if destino not in padre:
        return []

    camino = []
    actual = destino
    while actual is not None:
        camino.append(actual)
        actual = padre[actual]

    return list(reversed(camino))

red_social = {
    "Ana": ["Beto", "Carla"],
    "Beto": ["Ana", "Diego"],
    "Carla": ["Ana", "Diego"],
    "Diego": ["Beto", "Carla", "Eva", "Fabi"],
    "Eva": ["Diego", "Leo"],
    "Fabi": ["Diego", "Leo"],
    "Leo": ["Eva", "Fabi"]
}

print(conexion_mas_corta(red_social, "Ana", "Leo"))`
};

const APPLICATIONS = [
  { id:'roads', icon:'🚗', title:'Navegación vial', sub:'Google Maps · Apple Maps · OSRM · HERE Maps',
    prob:'Encontrar la ruta más corta o rápida entre dos puntos en una red de carreteras con millones de nodos en tiempo real.',
    model:'G=(V,E,w) donde V=intersecciones, E=segmentos viales y w=tiempo de viaje estimado con tráfico en tiempo real.',
    alg:'Contraction Hierarchies + capas de tráfico dinámico',
    why:'Para n>10⁶, Dijkstra puro toma varios segundos. CH reduce la consulta a milisegundos con preprocesamiento offline.',
    color:'#10b981', graphFactory:genRoadNetwork, source:'Cusco', target:'Machu_Picchu', editorAlgo:'dijk-heap',
    graphTitle:'Ejemplo: ruta Cusco → Machu Picchu', graphHelp:'Los nodos representan ciudades y las aristas, carreteras ponderadas por distancia o tiempo.',
    codeTitle:'Dijkstra aplicado a navegación vial (Python)', code:APPLICATION_CODE.roads
  },
  { id:'ospf', icon:'🌐', title:'OSPF — Enrutamiento IP', sub:'RFC 2328 · Protocolo estándar de Internet',
    prob:'Cada router calcula el árbol de caminos mínimos hacia los demás routers cuando cambia la topología de la red.',
    model:'G=(V,E,w) donde V=routers, E=enlaces físicos y w=costo OSPF según ancho de banda y latencia.',
    alg:'Dijkstra con Binary Heap, ejecutado de forma distribuida en cada router',
    why:'Las redes OSPF usan pesos no negativos y requieren rutas exactas. Dijkstra ofrece un resultado determinista y eficiente.',
    color:'#3b82f6', graphFactory:genOSPFNetwork, source:'R1', target:'R6', editorAlgo:'dijk-heap',
    graphTitle:'Ejemplo: encaminamiento desde R1 hasta R6', graphHelp:'Cada nodo es un router y cada peso representa el costo configurado para un enlace.',
    codeTitle:'Dijkstra para una tabla OSPF (Python)', code:APPLICATION_CODE.ospf
  },
  { id:'robot', icon:'🤖', title:'Robótica y planificación de movimiento', sub:'ROS · planificadores de trayectorias · motion planning',
    prob:'Un robot debe desplazarse desde una posición inicial hasta una meta evitando obstáculos y minimizando tiempo o energía.',
    model:'El mapa se discretiza en celdas. Los nodos son posiciones libres y las aristas son movimientos válidos entre celdas vecinas.',
    alg:'A* con heurística Manhattan o Euclidiana; D* para replanificación en tiempo real',
    why:'La heurística orienta la búsqueda hacia la meta y evita explorar zonas innecesarias del mapa.',
    color:'#f59e0b', graphFactory:genRobotGrid, source:'P00', target:'P35', editorAlgo:'astar',
    graphTitle:'Ejemplo: trayectoria de S (inicio) a G (meta)', graphHelp:'Los espacios sin nodo representan obstáculos. La ruta resaltada es una trayectoria válida de costo mínimo.',
    codeTitle:'A* para planificación de movimiento (Python)', code:APPLICATION_CODE.robot
  },
  { id:'logistics', icon:'📦', title:'Logística y supply chain', sub:'Optimización de entregas · VRP · Fleet management',
    prob:'Una flota debe realizar entregas minimizando distancia, tiempo o consumo de combustible.',
    model:'Los nodos son el depósito y los clientes. Los pesos representan distancia, costo o tiempo de traslado.',
    alg:'CH/HL para distancias; después heurísticas o métodos de optimización para el VRP',
    why:'El cálculo de caminos mínimos produce la matriz de costos que luego utiliza el optimizador de rutas de reparto.',
    color:'#8b5cf6', graphFactory:genLogisticsNetwork, source:'Deposito', target:'E', editorAlgo:'dijk-heap',
    graphTitle:'Ejemplo: ruta desde el depósito hasta el cliente E', graphHelp:'El camino verde muestra la alternativa de menor costo entre los puntos disponibles.',
    codeTitle:'Dijkstra para una red de entregas (Python)', code:APPLICATION_CODE.logistics
  },
  { id:'social', icon:'👥', title:'Redes sociales y análisis de grafos', sub:'Centralidad · comunidades · difusión de información',
    prob:'Analizar conexiones, difusión de información y nodos que aparecen con frecuencia en caminos mínimos.',
    model:'G=(V,E) donde V=usuarios, E=relaciones y el peso puede representar distancia social o inverso de interacciones.',
    alg:'Brandes para centralidad; BFS o Dijkstra según el tipo de peso',
    why:'Los caminos mínimos permiten detectar usuarios puente, medir cercanía y estudiar cómo se propaga la información.',
    color:'#ec4899', graphFactory:genSocialNetwork, source:'Ana', target:'Leo', editorAlgo:'dijk-heap',
    graphTitle:'Ejemplo: conexión mínima entre Ana y Leo', graphHelp:'Diego funciona como nodo puente entre dos grupos, algo útil para estudiar centralidad.',
    codeTitle:'BFS para una red social no ponderada (Python)', code:APPLICATION_CODE.social
  },
];

// =====================================================
// ALGORITHM REGISTRY
// =====================================================
const ALGOS = {
  'dijk-array': { name:'Dijkstra — Array lineal', fn:runDijkstraArray, time:'O(V²)', space:'O(V)', negW:false, apsp:false, impl:'Exacta', color:'#3b82f6', desc:'Escaneo lineal para hallar el mínimo. Óptimo en grafos densos (m≈V²).' },
  'dijk-heap':  { name:'Dijkstra — Binary Heap',  fn:runDijkstraHeap,  time:'O((V+E)logV)', space:'O(V)', negW:false, apsp:false, impl:'Exacta', color:'#10b981', desc:'Min-heap estándar. Mejor localidad de caché que Fibonacci. Preferido en producción.' },
  'dijk-fib':   { name:'Dijkstra — Fibonacci Heap',fn:runDijkstraHeap, time:'O(E+V logV)', space:'O(V)', negW:false, apsp:false, impl:'Exacta*', color:'#8b5cf6', desc:'Decrease-key O(1) amortizado. Óptimo teórico. Misma lógica que heap; métricas ajustadas.' },
  'dijk-bidir': { name:'Dijkstra Bidireccional',   fn:runBidirectional, time:'≈O((V+E)logV)/2',space:'O(V)', negW:false, apsp:false, impl:'Exacta', color:'#f59e0b', desc:'Búsqueda simultánea desde s y t. ~2× menos nodos. Base de CH y HL.' },
  'astar':      { name:'A* (Euclidiano)',           fn:runAStar,         time:'O((V+E)logV)*', space:'O(V)', negW:false, apsp:false, impl:'Exacta', color:'#ef4444', desc:'Dijkstra con heurística h=distancia Euclidiana escalada. Reduce espacio de búsqueda.' },
  'alt':        { name:'ALT (A*+Landmarks)',        fn:runALT,           time:'O((V+E)logV)*', space:'O(k·V)', negW:false, apsp:false, impl:'Demostrativa', color:'#f97316', desc:'Landmarks en esquinas del canvas. h_ALT ≥ h_euclid en muchos casos. 10–20× menos nodos.' },
  'bellman':    { name:'Bellman-Ford',              fn:runBellmanFord,   time:'O(V·E)', space:'O(V)', negW:true, apsp:false, impl:'Exacta', color:'#ec4899', desc:'Soporta pesos negativos. Detecta ciclos negativos. Cada iteración relaja todas las aristas.' },
  'floyd':      { name:'Floyd-Warshall',            fn:runFloydWarshall, time:'O(V³)', space:'O(V²)', negW:true, apsp:true, impl:'Exacta', color:'#06b6d4', desc:'Todos los pares en 3 loops anidados. Solo factible n ≲ 500. Soporta pesos negativos sin ciclos.' },
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function DijkstraLab() {
  const [tab, setTab] = useState('editor');
  const [graph, setGraph] = useState(defaultGraph());
  const [algo, setAlgo] = useState('dijk-heap');
  const [src, setSrc] = useState('A');
  const [tgt, setTgt] = useState('F');
  const [steps, setSteps] = useState([]);
  const [si, setSi] = useState(-1);
  const [result, setResult] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(700);
  const [editMode, setEditMode] = useState('select');
  const [edgeFrom, setEdgeFrom] = useState(null);
  const [selNode, setSelNode] = useState(null);
  const [selEdge, setSelEdge] = useState(null);
  const [edgeW, setEdgeW] = useState(5);
  const [dragNode, setDragNode] = useState(null);
  const [wasDragging, setWasDragging] = useState(false);
  const [cmpResults, setCmpResults] = useState({});
  const [benchData, setBenchData] = useState([]);
  const [benchRunning, setBenchRunning] = useState(false);
  const svgRef = useRef(null);
  const timerRef = useRef(null);

  const step = si >= 0 && si < steps.length ? steps[si] : null;

  const runAlgo = useCallback(() => {
    const a = ALGOS[algo];
    if (!a || !graph.nodes[src]) return;
    try {
      const r = a.fn(graph, src, tgt || null);
      setResult(r); setSteps(r.steps || []); setSi(-1); setPlaying(false);
    } catch(e) { console.error(e); }
  }, [graph, src, tgt, algo]);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setSi(prev => {
          if (prev >= steps.length - 1) { setPlaying(false); return steps.length - 1; }
          return prev + 1;
        });
      }, speed);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, steps.length, speed]);

  // SVG helpers
  const svgPt = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return {x:0,y:0};
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onSVGClick = (e) => {
    if (wasDragging) return;
    if (editMode === 'addNode') {
      const {x,y} = svgPt(e);
      const used = new Set(Object.keys(graph.nodes));
      let lb = LABELS.split('').find(c => !used.has(c)) || `N${Object.keys(graph.nodes).length}`;
      setGraph(g => ({ ...g, nodes: { ...g.nodes, [lb]: {id:lb,label:lb,x,y} } }));
    } else { setSelNode(null); setSelEdge(null); }
  };

  const onNodeClick = (e, nid) => {
    e.stopPropagation();
    if (wasDragging) return;
    if (editMode==='select') { setSelNode(nid); setSelEdge(null); }
    else if (editMode==='delNode') {
      setGraph(g => {
        const {[nid]:_, ...nodes} = g.nodes;
        const edges = Object.fromEntries(Object.entries(g.edges).filter(([,e])=>e.from!==nid&&e.to!==nid));
        return {...g,nodes,edges};
      });
      if (src===nid) setSrc(Object.keys(graph.nodes).find(n=>n!==nid)||'');
      if (tgt===nid) setTgt('');
    } else if (editMode==='addEdge') {
      if (!edgeFrom) { setEdgeFrom(nid); }
      else if (edgeFrom!==nid) {
        const id=`e${Date.now()}`;
        setGraph(g=>({...g,edges:{...g.edges,[id]:{id,from:edgeFrom,to:nid,weight:edgeW}}}));
        setEdgeFrom(null);
      } else { setEdgeFrom(null); }
    } else if (editMode==='setSrc') { setSrc(nid); setEditMode('select'); }
    else if (editMode==='setTgt') { setTgt(nid); setEditMode('select'); }
  };

  const onEdgeClick = (e, eid) => {
    e.stopPropagation();
    if (editMode==='select') { setSelEdge(eid); setSelNode(null); }
    else if (editMode==='delEdge') { setGraph(g=>{ const {[eid]:_,...edges}=g.edges; return {...g,edges}; }); }
  };

  const onNodeMD = (e, nid) => {
    if (editMode!=='select') return;
    e.preventDefault(); setDragNode(nid); setWasDragging(false);
  };

  const onSVGMM = (e) => {
    if (!dragNode) return;
    setWasDragging(true);
    const {x,y} = svgPt(e);
    setGraph(g=>({...g,nodes:{...g.nodes,[dragNode]:{...g.nodes[dragNode],x,y}}}));
  };

  const onSVGMU = () => { setDragNode(null); setTimeout(()=>setWasDragging(false),50); };

  // Visualization helpers
  const nodeColor = (nid) => {
    if (!step) { if(nid===src) return '#059669'; if(nid===tgt) return '#dc2626'; return '#374151'; }
    if (nid===step.current) return '#d97706';
    if (step.visitedB?.has(nid)) return '#7c3aed';
    if (step.visited?.has(nid)) return '#1d4ed8';
    if (step.frontier?.includes(nid)) return '#0891b2';
    if (step.landmarks?.includes(nid)) return '#ea580c';
    if (nid===src) return '#059669'; if(nid===tgt) return '#dc2626';
    return '#374151';
  };

  const isOnPath = useCallback((e) => {
    if (!result?.path?.length) return false;
    const p = result.path;
    for (let i=0;i<p.length-1;i++) {
      if ((e.from===p[i]&&e.to===p[i+1])||(!graph.directed&&e.from===p[i+1]&&e.to===p[i])) return true;
    }
    return false;
  }, [result, graph.directed]);

  const edgeColor = (e) => {
    if (step?.relaxed?.some(r=>r.eid===e.id)) return '#f59e0b';
    if (isOnPath(e)) return '#10b981';
    return '#4b5563';
  };
  const edgeWidth = (e) => {
    if (step?.relaxed?.some(r=>r.eid===e.id)) return 2.5;
    if (isOnPath(e)) return 3.5;
    return 1.5;
  };

  const runComparison = () => {
    const res = {};
    ['dijk-array','dijk-heap','astar','bellman','floyd'].forEach(aid => {
      const a = ALGOS[aid];
      try {
        const t0 = performance.now();
        const r = a.fn(graph, src, tgt||null);
        const t1 = performance.now();
        res[aid] = { time:(t1-t0).toFixed(3), visited:r.ops?.visited||0, relax:r.ops?.relax||0, edgeProc:r.ops?.edgeProc||0, pathDist:r.dist?.[tgt]??INF, ok:true };
      } catch(err) { res[aid] = { ok:false, err:err.message }; }
    });
    setCmpResults(res);
  };

  const runBenchmark = async () => {
    setBenchRunning(true); setBenchData([]);
    const sizes=[10,50,100,500];
    const bAlgos=['dijk-array','dijk-heap','bellman'];
    const results=[];
    for (const v of sizes) {
      const g=genRandom(v,0.3);
      const ns=Object.keys(g.nodes);
      const s=ns[0],t=ns[ns.length-1];
      for (const aid of bAlgos) {
        if (v>200&&aid==='dijk-array') { results.push({v,e:Object.keys(g.edges).length,aid,name:ALGOS[aid].name,skip:true}); continue; }
        await new Promise(r=>setTimeout(r,0));
        try {
          const t0=performance.now(); const r=ALGOS[aid].fn(g,s,t); const t1=performance.now();
          results.push({v,e:Object.keys(g.edges).length,aid,name:ALGOS[aid].name,time:(t1-t0).toFixed(2),visited:r.ops?.visited||0,relax:r.ops?.relax||0,edgeProc:r.ops?.edgeProc||0});
        } catch(err) { results.push({v,e:Object.keys(g.edges).length,aid,name:ALGOS[aid].name,err:err.message}); }
      }
    }
    setBenchData(results); setBenchRunning(false);
  };

  const ns = Object.values(graph.nodes);
  const es = Object.values(graph.edges);

  const TABS = [
    {id:'editor',label:'🔬 Editor'},
    {id:'compare',label:'📊 Comparar'},
    {id:'complexity',label:'🧮 Complejidad'},
    {id:'stateart',label:'🚀 Estado del arte'},
    {id:'applications',label:'🌍 Aplicaciones'},
    {id:'benchmark',label:'📈 Benchmark'},
  ];

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',color:'#e6edf3',fontFamily:'ui-monospace,Cascadia Code,Menlo,monospace',fontSize:'13px'}}>
      {/* ── HEADER ── */}
      <div style={{background:'#161b22',borderBottom:'1px solid #30363d',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontWeight:'bold',fontSize:'15px',color:'#58a6ff'}}>🗺 Laboratorio de Caminos Mínimos</div>
          <div style={{color:'#8b949e',fontSize:'11px'}}>UNSAAC · Algoritmos Avanzados 2025 · Dijkstra y variantes modernas</div>
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          {[['Exacta','#238636','#2ea043'],['Demostrativa','#9e6a03','#d29922'],['Pedagógica','#553098','#8957e5']].map(([lb,bg,fg])=>(
            <span key={lb} style={{background:bg,color:fg,fontSize:'10px',padding:'2px 8px',borderRadius:'12px',border:`1px solid ${fg}`}}>{lb}</span>
          ))}
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{background:'#161b22',borderBottom:'1px solid #30363d',display:'flex',gap:'0',padding:'0 16px',overflowX:'auto'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:'10px 16px',fontSize:'12px',border:'none',background:'transparent',
            color: tab===t.id ? '#58a6ff' : '#8b949e',
            borderBottom: tab===t.id ? '2px solid #58a6ff' : '2px solid transparent',
            cursor:'pointer',whiteSpace:'nowrap'
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{padding:'16px',maxWidth:'1400px',margin:'0 auto'}}>

      {/* ══════════════════════════════════════════════════════ */}
      {/* EDITOR TAB                                            */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab==='editor' && (
        <div style={{display:'grid',gridTemplateColumns:'220px 1fr 220px',gap:'12px'}}>
          {/* LEFT PANEL */}
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {/* Algorithm */}
            <Panel title="Algoritmo">
              <select value={algo} onChange={e=>setAlgo(e.target.value)} style={{width:'100%',background:'#0d1117',color:'#e6edf3',border:'1px solid #30363d',borderRadius:'6px',padding:'4px 6px',fontSize:'11px',marginBottom:'6px'}}>
                {Object.entries(ALGOS).map(([id,a])=><option key={id} value={id}>{a.name}</option>)}
              </select>
              <div style={{background:'#0d1117',borderRadius:'6px',padding:'8px',fontSize:'11px',lineHeight:'1.6',border:'1px solid #21262d'}}>
                <div style={{color:'#f0883e',fontWeight:'bold'}}>{ALGOS[algo].time}</div>
                <div style={{color:'#bc8cff'}}>Espacio: {ALGOS[algo].space}</div>
                <div style={{color: ALGOS[algo].impl==='Exacta'?'#3fb950':'#d29922', marginTop:'2px'}}>⚡ {ALGOS[algo].impl}</div>
                <div style={{color:'#8b949e',marginTop:'4px',fontSize:'10px',lineHeight:'1.4'}}>{ALGOS[algo].desc}</div>
              </div>
            </Panel>

            {/* Src/Tgt */}
            <Panel title="Origen / Destino">
              <div style={{display:'flex',gap:'6px',alignItems:'center',marginBottom:'6px'}}>
                <span style={{color:'#3fb950',width:'44px',fontSize:'11px'}}>Origen:</span>
                <select value={src} onChange={e=>setSrc(e.target.value)} style={selStyle}>{Object.keys(graph.nodes).map(n=><option key={n}>{n}</option>)}</select>
                <Btn onClick={()=>setEditMode('setSrc')} active={editMode==='setSrc'} small>✏</Btn>
              </div>
              <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                <span style={{color:'#f85149',width:'44px',fontSize:'11px'}}>Destino:</span>
                <select value={tgt} onChange={e=>setTgt(e.target.value)} style={selStyle}>
                  <option value="">— Todos —</option>
                  {Object.keys(graph.nodes).map(n=><option key={n}>{n}</option>)}
                </select>
                <Btn onClick={()=>setEditMode('setTgt')} active={editMode==='setTgt'} small>✏</Btn>
              </div>
            </Panel>

            {/* Controls */}
            <Panel title="Control de ejecución">
              <Btn onClick={runAlgo} full accent>▶ Ejecutar</Btn>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'4px',margin:'6px 0'}}>
                {[['⏮','',()=>{setSi(-1);setPlaying(false);}],['◀','',()=>setSi(i=>Math.max(-1,i-1))],[playing?'⏸':'▶','',()=>setPlaying(p=>!p)],['▶|','',()=>setSi(i=>Math.min(steps.length-1,i+1))]].map(([lb,,fn])=>(
                  <Btn key={lb} onClick={fn} small>{lb}</Btn>
                ))}
              </div>
              <div style={{textAlign:'center',color:'#8b949e',fontSize:'11px',marginBottom:'6px'}}>Paso {si+1} / {steps.length}</div>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <span style={{color:'#8b949e',fontSize:'10px'}}>Vel:</span>
                <input type="range" min={100} max={2000} step={100} value={2100-speed} onChange={e=>setSpeed(2100-+e.target.value)} style={{flex:1}}/>
              </div>
            </Panel>

            {/* Tools */}
            <Panel title="Herramientas de edición">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px',marginBottom:'6px'}}>
                {[['select','↖ Mover'],['addNode','➕ Nodo'],['addEdge','🔗 Arista'],['delNode','🗑 Nodo'],['delEdge','✂ Arista']].map(([m,lb])=>(
                  <Btn key={m} onClick={()=>{setEditMode(m);setEdgeFrom(null);}} active={editMode===m} small>{lb}</Btn>
                ))}
                <Btn onClick={()=>setGraph(g=>({...g,directed:!g.directed}))} small>{graph.directed?'→ Dirigido':'↔ No dir.'}</Btn>
              </div>
              {editMode==='addEdge' && (
                <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'11px'}}>
                  <span style={{color:'#8b949e'}}>Peso:</span>
                  <input type="number" value={edgeW} onChange={e=>setEdgeW(+e.target.value||1)} min="0.1" step="1" style={{...selStyle,width:'60px'}}/>
                </div>
              )}
              {edgeFrom && <div style={{color:'#d29922',fontSize:'10px',marginTop:'4px'}}>Desde {edgeFrom} → elige destino</div>}
              {(editMode==='setSrc'||editMode==='setTgt') && <div style={{color:'#58a6ff',fontSize:'10px',marginTop:'4px'}}>Clic en un nodo del canvas</div>}
            </Panel>

            {/* Graph presets */}
            <Panel title="Generar grafo">
              {[['📐 Ejemplo (Dijkstra)',()=>{setGraph(defaultGraph());setSrc('A');setTgt('F');setSteps([]);setResult(null);}],
                ['🏔 Red vial (Cusco)',()=>{setGraph(genRoadNetwork());setSrc('Cusco');setTgt('Machu_Picchu');setSteps([]);setResult(null);}],
                ['🎲 Aleatorio 8 nodos',()=>{setGraph(genRandom(8,0.4));setSrc(Object.keys(genRandom(8,0.4).nodes)[0]||'A');setTgt('');setSteps([]);setResult(null);}],
                ['🎲 Aleatorio 14 nodos',()=>{const g=genRandom(14,0.3);const ns=Object.keys(g.nodes);setGraph(g);setSrc(ns[0]);setTgt(ns[ns.length-1]);setSteps([]);setResult(null);}],
                ['▦ Malla 3×4',()=>{setGraph(genGrid(3,4));setSrc('N0');setTgt('N11');setSteps([]);setResult(null);}],
              ].map(([lb,fn])=><Btn key={lb} onClick={fn} full small style={{marginBottom:'3px',textAlign:'left',paddingLeft:'8px'}}>{lb}</Btn>)}
              <div style={{display:'flex',gap:'4px',marginTop:'6px'}}>
                <Btn small onClick={()=>{const b=new Blob([JSON.stringify(graph,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='graph.json';a.click();}}>⬇ JSON</Btn>
                <label style={{flex:1,fontSize:'11px',padding:'3px 8px',background:'#21262d',border:'1px solid #30363d',borderRadius:'6px',textAlign:'center',cursor:'pointer',color:'#8b949e'}}>
                  ⬆ JSON<input type="file" accept=".json" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const g=JSON.parse(ev.target.result);setGraph(g);const ns=Object.keys(g.nodes);setSrc(ns[0]||'');setTgt(ns[ns.length-1]||'');setSteps([]);setResult(null);}catch{}};r.readAsText(f);}}/>
                </label>
              </div>
            </Panel>
          </div>

          {/* CANVAS */}
          <div style={{background:'#161b22',borderRadius:'8px',border:'1px solid #30363d',overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'6px 12px',borderBottom:'1px solid #30363d',display:'flex',justifyContent:'space-between',alignItems:'center',color:'#8b949e',fontSize:'11px'}}>
              <span>{ns.length} nodos · {es.length} aristas · {graph.directed?'Dirigido':'No dirigido'}</span>
              <span>{editMode==='addNode'?'Clic en el canvas para agregar nodo':editMode==='addEdge'?'Clic en nodo origen → nodo destino':editMode==='delNode'?'Clic en nodo para eliminar':editMode==='delEdge'?'Clic en arista para eliminar':editMode==='setSrc'?'Clic para establecer origen':editMode==='setTgt'?'Clic para establecer destino':'Arrastra nodos para moverlos'}</span>
            </div>
            <svg ref={svgRef} style={{flex:1,width:'100%',height:'520px',cursor:editMode==='addNode'?'crosshair':'default'}}
              onClick={onSVGClick} onMouseMove={onSVGMM} onMouseUp={onSVGMU} onMouseLeave={onSVGMU}>
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#21262d" strokeWidth="0.5"/>
                </pattern>
                <marker id="arr" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
                  <polygon points="0 0,8 3.5,0 7" fill="#4b5563"/>
                </marker>
                <marker id="arr-y" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
                  <polygon points="0 0,8 3.5,0 7" fill="#f59e0b"/>
                </marker>
                <marker id="arr-g" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
                  <polygon points="0 0,8 3.5,0 7" fill="#10b981"/>
                </marker>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)"/>

              {/* EDGES */}
              {es.map(e=>{
                const f=graph.nodes[e.from],t=graph.nodes[e.to];
                if(!f||!t)return null;
                const dx=t.x-f.x,dy=t.y-f.y,len=Math.sqrt(dx*dx+dy*dy)||1;
                const col=edgeColor(e),w=edgeWidth(e);
                const ox=-dy/len*6,oy=dx/len*6;
                const x1=f.x+ox,y1=f.y+oy,x2=t.x+ox,y2=t.y+oy;
                const ex=dx/len,ey=dy/len;
                const x2s=x2-ex*19,y2s=y2-ey*19;
                const mx=(x1+x2s)/2,my=(y1+y2s)/2;
                const isPath=isOnPath(e);
                const markerEnd=graph.directed?(col==='#f59e0b'?'url(#arr-y)':isPath?'url(#arr-g)':'url(#arr)'):'none';
                return (
                  <g key={e.id} onClick={ev=>onEdgeClick(ev,e.id)} style={{cursor:'pointer'}}>
                    <line x1={x1} y1={y1} x2={graph.directed?x2s:x2} y2={graph.directed?y2s:y2} stroke={col} strokeWidth={w} markerEnd={markerEnd} opacity={si<0||isPath||col!=='#4b5563'?1:0.4}/>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={14}/>
                    <rect x={mx-11} y={my-7} width={22} height={13} fill="#0d1117" rx={3} opacity={0.85}/>
                    <text x={mx} y={my+4} textAnchor="middle" fontSize="9" fill={isPath?'#6ee7b7':'#6e7681'}>{e.weight}</text>
                  </g>
                );
              })}

              {/* NODES */}
              {ns.map(nd=>{
                const col=nodeColor(nd.id);
                const d=step?.dist?.[nd.id];
                const isLM=step?.landmarks?.includes(nd.id);
                return (
                  <g key={nd.id} onClick={ev=>onNodeClick(ev,nd.id)} onMouseDown={ev=>onNodeMD(ev,nd.id)} style={{cursor:editMode==='select'?'grab':'pointer'}}>
                    {isLM&&<circle cx={nd.x} cy={nd.y} r={26} fill="none" stroke="#f97316" strokeWidth={1.5} strokeDasharray="5 3"/>}
                    <circle cx={nd.x} cy={nd.y} r={18} fill={col} stroke={selNode===nd.id?'#fff':nd.id===src?'#34d399':nd.id===tgt?'#fca5a5':'#30363d'} strokeWidth={selNode===nd.id?2.5:1.5}/>
                    <text x={nd.x} y={nd.y+4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">{nd.label}</text>
                    {d!==undefined&&d!==INF&&<text x={nd.x} y={nd.y+31} textAnchor="middle" fontSize="9" fill="#58a6ff">{d.toFixed(1)}</text>}
                  </g>
                );
              })}

              {/* LEGEND */}
              {[['#059669','Origen'],['#dc2626','Destino'],['#d97706','Actual'],['#1d4ed8','Visitado'],['#7c3aed','Visit.Bwd'],['#0891b2','Frontera'],['#ea580c','Landmark']].map(([col,lb],i)=>(
                <g key={lb} transform={`translate(8,${8+i*17})`}>
                  <circle cx={7} cy={7} r={5} fill={col}/>
                  <text x={16} y={11} fontSize="9" fill="#6e7681">{lb}</text>
                </g>
              ))}
            </svg>
          </div>

          {/* RIGHT PANEL */}
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {/* Step info */}
            <Panel title="Paso actual">
              {step ? (
                <>
                  <div style={{background:'#0d1117',borderRadius:'6px',padding:'8px',color:'#d29922',fontSize:'11px',lineHeight:'1.5',marginBottom:'8px',border:'1px solid #30363d'}}>{step.msg}</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px'}}>
                    {[['Visitados',step.visited?.size||0,'#58a6ff'],['Relajaciones',step.relax||0,'#3fb950'],['Operaciones',step.ops||0,'#d29922'],['Aristas proc.',step.edgeProc||0,'#bc8cff']].map(([lb,v,c])=>(
                      <div key={lb} style={{background:'#0d1117',borderRadius:'6px',padding:'6px',border:'1px solid #21262d',textAlign:'center'}}>
                        <div style={{color:'#6e7681',fontSize:'10px'}}>{lb}</div>
                        <div style={{color:c,fontWeight:'bold',fontSize:'16px'}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div style={{color:'#6e7681',fontSize:'11px'}}>Ejecuta un algoritmo para ver los pasos de ejecución.</div>}
            </Panel>

            {/* Distance table */}
            <Panel title="Distancias tentativas">
              <div style={{maxHeight:'200px',overflowY:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                  <thead><tr style={{borderBottom:'1px solid #21262d'}}>
                    {['Nodo','Dist','Est'].map(h=><th key={h} style={{textAlign:h==='Dist'||h==='Est'?'right':'left',padding:'2px 4px',color:'#6e7681'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>{Object.keys(graph.nodes).map(nid=>{
                    const d=step?.dist?.[nid]??result?.dist?.[nid];
                    const isCur=step?.current===nid, isVis=step?.visited?.has(nid);
                    return (
                      <tr key={nid} style={{borderBottom:'1px solid #161b22',background:isCur?'rgba(217,119,6,0.1)':'transparent'}}>
                        <td style={{padding:'2px 4px',color:nid===src?'#3fb950':nid===tgt?'#f85149':'#e6edf3',fontWeight:'bold'}}>{nid}</td>
                        <td style={{textAlign:'right',padding:'2px 4px',color:d===undefined||d===INF?'#30363d':'#58a6ff',fontWeight:'bold'}}>{d===undefined?'—':fmt(d)}</td>
                        <td style={{textAlign:'right',padding:'2px 4px'}}>{isCur?<span style={{color:'#d29922'}}>●</span>:isVis?<span style={{color:'#3fb950'}}>✓</span>:d<INF?<span style={{color:'#58a6ff'}}>○</span>:<span style={{color:'#21262d'}}>–</span>}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </Panel>

            {/* Result */}
            {result && si===steps.length-1 && (
              <Panel title="Resultado final" accent="#2ea043">
                {result.negCycle && <div style={{color:'#f85149',fontSize:'11px',marginBottom:'6px'}}>⚠️ Ciclo negativo detectado</div>}
                {tgt&&result.path?.length>0&&<div style={{fontSize:'11px',marginBottom:'4px'}}><span style={{color:'#6e7681'}}>Camino: </span><span style={{color:'#3fb950',fontWeight:'bold'}}>{result.path.join(' → ')}</span></div>}
                {tgt&&<div style={{fontSize:'11px',marginBottom:'4px'}}><span style={{color:'#6e7681'}}>Costo: </span><span style={{color:'#d29922',fontWeight:'bold'}}>{result.dist?.[tgt]===INF?'No alcanzable':fmt(result.dist?.[tgt])}</span></div>}
                <div style={{color:'#6e7681',fontSize:'10px',marginTop:'6px',borderTop:'1px solid #21262d',paddingTop:'6px'}}>
                  <div>Nodos visitados: {result.ops?.visited}</div>
                  <div>Relajaciones: {result.ops?.relax}</div>
                  <div>Aristas procesadas: {result.ops?.edgeProc}</div>
                </div>
              </Panel>
            )}

            {/* Edge editor */}
            {selEdge && graph.edges[selEdge] && (
              <Panel title="Arista seleccionada" accent="#d29922">
                <div style={{fontSize:'11px',color:'#6e7681',marginBottom:'6px'}}>{graph.edges[selEdge].from} → {graph.edges[selEdge].to}</div>
                <div style={{display:'flex',gap:'6px',alignItems:'center',marginBottom:'6px'}}>
                  <span style={{color:'#6e7681',fontSize:'11px'}}>Peso:</span>
                  <input type="number" value={graph.edges[selEdge].weight} onChange={e=>setGraph(g=>({...g,edges:{...g.edges,[selEdge]:{...g.edges[selEdge],weight:parseFloat(e.target.value)||1}}}))} style={{...selStyle,width:'70px'}} min="0.1" step="1"/>
                </div>
                <Btn onClick={()=>{setGraph(g=>{const{[selEdge]:_,...edges}=g.edges;return{...g,edges};});setSelEdge(null);}} full small style={{color:'#f85149',borderColor:'#f85149'}}>🗑 Eliminar arista</Btn>
              </Panel>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* COMPARE TAB                                           */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab==='compare' && (
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <h2 style={{color:'#e6edf3',fontSize:'16px',fontWeight:'bold',margin:0}}>Comparación de algoritmos</h2>
            <Btn onClick={runComparison} accent>▶ Comparar en grafo actual</Btn>
          </div>
          <div style={{color:'#8b949e',fontSize:'11px'}}>Grafo actual: {Object.keys(graph.nodes).length} nodos, {Object.keys(graph.edges).length} aristas · Origen: {src} → Destino: {tgt||'todos'}</div>

          {Object.keys(cmpResults).length>0 && (
            <div style={{overflowX:'auto',background:'#161b22',borderRadius:'8px',border:'1px solid #30363d'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                <thead><tr style={{background:'#0d1117'}}>
                  {['Algoritmo','Tiempo (ms)','Nodos vis.','Relajaciones','Aristas proc.','Distancia mín.','W<0','APSP'].map(h=>(
                    <th key={h} style={{padding:'8px 10px',textAlign:h==='Algoritmo'?'left':'right',color:'#6e7681',borderBottom:'1px solid #30363d',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {Object.entries(cmpResults).map(([aid,r])=>{
                    const a=ALGOS[aid]; if(!a)return null;
                    if(!r.ok) return <tr key={aid}><td style={{padding:'6px 10px',color:a.color}}>{a.name}</td><td colSpan={7} style={{padding:'6px 10px',color:'#f85149'}}>Error: {r.err}</td></tr>;
                    return (
                      <tr key={aid} style={{borderBottom:'1px solid #21262d'}}>
                        <td style={{padding:'6px 10px'}}><div style={{color:a.color,fontWeight:'bold'}}>{a.name}</div><div style={{color:'#6e7681',fontSize:'10px'}}>{a.time}</div></td>
                        <td style={{textAlign:'right',padding:'6px 10px',color:'#d29922',fontFamily:'monospace'}}>{r.time}</td>
                        <td style={{textAlign:'right',padding:'6px 10px',color:'#58a6ff'}}>{r.visited}</td>
                        <td style={{textAlign:'right',padding:'6px 10px',color:'#3fb950'}}>{r.relax}</td>
                        <td style={{textAlign:'right',padding:'6px 10px',color:'#bc8cff'}}>{r.edgeProc}</td>
                        <td style={{textAlign:'right',padding:'6px 10px',color:'#58a6ff',fontWeight:'bold'}}>{r.pathDist===INF?'∞':fmt(r.pathDist)}</td>
                        <td style={{textAlign:'right',padding:'6px 10px'}}>{a.negW?'✅':'❌'}</td>
                        <td style={{textAlign:'right',padding:'6px 10px'}}>{a.apsp?'✅':'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Classification table */}
          <div style={{background:'#161b22',borderRadius:'8px',border:'1px solid #30363d',overflow:'hidden'}}>
            <div style={{padding:'10px 14px',borderBottom:'1px solid #30363d',color:'#e6edf3',fontWeight:'bold',fontSize:'13px'}}>Tabla de clasificación de implementaciones</div>
            <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
              <thead><tr style={{background:'#0d1117'}}>
                {['Algoritmo','Complejidad T','Espacio','Tipo','Implementación','Pesos neg.','Caso de uso'].map(h=>(
                  <th key={h} style={{padding:'8px 10px',textAlign:'left',color:'#6e7681',borderBottom:'1px solid #30363d',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[
                  ['Dijkstra Array','O(V²)','O(V)','SSSP','Exacta',false,'Grafos densos, m≈V²'],
                  ['Dijkstra Heap','O((V+E)logV)','O(V)','SSSP','Exacta',false,'Estándar de producción'],
                  ['Dijkstra Fibonacci','O(E+V logV)','O(V)','SSSP','Exacta*',false,'Óptimo teórico grafos densos'],
                  ['Dijkstra Bidir.','≈O((V+E)logV)/2','O(V)','Punto-punto','Exacta',false,'Consultas origen-destino'],
                  ['A*','O((V+E)logV)*','O(V)','SSSP','Exacta',false,'Grafos con coordenadas'],
                  ['ALT','O((V+E)logV)*','O(k·V)','SSSP','Demostrativa',false,'Redes viales (10-20× speedup)'],
                  ['Bellman-Ford','O(V·E)','O(V)','SSSP','Exacta',true,'Pesos negativos, detección ciclos'],
                  ['Floyd-Warshall','O(V³)','O(V²)','APSP','Exacta',true,'Todos los pares, n≲500'],
                  ['Cont. Hierarchies','Preproceso O(V logV)','O(V+E+sh.)','SSSP','Pedagógica',false,'Redes viales, 10³-10⁴× speedup'],
                  ['Hub Labeling','Consulta O(|F|)','O(n√m)','SSSP','Pedagógica',false,'Submicroseg., consultas estáticas'],
                  ['Transit Node Routing','Constante (larga dist.)','O(|T|²)','SSSP','Pedagógica',false,'Rutas largas, 5-10× sobre CH'],
                ].map(([n,t,s,ty,im,neg,use],i)=>(
                  <tr key={i} style={{borderBottom:'1px solid #0d1117'}}>
                    <td style={{padding:'5px 10px',color:'#e6edf3',fontWeight:'bold'}}>{n}</td>
                    <td style={{padding:'5px 10px',color:'#f0883e',fontFamily:'monospace'}}>{t}</td>
                    <td style={{padding:'5px 10px',color:'#bc8cff',fontFamily:'monospace'}}>{s}</td>
                    <td style={{padding:'5px 10px',color:'#8b949e'}}>{ty}</td>
                    <td style={{padding:'5px 10px',color:im==='Exacta'?'#3fb950':im==='Demostrativa'?'#d29922':'#8957e5'}}>{im}</td>
                    <td style={{padding:'5px 10px',textAlign:'center'}}>{neg?'✅':'❌'}</td>
                    <td style={{padding:'5px 10px',color:'#8b949e'}}>{use}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* COMPLEXITY TAB                                        */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab==='complexity' && (
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          <h2 style={{color:'#e6edf3',fontSize:'16px',fontWeight:'bold',margin:0}}>🧮 Laboratorio de complejidad computacional</h2>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'10px'}}>
            {Object.entries(ALGOS).map(([id,a])=>(
              <div key={id} style={{background:'#161b22',borderRadius:'8px',border:'1px solid #30363d',padding:'12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                  <div style={{width:'12px',height:'12px',borderRadius:'50%',background:a.color,flexShrink:0}}/>
                  <div style={{color:'#e6edf3',fontWeight:'bold',flex:1,fontSize:'12px'}}>{a.name}</div>
                  <span style={{fontSize:'10px',padding:'2px 6px',borderRadius:'10px',background:a.impl==='Exacta'?'rgba(46,160,67,0.2)':a.impl==='Exacta*'?'rgba(88,166,255,0.2)':'rgba(210,153,34,0.2)',color:a.impl==='Exacta'?'#3fb950':a.impl==='Exacta*'?'#58a6ff':'#d29922'}}>{a.impl}</span>
                </div>
                <div style={{fontSize:'11px',display:'flex',flexDirection:'column',gap:'4px'}}>
                  <Row k="Tiempo" v={a.time} vc="#f0883e"/>
                  <Row k="Espacio" v={a.space} vc="#bc8cff"/>
                  <Row k="Pesos neg." v={a.negW?'✅ Sí':'❌ No'} vc={a.negW?'#3fb950':'#f85149'}/>
                  <Row k="Todos pares" v={a.apsp?'✅ Sí':'— No'} vc={a.apsp?'#3fb950':'#6e7681'}/>
                  <div style={{marginTop:'6px',background:'#0d1117',borderRadius:'6px',padding:'8px',color:'#8b949e',lineHeight:'1.5',fontSize:'10px'}}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Avanzado */}
          <div style={{background:'#161b22',borderRadius:'8px',border:'1px solid #30363d',padding:'16px'}}>
            <div style={{color:'#e6edf3',fontWeight:'bold',fontSize:'14px',marginBottom:'12px'}}>Técnicas avanzadas — análisis teórico</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'12px'}}>
              {[{
                title:'Contraction Hierarchies',color:'#f97316',impl:'Pedagógica',
                rows:[['Preproceso','O(V log V) – O(V√V)'],['Consulta','O(V log V), ms en práctica'],['Almacenamiento','O(V + E + shortcuts)'],['Speedup','10³–10⁴× vs Dijkstra'],['Variante','CCH: actualiza pesos sin rejerarquizar']]
              },{
                title:'Hub Labeling',color:'#8b5cf6',impl:'Pedagógica',
                rows:[['Construcción','O(V² log V + VE)'],['Consulta','O(|F(s)|+|F(t)|) ≈ submicros.'],['Memoria','O(n√m) — decenas de GB nacional'],['Speedup','100–1000× sobre CH'],['Limitación','Actualizaciones dinámicas costosas']]
              },{
                title:'Transit Node Routing',color:'#06b6d4',impl:'Pedagógica',
                rows:[['Preproceso','O(|T|² + V·|A|)'],['Consulta','O(|A(s)|·|A(t)|) ≈ microseg.'],['Almacenamiento','O(|T|² + V·|A|)'],['Speedup','5–10× sobre CH (rutas largas)'],['Limitación','Solo distancias suficientemente largas']]
              }].map(({title,color,impl,rows})=>(
                <div key={title} style={{background:'#0d1117',borderRadius:'8px',padding:'12px',border:`1px solid ${color}33`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                    <div style={{color,fontWeight:'bold',fontSize:'12px'}}>{title}</div>
                    <span style={{fontSize:'10px',color:'#d29922',background:'rgba(210,153,34,0.15)',padding:'2px 6px',borderRadius:'8px'}}>{impl}</span>
                  </div>
                  {rows.map(([k,v])=><Row key={k} k={k} v={v} vc="#c9d1d9"/>)}
                </div>
              ))}
            </div>
          </div>

          <div style={{background:'rgba(88,166,255,0.08)',border:'1px solid #1f6feb',borderRadius:'8px',padding:'12px',fontSize:'11px',color:'#79c0ff',lineHeight:'1.6'}}>
            <strong>Referencia fundamental:</strong> Fredman y Tarjan (1987) demostraron que el Fibonacci heap alcanza la cota inferior teórica Ω(m+n log n) bajo el modelo de comparaciones. En grafos densos (m=Θ(n²)), Dijkstra Array y Fibonacci Heap coinciden asintóticamente en O(n²). Para redes viales reales con grado medio d̄≈3, el Binary Heap supera al Fibonacci Heap en la práctica por su mejor localidad de caché y constantes más bajas de implementación [Bast et al., 2016].
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* STATE OF ART TAB                                      */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab==='stateart' && (
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          <h2 style={{color:'#e6edf3',fontSize:'16px',fontWeight:'bold',margin:0}}>🚀 Estado del arte en caminos mínimos</h2>
          <div style={{background:'rgba(210,153,34,0.1)',border:'1px solid #d29922',borderRadius:'8px',padding:'12px',fontSize:'11px',color:'#e3b341',lineHeight:'1.5'}}>
            <strong>📌 Honestidad académica:</strong> CH, HL y TNR son demasiado complejos para implementación completa en frontend. Se presentan con simulaciones pedagógicas que ilustran los conceptos clave. Las métricas son aproximadas.
          </div>

          {/* CH */}
          <ArtCard color="#f97316" title="Contraction Hierarchies (CH)" sub="Geisberger, Sanders, Schultes, Delling — WEA 2008 · Springer LNCS 5038" badge="Pedagógica">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',fontSize:'11px'}}>
              <div style={{lineHeight:'1.7',color:'#c9d1d9'}}>
                <p><strong style={{color:'#f97316'}}>Idea central:</strong> se asigna un rango (rank) a cada nodo por importancia. Los nodos de menor rango se contraen primero, insertando aristas de atajo (shortcuts) ⟨u,v,w⟩ cuando el camino mínimo entre dos vecinos u y v pasa solo por nodos ya contraídos.</p>
                <p><strong style={{color:'#f97316'}}>Propiedad clave (rank-monotone path):</strong> en cualquier camino mínimo s⇝t, los rangos primero suben y luego bajan. Esto permite buscar hacia adelante (rank creciente desde s) y hacia atrás (rank decreciente desde t) simultáneamente.</p>
                <p><strong style={{color:'#f97316'}}>Speedup empírico:</strong> 10³–10⁴× sobre Dijkstra en redes continentales. OSRM (motor de OpenStreetMap) implementa CH completo y es código abierto auditado públicamente.</p>
              </div>
              <div style={{background:'#0d1117',borderRadius:'8px',padding:'12px',fontFamily:'monospace',fontSize:'10px',color:'#c9d1d9',lineHeight:'1.8'}}>
                <div style={{color:'#f97316',marginBottom:'6px',fontWeight:'bold'}}>Pseudocódigo de preprocesamiento:</div>
                <pre style={{margin:0,overflow:'auto',color:'#8b949e'}}>{`Para v en orden rank[v] ascendente:
                    Marcar v como contraído
                    Para cada par (u, w) vecinos de v:
                        Si camino_min(u,w) pasa por v:
                        Insertar shortcut u→w
                        con peso(u,v) + peso(v,w)

                    Búsqueda CH:
                    Dijkstra_fwd(s): solo nodos rank >rank[actual]
                    Dijkstra_bwd(t): solo nodos rank >rank[actual]
                    Combinar en nodo de encuentro de mayor rank`}
                </pre>
                <div style={{marginTop:'8px',color:'#6e7681'}}>Preproceso: O(V log V)–O(V√V)<br/>Consulta práctica: milisegundos en redes nacionales</div>
              </div>
            </div>
          </ArtCard>

          {/* HL */}
          <ArtCard color="#8b5cf6" title="Hub Labeling (HL)" sub="Abraham, Delling, Goldberg, Werneck — ESA 2012 · Springer LNCS 7501" badge="Pedagógica">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',fontSize:'11px'}}>
              <div style={{lineHeight:'1.7',color:'#c9d1d9'}}>
                <p><strong style={{color:'#8b5cf6'}}>Concepto:</strong> a cada nodo v se le asigna un conjunto de hubs F(v) tal que para todo par (s,t) existe un hub h ∈ F(s)∩F(t) que pertenece al camino mínimo s⇝t (propiedad cover).</p>
                <p><strong style={{color:'#8b5cf6'}}>Consulta:</strong> d(s,t) = min<sub>h∈F(s)∩F(t)</sub> {'{'}d(s,h) + d(h,t){'}'}</p>
                <p><strong style={{color:'#8b5cf6'}}>Velocidad:</strong> submicrosegundo en redes nacionales. El método más rápido para consultas estáticas punto-a-punto.</p>
                <p><strong style={{color:'#8b5cf6'}}>Costo:</strong> construcción O(V² log V + VE). Memoria O(n√m): decenas de GB para red nacional completa.</p>
              </div>
              <div style={{background:'#0d1117',borderRadius:'8px',padding:'12px',fontSize:'11px',color:'#c9d1d9',lineHeight:'1.7'}}>
                <div style={{color:'#8b5cf6',fontWeight:'bold',marginBottom:'6px'}}>Ejemplo ilustrativo (red vial):</div>
                <div style={{fontFamily:'monospace',fontSize:'10px',color:'#8b949e'}}>
                  <div>F(Madrid) = {'{'}Madrid, BCN, Valencia, ...{'}'}</div>
                  <div>F(Sevilla) = {'{'}Sevilla, Madrid, Córdoba, ...{'}'}</div>
                  <div style={{marginTop:'6px',color:'#bc8cff'}}>F(Madrid) ∩ F(Sevilla) = {'{'}Madrid{'}'}</div>
                  <div style={{marginTop:'6px'}}>d(Madrid→Sevilla) = d(M,M) + d(M,Sevilla)</div>
                </div>
                <div style={{marginTop:'10px',color:'#6e7681',fontSize:'10px'}}>El hub en el camino mínimo garantiza exactitud sin explorar el grafo en cada consulta. Sensible a actualizaciones dinámicas de pesos.</div>
              </div>
            </div>
          </ArtCard>

          {/* TNR */}
          <ArtCard color="#06b6d4" title="Transit Node Routing (TNR)" sub="Bast, Funke, Matijevic, Sanders, Schultes — ALENEX 2007 · SIAM" badge="Pedagógica">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',fontSize:'11px'}}>
              <div style={{lineHeight:'1.7',color:'#c9d1d9'}}>
                <p><strong style={{color:'#06b6d4'}}>Observación:</strong> en redes viales, la mayoría de rutas largas pasan por un conjunto pequeño T de nodos de tránsito (autopistas, intercambios).</p>
                <p><strong style={{color:'#06b6d4'}}>Precálculo:</strong> tabla D[τᵢ][τⱼ] para todo par en T×T, y access nodes A(v)⊂T (tránsitos más cercanos a v).</p>
                <p><strong style={{color:'#06b6d4'}}>Consulta (larga distancia):</strong><br/>d(s,t) = min<sub>τᵢ∈A(s), τⱼ∈A(t)</sub> {'{'}d(s,τᵢ) + D[τᵢ][τⱼ] + d(τⱼ,t){'}'}</p>
                <p><strong style={{color:'#06b6d4'}}>Velocidad:</strong> 5–10× más rápido que CH. Microsegundos para rutas largas. Limitado a rutas "suficientemente largas".</p>
              </div>
              <div style={{background:'#0d1117',borderRadius:'8px',padding:'12px',fontSize:'11px',color:'#c9d1d9',lineHeight:'1.7'}}>
                <div style={{color:'#06b6d4',fontWeight:'bold',marginBottom:'8px'}}>Metáfora del aeropuerto:</div>
                <p style={{color:'#8b949e',fontSize:'10px'}}>Es como viajar en avión: desde tu casa hasta el aeropuerto más cercano (access nodes), luego vuelo entre aeropuertos (tabla D[τᵢ][τⱼ]), luego del aeropuerto a tu destino. Hay ~1000 "aeropuertos" en Europa pero millones de casas.</p>
                <div style={{marginTop:'8px',fontFamily:'monospace',fontSize:'10px',color:'#6e7681'}}>
                  <div>|T| típico: 1,000–10,000 nodos</div>
                  <div>|A(v)| típico: 5–20 access nodes</div>
                  <div>Complejidad consulta: O(|A(s)|·|A(t)|)</div>
                </div>
              </div>
            </div>
          </ArtCard>

          {/* Dynamic + GPU */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <ArtCard color="#3fb950" title="Grafos dinámicos" sub="Ramalingam-Reps (1996) · D'Andrea et al. (2019)">
              <div style={{fontSize:'11px',color:'#c9d1d9',lineHeight:'1.7'}}>
                <p>En redes reales, los grafos cambian continuamente: accidentes, obras, variación de tráfico. Los algoritmos dinámicos evitan la recomputación global propagando cambios localmente.</p>
                <div style={{background:'#0d1117',borderRadius:'6px',padding:'8px',fontFamily:'monospace',fontSize:'10px',color:'#6e7681'}}>
                  <div><span style={{color:'#3fb950'}}>Ramalingam-Reps:</span> O(k log n) por actualización, k=nodos afectados</div>
                  <div><span style={{color:'#3fb950'}}>CH dinámico:</span> reconstrucción parcial de shortcuts en región afectada</div>
                  <div><span style={{color:'#3fb950'}}>Producción:</span> Google Maps/HERE: CH estático + caché + recalibrado de pesos por tráfico</div>
                </div>
              </div>
            </ArtCard>
            <ArtCard color="#ec4899" title="Paralelización GPU / CPU multinúcleo" sub="Davidson et al. — IEEE IPDPS 2014">
              <div style={{fontSize:'11px',color:'#c9d1d9',lineHeight:'1.7'}}>
                <p>La dependencia entre iteraciones de Dijkstra limita su paralelismo directo. Davidson et al. propusieron relajación especulativa masivamente paralela en GPU con corrección posterior.</p>
                <div style={{background:'#0d1117',borderRadius:'6px',padding:'8px',fontFamily:'monospace',fontSize:'10px',color:'#6e7681'}}>
                  <div><span style={{color:'#ec4899'}}>GPU (redes sociales):</span> 7–20× speedup sobre CPU</div>
                  <div><span style={{color:'#ec4899'}}>CPU multinúcleo (viales):</span> CH supera a GPU (bajo grado medio, overhead PCI-e)</div>
                  <div><span style={{color:'#ec4899'}}>Grafos web:</span> Bellman-Ford asíncrono en Apache Spark</div>
                </div>
              </div>
            </ArtCard>
          </div>

          {/* Speedup chart */}
          <div style={{background:'#161b22',borderRadius:'8px',border:'1px solid #30363d',padding:'16px'}}>
            <div style={{color:'#e6edf3',fontWeight:'bold',marginBottom:'12px',fontSize:'13px'}}>Speedup comparativo — red continental ~10⁷ nodos (log scale)</div>
            {[['Dijkstra clásico',1,'#6e7681','Línea base · segundos'],['Dijkstra bidireccional',2,'#3b82f6','~2× · búsqueda paralela'],['ALT',15,'#f97316','~10–20× · landmarks'],['Contraction Hierarchies',1000,'#10b981','~10³× · milisegundos'],['Transit Node Routing',5000,'#06b6d4','~5–10× sobre CH · larga distancia'],['Hub Labeling',100000,'#8b5cf6','Submicroseg. · ~10⁵× · consultas estáticas']].map(([n,sp,c,d])=>(
              <div key={n} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                <div style={{width:'160px',fontSize:'10px',color:'#c9d1d9',flexShrink:0}}>{n}</div>
                <div style={{flex:1,background:'#0d1117',borderRadius:'4px',overflow:'hidden',height:'18px',position:'relative'}}>
                  <div style={{height:'100%',width:`${Math.min(100,Math.log10(sp+1)/5.2*100)}%`,background:c,display:'flex',alignItems:'center',paddingLeft:'6px',fontSize:'10px',fontWeight:'bold',color:'white',minWidth:'20px'}}>{sp>1?`${sp}×`:sp}</div>
                </div>
                <div style={{width:'200px',fontSize:'10px',color:'#6e7681'}}>{d}</div>
              </div>
            ))}
            <div style={{fontSize:'10px',color:'#6e7681',marginTop:'8px'}}>* Speedup aproximado basado en Bast et al. (2016). Varía según hardware y grafo específico.</div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* APPLICATIONS TAB                                      */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab==='applications' && (
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          <div>
            <h2 style={{color:'#e6edf3',fontSize:'16px',fontWeight:'bold',margin:'0 0 5px'}}>🌍 Aplicaciones reales de caminos mínimos</h2>
            <div style={{color:'#8b949e',fontSize:'11px',lineHeight:'1.6'}}>
              Abre el grafo de cada caso para observar cómo se modelan los nodos, las conexiones, los pesos y una ruta mínima de ejemplo.
            </div>
          </div>

          {APPLICATIONS.map(app=>(
            <ApplicationCard
              key={app.id}
              app={app}
              onLoad={()=>{
                const g=app.graphFactory();
                setGraph(g);
                setSrc(app.source);
                setTgt(app.target);
                setAlgo(app.editorAlgo);
                setTab('editor');
                setSteps([]);
                setResult(null);
                setSi(-1);
                setPlaying(false);
              }}
            />
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* BENCHMARK TAB                                         */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab==='benchmark' && (
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <h2 style={{color:'#e6edf3',fontSize:'16px',fontWeight:'bold',margin:0}}>📈 Benchmark de rendimiento</h2>
            <Btn onClick={runBenchmark} accent disabled={benchRunning}>{benchRunning?'⏳ Ejecutando...':'▶ Ejecutar benchmark'}</Btn>
          </div>

          <div style={{background:'#161b22',borderRadius:'8px',border:'1px solid #30363d',padding:'12px',fontSize:'11px',color:'#8b949e',lineHeight:'1.7'}}>
            <strong style={{color:'#c9d1d9'}}>Configuración:</strong> Grafos aleatorios con densidad ≈0.3, pesos uniformes en [1,12]. Tamaños: V=10, 50, 100, 500.
            Algoritmos comparados: Dijkstra Array (O(V²)), Dijkstra Heap (O((V+E)logV)), Bellman-Ford (O(VE)).
            Dijkstra Array se omite para V{'>'}200 para evitar saturación del hilo UI.
          </div>

          {benchData.length>0 && (
            <>
              <div style={{background:'#161b22',borderRadius:'8px',border:'1px solid #30363d',overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                  <thead><tr style={{background:'#0d1117'}}>
                    {['V','E','Algoritmo','Tiempo (ms)','Nodos vis.','Relajaciones','Aristas proc.'].map(h=>(
                      <th key={h} style={{padding:'8px 10px',textAlign:'right',color:'#6e7681',borderBottom:'1px solid #30363d',whiteSpace:'nowrap',':firstChild':{textAlign:'left'}}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {benchData.map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid #0d1117'}}>
                        <td style={{padding:'5px 10px',textAlign:'right',color:'#d29922',fontWeight:'bold'}}>{r.v}</td>
                        <td style={{padding:'5px 10px',textAlign:'right',color:'#8b949e'}}>{r.e||'—'}</td>
                        <td style={{padding:'5px 10px',textAlign:'right',color:ALGOS[r.aid]?.color}}>{r.name}</td>
                        {r.skip?<td colSpan={4} style={{padding:'5px 10px',textAlign:'center',color:'#6e7681',fontSize:'10px'}}>Omitido (O(V²) · demasiado lento para V={r.v})</td>:
                         r.err?<td colSpan={4} style={{padding:'5px 10px',color:'#f85149'}}>Error: {r.err}</td>:<>
                          <td style={{padding:'5px 10px',textAlign:'right',color:'#3fb950',fontFamily:'monospace'}}>{r.time}</td>
                          <td style={{padding:'5px 10px',textAlign:'right',color:'#58a6ff'}}>{r.visited}</td>
                          <td style={{padding:'5px 10px',textAlign:'right',color:'#bc8cff'}}>{r.relax}</td>
                          <td style={{padding:'5px 10px',textAlign:'right',color:'#f0883e'}}>{r.edgeProc}</td>
                        </>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Visual bars */}
              <div style={{background:'#161b22',borderRadius:'8px',border:'1px solid #30363d',padding:'16px'}}>
                <div style={{color:'#e6edf3',fontWeight:'bold',marginBottom:'12px',fontSize:'13px'}}>Nodos visitados vs tamaño del grafo</div>
                {['dijk-array','dijk-heap','bellman'].map(aid=>{
                  const data=benchData.filter(r=>r.aid===aid&&!r.skip&&!r.err);
                  if(!data.length)return null;
                  const mx=Math.max(...data.map(d=>+d.visited||0))||1;
                  return (
                    <div key={aid} style={{marginBottom:'16px'}}>
                      <div style={{fontSize:'11px',color:ALGOS[aid]?.color,marginBottom:'6px',fontWeight:'bold'}}>{ALGOS[aid]?.name} — {ALGOS[aid]?.time}</div>
                      <div style={{display:'flex',alignItems:'flex-end',gap:'8px',height:'80px'}}>
                        {data.map(d=>(
                          <div key={d.v} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
                            <div style={{fontSize:'9px',color:'#6e7681'}}>{d.visited}</div>
                            <div style={{width:'50px',background:ALGOS[aid]?.color,borderRadius:'3px 3px 0 0',opacity:0.85,height:`${Math.max(4,(+d.visited/mx)*64)}px`}}/>
                            <div style={{fontSize:'9px',color:'#6e7681'}}>V={d.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{background:'rgba(88,166,255,0.08)',border:'1px solid #1f6feb',borderRadius:'8px',padding:'12px',fontSize:'11px',color:'#79c0ff',lineHeight:'1.7'}}>
                <strong>Interpretación de resultados:</strong> Dijkstra Array tiene O(V²) operaciones de comparación — crece cuadráticamente con V. Dijkstra Heap tiene más inserciones al heap pero cada una es O(log V), lo que lo hace superior para grafos dispersos. Bellman-Ford procesa todas las aristas en cada iteración (hasta V-1 veces), por eso muestra mayor número de aristas procesadas. Los tiempos en ms en JS no son comparables con implementaciones C++/Rust en producción (factor ~50–200×).
              </div>
            </>
          )}
        </div>
      )}
      </div>

      {/* FOOTER */}
      <div style={{background:'#161b22',borderTop:'1px solid #30363d',padding:'12px 20px',textAlign:'center',color:'#6e7681',fontSize:'10px',marginTop:'20px'}}>
        <div>Laboratorio de Caminos Mínimos · UNSAAC · Facultad de Ingeniería Informática · Algoritmos Avanzados 2025</div>
        <div style={{marginTop:'4px'}}>Basado en: Dijkstra (1959) · Fredman-Tarjan (1987) · Goldberg-Harrelson (2005) · Geisberger et al. (2008) · Bast et al. (2007, 2016) · Abraham et al. (2012)</div>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================
const selStyle = {background:'#0d1117',color:'#e6edf3',border:'1px solid #30363d',borderRadius:'6px',padding:'3px 6px',fontSize:'11px',flex:1};

function ApplicationCard({app,onLoad}) {
  const [showGraph,setShowGraph]=useState(false);
  const [showCode,setShowCode]=useState(false);
  const [copied,setCopied]=useState(false);
  const graph=app.graphFactory();

  const copyCode=async()=>{
    try {
      await navigator.clipboard.writeText(app.code);
      setCopied(true);
      setTimeout(()=>setCopied(false),1600);
    } catch (error) {
      console.error('No se pudo copiar el código',error);
    }
  };

  return (
    <div style={{background:'#161b22',borderRadius:'8px',border:`1px solid ${app.color}55`,padding:'16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px',flexWrap:'wrap'}}>
        <span style={{fontSize:'28px'}}>{app.icon}</span>
        <div style={{flex:'1 1 260px'}}>
          <div style={{color:app.color,fontWeight:'bold',fontSize:'14px'}}>{app.title}</div>
          <div style={{color:'#6e7681',fontSize:'11px'}}>{app.sub}</div>
        </div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          <Btn onClick={()=>setShowGraph(v=>!v)} active={showGraph} small>
            {showGraph?'▾ Ocultar grafo':'▸ Ver grafo'}
          </Btn>
          <Btn onClick={()=>setShowCode(v=>!v)} active={showCode} small>
            {showCode?'▾ Ocultar código':'⌨ Ver código'}
          </Btn>
          <Btn onClick={onLoad} small>Cargar en editor →</Btn>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:'10px'}}>
        {[
          ['🎯 Problema',app.prob,'#c9d1d9'],
          ['🗺 Modelado como grafo',app.model,'#c9d1d9'],
          ['⚙ Algoritmo',app.alg,app.color],
          ['✅ ¿Por qué?',app.why,'#c9d1d9']
        ].map(([k,v,c])=>(
          <div key={k} style={{background:'#0d1117',borderRadius:'6px',padding:'10px',fontSize:'11px',lineHeight:'1.6'}}>
            <div style={{color:'#6e7681',fontWeight:'bold',marginBottom:'6px',fontSize:'10px'}}>{k}</div>
            <div style={{color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {showCode&&(
        <div style={{marginTop:'12px',background:'#0d1117',border:`1px solid ${app.color}66`,borderRadius:'8px',overflow:'hidden'}}>
          <div style={{padding:'9px 12px',borderBottom:'1px solid #30363d',display:'flex',justifyContent:'space-between',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
            <div>
              <div style={{color:app.color,fontWeight:'bold',fontSize:'12px'}}>{app.codeTitle}</div>
              <div style={{color:'#6e7681',fontSize:'10px',marginTop:'3px'}}>Ejemplo educativo que puedes explicar y ejecutar por separado.</div>
            </div>
            <button
              onClick={copyCode}
              style={{background:copied?'#238636':'#21262d',color:'#e6edf3',border:'1px solid #30363d',borderRadius:'6px',padding:'6px 10px',fontSize:'10px',cursor:'pointer'}}
            >
              {copied?'✓ Copiado':'Copiar código'}
            </button>
          </div>
          <pre style={{margin:0,padding:'14px',overflowX:'auto',maxHeight:'430px',fontSize:'11px',lineHeight:'1.55',color:'#c9d1d9',background:'#010409',tabSize:4}}>
            <code>{app.code}</code>
          </pre>
        </div>
      )}

      {showGraph&&(
        <div style={{marginTop:'12px',background:'#0d1117',border:'1px solid #30363d',borderRadius:'8px',overflow:'hidden'}}>
          <div style={{padding:'9px 12px',borderBottom:'1px solid #30363d',display:'flex',justifyContent:'space-between',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
            <div>
              <div style={{color:app.color,fontWeight:'bold',fontSize:'12px'}}>{app.graphTitle}</div>
              <div style={{color:'#6e7681',fontSize:'10px',marginTop:'3px'}}>{app.graphHelp}</div>
            </div>
            <div style={{color:'#8b949e',fontSize:'10px'}}>
              {Object.keys(graph.nodes).length} nodos · {Object.keys(graph.edges).length} aristas
            </div>
          </div>
          <MiniGraph id={app.id} graph={graph} source={app.source} target={app.target} color={app.color}/>
        </div>
      )}
    </div>
  );
}

function MiniGraph({id,graph,source,target,color}) {
  const nodes=Object.values(graph.nodes);
  const edges=Object.values(graph.edges);
  const width=720, height=300, padX=58, padY=46;

  if(!nodes.length) return null;

  const xs=nodes.map(n=>n.x), ys=nodes.map(n=>n.y);
  const minX=Math.min(...xs), maxX=Math.max(...xs);
  const minY=Math.min(...ys), maxY=Math.max(...ys);
  const rangeX=Math.max(1,maxX-minX), rangeY=Math.max(1,maxY-minY);
  const scale=Math.min((width-padX*2)/rangeX,(height-padY*2-22)/rangeY);
  const usedW=rangeX*scale, usedH=rangeY*scale;
  const offsetX=(width-usedW)/2;
  const offsetY=(height-22-usedH)/2;
  const pos={};
  nodes.forEach(n=>{
    pos[n.id]={x:offsetX+(n.x-minX)*scale,y:offsetY+(n.y-minY)*scale};
  });

  let route=[]; let distance=INF;
  try {
    const r=runDijkstraHeap(graph,source,target);
    route=r.path||[];
    distance=r.dist?.[target]??INF;
  } catch { route=[]; }

  const pathEdge=(e)=>{
    for(let i=0;i<route.length-1;i++) {
      if((e.from===route[i]&&e.to===route[i+1])||(!graph.directed&&e.from===route[i+1]&&e.to===route[i])) return true;
    }
    return false;
  };
  const patternId=`mini-grid-${id}`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{display:'block',width:'100%',height:'300px'}} role="img" aria-label={`Grafo de ${source} a ${target}`}>
        <defs>
          <pattern id={patternId} width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#161b22" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width={width} height={height} fill={`url(#${patternId})`}/>

        {edges.map(e=>{
          const a=pos[e.from], b=pos[e.to];
          if(!a||!b) return null;
          const active=pathEdge(e);
          const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
          return (
            <g key={e.id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active?'#10b981':'#4b5563'} strokeWidth={active?4:2} opacity={active?1:0.8}/>
              <rect x={mx-12} y={my-8} width={24} height={16} rx={4} fill="#161b22" stroke={active?'#10b981':'#30363d'}/>
              <text x={mx} y={my+4} textAnchor="middle" fontSize="10" fill={active?'#6ee7b7':'#8b949e'}>{e.weight}</text>
            </g>
          );
        })}

        {nodes.map(n=>{
          const p=pos[n.id];
          const isSource=n.id===source, isTarget=n.id===target;
          const label=n.label||n.id;
          const boxW=Math.max(34,Math.min(86,label.length*7+16));
          const fill=isSource?'#059669':isTarget?'#dc2626':color;
          return (
            <g key={n.id}>
              <rect x={p.x-boxW/2} y={p.y-16} width={boxW} height={32} rx={16} fill={fill} stroke={isSource?'#6ee7b7':isTarget?'#fca5a5':'#c9d1d9'} strokeWidth={isSource||isTarget?2.5:1.2}/>
              <text x={p.x} y={p.y+4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">{label}</text>
            </g>
          );
        })}

        <g transform={`translate(18,${height-18})`}>
          <circle cx="0" cy="0" r="6" fill="#059669"/><text x="10" y="4" fontSize="10" fill="#8b949e">origen</text>
          <circle cx="70" cy="0" r="6" fill="#dc2626"/><text x="80" y="4" fontSize="10" fill="#8b949e">destino</text>
          <line x1="145" y1="0" x2="173" y2="0" stroke="#10b981" strokeWidth="4"/><text x="181" y="4" fontSize="10" fill="#8b949e">camino mínimo</text>
        </g>
      </svg>
      <div style={{padding:'0 12px 10px',display:'flex',justifyContent:'space-between',gap:'10px',flexWrap:'wrap',fontSize:'10px'}}>
        <span style={{color:'#8b949e'}}>Ruta: <strong style={{color:'#c9d1d9'}}>{route.length?route.join(' → '):'sin ruta'}</strong></span>
        <span style={{color:'#8b949e'}}>Costo total: <strong style={{color:'#3fb950'}}>{distance===INF?'∞':distance.toFixed(1)}</strong></span>
      </div>
    </div>
  );
}

function Panel({title,children,accent}) {
  return (
    <div style={{background:'#161b22',borderRadius:'8px',border:`1px solid ${accent||'#30363d'}`,padding:'10px'}}>
      <div style={{color:'#8b949e',fontSize:'10px',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px',fontWeight:'bold'}}>{title}</div>
      {children}
    </div>
  );
}

function Btn({children,onClick,active,accent,full,small,style={},disabled}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small?'3px 8px':'5px 12px',
      fontSize: small?'11px':'12px',
      background: active?'#1f6feb': accent?'#1a7f37':'#21262d',
      color: active?'#58a6ff': accent?'#3fb950':'#c9d1d9',
      border: `1px solid ${active?'#1f6feb':accent?'#2ea043':'#30363d'}`,
      borderRadius:'6px',
      cursor: disabled?'not-allowed':'pointer',
      width: full?'100%':'auto',
      marginBottom: full?'3px':0,
      opacity: disabled?0.6:1,
      ...style
    }}>{children}</button>
  );
}

function Row({k,v,vc}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'2px 0',borderBottom:'1px solid #0d1117'}}>
      <span style={{color:'#8b949e'}}>{k}:</span>
      <span style={{color:vc||'#e6edf3',fontFamily:'monospace',fontWeight:'bold'}}>{v}</span>
    </div>
  );
}

function ArtCard({color,title,sub,badge,children}) {
  return (
    <div style={{background:'#161b22',borderRadius:'8px',border:`1px solid ${color}44`,padding:'16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
        <div style={{flex:1}}>
          <div style={{color,fontWeight:'bold',fontSize:'14px'}}>{title}</div>
          <div style={{color:'#6e7681',fontSize:'10px',marginTop:'2px'}}>{sub}</div>
        </div>
        {badge&&<span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'10px',background:'rgba(210,153,34,0.15)',color:'#d29922',border:'1px solid #d2922244'}}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}