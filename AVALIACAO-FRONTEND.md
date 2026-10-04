# Avaliação do front-end do site

**Data:** 04/10/2026 · **Escopo:** site demonstrativo do Tabelionato de Jaboticaba/RS (37 páginas) · **Método:** auditoria do código e do resultado no navegador, usando como roteiro as skills `frontend-design` (Anthropic), `redesign-existing-projects` e `design-taste-frontend` (pacote taste-skill).

> As skills divergem entre si e algumas servem a outros tipos de projeto. Usei-as como **listas de verificação**, não como ordens. Onde conflitavam com a segurança do site ou com decisões já tomadas com o cliente, descartei a sugestão (seção 5). O que segue é julgamento meu, em parte subjetivo.

## 1. Resumo

O site está sólido em **desempenho, acessibilidade e segurança** e tem boa direção visual para o público (azul predominante, foto real da fachada, linguagem simples). As oportunidades estão em **hierarquia e identidade**, não em correção: o visual hoje repete muito o mesmo "cartão branco arredondado", usa movimento em excesso competindo entre si, e faltam itens de acabamento que aparecem na vida real (prévia de compartilhamento no WhatsApp, página 404, favicons).

## 2. O que está bem (medido)

| Item | Resultado |
|---|---|
| Acessibilidade (axe-core, WCAG 2.1 AA) | 0 violações em 37 páginas × 2 larguras |
| Layout | sem rolagem horizontal de 320 a 1440 px |
| Desempenho, celular com rede 4G lenta e CPU 4× mais lenta (simulado) | conteúdo principal em ~1,3 s, deslocamento de layout (CLS) 0, 5 requisições |
| Desempenho, computador | conteúdo principal em ~0,27 s |
| Peso do primeiro acesso | ~50 KB compactados (HTML, CSS, JS, fonte); foto 20 KB no celular |
| Segurança | CSP estrita sem `unsafe-*`, sem terceiros, verificador automático reprovando regressões |
| Funciona sem JavaScript e com "reduzir movimento" | sim |
| Detalhes que as skills cobram e já temos | link "pular para o conteúdo", foco visível, página atual marcada no menu, semântica (`nav`/`main`/`aside`/`footer`), sombras com matiz azul, tamanhos de fonte fluidos (`clamp`), `text-wrap`, estados de erro no funil sem `alert()` |

Não é preciso banner de cookies: o site não usa cookies nem rastreadores (ponto forte para a LGPD).

## 3. Achados e recomendações

Ordem sugerida por **impacto ÷ esforço**, já filtrada pela segurança. "Risco" é o de quebrar algo existente.

