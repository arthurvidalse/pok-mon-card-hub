# Ajustes na feature Bulk

## 1. Planilha modelo com 2 linhas por carta

A planilha gerada a partir da TCGdex passa a ter a coluna `variante` entre `número` e `quantidade`, e cada carta oficial da coleção gera duas linhas:

```text
nome, colecao, numero, variante,      raridade, quantidade, condicao, preco_override
Pikachu, Base, 25,     comum,         Common,   0,          NM,
Pikachu, Base, 25,     reverse foil,  Common,   0,          NM,
```

Nome, coleção, número e raridade são idênticos nas duas linhas. A importação lê a nova coluna e grava a variante em cada item de estoque.

## 2. Preço por raridade + variante

A tabela de preços passa a ser indexada por raridade + variante + condição, permitindo que "reverse foil" tenha preço diferente de "comum" na mesma raridade. O preço de cada linha é calculado automaticamente por esse cruzamento; o campo de preço manual continua existindo apenas como override pontual.

O admin (aba Bulk > Tabela de Preços) ganha o seletor de variante nas regras, e a prévia da importação mostra o preço resolvido por raridade + variante.

## 3. Página pública /bulk/[colecao]

- Lista TODAS as cartas oficiais da coleção vindas da TCGdex, cruzadas com o estoque.
- Carta com pelo menos uma variante em estoque: foto exibida UMA vez, e abaixo dela a lista de variantes disponíveis com quantidade e valor (ex.: "comum · 10un · R$ 2,00" / "reverse foil · 5un · R$ 4,00"), além da raridade.
- Carta sem estoque: mesma foto com overlay preto semitransparente e o texto "Indisponível" centralizado, sem preço nem quantidade.
- Cada variante disponível pode ser adicionada ao carrinho separadamente.

## 4. Cabeçalho da coleção

No topo da página, o logo/símbolo oficial do set (fornecido pela TCGdex) aparece ao lado do nome da coleção, com contagem de cartas disponíveis.

## Detalhes técnicos

- Migração: adicionar coluna `variant` (text, default `comum`) em `bulk_cards` e `bulk_price_rules`; trocar as chaves únicas para `(set_id, local_id, variant, condition)` e `(rarity, variant, condition)`; manter RLS/GRANTs atuais.
- `src/lib/csv.ts` / gerador do modelo: emitir duas linhas por carta com a coluna `variante`.
- `src/lib/bulk-admin.functions.ts`: regras de preço e `importBulkCards` passam a considerar `variant` no upsert e no cálculo de preço da prévia.
- `src/lib/bulk.functions.ts`: `getBulkSetGallery` retorna a galeria completa do set (TCGdex) com um array de variantes disponíveis por carta, mais os dados do set (nome, logo/símbolo).
- `src/routes/bulk.$setId.tsx`: renderiza a galeria agrupada por carta, o estado "Indisponível" e o cabeçalho com logo.
- `src/lib/bulk-cart.ts` e a mensagem de WhatsApp incluem a variante em cada item.

Admin, importação, carrinho e tema visual permanecem como já definidos.
