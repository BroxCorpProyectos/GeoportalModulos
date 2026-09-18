// ============================================================
// GEOPORTAL DE MÓDULOS
// Huaripampa Bajo y Shiquip
// ============================================================


// ============================================================
// CONFIGURACIÓN
// ============================================================

// GeoJSON en la MISMA carpeta que index.html
const GEOJSON_URL = "./modulos.geojson";


// ------------------------------------------------------------
// IMPORTANTE
// Pega aquí la URL /exec de tu Google Apps Script
// ------------------------------------------------------------

const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwgdmAZK-1SsVUi01w1eWlA-amKgyraOPlhuAfKdd8SsTxYPu4MaiaH_rmQJbRwjmIHOw/exec";


const MAPA_CENTRO = [
    -9.5035,
    -77.1470
];

const MAPA_ZOOM = 15;


// ============================================================
// VARIABLES
// ============================================================

let mapa = null;

let capaModulos = null;

let datosGeoJSON = null;

let datosAtributivos = {};

let capaSatelite = null;

let capaCalles = null;

let capaEtiquetas = null;


// ============================================================
// INICIO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    iniciar
);


async function iniciar() {

    inicializarMapa();

    configurarEventos();

    await cargarGeoJSON();

    await cargarGoogleScript();


    window.addEventListener(
        "resize",
        function () {

            if (mapa) {

                mapa.invalidateSize();

            }

        }
    );

}


// ============================================================
// INICIALIZAR MAPA
// ============================================================

function inicializarMapa() {

    mapa = L.map(
        "map",
        {
            zoomControl: false
        }
    ).setView(
        MAPA_CENTRO,
        MAPA_ZOOM
    );


    L.control.zoom({
        position: "topleft"
    }).addTo(mapa);


    // --------------------------------------------------------
    // SATÉLITE
    // --------------------------------------------------------

    capaSatelite =
        L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                maxZoom: 22,

                attribution:
                    "Tiles © Esri"
            }
        );


    // --------------------------------------------------------
    // CALLES
    // --------------------------------------------------------

    capaCalles =
        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 22,

                attribution:
                    "© OpenStreetMap contributors"
            }
        );


    // --------------------------------------------------------
    // ETIQUETAS
    // --------------------------------------------------------

    capaEtiquetas =
        L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            {
                maxZoom: 22,

                attribution:
                    "Esri"
            }
        );


    capaSatelite.addTo(mapa);

    capaEtiquetas.addTo(mapa);


    // --------------------------------------------------------
    // NOTA: el selector de capas nativo de Leaflet se reemplazó
    // por el panel de herramientas propio (más grande y táctil
    // en celular). Ver cambiarCapaBase() y configurarHerramientas().
    // --------------------------------------------------------

}


// ============================================================
// CAMBIAR CAPA BASE (satélite / calles)
// ============================================================

function cambiarCapaBase(
    capa
) {

    const botonSatelite =
        document.getElementById(
            "capa-satelite"
        );

    const botonCalles =
        document.getElementById(
            "capa-calles"
        );


    if (
        capa === "calles"
    ) {

        if (mapa.hasLayer(capaSatelite)) {

            mapa.removeLayer(capaSatelite);

        }

        if (mapa.hasLayer(capaEtiquetas)) {

            mapa.removeLayer(capaEtiquetas);

        }

        if (!mapa.hasLayer(capaCalles)) {

            capaCalles.addTo(mapa);

        }


        if (botonCalles) botonCalles.classList.add("activa");

        if (botonSatelite) botonSatelite.classList.remove("activa");

    }
    else {

        if (mapa.hasLayer(capaCalles)) {

            mapa.removeLayer(capaCalles);

        }

        if (!mapa.hasLayer(capaSatelite)) {

            capaSatelite.addTo(mapa);

        }

        if (!mapa.hasLayer(capaEtiquetas)) {

            capaEtiquetas.addTo(mapa);

        }


        if (botonSatelite) botonSatelite.classList.add("activa");

        if (botonCalles) botonCalles.classList.remove("activa");

    }

}


// ============================================================
// EVENTOS
// ============================================================

