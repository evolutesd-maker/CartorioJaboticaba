// Conferência do site JÁ PUBLICADO (sem dependências). Uso: node scripts/conferir-publicado.mjs https://enderecodosite.com.br/
// Confere: páginas e arquivos internos (status 200), PDFs baixando como PDF, cabeçalhos de segurança, página 404, robots.txt e sitemap.
const base = (process.argv[2] || "").replace(/\/?$/, "/");
if (!/^https?:\/\//.test(base)) { console.error("Informe o endereço do site, por exemplo: node scripts/conferir-publicado.mjs https://exemplo.com.br/"); process.exit(2); }
const origem = new URL(base).origin;
const problemas = [], avisos = [];
const falha = (m) => problemas.push(m);
const buscar = (u, opcoes = {}) => fetch(u, { redirect: "manual", ...opcoes });

const visitadas = new Map(); // url → { status, tipo }
const fila = [base];
const achar = (html, de) => [...html.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1]).filter((a) => a && !/^(mailto:|tel:|javascript:|data:|#)/i.test(a)).map((a) => { try { return new URL(a, de); } catch { return null; } }).filter((u) => u && u.origin === origem).map((u) => { u.hash = ""; return u.href; });

while (fila.length) {
  const url = fila.shift();
  if (visitadas.has(url)) continue;
  let r;
  try { r = await buscar(url); } catch (e) { visitadas.set(url, { status: 0 }); falha(`${url}: não abriu (${e.message})`); continue; }
  const tipo = r.headers.get("content-type") || "";
  visitadas.set(url, { status: r.status, tipo });
  if (r.status !== 200) { falha(`${url}: status ${r.status}`); continue; }
  if (/\.pdf($|\?)/i.test(url) && !/application\/pdf/i.test(tipo)) falha(`${url}: PDF servido como "${tipo}"`);
  if (/text\/html/i.test(tipo)) fila.push(...achar(await r.text(), url));
}

// Cabeçalhos de segurança na página inicial.
const home = await buscar(base);
const h = (n) => home.headers.get(n);
const csp = h("content-security-policy") || "";
if (!csp) falha("Falta o cabeçalho Content-Security-Policy.");
else {
  if (/unsafe-(inline|eval)/.test(csp)) falha("A CSP permite unsafe-inline ou unsafe-eval.");
  if (!/frame-ancestors/.test(csp) && !h("x-frame-options")) falha("Falta frame-ancestors (CSP) ou X-Frame-Options.");
}
if ((h("x-content-type-options") || "").toLowerCase() !== "nosniff") falha("Falta X-Content-Type-Options: nosniff.");
if (!h("referrer-policy")) falha("Falta Referrer-Policy.");
if (!h("permissions-policy")) avisos.push("Falta Permissions-Policy.");
if (base.startsWith("https:") && !h("strict-transport-security")) falha("Falta Strict-Transport-Security (HSTS).");
if (base.startsWith("http:")) avisos.push("Endereço sem HTTPS: em produção use https.");
if ((h("x-robots-tag") || "").includes("noindex") || /name="robots" content="noindex/.test(await (await buscar(base)).text())) avisos.push("A página inicial está com noindex (modo rascunho): desligue o rascunho antes de divulgar.");

// Página 404 de verdade (status 404 e não 200).
const nada = await buscar(new URL("pagina-que-nao-existe-" + Date.now(), base).href);
if (nada.status !== 404) falha(`Endereço inexistente respondeu ${nada.status} em vez de 404.`);

// robots.txt e sitemap.
const robots = await buscar(new URL("robots.txt", base).href);
if (robots.status !== 200) falha("robots.txt não abre."); else if (/Disallow:\s*\/\s*$/m.test(await robots.text())) avisos.push("robots.txt bloqueia buscadores (modo rascunho).");
const mapa = await buscar(new URL("sitemap.xml", base).href);
if (mapa.status !== 200) avisos.push("sitemap.xml não abre (normal no modo rascunho).");

const pdfs = [...visitadas.keys()].filter((u) => /\.pdf($|\?)/i.test(u)).length;
console.log(`${visitadas.size} endereços internos conferidos (${pdfs} PDFs).`);
for (const a of avisos) console.log("• aviso: " + a);
if (problemas.length) { console.error(`✗ ${problemas.length} problema(s):\n` + problemas.map((p) => "  " + p).join("\n")); process.exit(1); }
console.log("✓ site publicado conferido: páginas, PDFs, cabeçalhos de segurança, 404, robots e sitemap");
