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
export function buildFocusTree(finalArray, targetNodeId, mostrarLineasDeHead = false) {
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
      // que sea un clon del nodo actual (ej. Juan José con su propio
      // HEAD_LINEA_GRP_RETAIL_<id>). Excluye tags:"fantasma" — CARNICOS y
      // PECUARIOS reusan el codPosicion de Santiago ("00003"/id "12") como
      // id de configuración para su cabeza invisible (ver buildTree), así
      // que sus HEAD_LINEA_GRP_CARNICOS_12 / HEAD_LINEA_GRP_PECUARIOS_12
      // matcheaban el patrón por coincidencia — sin excluirlos, enfocar a
      // Santiago arrastraba TODA la gente real de esas líneas (cientos de
      // nodos, con datos viejos sin limpiar) sin que él sea su ascendiente
      // real.
      if (
        String(node.id).endsWith(`_${nodeId}`) &&
        !nodosDelFoco.has(node.id) &&
        String(node.id).startsWith("HEAD_") &&
        !(node.tags || []).includes("fantasma")
      ) {
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

  // Pedido: foco sobre Santiago o Antonio MISMOS (no un empleado de una
  // línea) — NADA de esto se ve hasta que el usuario expande su tarjeta
  // (mostrarLineasDeHead, seteado desde onExpandFocusHead en OrgChartCanvas
  // — sin llamar ningún método de Balkan ahí, solo avisar a React, que
  // reconstruye este árbol con la bandera en true): ni sus reportes
  // directos de Corporativo (Celia, Angie) ni las cajas de sus líneas de
  // negocio con su gente — todo aparece junto, sincronizado, en la misma
  // recarga.
  const nodosAExpandir = [];
  if (!grupoRaiz && mostrarLineasDeHead) {
    const codPosTarget = targetNode.codPosicion || targetNode.id;
    const esTargetSantiago = codPosTarget === "00003" && !(targetNode.tags || []).includes("fantasma");
    const esTargetAntonio = codPosTarget === "00001";
    if (esTargetSantiago || esTargetAntonio) {
      const idsLineas = esTargetSantiago ? ["GRP_BALANCEADO", "GRP_CARNICOS", "GRP_PECUARIOS"] : ["GRP_RETAIL"];
      const color = esTargetSantiago ? "#E74C3C" : "#27ae60";
      // Un id en nodosAExpandir solo garantiza que ESE nodo sea visible, no
      // revela a sus hijos — hace falta poner explícitamente el id de cada
      // hijo directo (Celia, Angie) para que Balkan los dibuje.
      nodosAExpandir.push(targetNodeId);
      Array.from(nodosDelFoco.values()).forEach((n) => {
        if (n.pid === targetNodeId || n.stpid === targetNodeId) {
          nodosAExpandir.push(n.id);
        }
      });
      const cajasNuevas = [];
      idsLineas.forEach((grpId) => {
        if (nodosDelFoco.has(grpId)) return;
        const grp = sourceMap.get(grpId);
        if (!grp) return;
        cajasNuevas.push(grpId);
        // pid:GRP_CORPORATIVO (no null) — igual que la vista de filtro
        // normal (buildTree, pidDelGrupo), para que Balkan la posicione
        // colgando debajo de Corporativo en vez de al lado como una raíz
        // suelta. Sigue sin conector nativo (group.link=""), la línea
        // roja/verde manual de acá abajo es la única conexión visual.
        nodosDelFoco.set(grpId, { ...grp, pid: "GRP_CORPORATIVO", stpid: null });
        // Trae al head real/fantasma (stpid=grpId) y, recursivamente, a
        // TODA su gente real.
        agregarDescendenciaFoco(grpId);
        nodosAExpandir.push(grpId);

        const headPrefix = `HEAD_LINEA_${grpId}_`;
        const headReal = Array.from(nodosDelFoco.values()).find((n) => String(n.id).startsWith(headPrefix));
        if (headReal) {
          nodosAExpandir.push(headReal.id);
          // Caso Cárnicos/Pecuarios: cabeza FANTASMA invisible por diseño —
          // hace falta revelar explícitamente a SUS hijos directos (la
          // gente real: Omar, etc.), el id del fantasma no alcanza. Caso
          // Balanceado: cabeza REAL (Juan Carlos) sí se dibuja con
          // headReal.id solo — sus hijos deben quedar colapsados (mismo
          // badge que se ve en la vista de filtro normal), no expandirse.
          if ((headReal.tags || []).includes("fantasma")) {
            Array.from(nodosDelFoco.values()).forEach((n) => {
              if (n.pid === headReal.id || n.stpid === headReal.id) {
                nodosAExpandir.push(n.id);
              }
            });
          }
        }

        slinks.push({ from: targetNodeId, to: grpId, color, straight: true });
      });
      // Las cajas de línea (pid:null, roots) AL PRINCIPIO del Map — mismo
      // ajuste que ya hizo falta para Corporativo/Santiago más arriba,
      // Balkan registra los nodos "raíz" en el mismo orden en que aparecen
      // en config.nodes. Su descendencia real sí puede ir en cualquier
      // orden (no son roots, cuelgan de un pid/stpid válido).
      if (cajasNuevas.length) {
        const entradasCajas = cajasNuevas.map((id) => [id, nodosDelFoco.get(id)]);
        const entradasResto = Array.from(nodosDelFoco.entries()).filter(([id]) => !cajasNuevas.includes(id));
        nodosDelFoco.clear();
        entradasCajas.forEach(([id, node]) => nodosDelFoco.set(id, node));
        entradasResto.forEach(([id, node]) => nodosDelFoco.set(id, node));
      }
    }
  }

  const focusArray = Array.from(nodosDelFoco.values());
  focusArray.forEach((n) => {
    delete n.state;
    delete n.expanded;
    delete n.collapsed;
    // Igual que x/y/w/h: si esta caja venía minimizada (Balkan escribe
    // min=true directo sobre el objeto para GRP_CARNICOS/PECUARIOS cuando
    // el usuario los minimizó en la vista "Todas las Líneas"), heredar ese
    // min acá la deja sin dibujar nada visible.
    delete n.min;
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

  return { finalArray: focusArray, targetNodeId, nodosAExpandir, slinks };
}
