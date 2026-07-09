  <h1>🏢 Organigrama Corporativo LIRIS S.A. — Líneas de Negocio</h1>

  <blockquote>
        <p>Visualización interactiva de la estructura organizacional de <strong>LIRIS S.A.</strong>, basada en <strong>Balkan OrgChart JS (Pro)</strong>. Rama <strong>más reciente y activa</strong> — reemplaza el modelo de cajas anidadas de <code>organigrama-holding</code> por un <strong>layout plano con líneas de reportaje visuales</strong> entre líneas de negocio.</p>
    </blockquote>

   <p>
        <img src="https://img.shields.io/badge/Estado-QA%20%2F%20En%20desarrollo-orange" alt="Estado">
        <img src="https://img.shields.io/badge/Data-JSON_API_QA-blue" alt="Data">
        <img src="https://img.shields.io/badge/Build-No_requerido-lightgrey" alt="Build">
        <img src="https://img.shields.io/badge/Mobile-Optimized-orange" alt="Responsive">
    </p>

  <hr>

  <h2>📌 Alcance de esta rama (organigrama-lineasNegocio)</h2>
    <p><strong>Rama activa de trabajo</strong> — es donde se implementan los cambios más recientes antes de promoverlos a otras variantes. Evoluciona el modelo de <code>organigrama-holding</code>:</p>
    <ul>
        <li><strong>Sin cajas de división intermedias</strong>: las líneas de negocio (Balanceado, Cárnicos, Pecuarios, Retail) cuelgan directo de <code>GRP_CORPORATIVO</code> — ya no existe el nivel "División Industrial/Comercial/Pecuario" de <code>holding</code>.</li>
        <li><strong>Líneas de reportaje visuales (<code>_slinksManuales</code>)</strong>: en vez de que Balkan dibuje el conector real padre→hijo del grupo, se inyectan líneas SVG manuales en el evento <code>render</code> (con color propio) para que Presidente/Gerente General "reporten visualmente" hacia cada línea de negocio sin que esa línea cuelgue realmente de ellos en el árbol. Se ve en la naranja/roja entre Santiago y Cárnicos/Pecuarios/Balanceado en las capturas.</li>
        <li><strong>Nodos clon para personal compartido entre líneas</strong>: Andrés Herrera (id <code>9987</code>) y el nodo de Cárnicos (<code>codigoPosicion 00943</code>) se duplican visualmente para aparecer en más de una línea de negocio sin romper el árbol real.</li>
        <li><strong>Nodos fantasma (cabeza invisible)</strong>: Carnicería, Cárnicos y Pecuarios usan una cabeza con <code>tags: ["fantasma"]</code> — invisible en el canvas — de la que cuelgan sus hijos con normalidad (ver 3ra captura: al filtrar por "Carnicería" aparece el sub-grupo <strong>CARNICERÍA</strong> dentro de la caja <strong>CARNICOS</strong>, con Jean Pierre Rodríguez como jefe).</li>
        <li><strong>Comité de Productos Derivados</strong> como "partner" del Presidente, dentro de la misma caja Corporativo (no como caja aparte).</li>
        <li><strong>Contadores</strong> por caja igual que en <code>holding</code> (directos / total subárbol).</li>
        <li>También apunta al endpoint de <strong>QA</strong>.</li>
    </ul>
    <p>Resto de funciones sin cambios: maximizar/minimizar, colapsar/expandir, centrar, orientación vertical/horizontal, exportar SVG, filtros de Divisiones/Líneas, vista Persona/Cargo, búsqueda con resaltado, ficha de detalle.</p>
    <p>⚠️ Archivos extra en el repo (no tocar, no son el entry point activo): <code>index_proposito.html</code>, <code>index_sistemas_jerarquias2.html</code>, <code>index_sistemas_jerarquias-old.html</code>, <code>index_sistemas_jerarquias_backup.html</code>.</p>

  <hr>

  <h2>📸 Galería Visual</h2>

  <p><strong>Layout plano con líneas de reportaje</strong> — Balanceado, Cárnicos, Pecuarios y Retail cuelgan directo de Corporativo; la línea roja conecta a Santiago (Gerente General) con Cárnicos como reportaje visual, sin ser su padre real en el árbol:</p>
  <img src="img/demo-flat-slinks.png" alt="Layout plano con líneas de reportaje visuales" style="width: 100%; border: 1px solid #ddd; border-radius: 5px;">

  <table border="0" style="width: 100%; margin-top: 16px;">
        <tr>
            <td style="width: 50%; vertical-align: top;">
                <h3>👤 Ficha de detalle</h3>
                <p>Empleado de la línea Pecuarios, con Línea Negocio/Centro Costo/Área.</p>
                <img src="img/demo-ficha-pecuarios.png" alt="Ficha de detalle empleado Pecuarios" style="width: 100%; border: 1px solid #ddd; border-radius: 5px;">
            </td>
            <td style="width: 50%; vertical-align: top;">
                <h3>👻 Nodo fantasma — Carnicería</h3>
                <p>Filtrando por "Carnicería": aparece dentro de la caja Cárnicos, con Jean Pierre Rodríguez como Jefe de Carnicerías — la cabeza fantasma no se muestra, solo su subgrupo.</p>
                <img src="img/demo-carniceria-fantasma.png" alt="Sub-grupo Carnicería colgando de nodo fantasma" style="width: 100%; border: 1px solid #ddd; border-radius: 5px;">
            </td>
        </tr>
    </table>

  <hr>

  <h2>⚙️ Stack</h2>
    <ul>
        <li><strong>Frontend:</strong> HTML5 + CSS3 + JavaScript vanilla — sin build ni package manager.</li>
        <li><strong>Librería de chart:</strong> Balkan OrgChart JS Pro (<code>BalkanPro/orgchart.js</code>) — no modificar.</li>
        <li><strong>Configuración de líneas de negocio:</strong> <code>CABEZAS_ACTIVAS</code> (flat layout, reemplaza la iteración de <code>ESTRUCTURA_MACRO</code> de <code>holding</code>).</li>
        <li><strong>Datos:</strong> API REST de Delportal (WordPress), ambiente <strong>QA</strong>.</li>
    </ul>

  <h2>📋 Requisitos</h2>
    <ul>
        <li>Acceso a la <strong>red corporativa interna</strong> (o VPN).</li>
        <li>Cualquier servidor estático para pruebas locales (Live Server, <code>python3 -m http.server</code>).</li>
    </ul>

  <h2>🚀 Instalación y Desarrollo Local</h2>
  <ol>
        <li>
            <strong>Clonar el repositorio</strong> y hacer checkout de esta rama:
            <pre><code>git clone git@github-empresa:LirisDev/Organigrama.git