function configurarEventos() {


    // --------------------------------------------------------
    // ACTUALIZAR
    // --------------------------------------------------------

    const botonActualizar =
        document.getElementById(
            "btn-actualizar"
        );


    if (botonActualizar) {

        botonActualizar.addEventListener(
            "click",
            cargarGoogleScript
        );

    }


    // --------------------------------------------------------
    // BUSCADOR
    // --------------------------------------------------------

    const buscador =
        document.getElementById(
            "buscador"
        );


    if (buscador) {

        buscador.addEventListener(
            "input",
            function () {

                filtrarModulos(
                    this.value
                );

            }
        );

    }


    // --------------------------------------------------------
    // CERRAR DETALLE
    // --------------------------------------------------------

    const cerrarDetalle =
        document.getElementById(
            "cerrar-detalle"
        );


    if (cerrarDetalle) {

        cerrarDetalle.addEventListener(
            "click",
            cerrarDetalleModulo
        );

    }


    // --------------------------------------------------------
    // TABLA
    // --------------------------------------------------------

    const botonTabla =
        document.getElementById(
            "btn-tabla"
        );


    if (botonTabla) {

        botonTabla.addEventListener(
            "click",
            abrirTabla
        );

    }


    const cerrarModal =
        document.getElementById(
            "cerrar-modal"
        );


    if (cerrarModal) {

        cerrarModal.addEventListener(
            "click",
            cerrarTabla
        );

    }


    // --------------------------------------------------------
    // BUSCADOR TABLA
    // --------------------------------------------------------

    const buscadorTabla =
        document.getElementById(
            "buscador-tabla"
        );


    if (buscadorTabla) {

        buscadorTabla.addEventListener(
            "input",
            function () {

                filtrarTabla(
                    this.value
                );

            }
        );

    }


    // --------------------------------------------------------
    // CERRAR MODAL AL HACER CLICK FUERA
    // --------------------------------------------------------

    const modal =
        document.getElementById(
            "modal-tabla"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {

                    cerrarTabla();

                }

            }
        );

    }


    // --------------------------------------------------------
    // MENÚ (SIDEBAR) EN CELULAR
    // --------------------------------------------------------

    const botonMenu =
        document.getElementById(
            "btn-menu"
        );

    const sidebar =
        document.querySelector(
            ".sidebar"
        );

    const backdrop =
        document.getElementById(
            "sidebar-backdrop"
        );


    if (botonMenu && sidebar && backdrop) {

        botonMenu.addEventListener(
            "click",
            function () {

                sidebar.classList.toggle("visible");

                backdrop.classList.toggle("visible");

            }
        );


        backdrop.addEventListener(
            "click",
            function () {

                sidebar.classList.remove("visible");

                backdrop.classList.remove("visible");

            }
        );

    }


    // --------------------------------------------------------
    // PANEL DE HERRAMIENTAS DEL MAPA (capas + tabla)
    // --------------------------------------------------------

    const botonHerramientas =
        document.getElementById(
            "btn-toggle-herramientas"
        );

    const panelHerramientas =
        document.getElementById(
            "panel-herramientas"
        );


    if (botonHerramientas && panelHerramientas) {

        botonHerramientas.addEventListener(
            "click",
            function () {

                panelHerramientas.classList.toggle("visible");

                botonHerramientas.classList.toggle("activo");

            }
        );

    }


    const capaSateliteBtn =
        document.getElementById(
            "capa-satelite"
        );

    const capaCallesBtn =
        document.getElementById(
            "capa-calles"
        );


    if (capaSateliteBtn) {

        capaSateliteBtn.addEventListener(
            "click",
            function () {

                cambiarCapaBase("satelite");

            }
        );

    }


    if (capaCallesBtn) {

        capaCallesBtn.addEventListener(
            "click",
            function () {

                cambiarCapaBase("calles");

            }
        );

    }

}


// ============================================================
// CARGAR GEOJSON
// ============================================================

async function cargarGeoJSON() {

    mostrarCargaMapa(true);


    try {

        console.log(
            "Cargando GeoJSON:",
            GEOJSON_URL
        );


        const respuesta =
            await fetch(
                GEOJSON_URL,
                {
                    cache: "no-cache"
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                `No se pudo cargar el GeoJSON. HTTP ${respuesta.status}`
            );

        }


        const datos =
            await respuesta.json();


        if (
            datos.type !==
            "FeatureCollection"
        ) {

            throw new Error(
                "El archivo no es una FeatureCollection GeoJSON."
            );

        }


        if (
            !Array.isArray(
                datos.features
            )
        ) {

            throw new Error(
                "El GeoJSON no contiene features."
            );

        }


        datosGeoJSON =
            datos;


        console.log(
            "GeoJSON cargado:",
            datos.features.length,
            "elementos"
        );


        mostrarModulos(
            datosGeoJSON
        );


        actualizarEstadisticas(
            datosGeoJSON
        );


        actualizarListado(
            datosGeoJSON
        );


    }
    catch (error) {

        console.error(
            error
        );


        mostrarError(
            error.message
        );

    }
    finally {

        mostrarCargaMapa(false);

    }

}


