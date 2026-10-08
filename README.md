# Site do Tabelionato de Jaboticaba/RS

Site estático (HTML + CSS + um pouco de JavaScript opcional), sem banco de dados, sem cookies e sem serviços de terceiros.
Foi pensado para que a pessoa **encontre o serviço pelo assunto**, sem precisar saber os nomes jurídicos, e veja **os documentos necessários ato por ato** antes de ir ao cartório.

- Azul `#0078d7` predominante, branco e detalhes discretos em dourado. Fonte Plus Jakarta Sans (licença OFL), hospedada no próprio site.
- Leve: cerca de 50 KB compactados no primeiro acesso (HTML, CSS, JS e fonte; a foto da fachada tem versão menor para celular), sem nenhuma requisição a terceiros. CSS e JS são minificados no build, com versão na URL para cache longo.
- Interface: cabeçalho translúcido, painel de busca flutuante sobre o hero, lista "Mais procurados", listas abertas com linha fina (sem cartões) e folha de leitura nas páginas de serviço, chips flutuantes sobre a foto, lista de documentos que o visitante vai marcando.
- Movimento só para quem não pede "reduzir movimento" no sistema.
- Busca de serviços em qualquer página (`/` ou `Ctrl/⌘+K`), botão "Copiar mensagem" no funil e selo "Aberto agora" (usa `expediente` de `content/site.json`: dias da semana 0=domingo, turnos em HH:MM e fuso; não considera feriados).
- Funciona sem JavaScript (busca, filtros, revelar ao rolar e menu recolhível são melhorias).
- Passa na auditoria automática de acessibilidade (axe-core, WCAG 2.1 AA) em todas as páginas.

## Como funciona

O conteúdo fica em `content/` e o gerador (`build.mjs`, sem dependências) escreve o site pronto em `docs/`.
**Não edite `docs/` à mão**: ele é recriado a cada build.

```
content/
  site.json              dados do cartório (telefone, horário, titular, CNS...) e o modo rascunho
  temas.json             os 5 assuntos da página "Todos os serviços" (e do índice de busca)
  destaques.json         os serviços da lista "Mais procurados" da página inicial
  especialidades/*.json  as 5 especialidades e, dentro de cada, os atos (serviços) com os documentos
  paginas/*.html         textos de "Institucional" e "Privacidade"
  modelos/               PDFs para download (opcional)
src/
  css/style.css  js/main.js  fonts/  img/   aparência, comportamento, fonte e imagens (foto da fachada)
build.mjs                gerador
scripts/check.mjs        verificador de links, âncoras, ids e alt de imagens
scripts/seguranca.mjs    verificador de segurança (CSP, inline, links externos, JS perigoso)
scripts/serve.mjs        servidor local para pré-visualizar
docs/                    SAÍDA, pronta para publicar
```

Comandos (Node 18 ou superior; nada para instalar):