git checkout organigrama-lineasNegocio</code></pre>
        </li>
        <li>
            <strong>Servir el proyecto:</strong> Live Server (VS Code) o <code>python3 -m http.server</code>. Usar <code>index_sistemas_jerarquias.html</code>.
        </li>
        <li>
            <strong>Simular el login</strong> — en <code>procesarLoginDeUsuario()</code>, descomentar temporalmente:
            <pre><code>receivedUserId = "interno\\dromero"; //Asistente de desarrollo</code></pre>
            <p>Revertir antes de commitear.</p>
        </li>
    </ol>

  <h2>🏗️ Arquitectura (resumen)</h2>
    <ul>
        <li><code>CABEZAS_ACTIVAS</code>: mapa de líneas de negocio activas para el layout plano (sustituye a <code>ESTRUCTURA_MACRO</code>).</li>
        <li><code>_slinksManuales</code>: array de <code>{from, to}</code> con las líneas de reportaje visual, inyectadas como SVG en el evento <code>render</code> — <strong>nunca</strong> usar <code>chart.config.slinks</code> nativo de Balkan (crashea, corre antes de que existan todas las posiciones).</li>
        <li>Clones hardcodeados: Andrés Herrera (<code>9987</code>) y Cárnicos (<code>00943</code>) — no generalizar sin entender la lógica anti-duplicación.</li>
        <li>Fantasmas: <code>tags: ["fantasma"]</code> + <code>nodeExtent: {width:0, height:0}</code>, expandidos automáticamente post-render por <code>expandirFantasmas()</code>.</li>
    </ul>
    <p>Detalle completo en <code>CLAUDE.md</code> del repo (sección Architecture) — está escrito específicamente sobre el estado de esta rama.</p>

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
