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
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const RAIZ = dirname(fileURLToPath(import.meta.url));
const SAIDA = join(RAIZ, "docs");
const lerJson = (p) => JSON.parse(readFileSync(join(RAIZ, p), "utf8"));
const lerTexto = (p) => readFileSync(join(RAIZ, p), "utf8");

/* ===================================================================== dados */

const site = lerJson("content/site.json");
const temas = lerJson("content/temas.json");
const destaques = lerJson("content/destaques.json");
const linksDados = lerJson("content/links.json");
const inst = lerJson("content/institucional.json");
// Lista FECHADA de sites externos além de wa.me e Google Maps. Só entra aqui o que o responsável aprovou.
const DOMINIOS_APROVADOS = lerJson("scripts/dominios-aprovados.json");
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
for (const [id, l] of Object.entries(linksDados.itens)) {
  let u = null;
  try { u = new URL(l.url); } catch (_) { erros.push(`links.json: "${id}" não é uma URL válida.`); }
  if (u && (u.protocol !== "https:" || !DOMINIOS_APROVADOS.includes(u.host))) erros.push(`links.json: "${id}" aponta para ${u.host}, que não está em scripts/dominios-aprovados.json.`);
  if (u && /jsessionid|sessionid|token|senha/i.test(l.url)) erros.push(`links.json: "${id}" tem identificador de sessão ou segredo na URL; use o endereço limpo.`);
}
for (const g of linksDados.grupos) for (const id of g.itens) if (!linksDados.itens[id]) erros.push(`links.json: o grupo "${g.id}" cita "${id}", que não existe.`);
for (const esp of especialidades) for (const id of esp.linksOnline || []) if (!linksDados.itens[id]) erros.push(`${esp.id}: linksOnline cita "${id}", que não existe em links.json.`);
for (const ato of atos.values()) {
  for (const id of ato.links || []) if (!linksDados.itens[id]) erros.push(`${ato.id}: "links" cita "${id}", que não existe em links.json.`);
  if (ato.validado && (!(ato.documentos || []).length || !(ato.passos || []).length)) erros.push(`${ato.id}: marcado como validado, mas sem documentos ou passos.`);
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
  tela: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  terra: '<path d="M12 21V9"/><path d="M12 13c-4 0-6-2.5-6-6 4 0 6 2 6 6z"/><path d="M12 16c4 0 6-2.5 6-6-4 0-6 2-6 6z"/>',
  moeda: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.7-1.5-1.6 0-2.8.9-2.8 2.1 0 3 5.5 1.6 5.5 4.3 0 1.2-1.2 2.1-2.8 2.1-1.4 0-2.4-.6-3-1.6M12 6v2M12 16v2"/>',
  escudo: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  rota: '<path d="M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M7 17h7a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h7"/>',
};
const icone = (nome) =>
  `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${(ICONES[nome] || "").replace(/<(path|circle|rect)\b/g, '<$1 pathLength="1"')}</svg>`;

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
const fachadaPequena = fachada.real && existsSync(join(RAIZ, "src/img", fotoReal.replace(/(\.\w+)$/, "-720$1")))
  ? fachada.src.replace(/(\.\w+)$/, "-720$1")
  : null;
/** <img> da fachada; com a versão "-720" disponível, o celular baixa só ~20 KB. */
const imgFachada = (c, { sizes, eager = false }) =>
  `<img src="${c.u(fachada.src)}"${fachadaPequena ? ` srcset="${c.u(fachadaPequena)} 720w, ${c.u(fachada.src)} 1441w" sizes="${sizes}"` : ""} width="1441" height="642" alt="${esc(fachadaAlt)}" ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>`;
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
for (const a of atos.values()) {
  if (a.textoIncompleto) {
    pendencias.push(`texto incompleto do cartório em "${a.nomeTecnico}" (termina em "transferir..."): pedir o texto completo`);
    if (!rascunho) erros.push(`${a.id}: o texto do cartório está incompleto.`);
  }
}
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

// Único script inline: marca "js" antes da primeira pintura, define a direção da troca de página e leva ao topo
// toda navegação nova sem #âncora (voltar/avançar e recarregar mantêm a posição).
const SCRIPT_INLINE = 'document.documentElement.classList.add("js");(function(){var R=document.documentElement;function tipo(e){var a=e&&e.activation?e.activation:(window.navigation&&navigation.activation);R.classList.toggle("vt-voltar",!!a&&a.navigationType==="traverse")}addEventListener("pageswap",tipo);addEventListener("pagereveal",tipo);function topo(){var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];if(location.hash||(n&&n.type!=="navigate"))return;scrollTo({top:0,left:0,behavior:"instant"});try{R.style.scrollPaddingTop="0";R.scrollIntoView({block:"start",behavior:"instant"});R.style.removeProperty("scroll-padding-top")}catch(_){}}topo();addEventListener("pagereveal",topo);addEventListener("DOMContentLoaded",topo);addEventListener("load",topo)})()';
const HASH_INLINE = "sha256-" + createHash("sha256").update(SCRIPT_INLINE).digest("base64");
// Pré-carrega as páginas do próprio site quando o visitante aproxima o mouse ou toca (só links internos).
const SPECULATION = JSON.stringify({ prefetch: [{ where: { and: [{ href_matches: "/*" }, { not: { selector_matches: "[target=_blank]" } }] }, eagerness: "moderate" }] });
const HASH_SPECULATION = "sha256-" + createHash("sha256").update(SPECULATION).digest("base64");
// Política de segurança de conteúdo: nada de terceiros, nada de estilo ou script inline além do hash acima.
const CSP_DIRETIVAS = [
  "default-src 'none'",
  `script-src 'self' '${HASH_INLINE}' '${HASH_SPECULATION}'`,
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "manifest-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
];
const CSP_META = CSP_DIRETIVAS.join("; ");
const CSP_CABECALHO = [...CSP_DIRETIVAS, "frame-ancestors 'none'", "upgrade-insecure-requests"].join("; ");

// Minificação simples e segura (sem dependências): tira comentários e espaços sobrando.
const minCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{};])\s*/g, "$1").replace(/;}/g, "}").replace(/,\s+/g, ",").trim();
const minJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !/^\s*\/\//.test(l)).map((l) => l.trim()).filter(Boolean).join("\n");
const MINIFICAR = process.env.MINIFICAR !== "0";
const cssFonte = lerTexto("src/css/style.css");
const jsFonte = lerTexto("src/js/main.js");
const CSS_SAIDA = MINIFICAR ? minCss(cssFonte) : cssFonte;
const JS_SAIDA = MINIFICAR ? minJs(jsFonte) : jsFonte;
const versao = (s) => createHash("sha256").update(s).digest("hex").slice(0, 10);
const V_CSS = versao(CSS_SAIDA);
const V_JS = versao(JS_SAIDA);

function botaoWhats(c, msg, { classe = "btn btn--primario", rotulo = "Falar pelo WhatsApp" } = {}) {
  const href = waUrl(msg);
  if (href) return `<a class="${classe}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${icone("chat")}${esc(rotulo)}</a>`;
  return `<a class="${classe}" href="${c.u("contato.html")}">${icone("chat")}${esc(rotulo)}</a>`;
}
const botaoLigar = (classe = "btn btn--contorno") =>
  telHref ? `<a class="${classe}" href="${telHref}">${icone("telefone")}Ligar para o cartório</a>` : "";
const botaoRota = (classe = "btn btn--primario") =>
  `<a class="${classe}" href="${esc(rotaUrl)}" target="_blank" rel="noopener noreferrer">${icone("rota")}Abrir a rota no mapa<span class="sr-only"> (abre em nova aba)</span></a>`;

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
  if (horario) linhas.push(`<div><dt>${icone("relogio")}Horário de atendimento</dt><dd>${horario}${seloAberto()}</dd></div>`);

  const tel = site.telefone ? `<a href="${telHref}">${esc(site.telefone)}</a>` : aConfirmar("Telefone a confirmar");
  if (tel) linhas.push(`<div><dt>${icone("telefone")}Telefone</dt><dd>${tel}</dd></div>`);

  const zap = site.whatsapp
    ? `<a href="${esc(waUrl(MSG_PADRAO))}" target="_blank" rel="noopener noreferrer">${esc(site.whatsapp)}</a>`
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

// Índice de busca (usado pela paleta em todas as páginas e embutido na página inicial)
const INDICE = [...atos.values()].map((a) => ({ t: a.titulo, e: a.esp.nome, u: a.caminho, d: destaques.includes(a.id) ? 1 : 0, b: buscaIndexada(a) }));
const INDICE_JS = `window.CJ_INDICE=${JSON.stringify(INDICE)};`;
const V_INDICE = versao(INDICE_JS);