| # | Achado | Recomendação | Impacto | Esforço | Risco |
|---|---|---|---|---|---|
| 1 | **Sem prévia de compartilhamento.** Não há `og:image` nem `twitter:card`; colar o link no WhatsApp (principal canal no Brasil) mostra um cartão pobre. | Gerar uma imagem 1200×630 a partir da fachada e declarar as meta tags (precisa do endereço público em `url`). | Alto | Baixo | Nenhum |
| 2 | **Faltam acabamentos:** página 404 própria (hoje é a do provedor), favicon PNG e `apple-touch-icon`. | Criar `404.html` com a identidade e caminho de volta; favicons PNG 32/180/512. | Médio | Baixo | Nenhum |
| 3 | ✅ **Feito.** **Informação útil que o visitante procura e não vê:** se o cartório está aberto agora. | Indicador "Aberto agora · fecha às 17h15" no hero e no contato, calculado no navegador a partir do `horario` já cadastrado (sem dependências). Mostra "Fechado · abre amanhã às 8h30" fora do expediente. | Alto | Baixo | Baixo |
| 4 | **"Letras fáceis de ler" pode ir além:** hoje o tamanho é fixo (18 px) e só o zoom do navegador ajuda. | Botões **A− / A / A+** e alto contraste, salvos no navegador (JS local). É o recurso mais valioso para o público idoso de cartório. | Alto | Médio | Baixo |
| 5 | **Cartões iguais demais.** Há 8 variações do mesmo cartão branco arredondado (`esp-card`, `ato-card`, `atalho`, `caixa`, `cr-card`, `grupo`, `painel`, `cartao-info`) com a mesma sombra e raio parecido. Tudo "pesa" igual, o que achata a hierarquia. | Na home, trocar os 5 cartões por uma grade assimétrica (bento): **Notas** e **Registro Civil PN** maiores (mais procurados), as outras menores. Reservar o cartão branco para o que é clicável e deixar as demais caixas só com espaço ou fundo. | Alto | Médio | Médio |
| 6 | **Rótulos em CAIXA-ALTA acima de títulos** são o "sinal de template" nº 1 nas duas skills. Há 5 na home e 77 no site. | Manter só onde informam (por exemplo, o nome da especialidade nas páginas internas) e tirar o resto. Títulos ganham força sozinhos. | Médio | Baixo | Baixo |
| 7 | **Movimento demais competindo.** O site tem revelar ao rolar, chips que flutuam, inclinação 3D, holofote, botões magnéticos, brilho nos botões, ícones que se desenham, barra de leitura, zoom na foto e troca de página deslizante. A skill `frontend-design` recomenda **um** momento orquestrado. | Você pediu animações, então não cortaria o espírito. Proponho manter: entrada do hero, troca de página, zoom da foto no hover e hover simples. Tirar inclinação 3D e holofote dos 25 cartões de serviço (são informativos) e dos cartões do carrossel; manter só nos 5 de especialidade. | Médio | Baixo | Baixo |
| 8 | **Chips do hero são genéricos** ("5 especialidades", "Documentos antes de vir"): servem a qualquer site. | Trocar pelo indicador do item 3 e por um selo do mundo do cartório (por exemplo, "Fé pública"). | Médio | Baixo | Nenhum |
| 9 | **Identidade ainda provisória.** O logotipo é um "J" provisório. Tipografia é uma família só (sem contraste), correta e legível, mas sem a "gravidade" institucional de um cartório. | Pedir o logotipo real ao cliente. Opcional: títulos em serifada autoral (fonte livre, hospedada no site) com a atual no texto corrido. Decisão estética do cliente. | Médio | Médio | Baixo |
| 10 | **Seções planas** ("Antes de vir", "Contato") são só texto sobre fundo liso. | Usar a fachada em baixa opacidade, ou um grão discreto, como textura (arquivo local, não `data:` por causa da CSP). | Baixo | Baixo | Nenhum |
| 11 | **Rodapé com 4 colunas de links** (padrão genérico). | Reduzir a 3 grupos e priorizar contato e localização. | Baixo | Baixo | Nenhum |
| 12 | ✅ **Feito.** **Funil de contato:** ótimo, mas só abre WhatsApp ou e-mail. | Acrescentar "copiar mensagem" para quem prefere ligar ou colar em outro lugar. | Baixo | Baixo | Nenhum |

## 4. Dívidas conhecidas (já combinadas, não são do front-end)

- Conteúdo jurídico dos atos ainda **não validado** pelo cartório (`"validado": false`).
- Dados de contato fictícios e e-mail de teste no funil: trocar antes de publicar.
- Foto da fachada: usar a original em boa resolução; a atual é um recorte de 1441 px.

## 5. O que descartei das skills, e por quê

