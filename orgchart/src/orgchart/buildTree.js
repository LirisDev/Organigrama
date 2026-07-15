import { CABEZAS_NEGOCIO_TEMP, CABEZAS_NEGOCIO_CARGO } from "../config/cabezasNegocio";
import { calcularDescendenciaManual } from "../data/sanitize";

const DICCIONARIO_LINEAS = {
  PECUARIOS: "PECUARIOS",
};

export function obtenerAliasLinea(nombreOriginal) {
  const normalizado = (nombreOriginal || "").toUpperCase().trim();
  return DICCIONARIO_LINEAS[normalizado] || normalizado;
}

// Recursivo: agrega los hijos (y descendencia) de idOriginalPadre al mapa de
// render, respetando lista negra y filtro. idVisualPadre puede ser un clon
// visual con un id distinto al real (ver clon de Andrés Herrera).
function agregarDescendencia(
  idVisualPadre,
  idOriginalPadre,
  nodesToRender,
  sourceMap,
  idsAExcluir = [],
  filtroEstricto = null,
  filtroProfundo = false,
) {
  const idBusqueda = idOriginalPadre || idVisualPadre;

  sourceMap.forEach((node) => {
    if (node.pid !== idBusqueda) return;
    if (idsAExcluir.includes(node.id)) return;
    if (filtroEstricto && !filtroEstricto(node)) return;

    if (!nodesToRender.has(node.id)) {
      const nodoHijo = Object.assign({}, node);
      if (idVisualPadre !== idOriginalPadre) {
        nodoHijo.pid = idVisualPadre;
      }
      nodesToRender.set(nodoHijo.id, nodoHijo);

      // A los nietos ya no se les aplica el filtro estricto del abuelo,
      // salvo que el filtro sea "profundo" (ej. soporte Carnicería→Cárnicos).
      agregarDescendencia(
        nodoHijo.id,
        nodoHijo.id,
        nodesToRender,
        sourceMap,
        idsAExcluir,
        filtroProfundo ? filtroEstricto : null,
        filtroProfundo,
      );
    }
  });
}

function encontrarNodoPorConfig(sourceMap, sourceNodes, configId) {
  if (!configId) return null;
  let nodo = sourceMap.get(configId);
  if (!nodo) nodo = sourceNodes.find((n) => n.codPosicion === configId);
  return nodo;
}

/**
 * Reconstruye el árbol de render a partir de allNodes (data cruda del API,
 * ya sanitizada) aplicando el filtro de línea de negocio, la caja Corporativo
 * condicional, clones anti-duplicación, fantasmas y las líneas de reporte
 * visual (_slinksManuales). Puro: no toca el DOM ni el chart directamente.
 *
 * `mode` ("Persona" | "Cargo") selecciona la config de cabezas activa y
 * activa las excepciones propias de Cargo (clon de la posición 00943, campo
 * cargoPuesto para detectar el Comité, id de Santiago por codigoPosicion).
 *
 * @returns {{ finalArray: object[], nodosAExpandir: string[], slinks: object[] }}
 */
