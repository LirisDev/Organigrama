  <h1>🏢 Organigrama Corporativo LIRIS S.A.</h1>

  <blockquote>
        <p>Visualización interactiva de la estructura organizacional basada en <strong>Balkan OrgChart JS</strong>. Proyecto Frontend diseñado para integrarse en el ecosistema corporativo de LIRIS, consumiendo la API de nómina en tiempo real.</p>
    </blockquote>

   <p>
        <img src="https://img.shields.io/badge/Estado-Producci%C3%B3n%2FQA-green" alt="Estado">
        <img src="https://img.shields.io/badge/Data-JSON_API-blue" alt="Data">
        <img src="https://img.shields.io/badge/Mobile-Optimized-orange" alt="Responsive">
    </p>

  <hr>

  <h2>📸 Galería Visual</h2>
    <p>Interfaz adaptativa diseñada para ofrecer la mejor experiencia según el dispositivo.</p>

  <table border="0" style="width: 100%;">
        <tr>
            <td style="width: 70%; vertical-align: top;">
                <h3>🖥️ Vista de Escritorio</h3>
                <p>Panel completo con filtros laterales, búsqueda flotante y controles de exportación.</p>
                <img src="img/demo-desktop.png" alt="Vista Escritorio" style="width: 100%; border: 1px solid #ddd; border-radius: 5px;">
            </td>
            <td style="width: 30%; vertical-align: top;">
                <h3>📱 Vista Móvil</h3>
                <p>Diseño compacto con filtros en grilla 2x2 y búsqueda anclada.</p>
                <img src="img/demo-mobile.png" alt="Vista Móvil" style="width: 100%; border: 1px solid #ddd; border-radius: 5px;">
            </td>
        </tr>
    </table>
    
  <hr>

  <h2>📂 Estructura del Repositorio</h2>
    <pre><code>
