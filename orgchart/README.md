  <h1>🏢 Organigrama Corporativo LIRIS S.A. — react-version</h1>

  <blockquote>
        <p>Reescritura a <strong>React</strong> del organigrama de <strong>LIRIS S.A.</strong> Migra la lógica ya validada de <code>organigrama-lineasNegocio</code> (HTML/JS vanilla) a componentes React, manteniendo <strong>Balkan OrgChart JS (Pro)</strong> como motor de render. <strong>Fase 1 (núcleo funcional)</strong> — foco, búsqueda, exportación, vista Cargo y permisos quedan para fase 2.</p>
    </blockquote>

  <p>
        <img src="https://img.shields.io/badge/Estado-Fase%201%20%2F%20Sin%20validar%20contra%20API-yellow" alt="Estado">
        <img src="https://img.shields.io/badge/Stack-React%2019%20%2B%20CRA-blue" alt="Stack">
        <img src="https://img.shields.io/badge/Balkan-Pro%20licenciado%20(vendored)-orange" alt="Balkan">
    </p>

  <hr>

  <h2>📌 Alcance de esta rama (react-version)</h2>
    <p>No es un fork ni una copia — es una <strong>reimplementación</strong> de la lógica de <code>organigrama-lineasNegocio</code> (ver su propio README) en componentes React, con la misma librería de chart:</p>
    <ul>
        <li><strong>Sin Next.js</strong>: el esqueleto inicial mezclaba CRA + Next sin usarse — se limpió, solo queda <code>react-scripts</code>.</li>
        <li><strong>Balkan Pro licenciado, vendorizado</strong>: <code>public/vendor/orgchart-pro.js</code> es una copia literal de <code>BalkanPro/orgchart.js</code>, cargada como <code>&lt;script&gt;</code> global (<code>window.OrgChart</code>) — no el paquete gratuito de npm.</li>
        <li><strong>Lógica portada, no reinventada</strong>: layout plano, fantasmas, clones anti-duplicación, fusión Carnicería, promoción Marketing bajo Retail, líneas de reporte visual (<code>_slinksManuales</code>), auto-expand de 1 nivel al filtrar por línea — todo 1:1 con <code>organigrama-lineasNegocio</code>.</li>
        <li>Detalle de arquitectura y mapeo archivo-por-archivo: nota <code>07 - React Version (react-version)</code> en la bóveda del equipo.</li>
    </ul>

  <h2>✅ Qué incluye la Fase 1</h2>
    <ul>
        <li>Fetch + transformación de datos del API (vista <strong>Persona</strong> únicamente).</li>
        <li>Filtro por Línea de Negocio (Todas, Balanceado, Cárnicos, Pecuarios, Carnicería, Marketing, Retail, Corporativo, Derivados).</li>
        <li>Todos los casos especiales validados en <code>organigrama-lineasNegocio</code>: nodos fantasma, clones de Andrés Herrera/Cárnicos, jefe de Carnicería/Marketing con estilo propio, Comité de Productos Derivados, líneas de reporte visual Presidente/Gerente General → líneas de negocio.</li>
        <li>Auto-expand de 1 nivel al filtrar una línea puntual (excepto Corporativo y Cárnicos).</li>
    </ul>

  <h2>⏳ Qué queda para Fase 2 (no implementado aún)</h2>
    <ul>
        <li>Modo Foco (drill-down a subárbol).</li>
        <li>Búsqueda de empleados.</li>
        <li>Exportar SVG/PDF.</li>
        <li>Vista por Cargo.</li>
        <li>Permisos por rol (<code>procesarLoginDeUsuario</code> completo — hoy todo usuario ve todo).</li>
        <li>Integración <code>postMessage</code> con el wrapper <code>index.aspx</code> de la intranet.</li>
        <li>Responsive fino (breakpoints móviles).</li>
        <li>Ficha de detalle al hacer click en un nodo (editUI de Balkan).</li>
    </ul>

  <hr>

  <h2>⚙️ Stack</h2>
    <ul>
        <li><strong>Frontend:</strong> React 19 + Create React App (<code>react-scripts</code>) — sin Next.js.</li>
        <li><strong>Librería de chart:</strong> Balkan OrgChart JS Pro, vendorizada en <code>public/vendor/orgchart-pro.js</code> — no modificar.</li>
        <li><strong>Datos:</strong> API REST de Delportal (WordPress), ambiente <strong>QA</strong> (<code>mobileqa.liris.com.ec</code>).</li>
    </ul>

  <h2>📋 Requisitos</h2>
    <ul>
        <li>Acceso a la <strong>red corporativa interna</strong> (o VPN) — el fetch al API no funciona sin esto.</li>
        <li>Node.js + npm.</li>
    </ul>

  <h2>🚀 Instalación y Desarrollo Local</h2>
  <ol>
        <li>
            <strong>Clonar el repositorio</strong> y hacer checkout de esta rama:
            <pre><code>git clone git@github-empresa:LirisDev/Organigrama.git
git checkout react-version
cd orgchart</code></pre>
        </li>
        <li>
            <strong>Instalar dependencias y correr:</strong>
            <pre><code>npm install
npm start</code></pre>
            Abre <code>http://localhost:3000</code>.
        </li>
        <li>
            <strong>Build de producción</strong> (no requiere red, solo valida que el código compile):
            <pre><code>npm run build</code></pre>
        </li>
    </ol>

  <h2>🏗️ Arquitectura (resumen)</h2>
    <ul>
        <li><code>src/data/</code>: fetch + sanitización de datos crudos del API.</li>
        <li><code>src/config/cabezasNegocio.js</code>: mapa de líneas de negocio activas (equivalente a <code>CABEZAS_NEGOCIO_TEMP</code>).</li>
        <li><code>src/orgchart/buildTree.js</code>: función pura que arma el árbol final a renderizar (equivalente a <code>renderOrganigramaGrupos</code> + <code>cargarYFinalizar</code>).</li>
        <li><code>src/orgchart/templates.js</code>: registro de templates visuales de Balkan.</li>
        <li><code>src/orgchart/expandLogic.js</code>: auto-expand de fantasmas + retry ante <code>chart.getNode()</code> no listo.</li>
        <li><code>src/components/OrgChartCanvas.jsx</code>: wrapper de Balkan para React (class + ref, patrón heredado de <code>myorg.js</code> original).</li>
        <li><code>src/components/FilterBar.jsx</code> + <code>src/App.jsx</code>: UI y orquestación.</li>
    </ul>
    <p>Detalle completo: nota <code>07 - React Version (react-version)</code> en la bóveda del equipo.</p>

  <h2>📐 Estándares del equipo</h2>
    <p>Esta rama sigue los <strong>Estándares de Desarrollo (GitHub y SQL) de LIRIS S.A.</strong> — convención de ramas/commits (<code>tipo(scope): descripción</code>), checklist pre-PR, nunca commit directo a <code>main</code>/<code>develop</code>. Ver documentación interna del equipo antes de abrir un PR.</p>

  <h2>👨‍💻 Autor / Mantenedor</h2>
    <p>
      <strong><a href="https://www.linkedin.com/in/daroyane/" target="_blank" style="text-decoration: none; color: #0077b5; font-size: 1.1em;">David Romero Yánez</a></strong><br>
      <em>Ingeniero de Desarrollo</em><br>
        Departamento de Sistemas - LIRIS S.A.
    </p>
  <hr>
    <p><em>Documentación actualizada a Julio 2026.</em></p>