// ============================================================
// GOOGLE APPS SCRIPT
// ============================================================

async function cargarGoogleScript() {


    // --------------------------------------------------------
    // Comprobar URL
    // --------------------------------------------------------

    if (
        !GOOGLE_SCRIPT_URL ||
        GOOGLE_SCRIPT_URL.includes(
            "PEGAR_AQUI"
        )
    ) {

        console.warn(
            "Google Apps Script todavía no está configurado."
        );


        actualizarConexion(
            "sin configurar",
            false
        );


        return;

    }


    const boton =
        document.getElementById(
            "btn-actualizar"
        );


    if (boton) {

        boton.disabled = true;

        boton.innerHTML =
            `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Actualizando...
            `;

    }


    actualizarConexion(
        "actualizando",
        false
    );


    try {

        const url =
            GOOGLE_SCRIPT_URL +
            "?accion=modulos&_=" +
            Date.now();


        console.log(
            "Consultando Google Apps Script..."
        );


        const respuesta =
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-cache"
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                `Google Apps Script respondió HTTP ${respuesta.status}`
            );

        }


        const datos =
            await respuesta.json();


        console.log(
            "Respuesta Google Apps Script:",
            datos
        );


        if (
            datos.ok === false
        ) {

            throw new Error(
                datos.mensaje ||
                "Google Apps Script devolvió un error."
            );

        }


        const registros =
            datos.data ||
            [];


        // ----------------------------------------------------
        // INDEXAR INFORMACIÓN
        // ----------------------------------------------------

        datosAtributivos = {};


        registros.forEach(
            registro => {

                const modulo =
                    registro.id ||
                    registro.ID ||
                    registro.Id ||
                    registro.nombre ||
                    registro.Nombre ||
                    registro.Modulo ||
                    registro.modulo ||
                    registro.NAME ||
                    registro.Name ||
                    registro.name;


                if (!modulo) {

                    return;

                }


                const clave =
                    normalizarNombreModulo(
                        modulo
                    );


                datosAtributivos[
                    clave
                ] = registro;

            }
        );


        console.log(
            "Registros atributivos:",
            Object.keys(
                datosAtributivos
            ).length
        );


        // ----------------------------------------------------
        // ACTUALIZAR MAPA
        // ----------------------------------------------------

        if (datosGeoJSON) {

            mostrarModulos(
                datosGeoJSON
            );


            actualizarEstadisticas(
                datosGeoJSON
            );


            actualizarListado(
                datosGeoJSON
            );

        }


        // ----------------------------------------------------
        // ACTUALIZAR TABLA
        // ----------------------------------------------------

        actualizarTabla();


        actualizarConexion(
            `${registros.length} registros`,
            true
        );


    }
    catch (error) {

        console.error(
            "Error Google Apps Script:",
            error
        );


        actualizarConexion(
            "error de conexión",
            false
        );


        mostrarMensaje(
            "No se pudo conectar con Google Sheets."
        );

    }
    finally {

        if (boton) {

            boton.disabled = false;

            boton.innerHTML =
                `
                <i class="fa-solid fa-arrows-rotate"></i>
                Actualizar información
                `;

        }

    }

}


// ============================================================
// MOSTRAR MÓDULOS
// ============================================================