// "Aberto agora": o navegador compara a hora de Brasília com este expediente (não considera feriados).
const paraMinutos = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const EXPEDIENTE = site.expediente
  ? JSON.stringify({ d: site.expediente.dias, t: site.expediente.turnos.map(([i, f]) => [paraMinutos(i), paraMinutos(f)]), z: site.expediente.fuso || "America/Sao_Paulo" })
  : null;
const horasTexto = site.horario && site.horario[0] ? site.horario[0].horas : "";
const seloAberto = () =>
  EXPEDIENTE
    ? `<p class="aberto" data-expediente="${esc(EXPEDIENTE)}"><span class="aberto__ponto" aria-hidden="true"></span><strong data-aberto-titulo>Atendimento</strong><span data-aberto-detalhe>${esc(horasTexto)}</span></p>`
    : "";

/** Linha de uma lista aberta: título, uma linha de apoio e seta (sem cartão). */
const linhaLista = (href, titulo, apoio, extra = "") =>
  `<li${extra}><a href="${href}"><span class="lista-aberta__texto"><strong>${esc(titulo)}</strong>${apoio ? `<span>${esc(apoio)}</span>` : ""}</span>${icone("seta")}</a></li>`;

/** Link para site oficial externo: abre em nova aba, com rel seguro e aviso para leitor de tela. */
const linhaExterna = (id) => {
  const l = linksDados.itens[id];
  return `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><span class="lista-aberta__texto"><strong>${esc(l.titulo)}</strong><span>${esc(l.orgao)}. ${esc(l.descricao)}</span></span>${icone("diagonal")}<span class="sr-only"> (abre em nova aba, site externo)</span></a></li>`;
};
const listaExterna = (ids) => `<ul class="lista-aberta lista-aberta--externa">${ids.map(linhaExterna).join("")}</ul>`;
/** Cartão grande e simples para pedir algo pela internet: ícone, nome do órgão, o que é e um botão claro. */
const cartaoOnline = (id) => {
  const l = linksDados.itens[id];
  return `<li class="sol" data-reveal>
    <div class="sol__topo"><span class="sol__icone">${icone(l.icone || "tela")}</span><span class="sol__orgao">${esc(l.orgao)}</span></div>
    <h3>${esc(l.titulo)}</h3>
    <p>${esc(l.descricao)}</p>
    <a class="btn btn--claro" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.botao || "Abrir o site oficial")}${icone("diagonal")}<span class="sr-only"> (abre em nova aba, site externo)</span></a>
  </li>`;
};
/** Cartão do e-Notariado (página interna, sem sair do site). */
const cartaoENotariado = (c) => `<li class="sol" data-reveal>
    <div class="sol__topo"><span class="sol__icone">${icone("tela")}</span><span class="sol__orgao">e-Notariado</span></div>
    <h3>e-Notariado: atos de Notas pelo computador</h3>
    <p>A plataforma digital oficial do Colégio Notarial do Brasil que permite realizar atos em cartórios de notas de forma 100% online.</p>
    <a class="btn btn--claro" href="${c.u("e-notariado.html")}">Saiba como${icone("seta")}</a>
  </li>`;
const gradeOnline = (cartoes, classe = "") => `<ul class="sol-grade${classe}">${cartoes.join("")}</ul>`;
const instTexto = (t) => t.replace(/\{\{nome\}\}/g, esc(site.nome)).replace(/\{\{titular\}\}/g, site.titular ? esc(site.titular) : aConfirmar("a confirmar"));
/** Textos escritos pelo Tabelião, exibidos como foram enviados. Aceita parágrafos, {titulo} e {lista:[[rótulo, texto]]}. */
const blocosTexto = (itens, nivel = 3) =>
  (itens || [])
    .map((b) =>
      typeof b === "string"
        ? `<p>${esc(b)}</p>`
        : b.titulo
          ? `<h${nivel}>${esc(b.titulo)}</h${nivel}>`
          : `<ul class="lista-pontos">${b.lista.map(([r, t]) => `<li><strong>${esc(r)}:</strong> ${esc(t)}</li>`).join("")}</ul>`
    )
    .join("");
const AVISO_EXTERNO = `<p class="nota-pequena">Estes links levam a sites oficiais, fora deste site. Confira o endereço antes de informar dados pessoais.</p>`;

const itemLocalizador = (c, ato, meta) =>
  linhaLista(c.u(ato.caminho), ato.titulo, meta, ` data-finder-item data-busca="${esc(buscaIndexada(ato))}"`);

const rotuloServicos = (n) => `${n} ${n === 1 ? "serviço" : "serviços"}`;

/** Lista dos serviços de uma especialidade; com 8 ou mais, ganha filtro e contagem. */
function listaAtos(c, esp, { id = "esp-busca", duas = false } = {}) {
  const linhas = esp.atos.map((a) => itemLocalizador(c, a, a.resumo)).join("");
  const filtro = esp.atos.length >= 8;
  return `
    <div class="finder" data-finder>
      ${filtro ? `<div class="finder__busca"><label for="${id}">Filtrar os serviços desta especialidade</label><div class="campo">${icone("lupa")}<input id="${id}" type="search" autocomplete="off" placeholder="Ex.: certidão, procuração" data-finder-input></div><p class="finder__status" role="status" aria-live="polite" data-finder-status></p></div>` : ""}
      <p class="finder__total">${rotuloServicos(esp.atos.length)}</p>
      <section class="grupo" data-finder-grupo aria-label="Serviços de ${esc(esp.nome)}"><ul class="lista-aberta${duas ? " lista-aberta--duas" : ""}">${linhas}</ul></section>
      <div class="finder__vazio" hidden data-finder-vazio><p><strong>Não encontramos esse assunto nesta especialidade.</strong> Tente outras palavras ou <a href="${c.u("servicos.html")}">veja todos os serviços</a>.</p></div>
    </div>`;
}

/**
 * Mosaico das especialidades. Sem JavaScript cada cartão é um link para a página da especialidade.
 * Com JavaScript o cartão vira botão: ao tocar, ele abre os serviços (filtrados) e os outros encolhem.
 */
function espBento(c) {
  const itens = especialidades
    .map((e) => {
      const n = e.atos.length;
      return `
        <li class="eb__item eb--${e.id}" id="esp-${e.id}" data-eb-item>
          <a class="eb__cartao" href="${c.u(e.caminho)}" data-eb-cartao>
            <span class="eb__icone">${icone(e.icone)}</span>
            <span class="eb__texto">
              <strong class="eb__nome">${esc(e.nomeCompleto)}</strong>
              <span class="eb__tag">${esc(e.tagline)}</span>
              <span class="eb__prev">${e.opcoes.map((o) => `<span>${esc(o)}</span>`).join("")}</span>
            </span>
            <span class="eb__rodape"><span class="eb__n">${rotuloServicos(n)}</span>${icone("seta")}</span>
          </a>
          <div class="eb__painel" id="eb-${e.id}" role="region" aria-labelledby="eb-t-${e.id}">
            <div class="eb__cab">
              <h3 id="eb-t-${e.id}">Serviços de ${esc(e.nome)}</h3>
              <p>${esc(e.resumo)}</p>
              <p class="eb__acoes"><a href="${c.u(e.caminho)}">Ver a página da especialidade</a><button class="eb__fechar" type="button" data-eb-fechar>Ver todas as especialidades</button></p>
            </div>
            ${listaAtos(c, e, { id: `eb-busca-${e.id}`, duas: true })}
          </div>
        </li>`;
    })
    .join("");
  return `<div class="eb" data-eb><ul class="eb__grade">${itens}
  </ul></div>`;
}

function faixa(c, { trilha, eyebrow, titulo, sub, lead, deco }) {
  const itens = trilha
    .map((t, i) => (i === trilha.length - 1 ? `<li aria-current="page">${esc(t.rotulo)}</li>` : `<li><a href="${c.u(t.href)}">${esc(t.rotulo)}</a></li>`))
    .join("");
  return `
  <div class="faixa escuro">
    ${deco ? `<span class="faixa__deco" aria-hidden="true">${icone(deco)}</span>` : ""}
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
  l.push(site.whatsapp ? `<li>WhatsApp: <a href="${esc(waUrl(MSG_PADRAO))}" target="_blank" rel="noopener noreferrer">${esc(site.whatsapp)}</a></li>` : rascunho ? `<li>${aConfirmar("WhatsApp a confirmar")}</li>` : "");
  l.push(site.email ? `<li>E-mail: <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : rascunho ? `<li>${aConfirmar("E-mail a confirmar")}</li>` : "");
  return l.join("");
};

