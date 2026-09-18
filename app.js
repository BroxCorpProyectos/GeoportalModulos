/* =========================================================
   CONFIGURACIÓN
========================================================= */

const CONFIG = {

    /*
     * PEGAR AQUÍ LA URL DEL WEB APP DE GOOGLE APPS SCRIPT
     *
     * Ejemplo:
     *
     * https://script.google.com/macros/s/XXXXXXXX/exec
     */

    API_URL:
        "https://script.google.com/macros/s/AKfycbz-VppcKb5Gm0AA13vpO-78coB4aKfANNljTOWcYfUL3FtUJcnqbr8PvEEuxIxNEj2eyQ/exec",


    /*
     * GeoJSON ubicado en el mismo repositorio
     */

    GEOJSON_URL:
        "./modulos.geojson",


    /*
     * Centro inicial aproximado
     */

    MAP_CENTER:
        [-9.507, -77.148],

    MAP_ZOOM:
        15
};


/* =========================================================
   VARIABLES
========================================================= */

let map;

let geojsonLayer;

let moduleData = [];

let moduleFeatures = [];

let markers = [];

let allBounds;


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);


async function init() {

    createMap();

    setupEvents();

    await loadApplication();

}


/* =========================================================
   MAPA
========================================================= */

function createMap() {

    map = L.map("map", {

        zoomControl: true,

        attributionControl: true

    }).setView(
        CONFIG.MAP_CENTER,
        CONFIG.MAP_ZOOM
    );


    /*
     * OpenStreetMap
     */

    const osm = L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            maxZoom: 20,

            attribution:
                '&copy; OpenStreetMap contributors'

        }

    );


    /*
     * Satélite Esri
     *
     * No requiere crear una carpeta.
     */

    const satellite = L.tileLayer(

        "https://server.arcgisonline.com/ArcGIS/rest/services/" +
        "World_Imagery/MapServer/tile/{z}/{y}/{x}",

        {

            maxZoom: 20,

            attribution:
                "Tiles &copy; Esri"

        }

    );


    satellite.addTo(map);


    /*
     * Control de mapas
     */

    L.control.layers({

        "Satélite": satellite,

        "Mapa": osm

    }).addTo(map);

}


/* =========================================================
   CARGAR APLICACIÓN
========================================================= */

async function loadApplication() {

    try {

        showLoading(true);


        /*
         * Primero GeoJSON
         */

        const geoResponse =
            await fetch(CONFIG.GEOJSON_URL);


        if (!geoResponse.ok) {

            throw new Error(
                "No se pudo cargar el GeoJSON"
            );

        }


        const geojson =
            await geoResponse.json();


        /*
         * Extraemos solamente los módulos N01-N27.
         */

        moduleFeatures =
            extractModules(geojson);


        /*
         * Luego intentamos obtener
         * la información de Google Sheets.
         */

        if (
            CONFIG.API_URL &&
            !CONFIG.API_URL.includes(
                "PEGAR_AQUI"
            )
        ) {

            try {

                moduleData =
                    await getModulesFromAPI();

            } catch (error) {

                console.warn(
                    "No se pudo consultar Apps Script:",
                    error
                );

                showToast(
                    "Se cargó el mapa, pero no se pudo consultar Google Sheets."
                );

                moduleData = [];

            }

        }


        /*
         * Combinar GeoJSON + Sheets
         */

        moduleFeatures =
            mergeData(
                moduleFeatures,
                moduleData
            );


        /*
         * Dibujar
         */

        drawModules();


        /*
         * Lista
         */

        updateList();


        /*
         * Estadísticas
         */

        updateStats();


    } catch (error) {

        console.error(error);

        showToast(
            "Error cargando el geoportal."
        );

    } finally {

        showLoading(false);

    }

}


/* =========================================================
   EXTRAER MÓDULOS
========================================================= */

function extractModules(geojson) {

    if (
        !geojson ||
        !Array.isArray(geojson.features)
    ) {

        return [];

    }


    return geojson.features
        .filter(feature => {

            const name =
                feature.properties?.Name ||
                feature.properties?.name ||
                "";


            /*
             * Reconoce:
             *
             * N 01
             * N1
             * N° 01
             * N°01
             */

            return /^N\s*°?\s*0*\d+$/i.test(
                name.trim()
            );

        })
        .map(feature => {

            const originalName =
                feature.properties?.Name ||
                feature.properties?.name ||
                "";


            const number =
                extractNumber(originalName);


            return {

                id:
                    "N" +
                    String(number)
                        .padStart(2, "0"),

                displayName:
                    "N° " +
                    String(number)
                        .padStart(2, "0"),

                feature:

                    feature

            };

        })

        /*
         * Evitar duplicados.
         *
         * Tu GeoJSON contiene:
         *
         * N01
         * N° 01
         *
         * etc.
         */

        .filter(
            (item, index, array) =>
                array.findIndex(
                    x => x.id === item.id
                ) === index
        )

        .sort(
            (a, b) =>
                numericId(a.id) -
                numericId(b.id)
        );

}


