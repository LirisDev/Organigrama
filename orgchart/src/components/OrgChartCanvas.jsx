import React, { Component } from "react";
import { registerTemplates, personaBinding, cargoBinding, buildTagsConfig } from "../orgchart/templates";
import { postCargaConReintento } from "../orgchart/expandLogic";

// Ícono de "Colapsar todo" (flechas hacia adentro) — Balkan no trae uno
// propio para esta acción, a diferencia de expand_all.
const COLLAPSE_ALL_ICON = `<svg fill="#7A7A7A" width="24px" height="24px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <path d="M11.493 8.757l-3.454-3.453-2.665 2.665 3.454 3.453-2.59 2.59 7.797 0.004-0.017-7.784-2.525 2.525zM23.172 11.422l3.454-3.453-2.665-2.665-3.454 3.453-2.525-2.525-0.017 7.784 7.797-0.004-2.59-2.59zM8.828 20.578l-3.454 3.453 2.665 2.665 3.454-3.453 2.526 2.525 0.017-7.784-7.797 0.004 2.589 2.59zM25.762 17.988l-7.797-0.004 0.017 7.784 2.525-2.525 3.454 3.453 2.665-2.665-3.454-3.453 2.59-2.59z"></path>
</svg>`;

// Wrapper de Balkan OrgChart Pro para React. Sigue el patrón class+ref del
// esqueleto original (myorg.js): la instancia de Balkan vive fuera del ciclo
// de vida de React, y se le empuja data nueva vía chart.load() en vez de
// re-renderizar JSX (Balkan dibuja directo en SVG dentro del div).
export default class OrgChartCanvas extends Component {
  constructor(props) {
    super(props);
    this.divRef = React.createRef();
    this.chart = null;
    // Overlay propio mientras el chart expande cabezas/fantasmas tras
    // load() — antes esa animación corría "detrás" sin aviso y se veía un
    // fogonazo de cajas colapsadas/ovaladas (template "min") antes de
    // llenarse. Se oculta recién cuando la secuencia completa termina
    // (onListo de postCargaConReintento), no apenas se llama chart.load().
    this.state = { chartBusy: true };
  }

  componentDidMount() {
    if (!this.divRef.current) return;
    this.createChart();

    // Botón de foco (target-icon en cada tarjeta, field_3 de los templates)
    // — mousedown en fase de captura + stopImmediatePropagation, igual que
    // la rama vanilla, para que no dispare también el click nativo de
    // Balkan (que abriría la ficha de detalle en el mismo click).
    this._handleFocusBtnMouseDown = (e) => {
      const focusBtn = e.target.closest("[data-focus-btn]");
      if (!focusBtn) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      const nodeId = focusBtn.getAttribute("data-focus-btn");
      if (this.props.isFocusMode && this.props.focusNodeId === nodeId) {
        this.props.onFocusNode(null);
      } else if (this.props.onFocusNode) {
        this.props.onFocusNode(nodeId);
      }
    };
    this.divRef.current.addEventListener("mousedown", this._handleFocusBtnMouseDown, true);
  }

  componentDidUpdate(prevProps) {
    if (!this.chart) return;
    if (prevProps.mode !== this.props.mode) this.applyModeBinding();
    const treeChanged = prevProps.tree !== this.props.tree;
    if (treeChanged) this.loadTree();
  }

  // Vista Persona/Cargo comparten chart e instancia — solo cambia el
  // template por defecto, el binding de campos y qué campos indexa el
  // buscador. Cada nodo ya trae su propio tag fichaXxx/cargoXxx (ver
  // buildTree), así que esto solo afecta al fallback sin tag específico.
  applyModeBinding() {
    const esCargo = this.props.mode === "Cargo";
    this.chart.config.template = esCargo ? "cargoTemplate" : "fichaTemplate";
    this.chart.config.nodeBinding = esCargo ? cargoBinding : personaBinding;
    if (esCargo) {
      this.chart.config.searchDisplayField = "displayNombre";
      this.chart.config.searchFields = ["displayNombre", "puestoCompleto"];
      this.chart.config.searchFieldsWeight = { displayNombre: 100, puestoCompleto: 80 };
    } else {
      this.chart.config.searchDisplayField = "displayNombre";
      this.chart.config.searchFields = ["displayNombre", "puesto"];
      this.chart.config.searchFieldsWeight = { displayNombre: 100, puesto: 95 };
    }
  }

  componentWillUnmount() {
    if (this.divRef.current && this._handleFocusBtnMouseDown) {
      this.divRef.current.removeEventListener("mousedown", this._handleFocusBtnMouseDown, true);
    }
    if (this.chart) {
      try {
        this.chart.destroy();
      } catch (e) {
        console.error("Error al destruir Balkan:", e);
      }
    }
  }

