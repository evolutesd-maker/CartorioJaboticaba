#!/usr/bin/env node
/* Gerador do site estático do Tabelionato de Jaboticaba.
 *
 *   content/   dados e textos (JSON e fragmentos HTML)  ← é aqui que se edita o conteúdo
 *   src/       CSS, JS, fontes e imagens                 ← aparência
 *   docs/      saída pronta para publicar (gerada, não edite à mão)
 *
 * Uso: node build.mjs        (sem dependências; Node 18+)
 *
 * Com "rascunho": true em content/site.json o site é gerado com avisos visíveis,
 * marcadores "a confirmar" e bloqueado para buscadores. Com "rascunho": false o
 * build FALHA se faltarem dados obrigatórios ou se algum ato não estiver validado.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = dirname(fileURLToPath(import.meta.url));
const SAIDA = join(RAIZ, "docs");
const lerJson = (p) => JSON.parse(readFileSync(join(RAIZ, p), "utf8"));
const lerTexto = (p) => readFileSync(join(RAIZ, p), "utf8");

/* ===================================================================== dados */

const site = lerJson("content/site.json");
const temas = lerJson("content/temas.json");
const destaques = lerJson("content/destaques.json");
const ORDEM_ESPECIALIDADES = ["notas", "protesto", "rtd", "rcpj", "rcpn"];
const especialidades = ORDEM_ESPECIALIDADES.map((id) => lerJson(`content/especialidades/${id}.json`));

const erros = []; // impedem o build
const pendencias = []; // só informam
const rascunho = site.rascunho !== false;

const atos = new Map();
for (const esp of especialidades) {
  esp.caminho = `servicos/${esp.slug}.html`;
  for (const campo of ["tagline", "opcoes"]) {
    if (!esp[campo] || !esp[campo].length) erros.push(`${esp.id}: falta o campo "${campo}" (usado no cartão da página inicial).`);
  }
  for (const ato of esp.atos) {
    ato.esp = esp;
    ato.id = `${esp.id}/${ato.slug}`;
    ato.caminho = `servicos/${esp.slug}/${ato.slug}.html`;
    if (atos.has(ato.id)) erros.push(`Ato duplicado: ${ato.id}`);
    atos.set(ato.id, ato);
  }
}

for (const tema of temas) {
  for (const ref of tema.atos) {
    const ato = atos.get(ref);
    if (!ato) erros.push(`temas.json: o ato "${ref}" (tema ${tema.id}) não existe.`);
    else ato.tema = tema;
  }
}
for (const ref of destaques) if (!atos.has(ref)) erros.push(`destaques.json: o ato "${ref}" não existe.`);
for (const ato of atos.values()) {
  if (!ato.tema) erros.push(`O ato ${ato.id} não aparece em nenhum tema de content/temas.json (ninguém o encontraria pelo localizador).`);
  for (const ref of ato.verTambem || []) {
    if (!atos.has(ref)) erros.push(`${ato.id}: "verTambem" aponta para "${ref}", que não existe.`);
  }
  for (const m of ato.modelos || []) {
    if (!existsSync(join(RAIZ, "content/modelos", m.arquivo))) erros.push(`${ato.id}: modelo "${m.arquivo}" não existe em content/modelos/.`);
  }
}

/* ===================================================================== utilidades */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const soDigitos = (s) => String(s).replace(/\D/g, "");
// Números com até 11 dígitos são nacionais (DDD + número): acrescenta o 55 do Brasil.
const comPais = (s) => {
  const d = soDigitos(s);
  return d.length <= 11 ? `55${d}` : d;
};
const dataBr = (iso) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

const ICONES = {
  documento: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
  protesto: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 10v4M17.5 10v4"/>',
  arquivo: '<path d="M3 4h18v4H3z"/><path d="M5 8v12h14V8"/><path d="M10 12h4"/>',
  predio: '<path d="M5 21V4l7-2 7 2v17"/><path d="M3 21h18"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2"/><path d="M10 21v-4h4v4"/>',
  pessoas: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.2c2.8.4 4.5 2.7 4.5 5.8"/>',
  casa: '<path d="M3 11l9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M10 21v-6h4v6"/>',
  chat: '<path d="M4 5h16v11h-9l-4 4v-4H4z"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  telefone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  lupa: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
  seta: '<path d="M9 5l7 7-7 7"/>',
  diagonal: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
  imprimir: '<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  baixar: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  rota: '<path d="M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M7 17h7a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h7"/>',
};
const icone = (nome) =>
  `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONES[nome] || ""}</svg>`;

const SELO = `<svg class="marca__selo" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="22" fill="#0078d7"/><circle cx="24" cy="24" r="19" fill="none" stroke="#e3c277" stroke-width="1.5"/><text x="24" y="32" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="23" font-weight="700" fill="#fff">J</text></svg>`;

/* ===================================================================== dados do cartório */

const end = site.endereco;
const enderecoRua = `${end.logradouro}, ${end.numero} — ${end.bairro}`;
const enderecoCidade = `${end.cidade}/${end.uf} — CEP ${end.cep}`;
const consultaMapa = encodeURIComponent(`${end.logradouro}, ${end.numero}, ${end.bairro}, ${end.cidade} - ${end.uf}, ${end.cep}, Brasil`);
const rotaUrl = `https://www.google.com/maps/dir/?api=1&destination=${consultaMapa}`;
const telHref = site.telefone ? `tel:+${comPais(site.telefone)}` : null;
const waUrl = (msg) =>
  site.whatsapp ? `https://wa.me/${comPais(site.whatsapp)}?text=${encodeURIComponent(msg)}` : null;
const MSG_PADRAO = "Olá! Gostaria de uma informação sobre os serviços do cartório.";

const FOTO_EXT = ["jpg", "jpeg", "webp", "png", "avif"];
const fotoReal = FOTO_EXT.map((x) => `fachada.${x}`).find((n) => existsSync(join(RAIZ, "src/img", n)));
const fachada = fotoReal
  ? { src: `assets/img/${fotoReal}`, real: true }
  : { src: "assets/img/fachada-placeholder.svg", real: false };
const fachadaAlt = fachada.real
  ? `Fachada do ${site.nome}, na ${end.logradouro}, ${end.numero}`
  : "Espaço reservado para a foto da fachada do cartório";

const aConfirmar = (txt) => (rascunho ? `<span class="pendente">${esc(txt)}</span>` : "");

