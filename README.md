# Pokémon Card Hub

Quero criar um site completo para gerenciar e divulgar minha coleção de cartas Pokémon TCG (foco em cartas Full Art). O site tem dois públicos: (1) visitantes que veem minhas coleções e podem me contatar via WhatsApp para trocas/vendas, e (2) eu mesmo, como administrador, gerenciando o que já tenho e o que falta.

1. Landing page (página inicial)

Página de abertura criativa e com boas animações (scroll reveal, transições suaves entre seções, efeito parallax leve, elementos flutuantes/hover nas cartas). Evite exageros que atrapalhem a performance ou a leitura em celular.

Vou anexar artes/imagens personalizadas (ilustrações, artworks de cartas) para usar como banners, plano de fundo do hero e elementos decorativos — deixe áreas claras no design para receber essas imagens.

Hero section com: título de impacto, uma frase curta explicando o propósito do site (ex: "Acompanhe minha coleção de cartas Pokémon e me ajude a completá-la"), e um botão de call-to-action que leva até as coleções.

Seção de destaque com estatísticas gerais da coleção (ex: total de cartas, % completo, quantas Full Art já tenho, quantas faltam) calculadas automaticamente a partir dos dados armazenados — nada de números fixos no código.

Estética inspirada no universo Pokémon TCG: cores vibrantes, cards com efeito "holográfico" sutil no hover, tipografia que remете a cartas colecionáveis, mas mantendo tudo limpo e profissional (não infantilizado).

Totalmente responsivo, com atenção especial ao mobile, já que a maior parte do tráfego provavelmente virá de gente acessando pelo celular para me mandar mensagem no WhatsApp.

2. Estrutura de dados (banco de dados)

Crie um banco de dados (Supabase, já integrado ao Lovable) com esta estrutura mínima — vou enviar planilhas com os dados reais para importação:

Tabela pokemons

id

dex_number (número da Pokédex nacional)

name

sprite_url (imagem do próprio Pokémon)

created_at

Tabela collections (coleções/sets do TCG, ex: "Prismatic Evolutions", "Mega Evolution")

id

name

code (sigla do set)

release_year

language (inglês / português / japonês)

Tabela cards (cada carta específica de um Pokémon em uma coleção)

id

pokemon_id (referência a pokemons)

collection_id (referência a collections)

card_number (número da carta dentro do set)

card_type (ex: comum, EX, GX, V, VSTAR, ex, Full Art, Mega ex etc.)

image_url (imagem da carta em si — não do Pokémon)

status (enum: tenho_full_art, tenho_comum, nao_tenho) — este é o campo principal que define os destaques visuais (verde / amarelo / cinza)

is_target (boolean — marca se essa é a versão Full Art que estou buscando para aquele Pokémon)

notes (observações livres)

updated_at

Tabela contact_messages (opcional, log de quem entrou em contato — ver seção 5)

id

pokemon_ou_carta_referenciada

nome_do_visitante (opcional, se ele informar)

enviado_em

Ao importar minhas planilhas, mapeie as colunas (Dex #, Nome, Status, Coleção, Número, Link da Carta) para essas tabelas. Preciso conseguir reimportar/atualizar essas planilhas depois pelo painel admin, sem precisar mexer em código.

3. Página de Coleções (pública)

Exibição organizada por Pokémon (seguindo a ordem da Pokédex Nacional) e, dentro de cada Pokémon, todas as cartas/coleções relacionadas (ordenadas por ano/coleção).

Cada card visual mostra: sprite do Pokémon, número da Dex, nome, e as versões de carta com indicação clara de status:

Verde = já tenho a Full Art (objetivo alcançado)

Amarelo = tenho a versão comum, falta a Full Art

Cinza = ainda não tenho nenhuma versão

Filtros e busca: por nome do Pokémon, número da Dex, status (tenho / falta / não tenho), coleção/set, geração.

Barra de progresso visual por Pokémon e progresso geral da coleção.

Modo de visualização em grade (grid de cards) e opção de lista compacta.

Ao clicar em uma carta, abrir um modal/página de detalhe com imagem grande, nome da coleção, número, tipo de carta e um botão "Tenho essa carta e quero oferecer" ou "Estou buscando esta carta" que leva para o WhatsApp (ver seção 5).

4. Painel Administrador (área restrita)

Login de administrador protegido por autenticação (email/senha via Supabase Auth). Apenas eu devo ter acesso — não deve haver cadastro público de novos admins.

Dashboard com visão geral: total de cartas, quantas faltam, atividade recente.

CRUD completo de cartas e Pokémon:

Marcar carta como "concluída" (mudar status para tenho_full_art)

Editar quais cartas faltam / já tenho / tenho só a comum

Adicionar novas cartas/coleções manualmente

Upload de imagem da carta (ou colar link de imagem)

Importar/atualizar dados em massa via planilha (CSV/XLSX)

Alterações feitas no painel admin devem refletir instantaneamente na página pública de coleções.

5. Integração com WhatsApp Business

Botão fixo/flutuante em todo o site ("Fale comigo no WhatsApp") e botões contextuais em cada carta.

Ao clicar, abrir o WhatsApp (via link https://wa.me/[meu número]?text=...) com uma mensagem pré-preenchida automaticamente contendo o nome do Pokémon e da carta específica que a pessoa estava vendo, algo como: "Olá! Vi no seu site que você [tem/está buscando] a carta [Nome] — [Coleção] #[Número]. Eu tenho/quero essa carta para oferecer."

Deixar um campo configurável no painel admin para eu inserir/trocar meu número de WhatsApp Business sem precisar mexer em código.

(Opcional, sugestão minha) Registrar um log simples desses cliques/contatos na tabela contact_messages para eu ter noção de quais cartas geram mais interesse — sem precisar de integração complexa com a API oficial do WhatsApp, só contando os cliques no botão.

6. Funcionalidades extras sugeridas (fique à vontade para incluir)

Modo escuro/claro.

Seção "Últimas conquistas" na home mostrando as cartas Full Art mais recentemente marcadas como concluídas.

Compartilhamento: botão para copiar o link direto de uma carta/Pokémon específico, para eu poder mandar para alguém.

SEO básico (meta tags, título dinâmico por página) para o site ser encontrado caso eu decida divulgar publicamente.

Loading states e skeleton screens enquanto os dados carregam, já que são muitas cartas.

Paginação ou scroll infinito na lista de coleções para não pesar a página com mais de mil Pokémon.

7. Observações finais

Vou anexar as planilhas com os dados reais das coleções e artes/imagens para o design — use essas informações reais assim que eu enviar, sem inventar dados de exemplo além do necessário para o protótipo inicial.

Priorize performance e responsividade acima de efeitos visuais excessivos.

Estrutura de código organizada e componentizada, já que pretendo continuar pedindo ajustes e novas funcionalidades depois.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/75cacaa2-591a-4c69-a3da-b30b1cec8f0e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
