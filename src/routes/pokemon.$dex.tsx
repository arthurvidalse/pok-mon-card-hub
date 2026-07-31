import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/site/header";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { PokemonDetail } from "@/components/collection/pokemon-detail";
import { getPokemonByDex, getSettings } from "@/lib/collection.functions";

const pokemonQuery = (dex: number) =>
  queryOptions({ queryKey: ["pokemon", dex], queryFn: () => getPokemonByDex({ data: { dex } }) });
const settingsQuery = queryOptions({ queryKey: ["settings"], queryFn: () => getSettings() });

export const Route = createFileRoute("/pokemon/$dex")({
  loader: async ({ context, params }) => {
    const dex = Number(params.dex);
    if (!Number.isFinite(dex)) throw notFound();
    const pokemon = await context.queryClient.ensureQueryData(pokemonQuery(dex));
    if (!pokemon) throw notFound();
    context.queryClient.ensureQueryData(settingsQuery);
    return { name: pokemon.name, dex };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Pokémon indisponível — Full Art Hunt" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — Coleção Pokémon TCG Full Art`;
    const description = `Veja o status das cartas Full Art de ${loaderData.name} (Dex #${loaderData.dex}) na minha coleção e fale comigo no WhatsApp.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: PokemonPage,
  errorComponent: () => <Centered text="Não conseguimos carregar este Pokémon." />,
  notFoundComponent: () => <Centered text="Pokémon não encontrado na coleção." />,
});

function Centered({ text }: { text: string }) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-muted-foreground">{text}</p>
        <Button asChild className="mt-4">
          <Link to="/colecoes">Voltar às coleções</Link>
        </Button>
      </div>
    </div>
  );
}

function PokemonPage() {
  const { dex } = Route.useParams();
  const { data: pokemon } = useSuspenseQuery(pokemonQuery(Number(dex)));
  const { data: settings } = useSuspenseQuery(settingsQuery);

  if (!pokemon) return <Centered text="Pokémon não encontrado na coleção." />;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/colecoes">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </Button>
        <PokemonDetail pokemon={pokemon} whatsappNumber={settings.whatsapp_number ?? ""} />
      </main>
      <WhatsAppFab number={settings.whatsapp_number ?? ""} />
    </div>
  );
}