Organigrama-Jerarquias/
├── 📁 Balkan/                  # Librería Base de Balkan OrgChart JS
├── 📁 BalkanPro/               # Módulos Pro de Balkan (Exportación, PDF)
├── 📄 index_sistemas_jerarquias.html  # 👈 [CORE] Lógica de renderizado.
├── 🎨 styles.css               # 👈 [CORE] Estilos personalizados y Responsive.
├── 🖼️ Logo-Liris.png           # Asset gráfico.
├── 📁 img/                     # Capturas de pantalla para documentación.
├── 📄 README.md                # Este archivo.
│
├── ⚠️ ARCHIVOS LEGACY:
├── 📁 orgchart/                # (Experimental) Pruebas.
├── 📄 main.js                  # Sin uso.
└── 📄 visor.html               # Visualizador secundario.
    </code></pre>

  <h2>⚙️ Funcionalidades Principales</h2>

  <h3>1. Navegación y Herramientas</h3>
    <ul>
        <li><strong>Zoom Inteligente:</strong> Control total con botones flotantes y "Ajustar a Pantalla".</li>
        <li><strong>Exportación:</strong> Generación nativa de reportes en <strong>PDF</strong>, <strong>PNG</strong> y <strong>SVG</strong>.</li>
        <li><strong>Vistas Flexibles:</strong> Alternancia entre orientación vertical/horizontal y expansión/colapso de ramas.</li>
    </ul>

  <h3>2. Filtros y Búsqueda (Select2)</h3>
    <p>Sistema de filtrado avanzado para segmentar la organización por:</p>
    <ul>
        <li><strong>Línea de Negocio</strong>, <strong>Centro de Costo</strong> y <strong>Departamento</strong>.</li>
        <li><strong>Búsqueda Global:</strong> Localización instantánea de colaboradores por nombre o cargo.</li>
    </ul>

  <h3>3. Ficha de Detalle</h3>
    <p>Modal interactivo con información del empleado y accesos directos a:</p>
    <ul>
        <li>📘 Manual de Funciones</li>
        <li>📗 Manual de Usuario</li>
        <li>📙 Manual de Procedimientos</li>
    </ul>

  <h2>🚀 Instalación y Desarrollo Local</h2>
    <p>Este proyecto no requiere compilación (es HTML/JS estático). Para ejecutarlo localmente:</p>

  <ol>
        <li>
            <strong>Clonar el repositorio:</strong>
            <pre><code>git clone https://github.com/davidromeroy/Organigrama-Jerarquias.git</code></pre>
        </li>
        <li>
            <strong>Ejecutar:</strong>
            <p>Se recomienda usar una extensión como <strong>Live Server</strong> en VS Code para evitar problemas de CORS con los archivos locales.</p>
        </li>
        <li>
            <strong>Configuración (Simulación de Usuario):</strong>
            <p>En local, el <code>postMessage</code> del padre no existe. Para probar con un usuario específico, busca en <code>index_sistemas_jerarquias.html</code> la variable:</p>
            <pre><code>// Descomentar para pruebas locales por ejemplo
          receivedUserId = "interno\\dromero"; //Asistente de desarrollo</code></pre>
          <p>Para pruebas debe cambiar el url de la api por la suya teniendo en cuenta la estructura de la api original usada.</p>
        </li>
    </ol>

  <h2>🔄 Lógica de Datos (API)</h2>
    <p>El sistema consume un JSON plano con la siguiente estructura crítica:</p>

  <pre><code class="language-json">
 "Persona": [
  {
    "codigoEmpleado": "15",
    "nombre": "ANTONIO JOSE",
    "apellido": "SAAB ADUM",
    "userid": "interno\\ajsaab",       // Clave para autenticación
    "foto": "http://soporte.liris.com.ec/fotorrhh/...",
    "emailCorporativo": "ajsaab@liris.com.ec",
    
    // --- MOTOR JERÁRQUICO ---
    "codigoPosicion": "00001",         // ID Único del Nodo
    "codigoPosicionReporta": "00006",  // ID del Jefe
    
    "puesto": "PRESIDENTE SERVICIOS PROFESIONALES",
    
    // --- CAMPOS DE FILTRADO ---
    "nombreDepartamento": "DIRECTORIO",
    "nombreCentroCosto": "CORPORATIVO",
    "nombreLineaNegocio": "CORPORATIVO",
    
    // --- DOCUMENTACIÓN Y ESTADO ---
    "rutaManual": "Documentos compartidos/...", // Path base para los manuales
    "vacante": "0",          // "0" = Ocupado, "1" = Vacante (Estilo visual distinto)
    "nivelJerarquico": "1"   // Define el color del borde
  }
]
    </code></pre>

  <h2>🔄 Contexto de Integración</h2>
    <p>Este módulo Frontend opera dentro de la intranet corporativa bajo un wrapper <strong>ASP.NET</strong> (<code>index.aspx</code>) que gestiona la autenticación y pasa el contexto de usuario vía <code>postMessage</code>.</p>

  <h2>📱 Estrategia Responsive</h2>
    <table border="1" cellpadding="10" cellspacing="0" style="width: 100%; border-collapse: collapse;">
        <thead style="background: #f4f4f4;">
            <tr>
                <th>Dispositivo</th>
                <th>Comportamiento UI</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Escritorio</strong></td>
                <td>Vista completa, controles expandidos y filtros laterales.</td>
            </tr>
            <tr>
                <td><strong>Tablet (&lt;768px)</strong></td>
                <td><strong>Modo Grilla:</strong> Filtros en 2x2. Búsqueda anclada a la izquierda (60%).</td>
            </tr>
            <tr>
                <td><strong>Móvil (&lt;400px)</strong></td>
                <td><strong>Modo Compacto:</strong> Fuentes reducidas (10px), inputs delgados (30px) y márgenes seguros.</td>
            </tr>
        </tbody>
    </table>

  <h3>🌍 Compatibilidad</h3>
    <p>Optimizado para:</p>
    <ul>
        <li>✅ Google Chrome (Desktop & Mobile)</li>
        <li>✅ Safari (iOS & macOS)</li>
        <li>✅ Microsoft Edge</li>
    </ul>
<hr>

  <h2>👨‍💻 Autor / Mantenedor</h2>
    <p>
      <strong><a href="https://www.linkedin.com/in/daroyane/" target="_blank" style="text-decoration: none; color: #0077b5; font-size: 1.1em;">David Romero Yánez</a></strong><br>
      <em>Ingeniero de Desarrollo</em><br>
        Departamento de Sistemas - LIRIS S.A.
    </p>
  <hr>
    <p><em>Documentación actualizada a Noviembre 2025.</em></p>