// Pendências e exigências para publicar
const obrigatorios = [
  [!(site.telefone || site.whatsapp), "telefone ou WhatsApp (content/site.json)"],
  [!site.horario, "horário de atendimento (content/site.json → horario)"],
  [!site.titular, "nome do titular (content/site.json → titular)"],
  [!site.cns, "número do CNS da serventia (content/site.json → cns)"],
  [!(site.encarregadoLgpd && site.encarregadoLgpd.email), "contato do encarregado de dados/LGPD (content/site.json → encarregadoLgpd)"],
  [!site.privacidadeAtualizadaEm, "data da política de privacidade (content/site.json → privacidadeAtualizadaEm)"],
  [!fachada.real, "foto real da fachada (salve como src/img/fachada.jpg)"],
  [!site.url, "endereço público do site (content/site.json → url)"],
];
for (const [falta, descr] of obrigatorios) if (falta) pendencias.push(descr);
if (!site.whatsapp) pendencias.push("WhatsApp (content/site.json → whatsapp): os botões de WhatsApp levam à página de contato enquanto não houver número");
const naoValidados = [...atos.values()].filter((a) => !a.validado);
if (naoValidados.length) pendencias.push(`${naoValidados.length} de ${atos.size} atos ainda não validados pelo cartório ("validado": false)`);
const totalModelos = [...atos.values()].reduce((n, a) => n + (a.modelos || []).length, 0);
if (!totalModelos) pendencias.push("nenhum modelo/formulário em PDF cadastrado (content/modelos/ + campo \"modelos\" de cada ato)");

if (!rascunho) {
  for (const [falta, descr] of obrigatorios) if (falta) erros.push(`Para publicar falta: ${descr}`);
  for (const a of naoValidados) erros.push(`Ato não validado: ${a.id}`);
}

/* ===================================================================== contexto de página */

const profundidade = (caminho) => caminho.split("/").length - 1;
const ctx = (caminho) => {
  const raiz = "../".repeat(profundidade(caminho));
  return { caminho, raiz, u: (p) => raiz + p };
};

/* ===================================================================== componentes */

const FONTE = "assets/fonts/PlusJakartaSans-latin-wght.woff2";

function botaoWhats(c, msg, { classe = "btn btn--primario", rotulo = "Falar pelo WhatsApp" } = {}) {
  const href = waUrl(msg);
  if (href) return `<a class="${classe}" href="${esc(href)}" target="_blank" rel="noopener">${icone("chat")}${esc(rotulo)}</a>`;
  return `<a class="${classe}" href="${c.u("contato.html")}">${icone("chat")}${esc(rotulo)}</a>`;
}
const botaoLigar = (classe = "btn btn--contorno") =>
  telHref ? `<a class="${classe}" href="${telHref}">${icone("telefone")}Ligar para o cartório</a>` : "";
const botaoRota = (classe = "btn btn--primario") =>
  `<a class="${classe}" href="${esc(rotaUrl)}" target="_blank" rel="noopener">${icone("rota")}Abrir a rota no mapa<span class="sr-only"> (abre em nova aba)</span></a>`;

function dadosContato({ email = true } = {}) {
  const linhas = [];
  linhas.push(`<div><dt>${icone("pin")}Endereço</dt><dd><address>${esc(enderecoRua)}<br>${esc(enderecoCidade)}</address></dd></div>`);

  let horario;
  if (site.horario && site.horario.length) {
    horario =
      `<dl class="horario">` +
      site.horario.map((h) => `<dt>${esc(h.dias)}</dt><dd>${esc(h.horas)}</dd>`).join("") +
      `</dl>` +
      (site.horarioObservacao ? `<p class="nota-pequena">${esc(site.horarioObservacao)}</p>` : "");
  } else horario = aConfirmar("Horário a confirmar com o cartório");
  if (horario) linhas.push(`<div><dt>${icone("relogio")}Horário de atendimento</dt><dd>${horario}</dd></div>`);

  const tel = site.telefone ? `<a href="${telHref}">${esc(site.telefone)}</a>` : aConfirmar("Telefone a confirmar");
  if (tel) linhas.push(`<div><dt>${icone("telefone")}Telefone</dt><dd>${tel}</dd></div>`);

  const zap = site.whatsapp
    ? `<a href="${esc(waUrl(MSG_PADRAO))}" target="_blank" rel="noopener">${esc(site.whatsapp)}</a>`
    : aConfirmar("WhatsApp a confirmar");
  if (zap) linhas.push(`<div><dt>${icone("chat")}WhatsApp</dt><dd>${zap}</dd></div>`);

  if (email) {
    const mail = site.email ? `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : aConfirmar("E-mail a confirmar");
    if (mail) linhas.push(`<div><dt>${icone("email")}E-mail</dt><dd>${mail}</dd></div>`);
  }
  return `<dl class="dados">${linhas.join("")}</dl>`;
}

const buscaIndexada = (ato) =>
  norm([ato.titulo, ato.nomeTecnico, ato.esp.nome, ato.esp.nomeCompleto, ato.tema && ato.tema.titulo, ...(ato.palavras || [])].filter(Boolean).join(" "));

function itemLocalizador(c, ato, meta) {
  return (
    `<li data-finder-item data-busca="${esc(buscaIndexada(ato))}"><a href="${c.u(ato.caminho)}">` +
    `<span class="lista-links__texto"><span class="lista-links__titulo">${esc(ato.titulo)}</span>` +
    (meta ? `<span class="lista-links__meta">${esc(meta)}</span>` : "") +
    `</span>${icone("seta")}</a></li>`
  );
}

/** Lista de serviços com filtro (funciona sem JavaScript: a busca some, a lista fica). */
function localizador(c, { agrupar, id }) {
  let grupos;
  if (agrupar === "tema") {
    grupos = temas.map((t) => ({
      id: `tema-${t.id}`,
      titulo: t.titulo,
      icone: t.icone,
      descricao: t.descricao,
      itens: t.atos.map((ref) => itemLocalizador(c, atos.get(ref), atos.get(ref).esp.nome)),
    }));
  } else {
    grupos = especialidades.map((e) => ({
      id: `esp-${e.id}`,
      titulo: e.nome,
      icone: e.icone,
      descricao: e.resumo,
      href: c.u(e.caminho),
      itens: e.atos.map((a) => itemLocalizador(c, a, a.nomeTecnico)),
    }));
  }
  const html = grupos
    .map(
      (g, i) => `
      <section class="grupo" data-finder-grupo aria-labelledby="${id}-${g.id}" data-reveal style="--i:${i % 3}">
        <h3 id="${id}-${g.id}">${icone(g.icone)}<span>${g.href ? `<a href="${g.href}">${esc(g.titulo)}</a>` : esc(g.titulo)}</span></h3>
        <p class="grupo__desc">${esc(g.descricao)}</p>
        <ul class="lista-links">${g.itens.join("")}</ul>
      </section>`
    )
    .join("");

  return `
    <div class="finder" data-finder>
      <div class="finder__busca">
        <label for="${id}-busca">Escreva o que você precisa</label>
        <div class="campo">${icone("lupa")}<input id="${id}-busca" type="search" autocomplete="off" placeholder="Ex.: certidão, procuração, casar" data-finder-input></div>
        <p class="finder__status" role="status" aria-live="polite" data-finder-status></p>
      </div>
      <div class="finder__grupos">${html}</div>
      <div class="finder__vazio" hidden data-finder-vazio>
        <p><strong>Não encontramos esse assunto.</strong> Tente outras palavras (por exemplo: certidão, casamento, imóvel, dívida) ou fale com o cartório, que orienta qual serviço é o certo.</p>
        <p>${botaoWhats(c, MSG_PADRAO, { classe: "btn btn--contorno", rotulo: "Falar com o cartório" })}</p>
      </div>
    </div>`;
}

function faixa(c, { trilha, eyebrow, titulo, sub, lead }) {
  const itens = trilha
    .map((t, i) => (i === trilha.length - 1 ? `<li aria-current="page">${esc(t.rotulo)}</li>` : `<li><a href="${c.u(t.href)}">${esc(t.rotulo)}</a></li>`))
    .join("");
  return `
  <div class="faixa escuro">
    <div class="container">
      <nav class="trilha" aria-label="Você está em"><ol>${itens}</ol></nav>
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
      <h1>${esc(titulo)}</h1>
      ${sub ? `<p class="faixa__sub">${esc(sub)}</p>` : ""}
      ${lead ? `<p class="faixa__lead">${esc(lead)}</p>` : ""}
    </div>
  </div>`;
}

const rodapeCanais = () => {
  const l = [];
  l.push(site.telefone ? `<li>Telefone: <a href="${telHref}">${esc(site.telefone)}</a></li>` : rascunho ? `<li>${aConfirmar("Telefone a confirmar")}</li>` : "");
  l.push(site.whatsapp ? `<li>WhatsApp: <a href="${esc(waUrl(MSG_PADRAO))}" target="_blank" rel="noopener">${esc(site.whatsapp)}</a></li>` : rascunho ? `<li>${aConfirmar("WhatsApp a confirmar")}</li>` : "");
  l.push(site.email ? `<li>E-mail: <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : rascunho ? `<li>${aConfirmar("E-mail a confirmar")}</li>` : "");
  return l.join("");
};

