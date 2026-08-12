/**
 * overlay-engine.js
 *
 * Motor genérico de transparencia dinámica para overlays.
 *
 * FUNCIONAMIENTO:
 *  1. Detecta automáticamente todos los elementos con clase .cam-window o .mm-window.
 *     También detecta cualquier elemento marcado con [data-cutout] como fallback.
 *  2. Calcula su posición real mediante getBoundingClientRect().
 *  3. Genera una máscara SVG inline:
 *       - Rectángulo blanco de fondo  → animación global visible en todo el overlay.
 *       - Rectángulos negros por cada ventana detectada → agujero real (transparencia).
 *  4. Asigna el SVG como data URI a la variable CSS --overlay-cutouts en .main-border.
 *  5. Se recalcula automáticamente ante resize, orientationchange y ResizeObserver.
 *
 * USO:
 *  No se requiere ningún atributo en el HTML. Basta con que los contenedores
 *  usen las clases estándar .cam-window o .mm-window:
 *    <div class="cam-window"></div>
 *    <div class="mm-window"></div>
 *
 *  Para recortar cualquier otro elemento, agregar [data-cutout]:
 *    <div class="mi-elemento" data-cutout></div>
 *
 *  Incluir este script al final del <body>:
 *    <script src="overlay-engine.js"></script>
 *
 * El motor es completamente agnóstico al overlay concreto.
 */

(function () {
    'use strict';

    // --- Utilidad: debounce ---------------------------------------------------
    function debounce(fn, ms) {
        var timer;
        return function () {
            clearTimeout(timer);
            timer = setTimeout(fn, ms);
        };
    }

    // --- Función principal ----------------------------------------------------
    function updateCutouts() {
        var overlay = document.querySelector('.main-border');
        if (!overlay) return;

        var overlayRect = overlay.getBoundingClientRect();
        var width  = overlayRect.width  || window.innerWidth;
        var height = overlayRect.height || window.innerHeight;

        if (width === 0 || height === 0) return;

        // Detecta automáticamente .cam-window, .mm-window y cualquier [data-cutout] adicional
        var cutoutElements = document.querySelectorAll('.cam-window, .mm-window, [data-cutout]');

        // Construir rectángulos negros (agujeros) para cada [data-cutout]
        var holes = '';

        cutoutElements.forEach(function (el) {
            var rect   = el.getBoundingClientRect();
            var style  = getComputedStyle(el);

            // Respetar border-radius del elemento si existe
            var radius = parseFloat(style.borderTopLeftRadius) || 0;

            // Ignorar elementos con dimensiones 0 (ocultos / no renderizados)
            if (rect.width === 0 || rect.height === 0) return;

            // Posición relativa al contenedor .main-border
            var relLeft = rect.left - overlayRect.left;
            var relTop  = rect.top  - overlayRect.top;

            holes += '<rect'
                + ' x="'      + relLeft     + '"'
                + ' y="'      + relTop      + '"'
                + ' width="'  + rect.width  + '"'
                + ' height="' + rect.height + '"'
                + ' rx="'     + radius      + '"'
                + ' ry="'     + radius      + '"'
                + ' fill="black"'
                + '/>';
        });

        // Construir SVG completo usando las dimensiones exactas de .main-border
        var svg = '<svg'
            + ' xmlns="http://www.w3.org/2000/svg"'
            + ' width="'   + width  + '"'
            + ' height="'  + height + '"'
            + ' viewBox="0 0 ' + width + ' ' + height + '"'
            + '>'
            + '<rect x="0" y="0" width="100%" height="100%" fill="white"/>'
            + holes
            + '</svg>';

        // Aplicar como CSS custom property en .main-border
        var dataUri = 'url("data:image/svg+xml;charset=utf-8,'
            + encodeURIComponent(svg)
            + '")';

        overlay.style.setProperty('--overlay-cutouts', dataUri);
    }

    // --- Versión con debounce para eventos frecuentes ------------------------
    var debouncedUpdate = debounce(updateCutouts, 50);

    // --- Eventos de ventana --------------------------------------------------
    window.addEventListener('load',              updateCutouts);
    window.addEventListener('resize',            debouncedUpdate);
    window.addEventListener('orientationchange', debouncedUpdate);

    // --- ResizeObserver — recalcula si cambia el tamaño de cualquier frame ---
    //     Se inicializa después del load para garantizar que el DOM este listo.
    window.addEventListener('load', function () {
        var observer = new ResizeObserver(debouncedUpdate);

        // Observar el contenedor principal
        var overlay = document.querySelector('.main-border');
        if (overlay) observer.observe(overlay);

        // Observar cada .cam-window, .mm-window y [data-cutout] para recalcular al redimensionar
        document.querySelectorAll('.cam-window, .mm-window, [data-cutout]').forEach(function (el) {
            observer.observe(el);
        });
    });

    // --- Ejecución inmediata (por si el DOM ya esta listo) -------------------
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        updateCutouts();
    }

}());