function cabecalho(c, ativo) {
  const item = (chave, rotulo, href, extra = "", liClasse = "") =>
    `<li${liClasse ? ` class="${liClasse}"` : ""}><a class="menu__link${extra}" href="${c.u(href)}"${ativo === chave ? ' aria-current="page"' : ""}>${rotulo}</a></li>`;
  // Submenu "O que você procura?": serviços mais procurados e as especialidades (sem JavaScript, o item é um link para Serviços).
  const procura = `
          <li class="menu__sub" data-sub>
            <a class="menu__link" href="${c.u("servicos.html")}"${ativo === "servicos" ? ' aria-current="page"' : ""} data-sub-link>O que você procura?${icone("seta")}</a>
            <div class="submenu" id="submenu-procura" role="group" aria-label="O que você procura?">
              <div class="submenu__col">
                <p class="submenu__tit">Mais procurados</p>
                <ul>${destaques.map((ref) => atos.get(ref)).map((a) => `<li><a href="${c.u(a.caminho)}">${esc(a.titulo)}</a></li>`).join("")}</ul>
              </div>
              <div class="submenu__col">
                <p class="submenu__tit">Especialidades</p>
                <ul>${especialidades.map((e) => `<li><a href="${c.u("servicos.html")}#esp-${e.id}">${icone(e.icone)}<span>${esc(e.nomeCompleto)}</span></a></li>`).join("")}</ul>
              </div>
              <p class="submenu__rodape"><a href="${c.u("servicos.html")}">Ver todos os serviços</a><a href="${c.u("modelos/tabela-de-emolumentos-2026.pdf")}" download>${icone("baixar")}Tabela de Emolumentos</a><button class="submenu__buscar" type="button" hidden data-abrir-paleta>${icone("lupa")}Buscar pelo nome</button></p>
            </div>
          </li>`;
  // Submenu "Informações": Quem somos e Contato (sem JavaScript, o item é um link para Quem somos).
  const infoAtivo = ativo === "institucional" || ativo === "contato";
  const informacoes = `
          <li class="menu__sub menu__sub--info" data-sub>
            <a class="menu__link" href="${c.u("institucional.html")}"${infoAtivo ? ' aria-current="page"' : ""} data-sub-link>Informações${icone("seta")}</a>
            <div class="submenu submenu--curto" id="submenu-info" role="group" aria-label="Informações">
              <div class="submenu__col">
                <ul>
                  <li><a href="${c.u("institucional.html")}">${icone("predio")}<span>Quem somos</span></a></li>
                  <li><a href="${c.u("contato.html")}">${icone("pin")}<span>Contato e localização</span></a></li>
                  <li><a href="${c.u("privacidade.html")}">${icone("escudo")}<span>Política de privacidade</span></a></li>
                </ul>
              </div>
            </div>
          </li>`;
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
          ${item("inicio", "Início", "index.html", "", "menu__inicio")}${procura}
          ${item("online", "Solicite online", "solicite-online.html", " menu__link--destaque")}
          ${item("documentos", "Documentos", "documentos.html")}${informacoes}
        </ul>
        <button class="busca-btn" type="button" hidden data-abrir-paleta aria-label="Buscar serviço ou documento">${icone("lupa")}<span>Buscar</span></button>
        ${botaoWhats(c, MSG_PADRAO, { classe: "btn btn--claro", rotulo: "WhatsApp" })}
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
        <p>${esc(enderecoRua)}<br>${esc(enderecoCidade)}</p>
        <ul class="rodape__canais">${rodapeCanais()}</ul>
        ${site.titular ? `<p>Titular: ${esc(site.titular)}</p>` : rascunho ? `<p>Titular: ${aConfirmar("a confirmar")}</p>` : ""}
        ${site.cns ? `<p>CNS: ${esc(site.cns)}</p>` : rascunho ? `<p>CNS: ${aConfirmar("a confirmar")}</p>` : ""}
      </div>
      <div>
        <h2>Especialidades</h2>
        <ul>${especialidades.map((e) => `<li><a href="${c.u(e.caminho)}">${esc(e.nome)}</a></li>`).join("")}</ul>
      </div>
      <div>
        <h2>Informações</h2>
        <ul>
          <li><a href="${c.u("documentos.html")}">Documentos e orientações</a></li>
          <li><a href="${c.u("solicitacoes-terceiros.html")}">Solicitações por terceiros</a></li>
          <li><a href="${c.u("modelos/tabela-de-emolumentos-2026.pdf")}" download>Tabela de Emolumentos</a></li>
          <li><a href="${c.u("solicite-online.html")}">Solicite online</a></li>
          <li><a href="${c.u("e-notariado.html")}">Atos online (e-Notariado)</a></li>
          <li><a href="${c.u("contato.html")}">Localização e atendimento</a></li>
          <li><a href="${c.u("institucional.html")}">Institucional</a></li>
          <li><a href="${c.u("privacidade.html")}">Política de privacidade</a></li>
        </ul>
      </div>
    </div>
    <div class="container rodape__fim">
      <p>© ${new Date().getFullYear()} ${esc(site.nome)}. As orientações deste site são informativas e não substituem o atendimento: os requisitos podem variar conforme o caso. Confira sempre se o contato é um dos canais oficiais listados aqui.</p>
    </div>
  </footer>`;
}

/** Paleta de busca (padrão "Command"): abre com "/" ou Ctrl/⌘+K; o índice é carregado só na primeira abertura. */
function paletaBusca(c) {
  return `<dialog class="paleta" data-paleta aria-label="Buscar serviço ou documento" data-indice="${c.u("assets/js/indice.js")}?v=${V_INDICE}" data-raiz="${c.raiz}">
  <div class="paleta__caixa">
    <div class="busca__campo">${icone("lupa")}<input id="paleta-busca" type="search" role="combobox" aria-expanded="true" aria-controls="paleta-lista" aria-autocomplete="list" autocomplete="off" placeholder="Buscar serviço ou documento" aria-label="Buscar serviço ou documento" data-paleta-input></div>
    <div class="busca__painel paleta__painel" data-paleta-painel>
      <ul class="busca__lista" id="paleta-lista" role="listbox" aria-label="Serviços" data-paleta-lista></ul>
      <div class="busca__vazio" hidden data-paleta-vazio><p><strong>Não encontramos esse assunto.</strong> Tente outras palavras ou fale com o cartório, que indica o serviço certo.</p></div>
    </div>
    <p class="sr-only" role="status" aria-live="polite" data-paleta-status></p>
    <p class="paleta__dica" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> navegar <kbd>Enter</kbd> abrir <kbd>Esc</kbd> fechar</p>
  </div>
</dialog>`;
}

function botaoFlutuante() {
  return `<aside aria-label="Atalho de navegação">
<button class="topo-voltar" type="button" hidden aria-label="Voltar ao topo"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle class="topo-voltar__trilho" cx="24" cy="24" r="21" pathLength="100"/><circle class="topo-voltar__prog" cx="24" cy="24" r="21" pathLength="100"/><path d="M17 27l7-7 7 7" pathLength="1"/></svg></button></aside>`;
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
<meta http-equiv="Content-Security-Policy" content="${esc(CSP_META)}">
<meta name="referrer" content="strict-origin-when-cross-origin">
${bloquear ? '<meta name="robots" content="noindex, nofollow">' : ""}
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(site.nome)}">
<meta property="og:title" content="${esc(tituloCompleto)}">
<meta property="og:description" content="${esc(descricao)}">
<link rel="icon" href="${c.u("assets/img/favicon.svg")}" type="image/svg+xml">
<link rel="preload" href="${c.u(FONTE)}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${c.u("assets/css/style.css")}?v=${V_CSS}">
<script>${SCRIPT_INLINE}</script>
<script src="${c.u("assets/js/main.js")}?v=${V_JS}" defer></script>
<script type="speculationrules">${SPECULATION}</script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : ""}
</head>
<body>
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
${rascunho ? `<aside class="aviso-rascunho" aria-label="Aviso sobre esta versão"><div class="container"><strong>Site demonstrativo.</strong> O CNS é fictício, e os documentos e orientações ainda serão validados pelo cartório antes da publicação.</div></aside>` : ""}
${cabecalho(c, ativo)}
<div class="pagina-corpo">
<main id="conteudo">
${corpo}
${funilContato(c)}
</main>
${rodape(c)}
</div>
${paletaBusca(c)}
${botaoFlutuante()}
</body>
</html>
`;
}