function cabecalho(c, ativo) {
  const item = (chave, rotulo, href) =>
    `<li><a href="${c.u(href)}"${ativo === chave ? ' aria-current="page"' : ""}>${rotulo}</a></li>`;
  return `
  <header class="topo">
    <div class="container topo__linha">
      <a class="marca" href="${c.u("index.html")}" aria-label="${esc(site.nome)} — página inicial">
        ${SELO}
        <span class="marca__texto"><strong>${esc(site.nome)}</strong><small>${esc(site.chamada)}</small></span>
      </a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu-principal">${icone("menu")}Menu</button>
      <nav class="menu" id="menu-principal" aria-label="Principal">
        <ul>
          ${item("inicio", "Início", "index.html")}
          ${item("servicos", "Serviços", "servicos.html")}
          ${item("documentos", "Documentos", "documentos.html")}
          ${item("contato", "Contato", "contato.html")}
        </ul>
        ${botaoWhats(c, MSG_PADRAO, { classe: "btn btn--primario", rotulo: "WhatsApp" })}
      </nav>
    </div>
  </header>`;
}

function rodape(c) {
  return `
  <footer class="rodape escuro">
    <div class="container rodape__grade">
      <div>
        <p class="rodape__nome">${esc(site.nome)}</p>
        <p>Serventia extrajudicial: Notas, Protesto de Títulos, Registro de Títulos e Documentos, Registro Civil das Pessoas Jurídicas e Registro Civil das Pessoas Naturais.</p>
        <p>${esc(enderecoRua)}<br>${esc(enderecoCidade)}</p>
        ${site.titular ? `<p>Titular: ${esc(site.titular)}</p>` : rascunho ? `<p>Titular: ${aConfirmar("a confirmar")}</p>` : ""}
        ${site.cns ? `<p>CNS: ${esc(site.cns)}</p>` : rascunho ? `<p>CNS: ${aConfirmar("a confirmar")}</p>` : ""}
      </div>
      <div>
        <h2>Canais oficiais</h2>
        <ul>${rodapeCanais()}</ul>
        <p>Confira sempre se o contato é um dos canais oficiais listados aqui.</p>
      </div>
      <div>
        <h2>Especialidades</h2>
        <ul>${especialidades.map((e) => `<li><a href="${c.u(e.caminho)}">${esc(e.nome)}</a></li>`).join("")}</ul>
      </div>
      <div>
        <h2>Informações</h2>
        <ul>
          <li><a href="${c.u("documentos.html")}">Documentos e orientações</a></li>
          <li><a href="${c.u("contato.html")}">Localização e atendimento</a></li>
          <li><a href="${c.u("institucional.html")}">Institucional</a></li>
          <li><a href="${c.u("privacidade.html")}">Política de privacidade</a></li>
        </ul>
      </div>
    </div>
    <div class="container rodape__fim">
      <p>© ${new Date().getFullYear()} ${esc(site.nome)}. As orientações deste site são informativas e não substituem o atendimento: os requisitos podem variar conforme o caso.</p>
    </div>
  </footer>`;
}

function botaoFlutuante(c) {
  const href = waUrl(MSG_PADRAO);
  const alvo = href ? `href="${esc(href)}" target="_blank" rel="noopener"` : `href="${c.u("contato.html")}"`;
  return `<aside aria-label="Atalho de contato"><a class="fab-whats" ${alvo}>${icone("chat")}<span>Falar no WhatsApp</span></a></aside>`;
}

