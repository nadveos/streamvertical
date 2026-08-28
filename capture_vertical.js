const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    
    const url = 'http://127.0.0.1:8000/frames/vertical/overlay-solo-vertical.html';
    console.log('Loading: ' + url);
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Extra delay
    await new Promise(r => setTimeout(r, 1000));
    
    const outPath = 'C:/web-projects/overlays/frames/hosts/overlay-solo-vertical.png';
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