/* =========================================================
   EXTRAER NÚMERO
========================================================= */

function extractNumber(name) {

    const match =
        name.match(
            /N\s*°?\s*0*(\d+)/i
        );


    return match
        ? Number(match[1])
        : 0;

}


function numericId(id) {

    return Number(
        id.replace("N", "")
    );

}


/* =========================================================
   API GOOGLE APPS SCRIPT
========================================================= */

function getModulesFromAPI() {

    return new Promise(
        (resolve, reject) => {

            const callbackName =
                "geoportalCallback_" +
                Date.now();


            window[callbackName] =
                function(data) {

                    delete window[
                        callbackName
                    ];

                    script.remove();

                    if (
                        data &&
                        data.success
                    ) {

                        resolve(
                            data.modulos || []
                        );

                    } else {

                        reject(
                            new Error(
                                data?.error ||
                                "Respuesta inválida"
                            )
                        );

                    }

                };


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                CONFIG.API_URL +
                "?action=modulos" +
                "&callback=" +
                callbackName;


            script.onerror =
                function() {

                    delete window[
                        callbackName
                    ];

                    script.remove();

                    reject(
                        new Error(
                            "No se pudo acceder a Apps Script"
                        )
                    );

                };


            document.body.appendChild(
                script
            );

        }
    );

}


/* =========================================================
   COMBINAR GEOJSON + SHEETS
========================================================= */

function mergeData(
    features,
    sheetsData
) {

    return features.map(
        module => {

            const data =
                sheetsData.find(
                    item =>
                        normalizeId(
                            item.id
                        ) ===
                        normalizeId(
                            module.id
                        )
                );


            const properties =
                module.feature
                    .properties || {};


            const description =
                properties.description ||
                "";


            return {

                ...module,

                beneficiario:
                    data?.beneficiario ||
                    parseBeneficiario(
                        description
                    ),

                sector:
                    data?.sector ||
                    parseSector(
                        description
                    ),

                tipo:
                    data?.tipo ||
                    parseTipo(
                        description
                    ),

                estado:
                    normalizeStatus(
                        data?.estado ||
                        "APTO"
                    ),

                fecha:
                    data?.fecha ||
                    "",

                observaciones:
                    data?.observaciones ||
                    "",

                informe:
                    data?.informe ||
                    "",

                lat:
                    module.feature
                        .geometry
                        .coordinates[1],

                lng:
                    module.feature
                        .geometry
                        .coordinates[0]

            };

        }
    );

}


/* =========================================================
   NORMALIZAR ID
========================================================= */

function normalizeId(value) {

    if (!value) return "";

    const number =
        String(value)
            .match(/\d+/);

    if (!number) return "";

    return (
        "N" +
        String(
            Number(number[0])
        ).padStart(2, "0")
    );

}


/* =========================================================
   ESTADOS
========================================================= */

function normalizeStatus(status) {

    const value =
        String(status || "")
            .trim()
            .toUpperCase();


    if (
        value.includes("PROCES")
    ) {

        return "PROCESO";

    }


    if (
        value.includes("INTERVEN")
    ) {

        return "INTERVENIDO";

    }


    if (
        value.includes("APTO") ||
        value.includes("APT")
    ) {

        return "APTO";

    }


    return "APTO";

}


/* =========================================================
   PARSER DESCRIPCIÓN
========================================================= */

function parseBeneficiario(
    description
) {

    if (!description)
        return "";


    const match =
        description.match(
            /BENEFICIARIO:\s*([^\n]+)/i
        );


    if (match)
        return match[1].trim();


    /*
     * Algunos registros no tienen
     * "BENEFICIARIO:"
     */

    const firstLine =
        description
            .split("\n")[0]
            .trim();


    return firstLine;

}


function parseSector(
    description
) {

    if (!description)
        return "";


    const lines =
        description
            .split("\n")
            .map(
                line => line.trim()
            )
            .filter(Boolean);


    if (lines.length >= 2)
        return lines[1];


    return "";

}