export function buildTree({ allNodes, lineaFiltro, corporativoExpandido, mode = "Persona" }) {
  const esCargo = mode === "Cargo";
  const CABEZAS_ACTIVAS = esCargo ? CABEZAS_NEGOCIO_CARGO : CABEZAS_NEGOCIO_TEMP;
  const sourceNodes = allNodes;
  const lineaFiltroNorm = (lineaFiltro || "TODOS").toUpperCase().trim();

  const esTodasLineas = lineaFiltroNorm === "TODOS";
  // DERIVADOS no tiene caja propia: su gente vive en el Comité de Productos
  // Derivados, colgado de Corporativo. Filtrar por Derivados debe mostrar
  // Corporativo (donde vive el Comité), igual que filtrar por Corporativo.
  const esSoloCorp = lineaFiltroNorm === "CORPORATIVO" || lineaFiltroNorm === "DERIVADOS";
  const mostrarCorporativo = esTodasLineas || esSoloCorp;

  if (!sourceNodes || sourceNodes.length === 0) {
    return { finalArray: [], nodosAExpandir: [], slinks: [] };
  }

  const nodesToRender = new Map();
  const sourceMap = new Map();
  sourceNodes.forEach((n) => sourceMap.set(n.id, Object.assign({}, n)));

  // --- Clon hardcodeado: Andrés Herrera (9987) también reporta a Cárnicos ---
  const idAndres = "9987";
  const andresOriginal = sourceMap.get(idAndres);
  if (andresOriginal) {
    const idAndresClon = `CLON_CARNICOS_${idAndres}`;
    const andresClon = Object.assign({}, andresOriginal);
    andresClon.id = idAndresClon;
    andresClon.pid = "1841";
    andresClon.displayNombre = `${andresOriginal.nombre} (CÁRNICOS)`;
    sourceMap.set(idAndresClon, andresClon);

    sourceMap.forEach((node) => {
      if (node.pid === idAndres) {
        const lineaHijo = (node.lineaNegocio || "").toUpperCase().trim();
        if (lineaHijo === "CARNICOS") node.pid = idAndresClon;
      }
    });
  }

  // --- Clon propio de Cargo: posición 00943 también reporta a Santiago (01098) ---
  if (esCargo) {
    const idPosClon = "00943";
    const posOriginal = sourceMap.get(idPosClon);
    if (posOriginal) {
      const idClon = `CLON_CARNICOS_${idPosClon}`;
      const posClon = Object.assign({}, posOriginal);
      posClon.id = idClon;
      posClon.pid = "01098";
      posClon.displayNombre = `${posOriginal.cargoPuesto} (CÁRNICOS)`;
      sourceMap.set(idClon, posClon);

      sourceMap.forEach((node) => {
        if (node.pid === idPosClon) {
          const lineaHijo = (node.lineaNegocio || "").toUpperCase().trim();
          if (lineaHijo === "CARNICOS") node.pid = idClon;
        }
      });
    }
  }

  const antonioNode = encontrarNodoPorConfig(sourceMap, sourceNodes, CABEZAS_ACTIVAS.CORPORATIVO.id);
  const idAntonio = antonioNode ? antonioNode.id : null;

  // === 1. CORPORATIVO (grupo gris) ===
  const groupCorpId = "GRP_CORPORATIVO";

  if (mostrarCorporativo) {
    nodesToRender.set(groupCorpId, {
      id: groupCorpId,
      pid: null,
      nombre: "CORPORATIVO",
      cargoPuesto: "CORPORATIVO",
      title: "Holding",
      tags: ["group"],
      templateName: "group",
      order: 1,
    });
  }

  if (mostrarCorporativo && idAntonio) {
    const nodoAntonio = Object.assign({}, sourceMap.get(idAntonio));
    nodoAntonio.stpid = groupCorpId;
    nodoAntonio.pid = null;
    nodesToRender.set(idAntonio, nodoAntonio);

    sourceMap.forEach((node) => {
      if (node.pid !== idAntonio) return;
      const lineaNode = (node.lineaNegocio || "").toUpperCase().trim();

      // En "todos" se muestran Corporativo y Derivados juntos. Si el filtro
      // es puntual (Corporativo o Derivados), solo entra la gente de esa
      // línea específica.
      if (esTodasLineas) {
        if (lineaNode !== "CORPORATIVO" && lineaNode !== "DERIVADOS") return;
      } else if (lineaNode !== lineaFiltroNorm) {
        return;
      }

      const esCabezaDivision = Object.values(CABEZAS_ACTIVAS).some(
        (c) => c.reportFuncional && c.reportFuncional === node.id,
      );

      const nodoHijo = Object.assign({}, node);

      // "COMITE" en Persona viene en node.puesto; en Cargo el mismo puesto
      // llega en node.cargoPuesto (cargoBinding usa field_0=cargoPuesto) —
      // sin este segundo check, Cargo nunca detecta el Comité.
      if (
        nodoHijo.puesto === "COMITE" ||
        nodoHijo.puesto === "COMITE COMITE" ||
        nodoHijo.cargoPuesto === "COMITE" ||
        nodoHijo.cargoPuesto === "COMITE COMITE"
      ) {
        const tituloComite = "COMITÉ DE PRODUCTOS DERIVADOS";
        const listaComite =
          "• PRESIDENTE\n• GERENTE GENERAL\n• GERENTE FINANCIERO\n• GERENTE DE PRODUCTOS DERIVADOS\n• TRADER SENIOR DE PRODUCTOS DERIVADOS\n• TRADER DE PRODUCTOS DERIVADOS";
        nodoHijo.nombre = tituloComite;
        nodoHijo.displayNombre = tituloComite;
        nodoHijo.puesto = listaComite;
        nodoHijo.cargoPuesto = tituloComite;
        nodoHijo.cargoPersona = listaComite;
        if (!nodoHijo.tags) nodoHijo.tags = [];
        nodoHijo.tags.push("comite");
        nodoHijo.tags.push("left-partner");
      }

      // Priscilla (cabeza de Derivados): mismo estilo de header que
      // jefe-carniceria/jefe-marketing, en amarillo.
      if (lineaNode === "DERIVADOS") {
        if (!nodoHijo.tags) nodoHijo.tags = [];
        nodoHijo.tags.push("jefe-derivados");
      }

      nodesToRender.set(nodoHijo.id, nodoHijo);

      let filtroHijosCorp = null;
      if (esCabezaDivision) {
        filtroHijosCorp = (n) => (n.lineaNegocio || "").toUpperCase().trim() === "CORPORATIVO";
      }

      agregarDescendencia(nodoHijo.id, nodoHijo.id, nodesToRender, sourceMap, [], filtroHijosCorp);
    });
  }

  if (esSoloCorp) {
    return finalizeTree(nodesToRender, sourceNodes, lineaFiltroNorm, corporativoExpandido, mode);
  }

  // === 2. LÍNEAS DE NEGOCIO (layout plano, cuelgan de Corporativo) ===
  Object.entries(CABEZAS_ACTIVAS).forEach(([nombreLinea, configLinea]) => {
    if (nombreLinea === "CORPORATIVO") return;
    if (!corporativoExpandido) return;

    let renderizarEstaLinea = false;
    let esSoporteParaOtraLinea = false;

    if (esTodasLineas || lineaFiltroNorm === nombreLinea) {
      renderizarEstaLinea = true;
    } else if (lineaFiltroNorm === "CARNICERIA" && nombreLinea === "CARNICOS") {
      renderizarEstaLinea = true;
      esSoporteParaOtraLinea = true;
    } else if (lineaFiltroNorm === "MARKETING" && nombreLinea === "RETAIL") {
      renderizarEstaLinea = true;
      esSoporteParaOtraLinea = true;
    }
    if (!renderizarEstaLinea) return;

    const subGroupId = `GRP_${nombreLinea.replace(/\s/g, "")}`;
    const tagLinea = `LINEA_${nombreLinea.replace(/\s/g, "_")}`;

    let pidDelGrupo = mostrarCorporativo ? groupCorpId : null;
    if (nombreLinea === "MARKETING") {
      const retailHead = encontrarNodoPorConfig(sourceMap, sourceNodes, CABEZAS_ACTIVAS["RETAIL"]?.id);
      if (retailHead) pidDelGrupo = `HEAD_LINEA_GRP_RETAIL_${retailHead.id}`;
    } else if (nombreLinea === "CARNICERIA") {
      const omarHead = encontrarNodoPorConfig(sourceMap, sourceNodes, configLinea.id);
      if (omarHead) pidDelGrupo = omarHead.id;
    }

    const _gruposSinLinea = ["BALANCEADO", "CARNICOS", "CARNICERIA", "PECUARIOS", "RETAIL"];
    const _tagsGrupo = _gruposSinLinea.includes(nombreLinea)
      ? ["group", tagLinea, "groupNoLink"]
      : ["group", tagLinea];

    nodesToRender.set(subGroupId, {
      id: subGroupId,
      pid: pidDelGrupo,
      nombre: obtenerAliasLinea(nombreLinea),
      cargoPuesto: obtenerAliasLinea(nombreLinea),
      title: "Línea de Negocio",
      tags: _tagsGrupo,
      templateName: _gruposSinLinea.includes(nombreLinea) ? "groupNoLink" : "group",
      order: configLinea.order || 10,
    });

    if (!configLinea.id) return;
    const gerenteOriginal = encontrarNodoPorConfig(sourceMap, sourceNodes, configLinea.id);
    if (!gerenteOriginal) return;

    const idGerenteLineaVisual = `HEAD_LINEA_${subGroupId}_${gerenteOriginal.id}`;
    const nodoGerente = Object.assign({}, gerenteOriginal);
    nodoGerente.id = idGerenteLineaVisual;
    nodoGerente.stpid = subGroupId;
    nodoGerente.pid = null;

    // CARNICERIA/CARNICOS/PECUARIOS: cabeza invisible, sus hijos reales
    // cuelgan de este fantasma con normalidad.
    const esFantasma = ["CARNICERIA", "CARNICOS", "PECUARIOS"].includes(nombreLinea);
    if (esFantasma) {
      nodoGerente.tags = ["fantasma"];
      nodoGerente.template = "ghost";
      nodoGerente.displayNombre = "";
      nodoGerente.nombre = "";
      nodoGerente.puesto = "";
      nodoGerente.img = "";
      delete nodoGerente.state;
    } else {
      nodoGerente.displayNombre = `${gerenteOriginal.nombre} (${obtenerAliasLinea(nombreLinea)})`;
    }
    nodesToRender.set(idGerenteLineaVisual, nodoGerente);

    if (nombreLinea === "CARNICERIA") {
      const filtroLinea = (nodo) => {
        const lineaHijo = (nodo.lineaNegocio || "").toUpperCase().trim();
        return lineaHijo === "CARNICERIA" || String(nodo.id).includes("CLON_");
      };
      agregarDescendencia(idGerenteLineaVisual, gerenteOriginal.id, nodesToRender, sourceMap, [], filtroLinea);
    } else {
      // Cerca eléctrica: excluir a Carnicería de la caja de Cárnicos.
      let idsExcluir = [];
      if (nombreLinea === "CARNICOS") {
        sourceMap.forEach((n) => {
          const ln = (n.lineaNegocio || "").toUpperCase().trim();
          if (ln === "CARNICERIA") idsExcluir.push(n.id);
        });
      }

      const filtroLinea = (nodo) => {
        const lineaHijo = (nodo.lineaNegocio || "").toUpperCase().trim();
        if (esSoporteParaOtraLinea && lineaFiltroNorm === "CARNICERIA") {
          const idOmar = CABEZAS_ACTIVAS["CARNICERIA"]?.id;
          return nodo.codPosicion === idOmar || String(nodo.id).includes(idOmar);
        }
        if (esSoporteParaOtraLinea && lineaFiltroNorm === "MARKETING") {
          const idRetail = CABEZAS_ACTIVAS["RETAIL"]?.id;
          return nodo.codPosicion === idRetail || String(nodo.id).includes(idRetail);
        }
        return lineaHijo === nombreLinea || String(nodo.id).includes("CLON_");
      };

      const aplicarProfundo = esSoporteParaOtraLinea && lineaFiltroNorm === "CARNICERIA";
      agregarDescendencia(
        idGerenteLineaVisual,
        gerenteOriginal.id,
        nodesToRender,
        sourceMap,
        idsExcluir,
        filtroLinea,
        aplicarProfundo,
      );
    }
  });

  return finalizeTree(nodesToRender, sourceNodes, lineaFiltroNorm, corporativoExpandido, mode);
}

