const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

async function renderKickBanners() {
  const renderDir = path.join(__dirname, 'render');
  if (!fs.existsSync(renderDir)) {
    fs.mkdirSync(renderDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Render 1200x134 (Exact 1:1 scale)
    const page1 = await browser.newPage();
    await page1.setViewportSize({ width: 1200, height: 134 });
    const htmlPath = 'file:///' + path.join(__dirname, 'banner-kick.html').replace(/\\/g, '/');
    await page1.goto(htmlPath, { waitUntil: 'networkidle' });
    await page1.waitForTimeout(500);

    const out1200 = path.join(renderDir, 'banner_kick_1200x134.png');
    await page1.screenshot({ path: out1200, fullPage: true });

    // 2. Render 2400x268 (2x Ultra High Res for Retina & Kick Uploader)
    const page2 = await browser.newPage({ deviceScaleFactor: 2 });
    await page2.setViewportSize({ width: 1200, height: 134 });
    await page2.goto(htmlPath, { waitUntil: 'networkidle' });
    await page2.waitForTimeout(500);

    const out2400 = path.join(renderDir, 'banner_kick_2400x268.png');
    await page2.screenshot({ path: out2400, fullPage: true });

    // 3. Render 1200x480 (Kick Offline / Profile Banner)
    const page3 = await browser.newPage();
    await page3.setViewportSize({ width: 1200, height: 480 });
    const bannersPath = 'file:///' + path.join(__dirname, 'banners.html').replace(/\\/g, '/');
    await page3.goto(bannersPath, { waitUntil: 'networkidle' });
    await page3.waitForTimeout(500);

    const tkFrame = await page3.$('.tk-frame');
    const out1200x480 = path.join(renderDir, 'banner_kick_offline_1200x480.png');
    if (tkFrame) {
      await tkFrame.screenshot({ path: out1200x480 });
      console.log('✅ Banner Kick Offline 1200x480 guardado en:', out1200x480);
    }

    console.log('✅ Banner Kick 1200x134 guardado en:', out1200);
    console.log('✅ Banner Kick 2400x268 guardado en:', out2400);

    // Verify dimensions
    const b1 = fs.readFileSync(out1200);
    console.log(`Dimensions out1200: ${b1.readUInt32BE(16)} x ${b1.readUInt32BE(20)} px`);

    const b2 = fs.readFileSync(out2400);
    console.log(`Dimensions out2400: ${b2.readUInt32BE(16)} x ${b2.readUInt32BE(20)} px`);

  } finally {
    await browser.close();
  }
}

renderKickBanners().catch(err => {
  console.error('Error rendering Kick banners:', err);
  process.exit(1);
});
