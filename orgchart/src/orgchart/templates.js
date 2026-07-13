// Registro de templates Balkan (ficha, grupos, fantasmas, comité) — portado
// de index_sistemas_jerarquias.html tal cual, ejecutar UNA sola vez contra
// window.OrgChart (vendored en public/vendor/orgchart-pro.js) antes de crear
// la instancia del chart.
let _registered = false;

const PERSON_ICON_PATH =
  "M7.461 2.356c-1.292 0 -2.339 1.223 -2.339 2.731 0 1.046 0.504 1.954 1.243 2.413l-0.858 0.398 -2.282 1.059c-0.221 0.11 -0.331 0.297 -0.331 0.562v2.514c0.018 0.314 0.207 0.607 0.512 0.612h8.12c0.349 -0.03 0.526 -0.312 0.529 -0.612V9.518c0 -0.265 -0.11 -0.452 -0.331 -0.562l-2.2 -1.059 -0.914 -0.433c0.709 -0.469 1.188 -1.358 1.188 -2.377 0 -1.508 -1.047 -2.731 -2.339 -2.731m-3.773 0.96c-0.556 0.021 -0.996 0.262 -1.331 0.645 -0.37 0.461 -0.551 1.009 -0.554 1.554 0.023 0.806 0.383 1.569 1.025 1.968L0.265 8.675C0.088 8.741 0 8.895 0 9.138v2.017c0.014 0.268 0.153 0.492 0.413 0.496h1.704V9.518c0.028 -0.57 0.296 -1.032 0.777 -1.257l1.703 -0.81c0.132 -0.077 0.259 -0.182 0.38 -0.314 -0.702 -1.083 -0.8 -2.381 -0.347 -3.523 -0.294 -0.18 -0.625 -0.296 -0.943 -0.298m7.607 0c-0.364 0.008 -0.7 0.141 -0.975 0.331 0.44 1.152 0.319 2.45 -0.331 3.457 0.143 0.165 0.293 0.292 0.447 0.38l1.637 0.777c0.499 0.274 0.756 0.739 0.761 1.257v2.134h1.753c0.288 -0.025 0.411 -0.255 0.414 -0.496V9.138c0 -0.221 -0.088 -0.375 -0.265 -0.463l-2.53 -1.208c0.656 -0.484 0.986 -1.209 0.992 -1.951 -0.017 -0.588 -0.197 -1.133 -0.554 -1.554 -0.373 -0.405 -0.836 -0.641 -1.348 -0.645";

