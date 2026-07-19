import { calcularConteoVisual, LINEAS_FUNCIONALES_SANTIAGO, LINEAS_FUNCIONALES_ANTONIO } from "./buildTree";

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

  // Pedido: si el foco cae dentro de una línea que en la vista de filtro ya
  // trae Corporativo recortado a Santiago/Antonio + slink (ver buildTree),
  // el foco debe mostrar lo mismo — la caja raíz de la línea enfocada quedó
  // con pid="GRP_CORPORATIVO" colgando (dangling, GRP_CORPORATIVO no se
  // backfillea arriba), así que sirve como marca de "esta línea necesita su
  // slink". Buscar a Santiago/Antonio por codPosicion (00003/00001, fijo en
  // ambos modos Persona/Cargo) — en Cargo el id del nodo YA es el
  // codigoPosicion (no hay campo codPosicion separado, ver fetchCargoData).
  let slinks = [];
  const grupoRaiz = Array.from(nodosDelFoco.values()).find((n) => n.pid === "GRP_CORPORATIVO");
  if (grupoRaiz) {
    const nombreLinea = grupoRaiz.id.replace("GRP_", "");
    const esSantiago = LINEAS_FUNCIONALES_SANTIAGO.includes(nombreLinea);
    const esAntonio = LINEAS_FUNCIONALES_ANTONIO.includes(nombreLinea);
    if (esSantiago || esAntonio) {
      const codPosicionBuscado = esSantiago ? "00003" : "00001";
      const corpGroup = sourceMap.get("GRP_CORPORATIVO");
      // CARNICOS y PECUARIOS reusan el codPosicion de Santiago ("00003")
      // como id de configuración para armar su propio fantasma (cabeza
      // invisible de esas líneas, ver buildTree) — ese fantasma termina con
      // el mismo codPosicion clonado. Sin excluir "fantasma", el find()
      // podía agarrar el clon fantasma en vez del Santiago real, dejándolo
      // invisible (template ghost) dentro de Corporativo.
      const persona = Array.from(sourceMap.values()).find(
        (n) =>
          (n.codPosicion === codPosicionBuscado || n.id === codPosicionBuscado) &&
          !(n.tags || []).includes("fantasma"),
      );
      if (corpGroup && persona) {
        // Insertar AL PRINCIPIO del Map (no con .set al final): Balkan arma
        // el agrupamiento visual (stpid) en el mismo orden en que procesa
        // config.nodes, igual que buildTree siempre define GRP_CORPORATIVO
        // primero.
        const entradasPrevias = Array.from(nodosDelFoco.entries());
        nodosDelFoco.clear();
        nodosDelFoco.set(corpGroup.id, { ...corpGroup, pid: null });
        // pid/stpid de la persona vienen del árbol fuente TAL CUAL estaba
        // ahí — en el filtro de una sola línea buildTree ya lo arma con
        // pid:null/stpid:GRP_CORPORATIVO, pero en "Todas las Líneas"
        // Santiago es un reporte normal de Antonio (pid=Antonio, sin
        // stpid): copiarlo tal cual deja un pid apuntando a un nodo que no
        // existe en este árbol de foco (Antonio no está acá), y queda
        // flotando afuera de la caja. Forzar el mismo pid:null/stpid acá,
        // sea cual sea el filtro activo al entrar a foco.
        nodosDelFoco.set(persona.id, { ...persona, pid: null, stpid: corpGroup.id });
        entradasPrevias.forEach(([id, node]) => nodosDelFoco.set(id, node));

        const headPrefix = `HEAD_LINEA_${grupoRaiz.id}_`;
        const headNode = Array.from(nodosDelFoco.values()).find((n) => String(n.id).startsWith(headPrefix));
        const toId = headNode ? headNode.id : grupoRaiz.id;
        const color = esSantiago ? "#E74C3C" : "#27ae60";
        slinks = [{ from: persona.id, to: toId, fallbackTo: grupoRaiz.id, color, straight: true }];
      }
    }
  }

  const focusArray = Array.from(nodosDelFoco.values());
  focusArray.forEach((n) => {
    delete n.state;
    delete n.expanded;
    delete n.collapsed;
    // Balkan escribe posición/tamaño calculados directo sobre los objetos
    // que recibe en chart.load() — finalArray es esa misma referencia de la
    // carga anterior (no-foco), así que puede traer x/y/w/h ya calculados
    // para OTRO layout. Sin limpiar esto, Balkan reutiliza esos valores
    // stale en vez de recalcular, y una caja como GRP_CORPORATIVO (que acá
    // gana un miembro nuevo, Santiago) queda con el tamaño viejo.
    delete n.x;
    delete n.y;
    delete n.w;
    delete n.h;
  });

  // Recalcula el globo de cada caja SOLO con lo presente en el foco — sin
  // esto arrastraría el conteo de la última vista completa.
  calcularConteoVisual(focusArray);

  return { finalArray: focusArray, targetNodeId, nodosAExpandir: [], slinks };
}
