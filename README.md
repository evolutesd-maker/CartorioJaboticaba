# Site do Tabelionato de Jaboticaba/RS

Site estático (HTML + CSS + um pouco de JavaScript opcional), sem banco de dados, sem cookies e sem serviços de terceiros.
Foi pensado para que a pessoa **encontre o serviço pelo assunto**, sem precisar saber os nomes jurídicos, e veja **os documentos necessários ato por ato** antes de ir ao cartório.

- Azul `#0078d7` predominante, branco e detalhes discretos em dourado. Fonte Plus Jakarta Sans (licença OFL), hospedada no próprio site.
- Leve: cerca de 49 KB compactados no primeiro acesso (HTML, CSS, JS e fonte), sem nenhuma requisição a terceiros.
- Interface: cabeçalho translúcido, painel de busca flutuante sobre o hero, carrossel "Mais procurados" (setas, arrastar, teclado e toque), cartões com hover, chips flutuantes sobre a foto, botão flutuante de WhatsApp e lista de documentos que o visitante vai marcando.
- Movimento só para quem não pede "reduzir movimento" no sistema.
- Funciona sem JavaScript (busca, carrossel por botões, revelar ao rolar e menu recolhível são melhorias).
- Passa na auditoria automática de acessibilidade (axe-core, WCAG 2.1 AA) em todas as páginas.

## Como funciona

O conteúdo fica em `content/` e o gerador (`build.mjs`, sem dependências) escreve o site pronto em `docs/`.
**Não edite `docs/` à mão**: ele é recriado a cada build.

```
content/
  site.json              dados do cartório (telefone, horário, titular, CNS...) e o modo rascunho
  temas.json             os 5 assuntos da página "Todos os serviços" (e do índice de busca)
  destaques.json         os serviços do carrossel "Mais procurados" da página inicial
  especialidades/*.json  as 5 especialidades e, dentro de cada, os atos (serviços) com os documentos
  paginas/*.html         textos de "Institucional" e "Privacidade"
  modelos/               PDFs para download (opcional)
src/
  css/style.css  js/main.js  fonts/  img/   aparência, comportamento, fonte e imagens (foto da fachada)
build.mjs                gerador
scripts/check.mjs        verificador de links, âncoras, ids e alt de imagens
scripts/serve.mjs        servidor local para pré-visualizar
docs/                    SAÍDA, pronta para publicar
```

Comandos (Node 18 ou superior; nada para instalar):

```bash
npm run build    # gera docs/ e lista as pendências
npm run check    # verifica links e estrutura de docs/
npm start        # gera e abre em http://localhost:8080
npm test         # build + check
```

## O que ainda falta preencher

Rode `npm run build` e leia a lista "Pendências para publicar". Hoje o site está em **modo rascunho**
(`"rascunho": true` em `content/site.json`): mostra uma faixa de aviso, marca o que falta como "a confirmar",
bloqueia buscadores (`noindex` + `robots.txt`) e gera `docs/revisao.html`.

| O quê | Onde |
|---|---|
| Telefone, WhatsApp, e-mail | `content/site.json` → `telefone`, `whatsapp`, `email` (com DDD, ex.: `"(55) 3333-4444"`) |
| **Horário de atendimento confirmado** | `content/site.json` → `horario`, ex.: `[{"dias": "Segunda a sexta", "horas": "8h às 11h30 e 13h às 17h"}]` |
| Titular, CNS | `content/site.json` → `titular`, `cns` |
| Encarregado de dados (LGPD) e data da política | `content/site.json` → `encarregadoLgpd`, `privacidadeAtualizadaEm` |
| **Foto real da fachada** | salve em `src/img/fachada.jpg` (paisagem, cerca de 1600×1100). Substitui o espaço reservado sozinho. |
| Logotipo | hoje é um selo "J" provisório (`SELO` em `build.mjs` e `src/img/favicon.svg`) |
| Endereço público do site | `content/site.json` → `url` (gera `sitemap.xml` e links canônicos) |
| Modelos em PDF | coloque o arquivo em `content/modelos/` e liste no ato: `"modelos": [{"titulo": "Modelo de procuração", "arquivo": "procuracao.pdf"}]` |

## Validação do conteúdo pelo cartório (obrigatória antes de publicar)

Os documentos, prazos e orientações em `content/especialidades/` são um **texto-base redigido em linguagem simples,
a partir de regras gerais, e ainda não foram validados pelo cartório**. Cada ato tem `"validado": false`
e aparece no site com o selo "Em validação pelo cartório".

1. Rode `npm run build` e abra `docs/revisao.html` (imprima ou envie ao cartório). Ela reúne todos os atos
   com um campo de aprovação para cada um.
2. Ajuste os textos nos arquivos de `content/especialidades/` conforme o retorno do cartório.
3. Quando o cartório aprovar um ato, mude para `"validado": true` e, se quiser, `"revisadoEm": "AAAA-MM-DD"`.
4. Quando tudo estiver pronto, mude `"rascunho"` para `false`. A partir daí **o build recusa publicar**
   se faltar qualquer dado obrigatório ou se algum ato ainda não estiver validado.

### Funil "Fale com o cartório"

Aparece no fim de todas as páginas, antes do rodapé: nome → especialidade → documento/serviço → WhatsApp ou e-mail. A mensagem é montada no navegador ("Olá, sou ... Gostaria de falar com o setor de ..., pois preciso de ... Aguardo atendimento."). As opções vêm das especialidades e atos de `content/especialidades/`. O WhatsApp usa `whatsapp` e o e-mail usa `emailFormulario` (ou `email`) de `content/site.json`. Hoje `emailFormulario` é um endereço de teste: troque pelo do cartório antes de publicar.

### Cartões da página inicial

Cada especialidade (`content/especialidades/*.json`) tem `tagline` (uma linha) e `opcoes` (3 a 4 itens curtos). São só isso que aparece no cartão da home; todo o resto fica na página da especialidade. O build recusa uma especialidade sem esses dois campos.

### Como editar um ato

Cada ato em `content/especialidades/*.json` tem: `titulo` (como a pessoa fala), `nomeTecnico`, `resumo`, `palavras`
(sinônimos que alimentam a busca), `quando`, `documentos` (grupos de itens, cada um texto simples ou
`{"texto": "...", "obs": "..."}`), `passos`, `prazo`, `custo`, `perguntas`, `modelos` e `verTambem`.
Para criar um ato novo: acrescente-o em `atos` e liste-o em um tema de `content/temas.json`
(o build avisa se um ato não for encontrável pelo localizador).

## Publicação

`docs/` é um site estático comum: pode ser enviado por FTP, ou servido por GitHub Pages (Settings → Pages →
branch → pasta `/docs`), Netlify, Cloudflare Pages etc. Todos os links são relativos, então funciona na raiz
de um domínio ou em um subcaminho. Arquivos que precisem ir na raiz do site (por exemplo `CNAME`)
devem ficar em `src/public/`, que é copiado para `docs/` a cada build.

## Notas de projeto

- Cores: `#0078d7` (azul), `#005a9e` para links e texto azul pequeno (7,1:1 sobre branco), dourado só decorativo.
  Botões usam negrito 700 em ~18,8 px porque branco sobre `#0078d7` é 4,49:1, o que passa em AA como texto grande.
- Fontes do sistema (Segoe UI no Windows, Georgia nos títulos): nada é baixado de terceiros.
- O mapa é apenas um botão que abre a rota no Google Maps em outra aba; nenhum mapa é incorporado.
- O botão do WhatsApp leva uma mensagem inicial com o nome do serviço consultado.
