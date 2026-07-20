import React, { useState, useEffect, useMemo } from "react";
import { fetchPersonaData } from "./data/api";
import { fetchCargoData } from "./data/apiCargo";
import { API_URL_PERSONA, API_URL_CARGO } from "./config/cabezasNegocio";
import { buildTree } from "./orgchart/buildTree";
import { buildFocusTree } from "./orgchart/focus";
import OrgChartCanvas from "./components/OrgChartCanvas";
import FilterBar from "./components/FilterBar";
import DetailModal from "./components/DetailModal";
import "./App.css";

export default function App() {
  const [modo, setModo] = useState("Persona");
  const [allNodes, setAllNodes] = useState([]);
  const [allCargoNodes, setAllCargoNodes] = useState([]);
  const [cargoLoaded, setCargoLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lineaFiltro, setLineaFiltro] = useState("todos");
  // Las líneas de negocio arrancan visibles (colgando de Corporativo); se
  // ocultan/muestran al expandir/colapsar el nodo de Antonio (Presidente).
  const [corporativoExpandido, setCorporativoExpandido] = useState(true);
  const [detailNode, setDetailNode] = useState(null);
  const [focusNodeId, setFocusNodeId] = useState(null);
  // Foco sobre Santiago/Antonio: sus líneas de negocio (ver buildFocusTree)
  // aparecen colapsadas (solo el conteo) hasta que el usuario expande su
  // tarjeta — Balkan ignora el collapsed:false de los datos, así que se
  // dispara un re-render con más data en vez de pelear con su
  // expand/collapse. Set de ids (no un solo boolean): dentro del foco de
  // Antonio, Santiago puede expandirse por separado y revelar sus propias
  // líneas sin perder las de Antonio.
  const [expandedHeadIds, setExpandedHeadIds] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const nodes = await fetchPersonaData(API_URL_PERSONA);
        if (!cancelled) setAllNodes(nodes);
      } catch (err) {
        console.error("Error cargando organigrama:", err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Vista Cargo se carga recién al entrar a ella (y solo una vez, igual que
  // isCargoDataReady en la rama vanilla) — evita pagar el costo del fetch
  // extra si el usuario nunca cambia de modo.
  useEffect(() => {
    if (modo !== "Cargo" || cargoLoaded) return;
    let cancelled = false;
    async function loadCargo() {
      try {
        setLoading(true);
        setError(null);
        const nodes = await fetchCargoData(API_URL_CARGO);
        if (!cancelled) {
          setAllCargoNodes(nodes);
          setCargoLoaded(true);
        }
      } catch (err) {
        console.error("Error cargando vista de Cargo:", err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCargo();
    return () => {
      cancelled = true;
    };
  }, [modo, cargoLoaded]);

  // Al cambiar de modo, la línea de negocio filtrada puede no existir en el
  // otro dataset (ids/valores distintos) y el foco/detalle apuntan a nodos
  // del árbol anterior — se resetean, igual que el flujo de $("#modo-select")
  // en la rama vanilla.
  function cambiarModo(nuevoModo) {
    if (nuevoModo === modo) return;
    setModo(nuevoModo);
    setLineaFiltro("todos");
    setFocusNodeId(null);
    setDetailNode(null);
  }

  const sourceNodes = modo === "Cargo" ? allCargoNodes : allNodes;

  const tree = useMemo(() => {
    if (sourceNodes.length === 0) return null;
    return buildTree({ allNodes: sourceNodes, lineaFiltro, corporativoExpandido, mode: modo });
  }, [sourceNodes, lineaFiltro, corporativoExpandido, modo]);

  // Modo Foco opera sobre el árbol YA construido (tree.finalArray), no sobre
  // allNodes crudo — así conserva fusiones/clones/estilos jefe-* que solo
  // existen después de buildTree(). Si el usuario sale del foco, simplemente
  // se vuelve a mostrar `tree` (no hace falta guardar una "foto" aparte,
  // React ya lo tiene memoizado).
  const focusTree = useMemo(() => {
    if (!focusNodeId || !tree) return null;
    return buildFocusTree(tree.finalArray, focusNodeId, Array.from(expandedHeadIds));
  }, [focusNodeId, tree, expandedHeadIds]);

  function cambiarFocusNodeId(nuevoId) {
    setFocusNodeId(nuevoId);
    setExpandedHeadIds(new Set());
  }

  const displayTree = focusTree || tree;

  if (loading) {
    return (
      <div id="chart-loader-overlay" className="visible">
        <div className="loader-spinner" />
        <div id="loader-text">Cargando Organigrama...</div>
      </div>
    );
  }

  if (error) {
    return <div id="error-message">Error: {error}</div>;
  }

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <FilterBar
        allNodes={sourceNodes}
        value={lineaFiltro}
        onChange={setLineaFiltro}
        disabled={Boolean(focusNodeId)}
        modo={modo}
        onModoChange={cambiarModo}
      />
      {focusNodeId && (
        <div className="focus-banner">
          🎯 Modo Foco Activo —{" "}
          <button onClick={() => cambiarFocusNodeId(null)} className="focus-banner-btn">
            Salir
          </button>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        {displayTree && (
          <OrgChartCanvas
            tree={displayTree}
            mode={modo}
            lineaFiltro={lineaFiltro.toUpperCase().trim()}
            corporativoExpandido={corporativoExpandido}
            antonioId={displayTree.antonioId}
            slinks={displayTree.slinks}
            onToggleCorporativo={setCorporativoExpandido}
            isFocusMode={Boolean(focusNodeId)}
            focusNodeId={focusNodeId}
            onFocusNode={cambiarFocusNodeId}
            onExpandFocusHead={(nodeId) =>
              setExpandedHeadIds((prev) => new Set(prev).add(nodeId))
            }
            onCollapseFocusHead={(nodeId) =>
              setExpandedHeadIds((prev) => {
                const next = new Set(prev);
                next.delete(nodeId);
                return next;
              })
            }
            onShowDetail={setDetailNode}
          />
        )}
      </div>
      <DetailModal node={detailNode} onClose={() => setDetailNode(null)} />
    </div>
  );
}
