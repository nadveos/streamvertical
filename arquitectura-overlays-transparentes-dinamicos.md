# Arquitectura dinámica de overlays con interiores 100% transparentes

## Objetivo

El objetivo es conservar **exactamente el diseño visual actual de los overlays** —bordes, animaciones, posiciones, proporciones, nombres, indicadores, ticker, divisores y demás decoración— y modificar únicamente el comportamiento de las áreas destinadas a:

- cámaras web;
- contenido multimedia;
- video del invitado;
- screen share;
- cualquier otra fuente que posteriormente queramos colocar desde OBS, Streamlabs, vMix u otro software.

La condición fundamental es:

> **El interior de cada contenedor de contenido debe ser 100% transparente.**

Es decir, si una cámara está colocada detrás del Browser Source del overlay, la cámara debe verse dentro del frame sin que la animación/fondo global del overlay aparezca detrás de ella.

La solución propuesta además debe ser **reutilizable y dinámica**, para que no haya que programar coordenadas específicas para cada overlay.

---

# 1. El problema actual

La plantilla original tiene una estructura visual correcta.

El problema aparece porque el fondo/animación global está aplicado sobre un contenedor superior, por ejemplo:

```css
.main-border {
    background: linear-gradient(...);
    animation: ponchoWave 8s ease infinite;
}
```

Mientras que las ventanas de cámara pueden tener:

```css
.cam-window {
    background: transparent;
}
```

A primera vista parece suficiente, pero no lo es.

El navegador interpreta:

```text
.cam-window
    ↓
transparent
    ↓
mostrar lo que está detrás
    ↓
.main-border
    ↓
gradiente animado
```

Por lo tanto, la transparencia del `cam-window` hace que se vea precisamente la animación global.

## Consecuencia

Si hacemos simplemente:

```css
.cam-window,
.mm-window {
    background: transparent;
}
```

no conseguimos un agujero real.

Conseguimos una ventana transparente que deja ver el fondo animado.

---

# 2. Lo que NO debemos hacer

Hay varias soluciones que parecen fáciles pero no son adecuadas para esta plantilla.

## 2.1. No usar `opacity: 0`

No debemos hacer:

```css
.cam-window {
    opacity: 0;
}
```

porque eso afecta al elemento completo y potencialmente a sus hijos.

Podríamos perder:

- bordes;
- decoraciones;
- indicadores;
- nombres;
- overlays;
- elementos posicionados dentro del frame.

La transparencia debe afectar solamente al **interior**.

---

## 2.2. No modificar las dimensiones del layout

No debemos empezar a cambiar:

```css
width
height
top
left
gap
margin
padding
aspect-ratio
```

para conseguir transparencia.

Las posiciones actuales forman parte del diseño.

La solución debe adaptarse al layout existente.

---

## 2.3. No utilizar coordenadas fijas

Evitar:

```js
const camera = {
    x: 32,
    y: 100,
    width: 500,
    height: 300
};
```

Esto se rompería cuando:

- cambie la resolución;
- cambie el tamaño del Browser Source;
- se utilice otro overlay;
- se modifique una posición;
- se cree una versión vertical;
- se cambie el diseño.

---

## 2.4. No convertir todo el overlay en una máscara rígida

La solución no debe imponer una composición nueva.

El overlay ya tiene una composición correcta.

El sistema debe simplemente descubrir dónde están las áreas que queremos transparentar.

---

# 3. La arquitectura propuesta

La solución consiste en separar visualmente dos conceptos:

```text
OVERLAY
│
├── Capa de animación global
│
└── Contenido del overlay
    │
    ├── frames
    ├── cámaras
    ├── multimedia
    ├── nombres
    ├── indicadores
    └── ticker
```

La animación global deja de estar directamente pintada sobre `.main-border`.

Se mueve a una capa independiente:

```css
.main-border::before
```

De esta manera podemos aplicar una máscara únicamente sobre esa capa.

---

# 4. Nueva composición de capas

La arquitectura conceptual sería:

