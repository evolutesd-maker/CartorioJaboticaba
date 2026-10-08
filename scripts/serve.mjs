#!/usr/bin/env node
/* Servidor local mínimo para pré-visualizar docs/.  Uso: node scripts/serve.mjs [porta] */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(fileURLToPath(new URL(".", import.meta.url)), "..", "docs");
const PORTA = Number(process.argv[2] || process.env.PORT || 8080);
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
};

createServer(async (req, res) => {
  try {
    let caminho = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    let arquivo = join(RAIZ, caminho);
    // Como a hospedagem: "/servicos/notas" entrega servicos/notas.html (o arquivo vale mais que a pasta).
    if (!extname(arquivo) && (await stat(arquivo + ".html").catch(() => null))?.isFile()) arquivo += ".html";
    else if ((await stat(arquivo).catch(() => null))?.isDirectory()) arquivo = join(arquivo, "index.html");
    const dados = await readFile(arquivo);
    res.writeHead(200, { "Content-Type": TIPOS[extname(arquivo)] || "application/octet-stream" });
    res.end(dados);
  } catch {
    // Como na hospedagem: endereço inexistente mostra a página 404 do site, com status 404.
    const pagina = await readFile(join(RAIZ, "404.html")).catch(() => null);
    res.writeHead(404, { "Content-Type": pagina ? "text/html; charset=utf-8" : "text/plain; charset=utf-8" });
    res.end(pagina || "Não encontrado");
  }
}).listen(PORTA, () => console.log(`Pré-visualização em http://localhost:${PORTA}/`));