function layout(c, { titulo, descricao, corpo, ativo = "", noindex = false, jsonld = null, home = false }) {
  const tituloCompleto = home ? `${site.nome} · Serviços de cartório em ${end.cidade}/${end.uf}` : `${titulo} | ${site.nome}`;
  const bloquear = noindex || rascunho;
  const canonical = site.url ? new URL(c.caminho === "index.html" ? "" : c.caminho, site.url.replace(/\/?$/, "/")).href : null;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="theme-color" content="#0078d7">
${bloquear ? '<meta name="robots" content="noindex, nofollow">' : ""}
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(site.nome)}">
<meta property="og:title" content="${esc(tituloCompleto)}">
<meta property="og:description" content="${esc(descricao)}">
<link rel="icon" href="${c.u("assets/img/favicon.svg")}" type="image/svg+xml">
<link rel="preload" href="${c.u(FONTE)}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${c.u("assets/css/style.css")}">
<script>document.documentElement.classList.add("js")</script>
<script src="${c.u("assets/js/main.js")}" defer></script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : ""}
</head>
<body>
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
${rascunho ? `<aside class="aviso-rascunho" aria-label="Aviso sobre esta versão"><div class="container"><strong>Versão de apresentação.</strong> Os documentos e orientações ainda serão validados pelo cartório antes da publicação. Telefone, horário e foto da fachada serão inseridos.</div></aside>` : ""}
${cabecalho(c, ativo)}
<main id="conteudo">
${corpo}
</main>
${rodape(c)}
${botaoFlutuante(c)}
</body>
</html>
`;
}

/** Cartão minimalista de especialidade: nome, uma linha e opções curtas; o cartão todo leva à página. */
function cartaoEspecialidade(c, esp, i) {
  return `
        <li class="esp-card" data-reveal style="--i:${i % 3}">
          <div class="esp-card__topo">
            <span class="esp-card__icone">${icone(esp.icone)}</span>
            <span class="esp-card__seta" aria-hidden="true">${icone("diagonal")}</span>
          </div>
          <h3>${esc(esp.nomeCompleto)}</h3>
          <p class="esp-card__tag">${esc(esp.tagline)}</p>
          <ul class="esp-card__lista">${esp.opcoes.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
          <a class="esp-card__ver" href="${c.u(esp.caminho)}">Ver serviços e documentos<span class="sr-only"> de ${esc(esp.nome)}</span>${icone("seta")}</a>
        </li>`;
}

/* ===================================================================== páginas */

const paginas = []; // { caminho, html, noindex? }
const adicionar = (caminho, html, extra = {}) => paginas.push({ caminho, html, ...extra });

// ---------- Início
{
  const c = ctx("index.html");

  const hero = `
  <section class="hero escuro">
    <div class="container hero__grade">
      <div class="hero__texto">
        <p class="eyebrow">${esc(site.nome)}</p>
        <h1>Serviços de cartório, de um jeito simples</h1>
        <p>Notas, protesto e registros civis e de documentos em um só endereço. Diga o que você precisa e veja os documentos antes de vir.</p>
        <div class="hero__acoes">
          <a class="btn btn--claro" href="#encontrar">${icone("lupa")}Encontrar um serviço</a>
          ${botaoWhats(c, MSG_PADRAO, { classe: "btn btn--vidro", rotulo: "Falar com o cartório" })}
        </div>
      </div>
      <figure class="hero__foto">
        <img src="${c.u(fachada.src)}" width="1600" height="1100" alt="${esc(fachadaAlt)}" fetchpriority="high">
        <div class="flutuante flutuante--a"><span class="flutuante__icone">${icone("arquivo")}</span><div><strong>5 especialidades</strong><small>no mesmo endereço</small></div></div>
        <div class="flutuante flutuante--b"><span class="flutuante__icone">${icone("check")}</span><div><strong>Documentos antes de vir</strong><small>lista para cada serviço</small></div></div>
      </figure>
    </div>
  </section>`;

  const carrossel = destaques
    .map((ref) => atos.get(ref))
    .map(
      (a) => `
          <li class="carrossel__item"><a class="cr-card" href="${c.u(a.caminho)}" draggable="false">
            <span class="cr-card__topo"><span class="cr-card__icone">${icone(a.esp.icone)}</span><span class="cr-card__seta" aria-hidden="true">${icone("seta")}</span></span>
            <strong>${esc(a.titulo)}</strong>
            <span class="tag">${esc(a.esp.nome)}</span>
          </a></li>`
    )
    .join("");

  const indiceBusca = JSON.stringify([...atos.values()].map((a) => ({ t: a.titulo, e: a.esp.nome, u: c.u(a.caminho), b: buscaIndexada(a) }))).replace(/</g, "\\u003c");

  const painel = `
  <div class="container painel-flutuante" id="encontrar">
    <div class="painel">
      <div class="painel__cab">
        <h2>O que você precisa fazer?</h2>
        <p>Escreva com suas palavras ou escolha um dos serviços mais procurados.</p>
      </div>
      <div class="busca" data-busca-servicos>
        <label class="sr-only" for="busca-hero">Escreva o que você precisa fazer</label>
        <div class="busca__campo">
          ${icone("lupa")}
          <input id="busca-hero" type="search" role="combobox" aria-expanded="false" aria-controls="busca-lista" aria-autocomplete="list" autocomplete="off" placeholder="Ex.: certidão, procuração, casar" data-busca-input>
        </div>
        <div class="busca__painel" data-busca-painel hidden>
          <ul class="busca__lista" id="busca-lista" role="listbox" aria-label="Serviços encontrados" data-busca-lista></ul>
          <div class="busca__vazio" data-busca-vazio hidden>
            <p><strong>Não encontramos esse assunto.</strong> Tente outras palavras ou fale com o cartório, que indica o serviço certo.</p>
            ${botaoWhats(c, MSG_PADRAO, { classe: "btn btn--contorno", rotulo: "Falar com o cartório" })}
          </div>
        </div>
        <p class="sr-only" role="status" aria-live="polite" data-busca-status></p>
      </div>
      <section class="carrossel" data-carrossel aria-roledescription="carrossel" aria-label="Serviços mais procurados">
        <div class="carrossel__cab">
          <h3>Mais procurados</h3>
          <div class="carrossel__ctl">
            <button type="button" data-car-prev aria-label="Ver serviços anteriores">${icone("seta")}</button>
            <button type="button" data-car-next aria-label="Ver mais serviços">${icone("seta")}</button>
          </div>
        </div>
        <ul class="carrossel__pista" tabindex="0" data-fade="dir" aria-label="Serviços mais procurados. Use as setas do teclado para rolar.">${carrossel}
        </ul>
      </section>
    </div>
    <script type="application/json" id="indice-busca">${indiceBusca}</script>
  </div>`;

  const servicos = `
  <section class="secao" id="servicos" aria-labelledby="t-servicos">
    <div class="container">
      <div class="secao__cab secao__cab--centro" data-reveal>
        <p class="eyebrow">Serviços</p>
        <h2 id="t-servicos">Escolha a especialidade</h2>
        <p>Cinco atendimentos no mesmo endereço. Toque em um deles para ver os serviços e os documentos.</p>
      </div>
      <ul class="esp-grade">${especialidades.map((e, i) => cartaoEspecialidade(c, e, i)).join("")}
      </ul>
    </div>
  </section>`;

  const antes = `
  <section class="secao secao--azul" id="antes-de-vir" aria-labelledby="t-antes">
    <div class="container">
      <div class="secao__cab secao__cab--centro" data-reveal>
        <p class="eyebrow">Antes de vir ao cartório</p>
        <h2 id="t-antes">Venha preparado e evite idas e vindas</h2>
        <p>Consulte os documentos necessários, as orientações e os modelos disponíveis.</p>
      </div>
      <ul class="atalhos">
        <li class="atalho" data-reveal style="--i:0">
          <span class="atalho__icone">${icone("documento")}</span>
          <span class="atalho__texto"><a href="${c.u("documentos.html#consultar")}">Documentos necessários</a><span>Veja o que levar, serviço por serviço</span></span>
          ${icone("seta")}
        </li>
        <li class="atalho" data-reveal style="--i:1">
          <span class="atalho__icone">${icone("check")}</span>
          <span class="atalho__texto"><a href="${c.u("documentos.html#orientacoes")}">Orientações</a><span>O que conferir antes de sair de casa</span></span>
          ${icone("seta")}
        </li>
        <li class="atalho" data-reveal style="--i:2">
          <span class="atalho__icone">${icone("baixar")}</span>
          <span class="atalho__texto"><a href="${c.u("documentos.html#modelos")}">Modelos e formulários</a><span>${totalModelos ? "Baixe e preencha antes do atendimento" : "Em breve, para baixar e preencher"}</span></span>
          ${icone("seta")}
        </li>
      </ul>
    </div>
  </section>`;

  const atendimento = `
  <section class="secao" id="atendimento" aria-labelledby="t-atendimento">
    <div class="container">
      <div class="secao__cab" data-reveal>
        <p class="eyebrow">Localização e atendimento</p>
        <h2 id="t-atendimento">Como chegar e quando ir</h2>
      </div>
      <div class="atend">
        <div class="cartao-info" data-reveal>
          ${dadosContato()}
          <div class="atend__acoes">
            ${botaoRota("btn btn--primario")}
            ${botaoLigar("btn btn--contorno")}
          </div>
          <p class="nota-pequena">Confira sempre se o contato é um dos canais oficiais divulgados neste site.</p>
        </div>
        <figure class="atend__foto" data-reveal style="--i:1">
          <img src="${c.u(fachada.src)}" width="1600" height="1100" alt="${esc(fachadaAlt)}" loading="lazy">
          <figcaption>${icone("pin")}Procure pela fachada na ${esc(end.logradouro)}, nº ${esc(end.numero)}</figcaption>
        </figure>
      </div>
    </div>
  </section>`;

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "Notary",
    name: site.nome,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${end.logradouro}, ${end.numero}`,
      addressLocality: end.cidade,
      addressRegion: end.uf,
      postalCode: end.cep,
      addressCountry: "BR",
    },
  };
  if (site.telefone) jsonld.telephone = `+${comPais(site.telefone)}`;
  if (site.email) jsonld.email = site.email;
  if (site.url) jsonld.url = site.url;

  adicionar(
    c.caminho,
    layout(c, {
      home: true,
      ativo: "inicio",
      titulo: site.nome,
      descricao: `${site.nome}: Notas, Protesto de Títulos, Registro de Títulos e Documentos, Registro Civil das Pessoas Jurídicas e Registro Civil das Pessoas Naturais. ${enderecoRua}, ${end.cidade}/${end.uf}.`,
      jsonld,
      corpo: hero + painel + servicos + antes + atendimento,
    })
  );
}