function parseTipo(
    description
) {

    if (!description)
        return "";


    const match =
        description.match(
            /MOD\.\s*HAB\s*\d+/i
        );


    return match
        ? match[0].trim()
        : "";

}


/* =========================================================
   DIBUJAR MÓDULOS
========================================================= */

function drawModules() {

    /*
     * Eliminar capa anterior
     */

    if (geojsonLayer) {

        geojsonLayer.remove();

    }


    markers = [];


    const markerGroup =
        L.featureGroup();


    moduleFeatures.forEach(
        module => {

            const marker =
                createModuleMarker(
                    module
                );


            marker.addTo(
                markerGroup
            );


            markers.push({

                module:
                    module,

                marker:
                    marker

            });

        }
    );


    geojsonLayer =
        markerGroup;


    /*
     * Extensión
     */

    if (
        moduleFeatures.length
    ) {

        allBounds =
            markerGroup.getBounds();


        map.fitBounds(
            allBounds,
            {
                padding: [40, 40]
            }
        );

    }

}


/* =========================================================
   CREAR MARCADOR
========================================================= */

function createModuleMarker(
    module
) {

    const status =
        statusClass(
            module.estado
        );


    const icon =
        L.divIcon({

            className:
                "custom-module-marker",

            html:
                `
                <div class="
                    module-marker
                    marker-${status}
                ">
                    ${extractNumber(module.id)}
                </div>
                `,

            iconSize:
                [28, 28],

            iconAnchor:
                [14, 14],

            popupAnchor:
                [0, -14]

        });


    const marker =
        L.marker(
            [module.lat, module.lng],
            {
                icon: icon
            }
        );


    marker.bindTooltip(
        module.displayName,
        {

            direction: "top",

            offset: [0, -12],

            opacity: .9

        }
    );


    marker.on(
        "click",
        function() {

            showModule(
                module
            );

        }
    );


    return marker;

}


/* =========================================================
   STATUS CSS
========================================================= */

function statusClass(
    status
) {

    switch (
        normalizeStatus(status)
    ) {

        case "PROCESO":
            return "proceso";

        case "INTERVENIDO":
            return "intervenido";

        default:
            return "apto";

    }

}


/* =========================================================
   LISTA
========================================================= */