```text
                    BROWSER SOURCE
┌───────────────────────────────────────────────┐
│                                               │
│   ::before                                    │
│   ANIMACIÓN GLOBAL                            │
│                                               │
│   ████████████████████████████████████████    │
│   ███ ┌──────────────┐ ███████████████████    │
│   ███ │              │ ███████████████████    │
│   ███ │   CÁMARA     │ ███ ┌──────────────┐   │
│   ███ │ TRANSPARENTE │ ███ │              │   │
│   ███ │              │ ███ │  MULTIMEDIA  │   │
│   ███ └──────────────┘ ███ │ TRANSPARENTE │   │
│   ███████████████████████ │              │   │
│                           └──────────────┘   │
│                                               │
│   FRAMES / NOMBRES / TICKER / DECORACIÓN     │
│                                               │
└───────────────────────────────────────────────┘
```

Los rectángulos transparentes no eliminan el frame.

Eliminan únicamente la pintura de la capa de animación global que está debajo.

---

# 5. Mantener los frames actuales

Los frames existentes deben conservarse.

En particular, el frame multimedia ya tiene una arquitectura apropiada:

```css
.mm-frame {
    background: transparent;
}
```

y un borde propio mediante:

```css
.mm-frame::after
```

Ese `::after` contiene su propio gradiente y su propia animación.

Por lo tanto:

> **El borde animado del frame multimedia no debe ser reemplazado por la máscara global.**

Debe permanecer independiente.

La misma filosofía debe aplicarse a los frames de cámara.

---

# 6. Transparencia real del interior

Los elementos que contienen la fuente externa deben tener:

```css
.cam-window,
.mm-window {
    background: transparent !important;
}
```

Esto garantiza que esas ventanas no agreguen ningún color propio.

Sin embargo, esta regla por sí sola no soluciona el problema.

El verdadero trabajo lo hace la máscara aplicada a la capa de animación global.

---

# 7. Capa de animación global

El `.main-border` pasa a ser transparente:

```css
.main-border {
    background: transparent !important;
    animation: none !important;
    position: relative;
}
```

La animación pasa a:

```css
.main-border::before {
    content: "";

    position: absolute;
    inset: 0;

    z-index: 0;
    pointer-events: none;

    background: linear-gradient(
        135deg,
        #8B0000 0%,
        #C0392B 15%,
        #1A1A1A 25%,
        #1A1A1A 30%,
        #8B0000 40%,
        #C0392B 55%,
        #1A1A1A 65%,
        #1A1A1A 70%,
        #8B0000 85%,
        #C0392B 100%
    );

    background-size: 300% 300%;

    animation: ponchoWave 8s ease infinite;
}
```

La animación visual sigue siendo la misma.

La diferencia es que ahora existe como una capa independiente.

---

# 8. Máscara de la animación

Sobre `.main-border::before` se agrega:

```css
.main-border::before {
    -webkit-mask-image: var(--overlay-cutouts, none);
    mask-image: var(--overlay-cutouts, none);

    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;

    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;

    -webkit-mask-position: 0 0;
    mask-position: 0 0;
}
```

La variable:

```css
--overlay-cutouts
```

será generada dinámicamente mediante JavaScript.

---

# 9. ¿Cómo sabe JavaScript qué zonas transparentar?

La solución genérica consiste en utilizar un atributo HTML:

```html
data-cutout
```

Por ejemplo:

```html
<div class="cam-window" data-cutout></div>
```

o:

```html
<div class="mm-window" data-cutout></div>
```

Esto convierte al elemento en una declaración:

> "El interior de este elemento debe ser transparente respecto de la animación global."

---

# 10. Ventaja del sistema `data-cutout`

No necesitamos que JavaScript conozca nombres específicos.

En lugar de:

```js
document.querySelectorAll(
    '.cam-window, .mm-window'
);
```

podemos usar:

```js
document.querySelectorAll('[data-cutout]');
```

Esto hace que el motor sea reutilizable.

Un overlay podría tener:

```html
<div class="cam-window" data-cutout></div>
<div class="cam-window" data-cutout></div>
<div class="mm-window" data-cutout></div>
```

Otro podría tener:

