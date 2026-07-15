import React, { useMemo } from "react";

const MANUAL_PDF_URL = `${process.env.PUBLIC_URL}/RRHH-USU-USORGA-V001 Manual de Usuario de Uso de Organigrama.pdf`;
const MANUAL_PDF_FILENAME = "Manual_Usuario_Organigrama.pdf";

function descargarManualApp() {
  const link = document.createElement("a");
  link.href = MANUAL_PDF_URL;
  link.setAttribute("download", MANUAL_PDF_FILENAME);
  link.setAttribute("target", "_blank");
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Markup y clases (#custom-filters/.control-select/.control-btn) portados
// 1:1 de index_sistemas_jerarquias.html para que el header se vea idéntico
// al de la rama vanilla.
export default function FilterBar({ allNodes, value, onChange, disabled = false, modo, onModoChange }) {
  const lineas = useMemo(() => {
    const valueSet = new Set();
    allNodes.forEach((node) => {
      if (node.lineaNegocio && node.lineaNegocio !== "N/A") valueSet.add(node.lineaNegocio);
    });
    return Array.from(valueSet).sort();
  }, [allNodes]);

  return (
    <header id="custom-filters" className="ui-ready">
      <div>
        <select
          id="linea-negocio-select"
          className="control-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {lineas.length > 1 && <option value="todos">TODAS LAS LÍNEAS</option>}
          {lineas.map((linea) => (
            <option key={linea} value={linea}>
              {linea}
            </option>
          ))}
        </select>

        <select
          id="modo-select"
          className="control-select"
          value={modo}
          onChange={(e) => onModoChange(e.target.value)}
          disabled={disabled}
        >
          <option value="Persona">VISTA POR PERSONA</option>
          <option value="Cargo">VISTA POR CARGO</option>
        </select>

        <button
          id="btn-download-app-manual"
          className="control-btn"
          type="button"
          title="Descargar Manual de Usuario"
          onClick={descargarManualApp}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="12" y2="18"></line>
            <line x1="15" y1="15" x2="12" y2="18"></line>
          </svg>
          <span>Manual</span>
        </button>
      </div>
    </header>
  );
}
