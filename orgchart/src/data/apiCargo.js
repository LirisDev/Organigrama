import { sanitizeCircularReferences, aplicarSubnivelesRelativos } from "./sanitize";

const AREA_POR_LINEA = {
  BALANCEADO: "INDUSTRIAL",
  CARNICERIA: "INDUSTRIAL",
  CARNICOS: "INDUSTRIAL",
  PECUARIOS: "PECUARIA",
  RETAIL: "RETAIL",
  MARKETING: "RETAIL",
  DERIVADOS: "DERIVADOS",
  CORPORATIVO: "CORPORATIVO",
};

function determinarArea(linea) {
  const l = (linea || "").toUpperCase().trim();
  return AREA_POR_LINEA[l] || "CORPORATIVO";
}

// Vista Cargo — a diferencia de fetchPersonaData, el id del nodo es la
// POSICIÓN (codigoPosicion), no el empleado: un cargo puede tener 0, 1 o
// varios empleados asignados (campo `Empleado`, objeto o array según la API).
export async function fetchCargoData(apiUrl) {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
  }
  const apiResponse = await response.json();
  const flatApiData = Array.isArray(apiResponse?.Cargo) ? apiResponse.Cargo : null;
  if (!Array.isArray(flatApiData)) {
    throw new Error("Formato inválido. No se encontró array en 'Cargo'.");
  }
  if (flatApiData.length === 0) {
    return [];
  }

  const balkanCargoNodes = flatApiData
    .filter((cargo) => cargo && String(cargo.codigoPosicion) !== "00006" && cargo.puesto != null)
    .map((cargo) => {
      const isVacant = cargo.esVacante === "1";
      const id = String(cargo.codigoPosicion).trim();
      let pid = cargo.codigoPosicionReporta ? String(cargo.codigoPosicionReporta).trim() : null;
      if (pid === "0" || pid === id) pid = undefined;

      const levelTag = `level-${cargo.nivelJerarquico || "99"}`;
      const tags = [levelTag];
      if (isVacant) tags.push("vacante");
      const order = parseInt(cargo.nivelJerarquico || 99);

      let listaEmpleados = [];
      let primerEmpleado = null;
      let cargoPersonaDisplay = "PUESTO VACANTE";
      let CodEmpleado = null;

      if (!isVacant && cargo.Empleado) {
        if (Array.isArray(cargo.Empleado) && cargo.Empleado.length > 0) {
          listaEmpleados = cargo.Empleado;
          primerEmpleado = cargo.Empleado[0];
          cargoPersonaDisplay =
            listaEmpleados.length === 1
              ? `${listaEmpleados[0].nombre || ""} ${listaEmpleados[0].apellido || ""}`.trim()
              : `${listaEmpleados.length} PERSONAS ASIGNADAS`;
          CodEmpleado =
            listaEmpleados.length === 1 ? parseInt(listaEmpleados[0].codigoEmpleado) || 999999999 : null;
        } else if (typeof cargo.Empleado === "object" && !Array.isArray(cargo.Empleado)) {
          listaEmpleados = [cargo.Empleado];
          primerEmpleado = cargo.Empleado;
          cargoPersonaDisplay = `${primerEmpleado.nombre || ""} ${primerEmpleado.apellido || ""}`.trim();
          CodEmpleado = parseInt(primerEmpleado.codigoEmpleado) || null;
        } else {
          cargoPersonaDisplay = "Sin Asignar";
        }
      }

      const dept = (primerEmpleado ? primerEmpleado.nombreDepartamento : cargo.nombreDepartamento) || "";
      const lineaNegocio = (primerEmpleado ? primerEmpleado.nombreLineaNegocio : cargo.nombreLineaNegocio) || "N/A";

      return {
        id,
        pid,
        tags,
        order,
        CodEmpleado,
        cargoPuesto: cargo.puesto || "Puesto N/A",
        cargoPersona: (() => {
          const total = parseInt(cargo.totalPlazas) || 0;
          const asignados = listaEmpleados.length;
          const vacantes = parseInt(cargo.plazasVacantes) || 0;

          if (isVacant) {
            return vacantes > 1 ? `${vacantes} PUESTOS VACANTES` : "PUESTO VACANTE";
          }
          if (total > 0 && vacantes > 0) {
            return `${asignados} DE ${total} PERSONAS ASIGNADAS`;
          }
          if (asignados === 1) {
            return `${listaEmpleados[0].nombre || ""} ${listaEmpleados[0].apellido || ""}`.trim();
          }
          if (asignados > 1) {
            return `${asignados} PERSONAS ASIGNADAS`;
          }
          return "Sin Asignar";
        })(),
        searchIndex: (() => {
          const puestoBase = cargo.puesto || "";
          if (listaEmpleados.length === 0) return `${puestoBase} ${dept}`;
          const todosLosNombres = listaEmpleados
            .map((e) => `${e.nombre || ""} ${e.apellido || ""}`.trim())
            .join(" ");
          return `${puestoBase} ${dept} ${todosLosNombres}`;
        })(),
        displayNombre: dept ? `${cargo.puesto} - ${dept}` : cargo.puesto || "",
        puesto:
          listaEmpleados.length === 0
            ? "Sin asignar"
            : listaEmpleados.map((e) => `${e.nombre || ""} ${e.apellido || ""}`.trim()).join(", "),
        puestoCompleto:
          listaEmpleados.length === 0
            ? "Sin asignar"
            : listaEmpleados.map((e) => `${e.nombre || ""} ${e.apellido || ""}`.trim()).join(", "),
        plazasVacantes: parseInt(cargo.plazasVacantes) || 0,
        totalPlazas: parseInt(cargo.totalPlazas) || 0,
        cargoDepto: dept || "N/A",
        lineaNegocio,
        centroCosto: (primerEmpleado ? primerEmpleado.nombreCentroCosto : cargo.nombreCentroCosto) || "N/A",
        proposito: (primerEmpleado ? primerEmpleado.nombreProposito : cargo.nombreProposito) || "N/A",
        area: determinarArea(lineaNegocio),
        listaEmpleados,
        nombre: cargoPersonaDisplay,
        codDepAx: primerEmpleado ? primerEmpleado.codDepAx : null,
        codDepartamento: cargo.codDepartamento || null,
      };
    });

  const sanitizedCargoNodes = sanitizeCircularReferences(balkanCargoNodes);
  aplicarSubnivelesRelativos(sanitizedCargoNodes);
  return sanitizedCargoNodes;
}
