import { sanitizeCircularReferences, aplicarSubnivelesRelativos } from "./sanitize";

// Fase 1: solo vista Persona. Vista Cargo queda para fase 2.
export async function fetchPersonaData(apiUrl) {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
  }
  const apiResponse = await response.json();
  const flatApiData = Array.isArray(apiResponse?.Persona) ? apiResponse.Persona : null;
  if (!Array.isArray(flatApiData)) {
    throw new Error("Formato inválido. No se encontró array en 'Persona'.");
  }
  if (flatApiData.length === 0) {
    return [];
  }

  // Mapa Posición -> Empleado, para resolver el 'pid' real de la jerarquía
  // (el API siempre reporta jerarquía por POSICIÓN, no por empleado).
  const positionToEmployeeMap = new Map();
  flatApiData
    .filter((emp) => emp && emp.codigoPosicion != null && emp.vacante !== "1" && emp.codigoEmpleado)
    .forEach((emp) => {
      const positionId = String(emp.codigoPosicion).trim();
      if (!positionToEmployeeMap.has(positionId)) {
        positionToEmployeeMap.set(positionId, String(emp.codigoEmpleado).trim());
      }
    });

  const balkanNodes = flatApiData
    .filter((emp) => emp && emp.codigoPosicion !== "00006" && emp.puesto != null)
    .map((emp) => {
      const isVacant = emp.vacante === "1";
      const id = isVacant ? String(emp.codigoPosicion).trim() : String(emp.codigoEmpleado).trim();
      const CodEmpleado = isVacant ? parseInt(emp.codigoPosicion) : parseInt(emp.codigoEmpleado);

      let pid = emp.codigoPosicionReporta ? String(emp.codigoPosicionReporta).trim() : null;
      if (pid && pid !== "0") {
        const managerEmployeeId = positionToEmployeeMap.get(pid);
        if (managerEmployeeId) pid = managerEmployeeId;
        if (pid === id) pid = undefined;
      } else {
        pid = undefined;
      }

      const levelTag = `level-${emp.nivelJerarquico || "99"}`;
      const tags = [levelTag];
      const order = parseInt(emp.nivelJerarquico || 99);

      if (isVacant) {
        tags.push("vacante");
        return {
          id,
          pid,
          tags,
          order,
          CodEmpleado,
          nombre: "PUESTO VACANTE",
          puesto: (() => {
            const cargo = emp.puesto || "Puesto N/A";
            const depto = emp.nombreDepartamento || "";
            return depto && depto !== "N/A" ? `${cargo} - ${depto}` : cargo;
          })(),
          codPosicion: emp.codigoPosicion || "N/A",
          codPosicion_R: emp.codigoPosicionReporta || "N/A",
          departamento: emp.nombreDepartamento || "N/A",
          proposito: emp.nombreProposito || "N/A",
          lineaNegocio: emp.nombreLineaNegocio2 || "N/A",
          centroCosto: emp.nombreCentroCosto2 || "N/A",
          userid: null,
          img: null,
          email: null,
          rutaManual: null,
        };
      }

      return {
        id,
        pid,
        tags,
        CodEmpleado,
        order,
        nombre: `${emp.nombre || "N/A"} ${emp.apellido || ""}`.trim(),
        userid: emp.userid || "UserId no definido",
        puesto: emp.puesto || "Puesto N/A",
        codPosicion: emp.codigoPosicion || "Código de posición no definido",
        codPosicion_R: emp.codigoPosicionReporta || "Código de posición que reporta no definido",
        lineaNegocio: emp.nombreLineaNegocio2 || "N/A",
        centroCosto: emp.nombreCentroCosto2 || "N/A",
        departamento: emp.nombreDepartamento || "N/A",
        proposito: emp.nombreProposito || "N/A",
        img: emp.foto || "Logo-Liris.png",
        email: emp.emailCorporativo || "Sin correo electrónico",
        rutaManual: emp.rutaManual || "Sin manual asignado",
        codDepAx: emp.codDepAx || null,
        codDepartamento: emp.codigoDepartamento || null,
      };
    })
    .filter(Boolean);

  const sanitizedNodes = sanitizeCircularReferences(balkanNodes);
  aplicarSubnivelesRelativos(sanitizedNodes);
  return sanitizedNodes;
}