function mostrarModulos(
    geojson
) {


    if (capaModulos) {

        mapa.removeLayer(
            capaModulos
        );

    }


    capaModulos =
        L.geoJSON(
            geojson,
            {

                pointToLayer:
                    function (
                        feature,
                        latlng
                    ) {

                        const datos =
                            obtenerDatosModulo(
                                feature
                            );


                        return L.circleMarker(
                            latlng,
                            {

                                radius: 8,

                                fillColor:
                                    colorEstado(
                                        datos.estado
                                    ),

                                color:
                                    "#ffffff",

                                weight: 2,

                                opacity: 1,

                                fillOpacity: .95

                            }
                        );

                    },


                onEachFeature:
                    function (
                        feature,
                        layer
                    ) {

                        const datos =
                            obtenerDatosModulo(
                                feature
                            );


                        layer.bindPopup(
                            crearPopup(
                                feature,
                                datos
                            ),
                            {
                                maxWidth: 360,
                                minWidth: 280
                            }
                        );


                        layer.on(
                            "click",
                            function () {

                                mostrarInformacionModulo(
                                    feature,
                                    datos
                                );

                            }
                        );

                    }

            }
        );


    capaModulos.addTo(
        mapa
    );


    // --------------------------------------------------------
    // EXTENSIÓN DEL MAPA
    // --------------------------------------------------------

    const bounds =
        capaModulos.getBounds();


    if (
        bounds.isValid()
    ) {

        mapa.fitBounds(
            bounds,
            {
                padding: [
                    40,
                    40
                ]
            }
        );

    }

}


// ============================================================
// OBTENER DATOS DEL MÓDULO
// ============================================================

function obtenerDatosModulo(
    feature
) {

    const propiedades =
        feature.properties ||
        {};


    const nombre =
        propiedades.id ||
        propiedades.ID ||
        propiedades.Id ||
        propiedades.Name ||
        propiedades.name ||
        "Sin nombre";


    const clave =
        normalizarNombreModulo(
            nombre
        );


    const sheet =
        datosAtributivos[
            clave
        ] ||
        {};


    return {

        modulo:
            sheet.id ||
            sheet.nombre ||
            sheet.Modulo ||
            sheet.modulo ||
            nombre,


        beneficiario:
            sheet.Beneficiario ||
            sheet.beneficiario ||
            extraerBeneficiario(
                propiedades.description
            ),


        sector:
            sheet.Sector ||
            sheet.sector ||
            "Huaripampa Bajo y Shiquip",


        tipo:
            sheet.Tipo ||
            sheet.tipo ||
            extraerTipoModulo(
                propiedades.description
            ),


        estado:
            sheet.Estado ||
            sheet.estado ||
            "",


        avance:
            sheet.Avance ||
            sheet.avance ||
            "",


        informe:
            sheet.Informe ||
            sheet.informe ||
            sheet.LinkInforme ||
            "",


        fotos:
            sheet.Fotos ||
            sheet.fotos ||
            sheet.LinkFotos ||
            "",


        observaciones:
            sheet.Observaciones ||
            sheet.observaciones ||
            "",


        fecha:
            sheet.Fecha ||
            sheet.fecha ||
            ""

    };

}


// ============================================================
// NORMALIZAR NOMBRE
// ============================================================

function normalizarNombreModulo(
    nombre
) {

    if (!nombre) {

        return "";

    }


    return String(nombre)

        .toUpperCase()

        .replace(
            /N°/g,
            "N"
        )

        .replace(
            /Nº/g,
            "N"
        )

        .replace(
            /°/g,
            ""
        )

        .replace(
            /º/g,
            ""
        )

        .replace(
            /\s+/g,
            ""
        )

        .trim();

}


// ============================================================
// ESTADO
// ============================================================

function normalizarEstado(
    estado
) {

    // --------------------------------------------------------
    // Sin dato todavía: el módulo aún no fue registrado
    // (16 de los 27 módulos actuales están así, por eso NO
    // se puede asumir "Apto" por defecto)
    // --------------------------------------------------------

    if (
        !estado ||
        !String(estado).trim()
    ) {

        return "Sin evaluar";

    }


    const texto =
        String(estado)
            .toLowerCase()
            .trim();


    // --------------------------------------------------------
    // IMPORTANTE: "no apto" debe comprobarse ANTES que "apto",
    // porque "no apto" también contiene la subcadena "apto" y
    // antes quedaba mal clasificado como "Apto"
    // --------------------------------------------------------

    if (
        texto.includes(
            "no apto"
        )
    ) {

        return "No apto";

    }


    if (
        texto.includes(
            "observ"
        )
    ) {

        return "Apto con observaciones";

    }


    if (
        texto.includes(
            "apto"
        )
    ) {

        return "Apto";

    }


    return "Sin evaluar";

}


// ============================================================
// COLOR ESTADO
// ============================================================

function colorEstado(
    estado
) {

    const normalizado =
        normalizarEstado(
            estado
        );


    if (
        normalizado ===
        "No apto"
    ) {

        return "#e53935";

    }


    if (
        normalizado ===
        "Apto con observaciones"
    ) {

        return "#f9a825";

    }


    if (
        normalizado ===
        "Apto"
    ) {

        return "#2e7d32";

    }


    return "#94a3b8";

}


