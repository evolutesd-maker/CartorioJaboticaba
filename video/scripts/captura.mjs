// Grava, no site REAL (servido somente para leitura), as cenas usadas no vídeo, em 1366x768.
// Além dos quadros, guarda os instantes (eventos) e a posição real de cada elemento (trilhas),
// para que os destaques do vídeo acompanhem exatamente o que está na tela.
// Uso: node scripts/captura.mjs [cena ...]   (sem argumentos grava todas)
import { abrir, gravar, SITE, sleep, deslizar, irPara, clicar, digitar, rolar, pos } from "./lib.mjs";


// O pop-up nativo de um <select> não é capturado pela gravação de tela. Para mostrar a lista de opções
// (especialidades e serviços), desenhamos, só durante a filmagem, uma réplica visual das opções reais.
async function escolherNaLista(page, m, seguir, nome, sel, indice) {
  m(nome);
  await irPara(page, sel, 800);
  await sleep(250);
  await page.evaluate((sl) => {
    const s = document.querySelector(sl), r = s.getBoundingClientRect();
    const d = document.createElement("div"); d.id = "__dd";
    d.style.cssText = `position:fixed;left:${r.left}px;width:${r.width}px;background:#fff;border:1px solid #8fb0d3;border-radius:12px;box-shadow:0 16px 38px rgba(0,30,60,.4);z-index:2147483645;font:500 17px/1.3 "Plus Jakarta Sans",system-ui,sans-serif;color:#14202b;padding:6px;opacity:0;transition:opacity .18s`;
    [...s.options].forEach((o, i) => { if (!o.value) return; const it = document.createElement("div"); it.textContent = o.textContent; it.dataset.i = i; it.style.cssText = "padding:11px 14px;border-radius:8px"; d.appendChild(it); });
    document.body.appendChild(d);
    const h = d.offsetHeight; d.style.top = (r.bottom + 6 + h > 752 ? Math.max(8, r.top - 6 - h) : r.bottom + 6) + "px";
    requestAnimationFrame(() => (d.style.opacity = 1));
  }, sel);
  const parar = seguir("dd", "#__dd");
  m(nome + "-lista");
  await sleep(700);
  const rects = await page.evaluate(() => [...document.querySelectorAll("#__dd div")].map((e) => { const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }));
  const alvo = Math.min(indice, rects.length - 1);
  for (let k = 0; k <= alvo; k++) {
    await deslizar(page, rects[k][0] - 40, rects[k][1], k === 0 ? 600 : 380);
    await page.evaluate((k) => { document.querySelectorAll("#__dd div").forEach((e, i) => { e.style.background = i === k ? "#0078d7" : ""; e.style.color = i === k ? "#fff" : ""; }); }, k);
    await sleep(k === alvo ? 700 : 120);
  }
  await page.mouse.down(); await sleep(70); await page.mouse.up();
  await page.evaluate(() => document.getElementById("__dd")?.remove());
  parar();
  m(nome + "-ok");
}

const rolarPara = async (page, y) => { await rolar(page, y, 0.01); await sleep(250); };