/**
 * Cuenta personas reales dentro de `finalArray` y asigna `node.conteo` a
 * cada nodo con tag "group" (los globos naranjas). Cuenta hacia la caja
 * donde el nodo cuelga VISUALMENTE (vía stpid, o caminando hacia arriba por
 * pid hasta encontrar un ancestro con stpid), no según su lineaNegocio
 * autoreportada — evita inflar el conteo de una línea con gente que en
 * realidad se dibuja en otra caja (ej. staff de Corporativo). Debe correr
 * DESPUÉS de la fusión Carnicería/Marketing, o cuenta hacia cajas que ya
 * no existen o estructuras que aún no se armaron.
 */
export function calcularConteoVisual(finalArray) {
  const finalById = new Map(finalArray.map((n) => [n.id, n]));
  const visualCounts = {};
  Object.keys(CABEZAS_NEGOCIO_TEMP).forEach((k) => {
    visualCounts[k.toUpperCase().replace(/\s/g, "")] = 0;
  });
  visualCounts["CORPORATIVO"] = 0;
  visualCounts["DERIVADOS"] = 0;

  finalArray.forEach((node) => {
    const nombrePuesto = node.puesto ? node.puesto.toUpperCase().trim() : "";
    if (nombrePuesto === "COMITE" || nombrePuesto === "COMITÉ") return;

    if (
      node.tags &&
      (node.tags.includes("group") || node.tags.includes("fantasma") || node.tags.includes("head-of-group"))
    ) {
      return;
    }

    const lineaRealEmpleado = node.lineaNegocio ? node.lineaNegocio.trim().toUpperCase().replace(/\s/g, "") : "N/A";

    if (node.stpid) {
      const nombreCaja = node.stpid.replace("GRP_", "");
      if (nombreCaja === lineaRealEmpleado && visualCounts[nombreCaja] !== undefined) {
        visualCounts[nombreCaja]++;
      }
      // else: invitado en otra caja (ej. Omar en Carnicería) — no suma.
    } else {
      // Sin stpid: staff directo de Antonio, o descendiente varios niveles
      // abajo (solo la CABEZA de cada línea recibe stpid). Caminar hacia
      // arriba por pid hasta encontrar un ancestro con stpid resuelve la
      // caja real donde cuelga visualmente.
      const cajaVisual = (() => {
        let actual = node;
        const visitados = new Set();
        while (actual && actual.pid && !visitados.has(actual.id)) {
          visitados.add(actual.id);
          const padre = finalById.get(actual.pid);
          if (!padre) break;
          if (padre.stpid) return padre.stpid.replace("GRP_", "");
          actual = padre;
        }
        return "CORPORATIVO";
      })();
      if (visualCounts[cajaVisual] !== undefined) {
        visualCounts[cajaVisual]++;
      }
    }
  });

  finalArray.forEach((node) => {
    if (!node.tags || !node.tags.includes("group")) return;
    if (visualCounts[node.id] !== undefined) {
      node.conteo = String(visualCounts[node.id]);
    } else {
      const lineaKey = node.id.replace("GRP_", "");
      if (visualCounts[lineaKey] !== undefined) node.conteo = String(visualCounts[lineaKey]);
    }
  });
}

