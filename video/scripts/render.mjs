// Renderiza o palco quadro a quadro (paralelo) e codifica o MP4.  Uso: node scripts/render.mjs [inicio fim] [--prev N]
import { chromium, RAIZ } from "./lib.mjs";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { mkdirSync, rmSync } from "node:fs";

const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".json": "application/json", ".woff2": "font/woff2" };
const srv = createServer(async (q, r) => {
  try { const p = join(RAIZ, decodeURIComponent(new URL(q.url, "http://x").pathname)); const d = await readFile(p); r.writeHead(200, { "Content-Type": TIPOS[extname(p)] || "application/octet-stream" }); r.end(d); }
  catch { r.writeHead(404); r.end(); }
}).listen(8090);

const args = process.argv.slice(2);
const so = args.includes("--so");
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const outDir = join(RAIZ, ".work", "quadros");
const browser = await chromium.launch({ args: ["--hide-scrollbars", "--force-device-scale-factor=1"] });
const abrirPagina = async () => { const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } }); await p.goto("http://localhost:8090/stage/index.html"); await p.waitForFunction("window.__pronto === true", null, { timeout: 60000 }); return p; };
const p0 = await abrirPagina();
const total = await p0.evaluate(() => window.TOTAL_FRAMES);
console.log("total de quadros:", total, "=", (total / 30).toFixed(1), "s");
if (args.includes("--info")) { console.log(await p0.evaluate(() => 0)); await browser.close(); srv.close(); process.exit(0); }
const lista = nums.length === 1 ? [nums[0]] : null;
const ini = nums.length >= 2 ? nums[0] : 0, fim = nums.length >= 2 ? nums[1] : total - 1;
if (!lista && !args.includes("--manter")) { rmSync(outDir, { recursive: true, force: true }); }
mkdirSync(outDir, { recursive: true });
const frames = lista || Array.from({ length: fim - ini + 1 }, (_, i) => ini + i);
const NW = Number(process.env.NW || 4);
const pages = [p0]; for (let i = 1; i < NW; i++) pages.push(await abrirPagina());
let feitos = 0; const t0 = Date.now();
await Promise.all(pages.map(async (p, w) => {
  for (let k = w; k < frames.length; k += NW) {
    const f = frames[k];
    await p.evaluate((f) => window.renderFrame(f), f);
    await p.screenshot({ path: join(outDir, String(f).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 95 });
    if (++feitos % 100 === 0) console.log(`${feitos}/${frames.length}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}));
await browser.close(); srv.close();
console.log("quadros prontos:", feitos);
