/**
 * server.js — Servidor local para el Panel de Control de Overlays
 * 
 * Uso: node server.js
 * Luego abrí: http://localhost:3000/panel.html
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { Jimp } = require('jimp');

let PORT = 3000;
const DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Overlays disponibles
const OVERLAY_CONFIGS = {
  'overlay_16x9_principal': { file: 'overlay.html', width: 1920, height: 1080 },
  'overlay_16x9_solo': { file: 'overlay-solo.html', width: 1920, height: 1080 },
  'overlay_16x9_multimedia': { file: 'overlay-multimedia.html', width: 1920, height: 1080 },
  'overlay_16x9_invitado': { file: 'overlay-invitado.html', width: 1920, height: 1080 },
  'overlay_9x16_vertical': { file: 'overlay-vertical.html', width: 1080, height: 1920 },
  'overlay_9x16_vertical_invitado': { file: 'overlay-invitado-vertical.html', width: 1080, height: 1920 },
  'overlay_9x16_vertical_solo': { file: 'overlay-solo-vertical.html', width: 1080, height: 1920 },
  'transition': { file: 'transition.html', width: 1920, height: 1080 },
  'transition_vertical': { file: 'transition-vertical.html', width: 1080, height: 1920 },
  'pronto_empezamos': { file: 'pronto-empezamos.html', width: 1920, height: 1080 },
  'pronto_empezamos_9x16': { file: 'pronto-empezamos.html', width: 1080, height: 1920 },
  'offline': { file: 'offline.html', width: 1920, height: 1080 },
  'animation_9x16': { file: 'animation.html', width: 1080, height: 1920 },
  'animation_1_9x16': { file: 'animation-1.html', width: 1080, height: 1920 },
  'flyers': { file: 'flyers.html', width: 1080, height: 1350 },
  'banner_kick_1200x134': { file: 'banner-kick.html', width: 1200, height: 134 },
  'overlay_invitacion': { file: 'overlay-invitacion.html', width: 1920, height: 1080 },
  'likes_animation': { file: 'frames/animations/likes.html', width: 1080, height: 1920 },
};

async function captureOverlay(overlayKey) {
  const config = OVERLAY_CONFIGS[overlayKey];
  if (!config) throw new Error(`Overlay desconocido: ${overlayKey}`);

  const renderDir = path.join(DIR, 'render');
  if (!fs.existsSync(renderDir)) fs.mkdirSync(renderDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: config.width, height: config.height });

    // Cargar el overlay desde el servidor local (no file://)
    const url = `http://localhost:${PORT}/${config.file}`;
    await page.goto(url, { waitUntil: 'networkidle' });

    // Esperar a que las fuentes y datos dinámicos del panel estén cargados
    await page.evaluate(async () => {
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      document.body.classList.add('static-capture');

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      document.querySelectorAll('.mm-placeholder').forEach(ph => {
        ph.style.display = 'none';
      });
    });
    await page.waitForTimeout(500);

    // Get bounding boxes of all camera/multimedia windows before screenshot
    const camRects = await page.evaluate(() => {
      const rects = [];
      document.querySelectorAll('.cam-window, .mm-window').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          rects.push({
            x: Math.round(r.left),
            y: Math.round(r.top),
            w: Math.round(r.width),
            h: Math.round(r.height)
          });
        }
      });
      return rects;
    });

    const outputFilename = overlayKey + '.png';
    const outputPath = path.join(renderDir, outputFilename);
    await page.screenshot({ path: outputPath, omitBackground: true, fullPage: true });

    // Post-process: erase interior of each camera frame to alpha=0
    if (camRects.length > 0) {
      const img = await Jimp.read(outputPath);
      const inset = 7;
      for (const rect of camRects) {
        const x = rect.x + inset;
        const y = rect.y + inset;
        const w = Math.max(0, rect.w - inset * 2);
        const h = Math.max(0, rect.h - inset * 2);
        for (let py = y; py < y + h; py++) {
          for (let px = x; px < x + w; px++) {
            img.setPixelColor(0x00000000, px, py);
          }
        }
      }
      await img.write(outputPath);
    }

    return outputPath;
  } finally {
    await browser.close();
  }
}

async function recordVideo(overlayKey, durationMs = 5000) {
  const config = OVERLAY_CONFIGS[overlayKey];
  if (!config) throw new Error(`Overlay desconocido: ${overlayKey}`);

  const renderDir = path.join(DIR, 'render');
  if (!fs.existsSync(renderDir)) fs.mkdirSync(renderDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--force-device-scale-factor=2',
      '--enable-font-antialiasing',
      '--font-render-hinting=medium',
      '--disable-gpu-vsync'
    ]
  });
  try {
    const context = await browser.newContext({
      viewport: { width: config.width, height: config.height },
      deviceScaleFactor: 2,
      recordVideo: {
        dir: renderDir,
        size: { width: config.width, height: config.height }
      }
    });

    const page = await context.newPage();
    const url = `http://localhost:${PORT}/${config.file}`;
    await page.goto(url, { waitUntil: 'networkidle' });

    // Esperar a que las fuentes web (Google Fonts) estén 100% cargadas y renderizadas
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });

    // Dar 1.5 segundos para que los datos del script-overlay.js se apliquen y las animaciones inicien suavemente
    await page.waitForTimeout(1500);

    console.log(`🎥 Grabando video WebM de ${config.file} (${durationMs / 1000}s)...`);
    await page.waitForTimeout(durationMs);

    const video = await page.video();
    await context.close();

    const savedPath = await video.path();
    const finalFilename = `${overlayKey}_video.webm`;
    const finalPath = path.join(renderDir, finalFilename);

    if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    fs.renameSync(savedPath, finalPath);

    return finalPath;
  } finally {
    await browser.close();
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS headers para llamadas del panel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ─── API: Guardar stream-data.json ──────────────────────────────────────
  if (pathname === '/api/save-data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(path.join(DIR, 'stream-data.json'), JSON.stringify(data, null, 2), 'utf8');
        console.log('💾 stream-data.json actualizado desde el panel.');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ─── API: Capturar overlay PNG ────────────────────────────────────────────
  if (pathname === '/api/capture' && req.method === 'GET') {
    const overlayKey = url.searchParams.get('overlay');
    if (!overlayKey || !OVERLAY_CONFIGS[overlayKey]) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Overlay inválido. Opciones: ' + Object.keys(OVERLAY_CONFIGS).join(', ') }));
      return;
    }

    try {
      console.log(`📸 Capturando overlay: ${overlayKey}...`);
      const outputPath = await captureOverlay(overlayKey);
      console.log(`✅ Listo: ${outputPath}`);

      // Enviar el PNG directamente como descarga
      const filename = path.basename(outputPath);
      const fileBuffer = fs.readFileSync(outputPath);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length,
      });
      res.end(fileBuffer);
    } catch (err) {
      console.error('Error al capturar overlay:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ─── API: Grabar video WebM (VP8/VP9) ────────────────────────────────────
  if (pathname === '/api/record-video' && req.method === 'GET') {
    const overlayKey = url.searchParams.get('overlay') || 'pronto_empezamos';
    const duration = parseInt(url.searchParams.get('duration') || '6000', 10);

    if (!OVERLAY_CONFIGS[overlayKey]) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Overlay inválido' }));
      return;
    }

    try {
      console.log(`🎥 Grabando video WebM de ${overlayKey} durante ${duration / 1000}s...`);
      const outputPath = await recordVideo(overlayKey, duration);
      console.log(`✅ Video grabado: ${outputPath}`);

      const filename = path.basename(outputPath);
      const fileBuffer = fs.readFileSync(outputPath);
      res.writeHead(200, {
        'Content-Type': 'video/webm',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length,
      });
      res.end(fileBuffer);
    } catch (err) {
      console.error('Error al grabar video WebM:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ─── API: Listar overlays disponibles ────────────────────────────────────
  if (pathname === '/api/overlays' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Object.entries(OVERLAY_CONFIGS).map(([key, cfg]) => ({
      key,
      file: cfg.file,
      width: cfg.width,
      height: cfg.height,
    }))));
    return;
  }

  // ─── Servir archivos estáticos ────────────────────────────────────────────
  let filePath = pathname === '/' ? '/panel.html' : pathname;
  filePath = path.join(DIR, filePath.replace(/\//g, path.sep));

  // Seguridad: evitar path traversal fuera del directorio del proyecto
  if (!filePath.startsWith(DIR)) {
    res.writeHead(403);
    res.end('Acceso denegado');
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Archivo no encontrado: ' + pathname);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  } catch (err) {
    res.writeHead(500);
    res.end('Error al leer el archivo');
  }
});

function startServer(portToUse) {
  server.listen(portToUse, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║    🎛️  PANEL DE OVERLAYS — SERVIDOR LOCAL ACTIVO     ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  🌐  Panel:  http://localhost:${portToUse}/panel.html         ║`);
    console.log(`║  📁  Carpeta: render/                                ║`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️ Puerto ${PORT} ocupado, intentando puerto ${PORT + 1}...`);
    PORT = PORT + 1;
    startServer(PORT);
  } else {
    console.error('Error en el servidor:', err);
  }
});

startServer(PORT);