/** Funil "Fale com o cartório": nome → especialidade → documento/serviço → WhatsApp ou e-mail (a mensagem é montada no navegador). */
function funilContato(c) {
  const dados = {
    wa: site.whatsapp ? comPais(site.whatsapp) : null,
    mail: site.emailFormulario || site.email || "",
    esps: especialidades.map((e) => ({ nome: e.nome, atos: e.atos.map((a) => ({ t: a.titulo, d: a.nomeTecnico, e: a.escritura ? 1 : 0 })) })),
  };
  return `
  <section class="secao secao--azul" id="falar" aria-labelledby="t-funil">
    <div class="container">
      <div class="secao__cab secao__cab--centro" data-reveal>
        <p class="eyebrow">Fale com o cartório</p>
        <h2 id="t-funil">Conte o que você precisa</h2>
        <p>Responda em três passos e a sua mensagem sai pronta pelo WhatsApp ou pelo e-mail.</p>
      </div>
      <div class="funil" data-funil data-reveal>
        <p class="funil__sem-js">Para falar com o cartório, use os canais da <a href="${c.u("contato.html")}">página de contato</a>.</p>
        <form class="funil__form" novalidate>
          <div class="funil__passos">
            <div class="funil__passo"><span class="funil__num">1</span><label for="f-nome">Qual é o seu nome?</label><input id="f-nome" type="text" maxlength="80" autocomplete="name" placeholder="Seu nome" data-f-nome></div>
            <div class="funil__passo"><span class="funil__num">2</span><label for="f-esp">Com qual setor você quer falar?</label><select id="f-esp" data-f-esp><option value="">Escolha a especialidade</option></select></div>
            <div class="funil__passo"><span class="funil__num">3</span><label for="f-ato">De qual documento ou serviço você precisa?</label><select id="f-ato" disabled data-f-ato><option value="">Escolha antes a especialidade</option></select></div>
            <fieldset class="funil__modo" hidden data-f-modo><legend>Como prefere fazer a escritura? <span>(opcional)</span></legend>
              <label><input type="radio" name="f-modo" value="p"><span>Presencialmente, no cartório</span></label>
              <label><input type="radio" name="f-modo" value="d"><span>Digitalmente, pelo e-Notariado</span></label>
            </fieldset>
          </div>
          <div class="funil__previa">
            <h3>Sua mensagem</h3>
            <p class="funil__msg is-vazia" role="status" aria-live="polite" data-f-msg>Preencha os passos ao lado e a sua mensagem aparece aqui.</p>
            <button class="funil__copiar" type="button" aria-disabled="true" data-f-copiar>${icone("documento")}Copiar mensagem</button>
            <p class="funil__rotulo">4. Como prefere falar?</p>
            <div class="funil__canais">
              <a class="btn btn--primario" href="#falar" aria-disabled="true" data-f-whats target="_blank" rel="noopener noreferrer">${icone("chat")}WhatsApp</a>
              <a class="btn btn--contorno" href="#falar" aria-disabled="true" data-f-email>${icone("email")}E-mail</a>
            </div>
            <p class="funil__dica" role="status" aria-live="polite" data-f-dica></p>
          </div>
        </form>
        <script type="application/json" id="dados-funil">${JSON.stringify(dados).replace(/</g, "\\u003c")}</script>
      </div>
    </div>
  </section>`;
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
          <a class="btn btn--vidro" href="#falar">${icone("chat")}Falar com o cartório</a>
        </div>
      </div>
      <figure class="hero__foto">
        <div class="hero__moldura">${imgFachada(c, { sizes: "(max-width: 52rem) 100vw, 45vw", eager: true })}</div>
        ${
          EXPEDIENTE
            ? `<div class="flutuante flutuante--b" data-expediente="${esc(EXPEDIENTE)}"><span class="flutuante__icone">${icone("relogio")}</span><div><strong data-aberto-titulo>Atendimento</strong><small data-aberto-detalhe>${esc(horasTexto)}</small></div></div>`
            : `<div class="flutuante flutuante--b"><span class="flutuante__icone">${icone("check")}</span><div><strong>Documentos antes de vir</strong><small>lista para cada serviço</small></div></div>`
        }
      </figure>
    </div>
  </section>`;

  const maisProcurados = destaques
    .map((ref) => atos.get(ref))
    .map((a) => linhaLista(c.u(a.caminho), a.titulo, a.esp.nome))
    .join("");

  const indiceBusca = JSON.stringify(INDICE.map((x) => ({ ...x, u: c.u(x.u) }))).replace(/</g, "\\u003c");

  const painel = `
  <div class="container painel-flutuante" id="encontrar">
    <div class="painel">
      <div class="painel__cab">
        <h2>O que você precisa fazer?</h2>
        <p>Escreva com suas palavras ou escolha um serviço abaixo.</p>
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
      <section class="mais" aria-labelledby="t-mais">
        <h3 id="t-mais">Mais procurados</h3>
        <ul class="lista-aberta lista-aberta--duas">${maisProcurados}</ul>
      </section>
    </div>
    <script type="application/json" id="indice-busca">${indiceBusca}</script>
  </div>`;

  const online = `
  <section class="secao" id="online-home" aria-labelledby="t-online-home">
    <div class="container">
      <div class="secao__cab" data-reveal>
        <p class="eyebrow">Sem sair de casa</p>
        <h2 id="t-online-home">Solicite online</h2>
        <p>Peça certidões e faça atos de cartório pela internet. Escolha o que você precisa.</p>
      </div>
      ${gradeOnline([cartaoOnline("registro-civil"), cartaoOnline("cenprot"), cartaoOnline("rtdpj"), cartaoENotariado(c), cartaoOnline("certificado-enotariado")], " sol-grade--tres")}
      <p class="sol__todos" data-reveal><a class="btn btn--vidro" href="${c.u("solicite-online.html")}">Ver todas as opções online${icone("seta")}</a></p>
    </div>
  </section>`;

  const passos = `
  <section class="secao secao--passos" id="como-funciona-home" aria-labelledby="t-passos">
    <div class="container">
      <h2 class="passos3__tit" id="t-passos" data-reveal>Sem burocracia: resolva em 3 passos</h2>
      <ol class="passos3" data-reveal>
        <li><a href="#encontrar"><span class="passos3__n">1</span><span><strong>Encontre o serviço</strong><small>Escreva o que você precisa, sem saber o nome técnico.</small></span></a></li>
        <li><a href="${c.u("documentos.html")}"><span class="passos3__n">2</span><span><strong>Veja os documentos</strong><small>Confira a lista antes de sair de casa.</small></span></a></li>
        <li><a href="${c.u("solicite-online.html")}"><span class="passos3__n">3</span><span><strong>Peça online ou venha</strong><small>Solicite pela internet ou fale com o cartório.</small></span></a></li>
      </ol>
    </div>
  </section>`;

  const quem = `
  <section class="secao" id="quem-somos" aria-labelledby="t-quem">
    <div class="container">
      <div class="quem" data-reveal>
        <div class="quem__texto">
          <p class="eyebrow">Institucional</p>
          <h2 id="t-quem">Conheça o cartório</h2>
          <p>${instTexto(inst.intro)}</p>
          <p class="lema__rotulo">${esc(inst.lemaRotulo)}</p><blockquote class="lema"><p>${esc(inst.lema)}</p></blockquote>
          <p><a class="btn btn--claro" href="${c.u("institucional.html")}">Quem somos e nossa missão${icone("seta")}</a></p>
        </div>
        <ul class="quem__missao" aria-label="Nossa missão">
          ${inst.missao.map((m) => `<li><span class="quem__icone">${icone(m.icone)}</span><span><strong>${esc(m.titulo)}</strong><small>${esc(m.texto)}</small></span></li>`).join("")}
        </ul>
      </div>
    </div>
  </section>`;

  const servicos = `
  <section class="secao" id="servicos" aria-labelledby="t-servicos">
    <div class="container">
      <div class="secao__cab" data-reveal>
        <p class="eyebrow">Serviços</p>
        <h2 id="t-servicos">Escolha a especialidade</h2>
        <p>Toque em uma especialidade para ver os serviços dela.</p>
      </div>
      <div data-reveal>${espBento(c)}</div>
      <p class="antes" id="antes-de-vir" data-reveal><strong>Antes de vir ao cartório:</strong>
        <a href="${c.u("documentos.html#consultar")}">Documentos necessários</a>
        <a href="${c.u("documentos.html#orientacoes")}">Orientações</a>
        <a href="${c.u("documentos.html#modelos")}">Modelos e formulários</a>
        <a href="${c.u("solicitacoes-terceiros.html")}">Solicitações por terceiros</a>
        <a href="${c.u("solicite-online.html")}">Solicite online</a>
      </p>
    </div>
  </section>`;

  const atendimento = `
  <section class="secao secao--suave" id="atendimento" aria-labelledby="t-atendimento">
    <div class="container">
      <div class="secao__cab" data-reveal>
        <p class="eyebrow">Localização e atendimento</p>
        <h2 id="t-atendimento">Como chegar e quando ir</h2>
      </div>
      <div class="atend">
        <div class="info-aberta" data-reveal>
          ${dadosContato()}
          <div class="atend__acoes">
            ${botaoRota("btn btn--claro")}
            ${botaoLigar("btn btn--vidro")}
          </div>
        </div>
        <figure class="atend__foto" data-reveal>
          ${imgFachada(c, { sizes: "(max-width: 52rem) 100vw, 50vw" })}
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
      corpo: hero + painel + passos + online + servicos + quem + atendimento,
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
    lead: "Cada serviço tem a sua própria lista de documentos. Comece pela especialidade ou use a busca.",
  })}
  <section class="secao" aria-labelledby="t-todos">
    <div class="container">
      <div class="secao__cab" data-reveal><h2 id="t-todos">Escolha a especialidade</h2><p>Toque em uma para ver os serviços dela. Não sabe qual é? <button class="link-botao so-js" type="button" data-abrir-paleta hidden>Busque pelo que você precisa</button><span class="sem-js">Use a busca da página inicial.</span></p></div>
      ${espBento(c)}
    </div>
  </section>`;
  adicionar(c.caminho, layout(c, { ativo: "servicos", titulo: "Todos os serviços do cartório", descricao: "Veja todos os serviços do cartório por especialidade: Notas, Protesto, Registro de Títulos e Documentos e Registro Civil. Cada um com os documentos necessários.", corpo }));
}

// ---------- Páginas de especialidade
for (const esp of especialidades) {
  const c = ctx(esp.caminho);
  const outras = especialidades.filter((e) => e !== esp);
  const corpo = `
  ${faixa(c, {
    trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: "Serviços", href: "servicos.html" }, { rotulo: esp.nome }],
    eyebrow: "Especialidade",
    deco: esp.icone,
    titulo: esp.nomeCompleto,
    lead: esp.descricao,
  })}
  <section class="secao">
    <div class="container">
      ${(esp.textoCartorio || []).length ? `<div class="bloco bloco--texto" data-reveal>${typeof esp.textoCartorio[0] === "object" && esp.textoCartorio[0].titulo ? "" : `<h2>Sobre o ${esc(esp.nomeCompleto)}</h2>`}${blocosTexto(esp.textoCartorio, 2)}</div>` : ""}
      ${esp.aviso ? `<div class="destaque"><p><strong>Qual a diferença?</strong> ${esc(esp.aviso)}</p></div>` : ""}
      <div class="secao__cab" data-reveal>
        <h2>O que você precisa fazer?</h2>
        <p>Escolha o serviço para ver os documentos e como funciona.</p>
      </div>
      ${listaAtos(c, esp)}
      ${
        (esp.linksOnline || []).length || esp.id === "notas"
          ? `<div class="duas-colunas duas-colunas--espaco">${
              esp.id === "notas"
                ? `<div class="bloco" data-reveal><h3>Prefere fazer pelo computador?</h3><p>O e-Notariado permite realizar atos de cartórios de notas de forma online, com videoconferência com o tabelião e assinatura por certificado digital. Ao pedir uma escritura, diga se prefere digital ou presencial.</p><p><a class="btn btn--claro" href="${c.u("e-notariado.html")}">Conheça o e-Notariado</a></p></div>`
                : ""
            }${
              (esp.linksOnline || []).length
                ? `<div class="bloco bloco--online" data-reveal><h3>Solicite online</h3>${gradeOnline(esp.linksOnline.map(cartaoOnline))}<p class="sol__todos"><a href="${c.u("solicite-online.html")}">Ver todas as opções online</a></p></div>`
                : ""
            }</div>`
          : ""
      }
      <div class="duas-colunas duas-colunas--espaco">
        <div class="bloco" data-reveal>
          <h3>Não encontrou o que procura?</h3>
          <p>Fale com o cartório. O atendimento indica qual serviço atende o seu caso.</p>
          ${botaoWhats(c, `Olá! Preciso de informação sobre ${esp.nome}.`, { classe: "btn btn--claro", rotulo: "Falar com o cartório" })}
        </div>
        <div class="bloco" data-reveal>
          <h3>Outras especialidades</h3>
          <ul class="lista-aberta">
            ${outras.map((e) => linhaLista(c.u(e.caminho), e.nomeCompleto, e.tagline)).join("")}
          </ul>
        </div>
      </div>
    </div>
  </section>`;
  adicionar(c.caminho, layout(c, { ativo: "servicos", titulo: `${esp.nomeCompleto}: serviços e documentos`, descricao: `${esp.nomeCompleto}: ${esp.resumo} Veja os serviços e os documentos necessários.`, corpo }));
}

// ---------- Páginas de ato (com requisitos)
const DEFAULT_PRAZO = "Verificar com o cartório.";
const DEFAULT_CUSTO = "Verificar com o cartório.";

const tamanhoArquivo = (arq) => {
  const kb = statSync(join(RAIZ, "content/modelos", arq)).size / 1024;
  return kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
};
/** Linha padrão de arquivo para baixar: título, tipo, tamanho, data e (opcional) onde se aplica. */
const linhaModelo = (c, m, onde) => {
  const partes = [extname(m.arquivo).slice(1).toUpperCase(), tamanhoArquivo(m.arquivo)];
  if (m.atualizadoEm) partes.push(`atualizado em ${dataBr(m.atualizadoEm)}`);
  if (m.descricao) partes.push(m.descricao);
  if (onde) partes.push(onde);
  return `<li><a href="${c.u("modelos/" + m.arquivo)}" download>${icone("baixar")}<span>${esc(m.titulo)}<small>${esc(partes.join(" · "))}</small></span></a></li>`;
};

const itemDoc = (i) =>
  typeof i === "string"
    ? `<li><label><input type="checkbox"><span class="checklist__texto">${esc(i)}</span></label></li>`
    : `<li><label><input type="checkbox"><span class="checklist__texto">${esc(i.texto)}${i.obs ? `<span class="checklist__obs">${esc(i.obs)}</span>` : ""}</span></label></li>`;
const blocoDocumentos = (a) =>
  (a.documentos || [])
    .map((g) => `<div class="checklist-grupo"><h3>${esc(g.grupo)}</h3><ul class="checklist">${g.itens.map(itemDoc).join("")}</ul></div>`)
    .join("");
const blocoPassos = (a) => ((a.passos || []).length ? `<ol class="passos">${a.passos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>` : "");
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
    ...((ato.texto || []).length ? [["sobre", "Sobre o serviço"]] : []),
    ["documentos", "Documentos"],
    ...((ato.passos || []).length ? [["como-funciona", "Como funciona"]] : []),
    ["prazo-custo", "Prazo e custo"],
    ...((ato.links || []).length ? [["online", "Emitir online"]] : []),
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
    deco: esp.icone,
    titulo: ato.titulo,
    sub: ato.nomeTecnico,
    lead: ato.resumo,
  })}
  <div class="container pagina">
    <article class="pagina__principal folha">
      <nav aria-label="Nesta página"><ul class="ancoras">${ancoras.map(([id, r]) => `<li><a href="#${id}">${r}</a></li>`).join("")}</ul></nav>

      ${(ato.texto || []).length ? `<section id="sobre"><h2>Sobre este serviço</h2><div class="texto-cartorio">${blocosTexto(ato.texto)}${ato.textoIncompleto && rascunho ? `<p>${aConfirmar("Texto a completar pelo cartório")}</p>` : ""}</div></section>` : ""}

      ${ato.quando ? `<section id="quando"><h2>Quando é necessário</h2><p class="resumo-ato">${esc(ato.quando)}</p></section>` : ""}

      ${
        (ato.documentos || []).length
          ? `<section id="documentos" data-checklist>
        <h2>Documentos necessários ${selo}</h2>
        <div class="progresso"><span data-progresso-texto role="status"></span><span class="progresso__barra"><i data-progresso-barra></i></span></div>
        ${blocoDocumentos(ato)}
        <p class="nota-final">O cartório pode pedir documentos adicionais conforme o caso. Na dúvida, fale com o atendimento antes de vir.</p>
        <p class="no-print"><button class="btn btn--contorno so-js" type="button" data-imprimir>${icone("imprimir")}Imprimir esta lista</button></p>
      </section>`
          : `<section id="documentos">
        <h2>Documentos necessários ${selo}</h2>
        <div class="destaque"><p><strong>A lista de documentos deste serviço será confirmada pelo cartório.</strong> Enquanto isso, fale com o atendimento para saber o que levar no seu caso.</p>${botaoWhats(c, msg, { classe: "btn btn--primario", rotulo: "Perguntar ao cartório" })}</div>
      </section>`
      }

      ${
        (ato.passos || []).length
          ? `<section id="como-funciona">
        <h2>Como funciona</h2>
        ${ato.escritura ? `<div class="destaque"><p><strong>Digital ou presencial?</strong> Ao solicitar a escritura, diga se pretende fazer digitalmente, pelo <a href="${c.u("e-notariado.html")}">e-Notariado</a>, ou assinar de forma presencial.</p></div>` : ""}
        ${blocoPassos(ato)}
      </section>`
          : ""
      }

      <section id="prazo-custo">
        <h2>Prazo e custo</h2>
        <dl class="prazo-custo">
          <div><dt>Prazo</dt><dd>${esc(ato.prazo || DEFAULT_PRAZO)}</dd></div>
          <div><dt>Custo</dt><dd>${esc(ato.custo || DEFAULT_CUSTO)}</dd></div>
        </dl>
      </section>

      ${(ato.links || []).length ? `<section id="online"><h2>Emita online</h2><p>Certidões e serviços que você mesmo pode pedir na internet. Pergunte ao cartório quais deles o seu caso exige.</p>${listaExterna(ato.links)}${AVISO_EXTERNO}</section>` : ""}

      ${(ato.perguntas || []).length ? `<section id="duvidas"><h2>Perguntas frequentes</h2>${blocoFaq(ato)}</section>` : ""}

      ${
        (ato.modelos || []).length
          ? `<section id="modelos"><h2>Modelos e formulários</h2><ul class="downloads">${ato.modelos.map((m) => linhaModelo(c, m)).join("")}</ul></section>`
          : ""
      }

      ${
        (ato.verTambem || []).length
          ? `<section id="relacionados" class="no-print"><h2>Veja também</h2><ul class="lista-aberta">${ato.verTambem
              .map((ref) => atos.get(ref))
              .map((o) => linhaLista(c.u(o.caminho), o.titulo, o.esp.nome))
              .join("")}</ul></section>`
          : ""
      }

      <div class="imprimir-rodape">${esc(site.nome)} · ${esc(enderecoRua)}, ${esc(enderecoCidade)}. Lista informativa: o cartório pode pedir documentos adicionais.</div>
    </article>

    <aside class="pagina__lateral" aria-label="Ajuda">
      <div class="lateral-card lateral-card--ajuda">
        <h2>Ficou com dúvida?</h2>
        <p>Fale com o cartório antes de vir. É rápido e evita uma viagem perdida.</p>
        ${botaoWhats(c, msg, { classe: "btn btn--claro btn--cheio", rotulo: "Falar pelo WhatsApp" })}
        ${botaoLigar("btn btn--vidro btn--cheio")}
        <p class="nota-pequena">${esc(enderecoRua)}<br>${esc(enderecoCidade)}</p>
      </div>
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
        <div class="bloco" data-reveal>
          <h3>Documentos mais comuns</h3>
          <ul class="lista-pontos">
            <li>Documento de identificação oficial com foto, original (RG, CNH ou outro aceito em lei).</li>
            <li>CPF.</li>
            <li>Comprovante de residência recente.</li>
            <li>Certidões de estado civil atualizadas (nascimento, casamento, óbito), conforme o caso.</li>
            <li>Procuração, se for representar outra pessoa.</li>
          </ul>
        </div>
        <div class="bloco" data-reveal>
          <h3>Antes de sair de casa</h3>
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
      <div class="secao__cab" data-reveal><p class="eyebrow">Consultar por serviço</p><h2 id="t-consultar">Qual serviço você precisa?</h2><p>Toque na especialidade e escolha o serviço para ver a lista exata de documentos.</p></div>
      ${espBento(c)}
    </div>
  </section>

  <section class="secao" id="online" aria-labelledby="t-online">
    <div class="container container--leitura">
      <div class="secao__cab" data-reveal><p class="eyebrow">Sem sair de casa</p><h2 id="t-online">Certidões e pedidos na internet</h2><p>Os pedidos online têm uma página própria, com botões diretos para cada site oficial.</p></div>
      <p data-reveal><a class="btn btn--claro" href="${c.u("solicite-online.html")}">Ir para Solicite online${icone("seta")}</a></p>
    </div>
  </section>

  <section class="secao" id="terceiros" aria-labelledby="t-terceiros">
    <div class="container container--leitura">
      <div class="secao__cab" data-reveal><p class="eyebrow">Certidões pedidas por outra pessoa</p><h2 id="t-terceiros">Solicitações por terceiros</h2><p>Precisa de uma certidão de outra pessoa? Baixe o requerimento, preencha e assine.</p></div>
      <p data-reveal><a class="btn btn--claro" href="${c.u("solicitacoes-terceiros.html")}">Ver os requerimentos${icone("seta")}</a></p>
    </div>
  </section>

  <section class="secao secao--suave" id="modelos" aria-labelledby="t-modelos">
    <div class="container">
      <div class="secao__cab" data-reveal><p class="eyebrow">Modelos</p><h2 id="t-modelos">Modelos e formulários</h2></div>
      ${
        todosModelos.length
          ? `<ul class="downloads downloads--estreito">${todosModelos.map((m) => linhaModelo(c, m, `${m.ato.esp.nome} → ${m.ato.titulo}`)).join("")}</ul>`
          : `<div class="destaque destaque--estreito"><p>Os modelos e formulários em PDF serão disponibilizados aqui assim que o cartório validar o conteúdo. Enquanto isso, fale com o atendimento para receber o modelo do seu caso.</p></div>`
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
      <div class="info-aberta">
        ${dadosContato()}
        <div class="atend__acoes">
          ${botaoRota("btn btn--claro")}
          ${botaoLigar("btn btn--vidro")}
          ${botaoWhats(c, MSG_PADRAO, { classe: "btn btn--vidro", rotulo: "Falar pelo WhatsApp" })}
        </div>
        <p class="nota-pequena">Confira sempre se o contato é um dos canais oficiais divulgados neste site.</p>
      </div>
      <figure class="atend__foto">
        ${imgFachada(c, { sizes: "(max-width: 52rem) 100vw, 50vw" })}
        <figcaption>${icone("pin")}Procure pela fachada na ${esc(end.logradouro)}, nº ${esc(end.numero)}</figcaption>
      </figure>
    </div>
  </section>`;
  adicionar(c.caminho, layout(c, { ativo: "contato", titulo: "Contato e localização", descricao: `Endereço, horário de atendimento, telefone e rota até o ${site.nome}, ${enderecoRua}, ${end.cidade}/${end.uf}.`, corpo }));
}

