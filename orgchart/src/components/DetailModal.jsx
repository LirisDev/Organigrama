import React from "react";
import { obtenerAliasLinea } from "../orgchart/buildTree";
import { getManualUrl } from "../data/manualUrl";

// Ficha de detalle de una persona — reemplaza el editUI genérico de Balkan
// (dump crudo de campos). Solo vista Persona por ahora (Cargo es Fase 2).
// Controlado por OrgChartCanvas vía el hook editUI de Balkan
// (nodeMouseClick → editUI.show(nodeId) → onShowDetail(data)).
export default function DetailModal({ node, onClose }) {
  if (!node) return null;

  const isVacant = node.tags && node.tags.includes("vacante");
  const canShowManuals = Boolean(node.id && node.codDepAx && !isVacant);
  const img = isVacant || !node.img ? "/Logo-Liris.png" : node.img;

  const abrirManual = (tipo) => {
    const url = getManualUrl(node, tipo);
    if (url) {
      window.open(url, "_blank");
    } else {
      window.alert(`No hay un Manual de ${tipo} configurado para este usuario.`);
    }
  };

  return (
    <div id="details-overlay" className="visible" onClick={(e) => e.target.id === "details-overlay" && onClose()}>
      <div id="custom-details-form">
        <img id="details-img" src={img} alt="Foto de perfil" style={{ display: "block" }} />

        <h2 id="details-name">{node.nombre}</h2>
        <p id="details-puesto" dangerouslySetInnerHTML={{ __html: node.puesto || "" }} />

        <div className="details-info-block">
          {node.email && node.email !== "N/A" && (
            <div className="details-info-line">
              <span className="details-info-label">Email:</span>
              <span className="details-info-value">{node.email}</span>
            </div>
          )}
          <div className="details-info-line">
            <span className="details-info-label">Línea Negocio:</span>
            <span className="details-info-value">{obtenerAliasLinea(node.lineaNegocio) || "N/A"}</span>
          </div>
          <div className="details-info-line">
            <span className="details-info-label">Centro Costo:</span>
            <span className="details-info-value">{node.centroCosto || "N/A"}</span>
          </div>
          <div className="details-info-line">
            <span className="details-info-label">Área:</span>
            <span className="details-info-value">{node.area || "N/A"}</span>
          </div>
        </div>

        {canShowManuals && (
          <div className="details-buttons">
            <button className="details-btn btn-morado" onClick={() => abrirManual("funciones")}>
              Manual de Funciones
            </button>
            <button className="details-btn btn-azul" onClick={() => abrirManual("procedimientos")}>
              Manual de Procedimientos
            </button>
            <button className="details-btn btn-verde" onClick={() => abrirManual("usuario")}>
              Manual de Usuario
            </button>
          </div>
        )}

        <button className="details-btn btn-rojo" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
