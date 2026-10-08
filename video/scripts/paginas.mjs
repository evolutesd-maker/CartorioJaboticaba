// Fotografa as páginas reais (somente leitura) para a cena de "camadas": abas e seções da página inicial.
import { abrir, SITE, sleep, rolar, RAIZ } from "./lib.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = join(RAIZ, ".work", "img"); mkdirSync(out, { recursive: true });
const { browser, page } = await abrir();
// sem o cursor falso nestas imagens
await page.addStyleTag({ content: "" }).catch(() => {});
const abas = { inicio: "", servicos: "servicos.html", documentos: "documentos.html", contato: "contato.html" };
for (const [n, u] of Object.entries(abas)) {
  await page.goto(SITE + u); await sleep(1600);
  await page.evaluate(() => { document.getElementById("__cur")?.remove(); document.getElementById("__rip")?.remove(); });
  await page.screenshot({ path: join(out, `aba-${n}.png`) });
}
// Página inicial inteira, seção por seção
await page.goto(SITE); await sleep(1200);
const alt = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < alt; y += 500) { await rolar(page, y, 350); await sleep(120); }
await sleep(1600);
await rolar(page, 0, 300); await sleep(900);
await page.evaluate(() => { document.getElementById("__cur")?.remove(); document.querySelector(".topo-voltar")?.setAttribute("hidden", ""); document.querySelector(".fab-whats")?.setAttribute("hidden", ""); });
const secoes = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const r = (el) => { const b = el.getBoundingClientRect(); return { y: Math.round(b.top + scrollY), h: Math.round(b.height) }; };
  const itens = [
    ["aviso", q(".aviso-rascunho")], ["topo", q(".topo")], ["hero", q(".hero")], ["busca", q(".painel-flutuante")],
    ["servicos", q("#servicos")], ["antes", q("#antes-de-vir")], ["atend", q("#atendimento")], ["funil", q("#falar")], ["rodape", q("footer")],
  ];
  return itens.filter(([, el]) => el).map(([id, el]) => ({ id, ...r(el) }));
});
console.log(JSON.stringify(secoes), alt);
writeFileSync(join(out, "secoes.json"), JSON.stringify({ altura: alt, secoes }));
await page.screenshot({ path: join(out, "home-inteira.png"), fullPage: true });
await browser.close();