  // NOTA: existió acá un listener de "visibilitychange" que forzaba
  // loadTree() al volver de una pestaña en segundo plano, para evitar que
  // el _resizeObserver interno de Balkan quedara desincronizado (cajas de
  // línea vacías). Se quitó a pedido explícito en la rama vanilla — se
  // prefiere mantener las expansiones manuales del usuario al volver a la
  // pestaña, aunque eso reintroduce ese riesgo. Ver
  // 02 - Arquitectura#Listener de visibilitychange en la bóveda.

  createChart() {
    const OrgChart = window.OrgChart;
    registerTemplates();

    const tagsConfig = buildTagsConfig(OrgChart);
    const esCargo = this.props.mode === "Cargo";

    const chartConfig = {
      mouseScrool: OrgChart.action.scroll,
      showYScroll: true,
      showXScroll: true,
      enableSearch: true,
      searchFields: esCargo ? ["displayNombre", "puestoCompleto"] : ["displayNombre", "puesto"],
      searchDisplayField: "displayNombre",
      searchFieldsWeight: esCargo ? { displayNombre: 100, puestoCompleto: 80 } : { displayNombre: 100, puesto: 95 },
      template: esCargo ? "cargoTemplate" : "fichaTemplate",
      layout: OrgChart.normal,
      scaleInitial: OrgChart.match.boundary,
      enableAI: false,
      scaleMax: 1,
      scaleMin: 0.1,
      nodes: [],
      tags: tagsConfig,
      nodeBinding: esCargo ? cargoBinding : personaBinding,
      orderBy: [
        { field: "order", desc: false },
        { field: "puesto", desc: false },
        { field: "nombre", desc: false },
      ],
      // collapse.level se fija SOLO acá, en el constructor — reasignarlo
      // post-init (chart.config.collapse = ...) es un no-op silencioso.
      collapse: { level: 0, allChildren: true },
      expand: { nodes: [], allChildren: false },
      controls: {
        svg_export: { title: "Exportar a SVG" },
        zoom_in: { title: "Zoom In" },
        zoom_out: { title: "Zoom Out" },
        fit: { title: "Ajustar a la pantalla" },
        expandAll: {
          icon: OrgChart.icon.expand_all(24, 24, "#7A7A7A"),
          title: "Expandir todo",
          onClick: () => {
            this.chart.expand(null, "all");
            this.chart.fit();
          },
        },
        collapseAll: {
          icon: COLLAPSE_ALL_ICON,
          title: "Colapsar todo",
          onClick: () => {
            // Mismo patrón que loadTree()/loadFocusTree(): recargar desde
            // cero respeta el reset de collapsed por id (ver gotcha de
            // Balkan documentado arriba).
            this.loadTree();
          },
        },
        horizontalLayout: {
          icon: OrgChart.icon.layout_normal(24, 24, "#7A7A7A"),
          title: "Horizontal Layout",
          onClick: () => {
            this.chart.setOrientation(OrgChart.orientation.top, null, () => this.chart.fit());
          },
        },
        verticalLayout: {
          icon: OrgChart.icon.layout_left_offset(24, 24, "#7A7A7A"),
          title: "Vertical Layout",
          onClick: () => {
            this.chart.setOrientation(OrgChart.orientation.left, null, () => this.chart.fit());
          },
        },
      },
      // Exportar PDF/PNG vive en el menú hamburguesa (config distinta de
      // `controls`, que es la tira de íconos) — la tira solo trae SVG.
      menu: {
        pdf_export: { text: "Export PDF" },
        png_export: { text: "Export PNG" },
        svg_export: { text: "Export SVG" },
      },
      enableDragDrop: false,
      sortSubLevelsSeparately: true,
      compareSubLevels: { order: (a, b) => a.order - b.order },
      nodeExtent: { width: 250, height: 110 },
      nodeMenu: null,
      nodeSeparation: 65,
      siblingSeparation: 100,
      // Ficha de detalle (DetailModal, React) en vez del editUI genérico de
      // Balkan (dump crudo de campos) — Balkan llama a estos métodos
      // automáticamente en el click nativo del nodo (nodeMouseClick).
      editUI: {
        init: (instance) => {
          this._balkanInstance = instance;
        },
        show: (nodeId) => {
          const data = this._balkanInstance && this._balkanInstance.get(nodeId);
          if (!data) return;
          if (data.tags && (data.tags.includes("group") || data.tags.includes("fantasma"))) return;
          if (this.props.onShowDetail) this.props.onShowDetail(data);
        },
        hide: () => {
          if (this.props.onShowDetail) this.props.onShowDetail(null);
        },
      },
    };

    OrgChart.scroll.smooth = 2;
    OrgChart.scroll.speed = 10;
    OrgChart.SEARCH_PLACEHOLDER = "Buscar por nombre o cargo...";
    // Sin límite se veía una lista interminable con nombres comunes (ej.
    // "david") — con scroll interno (CSS) alcanza, pero igual se acota acá
    // la cantidad real de resultados calculados.
    OrgChart.SEARCH_RESULT_LIMIT = 15;

    this.chart = new OrgChart(this.divRef.current, chartConfig);

    // Buscador: centra y resalta sin recargar/reconstruir el árbol — mismo
    // patrón liviano que Modo Foco (chart.center + parentState:
    // COLLAPSE_PARENT abre solo los padres necesarios del resultado).
    this.chart.searchUI.on("searchclick", (sender, args) => {
      sender.hide();
      const targetNodeId = args.nodeId;
      this.chart.center(
        targetNodeId,
        { anim: true, duration: 500, parentState: OrgChart.COLLAPSE_PARENT },
        () => {
          const nodoDOM = this.divRef.current && this.divRef.current.querySelector(`[data-n-id="${targetNodeId}"]`);
          if (nodoDOM) {
            nodoDOM.classList.add("nodo-destacado");
            setTimeout(() => nodoDOM.classList.remove("nodo-destacado"), 8000);
          }
        },
      );
      return false;
    });

    // Contador (globo naranja) y mini-fotos de grupos colapsados.
    this.chart.on("field", (sender, args) => {
      if (args.name === "conteo") {
        if (args.value) {
          const x = args.node.w;
          const y = 0;
          args.value = `
            <g transform="translate(${x}, ${y})">
              <g transform="translate(-15, 15)">
                <circle r="25" fill="#e67e22" stroke="#ffffff" stroke-width="2"></circle>
                <text text-anchor="middle" y="5" fill="#ffffff" font-size="14px" font-weight="bold">${args.value}</text>
              </g>
            </g>`;
        } else {
          args.value = "";
        }
      }
    });

    // Bloquea expand/collapse por click en el botón nativo de GRP_CORPORATIVO.
    this.chart.on("expcollclick", (sender, isExpand, id) => {
      if (id === "GRP_CORPORATIVO") return false;
    });

    // Sincroniza expand/collapse de Antonio (Presidente) con la visibilidad
    // de las líneas de negocio (corporativoExpandido, estado del padre).
    this.chart.onExpandCollpaseButtonClick((args) => {
      const nodeId = args.id;
      if (this.props.antonioId && String(nodeId) === String(this.props.antonioId)) {
        if (this.props.onToggleCorporativo) this.props.onToggleCorporativo(!args.collapsing);
        return false;
      }
      return true;
    });

    // Garantiza que fichaGradient esté siempre en el SVG exportado.
    this.chart.on("renderdefs", (sender, args) => {
      if (!args.defs.includes("fichaGradient")) {
        args.defs +=
          '<linearGradient id="fichaGradient" x1="0%" y1="0%" x2="0%" y2="100%">' +
          '<stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1"/>' +
          '<stop offset="100%" style="stop-color:#FFEFFF;stop-opacity:1"/>' +
          "</linearGradient>";
      }
    });

    // Líneas de reporte visual (_slinksManuales), inyectadas como SVG en el
    // evento render — nunca via chart.config.slinks (crashea en
    // _setPositions antes de que todos los nodos tengan posición).
    this.chart.on("render", (sender, args) => {
      const slinks = this.props.slinks || [];
      if (slinks.length === 0) return;

      let svgLines = "";
      let sharedLaneLeftY = null;

      function resolveTarget(link) {
        let tn = sender.getNode(link.to);
        let offset = link.laneOffset || 30;
        if (link.fallbackTo) {
          const grpN = sender.getNode(link.fallbackTo);
          if (!tn || (grpN && grpN.min)) {
            tn = grpN;
            offset = link.fallbackLaneOffset != null ? link.fallbackLaneOffset : 12;
          }
        }
        return { tn, offset };
      }

      slinks
        .filter((l) => l.routeLeft)
        .forEach((l) => {
          const fn = sender.getNode(l.from);
          const { tn, offset } = resolveTarget(l);
          if (!fn || !tn) return;
          const candidate = tn.y - offset;
          if (sharedLaneLeftY === null || candidate > sharedLaneLeftY) sharedLaneLeftY = candidate;
        });

      slinks.forEach((link) => {
        const fromNode = sender.getNode(link.from);
        const { tn: toNode, offset: effectiveLaneOffset } = resolveTarget(link);
        if (!fromNode || !toNode) return;
        const fx = fromNode.x + fromNode.w / 2;
        const fy = fromNode.y + fromNode.h;
        const tx = toNode.x + toNode.w / 2;
        const ty = toNode.y;
        const laneY = ty - effectiveLaneOffset;
        const color = link.color || "#b0b0b0";
        let d;
        if (link.routeLeft) {
          const grpCorp = sender.getNode("GRP_CORPORATIVO");
          const leftX = grpCorp ? grpCorp.x - 30 : fx - 200;
          const dropY = fy + 30;
          const useLaneY = sharedLaneLeftY !== null ? sharedLaneLeftY : laneY;
          d = `M ${fx} ${fy} L ${fx} ${dropY} L ${leftX} ${dropY} L ${leftX} ${useLaneY} L ${tx} ${useLaneY} L ${tx} ${ty}`;
        } else if (link.routeRight) {
          const grpCorp = sender.getNode("GRP_CORPORATIVO");
          const rightX = grpCorp ? grpCorp.x + grpCorp.w + 30 : fx + 200;
          const dropY = fy + 55;
          if (tx >= rightX) {
            d = `M ${fx} ${fy} L ${fx} ${dropY} L ${tx} ${dropY} L ${tx} ${ty}`;
          } else {
            d = `M ${fx} ${fy} L ${fx} ${dropY} L ${rightX} ${dropY} L ${rightX} ${laneY} L ${tx} ${laneY} L ${tx} ${ty}`;
          }
        } else {
          d = `M ${fx} ${fy} L ${fx} ${laneY} L ${tx} ${laneY} L ${tx} ${ty}`;
        }
        svgLines += `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-opacity="0.75" stroke-linecap="round" stroke-linejoin="round"/>`;
      });

      // Prepend (string concat, no .push) para que las líneas queden detrás
      // de los nodos.
      args.content = svgLines + args.content;
    });

    if (this.props.tree && this.props.tree.finalArray.length > 0) {
      this.loadTree();
    }
  }

