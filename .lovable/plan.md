# Aba "Bulk" — venda de cartas em lote

Nova área do site para vender duplicatas, com catálogo vindo da TCGdex, preço por raridade+condição, carrinho e fechamento de pedido no WhatsApp.

## Banco de dados

Duas tabelas novas, com leitura pública e escrita apenas para o administrador (mesma regra `is_admin()` já usada no projeto), incluindo os GRANTs explícitos pedidos.

- `bulk_price_rules`: raridade, condição, preço. Combinação raridade+condição única.
- `bulk_cards`: coleção (código e nome), número da carta, nome, imagem, raridade, condição, quantidade, preço manual opcional, observações, datas. Chave única por coleção + número + condição (permite reimportar a planilha sem duplicar).

## Painel admin — aba "Bulk"

Nova aba ao lado de Cartas / Coleções / Binders, com quatro seções:

1. **Tabela de preços** — criar, editar e excluir linhas de raridade + condição + preço.
2. **Planilha modelo** — seletor de coleção alimentado ao vivo pela lista de coleções da TCGdex e botão que baixa um CSV com todas as cartas oficiais daquela coleção: nome, coleção, número preenchidos; quantidade em branco; condição "NM"; preço em branco.
3. **Importar planilha** — upload do CSV preenchido, com prévia antes de gravar: linhas sem quantidade (ou zero) são ignoradas; cada linha é cruzada com a TCGdex para pegar imagem e raridade; o preço vem da coluna preço quando preenchida, senão da tabela de preços, e a prévia sinaliza em amarelo as combinações sem regra cadastrada. Só ao confirmar os dados são gravados.
4. **Gestão manual** — lista de tudo que está em estoque, com busca por nome/coleção e edição de quantidade, condição e preço manual, além de exclusão individual.

## Páginas públicas

- `/bulk` — coleções que têm pelo menos uma carta em estoque, com logo do set (TCGdex) e contagem de cartas disponíveis.
- `/bulk/{set_id}` — galeria com **todas** as cartas oficiais da coleção. Cartas em estoque mostram imagem, condição, preço, quantidade e botão "Adicionar ao carrinho" com seletor limitado ao estoque. Cartas que não tenho aparecem com a mesma imagem coberta por um véu escuro e o texto "Indisponível". Campo de busca por nome dentro da coleção.
- Link "Bulk" no header, junto de Coleções e Binders.

## Carrinho e checkout

- Carrinho no navegador (localStorage), sem login.
- Botão flutuante fixo nas páginas de bulk com contador de itens.
- Painel com nome, coleção, condição, quantidade, preço unitário, subtotal por item e total geral; permite remover itens.
- "Fechar pedido no WhatsApp" monta uma mensagem única com o pedido completo e o total, usando o número já configurado nas configurações do site.

## Visual

Mesmo tema escuro/dourado, mesmo Header, WhatsAppFab e estilo de cards arredondados do resto do site. Nenhuma identidade nova.

## Detalhes técnicos

- Migração cria as tabelas na ordem: CREATE TABLE, GRANTs (anon leitura; authenticated CRUD; service_role total), ENABLE RLS, políticas (SELECT público; ALL para `is_admin()`), trigger `set_updated_at`.
- TCGdex é chamada via server functions (`src/lib/bulk.functions.ts`) para listas/detalhes de sets, com cache do TanStack Query no cliente; endpoints `https://api.tcgdex.net/v2/en/sets` e `/sets/{id}`.
- Leituras públicas usam `createPublicClient` (padrão já existente); escritas usam `requireSupabaseAuth` + verificação de admin, como em `admin.functions.ts`.
- Novos arquivos: `src/lib/bulk.functions.ts`, `src/lib/bulk-admin.functions.ts`, `src/lib/tcgdex.ts`, `src/lib/bulk-cart.ts`, `src/components/admin/bulk-admin.tsx`, `src/components/bulk/cart-fab.tsx`, `src/routes/bulk.index.tsx`, `src/routes/bulk.$setId.tsx`. Alterados: `header.tsx`, `_authenticated/admin.tsx`.
- CSV gerado e lido com parser próprio (sem dependência nova), separador vírgula e cabeçalho fixo `nome,colecao,numero,quantidade,condicao,preco`.
- Upsert por (set_id, local_id, condition); preço exibido = `price_override` quando existir, senão a regra raridade+condição.
- `head()` próprio com título/descrição em cada rota nova.
