import { useState, useEffect, useRef, useCallback } from 'react';
import { ALGOS, fmt, INF } from './algorithms.js';
import { APPLICATIONS, defaultGraph, genGrid, genRandom, genRoadNetwork, LABELS } from './graphData.js';
import { ApplicationCard, ArtCard, Btn, Panel, Row } from './uiComponents.jsx';

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
      setResult(r);
      setSteps(r.steps || []);
      setSi(-1);
      setPlaying(false);
    } catch (e) {
      console.error(e);
    }
  }, [graph, src, tgt, algo]);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setSi((prev) => {
          if (prev >= steps.length - 1) {
            setPlaying(false);
            return steps.length - 1;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, steps.length, speed]);

  const svgPt = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onSVGClick = (e) => {
    if (wasDragging) return;
    if (editMode === 'addNode') {
      const { x, y } = svgPt(e);
      const used = new Set(Object.keys(graph.nodes));
      const lb = LABELS.split('').find((c) => !used.has(c)) || `N${Object.keys(graph.nodes).length}`;
      setGraph((g) => ({ ...g, nodes: { ...g.nodes, [lb]: { id: lb, label: lb, x, y } } }));
    } else {
      setSelNode(null);
      setSelEdge(null);
    }
  };

  const onNodeClick = (e, nid) => {
    e.stopPropagation();
    if (wasDragging) return;
    if (editMode === 'select') {
      setSelNode(nid);
      setSelEdge(null);
    } else if (editMode === 'delNode') {
      setGraph((g) => {
        const { [nid]: _, ...nodes } = g.nodes;
        const edges = Object.fromEntries(Object.entries(g.edges).filter(([, edge]) => edge.from !== nid && edge.to !== nid));
        return { ...g, nodes, edges };
      });
      if (src === nid) setSrc(Object.keys(graph.nodes).find((n) => n !== nid) || '');
      if (tgt === nid) setTgt('');
    } else if (editMode === 'addEdge') {
      if (!edgeFrom) {
        setEdgeFrom(nid);
      } else if (edgeFrom !== nid) {
        const id = `e${Date.now()}`;
        setGraph((g) => ({ ...g, edges: { ...g.edges, [id]: { id, from: edgeFrom, to: nid, weight: edgeW } } }));
        setEdgeFrom(null);
      } else {
        setEdgeFrom(null);
      }
    } else if (editMode === 'setSrc') {
      setSrc(nid);
      setEditMode('select');
    } else if (editMode === 'setTgt') {
      setTgt(nid);
      setEditMode('select');
    }
  };

  const onEdgeClick = (e, eid) => {
    e.stopPropagation();
    if (editMode === 'select') {
      setSelEdge(eid);
      setSelNode(null);
    } else if (editMode === 'delEdge') {
      setGraph((g) => {
        const { [eid]: _, ...edges } = g.edges;
        return { ...g, edges };
      });
    }
  };

  const onNodeMD = (e, nid) => {
    if (editMode !== 'select') return;
    e.preventDefault();
    setDragNode(nid);
    setWasDragging(false);
  };

  const onSVGMM = (e) => {
    if (!dragNode) return;
    setWasDragging(true);
    const { x, y } = svgPt(e);
    setGraph((g) => ({ ...g, nodes: { ...g.nodes, [dragNode]: { ...g.nodes[dragNode], x, y } } }));
  };

  const onSVGMU = () => {
    setDragNode(null);
    setTimeout(() => setWasDragging(false), 50);
  };

  const nodeColor = (nid) => {
    if (!step) {
      if (nid === src) return '#059669';
      if (nid === tgt) return '#dc2626';
      return '#374151';
    }
    if (nid === step.current) return '#d97706';
    if (step.visitedB?.has(nid)) return '#7c3aed';
    if (step.visited?.has(nid)) return '#1d4ed8';
    if (step.frontier?.includes(nid)) return '#0891b2';
    if (step.landmarks?.includes(nid)) return '#ea580c';
    if (nid === src) return '#059669';
    if (nid === tgt) return '#dc2626';
    return '#374151';
  };

  const isOnPath = useCallback((e) => {
    if (!result?.path?.length) return false;
    const p = result.path;
    for (let i = 0; i < p.length - 1; i++) {
      if ((e.from === p[i] && e.to === p[i + 1]) || (!graph.directed && e.from === p[i + 1] && e.to === p[i])) return true;
    }
    return false;
  }, [result, graph.directed]);

  const edgeColor = (e) => {
    if (step?.relaxed?.some((r) => r.eid === e.id)) return '#f59e0b';
    if (isOnPath(e)) return '#10b981';
    return '#4b5563';
  };

  const edgeWidth = (e) => {
    if (step?.relaxed?.some((r) => r.eid === e.id)) return 2.5;
    if (isOnPath(e)) return 3.5;
    return 1.5;
  };

  const runComparison = () => {
    const res = {};
    ['dijk-array', 'dijk-heap', 'astar', 'bellman', 'floyd'].forEach((aid) => {
      const a = ALGOS[aid];
      try {
        const t0 = performance.now();
        const r = a.fn(graph, src, tgt || null);
        const t1 = performance.now();
        res[aid] = { time: (t1 - t0).toFixed(3), visited: r.ops?.visited || 0, relax: r.ops?.relax || 0, edgeProc: r.ops?.edgeProc || 0, pathDist: r.dist?.[tgt] ?? INF, ok: true };
      } catch (err) {
        res[aid] = { ok: false, err: err.message };
      }
    });
    setCmpResults(res);
  };

  const runBenchmark = async () => {
    setBenchRunning(true);
    setBenchData([]);
    const sizes = [10, 50, 100, 500];
    const bAlgos = ['dijk-array', 'dijk-heap', 'bellman'];
    const results = [];
    for (const v of sizes) {
      const g = genRandom(v, 0.3);
      const ns = Object.keys(g.nodes);
      const s = ns[0];
      const t = ns[ns.length - 1];
      for (const aid of bAlgos) {
        if (v > 200 && aid === 'dijk-array') {
          results.push({ v, e: Object.keys(g.edges).length, aid, name: ALGOS[aid].name, skip: true });
          continue;
        }
        await new Promise((r) => setTimeout(r, 0));
        try {
          const t0 = performance.now();
          const r = ALGOS[aid].fn(g, s, t);
          const t1 = performance.now();
          results.push({ v, e: Object.keys(g.edges).length, aid, name: ALGOS[aid].name, time: (t1 - t0).toFixed(2), visited: r.ops?.visited || 0, relax: r.ops?.relax || 0, edgeProc: r.ops?.edgeProc || 0 });
        } catch (err) {
          results.push({ v, e: Object.keys(g.edges).length, aid, name: ALGOS[aid].name, err: err.message });
        }
      }
    }
    setBenchData(results);
    setBenchRunning(false);
  };

  const ns = Object.values(graph.nodes);
  const es = Object.values(graph.edges);

  const TABS = [
    { id: 'editor', label: '🔬 Editor' },
    { id: 'compare', label: '📊 Comparar' },
    { id: 'complexity', label: '🧮 Complejidad' },
    { id: 'stateart', label: '🚀 Estado del arte' },
    { id: 'applications', label: '🌍 Aplicaciones' },
    { id: 'benchmark', label: '📈 Benchmark' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'ui-monospace,Cascadia Code,Menlo,monospace', fontSize: '13px' }}>
      <div style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#58a6ff' }}>🗺 Laboratorio de Caminos Mínimos</div>
          <div style={{ color: '#8b949e', fontSize: '11px' }}>UNSAAC · Algoritmos Avanzados 2025 · Dijkstra y variantes modernas</div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[['Exacta', '#238636', '#2ea043'], ['Demostrativa', '#9e6a03', '#d29922'], ['Pedagógica', '#553098', '#8957e5']].map(([lb, bg, fg]) => (
            <span key={lb} style={{ background: bg, color: fg, fontSize: '10px', padding: '2px 8px', borderRadius: '12px', border: `1px solid ${fg}` }}>{lb}</span>
          ))}
        </div>
      </div>

      <div style={{ background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', gap: '0', padding: '0 16px', overflowX: 'auto' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '10px 16px', fontSize: '12px', border: 'none', background: 'transparent', color: tab === t.id ? '#58a6ff' : '#8b949e', borderBottom: tab === t.id ? '2px solid #58a6ff' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: '16px', maxWidth: '1400px', margin: '0 auto' }}>
        {tab === 'editor' && (
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 220px', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Panel title="Algoritmo">
                <select value={algo} onChange={(e) => setAlgo(e.target.value)} style={{ width: '100%', background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d', borderRadius: '6px', padding: '4px 6px', fontSize: '11px', marginBottom: '6px' }}>
                  {Object.entries(ALGOS).map(([id, a]) => <option key={id} value={id}>{a.name}</option>)}
                </select>
                <div style={{ background: '#0d1117', borderRadius: '6px', padding: '8px', fontSize: '11px', lineHeight: '1.6', border: '1px solid #21262d' }}>
                  <div style={{ color: '#f0883e', fontWeight: 'bold' }}>{ALGOS[algo].time}</div>
                  <div style={{ color: '#bc8cff' }}>Espacio: {ALGOS[algo].space}</div>
                  <div style={{ color: ALGOS[algo].impl === 'Exacta' ? '#3fb950' : '#d29922', marginTop: '2px' }}>⚡ {ALGOS[algo].impl}</div>
                  <div style={{ color: '#8b949e', marginTop: '4px', fontSize: '10px', lineHeight: '1.4' }}>{ALGOS[algo].desc}</div>
                </div>
              </Panel>

              <Panel title="Origen / Destino">
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: '#3fb950', width: '44px', fontSize: '11px' }}>Origen:</span>
                  <select value={src} onChange={(e) => setSrc(e.target.value)} style={selStyle}>{Object.keys(graph.nodes).map((n) => <option key={n}>{n}</option>)}</select>
                  <Btn onClick={() => setEditMode('setSrc')} active={editMode === 'setSrc'} small>✏</Btn>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ color: '#f85149', width: '44px', fontSize: '11px' }}>Destino:</span>
                  <select value={tgt} onChange={(e) => setTgt(e.target.value)} style={selStyle}>
                    <option value="">— Todos —</option>
                    {Object.keys(graph.nodes).map((n) => <option key={n}>{n}</option>)}
                  </select>
                  <Btn onClick={() => setEditMode('setTgt')} active={editMode === 'setTgt'} small>✏</Btn>
                </div>
              </Panel>

              <Panel title="Control de ejecución">
                <Btn onClick={runAlgo} full accent>▶ Ejecutar</Btn>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px', margin: '6px 0' }}>
                  {[['⏮', '', () => { setSi(-1); setPlaying(false); }], ['◀', '', () => setSi((i) => Math.max(-1, i - 1))], [playing ? '⏸' : '▶', '', () => setPlaying((p) => !p)], ['▶|', '', () => setSi((i) => Math.min(steps.length - 1, i + 1))]].map(([lb, , fn]) => (
                    <Btn key={lb} onClick={fn} small>{lb}</Btn>
                  ))}
                </div>
                <div style={{ textAlign: 'center', color: '#8b949e', fontSize: '11px', marginBottom: '6px' }}>Paso {si + 1} / {steps.length}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#8b949e', fontSize: '10px' }}>Vel:</span>
                  <input type="range" min={100} max={2000} step={100} value={2100 - speed} onChange={(e) => setSpeed(2100 - +e.target.value)} style={{ flex: 1 }} />
                </div>
              </Panel>

              <Panel title="Herramientas de edición">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '6px' }}>
                  {[['select', '↖ Mover'], ['addNode', '➕ Nodo'], ['addEdge', '🔗 Arista'], ['delNode', '🗑 Nodo'], ['delEdge', '✂ Arista']].map(([m, lb]) => (
                    <Btn key={m} onClick={() => { setEditMode(m); setEdgeFrom(null); }} active={editMode === m} small>{lb}</Btn>
                  ))}
                  <Btn onClick={() => setGraph((g) => ({ ...g, directed: !g.directed }))} small>{graph.directed ? '→ Dirigido' : '↔ No dir.'}</Btn>
                </div>
                {editMode === 'addEdge' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                    <span style={{ color: '#8b949e' }}>Peso:</span>
                    <input type="number" value={edgeW} onChange={(e) => setEdgeW(+e.target.value || 1)} min="0.1" step="1" style={{ ...selStyle, width: '60px' }} />
                  </div>
                )}
                {edgeFrom && <div style={{ color: '#d29922', fontSize: '10px', marginTop: '4px' }}>Desde {edgeFrom} → elige destino</div>}
                {(editMode === 'setSrc' || editMode === 'setTgt') && <div style={{ color: '#58a6ff', fontSize: '10px', marginTop: '4px' }}>Clic en un nodo del canvas</div>}
              </Panel>

              <Panel title="Generar grafo">
                {[['📐 Ejemplo (Dijkstra)', () => { setGraph(defaultGraph()); setSrc('A'); setTgt('F'); setSteps([]); setResult(null); }], ['🏔 Red vial (Cusco)', () => { setGraph(genRoadNetwork()); setSrc('Cusco'); setTgt('Machu_Picchu'); setSteps([]); setResult(null); }], ['🎲 Aleatorio 8 nodos', () => { const g = genRandom(8, 0.4); setGraph(g); setSrc(Object.keys(g.nodes)[0] || 'A'); setTgt(''); setSteps([]); setResult(null); }], ['🎲 Aleatorio 14 nodos', () => { const g = genRandom(14, 0.3); const nodes = Object.keys(g.nodes); setGraph(g); setSrc(nodes[0]); setTgt(nodes[nodes.length - 1]); setSteps([]); setResult(null); }], ['▦ Malla 3×4', () => { setGraph(genGrid(3, 4)); setSrc('N0'); setTgt('N11'); setSteps([]); setResult(null); }]].map(([lb, fn]) => <Btn key={lb} onClick={fn} full small style={{ marginBottom: '3px', textAlign: 'left', paddingLeft: '8px' }}>{lb}</Btn>)}
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  <Btn small onClick={() => { const b = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'graph.json'; a.click(); }}>⬇ JSON</Btn>
                  <label style={{ flex: 1, fontSize: '11px', padding: '3px 8px', background: '#21262d', border: '1px solid #30363d', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', color: '#8b949e' }}>
                    ⬆ JSON<input type="file" accept=".json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { try { const g = JSON.parse(ev.target.result); setGraph(g); const nodes = Object.keys(g.nodes); setSrc(nodes[0] || ''); setTgt(nodes[nodes.length - 1] || ''); setSteps([]); setResult(null); } catch { /* empty */ } }; r.readAsText(f); }} />
                  </label>
                </div>
              </Panel>
            </div>

            <div style={{ background: '#161b22', borderRadius: '8px', border: '1px solid #30363d', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '6px 12px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#8b949e', fontSize: '11px' }}>
                <span>{ns.length} nodos · {es.length} aristas · {graph.directed ? 'Dirigido' : 'No dirigido'}</span>
                <span>{editMode === 'addNode' ? 'Clic en el canvas para agregar nodo' : editMode === 'addEdge' ? 'Clic en nodo origen → nodo destino' : editMode === 'delNode' ? 'Clic en nodo para eliminar' : editMode === 'delEdge' ? 'Clic en arista para eliminar' : editMode === 'setSrc' ? 'Clic para establecer origen' : editMode === 'setTgt' ? 'Clic para establecer destino' : 'Arrastra nodos para moverlos'}</span>
              </div>
              <svg ref={svgRef} style={{ flex: 1, width: '100%', height: '520px', cursor: editMode === 'addNode' ? 'crosshair' : 'default' }} onClick={onSVGClick} onMouseMove={onSVGMM} onMouseUp={onSVGMU} onMouseLeave={onSVGMU}>
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#21262d" strokeWidth="0.5" />
                  </pattern>
                  <marker id="arr" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto"><polygon points="0 0,8 3.5,0 7" fill="#4b5563" /></marker>
                  <marker id="arr-y" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto"><polygon points="0 0,8 3.5,0 7" fill="#f59e0b" /></marker>
                  <marker id="arr-g" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto"><polygon points="0 0,8 3.5,0 7" fill="#10b981" /></marker>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {es.map((e) => {
                  const f = graph.nodes[e.from];
                  const t = graph.nodes[e.to];
                  if (!f || !t) return null;
                  const dx = t.x - f.x;
                  const dy = t.y - f.y;
                  const len = Math.sqrt(dx * dx + dy * dy) || 1;
                  const col = edgeColor(e);
                  const w = edgeWidth(e);
                  const ox = (-dy / len) * 6;
                  const oy = (dx / len) * 6;
                  const x1 = f.x + ox;
                  const y1 = f.y + oy;
                  const x2 = t.x + ox;
                  const y2 = t.y + oy;
                  const ex = dx / len;
                  const ey = dy / len;
                  const x2s = x2 - ex * 19;
                  const y2s = y2 - ey * 19;
                  const mx = (x1 + x2s) / 2;
                  const my = (y1 + y2s) / 2;
                  const isPath = isOnPath(e);
                  const markerEnd = graph.directed ? (col === '#f59e0b' ? 'url(#arr-y)' : isPath ? 'url(#arr-g)' : 'url(#arr)') : 'none';
                  return (
                    <g key={e.id} onClick={(ev) => onEdgeClick(ev, e.id)} style={{ cursor: 'pointer' }}>
                      <line x1={x1} y1={y1} x2={graph.directed ? x2s : x2} y2={graph.directed ? y2s : y2} stroke={col} strokeWidth={w} markerEnd={markerEnd} opacity={si < 0 || isPath || col !== '#4b5563' ? 1 : 0.4} />
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={14} />
                      <rect x={mx - 11} y={my - 7} width={22} height={13} fill="#0d1117" rx={3} opacity={0.85} />
                      <text x={mx} y={my + 4} textAnchor="middle" fontSize="9" fill={isPath ? '#6ee7b7' : '#6e7681'}>{e.weight}</text>
                    </g>
                  );
                })}

                {ns.map((nd) => {
                  const col = nodeColor(nd.id);
                  const d = step?.dist?.[nd.id];
                  const isLM = step?.landmarks?.includes(nd.id);
                  return (
                    <g key={nd.id} onClick={(ev) => onNodeClick(ev, nd.id)} onMouseDown={(ev) => onNodeMD(ev, nd.id)} style={{ cursor: editMode === 'select' ? 'grab' : 'pointer' }}>
                      {isLM && <circle cx={nd.x} cy={nd.y} r={26} fill="none" stroke="#f97316" strokeWidth={1.5} strokeDasharray="5 3" />}
                      <circle cx={nd.x} cy={nd.y} r={18} fill={col} stroke={selNode === nd.id ? '#fff' : nd.id === src ? '#34d399' : nd.id === tgt ? '#fca5a5' : '#30363d'} strokeWidth={selNode === nd.id ? 2.5 : 1.5} />
                      <text x={nd.x} y={nd.y + 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">{nd.label}</text>
                      {d !== undefined && d !== INF && <text x={nd.x} y={nd.y + 31} textAnchor="middle" fontSize="9" fill="#58a6ff">{d.toFixed(1)}</text>}
                    </g>
                  );
                })}

                {[['#059669', 'Origen'], ['#dc2626', 'Destino'], ['#d97706', 'Actual'], ['#1d4ed8', 'Visitado'], ['#7c3aed', 'Visit.Bwd'], ['#0891b2', 'Frontera'], ['#ea580c', 'Landmark']].map(([col, lb], i) => (
                  <g key={lb} transform={`translate(8,${8 + i * 17})`}>
                    <circle cx={7} cy={7} r={5} fill={col} />
                    <text x={16} y={11} fontSize="9" fill="#6e7681">{lb}</text>
                  </g>
                ))}
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Panel title="Paso actual">
                {step ? (
                  <>
                    <div style={{ background: '#0d1117', borderRadius: '6px', padding: '8px', color: '#d29922', fontSize: '11px', lineHeight: '1.5', marginBottom: '8px', border: '1px solid #30363d' }}>{step.msg}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                      {[['Visitados', step.visited?.size || 0, '#58a6ff'], ['Relajaciones', step.relax || 0, '#3fb950'], ['Operaciones', step.ops || 0, '#d29922'], ['Aristas proc.', step.edgeProc || 0, '#bc8cff']].map(([lb, v, c]) => (
                        <div key={lb} style={{ background: '#0d1117', borderRadius: '6px', padding: '6px', border: '1px solid #21262d', textAlign: 'center' }}>
                          <div style={{ color: '#6e7681', fontSize: '10px' }}>{lb}</div>
                          <div style={{ color: c, fontWeight: 'bold', fontSize: '16px' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div style={{ color: '#6e7681', fontSize: '11px' }}>Ejecuta un algoritmo para ver los pasos de ejecución.</div>}
              </Panel>

              <Panel title="Distancias tentativas">
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead><tr style={{ borderBottom: '1px solid #21262d' }}>{['Nodo', 'Dist', 'Est'].map((h) => <th key={h} style={{ textAlign: h === 'Dist' || h === 'Est' ? 'right' : 'left', padding: '2px 4px', color: '#6e7681' }}>{h}</th>)}</tr></thead>
                    <tbody>{Object.keys(graph.nodes).map((nid) => {
                      const d = step?.dist?.[nid] ?? result?.dist?.[nid];
                      const isCur = step?.current === nid;
                      const isVis = step?.visited?.has(nid);
                      return (
                        <tr key={nid} style={{ borderBottom: '1px solid #161b22', background: isCur ? 'rgba(217,119,6,0.1)' : 'transparent' }}>
                          <td style={{ padding: '2px 4px', color: nid === src ? '#3fb950' : nid === tgt ? '#f85149' : '#e6edf3', fontWeight: 'bold' }}>{nid}</td>
                          <td style={{ textAlign: 'right', padding: '2px 4px', color: d === undefined || d === INF ? '#30363d' : '#58a6ff', fontWeight: 'bold' }}>{d === undefined ? '—' : fmt(d)}</td>
                          <td style={{ textAlign: 'right', padding: '2px 4px' }}>{isCur ? <span style={{ color: '#d29922' }}>●</span> : isVis ? <span style={{ color: '#3fb950' }}>✓</span> : d < INF ? <span style={{ color: '#58a6ff' }}>○</span> : <span style={{ color: '#21262d' }}>–</span>}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              </Panel>

              {result && si === steps.length - 1 && (
                <Panel title="Resultado final" accent="#2ea043">
                  {result.negCycle && <div style={{ color: '#f85149', fontSize: '11px', marginBottom: '6px' }}>⚠️ Ciclo negativo detectado</div>}
                  {tgt && result.path?.length > 0 && <div style={{ fontSize: '11px', marginBottom: '4px' }}><span style={{ color: '#6e7681' }}>Camino: </span><span style={{ color: '#3fb950', fontWeight: 'bold' }}>{result.path.join(' → ')}</span></div>}
                  {tgt && <div style={{ fontSize: '11px', marginBottom: '4px' }}><span style={{ color: '#6e7681' }}>Costo: </span><span style={{ color: '#d29922', fontWeight: 'bold' }}>{result.dist?.[tgt] === INF ? 'No alcanzable' : fmt(result.dist?.[tgt])}</span></div>}
                  <div style={{ color: '#6e7681', fontSize: '10px', marginTop: '6px', borderTop: '1px solid #21262d', paddingTop: '6px' }}>
                    <div>Nodos visitados: {result.ops?.visited}</div>
                    <div>Relajaciones: {result.ops?.relax}</div>
                    <div>Aristas procesadas: {result.ops?.edgeProc}</div>
                  </div>
                </Panel>
              )}

              {selEdge && graph.edges[selEdge] && (
                <Panel title="Arista seleccionada" accent="#d29922">
                  <div style={{ fontSize: '11px', color: '#6e7681', marginBottom: '6px' }}>{graph.edges[selEdge].from} → {graph.edges[selEdge].to}</div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: '#6e7681', fontSize: '11px' }}>Peso:</span>
                    <input type="number" value={graph.edges[selEdge].weight} onChange={(e) => setGraph((g) => ({ ...g, edges: { ...g.edges, [selEdge]: { ...g.edges[selEdge], weight: parseFloat(e.target.value) || 1 } } }))} style={{ ...selStyle, width: '70px' }} min="0.1" step="1" />
                  </div>
                  <Btn onClick={() => { setGraph((g) => { const { [selEdge]: _, ...edges } = g.edges; return { ...g, edges }; }); setSelEdge(null); }} full small style={{ color: '#f85149', borderColor: '#f85149' }}>🗑 Eliminar arista</Btn>
                </Panel>
              )}
            </div>
          </div>
        )}

        {tab === 'compare' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ color: '#e6edf3', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Comparación de algoritmos</h2>
              <Btn onClick={runComparison} accent>▶ Comparar en grafo actual</Btn>
            </div>
            <div style={{ color: '#8b949e', fontSize: '11px' }}>Grafo actual: {Object.keys(graph.nodes).length} nodos, {Object.keys(graph.edges).length} aristas · Origen: {src} → Destino: {tgt || 'todos'}</div>

            {Object.keys(cmpResults).length > 0 && (
              <div style={{ overflowX: 'auto', background: '#161b22', borderRadius: '8px', border: '1px solid #30363d' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead><tr style={{ background: '#0d1117' }}>{['Algoritmo', 'Tiempo (ms)', 'Nodos vis.', 'Relajaciones', 'Aristas proc.', 'Distancia mín.', 'W<0', 'APSP'].map((h) => <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Algoritmo' ? 'left' : 'right', color: '#6e7681', borderBottom: '1px solid #30363d', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {Object.entries(cmpResults).map(([aid, r]) => {
                      const a = ALGOS[aid]; if (!a) return null;
                      if (!r.ok) return <tr key={aid}><td style={{ padding: '6px 10px', color: a.color }}>{a.name}</td><td colSpan={7} style={{ padding: '6px 10px', color: '#f85149' }}>Error: {r.err}</td></tr>;
                      return (
                        <tr key={aid} style={{ borderBottom: '1px solid #21262d' }}>
                          <td style={{ padding: '6px 10px' }}><div style={{ color: a.color, fontWeight: 'bold' }}>{a.name}</div><div style={{ color: '#6e7681', fontSize: '10px' }}>{a.time}</div></td>
                          <td style={{ textAlign: 'right', padding: '6px 10px', color: '#d29922', fontFamily: 'monospace' }}>{r.time}</td>
                          <td style={{ textAlign: 'right', padding: '6px 10px', color: '#58a6ff' }}>{r.visited}</td>
                          <td style={{ textAlign: 'right', padding: '6px 10px', color: '#3fb950' }}>{r.relax}</td>
                          <td style={{ textAlign: 'right', padding: '6px 10px', color: '#bc8cff' }}>{r.edgeProc}</td>
                          <td style={{ textAlign: 'right', padding: '6px 10px', color: '#58a6ff', fontWeight: 'bold' }}>{r.pathDist === INF ? '∞' : fmt(r.pathDist)}</td>
                          <td style={{ textAlign: 'right', padding: '6px 10px' }}>{a.negW ? '✅' : '❌'}</td>
                          <td style={{ textAlign: 'right', padding: '6px 10px' }}>{a.apsp ? '✅' : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ background: '#161b22', borderRadius: '8px', border: '1px solid #30363d', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #30363d', color: '#e6edf3', fontWeight: 'bold', fontSize: '13px' }}>Tabla de clasificación de implementaciones</div>
              <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead><tr style={{ background: '#0d1117' }}>{['Algoritmo', 'Complejidad T', 'Espacio', 'Tipo', 'Implementación', 'Pesos neg.', 'Caso de uso'].map((h) => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#6e7681', borderBottom: '1px solid #30363d', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {[['Dijkstra Array', 'O(V²)', 'O(V)', 'SSSP', 'Exacta', false, 'Grafos densos, m≈V²'], ['Dijkstra Heap', 'O((V+E)logV)', 'O(V)', 'SSSP', 'Exacta', false, 'Estándar de producción'], ['Dijkstra Fibonacci', 'O(E+V logV)', 'O(V)', 'SSSP', 'Exacta*', false, 'Óptimo teórico grafos densos'], ['Dijkstra Bidir.', '≈O((V+E)logV)/2', 'O(V)', 'Punto-punto', 'Exacta', false, 'Consultas origen-destino'], ['A*', 'O((V+E)logV)*', 'O(V)', 'SSSP', 'Exacta', false, 'Grafos con coordenadas'], ['ALT', 'O((V+E)logV)*', 'O(k·V)', 'SSSP', 'Demostrativa', false, 'Redes viales (10-20× speedup)'], ['Bellman-Ford', 'O(V·E)', 'O(V)', 'SSSP', 'Exacta', true, 'Pesos negativos, detección ciclos'], ['Floyd-Warshall', 'O(V³)', 'O(V²)', 'APSP', 'Exacta', true, 'Todos los pares, n≲500'], ['Cont. Hierarchies', 'Preproceso O(V logV)', 'O(V+E+sh.)', 'SSSP', 'Pedagógica', false, 'Redes viales, 10³-10⁴× speedup'], ['Hub Labeling', 'Consulta O(|F|)', 'O(n√m)', 'SSSP', 'Pedagógica', false, 'Submicroseg., consultas estáticas'], ['Transit Node Routing', 'Constante (larga dist.)', 'O(|T|²)', 'SSSP', 'Pedagógica', false, 'Rutas largas, 5-10× sobre CH']].map(([n, t, s, ty, im, neg, use], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #0d1117' }}>
                      <td style={{ padding: '5px 10px', color: '#e6edf3', fontWeight: 'bold' }}>{n}</td>
                      <td style={{ padding: '5px 10px', color: '#f0883e', fontFamily: 'monospace' }}>{t}</td>
                      <td style={{ padding: '5px 10px', color: '#bc8cff', fontFamily: 'monospace' }}>{s}</td>
                      <td style={{ padding: '5px 10px', color: '#8b949e' }}>{ty}</td>
                      <td style={{ padding: '5px 10px', color: im === 'Exacta' ? '#3fb950' : im === 'Demostrativa' ? '#d29922' : '#8957e5' }}>{im}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center' }}>{neg ? '✅' : '❌'}</td>
                      <td style={{ padding: '5px 10px', color: '#8b949e' }}>{use}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          </div>
        )}

        {tab === 'complexity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ color: '#e6edf3', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>🧮 Laboratorio de complejidad computacional</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '10px' }}>
              {Object.entries(ALGOS).map(([id, a]) => (
                <div key={id} style={{ background: '#161b22', borderRadius: '8px', border: '1px solid #30363d', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                    <div style={{ color: '#e6edf3', fontWeight: 'bold', flex: 1, fontSize: '12px' }}>{a.name}</div>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: a.impl === 'Exacta' ? 'rgba(46,160,67,0.2)' : a.impl === 'Exacta*' ? 'rgba(88,166,255,0.2)' : 'rgba(210,153,34,0.2)', color: a.impl === 'Exacta' ? '#3fb950' : a.impl === 'Exacta*' ? '#58a6ff' : '#d29922' }}>{a.impl}</span>
                  </div>
                  <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Row k="Tiempo" v={a.time} vc="#f0883e" />
                    <Row k="Espacio" v={a.space} vc="#bc8cff" />
                    <Row k="Pesos neg." v={a.negW ? '✅ Sí' : '❌ No'} vc={a.negW ? '#3fb950' : '#f85149'} />
                    <Row k="Todos pares" v={a.apsp ? '✅ Sí' : '— No'} vc={a.apsp ? '#3fb950' : '#6e7681'} />
                    <div style={{ marginTop: '6px', background: '#0d1117', borderRadius: '6px', padding: '8px', color: '#8b949e', lineHeight: '1.5', fontSize: '10px' }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#161b22', borderRadius: '8px', border: '1px solid #30363d', padding: '16px' }}>
              <div style={{ color: '#e6edf3', fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>Técnicas avanzadas — análisis teórico</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '12px' }}>
                {[{ title: 'Contraction Hierarchies', color: '#f97316', impl: 'Pedagógica', rows: [['Preproceso', 'O(V log V) – O(V√V)'], ['Consulta', 'O(V log V), ms en práctica'], ['Almacenamiento', 'O(V + E + shortcuts)'], ['Speedup', '10³–10⁴× vs Dijkstra'], ['Variante', 'CCH: actualiza pesos sin rejerarquizar']] }, { title: 'Hub Labeling', color: '#8b5cf6', impl: 'Pedagógica', rows: [['Construcción', 'O(V² log V + VE)'], ['Consulta', 'O(|F(s)|+|F(t)|) ≈ submicros.'], ['Memoria', 'O(n√m) — decenas de GB nacional'], ['Speedup', '100–1000× sobre CH'], ['Limitación', 'Actualizaciones dinámicas costosas']] }, { title: 'Transit Node Routing', color: '#06b6d4', impl: 'Pedagógica', rows: [['Preproceso', 'O(|T|² + V·|A|)'], ['Consulta', 'O(|A(s)|·|A(t)|) ≈ microseg.'], ['Almacenamiento', 'O(|T|² + V·|A|)'], ['Speedup', '5–10× sobre CH (rutas largas)'], ['Limitación', 'Solo distancias suficientemente largas']] }].map(({ title, color, impl, rows }) => (
                  <div key={title} style={{ background: '#0d1117', borderRadius: '8px', padding: '12px', border: `1px solid ${color}33` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ color, fontWeight: 'bold', fontSize: '12px' }}>{title}</div>
                      <span style={{ fontSize: '10px', color: '#d29922', background: 'rgba(210,153,34,0.15)', padding: '2px 6px', borderRadius: '8px' }}>{impl}</span>
                    </div>
                    {rows.map(([k, v]) => <Row key={k} k={k} v={v} vc="#c9d1d9" />)}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'rgba(88,166,255,0.08)', border: '1px solid #1f6feb', borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#79c0ff', lineHeight: '1.6' }}>
              <strong>Referencia fundamental:</strong> Fredman y Tarjan (1987) demostraron que el Fibonacci heap alcanza la cota inferior teórica Ω(m+n log n) bajo el modelo de comparaciones. En grafos densos (m=Θ(n²)), Dijkstra Array y Fibonacci Heap coinciden asintóticamente en O(n²). Para redes viales reales con grado medio d̄≈3, el Binary Heap supera al Fibonacci Heap en la práctica por su mejor localidad de caché y constantes más bajas de implementación [Bast et al., 2016].
            </div>
          </div>
        )}

        {tab === 'stateart' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ color: '#e6edf3', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>🚀 Estado del arte en caminos mínimos</h2>
            <div style={{ background: 'rgba(210,153,34,0.1)', border: '1px solid #d29922', borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#e3b341', lineHeight: '1.5' }}>
              <strong>📌 Honestidad académica:</strong> CH, HL y TNR son demasiado complejos para implementación completa en frontend. Se presentan con simulaciones pedagógicas que ilustran los conceptos clave. Las métricas son aproximadas.
            </div>
            <ArtCard color="#f97316" title="Contraction Hierarchies (CH)" sub="Geisberger, Sanders, Schultes, Delling — WEA 2008 · Springer LNCS 5038" badge="Pedagógica">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
                <div style={{ lineHeight: '1.7', color: '#c9d1d9' }}>
                  <p><strong style={{ color: '#f97316' }}>Idea central:</strong> se asigna un rango (rank) a cada nodo por importancia. Los nodos de menor rango se contraen primero, insertando aristas de atajo (shortcuts) ⟨u,v,w⟩ cuando el camino mínimo entre dos vecinos u y v pasa solo por nodos ya contraídos.</p>
                  <p><strong style={{ color: '#f97316' }}>Propiedad clave (rank-monotone path):</strong> en cualquier camino mínimo s⇝t, los rangos primero suben y luego bajan. Esto permite buscar hacia adelante (rank creciente desde s) y hacia atrás (rank decreciente desde t) simultáneamente.</p>
                  <p><strong style={{ color: '#f97316' }}>Speedup empírico:</strong> 10³–10⁴× sobre Dijkstra en redes continentales. OSRM (motor de OpenStreetMap) implementa CH completo y es código abierto auditado públicamente.</p>
                </div>
                <div style={{ background: '#0d1117', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '10px', color: '#c9d1d9', lineHeight: '1.8' }}>
                  <div style={{ color: '#f97316', marginBottom: '6px', fontWeight: 'bold' }}>Pseudocódigo de preprocesamiento:</div>
                  <pre style={{ margin: 0, overflow: 'auto', color: '#8b949e' }}>{`Para v en orden rank[v] ascendente:
                    Marcar v como contraído
                    Para cada par (u, w) vecinos de v:
                        Si camino_min(u,w) pasa por v:
                        Insertar shortcut u→w
                        con peso(u,v) + peso(v,w)

                    Búsqueda CH:
                    Dijkstra_fwd(s): solo nodos rank >rank[actual]
                    Dijkstra_bwd(t): solo nodos rank >rank[actual]
                    Combinar en nodo de encuentro de mayor rank`}</pre>
                  <div style={{ marginTop: '8px', color: '#6e7681' }}>Preproceso: O(V log V)–O(V√V)<br />Consulta práctica: milisegundos en redes nacionales</div>
                </div>
              </div>
            </ArtCard>

            <ArtCard color="#8b5cf6" title="Hub Labeling (HL)" sub="Abraham, Delling, Goldberg, Werneck — ESA 2012 · Springer LNCS 7501" badge="Pedagógica">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
                <div style={{ lineHeight: '1.7', color: '#c9d1d9' }}>
                  <p><strong style={{ color: '#8b5cf6' }}>Concepto:</strong> a cada nodo v se le asigna un conjunto de hubs F(v) tal que para todo par (s,t) existe un hub h ∈ F(s)∩F(t) que pertenece al camino mínimo s⇝t (propiedad cover).</p>
                  <p><strong style={{ color: '#8b5cf6' }}>Consulta:</strong> d(s,t) = min<sub>h∈F(s)∩F(t)</sub> {'{'}d(s,h) + d(h,t){'}'}</p>
                  <p><strong style={{ color: '#8b5cf6' }}>Velocidad:</strong> submicrosegundo en redes nacionales. El método más rápido para consultas estáticas punto-a-punto.</p>
                  <p><strong style={{ color: '#8b5cf6' }}>Costo:</strong> construcción O(V² log V + VE). Memoria O(n√m): decenas de GB para red nacional completa.</p>
                </div>
                <div style={{ background: '#0d1117', borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#c9d1d9', lineHeight: '1.7' }}>
                  <div style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '6px' }}>Ejemplo ilustrativo (red vial):</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8b949e' }}>
                    <div>F(Madrid) = {'{'}Madrid, BCN, Valencia, ...{'}'}</div>
                    <div>F(Sevilla) = {'{'}Sevilla, Madrid, Córdoba, ...{'}'}</div>
                    <div style={{ marginTop: '6px', color: '#bc8cff' }}>F(Madrid) ∩ F(Sevilla) = {'{'}Madrid{'}'}</div>
                    <div style={{ marginTop: '6px' }}>d(Madrid→Sevilla) = d(M,M) + d(M,Sevilla)</div>
                  </div>
                  <div style={{ marginTop: '10px', color: '#6e7681', fontSize: '10px' }}>El hub en el camino mínimo garantiza exactitud sin explorar el grafo en cada consulta. Sensible a actualizaciones dinámicas de pesos.</div>
                </div>
              </div>
            </ArtCard>

            <ArtCard color="#06b6d4" title="Transit Node Routing (TNR)" sub="Bast, Funke, Matijevic, Sanders, Schultes — ALENEX 2007 · SIAM" badge="Pedagógica">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
                <div style={{ lineHeight: '1.7', color: '#c9d1d9' }}>
                  <p><strong style={{ color: '#06b6d4' }}>Observación:</strong> en redes viales, la mayoría de rutas largas pasan por un conjunto pequeño T de nodos de tránsito (autopistas, intercambios).</p>
                  <p><strong style={{ color: '#06b6d4' }}>Precálculo:</strong> tabla D[τᵢ][τⱼ] para todo par en T×T, y access nodes A(v)⊂T (tránsitos más cercanos a v).</p>
                  <p><strong style={{ color: '#06b6d4' }}>Consulta (larga distancia):</strong><br />d(s,t) = min<sub>τᵢ∈A(s), τⱼ∈A(t)</sub> {'{'}d(s,τᵢ) + D[τᵢ][τⱼ] + d(τⱼ,t){'}'}</p>
                  <p><strong style={{ color: '#06b6d4' }}>Velocidad:</strong> 5–10× más rápido que CH. Microsegundos para rutas largas. Limitado a rutas "suficientemente largas".</p>
                </div>
                <div style={{ background: '#0d1117', borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#c9d1d9', lineHeight: '1.7' }}>
                  <div style={{ color: '#06b6d4', fontWeight: 'bold', marginBottom: '8px' }}>Metáfora del aeropuerto:</div>
                  <p style={{ color: '#8b949e', fontSize: '10px' }}>Es como viajar en avión: desde tu casa hasta el aeropuerto más cercano (access nodes), luego vuelo entre aeropuertos (tabla D[τᵢ][τⱼ]), luego del aeropuerto a tu destino. Hay ~1000 "aeropuertos" en Europa pero millones de casas.</p>
                  <div style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '10px', color: '#6e7681' }}>
                    <div>|T| típico: 1,000–10,000 nodos</div>
                    <div>|A(v)| típico: 5–20 access nodes</div>
                    <div>Complejidad consulta: O(|A(s)|·|A(t)|)</div>
                  </div>
                </div>
              </div>
            </ArtCard>
          </div>
        )}

        {tab === 'applications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ color: '#e6edf3', fontSize: '16px', fontWeight: 'bold', margin: '0 0 5px' }}>🌍 Aplicaciones reales de caminos mínimos</h2>
              <div style={{ color: '#8b949e', fontSize: '11px', lineHeight: '1.6' }}>Abre el grafo de cada caso para observar cómo se modelan los nodos, las conexiones, los pesos y una ruta mínima de ejemplo.</div>
            </div>
            {APPLICATIONS.map((app) => <ApplicationCard key={app.id} app={app} onLoad={() => { const g = app.graphFactory(); setGraph(g); setSrc(app.source); setTgt(app.target); setAlgo(app.editorAlgo); setTab('editor'); setSteps([]); setResult(null); setSi(-1); setPlaying(false); }} />)}
          </div>
        )}

        {tab === 'benchmark' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ color: '#e6edf3', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>📈 Benchmark de rendimiento</h2>
              <Btn onClick={runBenchmark} accent disabled={benchRunning}>{benchRunning ? '⏳ Ejecutando...' : '▶ Ejecutar benchmark'}</Btn>
            </div>
            <div style={{ background: '#161b22', borderRadius: '8px', border: '1px solid #30363d', padding: '12px', fontSize: '11px', color: '#8b949e', lineHeight: '1.7' }}>
              <strong style={{ color: '#c9d1d9' }}>Configuración:</strong> Grafos aleatorios con densidad ≈0.3, pesos uniformes en [1,12]. Tamaños: V=10, 50, 100, 500. Algoritmos comparados: Dijkstra Array (O(V²)), Dijkstra Heap (O((V+E)logV)), Bellman-Ford (O(VE)). Dijkstra Array se omite para V&gt;200 para evitar saturación del hilo UI.
            </div>
            {benchData.length > 0 && (
              <>
                <div style={{ background: '#161b22', borderRadius: '8px', border: '1px solid #30363d', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead><tr style={{ background: '#0d1117' }}>{['V', 'E', 'Algoritmo', 'Tiempo (ms)', 'Nodos vis.', 'Relajaciones', 'Aristas proc.'].map((h) => <th key={h} style={{ padding: '8px 10px', textAlign: 'right', color: '#6e7681', borderBottom: '1px solid #30363d', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {benchData.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #0d1117' }}>
                          <td style={{ padding: '5px 10px', textAlign: 'right', color: '#d29922', fontWeight: 'bold' }}>{r.v}</td>
                          <td style={{ padding: '5px 10px', textAlign: 'right', color: '#8b949e' }}>{r.e || '—'}</td>
                          <td style={{ padding: '5px 10px', textAlign: 'right', color: ALGOS[r.aid]?.color }}>{r.name}</td>
                          {r.skip ? <td colSpan={4} style={{ padding: '5px 10px', textAlign: 'center', color: '#6e7681', fontSize: '10px' }}>Omitido (O(V²) · demasiado lento para V={r.v})</td> : r.err ? <td colSpan={4} style={{ padding: '5px 10px', color: '#f85149' }}>Error: {r.err}</td> : <>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: '#3fb950', fontFamily: 'monospace' }}>{r.time}</td>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: '#58a6ff' }}>{r.visited}</td>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: '#bc8cff' }}>{r.relax}</td>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: '#f0883e' }}>{r.edgeProc}</td>
                          </>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ background: '#161b22', borderRadius: '8px', border: '1px solid #30363d', padding: '16px' }}>
                  <div style={{ color: '#e6edf3', fontWeight: 'bold', marginBottom: '12px', fontSize: '13px' }}>Nodos visitados vs tamaño del grafo</div>
                  {['dijk-array', 'dijk-heap', 'bellman'].map((aid) => {
                    const data = benchData.filter((r) => r.aid === aid && !r.skip && !r.err);
                    if (!data.length) return null;
                    const mx = Math.max(...data.map((d) => +d.visited || 0)) || 1;
                    return (
                      <div key={aid} style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '11px', color: ALGOS[aid]?.color, marginBottom: '6px', fontWeight: 'bold' }}>{ALGOS[aid]?.name} — {ALGOS[aid]?.time}</div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
                          {data.map((d) => (
                            <div key={d.v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                              <div style={{ fontSize: '9px', color: '#6e7681' }}>{d.visited}</div>
                              <div style={{ width: '50px', background: ALGOS[aid]?.color, borderRadius: '3px 3px 0 0', opacity: 0.85, height: `${Math.max(4, (+d.visited / mx) * 64)}px` }} />
                              <div style={{ fontSize: '9px', color: '#6e7681' }}>V={d.v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ background: 'rgba(88,166,255,0.08)', border: '1px solid #1f6feb', borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#79c0ff', lineHeight: '1.7' }}>
                  <strong>Interpretación de resultados:</strong> Dijkstra Array tiene O(V²) operaciones de comparación — crece cuadráticamente con V. Dijkstra Heap tiene más inserciones al heap pero cada una es O(log V), lo que lo hace superior para grafos dispersos. Bellman-Ford procesa todas las aristas en cada iteración (hasta V-1 veces), por eso muestra mayor número de aristas procesadas. Los tiempos en ms en JS no son comparables con implementaciones C++/Rust en producción (factor ~50–200×).
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ background: '#161b22', borderTop: '1px solid #30363d', padding: '12px 20px', textAlign: 'center', color: '#6e7681', fontSize: '10px', marginTop: '20px' }}>
        <div>Laboratorio de Caminos Mínimos · UNSAAC · Facultad de Ingeniería Informática · Algoritmos Avanzados 2025</div>
        <div style={{ marginTop: '4px' }}>Basado en: Dijkstra (1959) · Fredman-Tarjan (1987) · Goldberg-Harrelson (2005) · Geisberger et al. (2008) · Bast et al. (2007, 2016) · Abraham et al. (2012)</div>
      </div>
    </div>
  );
}

const selStyle = { background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d', borderRadius: '6px', padding: '3px 6px', fontSize: '11px', flex: 1 };
