import React, { useMemo } from "react";

export default function FilterBar({ allNodes, value, onChange, disabled = false, modo, onModoChange }) {
  const lineas = useMemo(() => {
    const valueSet = new Set();
    allNodes.forEach((node) => {
      if (node.lineaNegocio && node.lineaNegocio !== "N/A") valueSet.add(node.lineaNegocio);
    });
    return Array.from(valueSet).sort();
  }, [allNodes]);

  return (
    <div className="filter-bar">
      <label htmlFor="modo-select">Vista por</label>
      <select
        id="modo-select"
        value={modo}
        onChange={(e) => onModoChange(e.target.value)}
        disabled={disabled}
      >
        <option value="Persona">Persona</option>
        <option value="Cargo">Cargo</option>
      </select>
      <select id="linea-negocio-select" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
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
