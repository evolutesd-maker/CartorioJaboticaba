// Utilitários de captura: gravam o site REAL (somente leitura) como sequência de quadros JPEG.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
export const { chromium } = require("playwright");
export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CLIPES = join(RAIZ, ".work", "clipes");
export const SITE = process.env.SITE || "http://localhost:8080/";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cursor e "clique" desenhados por cima da página (apenas na gravação; não altera o site).
const CURSOR_JS = `
(() => {
  const montar = () => {
    if (document.getElementById("__cur")) return;
    const st = document.createElement("style");
    st.textContent = \`
      #__cur{position:fixed;left:0;top:0;width:34px;height:34px;z-index:2147483647;pointer-events:none;
        transform:translate(-100px,-100px);filter:drop-shadow(0 3px 5px rgba(0,20,50,.45));will-change:transform}
      #__rip{position:fixed;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;z-index:2147483646;
        pointer-events:none;border:3px solid rgba(255,255,255,.95);background:rgba(0,120,215,.35);opacity:0}
      #__rip.go{animation:__rip .6s ease-out}
      @keyframes __rip{0%{opacity:1;transform:scale(.4)}100%{opacity:0;transform:scale(3.4)}}\`;
    document.documentElement.appendChild(st);
    const c = document.createElement("div"); c.id = "__cur";
    c.innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M4 2.5v17l4.6-4.1 3 6.6 3-1.4-3-6.5h6.4z" fill="#fff" stroke="#0b2a4a" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const r = document.createElement("div"); r.id = "__rip";
    document.documentElement.append(r, c);
    window.__mx = window.__mx ?? -100; window.__my = window.__my ?? -100;
    const pos = () => { c.style.transform = "translate(" + window.__mx + "px," + window.__my + "px)"; };
    pos();
    addEventListener("mousemove", (e) => { window.__mx = e.clientX; window.__my = e.clientY; pos(); }, true);
    addEventListener("mousedown", (e) => {
      r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
      r.classList.remove("go"); void r.offsetWidth; r.classList.add("go");
    }, true);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", montar); else montar();
})();`;

export async function abrir({ largura = 1920, altura = 1080, movel = false } = {}) {
  const browser = await chromium.launch({ args: ["--force-device-scale-factor=1", "--hide-scrollbars"] });
  const ctx = await browser.newContext({
    viewport: { width: largura, height: altura },
    deviceScaleFactor: movel ? 2 : 1,
    isMobile: movel, hasTouch: movel,
    bypassCSP: true, locale: "pt-BR", timezoneId: "America/Sao_Paulo",
  });
  await ctx.addInitScript(movel ? "" : CURSOR_JS);
  const page = await ctx.newPage();
  return { browser, ctx, page };
}

// Gravação por screencast (CDP): salva cada quadro com seu carimbo de tempo e depois
// reamostra para 30 fps constantes (quadros repetidos onde nada mudou).
export async function gravar(page, nome, fn, { fps = 30, qualidade = 94, largura = 1920, altura = 1080 } = {}) {
  const dir = join(CLIPES, nome);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "raw"), { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const quadros = [];
  let n = 0;
  cdp.on("Page.screencastFrame", async (f) => {
    const i = n++;
    writeFileSync(join(dir, "raw", String(i).padStart(5, "0") + ".jpg"), Buffer.from(f.data, "base64"));
    quadros.push({ i, t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: qualidade, maxWidth: largura, maxHeight: altura, everyNthFrame: 1 });
  await sleep(250);
  const t0 = Date.now();
  await fn();
  await sleep(300);
  const dur = (Date.now() - t0) / 1000;
  await cdp.send("Page.stopScreencast");
  await sleep(200);
  await cdp.detach();
  if (!quadros.length) throw new Error("sem quadros");
  // concat com durações reais
  const ini = quadros[0].t;
  const fim = quadros[quadros.length - 1].t + 0.05;
  let lista = "";
  quadros.forEach((q, k) => {
    const prox = k + 1 < quadros.length ? quadros[k + 1].t : fim;
    lista += `file 'raw/${String(q.i).padStart(5, "0")}.jpg'\nduration ${Math.max(0.001, prox - q.t).toFixed(4)}\n`;
  });
  lista += `file 'raw/${String(quadros[quadros.length - 1].i).padStart(5, "0")}.jpg'\n`;
  writeFileSync(join(dir, "lista.txt"), lista);
  mkdirSync(join(dir, "f"), { recursive: true });
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(dir, "lista.txt"),
    "-vf", `fps=${fps}`, "-q:v", "2", "-start_number", "0", join(dir, "f", "%05d.jpg")]);
  rmSync(join(dir, "raw"), { recursive: true, force: true });
  const total = readdirSync(join(dir, "f")).length;
  const real = fim - ini;
  console.log(`${nome}: ${quadros.length} quadros brutos (${(quadros.length / real).toFixed(1)}/s) -> ${total} quadros a ${fps} fps (${(total / fps).toFixed(1)} s; cena ${dur.toFixed(1)} s)`);
  writeFileSync(join(dir, "info.json"), JSON.stringify({ quadros: total, fps, bruto: quadros.length }));
  return total;
}

// ---- Gestos humanos ---------------------------------------------------------
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const pos = { x: 960, y: 1200 };
export async function deslizar(page, x, y, ms = 800) {
  const { x: x0, y: y0 } = pos;
  const ini = Date.now();
  // pequena curva para parecer humano
  const cx = (x0 + x) / 2 + (y - y0) * 0.08, cy = (y0 + y) / 2 - (x - x0) * 0.05;
  for (;;) {
    const t = Math.min(1, (Date.now() - ini) / ms);
    const e = ease(t);
    const px = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * x;
    const py = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * y;
    await page.mouse.move(px, py);
    if (t >= 1) break;
    await sleep(8);
  }
  pos.x = x; pos.y = y;
}
export async function centro(page, seletor, dx = 0, dy = 0) {
  const loc = page.locator(seletor).first();
  const b = await loc.boundingBox();
  if (!b) throw new Error("sem caixa: " + seletor);
  return { x: b.x + b.width / 2 + dx, y: b.y + b.height / 2 + dy, b };
}
export async function irPara(page, seletor, ms = 800, dx = 0, dy = 0) {
  const p = await centro(page, seletor, dx, dy);
  await deslizar(page, p.x, p.y, ms);
  return p;
}
export async function clicar(page, seletor, ms = 800, dx = 0, dy = 0) {
  await irPara(page, seletor, ms, dx, dy);
  await sleep(120);
  await page.mouse.down(); await sleep(70); await page.mouse.up();
}
export async function digitar(page, texto, atraso = 85) {
  for (const ch of texto) { await page.keyboard.type(ch); await sleep(atraso + Math.random() * 45); }
}
// Rolagem suave com easing (própria, não depende do CSS do site)
export async function rolar(page, para, ms = 1400) {
  await page.evaluate(([alvo, dur]) => new Promise((res) => {
    const ini = performance.now(), y0 = scrollY;
    const alvoY = typeof alvo === "number" ? alvo : Math.max(0, document.querySelector(alvo).getBoundingClientRect().top + scrollY - 140);
    const e = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const passo = (agora) => {
      const t = Math.min(1, (agora - ini) / dur);
      scrollTo({ top: y0 + (alvoY - y0) * e(t), behavior: "instant" });
      t < 1 ? requestAnimationFrame(passo) : res();
    };
    requestAnimationFrame(passo);
  }), [para, ms]);
}