// ---------- Serviços (todos, por assunto, com atalho por especialidade)
{
  const c = ctx("servicos.html");
  const corpo = `
  ${faixa(c, {
    trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: "Serviços" }],
    titulo: "Todos os serviços",
    lead: "Escolha pelo assunto ou pela especialidade. Cada serviço tem a sua própria lista de documentos.",
  })}
  <section class="secao secao--suave" aria-label="Serviços por assunto">
    <div class="container">
      <p class="eyebrow">Já sabe a especialidade?</p>
      <ul class="espec-atalhos">
        ${especialidades.map((e) => `<li><a href="${c.u(e.caminho)}">${icone(e.icone)}${esc(e.nome)}</a></li>`).join("")}
      </ul>
      <h2 class="sr-only">Serviços por assunto</h2>
      ${localizador(c, { agrupar: "tema", id: "servicos" })}
    </div>
  </section>`;
  adicionar(c.caminho, layout(c, { ativo: "servicos", titulo: "Todos os serviços do cartório", descricao: "Veja todos os serviços do cartório por assunto: família, imóveis, documentos, dívidas e entidades. Cada um com os documentos necessários.", corpo }));
}

// ---------- Páginas de especialidade
for (const esp of especialidades) {
  const c = ctx(esp.caminho);
  const outras = especialidades.filter((e) => e !== esp);
  const corpo = `
  ${faixa(c, {
    trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: "Serviços", href: "servicos.html" }, { rotulo: esp.nome }],
    eyebrow: "Especialidade",
    titulo: esp.nomeCompleto,
    lead: esp.descricao,
  })}
  <section class="secao">
    <div class="container">
      ${esp.aviso ? `<div class="destaque"><p><strong>Qual a diferença?</strong> ${esc(esp.aviso)}</p></div>` : ""}
      <div class="secao__cab" data-reveal>
        <h2>O que você precisa fazer?</h2>
        <p>Escolha o serviço para ver os documentos e como funciona.</p>
      </div>
      <ul class="ato-grade">
        ${esp.atos
          .map(
            (a, i) => `
        <li class="ato-card" data-reveal style="--i:${i % 3}">
          <h3><a href="${c.u(a.caminho)}">${esc(a.titulo)}</a></h3>
          <p class="ato-card__resumo">${esc(a.resumo)}</p>
          <p class="ato-card__ir">Ver documentos ${icone("seta")}</p>
        </li>`
          )
          .join("")}
      </ul>
      <div class="duas-colunas" style="margin-top:3.5rem">
        <div class="caixa" data-reveal>
          <h3>Não encontrou o que procura?</h3>
          <p>Fale com o cartório. O atendimento indica qual serviço atende o seu caso.</p>
          ${botaoWhats(c, `Olá! Preciso de informação sobre ${esp.nome}.`, { classe: "btn btn--primario", rotulo: "Falar com o cartório" })}
        </div>
        <div class="caixa" data-reveal style="--i:1">
          <h3>Outras especialidades</h3>
          <ul class="lista-links">
            ${outras.map((e) => `<li><a href="${c.u(e.caminho)}"><span class="lista-links__texto"><span class="lista-links__titulo">${esc(e.nomeCompleto)}</span><span class="lista-links__meta">${esc(e.tagline)}</span></span>${icone("seta")}</a></li>`).join("")}
          </ul>
        </div>
      </div>
    </div>
  </section>`;
  adicionar(c.caminho, layout(c, { ativo: "servicos", titulo: `${esp.nomeCompleto}: serviços e documentos`, descricao: `${esp.nomeCompleto}: ${esp.resumo} Veja os serviços e os documentos necessários.`, corpo }));
}

