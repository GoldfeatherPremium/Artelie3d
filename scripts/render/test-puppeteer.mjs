import puppeteer from 'puppeteer';

const port = process.env.PORT || '8123';
const url = `http://localhost:${port}/scripts/render/test-webgl.html`;

const browser = await puppeteer.launch({
  headless: 'shell',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 400, height: 400 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__TEST_RESULT__?.rendered === true, { timeout: 30000 });
const result = await page.evaluate(() => window.__TEST_RESULT__);
await page.screenshot({ path: '/tmp/test-webgl.png' });
console.log(JSON.stringify(result));
await browser.close();