// ============================================================
// EXTRAER BENEFICIARIO
// ============================================================

function extraerBeneficiario(
    descripcion
) {

    if (!descripcion) {

        return "Sin información";

    }


    let texto =
        String(descripcion);


    texto =
        texto.replace(
            /BENEFICIARIO:/gi,
            ""
        );


    const lineas =
        texto.split(
            "\n"
        );


    return (
        lineas[0] ||
        "Sin información"
    ).trim();

}


// ============================================================
// EXTRAER TIPO
// ============================================================

function extraerTipoModulo(
    descripcion
) {

    if (!descripcion) {

        return "";

    }


    const texto =
        String(descripcion);


    if (
        texto.includes(
            "MOD. HAB 01"
        )
    ) {

        return "MOD. HAB 01";

    }


    if (
        texto.includes(
            "MOD. HAB 02"
        )
    ) {

        return "MOD. HAB 02";

    }


    return "";

}


// ============================================================
// POPUP
// ============================================================

function crearPopup(
    feature,
    datos
) {

    const coordenadas =
        feature.geometry.coordinates;


    const longitud =
        coordenadas[0];


    const latitud =
        coordenadas[1];


    const color =
        colorEstado(
            datos.estado
        );


    return `

        <div class="popup-modulo">

            <div class="popup-titulo">

                ${escapeHTML(
                    datos.modulo
                )}

            </div>


            <div
                class="popup-estado"
                style="
                    background:${color};
                "
            >

                ${escapeHTML(
                    normalizarEstado(
                        datos.estado
                    )
                )}

            </div>


            <div class="popup-contenido">

                <p>

                    <strong>
                        Beneficiario:
                    </strong>

                    <br>

                    ${escapeHTML(
                        datos.beneficiario
                    )}

                </p>


                <p>

                    <strong>
                        Sector:
                    </strong>

                    <br>

                    ${escapeHTML(
                        datos.sector
                    )}

                </p>


                <p>

                    <strong>
                        Tipo:
                    </strong>

                    <br>

                    ${escapeHTML(
                        datos.tipo || "-"
                    )}

                </p>


                ${
                    datos.avance
                    ?
                    `
                    <p>
                        <strong>
                            Avance:
                        </strong>

                        <br>

                        ${escapeHTML(
                            datos.avance
                        )}
                    </p>
                    `
                    :
                    ""
                }


                <p>

                    <strong>
                        Coordenadas:
                    </strong>

                    <br>

                    ${latitud.toFixed(6)},
                    ${longitud.toFixed(6)}

                </p>


                ${
                    datos.informe
                    ?
                    `
                    <a
                        href="${escapeAttribute(datos.informe)}"
                        target="_blank"
                        rel="noopener"
                        class="btn-informe"
                    >

                        <i class="fa-solid fa-file-pdf"></i>

                        Ver informe

                    </a>
                    `
                    :
                    ""
                }


                ${
                    datos.fotos
                    ?
                    `
                    <a
                        href="${escapeAttribute(datos.fotos)}"
                        target="_blank"
                        rel="noopener"
                        class="btn-fotos"
                    >

                        <i class="fa-solid fa-camera"></i>

                        Ver fotografías

                    </a>
                    `
                    :
                    ""
                }

            </div>

        </div>

    `;

}


// ============================================================
// PANEL DETALLE
// ============================================================

