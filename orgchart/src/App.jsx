import React, { useState, useEffect, useMemo } from "react";
import { fetchPersonaData } from "./data/api";
import { API_URL_PERSONA } from "./config/cabezasNegocio";
import { buildTree } from "./orgchart/buildTree";
import OrgChartCanvas from "./components/OrgChartCanvas";
import FilterBar from "./components/FilterBar";
import "./App.css";

export default function App() {
  const [allNodes, setAllNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lineaFiltro, setLineaFiltro] = useState("todos");
  // Las líneas de negocio arrancan visibles (colgando de Corporativo); se
  // ocultan/muestran al expandir/colapsar el nodo de Antonio (Presidente).
  const [corporativoExpandido, setCorporativoExpandido] = useState(true);

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

  if (loading) {
    return <div id="status-message">Cargando Organigrama...</div>;
  }

  if (error) {
    return <div id="error-message">Error: {error}</div>;
  }

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <FilterBar allNodes={allNodes} value={lineaFiltro} onChange={setLineaFiltro} />
      <div style={{ flex: 1, minHeight: 0 }}>
        {tree && (
          <OrgChartCanvas
            tree={tree}
            lineaFiltro={lineaFiltro.toUpperCase().trim()}
            corporativoExpandido={corporativoExpandido}
            antonioId={tree.antonioId}
            slinks={tree.slinks}
            onToggleCorporativo={setCorporativoExpandido}
          />
        )}
      </div>
    </div>
  );
}
