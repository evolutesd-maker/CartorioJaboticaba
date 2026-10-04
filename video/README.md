# Vídeo institucional do site do Tabelionato de Jaboticaba

Vídeo de apresentação do site, feito 100% em JavaScript (Node + Playwright + FFmpeg).
**Não altera o site**: ele é apenas servido (somente leitura) a partir de `docs/` e filmado.

```bash
node scripts/captura.mjs      # grava as cenas no site real (cursor, busca, carrossel, abas...) -> .work/clipes
node scripts/paginas.mjs      # fotografa abas e seções para a cena de camadas -> .work/img
node scripts/trilha.mjs 150 .work/trilha.wav   # sintetiza a trilha
node scripts/render.mjs       # renderiza o palco (stage/) quadro a quadro -> .work/quadros
node scripts/montar.mjs       # gera apresentacao-site-cartorio-jaboticaba.mp4
```
Pré-requisito: `node scripts/serve.mjs` rodando na porta 8080 (servidor do próprio repositório).
`stage/stage.js` contém a linha do tempo (textos, destaques, cenas em camadas e a assinatura animada da Evolute).
