# Correções e melhorias nos Binders

## 1. Binder visível não aparece na página pública

Causa confirmada: a leitura pública das tabelas `binders` / `binder_cards` falha com o erro
"permission denied for function is_admin". A regra de acesso de administrador dessas duas tabelas
vale para todos os visitantes (inclusive anônimos), e o banco tenta executar a função de checagem
de admin mesmo para quem não está logado — o que derruba a consulta inteira. Nas outras tabelas do
site a regra de admin está limitada a usuários autenticados, por isso só os binders quebram.

Correção: recriar as regras de acesso dos binders no mesmo padrão do resto do site — regra de
administrador apenas para usuários autenticados, e leitura pública liberada para visitantes
(binders visíveis e cartas de binders visíveis). Nada muda no que é exposto: binders ocultos
continuam invisíveis para o público.

## 2. Slots grandes demais / rolagem em binders pequenos

Na página pública e no admin a grade usa a largura toda, então um binder 2x2 gera cartas gigantes.

- Limitar a largura da grade conforme o número de colunas (carta com largura máxima ~200px),
  centralizando o álbum na tela.
- Garantir que a página inteira do binder caiba na altura da janela sempre que possível
  (altura da carta calculada a partir do espaço disponível, mantendo a proporção 2:3).
- No admin, mesma regra, com a grade em um painel de tamanho estável.

## 3. Binder com várias páginas (folhas)

Hoje o binder tem só uma folha (linhas × colunas). Passa a ter páginas ilimitadas:

- Novo campo `pages` no binder (padrão 1), editável no admin, com botões "adicionar folha" e
  "remover última folha" (só permite remover folha vazia).
- Cada carta continua guardada por `position`, agora interpretada como índice global:
  `posição = (página - 1) × (linhas × colunas) + slot`. As cartas já cadastradas continuam
  válidas (ficam na página 1).
- Página pública: navegação de folhas com setas "anterior / próxima", indicador "Folha 2 de 5",
  atalho pelo teclado (setas) e arraste/swipe no celular, com animação de virada de página.
  A folha atual também vai para a URL (`?folha=2`) para poder compartilhar.
- Admin: mesmo seletor de folhas ao editar as cartas, para preencher slot por slot em cada folha.

## Detalhes técnicos

- Migração: `ALTER TABLE public.binders ADD COLUMN pages integer NOT NULL DEFAULT 1`, mais
  `DROP POLICY`/`CREATE POLICY` das quatro políticas de `binders` e `binder_cards`
  (admin `TO authenticated`, leitura `TO anon, authenticated`).
- `binders.functions.ts` / `binders-admin.functions.ts`: incluir `pages` no select e no
  `saveBinder`; validar `pages >= 1`.
- `src/routes/binder.$slug.tsx`: `validateSearch` com `folha` (fallback 1), grade por página,
  controles de navegação e limite de largura/altura.
- `src/routes/_authenticated/admin.tsx` (aba Binders): campo de páginas, seletor de folha e
  mesmo dimensionamento de grade.
