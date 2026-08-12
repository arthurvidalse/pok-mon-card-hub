import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/site/header";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { PokemonCard } from "@/components/collection/pokemon-card";
import { useReveal } from "@/hooks/use-reveal";
import { getRecentAchievements, getSettings, getStats } from "@/lib/collection.functions";
import heroAsset from "/src/assets/homepic.png";

const statsQuery = queryOptions({ queryKey: ["stats"], queryFn: () => getStats() });
const recentQuery = queryOptions({ queryKey: ["recent"], queryFn: () => getRecentAchievements() });
const settingsQuery = queryOptions({ queryKey: ["settings"], queryFn: () => getSettings() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AV Collectr — Coleção Pokémon TCG" },
      {
        name: "description",
        content:
          "Acompanhe minha coleção de cartas Pokémon TCG Full Art, veja o que já conquistei, o que ainda falta e fale comigo no WhatsApp para trocas e vendas.",
      },
      { property: "og:title", content: "AV Collectr — Coleção Pokémon TCG" },
      {
        property: "og:description",
        content: "Coleção de cartas Pokémon TCG Full Art: progresso em tempo real e contato direto por WhatsApp.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(statsQuery);
    context.queryClient.ensureQueryData(recentQuery);
    context.queryClient.ensureQueryData(settingsQuery);
  },
  component: Home,
});

function Home() {
  const { data: stats } = useSuspenseQuery(statsQuery);
  const { data: recent } = useSuspenseQuery(recentQuery);
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const statsReveal = useReveal<HTMLDivElement>();
  const recentReveal = useReveal<HTMLDivElement>();

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(60% 60% at 20% 10%, color-mix(in oklab, var(--color-primary) 30%, transparent), transparent), radial-gradient(50% 50% at 90% 20%, color-mix(in oklab, var(--color-accent) 30%, transparent), transparent)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center md:py-24">
            <div className="animate-fade-in">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                <Sparkles className="size-4" /> Caçada por Full Arts
              </span>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">
                Minha coleção Pokémon TCG, carta por carta
              </h1>
              <p className="mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
                Acompanhe minha coleção de cartas Pokémon e me ajude a completá-la. Tem uma Full Art que eu
                procuro? É só me chamar no WhatsApp.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/colecoes">
                    Ver as coleções <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/procuradas">
                    Cartas que procuro
                  </Link>
                </Button>
              </div>
            </div>

            <div className="relative flex justify-center">
              <img
                src={heroAsset}
                alt="Ilustração do colecionador com seus Pokémon"
                className="w-full max-w-sm rounded-3xl drop-shadow-2xl md:max-w-md"
                fetchPriority="high"
              />
            </div>
          </div>
        </section>

        <section ref={statsReveal.ref} className={`${statsReveal.className} mx-auto max-w-6xl px-4 py-10`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pokémon catalogados" value={stats.totalPokemons} icon={<Sparkles className="size-5" />} />
            <StatCard label="Full Arts conquistadas" value={stats.fullArt} icon={<Trophy className="size-5" />} accent="success" />
            <StatCard label="Só a versão comum" value={stats.comum} icon={<Target className="size-5" />} accent="warning" />
            <StatCard label="Ainda faltam" value={stats.naoTenho + stats.comum} icon={<Target className="size-5" />} />
          </div>

          <div className="mt-6 rounded-2xl border bg-card p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl font-bold">Progresso geral</h2>
              <span className="font-display text-2xl font-extrabold text-primary">{stats.percent}%</span>
            </div>
            <Progress value={stats.percent} className="mt-3" />
            <p className="mt-2 text-sm text-muted-foreground">
              {stats.fullArt} de {stats.totalCards} cartas com a Full Art conquistada.
            </p>
          </div>
        </section>

        {recent.length > 0 ? (
          <section ref={recentReveal.ref} className={`${recentReveal.className} mx-auto max-w-6xl px-4 py-10`}>
            <h2 className="font-display text-2xl font-bold">Últimas conquistas</h2>
            <p className="mt-1 text-sm text-muted-foreground">Full Arts marcadas como concluídas recentemente.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {recent.map((pokemon) => (
                <PokemonCard key={pokemon.id} pokemon={pokemon} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="rounded-3xl border bg-card p-8 text-center">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Quer trocar ou vender uma carta?</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Abra qualquer carta da coleção e clique no botão de WhatsApp — a mensagem já vai preenchida com o
              Pokémon e a carta que você estiver vendo.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link to="/colecoes">Explorar coleções</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Coleção Pokémon TCG · AV Collectr
      </footer>

      <WhatsAppFab number={settings.whatsapp_number ?? ""} />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: "success" | "warning";
}) {
  return (
    <div className="holo-card rounded-2xl border-2 bg-card p-5">
      <div
        className={`inline-flex size-9 items-center justify-center rounded-lg ${
          accent === "success"
            ? "bg-success/15 text-success"
            : accent === "warning"
              ? "bg-warning/20 text-warning-foreground"
              : "bg-primary/10 text-primary"
        }`}
      >
        {icon}
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold">{value.toLocaleString("pt-BR")}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