```html
<div class="solo-camera" data-cutout></div>
```

Otro:

```html
<div class="screen-share" data-cutout></div>
<div class="guest-video" data-cutout></div>
```

El motor no necesita saber qué son.

Solamente necesita saber:

> "Este elemento tiene `data-cutout`, por lo tanto su interior debe ser un agujero en la capa animada."

---

# 11. Detectar las dimensiones automáticamente

Para obtener la posición real de cada elemento usamos:

```js
element.getBoundingClientRect();
```

Ejemplo:

```js
const rect = element.getBoundingClientRect();
```

Esto devuelve:

```text
left
top
right
bottom
width
height
```

Por lo tanto, si el overlay cambia de:

```text
1920 × 1080
```

a:

```text
1280 × 720
```

el sistema vuelve a calcular las posiciones.

No hay coordenadas hardcodeadas.

---

# 12. Crear la máscara SVG

Una máscara SVG puede tener:

```text
BLANCO = mostrar
NEGRO  = ocultar
```

Primero creamos una superficie blanca:

```html
<rect
    x="0"
    y="0"
    width="100%"
    height="100%"
    fill="white"
/>
```

Eso significa:

> mostrar toda la animación.

Después agregamos rectángulos negros:

```html
<rect
    x="..."
    y="..."
    width="..."
    height="..."
    fill="black"
/>
```

Cada rectángulo negro significa:

> ocultar la animación aquí.

Por lo tanto, la animación queda:

```text
██████████████████████████
██████████████████████████
████ ┌───────────────┐ ███
████ │               │ ███
████ │ TRANSPARENTE  │ ███
████ │               │ ███
████ └───────────────┘ ███
██████████████████████████
```

---

# 13. Función JavaScript

El núcleo del sistema puede ser:

```js
function updateCutouts() {
    const overlay = document.querySelector('.main-border');

    if (!overlay) return;

    const elements = document.querySelectorAll(
        '[data-cutout]'
    );

    const width = window.innerWidth;
    const height = window.innerHeight;

    let holes = '';

    elements.forEach(element => {

        const rect = element.getBoundingClientRect();

        const style = getComputedStyle(element);

        const radius =
            parseFloat(style.borderTopLeftRadius) || 0;

        holes += `
            <rect
                x="${rect.left}"
                y="${rect.top}"
                width="${rect.width}"
                height="${rect.height}"
                rx="${radius}"
                fill="black"
            />
        `;
    });

    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="${width}"
            height="${height}"
            viewBox="0 0 ${width} ${height}"
        >

            <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="white"
            />

            ${holes}

        </svg>
    `;

    const mask =
        `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;

    overlay.style.setProperty(
        '--overlay-cutouts',
        mask
    );
}
```

---

# 14. Ejecutarlo al cargar

```js
window.addEventListener(
    'load',
    updateCutouts
);
```

También al cambiar tamaño:

```js
window.addEventListener(
    'resize',
    updateCutouts
);
```

Y orientación:

```js
window.addEventListener(
    'orientationchange',
    updateCutouts
);
```

---

# 15. Detectar cambios internos

Para hacerlo realmente dinámico conviene utilizar:

```js
const observer = new ResizeObserver(
    updateCutouts
);
```

Y observar:

```js
observer.observe(
    document.querySelector('.main-border')
);
```

Además:

```js
document
    .querySelectorAll('[data-cutout]')
    .forEach(element => {
        observer.observe(element);
    });
```

Esto permite recalcular si cambia el tamaño de un frame.

---

# 16. Resultado para el overlay 16:9

El overlay multimedia tendría conceptualmente:

```html
<div class="cam-window" data-cutout>
</div>
```

para la cámara del host.

Luego:

```html
<div class="cam-window" data-cutout>
</div>
```

para la cámara del invitado.

Y:

```html
<div class="mm-window" data-cutout>
</div>
```

para el contenido multimedia.

El motor encuentra tres elementos.

Resultado:

