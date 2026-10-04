// Grava, no site REAL (servido a partir de docs/, sem modificar nada), as cenas usadas no vídeo.
// Uso: node scripts/captura.mjs [cena ...]   (sem argumentos grava todas)
import { abrir, gravar, SITE, sleep, deslizar, irPara, clicar, digitar, rolar, centro, pos } from "./lib.mjs";

const cenas = {
  // 1) Abertura da página inicial: foto reage ao mouse, botões "puxam" o cursor
  async hero({ page }) {
    await page.goto(SITE); await sleep(300);
    await gravar(page, "hero", async () => {
      await sleep(1500);
      await deslizar(page, 1250, 700, 700);
      await irPara(page, ".hero__foto", 900);
      await deslizar(page, 1480, 330, 1100);
      await deslizar(page, 1100, 470, 1300);
      await deslizar(page, 1300, 300, 1000);
      await sleep(250);
      await irPara(page, ".hero__acoes .btn--claro", 1000);
      await sleep(900);
      await irPara(page, ".hero__acoes .btn--vidro", 800, 30, 4);
      await sleep(1000);
    });
  },

  // 2) Busca com sugestões
  async busca({ page }) {
    await page.goto(SITE); await sleep(1200);
    await rolar(page, 330, 0.01);
    await sleep(300);
    await gravar(page, "busca", async () => {
      await sleep(800);
      await clicar(page, "[data-busca-input]", 1000);
      await sleep(300);
      await digitar(page, "preciso de uma certidão", 80);
      await sleep(1500);
      await deslizar(page, 760, 905, 900);
      await sleep(500);
      await deslizar(page, 760, 975, 700);
      await sleep(1100);
      await page.locator("[data-busca-input]").fill("");
      await page.locator("[data-busca-input]").focus();
      await sleep(400);
      await digitar(page, "quero casar", 90);
      await sleep(2300);
    });
  },

  // 3) Carrossel "Mais procurados"
  async carrossel({ page }) {
    await page.goto(SITE); await sleep(1200);
    await rolar(page, 480, 0.01);
    await sleep(300);
    await gravar(page, "carrossel", async () => {
      await sleep(700);
      await irPara(page, ".carrossel__item:nth-child(2) .cr-card", 1100, -40, -30);
      await deslizar(page, pos.x + 80, pos.y + 40, 1000);
      await deslizar(page, pos.x - 60, pos.y + 10, 800);
      await clicar(page, "[data-car-next]", 1000);
      await sleep(1300);
      await clicar(page, "[data-car-next]", 700);
      await sleep(1500);
      await irPara(page, ".carrossel__item:nth-child(5) .cr-card", 900, 20, -20);
      await deslizar(page, pos.x + 100, pos.y + 30, 1000);
      await sleep(500);
      await clicar(page, "[data-car-prev]", 900);
      await sleep(1500);
    });
  },

  // 4) Rolagem com revelar-ao-rolar + cartões das especialidades inclinando em 3D
  async especialidades({ page }) {
    await page.goto(SITE); await sleep(1200);
    await rolar(page, 520, 0.01);
    await sleep(300);
    await gravar(page, "especialidades", async () => {
      await deslizar(page, 1500, 600, 600);
      await rolar(page, "#servicos", 2200);
      await sleep(1400);
      await irPara(page, ".esp-card:nth-child(1)", 1000, -40, -30);
      await deslizar(page, pos.x + 120, pos.y + 70, 1100);
      await deslizar(page, pos.x - 90, pos.y - 30, 900);
      await irPara(page, ".esp-card:nth-child(2)", 1000, 60, 20);
      await deslizar(page, pos.x - 120, pos.y + 70, 1100);
      await deslizar(page, pos.x + 60, pos.y - 40, 900);
      await irPara(page, ".esp-card:nth-child(3)", 1000, -50, 40);
      await deslizar(page, pos.x + 120, pos.y - 50, 1100);
      await sleep(900);
    });
  },

  // 5) As abas do menu e a transição entre páginas
  async abas({ page }) {
    await page.goto(SITE); await sleep(1500);
    await gravar(page, "abas", async () => {
      await sleep(900);
      await clicar(page, '.menu a[href="servicos.html"]', 1100);
      await sleep(2300);
      await rolar(page, 560, 1600);
      await sleep(900);
      await rolar(page, 0, 1100);
      await clicar(page, '.menu a[href="documentos.html"]', 1000);
      await sleep(2300);
      await rolar(page, 520, 1500);
      await sleep(900);
      await rolar(page, 0, 1000);
      await clicar(page, '.menu a[href="contato.html"]', 1000);
      await sleep(2300);
      await rolar(page, 300, 1400);
      await sleep(1000);
    });
  },

  // 6) Página de um serviço: do carrossel até a lista de documentos "marcável"
  async servico({ page }) {
    await page.goto(SITE); await sleep(1200);
    await rolar(page, 480, 0.01);
    await sleep(300);
    await gravar(page, "servico", async () => {
      await sleep(600);
      await clicar(page, ".carrossel__item:nth-child(3) .cr-card", 1100);
      await sleep(2800);
      await deslizar(page, 1000, 650, 700);
      await rolar(page, "#documentos", 1700);
      await sleep(900);
      const caixas = page.locator('.checklist input[type="checkbox"]');
      const n = await caixas.count();
      for (let i = 0; i < n; i++) {
        const lb = page.locator(".checklist li").nth(i);
        await lb.scrollIntoViewIfNeeded().catch(() => {});
        const b = await lb.boundingBox();
        if (b && (b.y > 900 || b.y < 120)) { await rolar(page, (await page.evaluate(() => scrollY)) + (b.y > 900 ? 560 : -300), 900); }
        const bb = await lb.boundingBox();
        await deslizar(page, bb.x + 40, bb.y + bb.height / 2, 600);
        await page.mouse.down(); await sleep(60); await page.mouse.up();
        await sleep(i < 2 ? 700 : 380);
      }
      await rolar(page, "[data-progresso-texto]", 900);
      await sleep(1900);
      await rolar(page, "#como-funciona", 1700);
      await sleep(1700);
      await rolar(page, "#prazo-custo", 1500);
      await sleep(1500);
    });
  },

  // 7) Funil "Fale com o cartório" + botão voltar ao topo
  async funil({ page }) {
    await page.goto(SITE); await sleep(1200);
    await rolar(page, "#atendimento", 0.01);
    await sleep(300);
    await gravar(page, "funil", async () => {
      await sleep(400);
      await rolar(page, "#falar", 1900);
      await sleep(1300);
      await clicar(page, "[data-f-nome]", 1000);
      await sleep(250);
      await digitar(page, "Maria da Silva", 95);
      await sleep(600);
      await irPara(page, "[data-f-esp]", 800);
      await sleep(250);
      await page.locator("[data-f-esp]").selectOption({ label: "Notas" });
      await sleep(1000);
      await irPara(page, "[data-f-ato]", 700);
      await sleep(250);
      await page.locator("[data-f-ato]").selectOption({ index: 2 });
      await sleep(1700);
      await irPara(page, "[data-f-whats]", 1000);
      await sleep(1500);
      await irPara(page, "[data-f-email]", 700);
      await sleep(1000);
      await clicar(page, ".topo-voltar", 1100);
      await sleep(2600);
    });
  },
};

const pedidas = process.argv.slice(2);
const { browser, page } = await abrir();
for (const [nome, fn] of Object.entries(cenas)) {
  if (pedidas.length && !pedidas.includes(nome)) continue;
  pos.x = 960; pos.y = 1250;
  await page.evaluate(() => { window.__mx = -100; window.__my = -100; }).catch(() => {});
  await fn({ page });
}
await browser.close();

// 8) Versão para celular
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
