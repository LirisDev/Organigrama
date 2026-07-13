import { calcularConteoVisual } from "./buildTree";

/**
 * Construye el árbol de Modo Foco: nodo objetivo + su ascendencia (hasta la
 * raíz) + su descendencia completa (todos los hijos) + las cajas de grupo
 * necesarias para mantener la estructura visual — opera sobre `finalArray`
 * (el árbol YA construido por buildTree, con fusiones/clones/estilos
 * aplicados), no sobre los datos crudos.
 *
 * No fuerza a Corporativo/Antonio a aparecer si no son ancestros reales del
 * nodo enfocado (bug ya resuelto en la rama vanilla, portado desde el
 * inicio acá): GRP_CORPORATIVO queda excluido del backfill de cajas, porque
 * el pid de las líneas de negocio hacia GRP_CORPORATIVO es solo metadata de
 * layout plano, no jerarquía real de mando.
 */
export function buildFocusTree(finalArray, targetNodeId) {
  const sourceMap = new Map(finalArray.map((n) => [n.id, { ...n }]));
  const targetNode = sourceMap.get(targetNodeId);
  if (!targetNode) return null;

  const nodosDelFoco = new Map();
  nodosDelFoco.set(targetNodeId, { ...targetNode });

  function agregarAscendencia(nodeId) {
    const node = sourceMap.get(nodeId);
    if (!node) return;
    if (!nodosDelFoco.has(node.id)) {
      nodosDelFoco.set(node.id, { ...node });
    }
    if (node.pid) agregarAscendencia(node.pid);
  }
  agregarAscendencia(targetNodeId);

  function agregarDescendenciaFoco(nodeId) {
    sourceMap.forEach((node) => {
      if ((node.pid === nodeId || node.stpid === nodeId) && !nodosDelFoco.has(node.id)) {
        nodosDelFoco.set(node.id, { ...node });
        agregarDescendenciaFoco(node.id);
      }
      // Puente hacia clones/fantasmas: cualquier nodo visual "HEAD_..._<id>"
      // que sea un clon del nodo actual.
      if (String(node.id).endsWith(`_${nodeId}`) && !nodosDelFoco.has(node.id) && String(node.id).startsWith("HEAD_")) {
        nodosDelFoco.set(node.id, { ...node });
        agregarDescendenciaFoco(node.id);
      }
    });
  }
  agregarDescendenciaFoco(targetNodeId);

  // Asegurar cajas/grupos (stpid y pid) hasta que no falte ninguna — excepto
  // GRP_CORPORATIVO, que no es jerarquía real de mando para las líneas de
  // negocio (solo metadata de layout plano) y quedaría vacío/desconectado.
  function asegurarCajasYGrupos() {
    let agregados = false;
    Array.from(nodosDelFoco.values()).forEach((node) => {
      if (node.stpid && !nodosDelFoco.has(node.stpid)) {
        const grupo = sourceMap.get(node.stpid);
        if (grupo) {
          nodosDelFoco.set(grupo.id, { ...grupo });
          agregados = true;
        }
      }
      if (node.pid && node.pid !== "GRP_CORPORATIVO" && !nodosDelFoco.has(node.pid)) {
        const padre = sourceMap.get(node.pid);
        if (padre) {
          nodosDelFoco.set(padre.id, { ...padre });
          agregados = true;
        }
      }
    });
    return agregados;
  }
  while (asegurarCajasYGrupos()) {
    // sigue hasta que una pasada completa no agregue nada nuevo
  }

  const focusArray = Array.from(nodosDelFoco.values());
  focusArray.forEach((n) => {
    delete n.state;
    delete n.expanded;
    delete n.collapsed;
  });

  // Recalcula el globo de cada caja SOLO con lo presente en el foco — sin
  // esto arrastraría el conteo de la última vista completa.
  calcularConteoVisual(focusArray);

  return { finalArray: focusArray, targetNodeId, nodosAExpandir: [], slinks: [] };
}
