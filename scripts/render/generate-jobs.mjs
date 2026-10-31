/**
 * Generate render job batches from catalog.json. Each batch is a JSON file
 * consumed by capture.mjs. Batches are sized so each capture run stays well
 * under the sandbox time limit when run with concurrent pages.
 */
import { readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(here, "catalog.json"), "utf8"));

const VIEWS = ["hero", "front", "side", "detail", "lifestyle"];
const DPR = 1.5;

const jobs = [];

for (const p of catalog.products) {
  for (const view of VIEWS) {
    jobs.push({
      type: "product",
      slug: p.slug,
      kind: p.kind,
      view,
      url: `http://localhost:8123/scripts/render/scene.html?mode=product&kind=${encodeURIComponent(p.kind)}&view=${view}`,
      width: 800,
      height: 1000,
      dpr: DPR,
      outWidth: 1200,
      out: `public/assets/products/${p.slug}/${view}.webp`,
    });
  }
}

for (const c of catalog.categories) {
  jobs.push({
    type: "category",
    slug: c.slug,
    url: `http://localhost:8123/scripts/render/scene.html?mode=category&kind=${encodeURIComponent(c.kind)}`,
    width: 800,
    height: 600,
    dpr: DPR,
    outWidth: 1200,
    out: `public/assets/categories/${c.slug}.webp`,
  });
}

for (const c of catalog.collections) {
  jobs.push({
    type: "collection",
    slug: c.slug,
    url: `http://localhost:8123/scripts/render/scene.html?mode=collection&kind=${encodeURIComponent(c.kind)}`,
    width: 960,
    height: 540,
    dpr: DPR,
    outWidth: 1920,
    out: `public/assets/collections/${c.slug}.webp`,
  });
}

for (const id of catalog.interiors) {
  jobs.push({
    type: "interior",
    slug: id,
    url: `http://localhost:8123/scripts/render/scene.html?mode=interior&id=${encodeURIComponent(id)}`,
    width: 800,
    height: 533,
    dpr: DPR,
    outWidth: 1600,
    out: `public/assets/interiors/${id}.webp`,
  });
}

const jobsDir = join(here, "jobs");
rmSync(jobsDir, { recursive: true, force: true });
mkdirSync(jobsDir, { recursive: true });

const PRODUCTS_PER_BATCH = 20;
const productJobs = jobs.filter((j) => j.type === "product");
const otherJobs = jobs.filter((j) => j.type !== "product");

let batch = 0;
const writeBatch = (list) => {
  if (list.length === 0) return;
  batch += 1;
  writeFileSync(join(jobsDir, `batch-${String(batch).padStart(2, "0")}.json`), JSON.stringify(list, null, 2));
};

for (let i = 0; i < productJobs.length; i += PRODUCTS_PER_BATCH) {
  writeBatch(productJobs.slice(i, i + PRODUCTS_PER_BATCH));
}
writeBatch(otherJobs);

console.log(`generated ${batch} batches, ${jobs.length} total jobs`);