| Sugestão das skills | Motivo |
|---|---|
| Instalar bibliotecas (GSAP, framer-motion, Tailwind, shadcn/ui, Radix, Lucide etc.) | O projeto é **zero dependências** de propósito: menos superfície de ataque e CSP estrita. Tudo que se pede dá para fazer com CSS/JS próprios. |
| Imagens por `picsum.photos` e outros serviços | Carregar imagens de terceiros viola a CSP e revela o visitante a terceiros. |
| Rolagem com inércia (Lenis e similares) | Dependência de terceiros e prejudica acessibilidade e "reduzir movimento". |
| Fontes pelo Google Fonts | Terceiros; já hospedamos a fonte no próprio site. |
| Estética brutalista/terminal, modo escuro exclusivo, "sem cartões" | Não combina com um cartório e contraria decisões do cliente (cartões e azul). |
| Skills de geração de imagem (`imagegen-*`, `image-to-code`, `brandkit`) e a randomização do `gpt-taste` | Pedem ferramentas externas de geração de imagem ou sorteio de layout; não se aplicam a um site institucional já desenhado. |
| VLibras (tradutor de Libras do governo) | É script de terceiros (gov.br) e conflita com a CSP. Vale a conversa com o cliente: se for exigência, dá para liberar só esse domínio, sabendo o custo de segurança. |

## 6. Sobre as skills no repositório

- **Auditadas:** 14 skills, 16 arquivos, apenas Markdown e uma licença; sem scripts, binários, executáveis, links simbólicos, texto invisível, URLs ou comandos de rede. As únicas menções a `npm install` são recomendações de design (descartadas acima).
- **`frontend-design`:** licença Apache-2.0, **está versionada** no repositório.
- **Pacote `taste-skill`:** sem licença declarada, então **não foi copiado**. Fica fixado por hash em `skills-lock.json` e `.agents/skills.manifest.json`. Para reinstalar: `npx skills add Leonxlnx/taste-skill -y` e depois `npm run skills`.
- **`npm run skills`** (também dentro de `npm test`) reprova se qualquer arquivo for alterado, aparecer arquivo novo ou algo suspeito. Foi testado com adulterações plantadas.
- **`CLAUDE.md`** na raiz fixa as regras: skills são sugestão, e segurança vem primeiro.

## 7. Referência consultada: biblioteca shadcn/ui

Consultei o catálogo público (64 componentes e blocos de página) só como **referência de padrões**. Nada foi instalado: a biblioteca é para React/Tailwind e o MCP dela executaria código do npm sem versão fixa, o que contraria as regras de segurança do projeto. Padrões recriados em HTML/CSS/JS próprios, sem dependências:

| Padrão (shadcn) | No site | Estado |
|---|---|---|
| **Command** (paleta de comandos) + **Kbd** | Busca de serviços em qualquer página: botão "Buscar" no cabeçalho, atalhos `/` e `Ctrl/⌘+K`, `<dialog>` nativo (foco preso, Esc fecha), mais procurados quando vazio. O índice (~3 KB compactados) só é baixado na primeira abertura. | Feito |
| **Toast** (Sonner) | Aviso "Mensagem copiada" no novo botão "Copiar mensagem" do funil. | Feito |
| **Badge** com status | Selo "Aberto agora · Fecha às 11h45" (hero e contato), calculado pelo horário de Brasília a partir de `expediente` em `content/site.json`. Não considera feriados. | Feito |
| Alert, Empty, Progress, Accordion, Breadcrumb, Carousel, Item, Button Group | Já existiam de forma equivalente. | Já havia |
| Sheet (painel lateral do menu no celular), Hover Card | Possíveis, mas sem ganho claro agora. | Descartado |
| Sidebar, Data Table, Chart, Calendar, Dialog de ação, formulários de login | Feitos para aplicações; não se aplicam a um site institucional. | Descartado |

## 8. Próximos passos sugeridos

1. Itens 1 e 2 (prévia de compartilhamento, 404/favicons): ganho alto, sem risco (o 3 já foi feito).
2. Item 4 (tamanho do texto e contraste): maior valor para o público.
3. Itens 5 a 8 (hierarquia dos cartões, rótulos, movimento, chips): refinamento visual, com revisão do cliente.
4. Itens 9 a 12 conforme o logotipo e a preferência do cliente.