// ---------- Solicite online (todas as opções pela internet)
{
  const c = ctx("solicite-online.html");
  const msg = "Olá! Gostaria de ajuda para solicitar um serviço pela internet.";
  const g = (id) => linksDados.grupos.find((x) => x.id === id);
  const corpo = `
  ${faixa(c, {
    trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: "Solicite online" }],
    eyebrow: "Sem sair de casa",
    titulo: "Solicite online",
    lead: "Peça certidões e faça atos de cartório pela internet, nos sites oficiais. Escolha o que você precisa e toque no botão.",
  })}
  <section class="secao" id="certidoes-cartorio" aria-labelledby="t-sol-1">
    <div class="container">
      <div class="secao__cab" data-reveal><h2 id="t-sol-1">Peça uma certidão ou faça um ato</h2><p>Certidões de nascimento, casamento e óbito, protestos, títulos e documentos, e atos de notas pelo computador.</p></div>
      ${gradeOnline([...g("pedidos").itens.map(cartaoOnline), cartaoENotariado(c), cartaoOnline("certificado-enotariado")], " sol-grade--tres")}
    </div>
  </section>
  <section class="secao secao--suave" id="imoveis-negocios" aria-labelledby="t-sol-2">
    <div class="container">
      <div class="secao__cab" data-reveal><h2 id="t-sol-2">Certidões e serviços para imóveis, negócios e doações</h2><p>${esc(g("certidoes").intro)}</p></div>
      ${gradeOnline([...g("certidoes").itens, ...g("impostos").itens].map(cartaoOnline), " sol-grade--tres")}
      ${AVISO_EXTERNO}
      <div class="bloco" data-reveal><h3>Pedir certidão de outra pessoa?</h3><p>Baixe o requerimento de solicitação por terceiros, preencha e assine.</p><p><a class="btn btn--claro" href="${c.u("solicitacoes-terceiros.html")}">Solicitações por terceiros${icone("seta")}</a></p></div>
      <div class="bloco" data-reveal><h3>Não achou o que procura?</h3><p>Fale com o cartório. O atendimento indica o caminho certo.</p><p>${botaoWhats(c, msg, { classe: "btn btn--claro", rotulo: "Falar com o cartório" })}</p></div>
    </div>
  </section>`;
  adicionar(c.caminho, layout(c, { ativo: "online", titulo: "Solicite online: certidões e atos pela internet", descricao: "Peça certidões de nascimento, casamento e óbito, protestos, títulos e documentos e outros serviços de cartório pela internet, nos sites oficiais.", corpo }));
}

