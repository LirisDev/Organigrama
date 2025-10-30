// src/myorg.js
//// TODO SOBRE BALKAN REACT WRAPPER:
import React, { Component } from 'react';
import OrgChart, { node } from './orgchart.js'; // Importación local (como en el tutorial)

export default class OrgChartWrapper extends Component {

    constructor(props) {
        super(props);
        this.divRef = React.createRef();
        this.chart = null; // Guardaremos la instancia del gráfico aquí
    }

    // ¡¡IMPORTANTE!! Remueve 'shouldComponentUpdate' para permitir actualizaciones
    // shouldComponentUpdate() {
    //     return false; // NO USAR ESTO si los datos cambian
    // }

    // componentDidMount: Se ejecuta la primera vez que el componente se monta
    componentDidMount() {
        if (this.divRef.current && this.props.nodes && this.props.nodes.length > 0) {
            this.createChart(this.props.nodes);
        }
    }

    // componentDidUpdate: Se ejecuta cuando las props (ej. 'nodes') cambian
    componentDidUpdate(prevProps) {
        // Si los datos de 'nodes' han cambiado, actualizamos el gráfico
        if (this.props.nodes !== prevProps.nodes) {
            if (this.chart) {
                // Si el gráfico ya existe, solo carga los nuevos datos
                this.chart.load(this.props.nodes);
            } else if (this.divRef.current && this.props.nodes && this.props.nodes.length > 0) {
                // Si el gráfico no existía (ej. se cargó tarde), créalo
                this.createChart(this.props.nodes);
            }
        }
    }

    // componentWillUnmount: Se ejecuta antes de destruir el componente
    componentWillUnmount() {
        if (this.chart) {
            try {
                this.chart.destroy();
            } catch (e) {
                console.error("Error al destruir Balkan:", e);
            }
        }
    }