function mostrarInformacionModulo(
    feature,
    datos
) {

    const panel =
        document.getElementById(
            "detalle-modulo"
        );


    if (!panel) {

        return;

    }


    panel.innerHTML = `

        <button
            id="cerrar-detalle"
            class="cerrar-detalle"
        >

            <i class="fa-solid fa-xmark"></i>

        </button>


        <div class="detalle-header">

            <h2>

                ${escapeHTML(
                    datos.modulo
                )}

            </h2>

        </div>


        <div class="detalle-estado">

            <span
                class="estado-dot"
                style="
                    background:
                    ${colorEstado(
                        datos.estado
                    )}
                "
            ></span>

            ${escapeHTML(
                normalizarEstado(
                    datos.estado
                )
            )}

        </div>


        <div class="detalle-item">

            <strong>
                Beneficiario
            </strong>

            <div>

                ${escapeHTML(
                    datos.beneficiario
                )}

            </div>

        </div>


        <div class="detalle-item">

            <strong>
                Sector
            </strong>

            <div>

                ${escapeHTML(
                    datos.sector
                )}

            </div>

        </div>


        <div class="detalle-item">

            <strong>
                Tipo de módulo
            </strong>

            <div>

                ${escapeHTML(
                    datos.tipo || "-"
                )}

            </div>

        </div>


        ${
            datos.avance
            ?
            `
            <div class="detalle-item">

                <strong>
                    Avance
                </strong>

                <div>

                    ${escapeHTML(
                        datos.avance
                    )}

                </div>

            </div>
            `
            :
            ""
        }


        ${
            datos.observaciones
            ?
            `
            <div class="detalle-item">

                <strong>
                    Observaciones
                </strong>

                <div>

                    ${escapeHTML(
                        datos.observaciones
                    )}

                </div>

            </div>
            `
            :
            ""
        }


        ${
            datos.fecha
            ?
            `
            <div class="detalle-item">

                <strong>
                    Fecha
                </strong>

                <div>

                    ${escapeHTML(
                        datos.fecha
                    )}

                </div>

            </div>
            `
            :
            ""
        }


        ${
            datos.informe
            ?
            `
            <a
                href="${escapeAttribute(datos.informe)}"
                target="_blank"
                rel="noopener"
                class="btn-principal"
            >

                <i class="fa-solid fa-file-pdf"></i>

                Ver informe

            </a>
            `
            :
            ""
        }


        ${
            datos.fotos
            ?
            `
            <a
                href="${escapeAttribute(datos.fotos)}"
                target="_blank"
                rel="noopener"
                class="btn-secundario"
            >

                <i class="fa-solid fa-images"></i>

                Ver fotografías

            </a>
            `
            :
            ""
        }

    `;


    panel.classList.add(
        "visible"
    );


    document
        .getElementById(
            "cerrar-detalle"
        )
        .addEventListener(
            "click",
            cerrarDetalleModulo
        );

}


function cerrarDetalleModulo() {

    const panel =
        document.getElementById(
            "detalle-modulo"
        );


    if (panel) {

        panel.classList.remove(
            "visible"
        );

    }

}


// ============================================================
// ESTADÍSTICAS
// ============================================================

function actualizarEstadisticas(
    geojson
) {

    let aptos = 0;

    let observaciones = 0;

    let noAptos = 0;

    let sinEvaluar = 0;

    let total = 0;


    // --------------------------------------------------------
    // IMPORTANTE:
    // Solo cuenta los módulos N01-N27
    // --------------------------------------------------------

    geojson.features.forEach(
        feature => {

            const nombre =
                feature.properties?.id ||
                feature.properties?.Name ||
                feature.properties?.name ||
                "";


            if (
                !esModuloHabitacional(
                    nombre
                )
            ) {

                return;

            }


            const datos =
                obtenerDatosModulo(
                    feature
                );


            const estado =
                normalizarEstado(
                    datos.estado
                );


            total++;


            if (
                estado === "Apto"
            ) {

                aptos++;

            }
            else if (
                estado ===
                "Apto con observaciones"
            ) {

                observaciones++;

            }
            else if (
                estado ===
                "No apto"
            ) {

                noAptos++;

            }
            else {

                sinEvaluar++;

            }

        }
    );


    actualizarElemento(
        "total-modulos",
        total
    );


    actualizarElemento(
        "total-aptos",
        aptos
    );


    actualizarElemento(
        "total-proceso",
        observaciones
    );


    actualizarElemento(
        "total-intervenidos",
        noAptos
    );

}


// ============================================================
// COMPROBAR MÓDULO HABITACIONAL
// ============================================================

function esModuloHabitacional(
    nombre
) {

    if (!nombre) {

        return false;

    }


    const texto =
        normalizarNombreModulo(
            nombre
        );


    return /^N\d+$/.test(
        texto
    );

}


// ============================================================
// LISTADO
// ============================================================

