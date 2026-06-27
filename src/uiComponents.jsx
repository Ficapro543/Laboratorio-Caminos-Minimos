import { useState } from 'react';

function Panel({ title, children, accent }) {
  return (
    <div style={{ background: '#161b22', borderRadius: '8px', border: `1px solid ${accent || '#30363d'}`, padding: '10px' }}>
      <div style={{ color: '#8b949e', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 'bold' }}>{title}</div>
      {children}
    </div>
  );
}

function Btn({ children, onClick, active, accent, full, small, style = {}, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '3px 8px' : '5px 12px',
      fontSize: small ? '11px' : '12px',
      background: active ? '#1f6feb' : accent ? '#1a7f37' : '#21262d',
      color: active ? '#58a6ff' : accent ? '#3fb950' : '#c9d1d9',
      border: `1px solid ${active ? '#1f6feb' : accent ? '#2ea043' : '#30363d'}`,
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      width: full ? '100%' : 'auto',
      marginBottom: full ? '3px' : 0,
      opacity: disabled ? 0.6 : 1,
      ...style,
    }}>
      {children}
    </button>
  );
}

function Row({ k, v, vc }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '2px 0', borderBottom: '1px solid #0d1117' }}>
      <span style={{ color: '#8b949e' }}>{k}:</span>
      <span style={{ color: vc || '#e6edf3', fontFamily: 'monospace', fontWeight: 'bold' }}>{v}</span>
    </div>
  );
}

