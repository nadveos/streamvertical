const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, 'hosts');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

const files = [
  'vv-hosts.html',
  'ov-hosts-row.html'
];

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  for (const file of files) {
    const isVv = file.startsWith('vv');
    const width = isVv ? 1080 : 1920;
    const height = isVv ? 1920 : 1080;
    
    await page.setViewport({ width, height });
    
    const fileUrl = `http://127.0.0.1:8000/frames/vertical/${file}`;
    console.log(`Processing ${fileUrl} at ${width}x${height}`);
    try {
      await page.goto(fileUrl, { waitUntil: 'networkidle0' });
      await page.screenshot({
        path: path.join(outDir, file.replace('.html', '.png')),
        omitBackground: true // Transparent background
      });
      console.log(`Saved ${file.replace('.html', '.png')}`);
    } catch (e) {
      console.error(`Error on ${file}:`, e);
    }
  }
  
  await browser.close();
})();