    // --- Función para crear el gráfico (con toda tu configuración) ---
    createChart(nodes) {
        
        // ***************************************************************
        // *** PEGA TODA LA CONFIGURACIÓN DE BALKAN DE TU .html AQUÍ ***
        // ***************************************************************

        // 1. Definición de Plantillas
        OrgChart.templates.fichaTemplate = Object.assign({}, OrgChart.templates.base);
        OrgChart.templates.fichaTemplate.size = [250, 110];
        OrgChart.templates.fichaTemplate.editFormHeaderColor = "#F57C00";
        // Definimos un gradiente en las definiciones SVG
        OrgChart.templates.fichaTemplate.defs += `
            <linearGradient id="fichaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#FFF3E0;stop-opacity:1" />  
                <stop offset="100%" style="stop-color:#FFE0B2;stop-opacity:1" /> 
            </linearGradient>`;
        // Usamos el gradiente en el nodo
        OrgChart.templates.fichaTemplate.node =
            '<rect x="0" y="0" width="250" height="110" fill="url(#fichaGradient)" stroke="#FDBE86" rx="6" ry="6"></rect>' +
            '<path d="M0 6 L 0 104 Q 0 110 6 110 L 6 110 Q 0 110 0 104 L 0 6 Q 0 0 6 0 L 6 0 Q 0 0 0 6 Z" fill="#F57C00"></path>';
        
        OrgChart.templates.fichaTemplate.img_0 = 
            '<clipPath id="{randId}"><circle cx="40" cy="55" r="30"></circle></clipPath>' +
            '<image preserveAspectRatio="xMidYMid slice" clip-path="url(#{randId})" xlink:href="{val}" x="10" y="25" width="60" height="60"></image>';

        OrgChart.templates.fichaTemplate.field_0 = // Nombre
            '<foreignObject x="85" y="25" width="155" height="40">' + // Contenedor
            // Div interno: auto height, max-height for 2 lines approx, ellipsis
            '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 14px; font-weight: bold; color: #D35400; line-height: 1.2; height: auto; max-height: 34px; /* Approx 2 lines */ overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; text-align: left;">' +
            '{val}' +
            '</div>' +
            '</foreignObject>';

        OrgChart.templates.fichaTemplate.field_1 = // Puesto
            '<foreignObject x="85" y="60" width="155" height="30">' + // Contenedor
            // Div interno: similar adjustments for ellipsis
            '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 11px; color: #797D7F; line-height: 1.2; height: auto; max-height: 27px; /* Approx 2 lines */ overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; text-align: left;">' +
            '{val}' +
            '</div>' +
            '</foreignObject>';
        OrgChart.templates.fichaTemplate.field_2 = /* ... (botón sin cambios) ... */
            '<rect x="85" y="88" width="70" height="18" fill="#4285F4" rx="4" ry="4"></rect>' +
            '<text style="font-size: 10px; cursor: pointer;" fill="#ffffff" x="120" y="100" text-anchor="middle">{val}</text>';
            

        OrgChart.templates.fichaTemplate.ripple = {
                radius: 15,
                color: "#F57C00",
                rect: { x: 0, y: 0, width: 250, height: 110, rx: 15, ry: 15 }
            };  // Ripple effect, al dar click en el nodo da un efecto visual           


        //OrgChart.templates.vacanteFichaTemplate = Object.assign({}, OrgChart.templates.fichaTemplate);

        
        // 2. Configuración de Tags
        const tagsConfig = {
            "sub-level-0": { subLevels: 0 },
            "sub-level-1": { subLevels: 1 },
            "sub-level-2": { subLevels: 2 },
            "sub-level-3": { subLevels: 3 },
            filter: {
                template: 'dot'
            },
            levelSeparation: 20,
            // Tag para la plantilla vacante
            "vacante": {
                template: "vacanteFichaTemplate", // Asegúrate que el nombre coincida
                nodeBinding: { field_0: "puesto" }
            },
            // Tags vacíos solo para que el CSS los pueda seleccionar
            "level-0": {}, "level-1": {}, "level-2": {}, "level-3": {},
            "level-4": {}, "level-5": {}, "level-6": {}, "level-7": {}, "level-99": {},
            "sublevel-node": {}
        };

        // 3. Configuración Principal del Gráfico
        const chartConfig = {
            //Configuraciones generales
            mouseScrool: OrgChart.action.Zoom,
            enableSearch: true,
            template: "fichaTemplate",
            layout: OrgChart.normal,
            scaleInitial: OrgChart.match.boundary, // Ajuste automático al contenedor, se visualiza todo
            //scaleInitial: 1,
            enableAI: true,
            /* filterBy: {
                puesto: {
                    // 'GERENTE GENERAL': { checked: true, text: 'Gerente General working'},
                    // 'ANALISTA DE SOPORTE': { checked: false, text: 'Analista not working'},
                },
                departamento: {},
                nombre: {},
            }, */

            nodes: nodes, // ¡Importante! Usa los datos de las props
            tags: tagsConfig,
            nodeBinding: {
                field_0: "nombre",
                field_1: "puesto",
                img_0: "img",
                //field_2: function(sender, node) { return "Ver ficha"; }
            },
            collapse: {
                level: 2,
                allChildren: true
            },
            expand: {
                nodes: [4281], // Expande el nodo con ID 4281(Daniel Rendon) y sus hijos
                allChildren: true // Expande todos los hijos del nodo 4281
            },
            controls: {
                pdf_export: { title: 'Export to PDF' },
                //png_preview: { title: 'Preview PNG' },
                zoom_in: { title: "Zoom In"},
                zoom_out: { title: "Zoom Out"},
                fit: { title: "Fit the chart"},
                full_screen : { title: "Expand All" },
                myControl: { 
                    title: 'My Control', 
                    icon: '<svg width="32px" height="32px"><path stroke-width="3" fill="none" stroke="#757575" d="M8,16 L16,8 L24,16"></path<>line x1="16" y1="8" x2="16" y2="24" stroke-width="3" stroke="#757575"></line></svg>',
                    onClick: function(){
                        alert('Control personalizado')
                    } 
                }
            },
            enableDragDrop: false, // Habilitar drag and drop
            // Ordenar subniveles por 'nivelJerarquico'
            sortSubLevelsSeparately: true,
            compareSubLevels: {
                order: (a, b) => a.order - b.order
            },
            nodeMenu: { details: { text: "Detalles" } },
            nodeExtent: { width: 250, height: 110 },
            editForm: { 
                photoBinding: "img", // the photo property name
                readOnly: true,
                titleBinding: "nombre", // a property name
                focusBinding: "puesto",
                buttons:  {
                    // Tu botón personalizado para redirigir
                    goToProfile: {
                        icon: OrgChart.icon.link(24, 24, '#fff'), // Un icono de enlace, por ejemplo
                        text: "Ir a Perfil",
                        onClick: function(nodeId) {
                            // Obtener los datos del nodo para construir la URL
                            const nodeData = this.chart.get(nodeId); //TODO:_ corregir
                            if (nodeData) {
                                // Ejemplo: Redirigir a una página de perfil usando el ID del nodo
                                // Asegúrate de que tu página de destino pueda manejar el parámetro 'id'
                                alert('Hola ',nodeData.nombre)
                                window.location.href = `profile.html?id=${nodeData.id}`;
                                // O si tienes una URL específica en los datos del nodo:
                                // if (nodeData.profileUrl) {
                                //     window.location.href = nodeData.profileUrl;
                                // } else {
                                //     alert('URL de perfil no definida para este usuario.');
                                // }
                            }
                        }
                    },
                    // Puedes añadir más botones aquí
                    // myOtherButton: {
                    //     text: "Otra Acción",
                    //     onClick: function(nodeId) {
                    //         alert(`Realizando otra acción para el nodo: ${nodeId}`);
                    //     }
                    // }

                    edit: {
                        icon: OrgChart.icon.edit(24,24,'#fff'),
                        text: 'Edit',
                        hideIfEditMode: true,
                        hideIfDetailsMode: false
                    },
                    share: {
                        icon: OrgChart.icon.share(24,24,'#fff'),
                        text: 'Share',
                        hideIfDetailsMode: true

                    },
                    pdf: {
                        icon: OrgChart.icon.pdf(24,24,'#fff'),
                        text: 'Save as PDF',
                        hideIfDetailsMode: true
                    },
                    remove: {
                        icon: OrgChart.icon.remove(24,24,'#fff'),
                        text: 'Remove',
                        hideIfDetailsMode: true
                    }
                },
                /* elements: [
                    { type: 'textbox', label: 'Full Name', binding: 'Name' },
                    { type: 'textbox', label: 'Phone number', binding: 'phone' }        
                ] */

                /* ... (tu configuración del editForm) ... */ 
            },
            menu: {
                pdf_export: {
                    text: "Export PDF",
                    //icon: pdfIcon
                },
                png_export: {
                    text: "Export PNG",
                    //icon: pngIcon
                },
                svg_export: {
                    text: "Export SVG",
                    //icon: svgIcon
                },
                csv_export: {
                    text: "Export CSV",
                    //icon: csvIcon
                }
            },
            
            //nodeClick: OrgChart.action,
            nodeSeparation: 65,
            //levelSeparation: 120,    // Espacio entre niveles
            siblingSeparation: 100, // Espacio entre nodos hermanos
            partnerNodeSeparation: 15,
        };

        // Personalización de IA y Búsqueda
        // Aquí se le pueden dar instrucciones al sistema de IA para que entienda el contexto de la empresa
        OrgChart.AI_SYSTEM_MESSAGES = ["Trabajas para una empresa llamada LIRIS..."];
        OrgChart.SEARCH_PLACEHOLDER = "Buscar por nombre o puesto...";

        // ***************************************************************
        // *** FIN DE LA CONFIGURACIÓN ***
        // ***************************************************************

        // 4. Crear la instancia de Balkan
        this.chart = new OrgChart(this.divRef.current, chartConfig);

        const searchInput = this.chart
        console.log("Search Input Element:", searchInput);

        // 5. Añadir Listeners (copia los que tenías)
        this.chart.searchUI.on('searchclick', function (sender, args) {
            sender.instance.center(args.nodeId, null, function(){
                sender.instance.zoom(1.5);
            });
            return false; 
        });

        // ... (añade aquí cualquier otro .on(), etc ) ...
        /* this.chart.onInit(function(){
            //this.aiUI.show(true)
            //this.aiUI.inputElement.value = '¿Qué puedes hacer?'
            this.chart.config.scaleInitial = OrgChart.match.boundary;
            this.chart._draw(true, OrgChart.action.init, { method: 'fit' });
        }) */


        /* 
        document.querySelector('#width').addEventListener('click', function () {
            console.log("width clicked")
            chart.config.scaleInitial = OrgChart.match.width;
            chart._draw(true, OrgChart.action.init, { method: 'fit' });
        });

        document.querySelector('#height').addEventListener('click', function () {
            console.log("height clicked")
            chart.config.scaleInitial = OrgChart.match.height;
            chart._draw(true, OrgChart.action.init, { method: 'fit' });
        });

        document.querySelector('#boundary').addEventListener('click', function () {
            console.log("boundary clicked")
            chart.config.scaleInitial = OrgChart.match.boundary;
            chart._draw(true, OrgChart.action.init, { method: 'fit' });
        }); */

        // Barra de zoom
        /* chart.onInit(function(){
            rangeScaleElement.min = this.config.scaleMin * sensitivity;
            rangeScaleElement.max = this.config.scaleMax * sensitivity;    
            rangeScaleElement.value = this.getScale() * sensitivity;
        });

        rangeScaleElement.addEventListener('input', function(){
            chart.setScale(this.value / sensitivity);
            txtScaleElement.innerHTML = rangeScaleElement.value / sensitivity;
        }); */

        //////// NODO con height Dinámico
        /* 
        chart.on('field', function (sender, args) {
            console.log("Field event:", args);
            if (args.name == 'img') {
                let text1 = args.data["nombre"];
                let text2 = args.data["puesto"];
                let img = args.data["img"];

                args.value = `<foreignobject x="10" y="10" width="200" height="200">
                                    <div class="fields" xmlns="http://www.w3.org/1999/xhtml" >
                                        ${text1 ? '<p>' + text1 + '</p>' : ''}
                                        ${text2 ? '<p>' + text2 + '</p>' : ''}
                                        ${img ? '<img src="' + img + '" alt="Imagen" />' : ''}
                                    </div>
                                </foreignobject>`;
            }
        });

        


        chart.on('node-initialized', function (sender, args) {
            let node = args.node;
            let data = chart._get(node.id);
            console.log(data)
            if (data.nombre) {
                let text1 = data["nombre"];
                let text2 = data["puesto"];
                let img = data["img"];

                let sss = `<foreignobject  x="10" y="10" width="200" height="20">
                                    <div class="fields">
                                        ${text1 ? '<p>' + text1 + '</p>' : ''}
                                        ${text2 ? '<p>' + text2 + '</p>' : ''}
                                        ${img ? '<img src="' + img + '" alt="Imagen" />' : ''}
                                    </div>
                                </foreignobject>`;

                document.getElementById('test_height').innerHTML = sss;

                let rect1 = document.querySelector('#test_height .fields').getBoundingClientRect();

                node.h = rect1.height + 45;
            }
        }); */
        
        //statusDiv.style.display = "none"; // Ocultar "Cargando..."

    }

    render() {
        return (
            <div id="tree" ref={this.divRef} style={{ width: '100%', height: '100%' }}></div>
        );
    }
}