function finalizeTree(nodesToRender, allNodes, lineaFiltro, corporativoExpandido, mode = "Persona") {
  const esCargo = mode === "Cargo";
  const finalArray = Array.from(nodesToRender.values());

  // CARNICERIA: eliminar GRP_CARNICERIA/HEAD_LINEA_GRP_CARNICERIA_*, mover a
  // Jean Pierre directo bajo Omar (mismo nivel que sus demás jefes directos).
  (function () {
    const grpIdx = finalArray.findIndex((n) => n.id === "GRP_CARNICERIA");
    const headCarniceria = finalArray.find((n) => String(n.id).startsWith("HEAD_LINEA_GRP_CARNICERIA_"));
    if (grpIdx !== -1 && headCarniceria) {
      const grpNode = finalArray[grpIdx];
      finalArray.splice(grpIdx, 1);

      const jeanPierre = finalArray.find(
        (n) => String(n.pid) === String(headCarniceria.id) && !(n.tags || []).includes("fantasma"),
      );
      if (jeanPierre) {
        jeanPierre.pid = grpNode.pid;
        jeanPierre.stpid = null;
        jeanPierre.order = grpNode.order;
        jeanPierre.tags = ["level-5", "sub-level-1", "sublevel-node", "jefe-carniceria"];
        delete jeanPierre.displayNombre;
      }

      const headIdx = finalArray.findIndex((n) => String(n.id).startsWith("HEAD_LINEA_GRP_CARNICERIA_"));
      if (headIdx !== -1) finalArray.splice(headIdx, 1);
    }
  })();

  // MARKETING: el HEAD_LINEA_GRP_MARKETING ya ES el jefe (no fantasma).
  // Eliminar GRP_MARKETING, promover el HEAD directo bajo el HEAD de Retail.
  (function () {
    const grpIdx = finalArray.findIndex((n) => n.id === "GRP_MARKETING");
    const headMktIdx = finalArray.findIndex((n) => String(n.id).startsWith("HEAD_LINEA_GRP_MARKETING_"));
    const retailHead = finalArray.find((n) => String(n.id).startsWith("HEAD_LINEA_GRP_RETAIL_"));
    if (grpIdx !== -1 && headMktIdx !== -1 && retailHead) {
      finalArray.splice(grpIdx, 1);
      const headMarketing = finalArray.find((n) => String(n.id).startsWith("HEAD_LINEA_GRP_MARKETING_"));
      if (headMarketing) {
        headMarketing.pid = retailHead.id;
        headMarketing.stpid = null;
        delete headMarketing.order;
        const existingTags = (headMarketing.tags || []).filter(
          (t) => !/^(group|groupNoLink|head-of-group|fantasma)$/.test(t),
        );
        headMarketing.tags = [...existingTags, "jefe-marketing"];
        delete headMarketing.displayNombre;
      }
    }
  })();

  // Contadores (_directos/_total) y conteo visual (globos) se calculan
  // DESPUÉS de las reestructuraciones de arriba, o no reflejan el árbol
  // final.
  calcularDescendenciaManual(finalArray);
  calcularConteoVisual(finalArray);

  // RETAIL/BALANCEADO tienen HEAD real (fila 1) mientras PECUARIOS/CARNICOS
  // tienen fantasma (fila 2). Insertamos un fantasma de alineación encima de
  // cada HEAD real para que todas las cabezas queden en la misma fila.
  (function () {
    ["RETAIL", "BALANCEADO"].forEach(function (linea) {
      const headNode = finalArray.find((n) => String(n.id).startsWith("HEAD_LINEA_GRP_" + linea + "_"));
      if (!headNode || !headNode.stpid) return;
      const fantasmaId = "FANTASMA_HEAD_GRP_" + linea;
      finalArray.push({
        id: fantasmaId,
        stpid: headNode.stpid,
        pid: null,
        tags: ["fantasma"],
        template: "ghost",
        nombre: "",
        puesto: "",
        img: "",
        displayNombre: "",
      });
      headNode.stpid = null;
      headNode.pid = fantasmaId;
      const headSubLevel = Math.max(0, (headNode.order || 0) - 2 - 1);
      const newTags = (headNode.tags || [])
        .filter((t) => !/^sub-level-\d+$/.test(t) && t !== "sublevel-node")
        .concat([`sub-level-${headSubLevel}`]);
      if (headSubLevel > 0) newTags.push("sublevel-node");
      headNode.tags = newTags;
    });
  })();

  finalArray.forEach((node) => {
    if (!node.displayNombre) node.displayNombre = node.nombre || node.cargoPuesto || "";
  });

  finalArray.forEach((node) => {
    if (
      node.tags &&
      (node.tags.includes("group") || node.tags.includes("fantasma") || node.tags.includes("jefe-carniceria") || node.tags.includes("jefe-marketing") || node.tags.includes("jefe-derivados"))
    ) {
      return;
    }

    const directos = node._directos || 0;
    const total = node._total || 0;
    const esVacante = node.tags && node.tags.includes("vacante");
    const esComite = node.tags && node.tags.includes("comite");

    if (directos > 0) {
      if (directos === total) {
        node.tags.push(
          directos === 1
            ? esVacante
              ? "vacanteSingle"
              : esCargo
                ? "cargoSingle"
                : "fichaSingle"
            : esVacante
              ? "vacanteGroup"
              : esCargo
                ? "cargoGroup"
                : "fichaGroup",
        );
      } else {
        node.tags.push(esVacante ? "vacanteComplex" : esCargo ? "cargoComplex" : "fichaComplex");
      }
    } else {
      if (esVacante) node.tags.push("vacanteSimple");
      else if (esComite) node.tags.push(esCargo ? "comiteTemplateCargo" : "comiteTemplate");
    }
  });

  finalArray.forEach((node) => {
    delete node.state;
    node.expanded = false;
    // Balkan recuerda el estado collapsed por ID entre chart.load() — si
    // esto queda en null, cae al registro interno viejo aunque la data diga
    // otra cosa (confirmado por consola). Forzar collapsed:true explícito
    // acá + chart.load([]) antes de recargar en OrgChartCanvas.
    node.collapsed = true;
  });

  const hayFiltroEspecifico = lineaFiltro !== "TODOS";
  const nodosAExpandir = [
    "GRP_CORPORATIVO",
    "GRP_PECUARIOS",
    "GRP_CARNICOS",
    "GRP_DERIVADOS",
    "GRP_BALANCEADO",
    "GRP_RETAIL",
    "GRP_MARKETING",
  ];

  finalArray.forEach((node) => {
    if (!node.tags || !node.tags.includes("fantasma")) return;
    if (String(node.id).includes("CARNICERIA") && lineaFiltro !== "CARNICERIA") return;
    nodosAExpandir.push(node.id);
  });

  if (hayFiltroEspecifico) {
    const grpId = `GRP_${lineaFiltro.replace(/\s+/g, "_")}`;

    if (finalArray.some((n) => n.id === grpId)) {
      nodosAExpandir.push(grpId);
    }

    // El array declarativo expand.nodes camina hacia ARRIBA desde cada id
    // listado (nunca hacia abajo) para saltarse collapse.level=0 fijado en
    // el init del chart — eso es lo que hace visible a la cabeza misma, con
    // o sin sus hijos. CORPORATIVO/CARNICOS no usan este patrón HEAD_LINEA_*.
    if (lineaFiltro !== "CORPORATIVO" && lineaFiltro !== "CARNICOS") {
      const prefijoCabezaLinea = `HEAD_LINEA_${grpId}_`;
      const nodoCabezaLinea = finalArray.find((n) => String(n.id).startsWith(prefijoCabezaLinea));
      if (nodoCabezaLinea) {
        nodosAExpandir.push(nodoCabezaLinea.id);

        // CARNICERIA, DERIVADOS y MARKETING se muestran SOLO hasta la
        // cabeza, sin auto-expandir sus reportes directos.
        const revelarHijosDeLaCabeza =
          lineaFiltro !== "CARNICERIA" && lineaFiltro !== "DERIVADOS" && lineaFiltro !== "MARKETING";
        if (revelarHijosDeLaCabeza) {
          nodoCabezaLinea.expanded = true;
          finalArray
            .filter((n) => String(n.pid) === String(nodoCabezaLinea.id))
            .forEach((hijo) => nodosAExpandir.push(hijo.id));
        }
      }
    }

    // DERIVADOS: sin caja/HEAD_LINEA_* propio (gente suelta bajo Antonio).
    // Priscilla ya sale visible por ser hija directa de Antonio (ver
    // postCargaConReintento/corporativoExpandido) — no necesita mecanismo
    // propio, y sus reportes no se auto-expanden (igual que las demás).

    // Casos especiales sin HEAD_LINEA_* estándar: Carnicería (jefe-carniceria,
    // su fusión bajo Omar no deja rastro HEAD_LINEA_*) y Pecuarios (2 cabezas
    // colgando del fantasma).
    if (lineaFiltro === "CARNICERIA") {
      const jeanPierre = finalArray.find((n) => n.tags && n.tags.includes("jefe-carniceria"));
      if (jeanPierre) nodosAExpandir.push(jeanPierre.id);
    } else if (lineaFiltro === "PECUARIOS") {
      const fantasma = finalArray.find((n) => String(n.id).startsWith("HEAD_LINEA_GRP_PECUARIOS_"));
      if (fantasma) {
        finalArray
          .filter((n) => String(n.pid) === String(fantasma.id))
          .forEach((cabeza) => {
            finalArray.filter((n) => String(n.pid) === String(cabeza.id)).forEach((n) => nodosAExpandir.push(n.id));
          });
      }
    }
  }

  // Líneas de reporte visual (Presidente/Gerente General -> líneas de
  // negocio) — se inyectan en el evento render del chart, nunca via
  // chart.config.slinks (crashea antes de que existan todas las posiciones).
  const antonioParaSlink = finalArray.find(
    (n) => n.stpid === "GRP_CORPORATIVO" && !n.tags?.includes("comite") && !n.tags?.includes("left-partner"),
  );
  const antonioId = antonioParaSlink ? String(antonioParaSlink.id) : null;
  const slinks = [];
  if (antonioParaSlink) {
    if (corporativoExpandido && !nodosAExpandir.includes(antonioParaSlink.id)) {
      nodosAExpandir.push(antonioParaSlink.id);
    }

    if (finalArray.some((n) => n.id === "GRP_RETAIL")) {
      slinks.push({ from: antonioParaSlink.id, to: "GRP_RETAIL", color: "#27ae60", laneOffset: 40, routeRight: true });
    }
    const idSantiago = esCargo ? "00003" : "12";
    ["GRP_BALANCEADO", "GRP_CARNICOS", "GRP_PECUARIOS"].forEach((grpId) => {
      if (!finalArray.some((n) => n.id === grpId)) return;
      let toId = grpId;
      if (grpId !== "GRP_BALANCEADO") {
        const headPrefix = `HEAD_LINEA_${grpId}_`;
        const headNode = finalArray.find((n) => String(n.id).startsWith(headPrefix));
        if (headNode) toId = headNode.id;
      }
      slinks.push({ from: idSantiago, to: toId, fallbackTo: grpId, color: "#E74C3C", laneOffset: 70, routeLeft: true });
    });
    if (finalArray.some((n) => n.id === "GRP_CARNICERIA")) {
      const omarNode = finalArray.find(
        (n) => n.codPosicion === "00097" && !String(n.id).includes("HEAD_") && !String(n.id).includes("GRP_") && !String(n.id).includes("CLON_"),
      );
      if (omarNode) slinks.push({ from: omarNode.id, to: "GRP_CARNICERIA" });
    }
    if (finalArray.some((n) => n.id === "GRP_MARKETING")) {
      const retailHeadNode = finalArray.find((n) => String(n.id).startsWith("HEAD_LINEA_GRP_RETAIL_"));
      if (retailHeadNode) slinks.push({ from: retailHeadNode.id, to: "GRP_MARKETING" });
    }
  }

  // Orden de hermanos de RETAIL por orden de llegada del API (jefe-marketing
  // conserva su orden original y no entra en este re-orden). Solo aplica en
  // Persona: en Cargo pisaba el orderBy alfabético por cargoPuesto (los
  // hermanos quedaban en orden de llegada de empleado, no de título de
  // cargo).
  const _retailHead = mode === "Persona" && finalArray.find((n) => String(n.id).startsWith("HEAD_LINEA_GRP_RETAIL_"));
  if (_retailHead) {
    const _retailSiblings = finalArray.filter((n) => String(n.pid) === String(_retailHead.id) && n.id !== "GRP_MARKETING");
    _retailSiblings.sort((a, b) => {
      const ia = allNodes.findIndex((n) => String(n.id) === String(a.id));
      const ib = allNodes.findIndex((n) => String(n.id) === String(b.id));
      return ia - ib;
    });
    _retailSiblings.forEach((n, idx) => {
      n.order = idx;
    });
  }

  return { finalArray, nodosAExpandir, slinks, antonioId };
}