// ---------- e-Notariado (atos pelo computador)
{
  const c = ctx("e-notariado.html");
  const msg = "Olá! Gostaria de fazer uma escritura de forma digital, pelo e-Notariado.";
  const corpo = `
  ${faixa(c, {
    trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: "e-Notariado" }],
    eyebrow: "Atos online",
    titulo: "e-Notariado",
    lead: "O e-Notariado é a plataforma digital oficial do Colégio Notarial do Brasil que permite realizar atos em cartórios de notas de forma 100% online.",
  })}
  <section class="secao">
    <div class="container container--leitura">
      <div class="bloco bloco--texto" data-reveal>
        <h2>Plataforma e-Notariado</h2>
        <p>O e-Notariado é a plataforma digital gerida pelo Colégio Notarial do Brasil – Conselho Federal, que conecta os usuários aos serviços oferecidos pelos cartórios de notas em todo o Brasil.</p>
      </div>
      <div class="bloco bloco--texto" data-reveal>
        <h2>O que é um ato notarial online</h2>
        <p>A partir da publicação do Provimento nº 100/2020, cidadãos de todo o País podem realizar atos notariais de forma online, por meio da plataforma e-Notariado, que oferece segurança jurídica e os mesmos efeitos de um ato realizado de forma presencial no cartório de notas. Todo ato notarial online contará com videoconferência entre o requerente e o tabelião, e a assinatura da parte por meio de certificado digital.</p>
      </div>
      <div class="bloco" data-reveal>
        <h3>Como pedir no nosso cartório</h3>
        <p>No Tabelionato de Notas, na hora de solicitar uma escritura, <strong>diga se prefere fazer digitalmente, pelo e-Notariado, ou assinar de forma presencial</strong>. Você pode dizer isso pelo formulário "Fale com o cartório" no fim de cada página (ele pergunta quando o serviço é uma escritura) ou direto no WhatsApp.</p>
        <p class="antes">${botaoWhats(c, msg, { classe: "btn btn--claro", rotulo: "Pedir de forma digital" })}<a class="btn btn--vidro" href="${c.u("servicos/" + especialidades[0].slug + ".html")}">Ver os serviços de Notas</a></p>
      </div>
      <div class="bloco" data-reveal>
        <h3>Certificado digital</h3>
        <p>Para assinar de forma online, é preciso ter o certificado digital do e-Notariado.</p>
        <p class="antes">${(() => { const l = linksDados.itens["certificado-enotariado"]; return `<a class="btn btn--claro" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.botao)}${icone("diagonal")}<span class="sr-only"> (abre em nova aba, site externo)</span></a>`; })()}</p>
      </div>
    </div>
  </section>`;
  adicionar(c.caminho, layout(c, { titulo: "e-Notariado: atos de cartório pelo computador", descricao: "Saiba como fazer atos de cartório de notas de forma online, pelo e-Notariado, com videoconferência e certificado digital.", corpo }));
}

