import React, { useMemo } from "react";

// Fase 1: un único filtro (Línea de Negocio). División/Cargo/Búsqueda quedan
// para fase 2.
export default function FilterBar({ allNodes, value, onChange }) {
  const lineas = useMemo(() => {
    const valueSet = new Set();
    allNodes.forEach((node) => {
      if (node.lineaNegocio && node.lineaNegocio !== "N/A") valueSet.add(node.lineaNegocio);
    });
    return Array.from(valueSet).sort();
  }, [allNodes]);

  return (
    <div className="filter-bar">
      <label htmlFor="linea-negocio-select">Vista por Persona</label>
      <select id="linea-negocio-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {lineas.length > 1 && <option value="todos">TODAS LAS LÍNEAS</option>}
        {lineas.map((linea) => (
          <option key={linea} value={linea}>
            {linea}
          </option>
        ))}
      </select>
    </div>
  );
}
