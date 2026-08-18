import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBulkSets } from "@/lib/bulk.functions";
import { getSet } from "@/lib/tcgdex";
import { Header } from "@/components/site/header";
import { CartFab } from "@/components/bulk/cart-fab";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/bulk")({
  head: () => ({
    meta: [
      { title: "Bulk — AV Collectr" },
      { name: "description", content: "Compre cartas avulsas e lotes." },
    ],
  }),
  component: BulkPage,
});

function BulkPage() {
  const getSets = useServerFn(listBulkSets);
  
  const setsQuery = useQuery({
    queryKey: ["bulk-sets"],
    queryFn: () => getSets()
  });

  const [logos, setLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchLogos() {
      if (!setsQuery.data) return;
      
      const newLogos: Record<string, string> = {};
      for (const set of setsQuery.data) {
        try {
          // Use direct URL pattern to avoid multiple API calls
          newLogos[set.setId] = `https://assets.tcgdex.net/en/${set.setId}/logo`;
        } catch (e) {
          console.error(e);
        }
      }
      setLogos(newLogos);
    }
    
    fetchLogos();
  }, [setsQuery.data]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold">Bulk</h1>
          <p className="text-muted-foreground mt-2">Escolha uma coleção para ver as cartas disponíveis.</p>
        </div>

        {setsQuery.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : setsQuery.data?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border">
            <h2 className="text-xl font-semibold mb-2">Nenhuma carta disponível no momento.</h2>
            <p className="text-muted-foreground">Volte mais tarde para conferir as novidades.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {setsQuery.data?.map((set) => (
              <Link
                key={set.setId}
                to={`/bulk/${set.setId}`}
                className="group relative flex flex-col items-center justify-center p-6 bg-card rounded-2xl border transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
              >
                <div className="h-20 w-full flex items-center justify-center mb-4">
                  {logos[set.setId] ? (
                    <img 
                      src={`${logos[set.setId]}.png`} 
                      alt={set.setName} 
                      className="max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform" 
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center text-muted-foreground">?</div>
                  )}
                </div>
                <h3 className="font-semibold text-center leading-tight">{set.setName}</h3>
                <div className="mt-2 text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {set.quantity} cartas disponíveis
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <CartFab />
    </div>
  );
}