// ---------- Institucional / Quem somos
{
  const c = ctx("institucional.html");
  const facilita = [
    ["documento", "Veja os documentos antes de vir", "Cada serviço tem a lista do que levar, para você não fazer duas viagens.", "documentos.html", "Ver documentos"],
    ["tela", "Peça certidões pela internet", "Registro civil, protestos, títulos e documentos e outros, nos sites oficiais.", "solicite-online.html", "Solicite online"],
    ["chat", "Fale pelo WhatsApp", "Tire a dúvida antes de vir. A mensagem já sai pronta pelo formulário.", "index.html#falar", "Falar com o cartório"],
    ["pin", "Saiba como chegar e o horário", "Endereço, mapa com a rota e se o cartório está aberto agora.", "contato.html", "Ver localização"],
  ];
  const corpo = `
  ${faixa(c, {
    trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: "Quem somos" }],
    eyebrow: "Institucional",
    titulo: "Quem somos",
    lead: inst.chamada,
  })}
  <section class="secao" id="cartorio" aria-labelledby="t-cartorio">
    <div class="container container--leitura">
      ${preencher("{{avisoRevisao}}")}
      <nav aria-label="Nesta página" class="inst-nav"><ul class="ancoras"><li><a href="#cartorio">O cartório</a></li><li><a href="#missao">Missão</a></li><li><a href="#sem-burocracia">Menos burocracia</a></li><li><a href="#especialidades">Especialidades</a></li><li><a href="#transparencia">Transparência</a></li></ul></nav>
      <div class="secao__cab" data-reveal><h2 id="t-cartorio">${esc(inst.titulo)}</h2></div>
      <p class="inst-intro" data-reveal>${instTexto(inst.intro)}</p>
      <p class="lema__rotulo" data-reveal>${esc(inst.lemaRotulo)}</p>
      <blockquote class="lema lema--grande" data-reveal><p>${esc(inst.lema)}</p></blockquote>
    </div>
  </section>
  <section class="secao secao--suave" id="missao" aria-labelledby="t-missao">
    <div class="container">
      <div class="secao__cab" data-reveal><h2 id="t-missao">NOSSA MISSÃO</h2><p>${esc(inst.missaoIntro)}</p><p>${esc(inst.missaoLista)}</p></div>
      <ul class="sol-grade sol-grade--quatro">${inst.missao.map((m) => `<li class="sol sol--texto" data-reveal><div class="sol__topo"><span class="sol__icone">${icone(m.icone)}</span></div><h3>${esc(m.titulo)}</h3><p>${esc(m.texto)}</p></li>`).join("")}</ul>
      <p class="inst-fecho" data-reveal>${esc(inst.fecho)}</p>
    </div>
  </section>
  <section class="secao" id="sem-burocracia" aria-labelledby="t-sem">
    <div class="container">
      <div class="secao__cab" data-reveal><p class="eyebrow">Para você</p><h2 id="t-sem">Menos burocracia, mais clareza</h2><p>Cartório não precisa ser complicado. Este site existe para você saber o que fazer, o que levar e como pedir, antes de sair de casa.</p></div>
      <ul class="sol-grade sol-grade--quatro">${facilita.map(([ic, t, d, href, bt]) => `<li class="sol" data-reveal><div class="sol__topo"><span class="sol__icone">${icone(ic)}</span></div><h3>${esc(t)}</h3><p>${esc(d)}</p><a class="btn btn--claro" href="${c.u(href)}">${esc(bt)}${icone("seta")}</a></li>`).join("")}</ul>
    </div>
  </section>
  <section class="secao secao--suave" id="especialidades" aria-labelledby="t-esps">
    <div class="container container--leitura">
      <div class="secao__cab" data-reveal><h2 id="t-esps">Cinco especialidades no mesmo endereço</h2><p>${esc(enderecoRua)}, ${esc(enderecoCidade)}.</p></div>
      <ul class="lista-aberta" data-reveal>${especialidades.map((e) => linhaLista(c.u(e.caminho), e.nomeCompleto, e.resumo)).join("")}</ul>
    </div>
  </section>
  <section class="secao" id="transparencia" aria-labelledby="t-transp">
    <div class="container container--leitura">
      <div class="secao__cab" data-reveal><h2 id="t-transp">Transparência e atendimento</h2></div>
      <div class="prosa prosa--inst">${preencher(lerTexto("content/paginas/institucional.html").replace("{{avisoRevisao}}", ""))}</div>
    </div>
  </section>`;
  adicionar(c.caminho, layout(c, { ativo: "institucional", titulo: "Quem somos (Institucional)", descricao: `Conheça o ${site.nome}: quem somos, nossa missão, as cinco especialidades, transparência e atendimento.`, corpo }));
}

