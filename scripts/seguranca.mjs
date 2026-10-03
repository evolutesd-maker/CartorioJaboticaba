#!/usr/bin/env node
/* Verificação estática de segurança sobre docs/ (rode depois do build).
 * Falha (exit 1) se encontrar: página sem CSP, 'unsafe-*' na CSP, script inline sem hash correspondente,
 * estilo ou manipulador de evento inline, links http:// ou para domínios fora da lista, target=_blank sem
 * rel="noopener noreferrer", iframes/objetos/formulários com action, uso perigoso de JS (eval, innerHTML dinâmico...),
 * cabeçalhos de segurança ausentes ou segredos óbvios.  Uso: node scripts/seguranca.mjs */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const DOCS = join(fileURLToPath(new URL(".", import.meta.url)), "..", "docs");
const DOMINIOS_PERMITIDOS = ["https://wa.me/", "https://www.google.com/maps/"];
const problemas = [];
const listar = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(join(d, e.name)) : [join(d, e.name)]));
const hash = (s) => "sha256-" + createHash("sha256").update(s).digest("base64");

const arquivos = listar(DOCS);
const paginas = arquivos.filter((f) => f.endsWith(".html"));

for (const arq of paginas) {
  const html = readFileSync(arq, "utf8");
  const nome = relative(DOCS, arq);
  const falha = (m) => problemas.push(`${nome}: ${m}`);

  const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/);
  if (!meta) { falha("sem Content-Security-Policy"); continue; }
  const csp = meta[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  if (/unsafe-(inline|eval)|\*/.test(csp)) falha("CSP permissiva (unsafe-* ou curinga)");
  for (const d of ["default-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-src 'none'", "connect-src 'none'"]) if (!csp.includes(d)) falha(`CSP sem "${d}"`);

  // scripts inline: precisam ter o hash na CSP (JSON/LD+JSON são dados, não executam)
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    if (/\bsrc=/.test(attrs)) { if (/src="https?:/.test(attrs)) falha("script de origem externa"); continue; }
    if (/type="(application\/json|application\/ld\+json)"/.test(attrs)) continue;
    if (!csp.includes(`'${hash(m[2])}'`)) falha(`script inline sem hash na CSP (${m[2].slice(0, 40)}...)`);
  }
  if (/<style[\s>]/.test(html)) falha("bloco <style> inline");
  if (/\sstyle="/.test(html)) falha("atributo style inline");
  if (/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) falha("manipulador de evento inline (onclick etc.)");
  if (/javascript:/i.test(html)) falha('URL "javascript:"');
  if (/<(iframe|object|embed|applet|base)\b/i.test(html)) falha("iframe/object/embed/base");
  if (/<form[^>]*\saction=/i.test(html)) falha("formulário com action");
  if (/<meta[^>]*http-equiv="refresh"/i.test(html)) falha("meta refresh");

  for (const m of html.matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
    const u = m[1];
    if (/^http:\/\//i.test(u)) falha(`link inseguro (http): ${u}`);
    if (/^https:\/\//i.test(u) && !DOMINIOS_PERMITIDOS.some((d) => u.startsWith(d))) falha(`domínio externo não permitido: ${u.slice(0, 60)}`);
  }
  for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) if (!/rel="[^"]*noopener[^"]*noreferrer|rel="[^"]*noreferrer[^"]*noopener/.test(m[0])) falha(`target=_blank sem rel="noopener noreferrer": ${m[0].slice(0, 70)}`);
  if (/(password|senha|secret|api[_-]?key|token)\s*[:=]/i.test(html)) falha("possível segredo no HTML");
}

// JavaScript publicado
for (const arq of arquivos.filter((f) => f.endsWith(".js"))) {
  const js = readFileSync(arq, "utf8");
  const nome = relative(DOCS, arq);
  if (/\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(|setTimeout\s*\(\s*["'`]|\.outerHTML\s*=/.test(js)) problemas.push(`${nome}: uso perigoso (eval/Function/document.write/outerHTML/setTimeout com texto)`);
  for (const m of js.matchAll(/\.innerHTML\s*=\s*([^;]+);/g)) if (m[1].trim() !== '""') problemas.push(`${nome}: innerHTML com valor dinâmico: ${m[0].slice(0, 60)}`);
  for (const m of js.matchAll(/insertAdjacentHTML\s*\(\s*"[a-z]+"\s*,\s*([^)]*)\)/g)) if (!/^'<svg[^$]*'$|^"<svg[^$]*"$/.test(m[1].trim())) problemas.push(`${nome}: insertAdjacentHTML com valor dinâmico`);
  if (/\/\/# sourceMappingURL/.test(js)) problemas.push(`${nome}: mapa de código-fonte publicado`);
}
for (const arq of arquivos.filter((f) => f.endsWith(".map"))) problemas.push(`${relative(DOCS, arq)}: mapa de código-fonte publicado`);

// Cabeçalhos para hospedagem
for (const [arq, termos] of [["_headers", ["Content-Security-Policy", "frame-ancestors 'none'", "X-Content-Type-Options: nosniff", "Referrer-Policy", "Permissions-Policy", "Strict-Transport-Security"]], [".htaccess", ["Content-Security-Policy", "X-Frame-Options", "Strict-Transport-Security", "Options -Indexes"]]]) {
  if (!existsSync(join(DOCS, arq))) { problemas.push(`${arq} ausente`); continue; }
  const t = readFileSync(join(DOCS, arq), "utf8");
  for (const termo of termos) if (!t.includes(termo)) problemas.push(`${arq} sem "${termo}"`);
}
const sec = join(DOCS, ".well-known/security.txt");
if (existsSync(sec)) {
  const exp = readFileSync(sec, "utf8").match(/^Expires:\s*(.+)$/m);
  if (!exp || new Date(exp[1]) < new Date()) problemas.push("security.txt expirado ou sem Expires");
}

if (problemas.length) { console.error(`✗ ${problemas.length} problema(s) de segurança:\n` + problemas.map((p) => "  " + p).join("\n")); process.exit(1); }
console.log(`✓ segurança: ${paginas.length} páginas com CSP estrita (sem unsafe-*), sem script/estilo/evento inline fora do hash, links externos só para ${DOMINIOS_PERMITIDOS.join(" e ")}, JS sem padrões perigosos, cabeçalhos de hospedagem presentes`);
