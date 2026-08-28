const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    const fileUrl = 'file:///' + path.resolve('frames/overlay-solo.html').replace(/\\/g, '/');
    console.log('Loading: ' + fileUrl);
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    
    const outPath = path.resolve('frames/hosts/overlay-solo.png');
    await page.screenshot({ 
      path: outPath,
      omitBackground: true
    });
    console.log('Saved screenshot to: ' + outPath);
    await browser.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