// ---------- Páginas de ato (com requisitos)
const DEFAULT_PRAZO = "O cartório informa o prazo no atendimento, conforme o ato e a documentação apresentada.";
const DEFAULT_CUSTO = "Os valores (emolumentos) são fixados por lei e variam conforme o ato. O cartório informa o valor exato antes de você iniciar.";

const itemDoc = (i) =>
  typeof i === "string"
    ? `<li><label><input type="checkbox"><span class="checklist__texto">${esc(i)}</span></label></li>`
    : `<li><label><input type="checkbox"><span class="checklist__texto">${esc(i.texto)}${i.obs ? `<span class="checklist__obs">${esc(i.obs)}</span>` : ""}</span></label></li>`;
const blocoDocumentos = (a) =>
  a.documentos
    .map((g) => `<div class="checklist-grupo"><h3>${esc(g.grupo)}</h3><ul class="checklist">${g.itens.map(itemDoc).join("")}</ul></div>`)
    .join("");
const blocoPassos = (a) => `<ol class="passos">${a.passos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>`;
const blocoFaq = (a) =>
  (a.perguntas || []).length
    ? `<div class="faq">${a.perguntas.map((q) => `<details><summary>${esc(q.p)}</summary><div><p>${esc(q.r)}</p></div></details>`).join("")}</div>`
    : "";

for (const ato of atos.values()) {
  const esp = ato.esp;
  const c = ctx(ato.caminho);
  const msg = `Olá! Gostaria de informações sobre: ${ato.titulo}.`;
  const selo = ato.validado
    ? `<span class="selo selo--ok">Revisado pelo cartório${ato.revisadoEm ? ` em ${dataBr(ato.revisadoEm)}` : ""}</span>`
    : `<span class="selo selo--validacao no-print">Em validação pelo cartório</span>`;

  const ancoras = [
    ["documentos", "Documentos"],
    ["como-funciona", "Como funciona"],
    ["prazo-custo", "Prazo e custo"],
    ...((ato.perguntas || []).length ? [["duvidas", "Dúvidas"]] : []),
    ...((ato.modelos || []).length ? [["modelos", "Modelos"]] : []),
  ];

  const corpo = `
  ${faixa(c, {
    trilha: [
      { rotulo: "Início", href: "index.html" },
      { rotulo: "Serviços", href: "servicos.html" },
      { rotulo: esp.nome, href: esp.caminho },
      { rotulo: ato.titulo },
    ],
    eyebrow: esp.nome,
    titulo: ato.titulo,
    sub: ato.nomeTecnico,
    lead: ato.resumo,
  })}
  <div class="container pagina">
    <article class="pagina__principal">
      <nav aria-label="Nesta página"><ul class="ancoras">${ancoras.map(([id, r]) => `<li><a href="#${id}">${r}</a></li>`).join("")}</ul></nav>

      ${ato.quando ? `<section id="quando"><h2>Quando é necessário</h2><p class="resumo-ato">${esc(ato.quando)}</p></section>` : ""}

      <section id="documentos" data-checklist>
        <h2>Documentos necessários ${selo}</h2>
        <div class="progresso"><span data-progresso-texto role="status"></span><span class="progresso__barra"><i data-progresso-barra></i></span></div>
        ${blocoDocumentos(ato)}
        <p class="nota-final">O cartório pode pedir documentos adicionais conforme o caso. Na dúvida, fale com o atendimento antes de vir.</p>
        <p class="no-print"><button class="btn btn--contorno so-js" type="button" data-imprimir>${icone("imprimir")}Imprimir esta lista</button></p>
      </section>

      <section id="como-funciona">
        <h2>Como funciona</h2>
        ${blocoPassos(ato)}
      </section>

      <section id="prazo-custo">
        <h2>Prazo e custo</h2>
        <div class="info-duas">
          <div class="caixa"><h3>Prazo</h3><p>${esc(ato.prazo || DEFAULT_PRAZO)}</p></div>
          <div class="caixa"><h3>Custo</h3><p>${esc(ato.custo || DEFAULT_CUSTO)}</p></div>
        </div>
      </section>

      ${(ato.perguntas || []).length ? `<section id="duvidas"><h2>Perguntas frequentes</h2>${blocoFaq(ato)}</section>` : ""}

      ${
        (ato.modelos || []).length
          ? `<section id="modelos"><h2>Modelos e formulários</h2><ul class="downloads">${ato.modelos
              .map((m) => `<li><a href="${c.u("modelos/" + m.arquivo)}" download>${icone("baixar")}<span>${esc(m.titulo)}<small>PDF${m.descricao ? ` · ${esc(m.descricao)}` : ""}</small></span></a></li>`)
              .join("")}</ul></section>`
          : ""
      }

      <div class="imprimir-rodape">${esc(site.nome)} · ${esc(enderecoRua)}, ${esc(enderecoCidade)}. Lista informativa: o cartório pode pedir documentos adicionais.</div>
    </article>

    <aside class="pagina__lateral" aria-label="Ajuda e serviços relacionados">
      <div class="lateral-card lateral-card--ajuda">
        <h2>Ficou com dúvida?</h2>
        <p>Fale com o cartório antes de vir. É rápido e evita uma viagem perdida.</p>
        ${botaoWhats(c, msg, { classe: "btn btn--claro btn--cheio", rotulo: "Falar pelo WhatsApp" })}
        ${botaoLigar("btn btn--vidro btn--cheio")}
        <p class="nota-pequena">${esc(enderecoRua)}<br>${esc(enderecoCidade)}</p>
      </div>
      ${
        (ato.verTambem || []).length
          ? `<div class="lateral-card lateral-card--branco"><h2>Veja também</h2><ul class="lista-links">${ato.verTambem
              .map((ref) => atos.get(ref))
              .map((o) => `<li><a href="${c.u(o.caminho)}"><span class="lista-links__texto"><span class="lista-links__titulo">${esc(o.titulo)}</span><span class="lista-links__meta">${esc(o.esp.nome)}</span></span>${icone("seta")}</a></li>`)
              .join("")}</ul></div>`
          : ""
      }
    </aside>
  </div>`;

  adicionar(
    c.caminho,
    layout(c, {
      ativo: "servicos",
      titulo: `${ato.titulo}: documentos necessários`,
      descricao: `${ato.resumo} Veja os documentos necessários e como funciona (${esp.nome}).`,
      corpo,
    })
  );
}