export function registerTemplates() {
  if (_registered) return;
  const OrgChart = window.OrgChart;
  if (!OrgChart) throw new Error("window.OrgChart no está cargado (vendor/orgchart-pro.js)");

  OrgChart.templates.fichaTemplate = Object.assign({}, OrgChart.templates.base);
  OrgChart.templates.fichaTemplate.size = [250, 110];
  OrgChart.templates.fichaTemplate.editFormHeaderColor = "#F57C00";
  OrgChart.templates.fichaTemplate.defs += `
    <linearGradient id="fichaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFEFFF;stop-opacity:1" />
    </linearGradient>`;
  OrgChart.templates.fichaTemplate.node =
    '<rect x="0" y="0" width="250" height="110" fill="url(#fichaGradient)" stroke="#FDBE86" rx="6" ry="6"></rect>';
  OrgChart.templates.fichaTemplate.img_0 =
    '<clipPath id="{randId}"><circle cx="40" cy="55" r="30"></circle></clipPath>' +
    '<image preserveAspectRatio="xMidYMid slice" clip-path="url(#{randId})" xlink:href="{val}" x="10" y="25" width="60" height="60"></image>';
  OrgChart.templates.fichaTemplate.field_0 =
    '<foreignObject x="85" y="25" width="130" height="40">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 14px; font-weight: bold; color: #D35400; line-height: 1.2; height: auto; max-height: 34px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; text-align: left;">' +
    "{val}</div></foreignObject>";
  OrgChart.templates.fichaTemplate.field_1 =
    '<foreignObject x="85" y="60" width="130" height="30">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 11px; color: #797D7F; line-height: 1.2; height: auto; max-height: 27px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; text-align: left;">' +
    "{val}</div></foreignObject>";
  OrgChart.templates.fichaTemplate.field_2 = "";
  OrgChart.templates.fichaTemplate.field_3 =
    '<g class="focus-btn" data-focus-btn="{val}" style="cursor:pointer;" transform="translate(220, 5)">' +
    '<rect x="0" y="0" width="24" height="24" rx="4" fill="#F57C00" opacity="0.9"></rect>' +
    '<circle cx="12" cy="12" r="8" stroke="white" stroke-width="1.5" fill="none"></circle>' +
    '<circle cx="12" cy="12" r="3" fill="white"></circle>' +
    '<line x1="12" y1="4" x2="12" y2="8" stroke="white" stroke-width="1.5"></line>' +
    '<line x1="12" y1="16" x2="12" y2="20" stroke="white" stroke-width="1.5"></line>' +
    '<line x1="4" y1="12" x2="8" y2="12" stroke="white" stroke-width="1.5"></line>' +
    '<line x1="16" y1="12" x2="20" y2="12" stroke="white" stroke-width="1.5"></line></g>';

  const botonDoble =
    '<rect x="-11" y="2" height="32" width="50" rx="7" ry="7" stroke-width="0" fill="#F57C00"></rect>' +
    '<line x1="-5" y1="18" x2="33" y2="18" stroke-width="0.5" stroke="rgba(255,255,255,0.4)"></line>' +
    '<circle stroke="#ffffff" stroke-width="1.2" fill="none" cx="6" cy="9" r="1.5"></circle>' +
    '<rect x="3" y="11" rx="0.5" ry="0.5" height="1.5" width="6" stroke-width="0" fill="#ffffff"></rect>' +
    '<line x1="2.5" y1="13" x2="9.5" y2="13" stroke-width="1.2" stroke="#ffffff"></line>' +
    '<text text-anchor="middle" style="font-size: 9px; cursor:pointer;" font-weight="bold" fill="#ffffff" x="28" y="13">{children-count}</text>' +
    '<svg x="-3" y="20" width="10" height="10" viewBox="0 0 15 15" fill="#ffffff"><path d="' +
    PERSON_ICON_PATH +
    '"/></svg>' +
    '<text text-anchor="middle" style="font-size: 9px; cursor:pointer;" font-weight="bold" fill="#ffffff" x="28" y="28">{children-total-count}</text>';

  const botonGrupo = `
    <g transform="matrix(1,0,0,1,-11,2)">
      <rect x="0" y="0" height="32" width="50" rx="7" ry="7" fill="#F57C00"></rect>
      <path fill="#ffffff" transform="translate(14, 9) scale(0.9)" d="${PERSON_ICON_PATH}"/>
      <text text-anchor="middle" style="font-size: 11px; cursor:pointer;" font-weight="bold" fill="#ffffff" x="39" y="20">{children-count}</text>
    </g>`;

  const botonPersona = `
    <g transform="matrix(1,0,0,1,-11,2)">
      <rect x="0" y="0" height="32" width="50" rx="7" ry="7" fill="#F57C00"></rect>
      <circle stroke="#ffffff" stroke-width="1.2" fill="none" cx="17" cy="14" r="3.5"></circle>
      <rect x="14" y="18" rx="1" ry="1" height="2.5" width="6" fill="#ffffff"></rect>
      <text text-anchor="middle" style="font-size: 11px; cursor:pointer;" font-weight="bold" fill="#ffffff" x="39" y="20">{children-count}</text>
    </g>`;

  OrgChart.templates.fichaComplex = Object.assign({}, OrgChart.templates.fichaTemplate);
  OrgChart.templates.fichaComplex.plus = botonDoble;
  OrgChart.templates.fichaComplex.minus = botonDoble;

  OrgChart.templates.jefeCarniceria = Object.assign({}, OrgChart.templates.fichaTemplate);
  OrgChart.templates.jefeCarniceria.plus = botonDoble;
  OrgChart.templates.jefeCarniceria.minus = botonDoble;
  OrgChart.templates.jefeCarniceria.node =
    '<rect x="0" y="0" width="250" height="120" fill="#FFF0EC" stroke="#C0392B" stroke-width="1.5" rx="6" ry="6"></rect>' +
    '<rect x="0" y="0" width="250" height="22" fill="#C0392B" rx="6" ry="6"></rect>' +
    '<rect x="0" y="12" width="250" height="10" fill="#C0392B"></rect>' +
    '<text x="125" y="15" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="bold" font-family="sans-serif" fill="white" letter-spacing="1">CARNICERÍA</text>';
  OrgChart.templates.jefeCarniceria.size = [250, 120];
  OrgChart.templates.jefeCarniceria.img_0 =
    '<clipPath id="{randId}"><circle cx="40" cy="68" r="28"></circle></clipPath>' +
    '<image preserveAspectRatio="xMidYMid slice" clip-path="url(#{randId})" xlink:href="{val}" x="12" y="40" width="56" height="56"></image>';
  OrgChart.templates.jefeCarniceria.field_0 =
    '<foreignObject x="85" y="30" width="130" height="36">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:13px;font-weight:bold;color:#C0392B;line-height:1.2;max-height:34px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">{val}</div></foreignObject>';
  OrgChart.templates.jefeCarniceria.field_1 =
    '<foreignObject x="85" y="68" width="130" height="28">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:10px;color:#797D7F;line-height:1.2;max-height:26px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">{val}</div></foreignObject>';
  OrgChart.templates.jefeCarniceria.field_3 =
    '<g class="focus-btn" data-focus-btn="{val}" style="cursor:pointer;" transform="translate(220, 28)">' +
    '<rect x="0" y="0" width="24" height="24" rx="4" fill="#C0392B" opacity="0.85"></rect>' +
    '<circle cx="12" cy="12" r="8" stroke="white" stroke-width="1.5" fill="none"></circle>' +
    '<circle cx="12" cy="12" r="3" fill="white"></circle>' +
    '<line x1="12" y1="4" x2="12" y2="8" stroke="white" stroke-width="1.5"></line>' +
    '<line x1="12" y1="16" x2="12" y2="20" stroke="white" stroke-width="1.5"></line>' +
    '<line x1="4" y1="12" x2="8" y2="12" stroke="white" stroke-width="1.5"></line>' +
    '<line x1="16" y1="12" x2="20" y2="12" stroke="white" stroke-width="1.5"></line></g>';

  OrgChart.templates.jefeMarketing = Object.assign({}, OrgChart.templates.fichaTemplate);
  OrgChart.templates.jefeMarketing.plus = botonDoble;
  OrgChart.templates.jefeMarketing.minus = botonDoble;
  OrgChart.templates.jefeMarketing.node =
    '<rect x="0" y="0" width="250" height="120" fill="#F5EEF8" stroke="#8E44AD" stroke-width="1.5" rx="6" ry="6"></rect>' +
    '<rect x="0" y="0" width="250" height="22" fill="#8E44AD" rx="6" ry="6"></rect>' +
    '<rect x="0" y="12" width="250" height="10" fill="#8E44AD"></rect>' +
    '<text x="125" y="15" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="bold" font-family="sans-serif" fill="white" letter-spacing="1">MARKETING</text>';
  OrgChart.templates.jefeMarketing.size = [250, 120];
  OrgChart.templates.jefeMarketing.img_0 =
    '<clipPath id="{randId}"><circle cx="40" cy="68" r="28"></circle></clipPath>' +
    '<image preserveAspectRatio="xMidYMid slice" clip-path="url(#{randId})" xlink:href="{val}" x="12" y="40" width="56" height="56"></image>';
  OrgChart.templates.jefeMarketing.field_0 =
    '<foreignObject x="85" y="30" width="130" height="36">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:13px;font-weight:bold;color:#8E44AD;line-height:1.2;max-height:34px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">{val}</div></foreignObject>';
  OrgChart.templates.jefeMarketing.field_1 =
    '<foreignObject x="85" y="68" width="130" height="28">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:10px;color:#797D7F;line-height:1.2;max-height:26px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">{val}</div></foreignObject>';
  OrgChart.templates.jefeMarketing.field_3 =
    '<g class="focus-btn" data-focus-btn="{val}" style="cursor:pointer;" transform="translate(220, 28)">' +
    '<rect x="0" y="0" width="24" height="24" rx="4" fill="#8E44AD" opacity="0.85"></rect>' +
    '<circle cx="12" cy="12" r="8" stroke="white" stroke-width="1.5" fill="none"></circle>' +
    '<circle cx="12" cy="12" r="3" fill="white"></circle>' +
    '<line x1="12" y1="4" x2="12" y2="8" stroke="white" stroke-width="1.5"></line>' +
    '<line x1="12" y1="16" x2="12" y2="20" stroke="white" stroke-width="1.5"></line>' +
    '<line x1="4" y1="12" x2="8" y2="12" stroke="white" stroke-width="1.5"></line>' +
    '<line x1="16" y1="12" x2="20" y2="12" stroke="white" stroke-width="1.5"></line></g>';

  // Priscilla (cabeza de Derivados): mismo patrón, header amarillo (color
  // ya reservado a Derivados en styles.css de la rama vanilla).
  OrgChart.templates.jefeDerivados = Object.assign({}, OrgChart.templates.fichaTemplate);
  OrgChart.templates.jefeDerivados.plus = botonDoble;
  OrgChart.templates.jefeDerivados.minus = botonDoble;
  OrgChart.templates.jefeDerivados.node =
    '<rect x="0" y="0" width="250" height="120" fill="#FFFBE0" stroke="#C9B000" stroke-width="1.5" rx="6" ry="6"></rect>' +
    '<rect x="0" y="0" width="250" height="22" fill="#e9dc21" rx="6" ry="6"></rect>' +
    '<rect x="0" y="12" width="250" height="10" fill="#e9dc21"></rect>' +
    '<text x="125" y="15" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="bold" font-family="sans-serif" fill="#4a3f00" letter-spacing="1">DERIVADOS</text>';
  OrgChart.templates.jefeDerivados.size = [250, 120];
  OrgChart.templates.jefeDerivados.img_0 =
    '<clipPath id="{randId}"><circle cx="40" cy="68" r="28"></circle></clipPath>' +
    '<image preserveAspectRatio="xMidYMid slice" clip-path="url(#{randId})" xlink:href="{val}" x="12" y="40" width="56" height="56"></image>';
  OrgChart.templates.jefeDerivados.field_0 =
    '<foreignObject x="85" y="30" width="130" height="36">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:13px;font-weight:bold;color:#8A7600;line-height:1.2;max-height:34px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">{val}</div></foreignObject>';
  OrgChart.templates.jefeDerivados.field_1 =
    '<foreignObject x="85" y="68" width="130" height="28">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:10px;color:#797D7F;line-height:1.2;max-height:26px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">{val}</div></foreignObject>';
  OrgChart.templates.jefeDerivados.field_3 =
    '<g class="focus-btn" data-focus-btn="{val}" style="cursor:pointer;" transform="translate(220, 28)">' +
    '<rect x="0" y="0" width="24" height="24" rx="4" fill="#C9B000" opacity="0.85"></rect>' +
    '<circle cx="12" cy="12" r="8" stroke="white" stroke-width="1.5" fill="none"></circle>' +
    '<circle cx="12" cy="12" r="3" fill="white"></circle>' +
    '<line x1="12" y1="4" x2="12" y2="8" stroke="white" stroke-width="1.5"></line>' +
    '<line x1="12" y1="16" x2="12" y2="20" stroke="white" stroke-width="1.5"></line>' +
    '<line x1="4" y1="12" x2="8" y2="12" stroke="white" stroke-width="1.5"></line>' +
    '<line x1="16" y1="12" x2="20" y2="12" stroke="white" stroke-width="1.5"></line></g>';

  OrgChart.templates.fichaGroup = Object.assign({}, OrgChart.templates.fichaTemplate);
  OrgChart.templates.fichaGroup.plus = botonGrupo;
  OrgChart.templates.fichaGroup.minus = botonGrupo;

  OrgChart.templates.fichaSingle = Object.assign({}, OrgChart.templates.fichaTemplate);
  OrgChart.templates.fichaSingle.plus = botonPersona;
  OrgChart.templates.fichaSingle.minus = botonPersona;

  OrgChart.templates.fichaTemplate.ripple = {
    radius: 15,
    color: "#F57C00",
    rect: { x: 0, y: 0, width: 250, height: 110, rx: 15, ry: 15 },
  };

  OrgChart.templates.vacanteTemplate = Object.assign({}, OrgChart.templates.fichaTemplate);
  OrgChart.templates.vacanteTemplate.node = '<rect x="0" y="0" height="{h}" width="{w}" fill="#4a4a4a" rx="5" ry="5"></rect>';
  OrgChart.templates.vacanteTemplate.img_0 = "";
  OrgChart.templates.vacanteTemplate.field_0 =
    '<foreignObject x="10" y="30" width="230" height="40">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 16px; font-weight: bold; color: #ffffff; line-height: 1.2; height: auto; max-height: 38px; text-align: center; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">' +
    "{val}</div></foreignObject>";
  OrgChart.templates.vacanteTemplate.field_1 =
    '<foreignObject x="10" y="75" width="230" height="20">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 14px; font-style: italic; color: #e0e0e0; line-height: 1.2; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' +
    "{val}</div></foreignObject>";

  OrgChart.templates.vacanteComplex = Object.assign({}, OrgChart.templates.vacanteTemplate);
  OrgChart.templates.vacanteComplex.plus = botonDoble;
  OrgChart.templates.vacanteComplex.minus = botonDoble;
  OrgChart.templates.vacanteGroup = Object.assign({}, OrgChart.templates.vacanteTemplate);
  OrgChart.templates.vacanteGroup.plus = botonGrupo;
  OrgChart.templates.vacanteGroup.minus = botonGrupo;
  OrgChart.templates.vacanteSingle = Object.assign({}, OrgChart.templates.vacanteTemplate);
  OrgChart.templates.vacanteSingle.plus = botonPersona;
  OrgChart.templates.vacanteSingle.minus = botonPersona;
  OrgChart.templates.vacanteSimple = Object.assign({}, OrgChart.templates.vacanteTemplate);

  // Fantasma: nodo invisible de tamaño cero, usado como cabeza-oculta o
  // como relleno de alineación entre grupos.
  OrgChart.templates.ghost = Object.assign({}, OrgChart.templates.ana);
  OrgChart.templates.ghost.size = [0, 0];
  OrgChart.templates.ghost.node = "";
  OrgChart.templates.ghost.plus = "";
  OrgChart.templates.ghost.minus = "";
  OrgChart.templates.ghost.link = "";
  OrgChart.templates.ghost.img_0 = "";
  OrgChart.templates.ghost.field_0 = "";
  OrgChart.templates.ghost.field_1 = "";
  OrgChart.templates.ghost.field_2 = "";
  OrgChart.templates.ghost.field_3 = "";

  // Group: sin línea al padre y sin botón +/- (los grupos se colapsan por
  // gesto de click en 'chart.on("click"...)', no por su propio botón).
  OrgChart.templates.group.link = "";
  OrgChart.templates.group.nodeMenuButton = "";
  OrgChart.templates.group.plus = "";
  OrgChart.templates.group.minus = "";

  OrgChart.templates.groupNoLink = Object.assign({}, OrgChart.templates.group);
  OrgChart.templates.groupNoLink.link = "";

  OrgChart.templates.group.min = Object.assign({}, OrgChart.templates.group);
  OrgChart.templates.group.min.link = "";
  OrgChart.templates.group.min.imgs = `{val}`;
  OrgChart.templates.group.min.img_0 = ``;
  OrgChart.templates.group.min.size = [310, 190];

  OrgChart.templates.group.miGlobo = "{val}";
  OrgChart.templates.group.counter =
    '<g transform="translate({cx}, {h})">' +
    '<rect x="-25" y="-12" width="50" height="24" rx="12" ry="12" fill="#F57C00" stroke="#ffffff" stroke-width="2"></rect>' +
    '<svg x="-18" y="-8" width="16" height="16" viewBox="0 0 15 15" fill="#ffffff"><path d="' +
    PERSON_ICON_PATH +
    '"/></svg>' +
    '<text x="8" y="5" text-anchor="middle" fill="#ffffff" style="font-size: 11px; font-weight: bold;">{val}</text></g>';

  OrgChart.templates.orange = Object.assign({}, OrgChart.templates.ana);
  OrgChart.templates.orange.link = '<path stroke-dasharray="5, 5" stroke="#F57C00" stroke-width="2" fill="none" d="{d}" />';
  OrgChart.templates.orange.link_field_0 = '<text text-anchor="middle" fill="#F57C00" font-size="10px" x="{x}" y="{y}">{val}</text>';

  OrgChart.templates.comiteTemplate = Object.assign({}, OrgChart.templates.fichaTemplate);
  OrgChart.templates.comiteTemplate.size = [250, 160];
  OrgChart.templates.comiteTemplate.node =
    '<rect x="0" y="0" width="250" height="180" fill="url(#fichaGradient)" stroke="#FDBE86" rx="6" ry="6"></rect>' +
    '<path d="M0 6 L 0 174 Q 0 180 6 180 L 6 180 Q 0 180 0 174 L 0 6 Q 0 0 6 0 L 6 0 Q 0 0 0 6 Z" fill="#F57C00"></path>';
  OrgChart.templates.comiteTemplate.field_0 =
    '<foreignObject x="85" y="15" width="150" height="50">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 13px; font-weight: bold; color: #D35400; line-height: 1.1; text-align: left;">{val}</div></foreignObject>';
  OrgChart.templates.comiteTemplate.field_1 =
    '<foreignObject x="85" y="65" width="155" height="90">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 8.5px; color: #555; line-height: 1.2; text-align: left; white-space: pre-line; word-wrap: break-word; overflow: hidden; height: 90px;">{val}</div></foreignObject>';
  OrgChart.templates.comiteTemplate.ripple = {
    radius: 15,
    color: "#F57C00",
    rect: { x: 0, y: 0, width: 250, height: 160, rx: 15, ry: 15 },
  };

  OrgChart.templates.comiteComplex = Object.assign({}, OrgChart.templates.comiteTemplate);
  OrgChart.templates.comiteComplex.plus = botonDoble;
  OrgChart.templates.comiteComplex.minus = botonDoble;
  OrgChart.templates.comiteGroup = Object.assign({}, OrgChart.templates.comiteTemplate);
  OrgChart.templates.comiteGroup.plus = botonGrupo;
  OrgChart.templates.comiteGroup.minus = botonGrupo;
  OrgChart.templates.comiteSingle = Object.assign({}, OrgChart.templates.comiteTemplate);
  OrgChart.templates.comiteSingle.plus = botonPersona;
  OrgChart.templates.comiteSingle.minus = botonPersona;

  // Fantasma de subnivel (relleno cuando se saltan niveles jerárquicos):
  // misma altura que un nodo real para no romper el alineamiento vertical
  // entre grupos, con una línea de conector vertical continua.
  OrgChart.templates.subLevel.size = [250, 110];
  OrgChart.templates.subLevel.node = '<line x1="125" y1="0" x2="125" y2="110" stroke="#aeaeae" stroke-width="1px"/>';
  // Se dispara antes de insertar los fantasmas de subLevel, causando doble
  // offset en nodos con más de un hijo hoja — deshabilitado.
  OrgChart.MIXED_LAYOUT_IF_NUMBER_OF_CHILDREN_IS_MORE_THEN = 99;

  OrgChart.VERTICAL_CHILDREN_ASSISTANT = true;

  _registered = true;
}

