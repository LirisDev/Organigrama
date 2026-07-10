// Rompe ciclos pid -> pid -> ... -> pid en los datos crudos del API,
// para que Balkan nunca reciba un árbol circular.
export function sanitizeCircularReferences(nodes) {
  const nodeMap = new Map();
  nodes.forEach((node) => {
    if (node && node.id != null) nodeMap.set(node.id, node);
  });

  const nodeIds = Array.from(nodeMap.keys());
  for (const nodeId of nodeIds) {
    const startNode = nodeMap.get(nodeId);
    if (!startNode || startNode.pid == null) continue;
    const pathVisited = new Set();
    let currentNode = startNode;
    while (currentNode && currentNode.pid != null) {
      const currentId = currentNode.id;
      const parentId = currentNode.pid;

      if (pathVisited.has(currentId)) {
        currentNode.pid = undefined;
        break;
      }
      pathVisited.add(currentId);

      if (!nodeMap.has(parentId)) {
        currentNode.pid = undefined;
        break;
      }

      currentNode = nodeMap.get(parentId);
      if (!currentNode) break;
    }
  }
  return Array.from(nodeMap.values());
}

// Asigna tags sub-level-N: (order - orderPadre - 1), usado por Balkan para
// insertar nodos fantasma de relleno cuando se saltan niveles jerárquicos.
export function aplicarSubnivelesRelativos(nodos) {
  const orderMap = new Map();
  for (const node of nodos) {
    if (node && node.id != null) orderMap.set(node.id, node.order || 99);
  }

  for (const node of nodos) {
    if (!node.tags) node.tags = [];

    let subLevelIndex = 0;
    const pid = node.pid;
    const miOrder = node.order || 99;

    if (pid && orderMap.has(pid)) {
      subLevelIndex = miOrder - orderMap.get(pid) - 1;
    } else if (!pid) {
      subLevelIndex = miOrder - 0 - 1;
    }

    if (subLevelIndex < 0) subLevelIndex = 0;

    const subLevelTag = `sub-level-${subLevelIndex}`;
    if (!node.tags.includes(subLevelTag)) node.tags.push(subLevelTag);
    if (subLevelIndex > 0 && !node.tags.includes("sublevel-node")) {
      node.tags.push("sublevel-node");
    }
  }
}

// Calcula _directos (hijos inmediatos) y _total (todo el subárbol) por nodo,
// usado para elegir el template (Single/Group/Complex) y pintar el contador.
export function calcularDescendenciaManual(nodes) {
  const map = {};
  nodes.forEach((n) => (map[n.id] = n));

  const childrenMap = {};
  nodes.forEach((n) => {
    if (n.pid) {
      if (!childrenMap[n.pid]) childrenMap[n.pid] = [];
      childrenMap[n.pid].push(n.id);
    }
  });

  const getDeepCount = (nid) => {
    const kids = childrenMap[nid] || [];
    let sum = 0;
    kids.forEach((kidId) => {
      sum += 1 + getDeepCount(kidId);
    });
    return sum;
  };

  nodes.forEach((node) => {
    node._directos = (childrenMap[node.id] || []).length;
    node._total = getDeepCount(node.id);
  });
}