// ---------- Documentos (antes de vir)
{
  const c = ctx("documentos.html");
  const todosModelos = [...atos.values()].flatMap((a) => (a.modelos || []).map((m) => ({ ...m, ato: a })));
  const corpo = `
  ${faixa(c, {
    trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: "Documentos" }],
    eyebrow: "Antes de vir ao cartório",
    titulo: "Documentos e orientações",
    lead: "Consulte o que levar para cada serviço, leia as orientações e baixe os modelos disponíveis.",
  })}

  <section class="secao" id="orientacoes" aria-labelledby="t-gerais">
    <div class="container">
      <div class="secao__cab" data-reveal><p class="eyebrow">Orientações</p><h2 id="t-gerais">O que quase sempre é pedido</h2><p>Cada serviço tem a sua lista própria, mas estes itens aparecem em quase todos os atendimentos.</p></div>
      <div class="duas-colunas">
        <div class="caixa" data-reveal>
          <h3>${icone("check")}Documentos mais comuns</h3>
          <ul class="lista-pontos">
            <li>Documento de identificação oficial com foto, original (RG, CNH ou outro aceito em lei).</li>
            <li>CPF.</li>
            <li>Comprovante de residência recente.</li>
            <li>Certidões de estado civil atualizadas (nascimento, casamento, óbito), conforme o caso.</li>
            <li>Procuração, se for representar outra pessoa.</li>
          </ul>
        </div>
        <div class="caixa" data-reveal style="--i:1">
          <h3>${icone("documento")}Antes de sair de casa</h3>
          <ul class="lista-pontos">
            <li>Leve os documentos originais. Cópias só quando o cartório pedir.</li>
            <li>Confira se nomes, datas e números estão corretos.</li>
            <li>Pergunte se todas as pessoas envolvidas precisam comparecer.</li>
            <li>Se houver dúvida, fale com o cartório antes de vir.</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="secao secao--suave" id="consultar" aria-labelledby="t-consultar">
    <div class="container">
      <div class="secao__cab" data-reveal><p class="eyebrow">Consultar por serviço</p><h2 id="t-consultar">Qual serviço você precisa?</h2><p>Escolha a especialidade e o serviço para ver a lista exata de documentos. Exemplo: Notas → Procuração.</p></div>
      ${localizador(c, { agrupar: "esp", id: "docs" })}
    </div>
  </section>

  <section class="secao" id="modelos" aria-labelledby="t-modelos">
    <div class="container">
      <div class="secao__cab" data-reveal><p class="eyebrow">Modelos</p><h2 id="t-modelos">Modelos e formulários</h2></div>
      ${
        todosModelos.length
          ? `<ul class="downloads" style="max-width:46rem">${todosModelos
              .map((m) => `<li><a href="${c.u("modelos/" + m.arquivo)}" download>${icone("baixar")}<span>${esc(m.titulo)}<small>PDF · ${esc(m.ato.esp.nome)} → ${esc(m.ato.titulo)}</small></span></a></li>`)
              .join("")}</ul>`
          : `<div class="destaque" style="max-width:46rem"><p>Os modelos e formulários em PDF serão disponibilizados aqui assim que o cartório validar o conteúdo. Enquanto isso, fale com o atendimento para receber o modelo do seu caso.</p></div>`
      }
    </div>
  </section>`;
  adicionar(c.caminho, layout(c, { ativo: "documentos", titulo: "Documentos e orientações", descricao: "Antes de vir ao cartório: veja os documentos necessários para cada serviço, orientações e modelos disponíveis.", corpo }));
}

// ---------- Contato
{
  const c = ctx("contato.html");
  const corpo = `
  ${faixa(c, {
    trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: "Contato" }],
    eyebrow: "Localização e atendimento",
    titulo: "Como falar e como chegar",
    lead: `Estamos na ${enderecoRua}, em ${end.cidade}/${end.uf}.`,
  })}
  <section class="secao">
    <div class="container atend">
      <div class="cartao-info">
        ${dadosContato()}
        <div class="atend__acoes">
          ${botaoRota("btn btn--primario")}
          ${botaoLigar("btn btn--contorno")}
          ${botaoWhats(c, MSG_PADRAO, { classe: "btn btn--contorno", rotulo: "Falar pelo WhatsApp" })}
        </div>
        <p class="nota-pequena">Confira sempre se o contato é um dos canais oficiais divulgados neste site.</p>
      </div>
      <figure class="atend__foto">
        <img src="${c.u(fachada.src)}" width="1600" height="1100" alt="${esc(fachadaAlt)}" loading="lazy">
        <figcaption>${icone("pin")}Procure pela fachada na ${esc(end.logradouro)}, nº ${esc(end.numero)}</figcaption>
      </figure>
    </div>
  </section>`;
  adicionar(c.caminho, layout(c, { ativo: "contato", titulo: "Contato e localização", descricao: `Endereço, horário de atendimento, telefone e rota até o ${site.nome}, ${enderecoRua}, ${end.cidade}/${end.uf}.`, corpo }));
}