const cenas = {
  async hero({ page }) {
    await page.goto(SITE); await sleep(300);
    await gravar(page, "hero", async (m, seguir) => {
      seguir("foto", ".hero__foto"); seguir("selo", ".flutuante--b"); seguir("btn1", ".hero__acoes .btn--claro");
      seguir("btn2", ".hero__acoes .btn--vidro"); seguir("buscar", ".busca-btn"); seguir("menu", ".menu ul");
      await sleep(1600);
      m("foto-ini");
      await irPara(page, ".hero__foto", 900, -60, 20);
      await deslizar(page, pos.x + 150, pos.y - 90, 1100);
      await deslizar(page, pos.x - 120, pos.y + 110, 1200);
      await deslizar(page, pos.x + 60, pos.y - 40, 900);
      m("foto-fim");
      await irPara(page, ".flutuante--b", 900); m("selo-ini"); await sleep(1100); m("selo-fim");
      await irPara(page, ".hero__acoes .btn--claro", 1000); m("btn-ini"); await sleep(900);
      await irPara(page, ".hero__acoes .btn--vidro", 700, 25, 4); await sleep(900); m("btn-fim");
      await irPara(page, ".busca-btn", 900); m("buscar-ini"); await sleep(1200); m("buscar-fim");
    });
  },

  async busca({ page }) {
    await page.goto(SITE); await sleep(1200);
    await rolarPara(page, 330);
    await gravar(page, "busca", async (m, seguir) => {
      seguir("campo", ".busca__campo"); seguir("lista", "[data-busca-painel]");
      await sleep(800);
      await clicar(page, "[data-busca-input]", 1000);
      await sleep(300);
      m("digita1");
      await digitar(page, "preciso de uma certidão", 80);
      m("lista1");
      await sleep(1500);
      await page.keyboard.press("ArrowDown"); await sleep(500);
      await page.keyboard.press("ArrowDown"); await sleep(900);
      m("teclas");
      await page.locator("[data-busca-input]").fill("");
      await page.locator("[data-busca-input]").focus();
      await sleep(400);
      m("digita2");
      await digitar(page, "quero casar", 90);
      await sleep(2300);
      m("fim");
    });
  },

  async paleta({ page }) {
    await page.goto(SITE); await sleep(1500);
    await gravar(page, "paleta", async (m, seguir) => {
      seguir("caixa", ".paleta__caixa"); seguir("buscar", ".busca-btn");
      await sleep(1200);
      await irPara(page, ".busca-btn", 1000); m("btn"); await sleep(700);
      await page.mouse.down(); await sleep(70); await page.mouse.up();
      m("abre"); await sleep(1300);
      await digitar(page, "procuração", 85);
      m("lista"); await sleep(1500);
      await page.keyboard.press("ArrowDown"); await sleep(600);
      await page.keyboard.press("ArrowDown"); await sleep(900);
      m("teclas");
      await page.keyboard.press("Escape"); await sleep(900);
      m("atalho");
      await page.keyboard.press("/"); await sleep(1200);
      await digitar(page, "casar", 90); await sleep(1100);
      m("enter");
      await page.keyboard.press("Enter");
      await sleep(3200);
      m("fim");
    });
  },

  async carrossel({ page }) {
    await page.goto(SITE); await sleep(1200);
    await rolarPara(page, 480);
    await gravar(page, "carrossel", async (m, seguir) => {
      seguir("prev", "[data-car-prev]"); seguir("next", "[data-car-next]"); seguir("pista", ".carrossel__pista");
      await sleep(700);
      await irPara(page, ".carrossel__item:nth-child(2) .cr-card", 1100, -40, -30);
      m("tilt-ini");
      await deslizar(page, pos.x + 80, pos.y + 40, 1000);
      await deslizar(page, pos.x - 60, pos.y + 10, 800);
      m("tilt-fim");
      m("seta1");
      await clicar(page, "[data-car-next]", 1000);
      await sleep(1300);
      await clicar(page, "[data-car-next]", 700);
      m("seta2");
      await sleep(1500);
      m("arrasta-ini");
      await irPara(page, ".carrossel__item:nth-child(5) .cr-card", 900, 20, -20);
      await page.mouse.down(); await sleep(80);
      await deslizar(page, pos.x - 260, pos.y + 4, 900);
      await page.mouse.up(); await sleep(600);
      m("arrasta-fim");
      await clicar(page, "[data-car-prev]", 900);
      m("prev");
      await sleep(1500);
    });
  },

  async especialidades({ page }) {
    await page.goto(SITE); await sleep(1200);
    await rolarPara(page, 520);
    await gravar(page, "especialidades", async (m, seguir) => {
      seguir("grade", ".esp-grade"); seguir("c1", ".esp-card:nth-child(1)"); seguir("c2", ".esp-card:nth-child(2)"); seguir("c3", ".esp-card:nth-child(3)");
      await deslizar(page, 1000, 500, 600);
      m("rola");
      await rolar(page, "#servicos", 2200);
      await sleep(1400);
      m("c1");
      await irPara(page, ".esp-card:nth-child(1)", 1000, -40, -30);
      await deslizar(page, pos.x + 100, pos.y + 60, 1100);
      await deslizar(page, pos.x - 80, pos.y - 30, 900);
      m("c2");
      await irPara(page, ".esp-card:nth-child(2)", 1000, 50, 20);
      await deslizar(page, pos.x - 100, pos.y + 60, 1100);
      await deslizar(page, pos.x + 50, pos.y - 40, 900);
      m("c3");
      await irPara(page, ".esp-card:nth-child(3)", 1000, -40, 40);
      await deslizar(page, pos.x + 100, pos.y - 50, 1100);
      await sleep(900);
      m("fim");
    });
  },

  async abas({ page }) {
    await page.goto(SITE); await sleep(1500);
    await gravar(page, "abas", async (m, seguir) => {
      seguir("menu", ".menu ul"); seguir("aberto", ".cartao-info [data-expediente], [data-expediente]");
      seguir("rota", ".atend__acoes a:nth-child(1)"); seguir("ligar", ".atend__acoes a:nth-child(2)"); seguir("zap", ".atend__acoes a:nth-child(3)"); seguir("btns", ".atend__acoes");
      await sleep(900);
      m("servicos");
      await clicar(page, '.menu a[href="servicos.html"]', 1100);
      await sleep(2300);
      await rolar(page, 560, 1600);
      await sleep(900);
      await rolar(page, 0, 1100);
      m("documentos");
      await clicar(page, '.menu a[href="documentos.html"]', 1000);
      await sleep(2300);
      await rolar(page, 520, 1500);
      await sleep(900);
      await rolar(page, 0, 1000);
      m("contato");
      await clicar(page, '.menu a[href="contato.html"]', 1000);
      await sleep(2300);
      m("contato-ok");
      await rolar(page, 440, 1400);
      await sleep(900);
      m("btns");
      await irPara(page, ".atend__acoes a:nth-child(1)", 900); m("rota"); await sleep(900);
      await irPara(page, ".atend__acoes a:nth-child(2)", 700); m("ligar"); await sleep(900);
      await irPara(page, ".atend__acoes a:nth-child(3)", 700); m("zap"); await sleep(1100);
      m("fim");
    });
  },

  async servico({ page }) {
    await page.goto(SITE); await sleep(1200);
    await rolarPara(page, 480);
    await gravar(page, "servico", async (m, seguir) => {
      seguir("progresso", "[data-progresso-texto]"); seguir("barra", ".progresso, [data-progresso-barra]"); seguir("lista", ".checklist");
      await sleep(600);
      await clicar(page, ".carrossel__item:nth-child(3) .cr-card", 1100);
      m("clicou");
      await sleep(2800);
      await deslizar(page, 900, 600, 700);
      await rolar(page, "#documentos", 1700);
      await sleep(900);
      m("marca-ini");
      const n = await page.locator('.checklist input[type="checkbox"]').count();
      for (let i = 0; i < n; i++) {
        const lb = page.locator(".checklist li").nth(i);
        const b = await lb.boundingBox();
        if (b && (b.y > 620 || b.y < 120)) { await rolar(page, (await page.evaluate(() => scrollY)) + (b.y > 620 ? b.y - 360 : b.y - 300), 900); }
        const bb = await lb.boundingBox();
        await deslizar(page, bb.x + 36, bb.y + bb.height / 2, 600);
        await page.mouse.down(); await sleep(60); await page.mouse.up();
        await sleep(i < 2 ? 700 : 380);
      }
      m("marca-fim");
      await rolar(page, "[data-progresso-texto]", 900);
      await sleep(1900);
      m("pronto");
      await rolar(page, "#como-funciona", 1700);
      m("como");
      await sleep(1700);
      await rolar(page, "#prazo-custo", 1500);
      m("prazo");
      await sleep(1500);
    });
  },

  async funil({ page }) {
    await page.goto(SITE); await sleep(1200);
    await rolarPara(page, 2300);
    await gravar(page, "funil", async (m, seguir) => {
      seguir("form", ".funil__form"); seguir("nome", "[data-f-nome]"); seguir("esp", "[data-f-esp]"); seguir("ato", "[data-f-ato]");
      seguir("msg", "[data-f-msg]"); seguir("canais", ".funil__canais"); seguir("copiar", "[data-f-copiar]"); seguir("whats", "[data-f-whats]");
      seguir("mail", "[data-f-email]"); seguir("aviso", ".aviso"); seguir("topo", ".topo-voltar");
      await sleep(400);
      await rolar(page, await page.evaluate(() => document.querySelector("[data-funil]").getBoundingClientRect().top + scrollY - 110), 1900);
      await sleep(1300);
      m("nome");
      await clicar(page, "[data-f-nome]", 1000);
      await sleep(250);
      await digitar(page, "Maria da Silva", 95);
      await sleep(600);
      await escolherNaLista(page, m, seguir, "esp", "[data-f-esp]", 0);
      await page.locator("[data-f-esp]").selectOption({ label: "Notas" });
      await sleep(900);
      await escolherNaLista(page, m, seguir, "ato", "[data-f-ato]", 1);
      await page.locator("[data-f-ato]").selectOption({ index: 2 });
      m("msg");
      await sleep(1700);
      m("copiar-ini");
      await clicar(page, "[data-f-copiar]", 1000);
      await sleep(1800);
      m("copiar-fim");
      m("canais-ini");
      await irPara(page, "[data-f-whats]", 900);
      await sleep(1100);
      await irPara(page, "[data-f-email]", 700);
      await sleep(1000);
      m("canais-fim");
      await irPara(page, ".topo-voltar", 1100);
      m("topo");
      await sleep(200);
      await page.mouse.down(); await sleep(70); await page.mouse.up();
      await sleep(2600);
      m("fim");
    });
  },
};

const pedidas = process.argv.slice(2);
const { browser, page } = await abrir();
for (const [nome, fn] of Object.entries(cenas)) {
  if (pedidas.length && !pedidas.includes(nome)) continue;
  pos.x = 700; pos.y = 900;
  await page.evaluate(() => { window.__mx = -100; window.__my = -100; }).catch(() => {});
  await fn({ page });
}
await browser.close();

if (!pedidas.length || pedidas.includes("celular")) {
  const m = await abrir({ largura: 390, altura: 844, movel: true });
  const p = m.page;
  await p.goto(SITE); await sleep(1500);
  await gravar(p, "celular", async () => {
    await sleep(1200);
    await p.tap(".menu-btn"); await sleep(1800);
    await p.tap(".menu-btn"); await sleep(700);
    await rolar(p, 600, 1700); await sleep(500);
    await rolar(p, 1500, 1900); await sleep(500);
    await rolar(p, 0, 1700); await sleep(700);
  }, { largura: 780, altura: 1688 });
  await m.browser.close();
}