function actualizarListado(
    geojson
) {

    const lista =
        document.getElementById(
            "lista-modulos"
        );


    if (!lista) {

        return;

    }


    lista.innerHTML = "";


    let contador = 0;


    geojson.features.forEach(
        feature => {

            const nombre =
                feature.properties?.id ||
                feature.properties?.Name ||
                feature.properties?.name ||
                "";


            if (
                !esModuloHabitacional(
                    nombre
                )
            ) {

                return;

            }


            const datos =
                obtenerDatosModulo(
                    feature
                );


            const elemento =
                document.createElement(
                    "div"
                );


            elemento.className =
                "item-modulo";


            elemento.innerHTML = `

                <div
                    class="item-indicador"
                    style="
                        background:
                        ${colorEstado(
                            datos.estado
                        )}
                    "
                ></div>


                <div
                    class="item-contenido"
                >

                    <strong>

                        ${escapeHTML(
                            datos.modulo
                        )}

                    </strong>


                    <span>

                        ${escapeHTML(
                            datos.beneficiario
                        )}

                    </span>

                </div>

            `;


            elemento.addEventListener(
                "click",
                function () {

                    enfocarFeature(
                        feature
                    );

                }
            );


            lista.appendChild(
                elemento
            );


            contador++;

        }
    );


    actualizarElemento(
        "contador-listado",
        contador
    );

}


// ============================================================
// ENFOCAR MÓDULO
// ============================================================

function enfocarFeature(
    feature
) {

    const coordenadas =
        feature.geometry.coordinates;


    const latitud =
        coordenadas[1];


    const longitud =
        coordenadas[0];


    mapa.setView(
        [
            latitud,
            longitud
        ],
        19,
        {
            animate: true
        }
    );


    capaModulos.eachLayer(
        layer => {

            if (
                layer.feature ===
                feature
            ) {

                setTimeout(
                    () => {

                        layer.openPopup();

                    },
                    350
                );

            }

        }
    );


    // --------------------------------------------------------
    // En celular, cerrar el menú lateral al enfocar un módulo
    // --------------------------------------------------------

    if (
        window.innerWidth <= 650
    ) {

        const sidebar =
            document.querySelector(
                ".sidebar"
            );

        const backdrop =
            document.getElementById(
                "sidebar-backdrop"
            );


        if (sidebar) sidebar.classList.remove("visible");

        if (backdrop) backdrop.classList.remove("visible");

    }

}


// ============================================================
// FILTRAR
// ============================================================

function filtrarModulos(
    texto
) {

    if (!datosGeoJSON) {

        return;

    }


    const busqueda =
        String(texto)
            .toLowerCase()
            .trim();


    const resultados =
        datosGeoJSON.features.filter(
            feature => {

                const propiedades =
                    feature.properties ||
                    {};


                const nombre =
                    propiedades.Name ||
                    "";


                const datos =
                    obtenerDatosModulo(
                        feature
                    );


                const contenido = (

                    nombre +
                    " " +
                    datos.beneficiario +
                    " " +
                    datos.estado +
                    " " +
                    datos.tipo

                ).toLowerCase();


                return contenido.includes(
                    busqueda
                );

            }
        );


    actualizarListado({
        type:
            "FeatureCollection",

        features:
            resultados

    });

}


// ============================================================
// TABLA DE BENEFICIARIOS
// ============================================================

function abrirTabla() {

    const modal =
        document.getElementById(
            "modal-tabla"
        );


    if (!modal) {

        return;

    }


    modal.classList.add(
        "visible"
    );


    actualizarTabla();

}


function cerrarTabla() {

    const modal =
        document.getElementById(
            "modal-tabla"
        );


    if (modal) {

        modal.classList.remove(
            "visible"
        );

    }

}


// ============================================================
// ACTUALIZAR TABLA
// ============================================================

function actualizarTabla() {

    if (!datosGeoJSON) {

        return;

    }


    const tabla =
        document.getElementById(
            "tabla-beneficiarios"
        );


    if (!tabla) {

        return;

    }


    tabla.innerHTML = "";


    datosGeoJSON.features.forEach(
        feature => {

            const nombre =
                feature.properties?.id ||
                feature.properties?.Name ||
                feature.properties?.name ||
                "";


            if (
                !esModuloHabitacional(
                    nombre
                )
            ) {

                return;

            }


            const datos =
                obtenerDatosModulo(
                    feature
                );


            const tr =
                document.createElement(
                    "tr"
                );


            const estado =
                normalizarEstado(
                    datos.estado
                );


            const color =
                colorEstado(
                    estado
                );


            tr.innerHTML = `

                <td>

                    <strong>
                        ${escapeHTML(
                            datos.modulo
                        )}
                    </strong>

                </td>


                <td>

                    ${escapeHTML(
                        datos.beneficiario
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        datos.sector
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        datos.tipo || "-"
                    )}

                </td>


                <td>

                    <span
                        class="estado-tabla"
                        style="
                            background:${color};
                        "
                    >

                        ${escapeHTML(
                            estado
                        )}

                    </span>

                </td>


                <td>

                    ${escapeHTML(
                        datos.avance || "-"
                    )}

                </td>


                <td>

                    ${
                        datos.informe
                        ?
                        `
                        <a
                            href="${escapeAttribute(datos.informe)}"
                            target="_blank"
                            rel="noopener"
                            class="informe-link"
                        >

                            <i class="fa-solid fa-file-pdf"></i>

                            Ver

                        </a>
                        `
                        :
                        "-"
                    }

                </td>

            `;


            tabla.appendChild(
                tr
            );

        }
    );

}


