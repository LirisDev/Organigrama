import { sanitizeCircularReferences, aplicarSubnivelesRelativos } from "./sanitize";
import { buildMiembrosHtml } from "../orgchart/templates";

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

  // Mapa Posición -> Empleado(s), para resolver el 'pid' real de la
  // jerarquía (el API siempre reporta jerarquía por POSICIÓN, no por
  // empleado). A veces DOS empleados activos comparten el mismo
  // codigoPosicion (ej. dos "SUPERVISOR DE LOCAL" del mismo local) — el API
  // no dice a cuál de los dos reporta cada persona (codigoPosicionReporta
  // es la posición compartida, no un empleado puntual), así que no hay
  // forma correcta de partir esos reportes entre los dos. En vez de
  // quedarnos con el primero que aparece en el array (arbitrario, dejaba al
  // segundo empleado sin nadie reportándole) se arma un grupo visual
  // (GRPCARGO_<posición>) que contiene a ambos, y todo lo que reporta a esa
  // posición reporta al grupo en vez de a una persona puntual — ver
  // sharedPositionGroups más abajo.
  const positionToEmployeesMap = new Map();
  flatApiData
    .filter((emp) => emp && emp.codigoPosicion != null && emp.vacante !== "1" && emp.codigoEmpleado)
    .forEach((emp) => {
      const positionId = String(emp.codigoPosicion).trim();
      const employeeId = String(emp.codigoEmpleado).trim();
      if (!positionToEmployeesMap.has(positionId)) {
        positionToEmployeesMap.set(positionId, []);
      }
      const lista = positionToEmployeesMap.get(positionId);
      if (!lista.includes(employeeId)) lista.push(employeeId);
    });

  // Compartir posición sin que nadie le reporte a esa posición (ej. varios
  // "INGENIERO DE DESARROLLO" que son colaboradores individuales, no
  // managers) no es ambiguo — no hay nada que resolver, así que NO arma
  // grupo (quedaría un grupo vacío, sin hijos, solo ruido visual). Solo
  // interesa cuando la posición compartida además funciona como manager de
  // alguien (aparece como codigoPosicionReporta de otro empleado).
  const posicionesConSubordinados = new Set();
  flatApiData.forEach((emp) => {
    if (!emp || !emp.codigoPosicionReporta) return;
    const posReporta = String(emp.codigoPosicionReporta).trim();
    if (posReporta && posReporta !== "0") posicionesConSubordinados.add(posReporta);
  });

  // Posición → a qué reportan quienes le reportan A ELLA: el empleado único
  // si solo hay uno, o el id del grupo sintético si hay 2+ Y además tiene
  // subordinados reales.
  const positionToEmployeeMap = new Map();
  const sharedPositionGroups = new Map(); // positionId -> { groupId, empleadosDetalle: [...] }
  positionToEmployeesMap.forEach((empleados, positionId) => {
    if (empleados.length > 1 && posicionesConSubordinados.has(positionId)) {
      const groupId = `GRPCARGO_${positionId}`;
      positionToEmployeeMap.set(positionId, groupId);
      sharedPositionGroups.set(positionId, { groupId, positionId, empleadosDetalle: [] });
    } else {
      positionToEmployeeMap.set(positionId, empleados[0]);
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

      // Este empleado ocupa una posición compartida (2+ empleados activos
      // con el mismo codigoPosicion) — no se arma como nodo Balkan propio,
      // sus datos se pliegan dentro del nodo de grupo (listaEmpleados, ver
      // más abajo) en vez de crear un nodo por persona. El nodo de grupo
      // mismo hereda el pid (una sola vez, todos los que comparten posición
      // reportan a la misma posición superior).
      if (!isVacant) {
        const propiaPosicion = emp.codigoPosicion != null ? String(emp.codigoPosicion).trim() : null;
        const compartida = propiaPosicion && sharedPositionGroups.get(propiaPosicion);
        if (compartida) {
          if (compartida.pid === undefined) {
            compartida.pid = pid;
            compartida.puesto = emp.puesto || "Puesto compartido";
            compartida.order = parseInt(emp.nivelJerarquico || 99);
            // buildTree.js filtra por lineaNegocio al recorrer la línea de
            // negocio del padre (agregarDescendencia) — sin esto, el grupo
            // podía quedar afuera si caía justo en el primer nivel de ese
            // recorrido (el único donde ese filtro se aplica de verdad).
            compartida.lineaNegocio = emp.nombreLineaNegocio2 || "N/A";
            compartida.centroCosto = emp.nombreCentroCosto2 || "N/A";
          }
          compartida.empleadosDetalle.push({
            codigoEmpleado: emp.codigoEmpleado,
            nombre: emp.nombre || "",
            apellido: emp.apellido || "",
            foto: emp.foto || "Logo-Liris.png",
            puestoEmpleado: emp.puesto || compartida.puesto,
            emailCorporativo: emp.emailCorporativo,
            codDepAx: emp.codDepAx,
          });
          return null;
        }
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

  // Nodo de grupo por cada posición compartida — a diferencia del intento
  // anterior (contenedor "group" nativo de Balkan con miembros como nodos
  // stpid propios), ahora es un nodo ÚNICO de tamaño FIJO igual a una
  // tarjeta normal (110 de alto, ver groupCargoCompact en templates.js):
  // a ojos de Balkan es una tarjeta cualquiera con hijos (pid), así que
  // nunca puede desalinear la fila con sus hermanos ni pisar el layout de
  // nodos no relacionados. Los miembros (2 o 3+) van en `listaEmpleados`
  // (mismo campo que ya usa la Vista Cargo para "N empleados en un cargo",
  // reutiliza el modal de detalle tal cual) y se dibujan a mano dentro del
  // nodo vía `miembrosHtml` (variante B del mockup aprobado por David).
  const gruposCargo = Array.from(sharedPositionGroups.values()).map(
    ({ groupId, positionId, puesto, order, pid, lineaNegocio, centroCosto, empleadosDetalle }) => {
      const esAncho = empleadosDetalle.length >= 3;
      const size = esAncho ? [340, 110] : [250, 110];
      return {
        id: groupId,
        pid: pid || undefined,
        cargoPuesto: puesto || "Cargo compartido",
        cargoPersona: `${empleadosDetalle.length} personas`,
        listaEmpleados: empleadosDetalle,
        codPosicion: positionId,
        // "group" acá es solo una marca para el resto del código (saltar
        // el conteo individual en calcularConteoVisual, no reasignar
        // template por _directos/_total) — el template real que Balkan
        // resuelve es groupCargoCompact(3), primero en la lista.
        tags: [esAncho ? "groupCargoCompact3" : "groupCargoCompact", "group"],
        // El binding por tag (buildTagsConfig) no terminó pegándole a
        // field_0 de forma confiable — se usa el binding GLOBAL
        // (personaBinding.field_0 = "nombre", field_0 = "{val}" en el
        // template) poniendo el HTML de los miembros directo acá.
        nombre: buildMiembrosHtml(empleadosDetalle, size[0], size[1]),
        order: order || 99,
        lineaNegocio: lineaNegocio || "N/A",
        centroCosto: centroCosto || "N/A",
      };
    },
  );
  balkanNodes.push(...gruposCargo);

  const sanitizedNodes = sanitizeCircularReferences(balkanNodes);
  aplicarSubnivelesRelativos(sanitizedNodes);
  return sanitizedNodes;
}
