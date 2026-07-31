## Objetivo

Site em português para divulgar e gerenciar sua coleção de cartas Pokémon TCG (foco Full Art), com área pública e painel admin, alimentado pelos dados reais da sua planilha (1025 Pokémon: 119 Full Art, 468 só comum, 438 não tenho).

## Backend (Lovable Cloud)

Tabelas:
- `pokemons` — id, dex_number, name, sprite_url (PokeAPI oficial por número da Dex), created_at
- `collections` — id, name, code, release_year, language
- `cards` — id, pokemon_id, collection_id (opcional), card_number, card_type, image_url, status (`tenho_full_art` | `tenho_comum` | `nao_tenho`), is_target, notes, updated_at
- `contact_messages` — id, card_id/pokemon_id, nome_do_visitante, enviado_em
- `site_settings` — número do WhatsApp e outros ajustes editáveis pelo admin
- `user_roles` + função `has_role` — controle de admin (sem cadastro público)

Segurança: leitura pública apenas de dados de coleção; escrita somente para admin. Registro de clique no WhatsApp permitido de forma anônima e controlada.

Seed: migração com os 1025 Pokémon e o status de cada um vindos da sua planilha (nada inventado). Sprites via URL oficial da PokeAPI.

Admin: seu e-mail (arthurvidalmaia@gmail.com) recebe o papel de admin no primeiro login.

## Páginas públicas

1. **Home** — hero com sua ilustração Team Rocket como imagem principal, título de impacto, frase curta e CTA para as coleções; estatísticas calculadas ao vivo (total, % completo, Full Arts, faltantes); seção "Últimas conquistas"; animações de scroll reveal, parallax leve e brilho holográfico sutil no hover — otimizadas para mobile.
2. **Coleções** — ordem da Pokédex, cards com sprite, nº, nome e status por cor (verde/amarelo/cinza); busca por nome/número; filtros por status, coleção e geração; barras de progresso; alternância grade/lista compacta; scroll infinito/paginação e skeletons.
3. **Detalhe da carta (modal + rota compartilhável)** — imagem grande, coleção, número, tipo, botões de WhatsApp contextuais e botão de copiar link.

WhatsApp: botão flutuante em todo o site e botões por carta, abrindo `wa.me/5584999693459` com mensagem pré-preenchida (nome do Pokémon, coleção e número). Cada clique registra uma linha em `contact_messages`. O número fica editável no admin.

## Painel admin (`/admin`, protegido)

- Login por e-mail/senha, sem cadastro público
- Dashboard: totais, faltantes, atividade recente e cartas mais procuradas (cliques no WhatsApp)
- CRUD de Pokémon, coleções e cartas; troca rápida de status; upload de imagem da carta ou link
- Importação/atualização em massa por CSV/XLSX com mapeamento das colunas (Dex #, Nome, Status, Coleção, Número, Link da Carta, Observações)
- Configuração do número de WhatsApp

Alterações refletem imediatamente na área pública.

## Design

Paleta vibrante inspirada no TCG (energia elétrica/azul profundo com destaques dourados), tipografia de colecionável para títulos e leitura limpa no corpo, cantos arredondados de carta, brilho holográfico contido, modo claro/escuro. Áreas reservadas para você trocar artes/banners depois.

## Detalhes técnicos

- TanStack Start + TanStack Query; leituras públicas via server functions com chave publicável, escrita admin via funções autenticadas
- Rotas: `/`, `/colecoes`, `/carta/$id`, `/auth`, `/admin/*`
- SEO: `head()` próprio por rota com título e descrição dinâmicos
- Componentização por domínio (`components/collection`, `components/admin`, `lib/*.functions.ts`) para facilitar evoluções

## Entrega em etapas

1. Banco + importação da planilha real
2. Landing page com estatísticas reais
3. Página de coleções com filtros e detalhe de carta
4. WhatsApp + log de contatos
5. Autenticação e painel admin com importação por planilha