function updateList(
    filter = ""
) {

    const container =
        document.getElementById(
            "moduleList"
        );


    const search =
        filter
            .trim()
            .toLowerCase();


    const filtered =
        moduleFeatures.filter(
            module => {

                if (!search)
                    return true;


                return (

                    module.id
                        .toLowerCase()
                        .includes(search)

                    ||

                    module.displayName
                        .toLowerCase()
                        .includes(search)

                    ||

                    (
                        module.beneficiario ||
                        ""
                    )
                    .toLowerCase()
                    .includes(search)

                    ||

                    (
                        module.sector ||
                        ""
                    )
                    .toLowerCase()
                    .includes(search)

                );

            }
        );


    document.getElementById(
        "resultCount"
    ).textContent =
        filtered.length;


    container.innerHTML = "";


    filtered.forEach(
        module => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "module-item";


            item.innerHTML = `

                <span class="
                    module-status
                    ${statusClass(module.estado)}
                "></span>

                <div class="module-info">

                    <div class="module-name">

                        ${escapeHTML(
                            module.displayName
                        )}

                    </div>

                    <div class="
                        module-beneficiario
                    ">

                        ${escapeHTML(
                            module.beneficiario ||
                            "Sin beneficiario"
                        )}

                    </div>

                </div>
            `;


            item.addEventListener(
                "click",
                function() {

                    map.setView(
                        [
                            module.lat,
                            module.lng
                        ],
                        18
                    );


                    showModule(
                        module
                    );

                }
            );


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   ESTADÍSTICAS
========================================================= */

function updateStats() {

    const total =
        moduleFeatures.length;


    const aptos =
        moduleFeatures.filter(
            m =>
                m.estado === "APTO"
        ).length;


    const proceso =
        moduleFeatures.filter(
            m =>
                m.estado === "PROCESO"
        ).length;


    const intervenidos =
        moduleFeatures.filter(
            m =>
                m.estado === "INTERVENIDO"
        ).length;


    document.getElementById(
        "totalModulos"
    ).textContent =
        total;


    document.getElementById(
        "totalAptos"
    ).textContent =
        aptos;


    document.getElementById(
        "totalProceso"
    ).textContent =
        proceso;


    document.getElementById(
        "totalIntervenidos"
    ).textContent =
        intervenidos;

}


/* =========================================================
   DETALLE
========================================================= */

function showModule(
    module
) {

    const content =
        document.getElementById(
            "detailContent"
        );


    const status =
        normalizeStatus(
            module.estado
        );


    let reportButton = "";


    if (module.informe) {

        reportButton = `

            <a
                class="report-button"
                href="${escapeAttribute(
                    module.informe
                )}"
                target="_blank"
                rel="noopener"
            >

                <i class="
                    fa-solid
                    fa-file-pdf
                "></i>

                Ver informe

            </a>

        `;

    } else {

        reportButton = `

            <div class="no-report">

                <i class="
                    fa-solid
                    fa-file-circle-xmark
                "></i>

                No hay informe registrado.

            </div>

        `;

    }


    content.innerHTML = `

        <div class="detail-title">

            ${escapeHTML(
                module.displayName
            )}

        </div>


        <div class="
            detail-status
            ${statusClass(status)}
        ">

            <i class="fa-solid fa-circle"></i>

            ${escapeHTML(status)}

        </div>


        <div class="detail-row">

            <span class="detail-label">
                Beneficiario
            </span>

            <div class="detail-value">

                ${escapeHTML(
                    module.beneficiario ||
                    "No registrado"
                )}

            </div>

        </div>


        <div class="detail-row">

            <span class="detail-label">
                Sector
            </span>

            <div class="detail-value">

                ${escapeHTML(
                    module.sector ||
                    "No registrado"
                )}

            </div>

        </div>


        <div class="detail-row">

            <span class="detail-label">
                Tipo
            </span>

            <div class="detail-value">

                ${escapeHTML(
                    module.tipo ||
                    "No registrado"
                )}

            </div>

        </div>


        <div class="detail-row">

            <span class="detail-label">
                Fecha
            </span>

            <div class="detail-value">

                ${escapeHTML(
                    module.fecha ||
                    "No registrada"
                )}

            </div>

        </div>


        <div class="detail-row">

            <span class="detail-label">
                Observaciones
            </span>

            <div class="detail-value">

                ${escapeHTML(
                    module.observaciones ||
                    "Sin observaciones."
                )}

            </div>

        </div>


        ${reportButton}

    `;


    document
        .getElementById(
            "detailOverlay"
        )
        .classList.add(
            "active"
        );

}


/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {

    /*
     * Buscador
     */

    document
        .getElementById(
            "searchInput"
        )
        .addEventListener(
            "input",
            function(event) {

                updateList(
                    event.target.value
                );

            }
        );


    /*
     * Cerrar detalle
     */

    document
        .getElementById(
            "btnCerrarDetalle"
        )
        .addEventListener(
            "click",
            closeDetail
        );


    document
        .getElementById(
            "detailOverlay"
        )
        .addEventListener(
            "click",
            function(event) {

                if (
                    event.target ===
                    this
                ) {

                    closeDetail();

                }

            }
        );


    /*
     * Menú móvil
     */

    document
        .getElementById(
            "btnMenu"
        )
        .addEventListener(
            "click",
            function() {

                document
                    .getElementById(
                        "sidebar"
                    )
                    .classList
                    .toggle("open");

            }
        );


    /*
     * Cerrar panel
     */

    document
        .getElementById(
            "btnCerrarPanel"
        )
        .addEventListener(
            "click",
            function() {

                document
                    .getElementById(
                        "sidebar"
                    )
                    .classList
                    .remove("open");

            }
        );


    /*
     * Extender mapa
     */

    document
        .getElementById(
            "btnExtender"
        )
        .addEventListener(
            "click",
            function() {

                if (allBounds) {

                    map.fitBounds(
                        allBounds,
                        {
                            padding: [40, 40]
                        }
                    );

                }

            }
        );


    /*
     * Ubicación
     */

    document
        .getElementById(
            "btnUbicacion"
        )
        .addEventListener(
            "click",
            locateUser
        );

}


/* =========================================================
   UBICACIÓN
========================================================= */

function locateUser() {

    map.locate({

        setView: true,

        maxZoom: 17,

        enableHighAccuracy: true

    });

}


/* =========================================================
   CERRAR DETALLE
========================================================= */

function closeDetail() {

    document
        .getElementById(
            "detailOverlay"
        )
        .classList.remove(
            "active"
        );

}


/* =========================================================
   LOADING
========================================================= */

function showLoading(
    show
) {

    document
        .getElementById(
            "loading"
        )
        .classList
        .toggle(
            "hidden",
            !show
        );

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3500
    );

}


/* =========================================================
   SEGURIDAD HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


function escapeAttribute(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /"/g,
        "&quot;"
    );

}
