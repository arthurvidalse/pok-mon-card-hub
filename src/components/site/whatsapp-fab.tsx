import { MessageCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { logContact } from "@/lib/collection.functions";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function WhatsAppFab({ number }: { number: string }) {
  const log = useServerFn(logContact);
  if (!number) return null;

  const href = buildWhatsAppUrl(
    number,
    "Olá! Vi seu site da coleção Pokémon TCG e queria falar sobre cartas.",
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        void log({ data: { label: "Botão flutuante", intent: "geral" } }).catch(() => {});
      }}
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-success px-4 py-3 text-sm font-semibold text-success-foreground shadow-lg transition-transform hover:scale-105 md:bottom-8 md:right-8"
      aria-label="Fale comigo no WhatsApp"
    >
      <MessageCircle className="size-5" />
      <span className="hidden sm:inline">Fale comigo no WhatsApp</span>
    </a>
  );
}
