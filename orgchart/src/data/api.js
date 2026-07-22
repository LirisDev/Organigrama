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
  const sharedPositionGroups = new Map(); // positionId -> { groupId, empleados: [ids] }
  positionToEmployeesMap.forEach((empleados, positionId) => {
    if (empleados.length > 1 && posicionesConSubordinados.has(positionId)) {
      const groupId = `GRPCARGO_${positionId}`;
      positionToEmployeeMap.set(positionId, groupId);
      sharedPositionGroups.set(positionId, { groupId, empleados });
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
      // con el mismo codigoPosicion) — pasa a ser MIEMBRO del grupo
      // sintético en vez de reportar directo a su manager; el grupo mismo
      // hereda ese pid (una sola vez, todos los que comparten posición
      // reportan a la misma posición superior).
      let stpid;
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
          stpid = compartida.groupId;
          pid = undefined;
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
        stpid,
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

  // Nodo de grupo por cada posición compartida — "Holding"/GRP_CORPORATIVO
  // usan exactamente este mismo patrón (tags:["group"], template "group"
  // resuelto automáticamente por Balkan vía buildTagsConfig): una caja con
  // título, los miembros adentro (pid:null + stpid=este id, ya asignados
  // arriba) y quienes reportan a la posición compartida cuelgan de ella
  // como de cualquier otro padre normal.
  //
  // AL PRINCIPIO del array, no al final — Balkan arma el agrupamiento
  // visual (stpid) en el mismo orden en que procesa config.nodes; mismo
  // ajuste ya documentado en focus.js para GRP_CORPORATIVO/líneas de
  // negocio. Agregarlos al final dejaba la caja vacía (sin miembros ni
  // hijos reportándole), aunque los datos de sus miembros ya apuntaran bien.
  const gruposCargo = Array.from(sharedPositionGroups.values()).map(
    ({ groupId, puesto, order, pid, lineaNegocio, centroCosto }) => ({
      id: groupId,
      pid: pid || undefined,
      // Sin nombre/cargoPuesto: personaBinding.field_0 usa "nombre" (no
      // "title", ese binding no aplica acá) — ese texto es el header que
      // agrega alto extra a la caja de grupo, corriendo a los miembros hacia
      // abajo y desalineando a los hermanos normales (ej. Lizardo) que
      // tienen altura fija de tarjeta. Pedido explícito de sacarlo.
      nombre: "",
      cargoPuesto: "",
      title: "",
      // "groupCargo" PRIMERO — Balkan resuelve el template recorriendo
      // tags en orden y usa el primero con mapeo (ver buildTagsConfig),
      // así que el orden importa acá. "group" se deja también, al final,
      // solo para que los `tags.includes("group")` de buildTree.js/
      // OrgChartCanvas.jsx (saltar badges de empleado, saltar el modal de
      // detalle, etc.) lo sigan reconociendo como caja de grupo.
      tags: ["groupCargo", "group"],
      order: order || 99,
      lineaNegocio: lineaNegocio || "N/A",
      centroCosto: centroCosto || "N/A",
    }),
  );
  balkanNodes.unshift(...gruposCargo);

  const sanitizedNodes = sanitizeCircularReferences(balkanNodes);
  aplicarSubnivelesRelativos(sanitizedNodes);
  return sanitizedNodes;
}
