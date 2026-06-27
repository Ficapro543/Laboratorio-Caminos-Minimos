const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function defaultGraph() {
  return {
    directed: false,
    nodes: {
      A: { id: 'A', label: 'A', x: 100, y: 200 },
      B: { id: 'B', label: 'B', x: 240, y: 100 },
      C: { id: 'C', label: 'C', x: 240, y: 300 },
      D: { id: 'D', label: 'D', x: 390, y: 100 },
      E: { id: 'E', label: 'E', x: 390, y: 300 },
      F: { id: 'F', label: 'F', x: 530, y: 200 },
    },
    edges: {
      e1: { id: 'e1', from: 'A', to: 'B', weight: 4 },
      e2: { id: 'e2', from: 'A', to: 'C', weight: 2 },
      e3: { id: 'e3', from: 'B', to: 'C', weight: 1 },
      e4: { id: 'e4', from: 'B', to: 'D', weight: 5 },
      e5: { id: 'e5', from: 'B', to: 'E', weight: 11 },
      e6: { id: 'e6', from: 'C', to: 'E', weight: 5 },
      e7: { id: 'e7', from: 'D', to: 'F', weight: 3 },
      e8: { id: 'e8', from: 'E', to: 'F', weight: 4 },
      e9: { id: 'e9', from: 'D', to: 'E', weight: 2 },
    },
  };
}

function genRandom(nc = 8, density = 0.35, directed = false) {
  const nodes = {};
  const edges = {};
  let eid = 0;
  const cols = Math.ceil(Math.sqrt(nc));
  for (let i = 0; i < nc; i++) {
    const lb = i < 26 ? LABELS[i] : `N${i}`;
    const r = Math.floor(i / cols);
    const c = i % cols;
    nodes[lb] = {
      id: lb,
      label: lb,
      x: 70 + c * 120 + (Math.random() - 0.5) * 30,
      y: 70 + r * 120 + (Math.random() - 0.5) * 30,
    };
  }
  const nl = Object.keys(nodes);
  const sh = [...nl].sort(() => Math.random() - 0.5);
  for (let i = 1; i < sh.length; i++) {
    const id = `e${eid++}`;
    edges[id] = { id, from: sh[Math.floor(Math.random() * i)], to: sh[i], weight: 1 + Math.ceil(Math.random() * 12) };
  }
  for (let i = 0; i < nl.length; i++) {
    for (let j = i + 1; j < nl.length; j++) {
      if (Math.random() < density) {
        const exists = Object.values(edges).some((e) => (e.from === nl[i] && e.to === nl[j]) || (e.from === nl[j] && e.to === nl[i]));
        if (!exists) {
          const id = `e${eid++}`;
          edges[id] = { id, from: nl[i], to: nl[j], weight: 1 + Math.ceil(Math.random() * 12) };
        }
      }
    }
  }
  return { directed, nodes, edges };
}

function genGrid(rows = 3, cols = 4) {
  const nodes = {};
  const edges = {};
  let eid = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `N${r * cols + c}`;
      nodes[id] = { id, label: id, x: 70 + c * 100, y: 70 + r * 100 };
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c < cols - 1) {
        const id = `e${eid++}`;
        edges[id] = { id, from: `N${r * cols + c}`, to: `N${r * cols + c + 1}`, weight: 1 + Math.ceil(Math.random() * 8) };
      }
      if (r < rows - 1) {
        const id = `e${eid++}`;
        edges[id] = { id, from: `N${r * cols + c}`, to: `N${(r + 1) * cols + c}`, weight: 1 + Math.ceil(Math.random() * 8) };
      }
    }
  }
  return { directed: false, nodes, edges };
}