```text
                 16:9

┌─────────────────────────────────────────┐
│               HEADER                    │
│                                         │
│ ┌─────────────┐    ┌─────────────────┐ │
│ │             │    │                 │ │
│ │    HOST     │    │                 │ │
│ │             │    │                 │ │
│ └─────────────┘    │    MULTIMEDIA   │ │
│                    │                 │ │
│ ┌─────────────┐    │                 │ │
│ │             │    │                 │ │
│ │  INVITADO   │    │                 │ │
│ │             │    │                 │ │
│ └─────────────┘    └─────────────────┘ │
│                                         │
│                 TICKER                  │
└─────────────────────────────────────────┘
```

La animación global continúa alrededor.

Los tres interiores son transparentes.

---

# 17. Resultado para el overlay 9:16

El mismo motor puede funcionar sin cambios.

Por ejemplo:

```html
<div
    class="cam-window"
    data-cutout>
</div>
```

Solamente existe un agujero.

El resultado:

```text
┌─────────────────┐
│                 │
│    ANIMACIÓN    │
│                 │
│ ┌─────────────┐ │
│ │             │ │
│ │   CÁMARA    │ │
│ │             │ │
│ │ TRANSPARENTE│ │
│ │             │ │
│ └─────────────┘ │
│                 │
│     NAME TAG    │
│                 │
│     TICKER      │
└─────────────────┘
```

No es necesario escribir otra versión del algoritmo.

---

# 18. Nuevos overlays

Esta arquitectura permite crear posteriormente overlays completamente diferentes.

## Entrevista doble

```html
<div data-cutout class="host-camera"></div>

<div data-cutout class="guest-camera"></div>
```

## Entrevista + pantalla

```html
<div data-cutout class="host-camera"></div>

<div data-cutout class="guest-camera"></div>

<div data-cutout class="screen-share"></div>
```

## Artista + videoclip

```html
<div data-cutout class="artist-camera"></div>

<div data-cutout class="music-video"></div>
```

## Streaming vertical

```html
<div data-cutout class="main-camera"></div>
```

No se modifica el motor.

---

# 19. Posible evolución: nombres de zonas

También podemos utilizar:

```html
data-cutout="camera-host"
```

```html
data-cutout="camera-guest"
```

```html
data-cutout="guest-media"
```

Esto permitiría identificar semánticamente cada zona.

Por ejemplo:

```html
<div
    class="cam-window"
    data-cutout="camera-host">
</div>

<div
    class="cam-window"
    data-cutout="camera-guest">
</div>

<div
    class="mm-window"
    data-cutout="guest-media">
</div>
```

Esto puede ser útil en una futura integración con configuración externa.

---

# 20. Posible sistema de fuentes

En una etapa posterior podríamos relacionar:

```text
camera-host
    ↓
OBS Camera 1

camera-guest
    ↓
OBS Camera 2

guest-media
    ↓
OBS Media Source
```

Pero esto debe considerarse una fase posterior.

La primera versión debe encargarse solamente de:

1. detectar zonas;
2. generar agujeros;
3. mantener el diseño;
4. conservar las animaciones;
5. mantener transparencia real.

No conviene mezclar todavía la gestión de fuentes de OBS con el motor visual.

---

# 21. Arquitectura final recomendada

La estructura de archivos podría evolucionar hacia:

```text
overlay-system/
│
├── main.css
│
├── overlay-engine.js
│
├── script-overlay.js
│
├── overlay-16-9.html
│
├── overlay-9-16.html
│
├── overlay-entrevista.html
│
└── overlays/
    ├── artista.html
    ├── podcast.html
    └── streaming.html
```

El archivo:

```text
overlay-engine.js
```

contendría toda la lógica genérica de:

- detección de `[data-cutout]`;
- cálculo de posiciones;
- generación de máscara;
- actualización;
- `ResizeObserver`;
- responsive;
- cambios de resolución.

Cada overlay solamente define su diseño.

---

# 22. Principio fundamental del sistema

El HTML define:

> **Dónde están los frames.**

El CSS define:

> **Cómo se ven los frames.**

El motor define:

> **Qué partes de la animación global deben desaparecer.**

Esto separa responsabilidades.

---

# 23. Ventajas

