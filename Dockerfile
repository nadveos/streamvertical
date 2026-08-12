# Imagen base liviana NGINX Alpine
FROM nginx:alpine

# Directorio web de NGINX
WORKDIR /usr/share/nginx/html

# Copiar archivos HTML especificados
COPY test-bg.html .
COPY overlay-vertical.html .
COPY overlay-solo-vertical.html .
COPY transition.html .
COPY transition-vertical.html .
COPY pronto-empezamos.html .

# Copiar hojas de estilo CSS requeridas
COPY main.css .
COPY overlay-vertical.css .
COPY overlay-solo-vertical.css .
COPY transition.css .
COPY transition-vertical.css .
COPY pronto-empezamos.css .
COPY transparent-mode.css .

# Copiar scripts JS y datos dinámicos requeridos
COPY overlay-engine.js .
COPY script-overlay.js .
COPY stream-data.json .

# Copiar subcarpetas de la carpeta frames (vertical y animations)
COPY frames/vertical/ ./frames/vertical/
COPY frames/animations/ ./frames/animations/

# Exponer puerto 80
EXPOSE 80

# Iniciar servidor NGINX
CMD ["nginx", "-g", "daemon off;"]