function genRoadNetwork() {
  return {
    directed: false,
    nodes: {
      Cusco: { id: 'Cusco', label: 'Cusco', x: 280, y: 280 },
      Urubamba: { id: 'Urubamba', label: 'Urubamba', x: 140, y: 180 },
      Pisac: { id: 'Pisac', label: 'Pisac', x: 360, y: 150 },
      Chinchero: { id: 'Chinchero', label: 'Chinchero', x: 220, y: 120 },
      Ollantaytambo: { id: 'Ollantaytambo', label: 'Ollanta', x: 80, y: 260 },
      Machu_Picchu: { id: 'Machu_Picchu', label: 'Machu P.', x: 60, y: 360 },
      Andahuaylillas: { id: 'Andahuaylillas', label: 'Andah.', x: 390, y: 340 },
      Sicuani: { id: 'Sicuani', label: 'Sicuani', x: 460, y: 400 },
    },
    edges: {
      e1: { id: 'e1', from: 'Cusco', to: 'Urubamba', weight: 69 },
      e2: { id: 'e2', from: 'Cusco', to: 'Pisac', weight: 33 },
      e3: { id: 'e3', from: 'Cusco', to: 'Andahuaylillas', weight: 45 },
      e4: { id: 'e4', from: 'Urubamba', to: 'Chinchero', weight: 28 },
      e5: { id: 'e5', from: 'Urubamba', to: 'Ollantaytambo', weight: 19 },
      e6: { id: 'e6', from: 'Pisac', to: 'Chinchero', weight: 37 },
      e7: { id: 'e7', from: 'Ollantaytambo', to: 'Machu_Picchu', weight: 112 },
      e8: { id: 'e8', from: 'Andahuaylillas', to: 'Sicuani', weight: 90 },
      e9: { id: 'e9', from: 'Chinchero', to: 'Cusco', weight: 23 },
    },
  };
}

function genOSPFNetwork() {
  return {
    directed: false,
    nodes: {
      R1: { id: 'R1', label: 'R1', x: 70, y: 145 },
      R2: { id: 'R2', label: 'R2', x: 190, y: 70 },
      R3: { id: 'R3', label: 'R3', x: 190, y: 220 },
      R4: { id: 'R4', label: 'R4', x: 340, y: 70 },
      R5: { id: 'R5', label: 'R5', x: 340, y: 220 },
      R6: { id: 'R6', label: 'R6', x: 500, y: 145 },
    },
    edges: {
      e1: { id: 'e1', from: 'R1', to: 'R2', weight: 2 },
      e2: { id: 'e2', from: 'R1', to: 'R3', weight: 5 },
      e3: { id: 'e3', from: 'R2', to: 'R3', weight: 1 },
      e4: { id: 'e4', from: 'R2', to: 'R4', weight: 2 },
      e5: { id: 'e5', from: 'R3', to: 'R5', weight: 3 },
      e6: { id: 'e6', from: 'R4', to: 'R5', weight: 1 },
      e7: { id: 'e7', from: 'R4', to: 'R6', weight: 5 },
      e8: { id: 'e8', from: 'R5', to: 'R6', weight: 2 },
    },
  };
}

function genRobotGrid() {
  const rows = 4;
  const cols = 6;
  const blocked = new Set(['1-2', '2-2', '2-4']);
  const nodes = {};
  const edges = {};
  let eid = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (blocked.has(`${r}-${c}`)) continue;
      const id = `P${r}${c}`;
      const label = id === 'P00' ? 'S' : id === 'P35' ? 'G' : '·';
      nodes[id] = { id, label, x: 70 + c * 90, y: 55 + r * 65 };
    }
  }
  const add = (a, b) => {
    if (!nodes[a] || !nodes[b]) return;
    const id = `e${eid++}`;
    edges[id] = { id, from: a, to: b, weight: 1 };
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `P${r}${c}`;
      if (!nodes[id]) continue;
      add(id, `P${r}${c + 1}`);
      add(id, `P${r + 1}${c}`);
    }
  }
  return { directed: false, nodes, edges };
}

function genLogisticsNetwork() {
  return {
    directed: false,
    nodes: {
      Deposito: { id: 'Deposito', label: 'DEP', x: 80, y: 145 },
      A: { id: 'A', label: 'A', x: 205, y: 60 },
      B: { id: 'B', label: 'B', x: 205, y: 225 },
      C: { id: 'C', label: 'C', x: 350, y: 145 },
      D: { id: 'D', label: 'D', x: 470, y: 55 },
      E: { id: 'E', label: 'E', x: 520, y: 220 },
    },
    edges: {
      e1: { id: 'e1', from: 'Deposito', to: 'A', weight: 6 },
      e2: { id: 'e2', from: 'Deposito', to: 'B', weight: 4 },
      e3: { id: 'e3', from: 'Deposito', to: 'E', weight: 12 },
      e4: { id: 'e4', from: 'A', to: 'C', weight: 3 },
      e5: { id: 'e5', from: 'B', to: 'C', weight: 2 },
      e6: { id: 'e6', from: 'B', to: 'D', weight: 5 },
      e7: { id: 'e7', from: 'C', to: 'E', weight: 4 },
      e8: { id: 'e8', from: 'D', to: 'E', weight: 2 },
      e9: { id: 'e9', from: 'A', to: 'D', weight: 6 },
    },
  };
}