// ---------- Páginas de texto (fragmentos em content/paginas/)
function preencher(html) {
  const encarregado = site.encarregadoLgpd && site.encarregadoLgpd.email
    ? `${site.encarregadoLgpd.nome ? esc(site.encarregadoLgpd.nome) + ", " : ""}<a href="mailto:${esc(site.encarregadoLgpd.email)}">${esc(site.encarregadoLgpd.email)}</a>`
    : aConfirmar("a confirmar com o cartório");
  const vars = {
    avisoRevisao: rascunho
      ? `<div class="destaque"><p><strong>Texto-base em revisão.</strong> Este conteúdo será revisado pelo cartório (e por sua assessoria jurídica) antes da publicação.</p></div>`
      : "",
    nome: esc(site.nome),
    endereco: `${esc(enderecoRua)}, ${esc(enderecoCidade)}`,
    titular: site.titular ? esc(site.titular) : aConfirmar("a confirmar"),
    cns: site.cns ? esc(site.cns) : aConfirmar("a confirmar"),
    encarregado,
    atualizadoEm: site.privacidadeAtualizadaEm ? dataBr(site.privacidadeAtualizadaEm) : aConfirmar("data a confirmar"),
    especialidades: `<ul>${especialidades.map((e) => `<li><strong>${esc(e.nomeCompleto)}:</strong> ${esc(e.resumo)}</li>`).join("")}</ul>`,
  };
  return html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) { erros.push(`Fragmento usa {{${k}}}, que não existe.`); return ""; }
    return vars[k];
  });
}
for (const [arquivo, titulo, descricao] of [
  ["institucional", "Institucional", `Informações institucionais do ${site.nome}: especialidades, responsável, emolumentos e atendimento.`],
  ["privacidade", "Política de privacidade", `Como o ${site.nome} trata dados pessoais neste site e no atendimento.`],
]) {
  const c = ctx(`${arquivo}.html`);
  const corpo = `
  ${faixa(c, { trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: titulo }], titulo })}
  <section class="secao"><div class="container prosa">${preencher(lerTexto(`content/paginas/${arquivo}.html`))}</div></section>`;
  adicionar(c.caminho, layout(c, { titulo, descricao, corpo }));
}

// ---------- Folha de revisão (só em rascunho): reúne todo o conteúdo para o cartório validar
if (rascunho) {
  const c = ctx("revisao.html");
  const linha = '<span style="display:block;border-bottom:1px solid var(--suave);height:1.6rem"></span>';
  const blocos = especialidades
    .map(
      (e) => `
    <section style="margin-bottom:3rem"><h2>${esc(e.nomeCompleto)}</h2>
    ${e.atos
      .map(
        (a) => `
      <article style="border:1px solid var(--linha);border-radius:var(--r-md);padding:1.25rem;margin-bottom:1.5rem;background:#fff;break-inside:avoid">
        <h3>${esc(a.titulo)} <small style="font-weight:400;color:var(--suave)">(${esc(a.nomeTecnico)})</small></h3>
        <p>${esc(a.resumo)}</p>
        ${a.quando ? `<p><strong>Quando:</strong> ${esc(a.quando)}</p>` : ""}
        ${blocoDocumentos(a)}
        <h4>Passo a passo</h4>${blocoPassos(a)}
        <p><strong>Prazo:</strong> ${esc(a.prazo || DEFAULT_PRAZO)}<br><strong>Custo:</strong> ${esc(a.custo || DEFAULT_CUSTO)}</p>
        ${blocoFaq(a) ? `<h4>Perguntas frequentes</h4>${a.perguntas.map((q) => `<p><strong>${esc(q.p)}</strong><br>${esc(q.r)}</p>`).join("")}` : ""}
        <p class="destaque"><strong>Validação do cartório:</strong> ☐ Aprovado &nbsp; ☐ Aprovado com ajustes &nbsp; ☐ Reprovado<br>Ajustes:${linha}${linha}</p>
      </article>`
      )
      .join("")}</section>`
    )
    .join("");
  const corpo = `
  ${faixa(c, { trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: "Folha de revisão" }], titulo: "Folha de revisão do conteúdo", lead: "Página interna, não indexada, para o cartório conferir cada serviço antes da publicação. Imprima ou envie ajustes por escrito." })}
  <section class="secao secao--suave"><div class="container">${blocos}</div></section>`;
  adicionar(c.caminho, layout(c, { titulo: "Folha de revisão", descricao: "Folha de revisão interna.", corpo, noindex: true }));
}

/* ===================================================================== saída */

if (erros.length) {
  console.error("\nErros que impedem o build:\n" + erros.map((e) => "  ✗ " + e).join("\n") + "\n");
  process.exit(1);
}

rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });

for (const p of paginas) {
  const destino = join(SAIDA, p.caminho);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, p.html);
}

// Ativos estáticos
cpSync(join(RAIZ, "src/css"), join(SAIDA, "assets/css"), { recursive: true });
cpSync(join(RAIZ, "src/js"), join(SAIDA, "assets/js"), { recursive: true });
cpSync(join(RAIZ, "src/img"), join(SAIDA, "assets/img"), { recursive: true });
cpSync(join(RAIZ, "src/fonts"), join(SAIDA, "assets/fonts"), { recursive: true });
if (existsSync(join(RAIZ, "src/public"))) cpSync(join(RAIZ, "src/public"), SAIDA, { recursive: true });
const pastaModelos = join(RAIZ, "content/modelos");
for (const arq of (existsSync(pastaModelos) ? readdirSync(pastaModelos) : []).filter((f) => /\.(pdf|docx?|odt)$/i.test(f))) {
  mkdirSync(join(SAIDA, "modelos"), { recursive: true });
  cpSync(join(pastaModelos, arq), join(SAIDA, "modelos", arq));
}

// robots e sitemap
if (rascunho) {
  writeFileSync(join(SAIDA, "robots.txt"), "User-agent: *\nDisallow: /\n");
} else {
  const base = site.url.replace(/\/?$/, "/");
  const urls = paginas.filter((p) => !p.noindex).map((p) => (p.caminho === "index.html" ? base : new URL(p.caminho, base).href));
  writeFileSync(join(SAIDA, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`);
  writeFileSync(join(SAIDA, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${base}sitemap.xml\n`);
}

console.log(`✓ ${paginas.length} páginas geradas em docs/ (${atos.size} atos, ${especialidades.length} especialidades)${rascunho ? " — modo RASCUNHO" : ""}`);
if (pendencias.length) console.log("\nPendências para publicar:\n" + pendencias.map((p) => "  • " + p).join("\n") + "\n");