// ---------- Páginas de texto (fragmentos em content/paginas/)
function preencher(html, extras = {}) {
  const dpo = site.encarregadoLgpd || {};
  const mailto = (e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`;
  const encarregado = dpo.email
    ? `${dpo.nome ? esc(dpo.nome) + ", " : ""}${mailto(dpo.email)}${dpo.telefone ? `, ${esc(dpo.telefone)}` : ""}`
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
    emailCartorio: site.email ? mailto(site.email) : aConfirmar("e-mail a confirmar"),
    telefoneCartorio: site.whatsapp ? esc(site.whatsapp) : aConfirmar("telefone a confirmar"),
    emailDpo: dpo.email ? mailto(dpo.email) : aConfirmar("a confirmar"),
    telefoneDpo: dpo.telefone ? esc(dpo.telefone) : aConfirmar("a confirmar"),
    atualizadoEm: site.privacidadeAtualizadaEm ? dataBr(site.privacidadeAtualizadaEm) : aConfirmar("data a confirmar"),
    especialidades: `<ul>${especialidades.map((e) => `<li><strong>${esc(e.nomeCompleto)}:</strong> ${esc(e.resumo)}</li>`).join("")}</ul>`,
  };
  Object.assign(vars, extras);
  return html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) { erros.push(`Fragmento usa {{${k}}}, que não existe.`); return ""; }
    return vars[k];
  });
}
{
  const c = ctx("privacidade.html");
  const titulo = "Política de privacidade";
  const corpo = `
  ${faixa(c, { trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: titulo }], titulo })}
  <section class="secao"><div class="container prosa">${preencher(lerTexto("content/paginas/privacidade.html"), { linkPolitica: c.u("politica-lgpd.html") })}</div></section>`;
  adicionar(c.caminho, layout(c, { titulo, descricao: `Como o ${site.nome} trata dados pessoais: resumo e link para a política completa.`, corpo }));
}
{
  const c = ctx("politica-lgpd.html");
  const titulo = "Política de privacidade e LGPD";
  const corpo = `
  ${faixa(c, { trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: "Política de privacidade", href: "privacidade.html" }, { rotulo: titulo }], titulo })}
  <section class="secao"><div class="container prosa">${preencher(lerTexto("content/paginas/politica-lgpd.html"))}</div></section>`;
  adicionar(c.caminho, layout(c, { titulo, descricao: `Política de privacidade e LGPD completa do ${site.nome}.`, corpo }));
}

// ---------- Solicitações por terceiros (requerimentos para baixar)
{
  const c = ctx("solicitacoes-terceiros.html");
  const sol = lerJson("content/solicitacoes.json");
  for (const i of sol.itens) if (!existsSync(join(RAIZ, "content/modelos", i.arquivo))) erros.push(`solicitacoes.json: "${i.arquivo}" não existe em content/modelos/.`);
  const corpo = `
  ${faixa(c, {
    trilha: [{ rotulo: "Início", href: "index.html" }, { rotulo: sol.titulo }],
    eyebrow: sol.eyebrow,
    titulo: sol.titulo,
    lead: sol.lead,
  })}
  <section class="secao" id="requerimentos" aria-labelledby="t-req">
    <div class="container container--leitura">
      <div class="secao__cab" data-reveal><h2 id="t-req">Baixe, preencha e assine</h2><p>${esc(sol.intro)}</p></div>
      <ul class="downloads downloads--estreito">${sol.itens.map((m) => linhaModelo(c, m)).join("")}</ul>
      ${sol.avisos.map((a) => `<div class="destaque destaque--estreito" data-reveal><p>${esc(a)}</p></div>`).join("")}
      <p data-reveal>${botaoWhats(c, "Olá! Gostaria de ajuda com um requerimento de certidão.", { classe: "btn btn--claro", rotulo: "Falar com o cartório" })}</p>
    </div>
  </section>`;
  adicionar(c.caminho, layout(c, { titulo: sol.titulo, descricao: "Requerimentos para pedir certidão em nome de outra pessoa: baixe, preencha e assine.", corpo }));
}

// ---------- Folha de revisão (só em rascunho): reúne todo o conteúdo para o cartório validar
if (rascunho) {
  const c = ctx("revisao.html");
  const linha = '<span class="rev-linha"></span>';
  const blocos = especialidades
    .map(
      (e) => `
    <section class="rev-sec"><h2>${esc(e.nomeCompleto)}</h2>
    ${e.atos
      .map(
        (a) => `
      <article class="rev-art">
        <h3>${esc(a.titulo)} <small class="rev-tec">(${esc(a.nomeTecnico)})</small></h3>
        <p>${esc(a.resumo)}</p>
        ${(a.texto || []).length ? `<div class="texto-cartorio">${blocosTexto(a.texto)}</div>` : ""}
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
mkdirSync(join(SAIDA, "assets/css"), { recursive: true });
mkdirSync(join(SAIDA, "assets/js"), { recursive: true });
writeFileSync(join(SAIDA, "assets/css/style.css"), CSS_SAIDA);
writeFileSync(join(SAIDA, "assets/js/main.js"), JS_SAIDA);
writeFileSync(join(SAIDA, "assets/js/indice.js"), INDICE_JS);
cpSync(join(RAIZ, "src/img"), join(SAIDA, "assets/img"), { recursive: true });
cpSync(join(RAIZ, "src/fonts"), join(SAIDA, "assets/fonts"), { recursive: true });
if (existsSync(join(RAIZ, "src/public"))) cpSync(join(RAIZ, "src/public"), SAIDA, { recursive: true });
const pastaModelos = join(RAIZ, "content/modelos");
for (const arq of (existsSync(pastaModelos) ? readdirSync(pastaModelos) : []).filter((f) => /\.(pdf|docx?|odt)$/i.test(f))) {
  mkdirSync(join(SAIDA, "modelos"), { recursive: true });
  cpSync(join(pastaModelos, arq), join(SAIDA, "modelos", arq));
}

// Cabeçalhos de segurança para hospedagens que os aceitam (Netlify/Cloudflare Pages: _headers; Apache: .htaccess).
const PERMISSOES = "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), interest-cohort=()";
const CABECALHOS = {
  "Content-Security-Policy": CSP_CABECALHO,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": PERMISSOES,
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};
writeFileSync(
  join(SAIDA, "_headers"),
  `/*\n${Object.entries(CABECALHOS).map(([k, v]) => `  ${k}: ${v}`).join("\n")}\n\n/assets/css/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/js/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/img/*\n  Cache-Control: public, max-age=2592000\n`
);
writeFileSync(
  join(SAIDA, ".htaccess"),
  `# Gerado por build.mjs. Requer mod_headers e mod_rewrite.\nOptions -Indexes\n<IfModule mod_rewrite.c>\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteCond %{HTTP_HOST} !^localhost(:\\d+)?$\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\nRewriteRule (^|/)\\.(?!well-known) - [F]\n</IfModule>\n<IfModule mod_headers.c>\n${Object.entries(CABECALHOS).map(([k, v]) => `Header always set ${k} "${v}"`).join("\n")}\n<FilesMatch "\\.(css|js|woff2)$">\nHeader set Cache-Control "public, max-age=31536000, immutable"\n</FilesMatch>\n<FilesMatch "\\.(webp|svg|png|jpe?g)$">\nHeader set Cache-Control "public, max-age=2592000"\n</FilesMatch>\n</IfModule>\n`
);
writeFileSync(join(SAIDA, ".nojekyll"), "");
const contatoSeg = site.emailSeguranca || site.email;
if (contatoSeg) {
  mkdirSync(join(SAIDA, ".well-known"), { recursive: true });
  const expira = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  writeFileSync(join(SAIDA, ".well-known/security.txt"), `Contact: mailto:${contatoSeg}\nExpires: ${expira}\nPreferred-Languages: pt-BR\n${site.url ? `Canonical: ${site.url.replace(/\/?$/, "/")}.well-known/security.txt\n` : ""}`);
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