function genSocialNetwork() {
  return {
    directed: false,
    nodes: {
      Ana: { id: 'Ana', label: 'Ana', x: 65, y: 145 },
      Beto: { id: 'Beto', label: 'Beto', x: 180, y: 65 },
      Carla: { id: 'Carla', label: 'Carla', x: 180, y: 225 },
      Diego: { id: 'Diego', label: 'Diego', x: 325, y: 145 },
      Eva: { id: 'Eva', label: 'Eva', x: 445, y: 60 },
      Fabi: { id: 'Fabi', label: 'Fabi', x: 445, y: 225 },
      Leo: { id: 'Leo', label: 'Leo', x: 555, y: 145 },
    },
    edges: {
      e1: { id: 'e1', from: 'Ana', to: 'Beto', weight: 1 },
      e2: { id: 'e2', from: 'Ana', to: 'Carla', weight: 1 },
      e3: { id: 'e3', from: 'Beto', to: 'Carla', weight: 1 },
      e4: { id: 'e4', from: 'Beto', to: 'Diego', weight: 1 },
      e5: { id: 'e5', from: 'Carla', to: 'Diego', weight: 1 },
      e6: { id: 'e6', from: 'Diego', to: 'Eva', weight: 1 },
      e7: { id: 'e7', from: 'Diego', to: 'Fabi', weight: 1 },
      e8: { id: 'e8', from: 'Eva', to: 'Fabi', weight: 1 },
      e9: { id: 'e9', from: 'Eva', to: 'Leo', weight: 1 },
      e10: { id: 'e10', from: 'Fabi', to: 'Leo', weight: 1 },
    },
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

print(conexion_mas_corta(red_social, "Ana", "Leo"))`,
};

const APPLICATIONS = [
  {
    id: 'roads',
    icon: '🚗',
    title: 'Navegación vial',
    sub: 'Google Maps · Apple Maps · OSRM · HERE Maps',
    prob: 'Encontrar la ruta más corta o rápida entre dos puntos en una red de carreteras con millones de nodos en tiempo real.',
    model: 'G=(V,E,w) donde V=intersecciones, E=segmentos viales y w=tiempo de viaje estimado con tráfico en tiempo real.',
    alg: 'Contraction Hierarchies + capas de tráfico dinámico',
    why: 'Para n>10⁶, Dijkstra puro toma varios segundos. CH reduce la consulta a milisegundos con preprocesamiento offline.',
    color: '#10b981',
    graphFactory: genRoadNetwork,
    source: 'Cusco',
    target: 'Machu_Picchu',
    editorAlgo: 'dijk-heap',
    graphTitle: 'Ejemplo: ruta Cusco → Machu Picchu',
    graphHelp: 'Los nodos representan ciudades y las aristas, carreteras ponderadas por distancia o tiempo.',
    codeTitle: 'Dijkstra aplicado a navegación vial (Python)',
    code: APPLICATION_CODE.roads,
  },
  {
    id: 'ospf',
    icon: '🌐',
    title: 'OSPF — Enrutamiento IP',
    sub: 'RFC 2328 · Protocolo estándar de Internet',
    prob: 'Cada router calcula el árbol de caminos mínimos hacia los demás routers cuando cambia la topología de la red.',
    model: 'G=(V,E,w) donde V=routers, E=enlaces físicos y w=costo OSPF según ancho de banda y latencia.',
    alg: 'Dijkstra con Binary Heap, ejecutado de forma distribuida en cada router',
    why: 'Las redes OSPF usan pesos no negativos y requieren rutas exactas. Dijkstra ofrece un resultado determinista y eficiente.',
    color: '#3b82f6',
    graphFactory: genOSPFNetwork,
    source: 'R1',
    target: 'R6',
    editorAlgo: 'dijk-heap',
    graphTitle: 'Ejemplo: encaminamiento desde R1 hasta R6',
    graphHelp: 'Cada nodo es un router y cada peso representa el costo configurado para un enlace.',
    codeTitle: 'Dijkstra para una tabla OSPF (Python)',
    code: APPLICATION_CODE.ospf,
  },
  {
    id: 'robot',
    icon: '🤖',
    title: 'Robótica y planificación de movimiento',
    sub: 'ROS · planificadores de trayectorias · motion planning',
    prob: 'Un robot debe desplazarse desde una posición inicial hasta una meta evitando obstáculos y minimizando tiempo o energía.',
    model: 'El mapa se discretiza en celdas. Los nodos son posiciones libres y las aristas son movimientos válidos entre celdas vecinas.',
    alg: 'A* con heurística Manhattan o Euclidiana; D* para replanificación en tiempo real',
    why: 'La heurística orienta la búsqueda hacia la meta y evita explorar zonas innecesarias del mapa.',
    color: '#f59e0b',
    graphFactory: genRobotGrid,
    source: 'P00',
    target: 'P35',
    editorAlgo: 'astar',
    graphTitle: 'Ejemplo: trayectoria de S (inicio) a G (meta)',
    graphHelp: 'Los espacios sin nodo representan obstáculos. La ruta resaltada es una trayectoria válida de costo mínimo.',
    codeTitle: 'A* para planificación de movimiento (Python)',
    code: APPLICATION_CODE.robot,
  },
  {
    id: 'logistics',
    icon: '📦',
    title: 'Logística y supply chain',
    sub: 'Optimización de entregas · VRP · Fleet management',
    prob: 'Una flota debe realizar entregas minimizando distancia, tiempo o consumo de combustible.',
    model: 'Los nodos son el depósito y los clientes. Los pesos representan distancia, costo o tiempo de traslado.',
    alg: 'CH/HL para distancias; después heurísticas o métodos de optimización para el VRP',
    why: 'El cálculo de caminos mínimos produce la matriz de costos que luego utiliza el optimizador de rutas de reparto.',
    color: '#8b5cf6',
    graphFactory: genLogisticsNetwork,
    source: 'Deposito',
    target: 'E',
    editorAlgo: 'dijk-heap',
    graphTitle: 'Ejemplo: ruta desde el depósito hasta el cliente E',
    graphHelp: 'El camino verde muestra la alternativa de menor costo entre los puntos disponibles.',
    codeTitle: 'Dijkstra para una red de entregas (Python)',
    code: APPLICATION_CODE.logistics,
  },
  {
    id: 'social',
    icon: '👥',
    title: 'Redes sociales y análisis de grafos',
    sub: 'Centralidad · comunidades · difusión de información',
    prob: 'Analizar conexiones, difusión de información y nodos que aparecen con frecuencia en caminos mínimos.',
    model: 'G=(V,E) donde V=usuarios, E=relaciones y el peso puede representar distancia social o inverso de interacciones.',
    alg: 'Brandes para centralidad; BFS o Dijkstra según el tipo de peso',
    why: 'Los caminos mínimos permiten detectar usuarios puente, medir cercanía y estudiar cómo se propaga la información.',
    color: '#ec4899',
    graphFactory: genSocialNetwork,
    source: 'Ana',
    target: 'Leo',
    editorAlgo: 'dijk-heap',
    graphTitle: 'Ejemplo: conexión mínima entre Ana y Leo',
    graphHelp: 'Diego funciona como nodo puente entre dos grupos, algo útil para estudiar centralidad.',
    codeTitle: 'BFS para una red social no ponderada (Python)',
    code: APPLICATION_CODE.social,
  },
];

export { LABELS, defaultGraph, genRandom, genGrid, genRoadNetwork, genOSPFNetwork, genRobotGrid, genLogisticsNetwork, genSocialNetwork, APPLICATION_CODE, APPLICATIONS };
export default {
  LABELS,
  defaultGraph,
  genRandom,
  genGrid,
  genRoadNetwork,
  genOSPFNetwork,
  genRobotGrid,
  genLogisticsNetwork,
  genSocialNetwork,
  APPLICATION_CODE,
  APPLICATIONS,
};
