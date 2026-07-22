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
    this.state = { chartBusy: true, hScrollNeeded: false, vScrollNeeded: false, controlsVisible: true };
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

    // Pedido: mientras un eje no tiene rango de scroll válido (el árbol
    // cabe completo ahí), no debería poder arrastrarse ese eje en
    // absoluto — Balkan calcula el paneo con e.clientX/clientY leídos en
    // cada mousemove relativos al punto donde arrancó el drag (no hay un
    // modo nativo "solo un eje"), así que se congela esa coordenada en el
    // evento ANTES de que el handler nativo de Balkan la lea: en captura,
    // sobre un ancestro de su propio nodo interno, así corre primero (
    // mismo patrón ya probado acá arriba con el botón de foco). _dragAxisLock
    // se recalcula en cada "redraw" del chart (ver createChart) leyendo
    // response.boundary — mismo criterio que ya usan el recentrado
    // automático y las flechas de scroll para decidir si un eje "cabe".
    this._dragAxisLock = { x: false, y: false };
    this._dragFrozen = null;
    // Pedido: el bloqueo debe aplicar arrancando el drag desde CUALQUIER
    // parte del lienzo — nodos/grupos incluidos, no solo el espacio en
    // blanco. Con enableDragDrop:false (ver chartConfig) Balkan no manda
    // el mousedown sobre un nodo a su manejador de "mover nodo" — cae al
    // mismo gesto de paneo que el fondo (_globalMouseDownHandler solo
    // desvía a esa otra rama si enableDragDrop/movable están activos), así
    // que no hace falta (ni conviene) distinguir el target acá.
    this._handleCanvasMouseDown = (e) => {
      this._dragFrozen = { x: e.clientX, y: e.clientY };
    };
    this._handleCanvasMouseMoveCapture = (e) => {
      const frozen = this._dragFrozen;
      const lock = this._dragAxisLock;
      if (!frozen || !lock || (!lock.x && !lock.y)) return;
      if (lock.x) Object.defineProperty(e, "clientX", { value: frozen.x, configurable: true });
      if (lock.y) Object.defineProperty(e, "clientY", { value: frozen.y, configurable: true });
    };
    this._handleCanvasMouseUp = () => {
      this._dragFrozen = null;
    };
    this.divRef.current.addEventListener("mousedown", this._handleCanvasMouseDown, true);
    this.divRef.current.addEventListener("mousemove", this._handleCanvasMouseMoveCapture, true);
    document.addEventListener("mouseup", this._handleCanvasMouseUp, true);
  }

  componentDidUpdate(prevProps) {
    if (!this.chart) return;
    if (prevProps.mode !== this.props.mode) this.applyModeBinding();

    const treeChanged = prevProps.tree !== this.props.tree;

    // Entrar/salir de Modo Foco, o cambiar de árbol MIENTRAS ya se está en
    // foco (ej. cambiar de foco de una persona a otra sin salir del modo):
    // destruir y recrear la instancia de Balkan en vez de reusarla.
    // chart.load([]) + chart.load(data) no alcanza acá — Balkan arrastra
    // estado interno (boundary/diff) del árbol anterior que deja nodos con
    // datos correctos (el conteo los cuenta bien) pero sin dibujar (paths
    // NaN en consola). Recrear de cero garantiza que no quede nada de la
    // carga anterior.
    if (prevProps.isFocusMode !== this.props.isFocusMode || (this.props.isFocusMode && treeChanged)) {
      if (this.chart) {
        try {
          this.chart.destroy();
        } catch (e) {
          console.error("Error al destruir Balkan al cambiar Modo Foco:", e);
        }
      }
      this.createChart();
      this.loadTree();
      return;
    }

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
    if (this._axisCorrectionTimer) clearTimeout(this._axisCorrectionTimer);
    if (this._focusCenterDebounce) clearTimeout(this._focusCenterDebounce);
    if (this.divRef.current && this._handleFocusBtnMouseDown) {
      this.divRef.current.removeEventListener("mousedown", this._handleFocusBtnMouseDown, true);
    }
    if (this.divRef.current && this._handleCanvasMouseDown) {
      this.divRef.current.removeEventListener("mousedown", this._handleCanvasMouseDown, true);
    }
    if (this.divRef.current && this._handleCanvasMouseMoveCapture) {
      this.divRef.current.removeEventListener("mousemove", this._handleCanvasMouseMoveCapture, true);
    }
    if (this._handleCanvasMouseUp) {
      document.removeEventListener("mouseup", this._handleCanvasMouseUp, true);
    }
    if (this._handleOutsideSearchClick) {
      document.removeEventListener("click", this._handleOutsideSearchClick);
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

  _insertarIconoBusqueda(intentosRestantes) {
    const container = this.divRef.current;
    if (!container || !this.chart) return;
    const searchElement = container.querySelector(".boc-search");
    const menuElement = container.querySelector("[data-ctrl-menu]");
    const searchInput = this.chart.searchUI && this.chart.searchUI.input;

    if (!searchElement || !menuElement || !searchInput) {
      if (intentosRestantes > 0) {
        setTimeout(() => this._insertarIconoBusqueda(intentosRestantes - 1), 100);
      }
      return;
    }
    if (container.querySelector("#custom-search-icon")) return;

    const searchIcon = document.createElement("div");
    searchIcon.id = "custom-search-icon";
    searchIcon.title = "Buscar";
    searchIcon.innerHTML =
      '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle>' +
      '<line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
    menuElement.parentNode.insertBefore(searchIcon, menuElement);

    searchIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = searchElement.classList.toggle("is-visible");
      if (isVisible) searchInput.focus();
    });

    this._handleOutsideSearchClick = (e) => {
      if (!searchElement.contains(e.target) && !searchIcon.contains(e.target)) {
        searchElement.classList.remove("is-visible");
      }
    };
    document.addEventListener("click", this._handleOutsideSearchClick);
  }

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
      orderBy: esCargo
        ? [
            { field: "order", desc: false },
            { field: "cargoPuesto", desc: false },
            { field: "nombre", desc: false },
          ]
        : [
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
            // Línea del fantasma de subnivel vertical (mismo eje que el
            // árbol top-down) — ver comentario en verticalLayout.
            OrgChart.templates.subLevel.node =
              '<line x1="125" y1="0" x2="125" y2="110" stroke="#aeaeae" stroke-width="1px"/>';
            this.chart.setOrientation(OrgChart.orientation.top, null, () => this.chart.fit());
          },
        },
        // verticalLayout: {
        //   icon: OrgChart.icon.layout_left_offset(24, 24, "#7A7A7A"),
        //   title: "Vertical Layout",
        //   onClick: () => {
        //     // El fantasma de subnivel (relleno cuando se saltan niveles
        //     // jerárquicos) dibuja una línea fija para que el conector se vea
        //     // continuo — con orientation.left el árbol crece hacia la
        //     // derecha, no hacia abajo, así que la línea tiene que ser
        //     // horizontal (mitad de la altura, todo el ancho) o se ven como
        //     // rayitas sueltas sin conectar nada.
        //     OrgChart.templates.subLevel.node =
        //       '<line x1="0" y1="55" x2="250" y2="55" stroke="#aeaeae" stroke-width="1px"/>';
        //     this.chart.setOrientation(OrgChart.orientation.left, null, () => this.chart.fit());
        //   },
        // },
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
          // GRPCARGO_* (cargo compartido, ver api.js) SÍ debe abrir el
          // modal — tiene listaEmpleados aunque cargue el tag "group"
          // (ese tag acá es solo para las cajas de línea de negocio, que
          // no representan personas).
          const esGrupoConEmpleados = Array.isArray(data.listaEmpleados) && data.listaEmpleados.length > 0;
          if (!esGrupoConEmpleados && data.tags && (data.tags.includes("group") || data.tags.includes("fantasma"))) {
            return;
          }
          if (this.props.onShowDetail) this.props.onShowDetail(data);
        },
        hide: () => {
          if (this.props.onShowDetail) this.props.onShowDetail(null);
        },
      },
    };

    OrgChart.scroll.smooth = 4;
    OrgChart.scroll.speed = 24;
    OrgChart.SEARCH_PLACEHOLDER = "Buscar por nombre o cargo...";
    // Sin límite se veía una lista interminable con nombres comunes (ej.
    // "david") — con scroll interno (CSS) alcanza, pero igual se acota acá
    // la cantidad real de resultados calculados.
    OrgChart.SEARCH_RESULT_LIMIT = 15;

    this.chart = new OrgChart(this.divRef.current, chartConfig);
    window.__chart = this.chart;

    // Ícono de lupa custom: el buscador nativo de Balkan (.boc-search) está
    // oculto por CSS por defecto — este botón lo alterna (toggle) y le pasa
    // el foco al abrir, igual que en vanilla. Balkan monta su propia UI
    // (menú de 3 rayas, input de búsqueda) de forma asíncrona — un solo
    // setTimeout corto puede correr antes de que exista, dejando el ícono
    // sin insertar; reintenta con backoff, mismo patrón que
    // postCargaConReintento.
    this._insertarIconoBusqueda(6);

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
      // En Modo Foco, el click en Antonio no debe caer acá — es su propia
      // tarjeta de foco (mostrarLineasDeHead), no el toggle de Corporativo
      // de la vista normal. Sin este guard, este branch interceptaba SIEMPRE
      // el click de Antonio (mismo id que antonioId) y hacía return false
      // antes de llegar al bloque de foco de abajo.
      if (
        !this.props.isFocusMode &&
        this.props.antonioId &&
        String(nodeId) === String(this.props.antonioId)
      ) {
        if (this.props.onToggleCorporativo) this.props.onToggleCorporativo(!args.collapsing);
        return false;
      }
      // Modo Foco sobre Santiago/Antonio: al expandir su tarjeta, avisar a
      // React (onExpandFocusHead) para que recargue el foco con su gente
      // real y la de sus líneas de negocio incluidas — ver headsExpandidos
      // en focus.js. Importante: NO llamar a ningún método de Balkan acá
      // mismo (expandCollapse, etc.) — eso reenganchaba este mismo evento en
      // bucle. Solo avisar y dejar que el expand normal de Balkan siga su
      // curso (return true, más abajo). Chequeo SOLO por codPosicion (no por
      // focusNodeId — lo cubre igual si el foco está justo en Santiago o
      // Antonio): usarlo también como condición aparte disparaba este aviso
      // para CUALQUIER empleado enfocado (ej. alguien de Cárnicos abriendo
      // su propia tarjeta), forzando un destroy+recreate innecesario del
      // chart que competía con la animación nativa de expand de Balkan y
      // rompía el redibujado (paths NaN en consola).
      if (this.props.isFocusMode) {
        // this.props.tree.finalArray (los datos que ARMAMOS nosotros, no lo
        // que Balkan devuelve internamente) — más confiable para leer
        // codPosicion que chart.getNode(), que puede no reflejar el campo
        // custom igual que la data original.
        const nodeData =
          this.props.tree && this.props.tree.finalArray
            ? this.props.tree.finalArray.find((n) => String(n.id) === String(nodeId))
            : null;
        const codPos = nodeData && (nodeData.codPosicion || nodeData.id);
        const esFantasma = nodeData && (nodeData.tags || []).includes("fantasma");
        const esSantiagoONaAntonio = !esFantasma && (codPos === "00003" || codPos === "00001");
        if (esSantiagoONaAntonio) {
          if (!args.collapsing && this.props.onExpandFocusHead) {
            this.props.onExpandFocusHead(nodeId);
          } else if (args.collapsing && this.props.onCollapseFocusHead) {
            // Al recolapsar, volver al estado sin sus líneas de negocio.
            this.props.onCollapseFocusHead(nodeId);
          }
          // Bloquear el toggle NATIVO de Balkan acá — dejarlo correr en
          // paralelo (return true) hacía que Balkan llevara su propio
          // collapsed interno por id, que diverge del árbol React (focus.js
          // borra collapsed en cada rebuild): tras el primer click, Balkan
          // quedaba con un estado propio que ya no coincidía, y en el
          // segundo click dejaba de reportar collapsing correctamente
          // (mismo problema ya documentado para otros nodos en
          // buildTree.js, sin parchear acá). Celia/Angie no dependen de
          // este collapse nativo de todos modos (siempre están en el árbol
          // de foco), así que bloquearlo no pierde nada.
          return false;
        }
      }
      return true;
    });

    // Pedido: cuando colapsar un nodo hace que la scrollbar vertical
    // desaparezca (el árbol restante ya "cabe"), pero el pan/zoom actual
    // seguía scrolleado hacia una zona que ya no tiene contenido, subir
    // automático lo justo para volver a ver algo.
    //
    // Intentos anteriores (leer chart.response.boundary con un delay fijo
    // o sondeando hasta que "se estabilice") daban falsos positivos: el
    // boundary podía leerse en un instante transitorio y producir saltos
    // absurdos (hasta el tope del árbol, o pantallas vacías) aunque
    // colapsar una rama chica no debería afectar nada.
    //
    // yScrollUI.setPosition() es la función de Balkan que DECIDE en el
    // momento correcto (al final de su propio ciclo de layout, no una
    // demora adivinada por nosotros) si la scrollbar debe ocultarse, y
    // publica un evento "change" con {isScrollBarVisible} exactamente en
    // ese instante — es la fuente de verdad de Balkan, no una
    // recreación nuestra del mismo cálculo con timing propio. Mismo
    // patrón que chart.searchUI.on(...) más abajo en este archivo.
    // Recentra cada eje de forma INDEPENDIENTE cuando ese eje no tiene
    // rango de scroll válido (contenido cabe completo ahí) — antes esto
    // solo corría cuando AMBOS ejes cabían a la vez, así que si el usuario
    // arrastraba en un eje sin scroll mientras el otro sí lo necesitaba
    // (ej. minimizado, imagen de referencia del pedido), quedaba
    // descentrado sin corrección. Reemplaza los dos handlers separados
    // (yScrollUI "change" + onRedraw horizontal) que había antes — un solo
    // handler en "redraw" cubre ambos ejes con la misma lógica.
    //
    // boundary.left/right (y top/bottom) vienen invertidos — left > right —
    // exactamente cuando ese eje cabe completo (sin rango de scroll
    // válido): se recentra al punto medio, SIN tocar la escala (chart.fit()
    // reencuadra Y cambia el zoom, pisando el zoom out que el usuario eligió
    // a propósito). Cuando no está invertido (hay rango real), se clampea
    // al borde más cercano si el viewBox quedó afuera — mismo cálculo que
    // OrgChart._moveToBoundaryArea (la corrección nativa de Balkan al
    // soltar un pan/drag), replicado acá porque necesitamos el caso
    // invertido que Balkan no maneja.
    const correctAxis = (val, b0, b1) => {
      if (!Number.isFinite(b0) || !Number.isFinite(b1)) return val;
      if (b0 > b1) return (b0 + b1) / 2;
      const lo = Math.min(b0, b1);
      const hi = Math.max(b0, b1);
      return Math.min(Math.max(val, lo), hi);
    };
    this.chart.onRedraw(() => {
      // Mientras chartBusy (secuencia de carga inicial: expandir
      // Corporativo/cabezas fantasma en postCargaConReintento) dispara
      // varios redraw intermedios con un boundary que todavía no es el
      // final — recentrar en esos instantes producía el salto brusco al
      // cargar. Se espera a que asiente.
      if (this._pendingFocusCenterId || this.state.chartBusy) return;
      // Pedido: al filtrar por línea de negocio, chart.fit() (llamado por
      // expandirFantasmas) ya centra bien, pero esto reaccionaba a un
      // "redraw" publicado DURANTE la propia animación de fit() — en ese
      // instante boundary ya es el final, pero el viewBox todavía está a
      // mitad de camino de esa animación, así que se calculaba una
      // corrección hacia un punto que competía con el destino real de
      // fit(): las dos animaciones (la de fit() y la nuestra) peleaban por
      // el mismo viewBox y el resultado quedaba descentrado. Se hace debounce:
      // solo corrige cuando los redraw dejan de llegar por un rato (fit(),
      // o cualquier animación nativa de Balkan, ya terminó de asentarse).
      if (this._axisCorrectionTimer) clearTimeout(this._axisCorrectionTimer);
      const delay = (this.chart.config.anim.duration || 300) + 100;
      this._axisCorrectionTimer = setTimeout(() => {
        this._axisCorrectionTimer = null;
        if (!this.chart || this._pendingFocusCenterId || this.state.chartBusy) return;
        const boundary = this.chart.response && this.chart.response.boundary;
        if (!boundary) return;
        const vb = this.chart.getViewBox();
        if (!Array.isArray(vb) || vb.length !== 4 || !vb.every(Number.isFinite)) return;
        const [x, y, w, h] = vb;
        if (w <= 0 || h <= 0) return;

        const newX = correctAxis(x, boundary.left, boundary.right);
        const newY = correctAxis(y, boundary.top, boundary.bottom);
        if (Math.abs(x - newX) < 1 && Math.abs(y - newY) < 1) return;
        OrgChart.animate(
          this.chart.getSvg(),
          { viewbox: vb },
          { viewbox: [newX, newY, w, h] },
          this.chart.config.anim.duration,
          this.chart.config.anim.func
        );
      }, delay);
    });

    // Pedido: mientras un eje no tiene rango de scroll válido (cabe
    // completo), no debería poder arrastrarse ahí en absoluto — el fix de
    // arriba ya lo recentra al soltar, pero el usuario pidió bloquear el
    // drag mismo, no solo corregirlo después. _dragAxisLock se recalcula acá
    // en cada redraw (mismo criterio que el recentrado de arriba); el
    // congelado de e.clientX/clientY que efectivamente bloquea el drag vive
    // en componentDidMount (_handleCanvasMouseDown/MoveCapture) — atado ahí
    // una sola vez, no por cada recreación del chart, para no acumular
    // listeners duplicados en el destroy/recreate de Modo Foco.
    const recomputeDragAxisLock = () => {
      const boundary = this.chart.response && this.chart.response.boundary;
      this._dragAxisLock = {
        x: !boundary || !(boundary.left < boundary.right),
        y: !boundary || !(boundary.top < boundary.bottom),
      };
    };
    this.chart.onRedraw(recomputeDragAxisLock);
    recomputeDragAxisLock();

    // Modo Foco: el center() sobre el nodo objetivo no puede correr
    // inmediatamente en el callback (sincrónico) de expandCollapse — en ese
    // instante el boundary/response de Balkan todavía puede ser el del
    // árbol anterior (mucho más grande), y Balkan calcula mal qué nodos
    // dibujar: el resultado es Corporativo con la caja pero sin Santiago
    // adentro (dato bien contado, nada renderizado). Igual que el fix de
    // scroll de arriba, esperar a "redraw" (layout ya asentado) antes de
    // centrar.
    this.chart.onRedraw(() => {
      if (!this._pendingFocusCenterId) return;
      // Pedido: con focos que revelan un subárbol grande (varios hijos
      // directos con sus propios hijos, no solo el nodo colapsado de
      // antes), el layout de Balkan sigue asentando en MÁS de un "redraw"
      // — centrar/ajustar en el primero que llega usaba un boundary
      // todavía parcial y quedaba cortado; un segundo fit() fijo más
      // adelante lo corregía, pero como salto extra visible (fit() ya
      // había animado a un lugar, y de nuevo a otro). En vez de un doble
      // ajuste a ciegas, se espera (debounce) a que los redraw dejen de
      // llegar — recién ahí el layout está total y completamente asentado
      // — y se centra/ajusta una sola vez.
      if (this._focusCenterDebounce) clearTimeout(this._focusCenterDebounce);
      this._focusCenterDebounce = setTimeout(() => {
        this._focusCenterDebounce = null;
        if (!this._pendingFocusCenterId) return;
        const id = this._pendingFocusCenterId;
        this._pendingFocusCenterId = null;
        this.chart.center(id, { anim: true, duration: 200, parentState: OrgChart.COLLAPSE_PARENT }, () => {
          // Pedido: que quede igual que si el usuario le diera al botón
          // "Ajustar" (fit real, ve todo el árbol enfocado) — center() solo
          // encuadra el nodo objetivo y puede dejar Corporativo fuera de
          // vista.
          try {
            this.chart.fit();
          } catch (e) {
            console.warn("Modo Foco: fit() aún no listo", e);
          }
          this.setState({ chartBusy: false });
        });
      }, 120);
    });

    // Pedido: las flechas de navegación (arriba) deben desaparecer cuando
    // no hace falta scroll en ese eje — mismo criterio que Balkan usa para
    // ocultar su propia barra (bar.scrollWidth/Height > clientWidth/Height,
    // ver xScrollUI/yScrollUI.setPosition en el vendor). Se chequea en cada
    // redraw (zoom, pan, expand/collapse, load) para que aparezcan/
    // desaparezcan en el momento justo, no solo al cargar.
    this.chart.onRedraw(() => {
      const xbar = this.chart.xScrollUI && this.chart.xScrollUI.bar;
      const ybar = this.chart.yScrollUI && this.chart.yScrollUI.bar;
      const hScrollNeeded = !!xbar && xbar.scrollWidth - xbar.clientWidth > 1;
      const vScrollNeeded = !!ybar && ybar.scrollHeight - ybar.clientHeight > 1;
      if (hScrollNeeded !== this.state.hScrollNeeded || vScrollNeeded !== this.state.vScrollNeeded) {
        this.setState({ hScrollNeeded, vScrollNeeded });
      }
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

      // Ruteo generalizado a dos ejes lógicos para que funcione tanto en
      // orientation.top (vertical, default) como en orientation.left
      // (cascada horizontal, botón "Vertical Layout"): "along" es el eje en
      // el que crece el árbol (Y en vertical, X en horizontal) y "cross" es
      // el perpendicular (X en vertical, Y en horizontal). Portado 1:1 de
      // organigrama-lineasNegocio.
      const esHorizontal = sender.config.orientation === OrgChart.orientation.left;

      const along = (pt) => (esHorizontal ? pt.x : pt.y);
      const cross = (pt) => (esHorizontal ? pt.y : pt.x);
      const crossSize = (n) => (esHorizontal ? n.h : n.w);
      const alongSize = (n) => (esHorizontal ? n.w : n.h);
      const pt = (alongVal, crossVal) => (esHorizontal ? { x: alongVal, y: crossVal } : { x: crossVal, y: alongVal });
      const nodeBack = (n) => (esHorizontal ? { x: n.x + n.w, y: n.y + n.h / 2 } : { x: n.x + n.w / 2, y: n.y + n.h });
      const nodeFront = (n) => (esHorizontal ? { x: n.x, y: n.y + n.h / 2 } : { x: n.x + n.w / 2, y: n.y });

      let svgLines = "";
      let sharedLaneAlong = null;

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
          const candidate = along(nodeFront(tn)) - offset;
          if (sharedLaneAlong === null || candidate > sharedLaneAlong) sharedLaneAlong = candidate;
        });

      slinks.forEach((link) => {
        const fromNode = sender.getNode(link.from);
        const { tn: toNode, offset: effectiveLaneOffset } = resolveTarget(link);
        if (!fromNode || !toNode) return;

        const fromPt = nodeBack(fromNode);
        const toPt = nodeFront(toNode);
        const fAlong = along(fromPt);
        const fCross = cross(fromPt);
        const tAlong = along(toPt);
        const tCross = cross(toPt);
        const laneAlong = tAlong - effectiveLaneOffset;
        const color = link.color || "#b0b0b0";

        const grpCorp = sender.getNode("GRP_CORPORATIVO");
        const corpCrossStart = grpCorp ? cross({ x: grpCorp.x, y: grpCorp.y }) : null;
        const corpCrossEnd = grpCorp ? corpCrossStart + crossSize(grpCorp) : null;

        let puntos;
        if (link.straight) {
          // Filtro de una sola línea de Santiago: sin otras líneas con las
          // que compartir carril, alcanza con un escalón simple — baja hasta
          // el espacio en blanco debajo del borde de Corporativo, salta al
          // eje cruzado del destino, y baja el resto. Pedido: el tramo
          // horizontal no debe quedar pegado al borde de la caja Corporativo
          // (30px se solapaba con la línea divisoria) — usar el fondo real
          // de GRP_CORPORATIVO + margen. Con origen/destino alineados (ej.
          // BALANCEADO) los 4 puntos caen en línea recta sin verse el escalón.
          const corpAlongEnd = grpCorp ? along({ x: grpCorp.x, y: grpCorp.y }) + alongSize(grpCorp) : null;
          const dropAlong = corpAlongEnd !== null ? corpAlongEnd + 40 : fAlong + 90;
          puntos = [pt(fAlong, fCross), pt(dropAlong, fCross), pt(dropAlong, tCross), pt(tAlong, tCross)];
        } else if (link.routeLeft) {
          const crossBound = corpCrossStart !== null ? corpCrossStart - 30 : fCross - 200;
          const dropAlong = fAlong + 30;
          const useLaneAlong = sharedLaneAlong !== null ? sharedLaneAlong : laneAlong;
          puntos = [
            pt(fAlong, fCross),
            pt(dropAlong, fCross),
            pt(dropAlong, crossBound),
            pt(useLaneAlong, crossBound),
            pt(useLaneAlong, tCross),
            pt(tAlong, tCross),
          ];
        } else if (link.routeRight) {
          const crossBound = corpCrossEnd !== null ? corpCrossEnd + 30 : fCross + 200;
          const dropAlong = fAlong + 55;
          if (tCross >= crossBound) {
            puntos = [pt(fAlong, fCross), pt(dropAlong, fCross), pt(dropAlong, tCross), pt(tAlong, tCross)];
          } else {
            puntos = [
              pt(fAlong, fCross),
              pt(dropAlong, fCross),
              pt(dropAlong, crossBound),
              pt(laneAlong, crossBound),
              pt(laneAlong, tCross),
              pt(tAlong, tCross),
            ];
          }
        } else {
          puntos = [pt(fAlong, fCross), pt(laneAlong, fCross), pt(laneAlong, tCross), pt(tAlong, tCross)];
        }

        const d = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        svgLines += `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-opacity="0.75" stroke-linecap="round" stroke-linejoin="round"/>`;
      });

      // Prepend (string concat, no .push) para que las líneas queden detrás
      // de los nodos.
      args.content = svgLines + args.content;
    });

    // Minimizar/maximizar Cárnicos y Pecuarios: click en la caja colapsa el
    // subárbol a un badge con conteo + grid de mini-fotos. Solo tiene
    // sentido con "Todas las Líneas" activo y en Vista Persona — con un
    // filtro puntual o en Cargo, minimizar oculta la vista que el usuario
    // pidió ver.
    const GRUPOS_COLAPSABLES = ["GRP_CARNICOS", "GRP_PECUARIOS"];
    this.chart.on("click", (sender, args) => {
      if (!GRUPOS_COLAPSABLES.includes(args.node.id)) return;
      if (this.props.mode === "Cargo") return;
      if ((this.props.lineaFiltro || "TODOS") !== "TODOS") return;
      if (args.node.min) {
        sender.maximize(args.node.id);
      } else {
        sender.minimize(args.node.id);
      }
      return false;
    });

    // Badge de conteo + grid de mini-fotos cuando una de esas cajas está
    // minimizada — usa el mismo `conteo` ya calculado por calcularConteoVisual
    // (evita duplicar el conteo con un segundo traversal propio) y recorre
    // chart.config.nodes (datos, no posiciones) para las fotos, así funciona
    // con la caja colapsada.
    this.chart.on("render", (sender, args) => {
      let extra = "";
      GRUPOS_COLAPSABLES.forEach((groupId) => {
        const grpNode = sender.getNode(groupId);
        if (!grpNode || !grpNode.min) return;

        const count = grpNode.conteo;
        if (count) {
          const bx = grpNode.x + grpNode.w;
          const by = grpNode.y;
          extra +=
            `<g transform="translate(${bx},${by})">` +
            '<circle r="22" fill="#F57C00" stroke="#ffffff" stroke-width="2.5"/>' +
            `<text text-anchor="middle" dominant-baseline="central" fill="#ffffff" style="font-size:13px;font-weight:bold;">${count}</text>` +
            "</g>";
        }

        const personIds = [];
        const allConfigNodes = this.chart.config.nodes || [];
        const collectPeople = (nodeId) => {
          if (personIds.length >= 6) return;
          const sid = String(nodeId);
          const data = sender.get(nodeId);
          if (!data) return;
          const isSkip = sid.startsWith("HEAD_") || sid.startsWith("GRP_") || (data.tags && data.tags.includes("fantasma"));
          if (isSkip) {
            allConfigNodes
              .filter((n) => String(n.stpid) === sid || String(n.pid) === sid)
              .forEach((n) => collectPeople(n.id));
          } else {
            personIds.push(nodeId);
          }
        };
        allConfigNodes
          .filter((n) => String(n.stpid) === groupId || String(n.pid) === groupId)
          .forEach((n) => collectPeople(n.id));

        const pCount = Math.min(personIds.length, 6);
        if (pCount === 0) return;
        const imgW = 55;
        const gap = 8;
        const row1 = Math.min(pCount, 3);
        const row2 = pCount - row1;
        const totalRows = row2 > 0 ? 2 : 1;
        const totalH = totalRows * imgW + (totalRows - 1) * gap;
        const titleH = 20;
        const areaTop = grpNode.y + titleH;
        const areaH = grpNode.h - titleH;
        const baseY = areaTop + areaH / 2 - totalH / 2;
        const row1W = row1 * imgW + (row1 - 1) * gap;
        const row1X = grpNode.x + grpNode.w / 2 - row1W / 2;
        const row2W = row2 * imgW + (row2 - 1) * gap;
        const row2X = grpNode.x + grpNode.w / 2 - row2W / 2;

        let defs = "<defs>";
        for (let i = 0; i < pCount; i++) {
          const row = i < row1 ? 0 : 1;
          const col = i < row1 ? i : i - row1;
          const startX = row === 0 ? row1X : row2X;
          const cx = startX + col * (imgW + gap) + imgW / 2;
          const cy = baseY + row * (imgW + gap) + imgW / 2;
          defs += `<clipPath id="cpgrp-${groupId}-${i}"><circle cx="${cx}" cy="${cy}" r="${imgW / 2}"/></clipPath>`;
        }
        defs += "</defs>";
        extra += defs;

        for (let i = 0; i < pCount; i++) {
          const data = sender.get(personIds[i]);
          if (data && data.img) {
            const row = i < row1 ? 0 : 1;
            const col = i < row1 ? i : i - row1;
            const startX = row === 0 ? row1X : row2X;
            const x = startX + col * (imgW + gap);
            const y = baseY + row * (imgW + gap);
            extra +=
              `<image href="${data.img}" x="${x}" y="${y}" width="${imgW}" height="${imgW}" ` +
              `preserveAspectRatio="xMidYMid slice" clip-path="url(#cpgrp-${groupId}-${i})"/>`;
          }
        }
      });
      if (extra) args.content += extra;
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
    // tree.nodosAExpandir: normalmente vacío, pero focus.js lo usa para las
    // cajas de línea de negocio colgadas de Santiago/Antonio (ver ahí) —
    // Balkan ignora el collapsed:false que le mandamos en los datos (lo
    // recalcula solo al cargar), así que forzar el expand de esos ids acá
    // es lo único que efectivamente los muestra sin "Expandir Todo".
    this.chart.config.expand = { nodes: tree.nodosAExpandir || [], allChildren: false };
    this.chart.config.collapse = null;
    this.chart.load([]);
    this.chart.load(tree.finalArray);

    setTimeout(() => this._intentarExpandirFoco(tree, focusNodeId, 6), 10);
  }

  // chart.getNode() lanza excepción (no devuelve null) si Balkan aún no
  // terminó de inicializar su registro interno tras el load — mismo gotcha
  // documentado en postCargaConReintento (expandLogic.js), acá reintentado
  // con el mismo patrón porque loadFocusTree no pasaba por esa función.
  // Sin retry, un focus sobre un nodo con muchos hijos (ej. Evelyn Aranea,
  // ~14 reportes) podía caer justo en esa ventana y dejar la pantalla en
  // blanco (warning en consola, chartBusy en false, nada dibujado).
  _intentarExpandirFoco(tree, focusNodeId, intentosRestantes) {
    try {
      const targetNode = this.chart.getNode(focusNodeId);
      // Si focusNodeId ya viene en nodosAExpandir (caso Santiago/Antonio
      // con mostrarLineasDeHead=true, ver focus.js), NO tocar su estado
      // acá — pisaría el expand recién cargado y las líneas de negocio
      // quedarían sin sus hijos reales sincronizados.
      const debeQuedarExpandido = (tree.nodosAExpandir || []).includes(focusNodeId);
      // Santiago/Antonio como objetivo DIRECTO del foco: su expand/collapse
      // lo gobierna 100% headsExpandidos/nodosAExpandir (ver focus.js), no
      // este auto-expand genérico de "mostrar hijos directos al entrar en
      // foco" — sin este freno, CADA reload (incluido el que dispara el
      // click de colapsar su propia tarjeta) volvía a abrir a Celia/Angie
      // acá, pisando el collapse recién pedido.
      const nodeData =
        tree && tree.finalArray ? tree.finalArray.find((n) => String(n.id) === String(focusNodeId)) : null;
      const codPosTarget = nodeData && (nodeData.codPosicion || nodeData.id);
      const esFantasmaTarget = nodeData && (nodeData.tags || []).includes("fantasma");
      const esHeadTarget = !esFantasmaTarget && (codPosTarget === "00003" || codPosTarget === "00001");
      if (targetNode && !debeQuedarExpandido) {
        // Pedido: el foco arranca mostrando los hijos DIRECTOS del
        // objetivo (antes se colapsaban, requería un click para verlos).
        // Los nietos quedan ocultos solos — un nodo recién cargado sin
        // haber sido tocado por expandCollapse/nodosAExpandir arranca
        // colapsado por default (confirmado empíricamente: el hijo de un
        // nodo sin este expand explícito se ve con badge de conteo, no
        // sus propios hijos) — no hace falta colapsarlos a mano.
        // Excepción: Santiago/Antonio como objetivo directo y colapsado a
        // propósito (esHeadTarget) — NO expandir sus hijos acá (headsSet
        // manda), pero SIGUE haciendo falta el center()/fit() de abajo o
        // queda en blanco (mismo caso ya documentado para "sin hijos").
        const childIds = esHeadTarget ? [] : targetNode.childrenIds || [];
        // El center() real corre desde el listener de "redraw" en
        // createChart (_pendingFocusCenterId) — ver comentario ahí.
        if (childIds.length > 0) {
          this.chart.expandCollapse(focusNodeId, childIds, [], () => {
            this._pendingFocusCenterId = focusNodeId;
          });
        } else {
          // Sin hijos: no hay ningún expandCollapse/expand que dispare un
          // "redraw" propio — confirmado que en ese caso NO alcanza con
          // solo marcar _pendingFocusCenterId y esperar (a diferencia de
          // Santiago/Antonio, que si bien tampoco llaman expandCollapse acá,
          // SÍ vienen de un chart.config.expand con ids reales al cargar,
          // que sí dispara redraw): quedaba en blanco, nada dibujado.
          // Se llama center() de una para garantizar que algo se dibuje —
          // pero el fit() final NO se hace en su callback (eso corría
          // antes de que Balkan asentara el boundary del árbol recién
          // cargado, dejándolo sin ajustar) — en cambio se marca
          // _pendingFocusCenterId ahí, para que el fit() real lo haga el
          // listener de "redraw" con su propio debounce, una vez asentado.
          const parentState = window.OrgChart && window.OrgChart.COLLAPSE_PARENT;
          this.chart.center(focusNodeId, { anim: true, duration: 200, parentState }, () => {
            this._pendingFocusCenterId = focusNodeId;
          });
        }
      } else if (targetNode) {
        this._pendingFocusCenterId = focusNodeId;
      } else {
        this.chart.fit();
        this.setState({ chartBusy: false });
      }
    } catch (e) {
      if (intentosRestantes > 0) {
        setTimeout(() => this._intentarExpandirFoco(tree, focusNodeId, intentosRestantes - 1), 75);
        return;
      }
      console.warn("loadFocusTree: chart aún no listo", e);
      this.setState({ chartBusy: false });
      return;
    }
    // Fallback si "redraw" nunca llega (ej. chart no montado).
    setTimeout(() => {
      if (!this._pendingFocusCenterId) return;
      this._pendingFocusCenterId = null;
      this.chart.fit();
      this.setState({ chartBusy: false });
    }, 500);
  }

  // Flechas de navegación, ancladas en las puntas de las barras de scroll
  // X/Y de Balkan (custom-drawn, no hay scrollbar nativa del navegador a la
  // que engancharse — pedido explícito de no agregar un botón nuevo
  // "flotante", así que se estilizan como continuación de esas barras en
  // vez de un control aparte).
  //
  // xScrollUI.bar/yScrollUI.bar SON divs con overflow-x/y:scroll reales
  // (Balkan usa la scrollbar nativa del navegador puertas adentro de un div
  // recortado a 20px, no algo dibujado a mano) — mover el viewBox del SVG a
  // mano (OrgChart.animate directo, como se hacía antes) no toca
  // bar.scrollLeft/Top, así que la barra se quedaba quieta y chart.response
  // (el estado interno de Balkan) desincronizado. La forma correcta es
  // mover el scroll nativo del bar: su propio listener "scroll" (registrado
  // por Balkan en xScrollUI/yScrollUI.addListener) traduce eso a viewBox Y
  // mantiene su estado interno consistente — misma fuente única que un
  // drag manual de esa barra.
  panHorizontal(direction) {
    const bar = this.chart && this.chart.xScrollUI && this.chart.xScrollUI.bar;
    if (!bar) return;
    const maxScroll = bar.scrollWidth - bar.clientWidth;
    if (maxScroll <= 0) return;
    const step = bar.clientWidth * 0.4;
    const target = Math.min(Math.max(bar.scrollLeft + direction * step, 0), maxScroll);
    bar.scrollTo({ left: target, behavior: "smooth" });
  }

  panVertical(direction) {
    const bar = this.chart && this.chart.yScrollUI && this.chart.yScrollUI.bar;
    if (!bar) return;
    const maxScroll = bar.scrollHeight - bar.clientHeight;
    if (maxScroll <= 0) return;
    const step = bar.clientHeight * 0.4;
    const target = Math.min(Math.max(bar.scrollTop + direction * step, 0), maxScroll);
    bar.scrollTo({ top: target, behavior: "smooth" });
  }

  render() {
    const { isFocusMode, focusNodeId } = this.props;
    const { controlsVisible } = this.state;
    return (
      <div
        className={controlsVisible ? undefined : "chart-controls-hidden"}
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        {/* Pedido: el botón de foco (target-icon) de la persona actualmente
            enfocada se resalta en rojo, para distinguirla del resto —
            CSS en vez de tocar los templates SVG de Balkan (cada template
            trae su propio color de fondo hardcodeado en field_3). */}
        {isFocusMode && focusNodeId && (
          <style>{`[data-focus-btn="${focusNodeId}"] rect:first-child { fill: #E74C3C !important; }`}</style>
        )}
        <div ref={this.divRef} style={{ width: "100%", height: "100%" }} />
        {this.state.hScrollNeeded && (
          <>
            <button
              type="button"
              className="chart-hscroll-arrow chart-hscroll-arrow--left"
              title="Desplazar a la izquierda"
              onClick={() => this.panHorizontal(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="chart-hscroll-arrow chart-hscroll-arrow--right"
              title="Desplazar a la derecha"
              onClick={() => this.panHorizontal(1)}
            >
              ›
            </button>
          </>
        )}
        {this.state.vScrollNeeded && (
          <>
            <button
              type="button"
              className="chart-vscroll-arrow chart-vscroll-arrow--up"
              title="Desplazar hacia arriba"
              onClick={() => this.panVertical(-1)}
            >
              <span>‹</span>
            </button>
            <button
              type="button"
              className="chart-vscroll-arrow chart-vscroll-arrow--down"
              title="Desplazar hacia abajo"
              onClick={() => this.panVertical(1)}
            >
              <span>›</span>
            </button>
          </>
        )}
        {this.state.chartBusy && (
          <div className="chart-busy-overlay">
            <div className="chart-busy-spinner" />
          </div>
        )}
        {/* Pedido: botón propio en el lugar de la tira de controles de
            Balkan (.boc-controls) que la muestra/oculta — CSS empuja esa
            tira hacia arriba (chart-controls-hidden en el wrapper) y este
            botón queda fijo abajo en su lugar, como si fuera "el último
            botón" de esa tira. */}
        <button
          type="button"
          className="chart-controls-toggle"
          title={controlsVisible ? "Ocultar controles" : "Mostrar controles"}
          onClick={() => this.setState((s) => ({ controlsVisible: !s.controlsVisible }))}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            style={{ transform: controlsVisible ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
          >
            <path d="M7 10l5 5 5-5" fill="none" stroke="#7A7A7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  }
}
