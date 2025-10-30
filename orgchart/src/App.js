// src/App.js
import React, { useState, useEffect } from 'react';
import OrgChart from './myorg'; // Importa el wrapper de Balkan (mytree.js)
import './App.css'; // Importa tus estilos

// --- Pega tus funciones de ayuda de index_sistemas_jerarquias.html aquí ---
function sanitizeCircularReferences(nodes) {
    const nodeMap = new Map();
    nodes.forEach((node) => { if (node && node.id != null) nodeMap.set(node.id, node); else { console.warn("Sanitizing: Omitiendo nodo inválido durante creación de mapa:", node); } });
    
    let loopsBroken = 0;
    console.log("Sanitizing: Iniciando sanitización de bucles...");
    const nodeIds = Array.from(nodeMap.keys());
    for (const nodeId of nodeIds) {
        const startNode = nodeMap.get(nodeId); 
        if (!startNode || startNode.pid == null) continue;
        const pathVisited = new Set(); 
        let currentNode = startNode; 
        while (currentNode && currentNode.pid != null) {
            const currentId = currentNode.id;
            const parentId = currentNode.pid; 
            
            if (pathVisited.has(currentId)) {
                console.warn(`¡Bucle detectado! ... Rompiendo enlace ${currentId} -> ${parentId}`);
                currentNode.pid = undefined;
                loopsBroken++;
                break; 
            }
            pathVisited.add(currentId); 
            
            if (!nodeMap.has(parentId)) {
                currentNode.pid = undefined;
                break;
            }
            currentNode = nodeMap.get(parentId); 
            if (!currentNode) {
                console.error("Sanitizing: Error inesperado al obtener el padre", parentId);
                break;
            }
        }
    }
    console.log(`Sanitizing: Sanitización completa...`);
    return Array.from(nodeMap.values());
}

function getSubLevelTag(nivelJerarquico) {
    const nivel = parseInt(nivelJerarquico) -1;
    if (nivel === 5) return "sub-level-1";
    if (nivel === 6) return "sub-level-2";
    if (nivel === 7) return "sub-level-3";
    return "sub-level-0";
}
// --- Fin de funciones de ayuda ---


function App() {
  // Estado de React para guardar los nodos, el estado de carga y errores
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // useEffect es el equivalente a "componentDidMount" en un componente funcional.
  // Se ejecuta una vez cuando el componente carga.
  useEffect(() => {
    
    // --- Esta es tu función loadAndRenderChart, adaptada para React ---
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const apiUrl = 'https://mobileqa.liris.com.ec/delportal/wp-json/delportal/v1/get_organigrama_persona';
        console.log("Iniciando fetch a:", apiUrl);
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        
        const apiResponse = await response.json();
        const flatApiData = Array.isArray(apiResponse?.Persona) ? apiResponse.Persona : null;
        if (!Array.isArray(flatApiData)) throw new Error("Formato inválido. No se encontró array en 'Persona'.");

        console.log(`Datos recibidos (${flatApiData.length}). Procesando...`);

        // 2. Pre-cálculo Mapa Posición -> Empleado
        const positionToEmployeeMap = new Map();
        flatApiData
            .filter(emp => emp && emp.codigoPosicion != null && emp.vacante !== "1" && emp.codigoEmpleado)
            .forEach((emp) => {
                const positionId = String(emp.codigoPosicion).trim();
                const employeeId = String(emp.codigoEmpleado).trim();
                if (!positionToEmployeeMap.has(positionId)) {
                    positionToEmployeeMap.set(positionId, employeeId);
                }
            });
        
        // 3. Transformación (Tu lógica exacta)
        const balkanNodes = flatApiData
            .filter(emp => 
                emp && emp.codigoPosicion != null && String(emp.codigoPosicion).trim() !== "00006" &&
                (emp.nombreDepartamento === "SISTEMAS" || emp.nombreDepartamento === "DIRECTORIO" 
                    || emp.nombreDepartamento === "IMPORTACIONES" || emp.nombreDepartamento === "LEGAL" 
                    || emp.nombreDepartamento === "PROCESOS Y PROYECTOS" 
                    || (emp.nombreDepartamento === "FINANZAS" && emp.nombreCentroCosto === "DERIVADOS")
                    || emp.nombreDepartamento === "RECURSOS HUMANOS")
            )
            .map(emp => {
                // --- Pega tu lógica de mapeo de 'index_sistemas_jerarquias.html' aquí ---
                const isVacant = emp.vacante === "1";
                const id = isVacant ? String(emp.codigoPosicion).trim() : String(emp.codigoEmpleado).trim();
                let pid = emp.codigoPosicionReporta ? String(emp.codigoPosicionReporta).trim() : null;

                if (pid && pid !== "0") {
                    const managerEmployeeId = positionToEmployeeMap.get(pid);
                    pid = managerEmployeeId ? managerEmployeeId : pid;
                    if (pid === id) pid = undefined;
                } else {
                    pid = undefined;
                }
                const subLevelTag = getSubLevelTag(emp.nivelJerarquico);
                const levelTag = `level-${emp.nivelJerarquico || '99'}`;
                let tags = [levelTag];
                if (subLevelTag !== "sub-level-0") {
                    tags.push(subLevelTag, "sublevel-node");
                }
                const order = parseInt(emp.nivelJerarquico || 99);
                if (isVacant) {
                    tags.push('vacante');
                    return { id, pid, tags, puesto: emp.puesto || "Puesto Vacante", order };
                } else {
                    return {
                        id, pid, tags,
                        nombre: `${emp.nombre || 'N/A'} ${emp.apellido || ''}`.trim(),
                        puesto: emp.puesto || "Puesto no definido",
                        img: emp.foto || 'https://via.placeholder.com/60/cccccc/ffffff?text=N/A',
                        order
                    };
                }
                // --- Fin de la lógica de mapeo ---
            })
            .filter(Boolean);

        // 4. Sanitización
        const sanitizedNodes = sanitizeCircularReferences(balkanNodes);
        
        // 5. ¡Establece los datos en el estado de React!
        setNodes(sanitizedNodes);

      } catch (err) {
        console.error("ERROR DETALLADO:", err);
        setError(err.message);
      } finally {
        setLoading(false); // Oculta el mensaje de "Cargando..."
      }
    }

    fetchData(); // Llama a la función de fetch al cargar el componente
  }, []); // El array vacío [] significa que esto solo se ejecuta una vez

  // --- Renderizado del componente ---
  if (loading) {
    return <div id="status-message">Cargando Organigrama...</div>;
  }

  if (error) {
    return <div id="error-message">Error: {error}</div>;
  }

  return (
    <div style={{height: '100vh', width: '100vw'}}>
      {/* Aquí renderizamos el componente 'OrgChart' (mytree.js)
        y le pasamos los nodos (nodes) que obtuvimos de la API como prop.
      */}
      <OrgChart nodes={nodes} />
    </div>
  );
}

export default App;