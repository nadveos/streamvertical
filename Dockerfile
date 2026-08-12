# Imagen base liviana NGINX Alpine
FROM nginx:alpine

# Directorio web de NGINX
WORKDIR /usr/share/nginx/html

# Copiar archivo index con menú de acceso a todos los marcos
COPY index.html .

# Copiar pantallas y transiciones adicionales
COPY test-bg.html .
COPY transition.html .
COPY transition-vertical.html .
COPY pronto-empezamos.html .

# Copiar la estructura completa de carpetas frames (frames/, frames/vertical/, frames/animations/)
COPY frames/ ./frames/

# Copiar hojas de estilo CSS necesarias referenciadas por los frames y pantallas
COPY main.css .
COPY transparent-mode.css .
COPY overlay-solo.css .
COPY overlay-multimedia.css .
COPY overlay-invitado.css .
COPY overlay-vertical.css .
COPY overlay-solo-vertical.css .
COPY transition.css .
COPY transition-vertical.css .
COPY pronto-empezamos.css .

# Copiar script JS de sincronización
COPY script-overlay.js .

# Copiar stream-data.json en raíz y subcarpetas para disponibilidad en peticiones relativas
COPY stream-data.json .
COPY stream-data.json ./frames/
COPY stream-data.json ./frames/vertical/

# Exponer puerto 80
EXPOSE 80

# Iniciar servidor NGINX
CMD ["nginx", "-g", "daemon off;"]

