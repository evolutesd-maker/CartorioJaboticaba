# Auditoria de conteúdo: o que o Tabelião respondeu

**Data:** 07/10/2026. **Critério:** o que foi gerado por Claude só fica se algum arquivo ou texto do Tabelião o sustenta. Textos do Tabelião seguem literais.

## 1. Inventário do que foi gerado (antes da limpeza)

| Item | Onde | Base no material do Tabelião? | Decisão |
|---|---|---|---|
| Lista de documentos de cada serviço | `documentos` em `content/especialidades/*.json` | **Sim** para compra e venda, doação (as duas), procuração e ata de usucapião. **Não** para os demais | Mantidas as 5 listas dele. Demais removidas |
| "Quando é necessário" | `quando` (20 serviços) | Não | Removido |
| "Como funciona" (passo a passo) | `passos` (78 passos) | Não | Removido |
| Perguntas frequentes | `perguntas` (42 perguntas) | Não | Removido |
| Prazo e custo próprios de cada serviço | `prazo`, `custo` | Não | Removidos. Todos mostram "Verificar com o cartório." |
| Descrição longa das 5 especialidades | `descricao` | Não (quatro têm texto dele, em `textoCartorio`) | Removida. A página usa o resumo curto |
| Aviso "Qual a diferença?" (Junta Comercial) | `aviso` do RCPJ | Não | Removido |
| Resumos dos serviços | `resumo` | Parcial | Reescritos com palavras do Tabelião nos casos em que afirmavam algo a mais |
| Serviços sem nenhuma menção dele | 5 serviços | Não | Removidos (lista abaixo) |
| Bloco "O que quase sempre é pedido" e "Antes de sair de casa" | página Documentos | Não | Removidos |
| "Custos", "Atendimento prioritário" e "Fiscalização" | página Quem somos | Não | Removidos |
| Cartões e links do "Solicite online" | `content/links.json` | Sim (lista de links dele) | Mantidos |
| Requerimentos, cartas de anuência e Tabela de Emolumentos | `content/modelos/` | Sim | Mantidos |
| Política de privacidade | `content/paginas/` | Sim (texto dele) | Mantida |
| Textos institucionais, de e-Notariado e de especialidades | `content/` | Sim (literais) | Mantidos |
| Formulário "Fale com o cartório", busca, menu, rodapé | `src/` e `build.mjs` | Funcionalidade do site, sem conteúdo jurídico | Mantidos |

## 2. Serviços removidos (sem base nos arquivos do Tabelião)

- Notas: **Autenticar cópias de documentos**
- Notas: **Autorização para criança ou adolescente viajar**
- Notas: **Declarar união estável**
- Registro Civil das Pessoas Naturais: **Reconhecer um filho (incluir o nome do pai no registro)**
- Registro Civil das Pessoas Naturais: **Corrigir ou atualizar um registro civil**

## 3. Serviços mantidos sem lista de documentos

Mostram o texto do Tabelião (quando existe), o resumo e o aviso "A lista de documentos deste serviço será confirmada pelo cartório": reconhecimento de firma, atas notariais, cessões de herança, inventário, testamento, divórcio, consultar/pagar/apresentar protesto, notificação extrajudicial, certidões de RTD e de RCPJ, casamento.

## 4. O que ainda falta pedir ao Tabelião

Documentos de cada serviço do item 3, e o texto completo da Cessão de Direitos Hereditários (Bem Específico).
