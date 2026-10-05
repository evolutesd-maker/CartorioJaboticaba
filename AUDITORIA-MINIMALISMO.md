# Auditoria: acesso à informação e minimalismo

**Data:** 05/10/2026 · **Escopo:** home, página de especialidade, página de ato (exemplo: procuração), documentos e contato · **Foco pedido:** achar informação fácil, menos "tudo em cartão", mais minimalista, preparar o site para receber **muitos dados e links**.

> **Como foi feita.** Olhei capturas de tela atuais (1280 px) e contei os blocos no HTML gerado. Usei `impeccable` e `web-design-guidelines` só como lista de verificação mental: **não** executei os scripts da `impeccable` e **não** baixei a lista de regras remota da `web-design-guidelines` (é uma URL de terceiros; fica para quando você autorizar). A skill `sites-incriveis` constrói páginas de rolagem narrativa (cenas, trechos presos na tela, entrevista inicial). Isso vai na direção oposta do que você pediu (informação direta, mais simples), então **não a apliquei** nem copiei o motor dela. Aproveitei só o critério de "ver a página rolando antes de aprovar".
> **Atualização (05/10/2026):** os passos A a E da seção 5 foram aplicados e testados. Ver "Resultado" no fim.

## 1. Diagnóstico em uma frase

O site está bonito, mas **quase tudo é um cartão branco sobre fundo azul**, e o cartão virou a resposta para qualquer conteúdo. Com poucos dados funciona. Com 100 documentos e dezenas de links, vira uma parede de caixas iguais, e o visitante precisa "caçar".

## 2. Achados

| # | Onde | Problema | Efeito quando chegarem os dados |
|---|---|---|---|
| 1 | Home, abaixo do banner | Cartão (busca) com **outro cartão por dentro** (carrossel de "Mais procurados" com 6+ cartões). | O carrossel esconde itens fora da tela; o visitante não sabe o que não viu. |
| 2 | Home, "Escolha a especialidade" | 5 cartões grandes, cada um com 3–4 marcadores. Repete o que já aparece no carrossel e nas páginas internas. | Cada novo serviço obriga a mexer no cartão ou deixá-lo desigual. |
| 3 | Home, "Antes de vir" | 3 cartões que são só links. | Cartão para um único link pesa mais que o link. |
| 4 | Página de ato | Cada documento da lista é **um cartão branco**; "Prazo e custo" são 2 cartões; cada pergunta é um cartão. Num ato com 12 documentos são 12 caixas empilhadas. | Leitura longa e cansativa, difícil de comparar e de imprimir. |
| 5 | Contato | Os mesmos dados (telefone, WhatsApp, e-mail, endereço) aparecem na seção de localização, no funil e no rodapé, e o WhatsApp também no cabeçalho. | Quatro lugares para atualizar e para ficarem diferentes entre si. |
| 6 | Caminhos de contato | Botão do cabeçalho, 2 botões do banner, painel de busca, seção de localização, funil. São cinco "falar com o cartório" competindo. | O visitante não sabe qual é o principal. |
| 7 | Listas longas | Não há índice A–Z, filtro nem agrupamento visível na página de especialidade quando ela crescer. | Com 40+ atos por especialidade, rolar não basta. |
| 8 | Links e PDFs | Não existe um formato padrão para "modelo para baixar" (nome, tipo, tamanho, data). | Os links que você vai mandar entram sem padrão, cada um de um jeito. |
| 9 | Visual | Movimento (flutuação, brilho nos botões, elementos que se desenham, troca de página) soma muito para um site de informação. | Cada efeito a mais disputa atenção com o conteúdo. |
| 10 | Cores | Três fundos (azul, azul escuro, branco) alternam bloco a bloco, mais o dourado. | Ritmo bom hoje; com muito conteúdo vira "listras". |

**O que está bom e deve ficar:** hero com a fachada, busca por palavras, "Aberto agora", tipografia, contraste, funcionamento sem JavaScript, segurança. Nada disso precisa mudar.

## 3. Direção proposta: "folha e linhas"

Em vez de cartão para tudo:

- **Listas abertas com linha fina** (como um índice) para especialidades, atos, documentos e perguntas. Texto grande, uma seta à direita, um traço separando. Sem caixa, sem sombra.
- **Cartão só onde há ação:** a busca (um só) e o contato (um só). Duas caixas por página, no máximo.
- **Uma "folha" branca única** para o conteúdo de leitura (documentos necessários, passo a passo, prazo e custo). Dentro dela, linhas, não caixas.
- **Um único chamado principal** por tela: "Falar com o cartório". Os demais viram links de texto.
- **Menos movimento:** manter a entrada do hero, a troca de página e o levantar do hover; tirar o resto.