  loadTree() {
    const { tree, lineaFiltro, corporativoExpandido, isFocusMode, focusNodeId } = this.props;
    if (!this.chart || !tree) return;

    this.setState({ chartBusy: true });

    if (isFocusMode) {
      this.loadFocusTree(tree, focusNodeId);
      return;
    }

    this.chart.config.expand = { nodes: tree.nodosAExpandir, allChildren: false };
    this.chart.config.collapse = { level: 2, allChildren: true };
    // chart.load([]) vacío primero: Balkan recuerda el estado collapsed por
    // id entre cargas (confirmado por consola) — sin este vaciado, el
    // collapsed:true que ya viene explícito en tree.finalArray puede quedar
    // ignorado para ids reales y estables (ej. después de "Expandir Todo").
    this.chart.load([]);
    this.chart.load(tree.finalArray);

    setTimeout(
      () =>
        postCargaConReintento(
          this.chart,
          { antonioId: tree.antonioId, corporativoExpandido, lineaFiltro },
          6,
          () => this.setState({ chartBusy: false }),
        ),
      10,
    );
  }

  // Modo Foco: sin collapse (se muestra el subárbol completo tal cual lo
  // armó buildFocusTree), y el nodo objetivo se fuerza cerrado explícitamente
  // después de cargar — mismo patrón que la rama vanilla.
  loadFocusTree(tree, focusNodeId) {
    const OrgChart = window.OrgChart;
    this.chart.config.expand = { nodes: [], allChildren: false };
    this.chart.config.collapse = null;
    this.chart.load([]);
    this.chart.load(tree.finalArray);

    setTimeout(() => {
      try {
        const targetNode = this.chart.getNode(focusNodeId);
        if (targetNode) {
          this.chart.expandCollapse(focusNodeId, [], targetNode.childrenIds || [], () => {
            this.chart.center(focusNodeId, { anim: true, duration: 200, parentState: OrgChart.COLLAPSE_PARENT }, () =>
              this.setState({ chartBusy: false }),
            );
          });
        } else {
          this.chart.fit();
          this.setState({ chartBusy: false });
        }
      } catch (e) {
        console.warn("loadFocusTree: chart aún no listo", e);
        this.setState({ chartBusy: false });
      }
    }, 10);
  }

  render() {
    return (
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <div ref={this.divRef} style={{ width: "100%", height: "100%" }} />
        {this.state.chartBusy && (
          <div className="chart-busy-overlay">
            <div className="chart-busy-spinner" />
          </div>
        )}
      </div>
    );
  }
}
