import React, { useState, useEffect, useMemo } from "react";
import { fetchPersonaData } from "./data/api";
import { API_URL_PERSONA } from "./config/cabezasNegocio";
import { buildTree } from "./orgchart/buildTree";
import { buildFocusTree } from "./orgchart/focus";
import OrgChartCanvas from "./components/OrgChartCanvas";
import FilterBar from "./components/FilterBar";
import DetailModal from "./components/DetailModal";
import "./App.css";

export default function App() {
  const [allNodes, setAllNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lineaFiltro, setLineaFiltro] = useState("todos");
  // Las líneas de negocio arrancan visibles (colgando de Corporativo); se
  // ocultan/muestran al expandir/colapsar el nodo de Antonio (Presidente).
  const [corporativoExpandido, setCorporativoExpandido] = useState(true);
  const [detailNode, setDetailNode] = useState(null);
  const [focusNodeId, setFocusNodeId] = useState(null);

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

  const tree = useMemo(() => {
    if (allNodes.length === 0) return null;
    return buildTree({ allNodes, lineaFiltro, corporativoExpandido });
  }, [allNodes, lineaFiltro, corporativoExpandido]);

  // Modo Foco opera sobre el árbol YA construido (tree.finalArray), no sobre
  // allNodes crudo — así conserva fusiones/clones/estilos jefe-* que solo
  // existen después de buildTree(). Si el usuario sale del foco, simplemente
  // se vuelve a mostrar `tree` (no hace falta guardar una "foto" aparte,
  // React ya lo tiene memoizado).
  const focusTree = useMemo(() => {
    if (!focusNodeId || !tree) return null;
    return buildFocusTree(tree.finalArray, focusNodeId);
  }, [focusNodeId, tree]);

  const displayTree = focusTree || tree;

  if (loading) {
    return <div id="status-message">Cargando Organigrama...</div>;
  }

  if (error) {
    return <div id="error-message">Error: {error}</div>;
  }

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <FilterBar allNodes={allNodes} value={lineaFiltro} onChange={setLineaFiltro} disabled={Boolean(focusNodeId)} />
      {focusNodeId && (
        <div className="focus-banner">
          🎯 Modo Foco Activo —{" "}
          <button onClick={() => setFocusNodeId(null)} className="focus-banner-btn">
            Salir
          </button>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        {displayTree && (
          <OrgChartCanvas
            tree={displayTree}
            lineaFiltro={lineaFiltro.toUpperCase().trim()}
            corporativoExpandido={corporativoExpandido}
            antonioId={displayTree.antonioId}
            slinks={displayTree.slinks}
            onToggleCorporativo={setCorporativoExpandido}
            isFocusMode={Boolean(focusNodeId)}
            focusNodeId={focusNodeId}
            onFocusNode={setFocusNodeId}
            onShowDetail={setDetailNode}
          />
        )}
      </div>
      <DetailModal node={detailNode} onClose={() => setDetailNode(null)} />
    </div>
  );
}
