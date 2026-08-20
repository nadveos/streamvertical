#!/usr/bin/env python3
"""
server.py — Servidor HTTP local con soporte para guardar stream-data.json
Uso:
    python server.py
    python server.py 8000
"""

import http.server
import json
import os
import sys

PORT = 8000
if len(sys.argv) > 1:
    try:
        PORT = int(sys.argv[1])
    except ValueError:
        pass

DIR = os.path.dirname(os.path.abspath(__file__))


class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def end_headers(self):
        # Desactivar caché por completo y habilitar CORS
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/overlays':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            overlays_info = [
                {"key": "overlay_16x9_principal", "file": "overlay.html"},
                {"key": "overlay_16x9_solo", "file": "overlay-solo.html"},
                {"key": "overlay_16x9_multimedia", "file": "overlay-multimedia.html"},
                {"key": "overlay_16x9_invitado", "file": "overlay-invitado.html"},
                {"key": "overlay_frames_dinamico", "file": "frames/vertical/overlay-frames-dinamico.html"},
                {"key": "overlay_9x16_vertical", "file": "overlay-vertical.html"},
                {"key": "overlay_9x16_vertical_invitado", "file": "overlay-invitado-vertical.html"},
                {"key": "overlay_9x16_vertical_solo", "file": "overlay-solo-vertical.html"},
            ]
            self.wfile.write(json.dumps(overlays_info).encode('utf-8'))
            return

        super().do_GET()

    def do_POST(self):
        if self.path == '/api/save-data':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                data = json.loads(body.decode('utf-8'))

                json_path = os.path.join(DIR, 'stream-data.json')
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

                print(f"💾 stream-data.json actualizado con éxito ({len(body)} bytes).")

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(b'{"ok": true}')
            except Exception as e:
                print(f"❌ Error al guardar stream-data.json: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        # Filtrar el spam de polling de stream-data.json para mantener la consola limpia
        if len(args) > 0 and 'GET /stream-data.json' in str(args[0]):
            return
        super().log_message(format, *args)


if __name__ == '__main__':
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, CustomHandler)
    print("=" * 60)
    print(f" 🎛️  SERVIDOR LOCAL ACTIVO EN http://127.0.0.1:{PORT}")
    print(f" 🌐  Panel de control: http://127.0.0.1:{PORT}/panel.html")
    print(f" 📺  Overlay Dinámico: http://127.0.0.1:{PORT}/frames/vertical/overlay-frames-dinamico.html")
    print(f" 💾  Guardado automático en stream-data.json habilitado")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