export const personaBinding = {
  field_0: "nombre",
  field_1: "puesto",
  field_3: "id",
  img_0: "img",
  conteo: "conteo",
  miGlobo: "conteo",
};

export function buildTagsConfig(OrgChart) {
  return {
    "sub-level-0": { subLevels: 0, levelSeparation: 60 },
    "sub-level-1": { subLevels: 1, levelSeparation: 60 },
    "sub-level-2": { subLevels: 2, levelSeparation: 60 },
    "sub-level-3": { subLevels: 3, levelSeparation: 60 },
    "sub-level-4": { subLevels: 4, levelSeparation: 60 },
    "sub-level-5": { subLevels: 5, levelSeparation: 60 },
    "sub-level-6": { subLevels: 6, levelSeparation: 60 },
    "sub-level-7": { subLevels: 7, levelSeparation: 60 },
    "sub-level-8": { subLevels: 8, levelSeparation: 60 },
    "sub-level-9": { subLevels: 9, levelSeparation: 60 },
    "sub-level-10": { subLevels: 10, levelSeparation: 60 },
    "group-head-align": { levelSeparation: 100 },
    group: { template: "group", nodeBinding: { conteo: "conteo", imgs: "grupoMinFotos" } },
    groupNoLink: { template: "groupNoLink", nodeBinding: { conteo: "conteo", imgs: "grupoMinFotos" } },
    fichaComplex: { template: "fichaComplex" },
    "jefe-carniceria": { template: "jefeCarniceria" },
    "jefe-marketing": { template: "jefeMarketing" },
    "jefe-derivados": { template: "jefeDerivados" },
    fichaGroup: { template: "fichaGroup" },
    fichaSingle: { template: "fichaSingle" },
    vacanteComplex: { template: "vacanteComplex" },
    vacanteGroup: { template: "vacanteGroup" },
    vacanteSingle: { template: "vacanteSingle" },
    comiteComplex: { template: "comiteComplex" },
    comiteGroup: { template: "comiteGroup" },
    comiteSingle: { template: "comiteSingle" },
    comiteTemplate: { template: "comiteTemplate" },
    vacanteSimple: { template: "vacanteSimple" },
    fantasma: { template: "ghost", nodeExtent: { width: 0, height: 0 } },
    filter: { template: "dot" },
    levelSeparation: 20,
    "level-0": {},
    "level-1": {},
    "level-2": {},
    "level-3": {},
    "level-4": {},
    "level-5": {},
    "level-6": {},
    "level-7": {},
    "level-8": {},
    "level-9": {},
    "level-99": {},
    "sublevel-node": {},
  };
}