// ============================================================
// FILTRAR TABLA
// ============================================================

function filtrarTabla(
    texto
) {

    const busqueda =
        String(texto)
            .toLowerCase()
            .trim();


    const filas =
        document.querySelectorAll(
            "#tabla-beneficiarios tr"
        );


    filas.forEach(
        fila => {

            const contenido =
                fila.textContent
                    .toLowerCase();


            fila.style.display =
                contenido.includes(
                    busqueda
                )
                ?
                ""
                :
                "none";

        }
    );

}


// ============================================================
// ACTUALIZAR CONEXIÓN
// ============================================================

function actualizarConexion(
    texto,
    conectado
) {

    const elemento =
        document.getElementById(
            "estado-conexion"
        );


    if (!elemento) {

        return;

    }


    const color =
        conectado
        ?
        "#69f0ae"
        :
        "#ffca28";


    elemento.innerHTML = `

        <i
            class="fa-solid fa-circle"
            style="
                color:${color};
            "
        ></i>

        ${escapeHTML(
            texto
        )}

    `;

}


// ============================================================
// CARGA
// ============================================================

function mostrarCargaMapa(
    mostrar
) {

    const elemento =
        document.getElementById(
            "cargando-mapa"
        );


    if (!elemento) {

        return;

    }


    elemento.classList.toggle(
        "oculto",
        !mostrar
    );

}


// ============================================================
// MENSAJE
// ============================================================

function mostrarMensaje(
    mensaje
) {

    let elemento =
        document.getElementById(
            "mensaje-sistema"
        );


    if (!elemento) {

        elemento =
            document.createElement(
                "div"
            );


        elemento.id =
            "mensaje-sistema";


        elemento.style.cssText = `

            position:fixed;

            right:20px;

            bottom:20px;

            z-index:99999;

            background:#263238;

            color:white;

            padding:12px 18px;

            border-radius:8px;

            box-shadow:
                0 5px 20px
                rgba(0,0,0,.3);

            font-size:12px;

        `;


        document.body.appendChild(
            elemento
        );

    }


    elemento.textContent =
        mensaje;


    setTimeout(
        () => {

            if (elemento) {

                elemento.remove();

            }

        },
        4000
    );

}


// ============================================================
// ERROR
// ============================================================

function mostrarError(
    mensaje
) {

    const lista =
        document.getElementById(
            "lista-modulos"
        );


    if (!lista) {

        return;

    }


    lista.innerHTML = `

        <div
            style="
                padding:15px;
                margin:5px;
                background:#ffebee;
                color:#b71c1c;
                border-radius:8px;
                font-size:12px;
            "
        >

            <strong>
                Error cargando GeoJSON
            </strong>

            <br><br>

            ${escapeHTML(
                mensaje
            )}

            <br><br>

            Verifica que
            <strong>
                modulos.geojson
            </strong>
            esté en la misma carpeta
            que index.html.

        </div>

    `;

}


// ============================================================
// ACTUALIZAR ELEMENTO
// ============================================================

function actualizarElemento(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );


    if (elemento) {

        elemento.textContent =
            valor;

    }

}


// ============================================================
// SEGURIDAD HTML
// ============================================================

function escapeHTML(
    texto
) {

    if (
        texto === null ||
        texto === undefined
    ) {

        return "";

    }


    return String(texto)

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


// ============================================================
// SEGURIDAD ATRIBUTOS
// ============================================================

function escapeAttribute(
    texto
) {

    if (!texto) {

        return "";

    }


    return String(texto)

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// FIN
// ============================================================