Con este enfoque conseguimos:

- mantener el diseño original;
- mantener los bordes animados;
- mantener las animaciones existentes;
- mantener los name tags;
- mantener los indicadores;
- mantener el ticker;
- mantener las posiciones;
- mantener las proporciones;
- no depender de coordenadas fijas;
- funcionar en 16:9;
- funcionar en 9:16;
- permitir múltiples cámaras;
- permitir multimedia;
- permitir nuevos tipos de contenido;
- reutilizar el mismo motor;
- recalcular automáticamente al cambiar tamaño;
- utilizar el mismo sistema para futuros overlays.

---

# 24. La prueba de éxito

El resultado correcto debería cumplir simultáneamente:

### Fuera del frame

```text
ANIMACIÓN GLOBAL
████████████████████
```

### Dentro del frame

```text
TRANSPARENCIA REAL
```

### Sobre el frame

```text
BORDE ANIMADO
NAME TAG
DECORACIÓN
```

Es decir:

```text
             CAPAS

┌──────────────────────────────┐
│ ANIMACIÓN GLOBAL             │
│                              │
│ ┌──────────────────────────┐ │
│ │ BORDE ANIMADO             │ │
│ │ ┌──────────────────────┐ │ │
│ │ │                      │ │ │
│ │ │  TRANSPARENCIA REAL  │ │ │
│ │ │                      │ │ │
│ │ └──────────────────────┘ │ │
│ │       NAME TAG            │ │
│ └──────────────────────────┘ │
│                              │
│ ANIMACIÓN GLOBAL             │
└──────────────────────────────┘
```

La cámara o el video se coloca **debajo** del Browser Source y aparece exclusivamente en la zona transparente.

---

# 25. Orden recomendado de implementación

No conviene modificar todos los overlays de una vez.

La implementación segura sería:

## Fase 1

Modificar únicamente `main.css`.

Crear:

```css
.main-border::before
```

para contener la animación global.

---

## Fase 2

Agregar:

```css
.cam-window,
.mm-window {
    background: transparent !important;
}
```

---

## Fase 3

Agregar `data-cutout` únicamente al overlay multimedia:

```html
<div class="cam-window" data-cutout></div>

<div class="cam-window" data-cutout></div>

<div class="mm-window" data-cutout></div>
```

---

## Fase 4

Implementar `overlay-engine.js`.

---

## Fase 5

Probar el overlay 16:9.

---

## Fase 6

Probar el overlay 9:16.

---

## Fase 7

Convertir el motor en componente reutilizable para futuros overlays.

---

# 26. Criterio para considerar la solución terminada

No debemos considerar terminado el trabajo simplemente porque:

> "el interior parece transparente".

Debe verificarse que:

1. el interior realmente muestra una fuente colocada detrás;
2. no aparece el gradiente global;
3. no aparece el fondo negro;
4. no aparece una sombra no deseada;
5. el borde permanece;
6. la animación del borde permanece;
7. el name tag permanece;
8. el ticker permanece;
9. el layout permanece;
10. funciona al redimensionar el Browser Source;
11. funciona en 16:9;
12. funciona en 9:16.

---

# Conclusión

La solución no consiste en hacer transparentes los frames y esperar que el fondo desaparezca.

La solución correcta es:

```text
             ANTES

.main-border
└── fondo animado
    └── cam-window transparente
        └── se ve el fondo animado ❌
```

Transformarlo en:

```text
             DESPUÉS

.main-border
│
├── ::before
│     └── animación global
│           └── máscara dinámica
│                 ├── agujero cámara 1
│                 ├── agujero cámara 2
│                 └── agujero multimedia
│
└── main-inner
      ├── frames
      ├── cámaras
      ├── multimedia
      ├── nombres
      └── ticker
```

Y la regla arquitectónica fundamental es:

> **Los frames no se rediseñan. La animación global se convierte en una capa independiente y el motor genera agujeros dinámicos según los elementos marcados con `data-cutout`.**

De esta forma, el overlay actual puede conservarse y el mismo mecanismo puede reutilizarse para todos los overlays futuros.
