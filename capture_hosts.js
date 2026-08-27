const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');
const { Jimp } = require('jimp');

const DIR = __dirname;
const OUT_DIR = path.join(DIR, 'hosts');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const TARGETS = [
  { key: 'vv-hosts', file: 'frames/vertical/vv-hosts.html', width: 1080, height: 1920 },
  { key: 'ov-hosts-row', file: 'frames/vertical/ov-hosts-row.html', width: 1920, height: 1080 }
];

async function run() {
  console.log('🚀 Iniciando renderizado de capturas transparentes para hosts/ ...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--force-device-scale-factor=1']
  });

  try {
    for (const item of TARGETS) {
      console.log(`\n📸 Procesando ${item.key} (${item.width}x${item.height}) -> ${item.file}...`);
      const page = await browser.newPage();
      await page.setViewportSize({ width: item.width, height: item.height });

      const url = `http://127.0.0.1:8000/${item.file}`;
      await page.goto(url, { waitUntil: 'networkidle' });

      // Esperar renderizado y fuentes
      await page.evaluate(async () => {
        document.documentElement.style.background = 'transparent';
        document.body.style.background = 'transparent';
        document.body.classList.add('static-capture');

        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      });

      // Breve pausa para animaciones y sincronización de datos
      await page.waitForTimeout(1000);

      // Detectar ventanas de cámara y zonas protegidas (nametags, badges)
      const { camRects, protectedRects } = await page.evaluate(() => {
        const cams = [];
        document.querySelectorAll('.cam-window, .mm-window, .cam-cutout, [data-cutout]').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width > 10 && r.height > 10) {
            cams.push({
              x: Math.round(r.left),
              y: Math.round(r.top),
              w: Math.round(r.width),
              h: Math.round(r.height)
            });
          }
        });

        const prot = [];
        document.querySelectorAll('.name-tag, .name-tag-custom, .name-tag-cohost, .nt-host, .nt-cohost, .cam-corner-badge, .header-logo-circle, .show-logo-circle, .middle-separator-zone, .vertical-divider-bar').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            prot.push({
              x: Math.round(r.left),
              y: Math.round(r.top),
              w: Math.round(r.width),
              h: Math.round(r.height)
            });
          }
        });

        return { camRects: cams, protectedRects: prot };
      });

      console.log(`   Detectadas ${camRects.length} ventanas de cámara y ${protectedRects.length} zonas protegidas.`);

      const outName1 = `${item.key}_${item.width}x${item.height}.png`;
      const outName2 = `${item.key}.png`;
      const outPath1 = path.join(OUT_DIR, outName1);
      const outPath2 = path.join(OUT_DIR, outName2);

      await page.screenshot({ path: outPath1, omitBackground: true, fullPage: false });

      // Post-procesar con Jimp para recortar ventanas de cámara respetando los nametags
      const img = await Jimp.read(outPath1);
      const inset = 6;
      for (const rect of camRects) {
        const x = Math.max(0, rect.x + inset);
        const y = Math.max(0, rect.y + inset);
        const w = Math.max(0, rect.w - inset * 2);
        const h = Math.max(0, rect.h - inset * 2);

        for (let py = y; py < y + h; py++) {
          if (py >= img.bitmap.height) continue;
          for (let px = x; px < x + w; px++) {
            if (px >= img.bitmap.width) continue;

            // Verificar si el pixel cae dentro de una zona protegida (nametag/badge/separador)
            let isProtected = false;
            for (const p of protectedRects) {
              if (px >= p.x && px < p.x + p.w && py >= p.y && py < p.y + p.h) {
                isProtected = true;
                break;
              }
            }

            if (!isProtected) {
              img.setPixelColor(0x00000000, px, py);
            }
          }
        }
      }

      await img.write(outPath1);
      await img.write(outPath2);

      console.log(`   ✅ Guardado: ${outName1} y ${outName2}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log('\n🎉 ¡Todas las capturas de hosts fueron generadas con éxito en hosts/!');
}

run().catch(err => {
  console.error('❌ Error capturando hosts:', err);
  process.exit(1);
});
