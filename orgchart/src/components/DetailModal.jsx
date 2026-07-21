import React, { useState, useEffect } from "react";
import { obtenerAliasLinea } from "../orgchart/buildTree";
import { getManualUrl } from "../data/manualUrl";

function buildPersonDataFromEmpleado(empleado, cargoNode) {
  return {
    id: empleado.codigoEmpleado,
    nombre: `${empleado.nombre || ""} ${empleado.apellido || ""}`.trim(),
    puesto: empleado.puestoEmpleado || cargoNode.cargoPuesto,
    img: empleado.foto,
    email: empleado.emailCorporativo,
    lineaNegocio: cargoNode.lineaNegocio,
    centroCosto: cargoNode.centroCosto,
    area: cargoNode.area,
    codDepAx: empleado.codDepAx,
  };
}

// Ficha de detalle — reemplaza el editUI genérico de Balkan (dump crudo de
// campos). Controlado por OrgChartCanvas vía el hook editUI de Balkan
// (nodeMouseClick → editUI.show(nodeId) → onShowDetail(data)).
//
// En Cargo, `node` es un cargo (no una persona): puede tener 0, 1 o varios
// empleados asignados (node.listaEmpleados, solo presente en datos de
// Cargo). Con exactamente 1 empleado se arma automáticamente una vista
// tipo-persona; con 2+ se muestra la lista y un click en un empleado
// repuebla el modal EN EL MISMO LUGAR con su ficha (selectedEmpleado),
// igual que el listener delegado sobre .employee-list-item en la rama
// vanilla (CustomDetailsForm).
export default function DetailModal({ node, onClose }) {
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);

  // El cargo/persona mostrado cambió (otro nodo, o el modal se cerró) — la
  // selección de empleado de la vista anterior ya no aplica.
  useEffect(() => {
    setSelectedEmpleado(null);
  }, [node]);

  if (!node) return null;

  const esCargo = Array.isArray(node.listaEmpleados);
  const singleEmpleado = esCargo && node.listaEmpleados.length === 1 ? node.listaEmpleados[0] : null;
  const empleadoActivo = selectedEmpleado || singleEmpleado;

  if (esCargo && !empleadoActivo) {
    return (
      <CargoMultiDetail
        node={node}
        onClose={onClose}
        onSelectEmpleado={(emp) => setSelectedEmpleado(emp)}
      />
    );
  }

  const personData = empleadoActivo ? buildPersonDataFromEmpleado(empleadoActivo, node) : node;

  const isVacant = personData.tags && personData.tags.includes("vacante");
  const canShowManuals = Boolean(personData.id && personData.codDepAx && !isVacant);
  const img = isVacant || !personData.img ? "/Logo-Liris.png" : personData.img;

  const abrirManual = (tipo) => {
    const url = getManualUrl(personData, tipo);
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

        <h2 id="details-name">{personData.nombre}</h2>
        <p id="details-puesto" dangerouslySetInnerHTML={{ __html: personData.puesto || "" }} />

        <div className="details-info-block">
          {personData.email && personData.email !== "N/A" && (
            <div className="details-info-line">
              <span className="details-info-label">Email:</span>
              <span className="details-info-value">{personData.email}</span>
            </div>
          )}
          <div className="details-info-line">
            <span className="details-info-label">Línea Negocio:</span>
            <span className="details-info-value">{obtenerAliasLinea(personData.lineaNegocio) || "N/A"}</span>
          </div>
          <div className="details-info-line">
            <span className="details-info-label">Centro Costo:</span>
            <span className="details-info-value">{personData.centroCosto || "N/A"}</span>
          </div>
          <div className="details-info-line">
            <span className="details-info-label">Área:</span>
            <span className="details-info-value">{personData.area || personData.departamento || "N/A"}</span>
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

// Cargo con 0 o 2+ empleados asignados: sin foto, título = puesto, cuerpo =
// lista de empleados (o mensaje de vacante/sin asignar), sin manuales. Un
// click en un empleado de la lista pide al padre que muestre su ficha.
function CargoMultiDetail({ node, onClose, onSelectEmpleado }) {
  const isVacant = node.tags && node.tags.includes("vacante");
  const empleados = node.listaEmpleados || [];
  const vacantesDisponibles = node.plazasVacantes || 0;

  return (
    <div id="details-overlay" className="visible" onClick={(e) => e.target.id === "details-overlay" && onClose()}>
      <div id="custom-details-form">
        <h2 id="details-name">{node.cargoPuesto}</h2>
        <p id="details-puesto">{node.cargoPersona}</p>

        <div className="details-info-block">
          {empleados.length > 0 ? (
            <div className="details-employee-list">
              {empleados.map((emp) => (
                <div
                  className="employee-list-item"
                  key={emp.codigoEmpleado}
                  style={{ cursor: "pointer" }}
                  onClick={() => onSelectEmpleado(emp)}
                >
                  <img src={emp.foto || "/Logo-Liris.png"} className="employee-list-img" alt="" />
                  <div className="employee-list-info">
                    <div className="employee-list-name">
                      {emp.nombre || ""} {emp.apellido || ""}
                    </div>
                  </div>
                </div>
              ))}
              {vacantesDisponibles > 0 && (
                <div className="employee-list-item" style={{ opacity: 1, cursor: "default" }}>
                  <div
                    className="employee-list-img"
                    style={{
                      background: "#4a4a4a",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </div>
                  <div className="employee-list-info">
                    <div className="employee-list-name">
                      {vacantesDisponibles} {vacantesDisponibles === 1 ? "PLAZA VACANTE" : "PLAZAS VACANTES"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : isVacant ? (
            <div className="details-info-line" style={{ textAlign: "center", paddingTop: "10px" }}>
              Este puesto está actualmente vacante.
            </div>
          ) : (
            <div className="details-info-line" style={{ textAlign: "center", paddingTop: "10px" }}>
              Este puesto no tiene empleados asignados.
            </div>
          )}
        </div>

        <button className="details-btn btn-rojo" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
