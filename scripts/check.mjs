#!/usr/bin/env node
/* Verifica docs/: links e recursos internos existem, âncoras (#id) existem, ids não se repetem,
   há um único <h1> por página e toda imagem tem alt.  Uso: node scripts/check.mjs */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DOCS = join(fileURLToPath(new URL(".", import.meta.url)), "..", "docs");
const problemas = [];

const listar = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? listar(p) : [p];
  });

const paginas = listar(DOCS).filter((f) => f.endsWith(".html"));
const idsPorPagina = new Map();
for (const arq of paginas) {
  const html = readFileSync(arq, "utf8");
  idsPorPagina.set(arq, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
}

for (const arq of paginas) {
  const html = readFileSync(arq, "utf8");
  const nome = relative(DOCS, arq);
  const falha = (msg) => problemas.push(`${nome}: ${msg}`);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of new Set(ids.filter((v, i) => ids.indexOf(v) !== i))) falha(`id duplicado "${id}"`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) falha(`esperava 1 <h1>, encontrou ${h1}`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) falha(`imagem sem alt: ${m[0].slice(0, 80)}`);

  for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const alvo = m[1];
    if (!alvo || /^(https?:|mailto:|tel:|data:|javascript:)/i.test(alvo)) continue;
    const [caminhoBruto, ancora] = alvo.split("#").map((x, i) => (i === 0 ? x.split("?")[0] : x));
    const destino = caminhoBruto ? resolve(dirname(arq), caminhoBruto) : arq;
    const real = existsSync(destino) && statSync(destino).isDirectory() ? join(destino, "index.html") : destino;
    if (!existsSync(real)) { falha(`link quebrado → ${alvo}`); continue; }
    if (ancora && real.endsWith(".html") && !(idsPorPagina.get(real) || new Set()).has(ancora)) falha(`âncora inexistente → ${alvo}`);
  }
}

if (problemas.length) {
  console.error(`✗ ${problemas.length} problema(s):\n` + problemas.map((p) => "  " + p).join("\n"));
  process.exit(1);
}
console.log(`✓ ${paginas.length} páginas verificadas: links, âncoras, ids, <h1> e alt de imagens OK`);