function ArtCard({ color, title, sub, badge, children }) {
  return (
    <div style={{ background: '#161b22', borderRadius: '8px', border: `1px solid ${color}44`, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color, fontWeight: 'bold', fontSize: '14px' }}>{title}</div>
          <div style={{ color: '#6e7681', fontSize: '10px', marginTop: '2px' }}>{sub}</div>
        </div>
        {badge && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(210,153,34,0.15)', color: '#d29922', border: '1px solid #d2922244' }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function ApplicationCard({ app, onLoad }) {
  const [showGraph, setShowGraph] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const graph = app.graphFactory();

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(app.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error('No se pudo copiar el código', error);
    }
  };

  return (
    <div style={{ background: '#161b22', borderRadius: '8px', border: `1px solid ${app.color}55`, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '28px' }}>{app.icon}</span>
        <div style={{ flex: '1 1 260px' }}>
          <div style={{ color: app.color, fontWeight: 'bold', fontSize: '14px' }}>{app.title}</div>
          <div style={{ color: '#6e7681', fontSize: '11px' }}>{app.sub}</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Btn onClick={() => setShowGraph((v) => !v)} active={showGraph} small>
            {showGraph ? '▾ Ocultar grafo' : '▸ Ver grafo'}
          </Btn>
          <Btn onClick={() => setShowCode((v) => !v)} active={showCode} small>
            {showCode ? '▾ Ocultar código' : '⌨ Ver código'}
          </Btn>
          <Btn onClick={onLoad} small>Cargar en editor →</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '10px' }}>
        {[
          ['🎯 Problema', app.prob, '#c9d1d9'],
          ['🗺 Modelado como grafo', app.model, '#c9d1d9'],
          ['⚙ Algoritmo', app.alg, app.color],
          ['✅ ¿Por qué?', app.why, '#c9d1d9'],
        ].map(([k, v, c]) => (
          <div key={k} style={{ background: '#0d1117', borderRadius: '6px', padding: '10px', fontSize: '11px', lineHeight: '1.6' }}>
            <div style={{ color: '#6e7681', fontWeight: 'bold', marginBottom: '6px', fontSize: '10px' }}>{k}</div>
            <div style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {showCode && (
        <div style={{ marginTop: '12px', background: '#0d1117', border: `1px solid ${app.color}66`, borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '9px 12px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: app.color, fontWeight: 'bold', fontSize: '12px' }}>{app.codeTitle}</div>
              <div style={{ color: '#6e7681', fontSize: '10px', marginTop: '3px' }}>Ejemplo educativo que puedes explicar y ejecutar por separado.</div>
            </div>
            <button onClick={copyCode} style={{ background: copied ? '#238636' : '#21262d', color: '#e6edf3', border: '1px solid #30363d', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', cursor: 'pointer' }}>
              {copied ? '✓ Copiado' : 'Copiar código'}
            </button>
          </div>
          <pre style={{ margin: 0, padding: '14px', overflowX: 'auto', maxHeight: '430px', fontSize: '11px', lineHeight: '1.55', color: '#c9d1d9', background: '#010409', tabSize: 4 }}>
            <code>{app.code}</code>
          </pre>
        </div>
      )}

      {showGraph && (
        <div style={{ marginTop: '12px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '9px 12px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: app.color, fontWeight: 'bold', fontSize: '12px' }}>{app.graphTitle}</div>
              <div style={{ color: '#6e7681', fontSize: '10px', marginTop: '3px' }}>{app.graphHelp}</div>
            </div>
            <div style={{ color: '#8b949e', fontSize: '10px' }}>
              {Object.keys(graph.nodes).length} nodos · {Object.keys(graph.edges).length} aristas
            </div>
          </div>
          <MiniGraph id={app.id} graph={graph} source={app.source} target={app.target} color={app.color} />
        </div>
      )}
    </div>
  );
}

function MiniGraph({ id, graph, source, target, color }) {
  const nodes = Object.values(graph.nodes);
  const edges = Object.values(graph.edges);
  const width = 720;
  const height = 300;
  const padX = 58;
  const padY = 46;

  if (!nodes.length) return null;

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = Math.max(1, maxX - minX);
  const rangeY = Math.max(1, maxY - minY);
  const scale = Math.min((width - padX * 2) / rangeX, (height - padY * 2 - 22) / rangeY);
  const usedW = rangeX * scale;
  const usedH = rangeY * scale;
  const offsetX = (width - usedW) / 2;
  const offsetY = (height - 22 - usedH) / 2;
  const pos = {};
  nodes.forEach((n) => {
    pos[n.id] = { x: offsetX + (n.x - minX) * scale, y: offsetY + (n.y - minY) * scale };
  });

  let route = [];
  let distance = Infinity;
  try {
    const r = { path: [], dist: {} };
    route = r.path || [];
    distance = r.dist?.[target] ?? Infinity;
  } catch {
    route = [];
  }

  const pathEdge = (e) => {
    for (let i = 0; i < route.length - 1; i++) {
      if ((e.from === route[i] && e.to === route[i + 1]) || (!graph.directed && e.from === route[i + 1] && e.to === route[i])) return true;
    }
    return false;
  };
  const patternId = `mini-grid-${id}`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', width: '100%', height: '300px' }} role="img" aria-label={`Grafo de ${source} a ${target}`}>
        <defs>
          <pattern id={patternId} width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#161b22" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill={`url(#${patternId})`} />

        {edges.map((e) => {
          const a = pos[e.from];
          const b = pos[e.to];
          if (!a || !b) return null;
          const active = pathEdge(e);
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <g key={e.id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active ? '#10b981' : '#4b5563'} strokeWidth={active ? 4 : 2} opacity={active ? 1 : 0.8} />
              <rect x={mx - 12} y={my - 8} width={24} height={16} rx={4} fill="#161b22" stroke={active ? '#10b981' : '#30363d'} />
              <text x={mx} y={my + 4} textAnchor="middle" fontSize="10" fill={active ? '#6ee7b7' : '#8b949e'}>{e.weight}</text>
            </g>
          );
        })}

        {nodes.map((n) => {
          const p = pos[n.id];
          const isSource = n.id === source;
          const isTarget = n.id === target;
          const label = n.label || n.id;
          const boxW = Math.max(34, Math.min(86, label.length * 7 + 16));
          const fill = isSource ? '#059669' : isTarget ? '#dc2626' : color;
          return (
            <g key={n.id}>
              <rect x={p.x - boxW / 2} y={p.y - 16} width={boxW} height={32} rx={16} fill={fill} stroke={isSource ? '#6ee7b7' : isTarget ? '#fca5a5' : '#c9d1d9'} strokeWidth={isSource || isTarget ? 2.5 : 1.2} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">{label}</text>
            </g>
          );
        })}

        <g transform={`translate(18,${height - 18})`}>
          <circle cx="0" cy="0" r="6" fill="#059669" /><text x="10" y="4" fontSize="10" fill="#8b949e">origen</text>
          <circle cx="70" cy="0" r="6" fill="#dc2626" /><text x="80" y="4" fontSize="10" fill="#8b949e">destino</text>
          <line x1="145" y1="0" x2="173" y2="0" stroke="#10b981" strokeWidth="4" /><text x="181" y="4" fontSize="10" fill="#8b949e">camino mínimo</text>
        </g>
      </svg>
      <div style={{ padding: '0 12px 10px', display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', fontSize: '10px' }}>
        <span style={{ color: '#8b949e' }}>Ruta: <strong style={{ color: '#c9d1d9' }}>{route.length ? route.join(' → ') : 'sin ruta'}</strong></span>
        <span style={{ color: '#8b949e' }}>Costo total: <strong style={{ color: '#3fb950' }}>{distance === Infinity ? '∞' : distance.toFixed(1)}</strong></span>
      </div>
    </div>
  );
}

export { Panel, Btn, Row, ArtCard, ApplicationCard, MiniGraph };
export default { Panel, Btn, Row, ArtCard, ApplicationCard, MiniGraph };
