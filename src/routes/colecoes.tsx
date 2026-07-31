import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LayoutGrid, List, Search } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/site/header";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { PokemonCard } from "@/components/collection/pokemon-card";
import { getSettings, getStats, listPokemons, type CardStatus } from "@/lib/collection.functions";
import { GENERATIONS, STATUS_OPTIONS } from "@/lib/status";

const searchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(["todos", "tenho_full_art", "tenho_comum", "nao_tenho"]).default("todos"),
  gen: z.coerce.number().optional(),
  view: z.enum(["grid", "list"]).default("grid"),
  page: z.coerce.number().default(0),
});

type CollectionSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/colecoes")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Coleções — Full Art Hunt Pokémon TCG" },
      {
        name: "description",
        content:
          "Navegue por toda a Pokédex Nacional e veja quais cartas Pokémon TCG Full Art eu já tenho, quais tenho só na versão comum e quais ainda faltam.",
      },
      { property: "og:title", content: "Coleções — Full Art Hunt Pokémon TCG" },
      {
        property: "og:description",
        content: "Filtre por status, geração e nome para descobrir quais cartas Full Art ainda faltam na coleção.",
      },
    ],
  }),
  component: CollectionsPage,
});

const PAGE_SIZE = 48;

function CollectionsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const list = useServerFn(listPokemons);
  const stats = useServerFn(getStats);
  const settings = useServerFn(getSettings);

  const statsQuery = useQuery({ queryKey: ["stats"], queryFn: () => stats() });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: () => settings() });
  const pokemonsQuery = useQuery({
    queryKey: ["pokemons", search.q ?? "", search.status, search.gen ?? null, search.page],
    queryFn: () =>
      list({
        data: {
          search: search.q,
          status: search.status as CardStatus | "todos",
          generation: search.gen ?? null,
          page: search.page,
          pageSize: PAGE_SIZE,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const total = pokemonsQuery.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function update(patch: Partial<CollectionSearch>) {
    void navigate({ search: (prev: CollectionSearch) => ({ ...prev, page: 0, ...patch }) });
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Coleções</h1>
        <p className="mt-1 text-muted-foreground">
          Toda a Pokédex Nacional, do #0001 ao #1025, com o status de cada carta.
        </p>

        {statsQuery.data ? (
          <div className="mt-5 rounded-2xl border bg-card p-5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">Progresso da coleção</span>
              <span className="font-display text-lg font-bold text-primary">{statsQuery.data.percent}%</span>
            </div>
            <Progress value={statsQuery.data.percent} className="mt-2" />
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Full Art: {statsQuery.data.fullArt}</span>
              <span>Só comum: {statsQuery.data.comum}</span>
              <span>Faltando: {statsQuery.data.naoTenho}</span>
            </div>
          </div>
        ) : (
          <Skeleton className="mt-5 h-28 w-full rounded-2xl" />
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              defaultValue={search.q ?? ""}
              placeholder="Buscar por nome ou número da Dex"
              className="pl-9"
              onChange={(event) => update({ q: event.target.value || undefined })}
            />
          </div>
          <Select value={search.status} onValueChange={(value) => update({ status: value as never })}>
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={search.gen ? String(search.gen) : "todas"}
            onValueChange={(value) => update({ gen: value === "todas" ? undefined : Number(value) })}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as gerações</SelectItem>
              {GENERATIONS.map((gen) => (
                <SelectItem key={gen} value={String(gen)}>
                  Geração {gen}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button
              variant={search.view === "grid" ? "default" : "outline"}
              size="icon"
              aria-label="Visualização em grade"
              onClick={() => update({ view: "grid" })}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={search.view === "list" ? "default" : "outline"}
              size="icon"
              aria-label="Visualização em lista"
              onClick={() => update({ view: "list" })}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{total} Pokémon encontrados</p>

        {pokemonsQuery.isLoading ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : search.view === "grid" ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {pokemonsQuery.data?.items.map((pokemon) => (
              <PokemonCard key={pokemon.id} pokemon={pokemon} />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {pokemonsQuery.data?.items.map((pokemon) => (
              <PokemonCard key={pokemon.id} pokemon={pokemon} compact />
            ))}
          </div>
        )}

        {total === 0 && !pokemonsQuery.isLoading ? (
          <p className="mt-10 text-center text-muted-foreground">Nenhum Pokémon com esses filtros.</p>
        ) : null}

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            disabled={search.page <= 0}
            onClick={() => void navigate({ search: (prev: CollectionSearch) => ({ ...prev, page: prev.page - 1 }) })}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {search.page + 1} de {pages}
          </span>
          <Button
            variant="outline"
            disabled={search.page + 1 >= pages}
            onClick={() => void navigate({ search: (prev: CollectionSearch) => ({ ...prev, page: prev.page + 1 }) })}
          >
            Próxima
          </Button>
        </div>
      </main>

      <WhatsAppFab number={settingsQuery.data?.whatsapp_number ?? ""} />
    </div>
  );
}