```bash
npm run build    # gera docs/ e lista as pendências
npm run check    # verifica links e estrutura de docs/
npm start        # gera e abre em http://localhost:8080
npm test         # build + check (links) + seguranca
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
| **Foto da fachada** | `src/img/fachada.webp` (1441 px) e `src/img/fachada-720.webp` (versão para celular, usada automaticamente). O original fica em `content/originais/`, que não é publicado. |
| Logotipo | hoje é um selo "J" provisório (`SELO` em `build.mjs` e `src/img/favicon.svg`) |
| Endereço público do site | `content/site.json` → `url` (gera `sitemap.xml` e links canônicos) |
| Modelos em PDF | coloque o arquivo em `content/modelos/` e liste no ato: `"modelos": [{"titulo": "Modelo de procuração", "arquivo": "procuracao.pdf", "atualizadoEm": "2026-10-01"}]` (o site mostra tipo, tamanho e data; `atualizadoEm` e `descricao` são opcionais) |

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

Aparece no fim de todas as páginas, antes do rodapé: nome → especialidade → documento/serviço → WhatsApp ou e-mail. A mensagem é montada no navegador ("Olá, sou ... Gostaria de falar com o setor de ..., pois preciso de ... Aguardo atendimento."). As opções vêm das especialidades e atos de `content/especialidades/`. O WhatsApp usa `whatsapp` e o e-mail usa `emailFormulario` (ou `email`) de `content/site.json`. Hoje `emailFormulario` é o e-mail do cartório (o mesmo de `email`).

### Lista de especialidades da página inicial

Cada especialidade (`content/especialidades/*.json`) tem `tagline` (uma linha) e `opcoes` (3 a 4 itens curtos). São só isso que aparece na linha da home; todo o resto fica na página da especialidade. O build recusa uma especialidade sem esses dois campos.

### Como editar um ato

Cada ato em `content/especialidades/*.json` tem: `titulo` (como a pessoa fala), `nomeTecnico`, `resumo`, `palavras`
(sinônimos que alimentam a busca), `quando`, `documentos` (grupos de itens, cada um texto simples ou
`{"texto": "...", "obs": "..."}`), `passos`, `prazo`, `custo`, `perguntas`, `modelos` e `verTambem`.
Para criar um ato novo: acrescente-o em `atos` e liste-o em um tema de `content/temas.json`
(o build avisa se um ato não for encontrável pelo localizador).

## Segurança

O site é estático (sem servidor, banco ou login) e não usa nenhuma biblioteca de terceiros, o que elimina as classes de ataque mais comuns. Além disso:

- **CSP estrita** em todas as páginas (`<meta http-equiv>`) e nos cabeçalhos gerados: `default-src 'none'`; scripts só do próprio site e dois hashes (o script inline mínimo e as regras de pré-carregamento); estilos só de arquivo; **nenhum** `unsafe-inline`/`unsafe-eval`; sem iframes, objetos, conexões externas nem `form-action`. Por isso o HTML não tem `style=`, `onclick=` etc.
- **Cabeçalhos** (gerados em `docs/_headers` para Netlify/Cloudflare Pages e `docs/.htaccess` para Apache): CSP completa com `frame-ancestors 'none'`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (câmera, microfone, localização etc. desligados), COOP/CORP, HSTS e redirecionamento para HTTPS. **GitHub Pages não aceita cabeçalhos**: lá só vale a CSP em `<meta>`; para a proteção completa prefira Cloudflare Pages ou Netlify (ou seu servidor Apache/nginx).
- **Entrada do visitante**: o único campo digitável (nome, no funil de contato) é limitado a 80 caracteres e só mantém letras, espaços, apóstrofo, ponto e hífen; vai para a tela como texto (nunca como HTML) e para o link com `encodeURIComponent`.
- **Links externos** só para `wa.me` e Google Maps, sempre com `rel="noopener noreferrer"`. Nada é carregado de terceiros ao abrir uma página.
- **Cache**: CSS e JS levam a versão do conteúdo na URL (`?v=...`) e podem ser guardados por 1 ano.
- `/.well-known/security.txt` (contato para relatar falhas; usa `emailSeguranca` ou `email` de `content/site.json`; expira em 1 ano e é renovado a cada build).

`npm run seguranca` (também parte de `npm test`) reprova o build se aparecer: página sem CSP ou com `unsafe-*`, script/estilo/evento inline, link `http://` ou para domínio fora da lista, `target=_blank` sem `noopener noreferrer`, `eval`/`innerHTML` dinâmico no JS ou cabeçalhos ausentes.

Antes de publicar: use HTTPS (os cabeçalhos assumem isso), mantenha `docs/` como única pasta publicada (não publique `content/` nem `build.mjs`), troque os demais dados de demonstração e, se o endereço do site mudar de domínio, preencha `url` em `content/site.json`.

## Skills de design e avaliação

- `AVALIACAO-FRONTEND.md` traz a avaliação do front-end (pontos fortes medidos, achados priorizados, o que foi descartado por segurança).
- `CLAUDE.md` fixa as regras para agentes: segurança acima de estética, zero dependências, skills só como sugestão.
- Skills em `.agents/skills`: só a `frontend-design` (Apache-2.0) é versionada. As do pacote `taste-skill` (sem licença declarada) são reinstaladas com `npx skills add Leonxlnx/taste-skill -y`. **Sempre rode `npm run skills`** depois: ele compara cada arquivo com `.agents/skills.manifest.json` (hashes auditados) e reprova alteração, arquivo novo, script ou padrão de risco. Atualizar uma skill exige nova auditoria e novo manifesto.

## Publicação

`docs/` é um site estático comum: pode ser enviado por FTP, ou servido por GitHub Pages (Settings → Pages →
branch → pasta `/docs`), Netlify, Cloudflare Pages etc. Todos os links são relativos, então funciona na raiz
de um domínio ou em um subcaminho. Arquivos que precisem ir na raiz do site (por exemplo `CNAME`)
devem ficar em `src/public/`, que é copiado para `docs/` a cada build.

## Notas de projeto

- Cores: `#0078d7` (azul), `#005a9e` para links e texto azul pequeno (7,1:1 sobre branco), dourado claro (`--ouro-claro`) só sobre fundo azul; sobre branco, texto dourado usa `--ouro-texto` (`#7d5a10`, legível). Sem efeitos que sigam o mouse (botões e cartões só levantam).
  Botões usam negrito 700 em ~18,8 px porque branco sobre `#0078d7` é 4,49:1, o que passa em AA como texto grande.
- Fontes do sistema (Segoe UI no Windows, Georgia nos títulos): nada é baixado de terceiros.
- O mapa é apenas um botão que abre a rota no Google Maps em outra aba; nenhum mapa é incorporado.
- Os botões do WhatsApp levam uma mensagem inicial com o nome do serviço consultado.

### Listas grandes (muitos serviços e links)

- Página de especialidade: com **8 ou mais** serviços aparece um filtro e a contagem ("9 serviços"); com menos, só a lista.
- **Mosaico das especialidades** (início, `servicos.html` e `documentos.html`): cinco cartões de tamanhos diferentes. Ao tocar em um, ele abre os serviços daquela especialidade (com filtro se tiver 8 ou mais) e os outros encolhem numa fileira; tocar em outro troca direto, Esc ou "Ver todas as especialidades" fecha. O endereço guarda `#esp-notas` etc., então dá para linkar já aberto. Sem JavaScript, cada cartão é um link para a página da especialidade.
- `content/temas.json` não aparece mais como lista na tela, mas continua alimentando a busca; todo serviço novo precisa estar em um tema (o build avisa se faltar).
- Arquivos para baixar usam sempre a mesma linha: título, tipo, tamanho, data (opcional).

### Vidro e submenu

- Os cartões das especialidades são de **vidro**: todos iguais, translúcidos, com um brilho azul atrás (o texto secundário mantém pelo menos 4,5:1 de contraste). Em `src/css/style.css`, bloco "Mosaico das especialidades".
- O menu tem **"O que você procura?"** no lugar de "Serviços": abre um painel com os serviços mais procurados (`content/destaques.json`) e as especialidades (cada uma leva a `servicos.html#esp-...` já aberta), mais "Ver todos os serviços" e "Buscar pelo nome". No celular vira uma sanfona dentro do menu. Sem JavaScript, é um link para Serviços.

### Links externos e conteúdo do cartório

- Links para sites oficiais ficam em `content/links.json` (`itens`, `grupos`). Para usar em um serviço: `"links": ["cpf", "ccir"]` no JSON do ato; em uma especialidade: `"linksOnline": ["cenprot"]`. Aparecem em "Emita online" e em Documentos > "Certidões e consultas na internet".
- **Só entram domínios aprovados** (`scripts/dominios-aprovados.json`). Para incluir um novo site: peça aprovação, acrescente o domínio ali e o item em `links.json`. O build recusa domínio fora da lista e URL com identificador de sessão.
- Atos novos sem lista de documentos aparecem com o aviso "a lista será confirmada pelo cartório": preencha `documentos` e `passos` e só então marque `"validado": true`.
- `"escritura": true` no ato faz o formulário de contato perguntar "presencial ou digital (e-Notariado)?". Desligue com `false` nos serviços que não são escritura.
- `titular` (site.json) aparece na página Institucional ("sob a liderança do Tabelião e Registrador ..."): trocar o nome fictício pelo real antes de publicar.

### Solicite online

- Aba própria no menu ("Solicite online", destacada em dourado) e página `solicite-online.html`, com cartões grandes: órgão, o que é e um botão claro. Também há uma faixa "Solicite online" na página inicial e cartões nas páginas das especialidades que têm `linksOnline`.
- Os cartões vêm de `content/links.json`: cada item tem `titulo`, `orgao`, `descricao`, `url`, `icone` (documento, casa, terra, protesto, pessoas, arquivo, moeda, tela) e `botao` (texto do botão). Só domínios de `scripts/dominios-aprovados.json`.
- Para mudar quais cartões aparecem e em qual ordem, edite `grupos` em `links.json`.

### Institucional ("Quem somos")

- O texto vem de `content/institucional.json` (apresentação, lema, missão com 4 pilares, fecho) e de `content/paginas/institucional.html` (responsável, custos, atendimento prioritário, fiscalização). `{{nome}}` e `{{titular}}` são preenchidos a partir de `site.json`.
- Aparece em três lugares: aba **Quem somos** no menu, seção "Conheça o cartório" na página inicial e a página `institucional.html` (missão, "menos burocracia", especialidades, transparência).
- Na página inicial há também "Sem burocracia: resolva em 3 passos" (encontrar, ver documentos, pedir online).
- No computador a aba "Início" some do menu (a marca leva ao início) para caber as 5 abas; no celular ela continua.

### Textos do Tabelião (literais)

- `texto` (em cada serviço de Notas) e `textoCartorio` (nas especialidades) guardam, palavra por palavra, o que o Tabelião enviou; aparecem em "Sobre este serviço" e em "Sobre o ...". Idem `content/institucional.json` e a página do e-Notariado. Só correções ortográficas.
- Correções feitas: "EDUAÇÃO" → "EDUCAÇÃO"; "Direito Hereditários" → "Direitos Hereditários"; "respectivo valores" → "respectivos valores"; espaço antes do ponto em "imóveis) ."; ponto final em frases sem ele; "rviços" → "Serviços". Os títulos de RTD e RCPJ estavam trocados no original (cada texto estava sob o nome do outro) e o texto do RCPJ trazia um "Títulos e Documentos" solto: foram acertados.
- Pendente do cartório: o texto de **Cessão de Direitos Hereditários – Bem Específico** chegou cortado ("...transferir..."). Aparece com o selo "Texto a completar pelo cartório" e o build recusa publicar enquanto `textoIncompleto` estiver ligado.


## Depois de publicar: conferência automática

```
node scripts/conferir-publicado.mjs https://enderecodosite.com.br/
```

Percorre todos os links e arquivos internos (status 200), confere se os PDFs baixam como PDF, os cabeçalhos de segurança (CSP, nosniff, referrer, HSTS), se um endereço inexistente mostra a página 404 com status 404 e se `robots.txt` e `sitemap.xml` abrem. Sem dependências. Os cabeçalhos vêm da hospedagem (`docs/_headers` ou `docs/.htaccess`), por isso não aparecem na pré-visualização local.

## Publicar na Vercel

O repositório já traz um `vercel.json` (gerado por `build.mjs`) que manda a Vercel publicar só a pasta `docs/`, sem rodar build, e aplica os cabeçalhos de segurança (a Vercel não lê `_headers`). Basta importar o repositório, deixar o preset como "Other" e fazer o deploy da branch. Sem esse arquivo, a Vercel procura uma pasta `public` e o deploy falha com "Nenhum diretório de saída chamado public". Antes de cada deploy, rode `npm test` e envie também o `docs/` e o `vercel.json` atualizados.
