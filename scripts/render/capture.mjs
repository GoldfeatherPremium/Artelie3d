/**
 * Batch render capture. Usage:
 *   node scripts/render/capture.mjs scripts/render/jobs/batch-01.json
 *
 * Opens each job URL in headless Chromium, waits for the scene to declare
 * readiness, screenshots the canvas at deviceScaleFactor = dpr, then encodes
 * the result with sharp to WebP at outWidth.
 */
import puppeteer from "puppeteer";
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const here = dirname(fileURLToPath(import.meta.url));
const jobsFile = process.argv[2];
if (!jobsFile) {
  console.error("usage: node capture.mjs <jobs.json>");
  process.exit(1);
}
const jobs = JSON.parse(readFileSync(join(here, jobsFile), "utf8"));

const browser = await puppeteer.launch({
  headless: "shell",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--use-gl=angle",
    "--use-angle=swiftshader",
  ],
});

let failed = 0;
for (const job of jobs) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: job.width, height: job.height, deviceScaleFactor: job.dpr });
    await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => window.__RENDER_READY__ === true, { timeout: 45000 });
    await new Promise((r) => setTimeout(r, 350));
    const png = `/tmp/render-${job.type}-${job.slug}-${job.view ?? "x"}.png`;
    await page.screenshot({ path: png, type: "png" });
    const outPath = join(here, "..", "..", job.out);
    mkdirSync(dirname(outPath), { recursive: true });
    await sharp(png)
      .resize({ width: job.outWidth, withoutEnlargement: false })
      .webp({ quality: 82, effort: 4 })
      .toFile(outPath);
    console.log(`ok ${job.type} ${job.slug} ${job.view ?? ""} -> ${job.out}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${job.type} ${job.slug} ${job.view ?? ""}: ${err.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log(`done: ${jobs.length - failed}/${jobs.length} ok`);
process.exit(failed > 0 ? 1 : 0);
