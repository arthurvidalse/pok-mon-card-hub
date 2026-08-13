import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/site/header";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { getSettings } from "@/lib/collection.functions";
import { getBinder, type Binder, type BinderCard, type BinderCardStatus } from "@/lib/binders.functions";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/binder/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Binder ${params.slug} — AV Collectr Pokémon TCG` },
      {
        name: "description",
        content: "Álbum de cartas Pokémon TCG disponíveis para troca e venda.",
      },
    ],
  }),
  component: BinderPage,
});

function BinderPage() {
  const { slug } = Route.useParams();
  const getB = useServerFn(getBinder);
  const settings = useServerFn(getSettings);

  const binderQuery = useQuery({
    queryKey: ["binder", slug],
    queryFn: () => getB({ data: { slug } }),
  });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: () => settings() });

  const binder = binderQuery.data;
  const whatsapp = settingsQuery.data?.whatsapp_number ?? "";

  if (binderQuery.isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Skeleton className="mb-6 h-10 w-64 rounded-xl" />
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!binder) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">Binder não encontrado</h1>
          <p className="mt-2 text-muted-foreground">
            Este binder não existe ou não está publicado.
          </p>
          <Link
            to="/binders"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-secondary"
          >
            <ArrowLeft className="size-4" /> Ver todos os binders
          </Link>
        </main>
      </div>
    );
  }

  const totalSlots = binder.rows * binder.cols;
  // Mapa posição → carta
  const cardsByPosition = new Map<number, BinderCard>(
    (binder.cards ?? []).map((c) => [c.position, c]),
  );

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Cabeçalho */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              to="/binders"
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Binders
            </Link>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">{binder.title}</h1>
            {binder.description ? (
              <p className="mt-1 text-muted-foreground">{binder.description}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Grade {binder.rows} × {binder.cols} · {totalSlots} slots
            </p>
          </div>
        </div>

        {/* Grade */}
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${binder.cols}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: totalSlots }).map((_, i) => {
            const card = cardsByPosition.get(i);
            return card ? (
              <FilledSlot key={i} card={card} whatsapp={whatsapp} binderTitle={binder.title} />
            ) : (
              <EmptySlot key={i} />
            );
          })}
        </div>
      </main>

      <WhatsAppFab number={whatsapp} />
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="aspect-[2/3] rounded-xl border-2 border-dashed border-border/60 bg-card/30 transition-colors hover:border-border" />
  );
}

const STATUS_LABEL: Record<BinderCardStatus, string> = {
  available: "Disponível",
  reserved: "Reservado",
  sold: "Vendido/Trocado",
};

const STATUS_STYLE: Record<BinderCardStatus, string> = {
  available: "bg-success/15 text-success",
  reserved: "bg-warning/20 text-warning-foreground",
  sold: "bg-neutralcard text-neutralcard-foreground",
};

function FilledSlot({
  card,
  whatsapp,
  binderTitle,
}: {
  card: BinderCard;
  whatsapp: string;
  binderTitle: string;
}) {
  const isDimmed = card.status === "sold" || card.status === "reserved";

  function handleWhatsApp() {
    if (!whatsapp) return;
    const msg = `Olá! Vi no seu binder "${binderTitle}" a carta "${card.card_name ?? "sem nome"}"${card.set_name ? ` (${card.set_name})` : ""}${card.price ? ` — R$ ${card.price.toFixed(2)}` : ""}. Ainda está disponível?`;
    window.open(buildWhatsAppUrl(whatsapp, msg), "_blank");
  }

  return (
    <div
      className={`group relative flex aspect-[2/3] flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 ${isDimmed ? "opacity-70" : "hover:-translate-y-1 hover:shadow-md"}`}
    >
      {/* Imagem */}
      {card.image_url ? (
        <img
          src={card.image_url}
          alt={card.card_name ?? "Carta"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary/40 text-xs text-muted-foreground px-2 text-center">
          {card.card_name ?? "Sem imagem"}
        </div>
      )}

      {/* Overlay de info — aparece no hover ou quando tem preço/status relevante */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-background/95 via-background/70 to-transparent px-2 py-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {card.card_name ? (
          <p className="truncate text-xs font-semibold leading-tight">{card.card_name}</p>
        ) : null}
        {card.set_name ? (
          <p className="truncate text-xs text-muted-foreground">{card.set_name}</p>
        ) : null}
        {card.price != null ? (
          <p className="text-xs font-bold text-primary">
            R$ {card.price.toFixed(2)}
          </p>
        ) : null}
        {whatsapp && card.status === "available" ? (
          <button
            type="button"
            onClick={handleWhatsApp}
            className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg bg-success px-2 py-1 text-xs font-medium text-success-foreground transition hover:brightness-110"
          >
            <MessageCircle className="size-3" /> Tenho interesse
          </button>
        ) : null}
      </div>

      {/* Badge de status */}
      <span
        className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none ${STATUS_STYLE[card.status as BinderCardStatus]}`}
      >
        {STATUS_LABEL[card.status as BinderCardStatus]}
      </span>
    </div>
  );
}