### Como ficaria na home (esboço)

```
[banner: título, 2 botões, foto]
[busca: um campo + "mais procurados" como 6 links em lista, sem carrossel]

Especialidades
  Notas ........................ escrituras, procurações, firmas        →
  Protesto de Títulos ......... consultar, pagar, cancelar            →
  Registro de Títulos e Doc. .. contratos, notificações, certidões    →
  Registro Civil PJ ........... associações e entidades               →
  Registro Civil PN ........... nascimento, casamento, óbito          →

Antes de vir: Documentos necessários · Orientações · Modelos        (uma linha de links)

Como chegar e quando ir   [endereço, horário, telefone, WhatsApp, e-mail — uma vez só] [foto]
Fale com o cartório       [funil]
rodapé enxuto
```

### Como ficaria uma página de ato

Um bloco de leitura em coluna única: resumo, **lista de documentos com marcador (sem caixas)**, passo a passo numerado, prazo e custo em duas linhas, perguntas em lista com divisórias. A barra lateral fica com só **um** bloco: contato.

## 4. Preparar para "muitos dados e links"

1. **Padrão de link/arquivo:** definir um formato único (título, tipo, tamanho, data de atualização), ex.: "Procuração, modelo de pedido (PDF, 120 KB, atualizado em 10/2026)". Fica em `content/` e o site gera a linha.
2. **Índice A–Z e filtro** nas páginas de especialidade e em Documentos, com contagem ("32 serviços").
3. **Links externos:** hoje a regra do projeto permite só `wa.me` e Google Maps. Se você for enviar outros (tribunal, CENSEC, e-Notariado, Receita, gov.br etc.), cada **domínio** precisa ser aprovado por você e entrar numa lista fixa no verificador de segurança. Me diga quais antes de mandar.
4. **Fonte única dos dados de contato:** telefone, WhatsApp, e-mail e horário em `content/site.json` e mostrados em um só bloco; o resto vira link para ele.
5. **Validação:** continua valendo, nenhum ato vai a "validado" sem o cartório.

## 5. Ordem sugerida (impacto ÷ esforço)

| Passo | O que muda | Risco |
|---|---|---|
| A | Página de ato: lista de documentos e perguntas sem caixas; folha única | Baixo |
| B | Home: "Escolha a especialidade" vira lista aberta; "Mais procurados" vira lista (sem carrossel) | Médio, visual muda bastante |
| C | Contato em um bloco só; rodapé enxuto; um chamado principal | Baixo |
| D | Índice A–Z, filtro e contagem; padrão de arquivos/links | Médio |
| E | Reduzir movimento (manter só o essencial) | Baixo |

Cada passo passa por: `npm test`, axe, teste de largura (320–1440 px), e eu olho as capturas antes de entregar.

## 6. O que preciso de você

- **Aprovar a direção "folha e linhas"** (ou me dizer o que preferiria manter em cartão).
- **Aprovar a ordem A→E** ou escolher por onde começar. Sugestão: A e C primeiro (menor risco), depois B para você ver a home nova.
- **Lista de domínios externos** que você pretende linkar.
- Quando for mandar os dados: de preferência **por especialidade**, no formato "ato → documentos → prazo → custo → links/modelos", em texto simples. Eu organizo em `content/`.

## 7. Resultado (aplicado)

- **A. Página de serviço:** uma folha branca com linhas no lugar de caixas (documentos, prazo e custo, perguntas, "Veja também"); a lateral ficou só com o contato.
- **B. Início:** "Mais procurados" em lista (sem carrossel); especialidades em lista aberta; "Antes de vir" virou uma linha de links; a faixa escura extra saiu.
- **C. Contato:** horário e canais direto sobre o azul; rodapé em 3 colunas, com contato uma única vez.
- **D. Listas grandes:** filtro e contagem nas especialidades com 8+ serviços; Documentos de A a Z com letras; linha padrão de arquivo (tipo, tamanho, data).
- **E. Movimento:** saíram o brilho que varre os botões, o desenho dos ícones e o brilho que seguia o mouse nos cartões. Ficam: entrada do hero, troca de página, levantar no hover, chips flutuantes e barra de leitura.
- CSS: cerca de 13 KB de regras antigas (cartões e carrossel) removidas; o JS do carrossel também.
- Testes: `npm test`, axe (0 violações em 37 páginas × 2 larguras), sem estouro de 320 a 1440 px, e os testes de comportamento (busca, funil, "aberto agora", topo ao navegar, troca de página, filtros e A–Z).
