const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    const url = 'http://127.0.0.1:8000/frames/overlay-solo.html';
    console.log('Loading: ' + url);
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Give it an extra second just in case there are animations or dynamic injections
    await new Promise(r => setTimeout(r, 1000));
    
    const outPath = 'C:/web-projects/overlays/frames/hosts/overlay-solo.png';
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
