// Genera la URL del visor de manuales (usuario/procedimientos/funciones)
// para un nodo, usando su código de empleado y de departamento.
export function getManualUrl(nodeData, tipo) {
  let carpeta = "";
  if (tipo === "usuario") carpeta = "Manual de usuario";
  if (tipo === "procedimientos") carpeta = "Manual de procedimientos";
  if (tipo === "funciones") carpeta = "Manual de funciones";

  const codEmp = nodeData.id;
  const codDepAx = nodeData.codDepAx;
  const codDepartamento = nodeData.codDepartamento;

  const depParam = codDepAx && codDepartamento ? `${codDepAx}|${codDepartamento}` : codDepAx || "";

  return `https://soporte.liris.com.ec/rhh/visor.html?Carpeta=${encodeURIComponent(
    carpeta,
  )}&CodEmp=${codEmp || ""}&DepartMyProcessId=${depParam}`;
}
