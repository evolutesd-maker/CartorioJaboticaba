#!/usr/bin/env node
/* Verifica as skills de design instaladas em .agents/skills contra o manifesto auditado (.agents/skills.manifest.json).
 * Falha se: um arquivo foi alterado, apareceu arquivo novo/inesperado, há script/binário/executável/link,
 * texto invisível (Unicode) ou padrões de risco (curl/wget/eval/child_process/rm -rf, "ignore as instruções"...).
 * Rode depois de instalar ou atualizar qualquer skill:  npm run skills */
import { readFileSync, readdirSync, statSync, lstatSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const RAIZ = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const BASE = join(RAIZ, ".agents/skills");
const MANIFESTO = join(RAIZ, ".agents/skills.manifest.json");
const problemas = [];
if (!existsSync(MANIFESTO)) { console.error("✗ manifesto ausente: .agents/skills.manifest.json"); process.exit(1); }
const manifesto = JSON.parse(readFileSync(MANIFESTO, "utf8")).arquivos;
const listar = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(join(d, e.name)) : [join(d, e.name)]));

const arquivos = existsSync(BASE) ? listar(BASE) : [];
const PERMITIDAS = /\.(md|txt)$/i;
const RISCOS = /\b(curl|wget|child_process|rm -rf|sudo|base64 -d)\b|\beval\s*\(|ignore (all|any|previous|prior|above) (instructions|rules)|disregard (the )?(system|previous)|do not (tell|inform) the user/i;
let verificados = 0;
for (const arq of arquivos) {
  const rel = relative(BASE, arq).split("\\").join("/");
  const st = lstatSync(arq);
  if (st.isSymbolicLink()) { problemas.push(`${rel}: link simbólico dentro das skills`); continue; }
  if (st.mode & 0o111) problemas.push(`${rel}: arquivo executável`);
  if (!PERMITIDAS.test(rel)) { problemas.push(`${rel}: tipo de arquivo não permitido (só .md e .txt)`); continue; }
  const dados = readFileSync(arq);
  const hash = createHash("sha256").update(dados).digest("hex");
  if (!(rel in manifesto)) problemas.push(`${rel}: arquivo fora do manifesto auditado`);
  else if (manifesto[rel] !== hash) problemas.push(`${rel}: conteúdo diferente do auditado (alterado ou atualizado sem revisão)`);
  const texto = dados.toString("utf8");
  if (/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/.test(texto)) problemas.push(`${rel}: caracteres Unicode invisíveis`);
  const m = texto.match(RISCOS);
  if (m) problemas.push(`${rel}: padrão de risco "${m[0]}"`);
  verificados++;
}
const ausentes = Object.keys(manifesto).filter((r) => !arquivos.some((a) => relative(BASE, a).split("\\").join("/") === r));
if (problemas.length) { console.error(`✗ ${problemas.length} problema(s) nas skills:\n` + problemas.map((p) => "  " + p).join("\n")); process.exit(1); }
console.log(`✓ skills: ${verificados} arquivo(s) conferem com o manifesto auditado${ausentes.length ? ` (${ausentes.length} do manifesto não estão instalados aqui, o que é normal: instale-os com npx skills add)` : ""}`);
