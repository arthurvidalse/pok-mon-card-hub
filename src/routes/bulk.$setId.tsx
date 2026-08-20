import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBulkSetGallery } from "@/lib/bulk.functions";
import { getSet, type TCGdexSetDetails } from "@/lib/tcgdex";
import { Header } from "@/components/site/header";
import { CartFab } from "@/components/bulk/cart-fab";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, Plus, Minus } from "lucide-react";
import { useState, useMemo } from "react";
import { addToCart } from "@/lib/bulk-cart";
import { variantLabel } from "@/lib/variants";
import { toast } from "sonner";

export const Route = createFileRoute("/bulk/$setId")({
  head: ({ params }) => ({
    meta: [
      { title: `Bulk - Coleção ${params.setId} — AV Collectr` },
    ],
  }),
  component: BulkSetPage,
});

function BulkSetPage() {
  const { setId } = useParams({ from: "/bulk/$setId" });
  const getGallery = useServerFn(getBulkSetGallery);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [qtys, setQtys] = useState<Record<string, number>>({});

  const setQuery = useQuery({
    queryKey: ["tcgdex-set", setId],
    queryFn: () => getSet(setId)
  });

  const galleryQuery = useQuery({
    queryKey: ["bulk-gallery", setId],
    queryFn: () => getGallery({ data: { setId } })
  });

  const cards = useMemo(() => {
    if (!setQuery.data || !galleryQuery.data) return [];
    
    const inventory = galleryQuery.data;
    const inventoryMap = new Map();
    
    // Group inventory by localId to handle multiple conditions of the same card
    for (const item of inventory) {
      if (!inventoryMap.has(item.localId)) {
        inventoryMap.set(item.localId, []);
      }
      inventoryMap.get(item.localId).push(item);
    }
    
    return setQuery.data.cards.map(officialCard => {
      const stock = inventoryMap.get(officialCard.localId) || [];
      return {
        ...officialCard,
        stock
      };
    });
  }, [setQuery.data, galleryQuery.data]);

  const filteredCards = useMemo(() => {
    if (!searchTerm) return cards;
    const term = searchTerm.toLowerCase();
    return cards.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.localId.toLowerCase().includes(term)
    );
  }, [cards, searchTerm]);

  function handleAddToCart(stockItem: any, officialCard: any) {
    const qtyId = `${officialCard.localId}_${stockItem.variant}_${stockItem.condition}`;
    const qty = qtys[qtyId] || 1;
    
    if (stockItem.price === null) {
      toast.error("Esta carta não tem preço definido.");
      return;
    }
    
    addToCart({
      id: `${setId}_${officialCard.localId}_${stockItem.variant}_${stockItem.condition}`,
      setId,
      setName: setQuery.data?.name || setId,
      localId: officialCard.localId,
      cardName: officialCard.name,
      variant: stockItem.variant,
      condition: stockItem.condition,
      quantity: qty,
      price: stockItem.price,
      maxQuantity: stockItem.quantity,
      imageUrl: officialCard.image ? `${officialCard.image}/high.png` : undefined
    });
    
    toast.success("Adicionado ao carrinho!");
    
    // Reset local qty
    setQtys(prev => ({...prev, [qtyId]: 1}));
  }

  function updateLocalQty(qtyId: string, delta: number, max: number) {
    setQtys(prev => {
      const current = prev[qtyId] || 1;
      const next = Math.max(1, Math.min(max, current + delta));
      return { ...prev, [qtyId]: next };
    });
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Banner da coleção */}
      <div className="bg-card border-b">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
            <div className="flex items-center gap-6">
              {setQuery.isLoading ? (
                <Skeleton className="w-24 h-24 rounded-xl" />
              ) : (
                <img 
                  src={`https://assets.tcgdex.net/en/${setId}/logo.png`}
                  alt=""
                  className="w-24 h-24 object-contain filter drop-shadow"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div>
                <h1 className="font-display text-3xl font-bold">
                  {setQuery.isLoading ? <Skeleton className="w-48 h-10" /> : setQuery.data?.name}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {setQuery.isLoading ? <Skeleton className="w-32 h-5" /> : `${setQuery.data?.cards.length} cartas na coleção`}
                </p>
              </div>
            </div>
            
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                className="pl-9 bg-background" 
                placeholder="Buscar carta..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {(setQuery.isLoading || galleryQuery.isLoading) ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="w-full aspect-[63/88] rounded-xl" />
                <Skeleton className="w-full h-6 rounded" />
                <Skeleton className="w-2/3 h-4 rounded" />
              </div>
            ))}
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border">
            <h2 className="text-xl font-semibold mb-2">Nenhuma carta encontrada.</h2>
            <p className="text-muted-foreground">Tente mudar sua busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredCards.map((card) => {
              const hasStock = card.stock.length > 0;
              const imgUrl = card.image ? `${card.image}/high.png` : null;
              
              return (
                <div key={card.id} className="flex flex-col">
                  <div className="relative w-full aspect-[63/88] rounded-xl overflow-hidden mb-3 bg-secondary">
                    {imgUrl && (
                      <img 
                        src={imgUrl} 
                        alt={card.name} 
                        className={`w-full h-full object-contain ${!hasStock ? 'opacity-40 grayscale-[50%]' : 'hover:scale-105 transition-transform duration-300'}`} 
                        loading="lazy"
                      />
                    )}
                    
                    {!hasStock && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <span className="bg-background/80 text-foreground px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border shadow-sm">
                          Indisponível
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className="font-semibold leading-tight line-clamp-2">{card.name}</h3>
                      <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        #{card.localId}
                      </span>
                    </div>
                    
                    {hasStock ? (
                      <div className="mt-auto pt-3 space-y-2">
                        {card.stock.map((stockItem: any, idx: number) => {
                          const qtyId = `${card.localId}_${stockItem.variant}_${stockItem.condition}`;
                          const currentQty = qtys[qtyId] || 1;
                          
                          return (
                            <div key={idx} className="bg-card border rounded-lg p-2 text-sm">
<<<<<<< HEAD
                              <div className="flex justify-between items-center mb-2">
=======
                              <div className="flex justify-between items-center mb-1">
>>>>>>> 6b6171d789ad8f5a4e3dfd558100809ea3e2e31a
                                <span className="font-bold text-primary">
                                  {variantLabel(stockItem.variant)} <span className="text-muted-foreground font-normal uppercase">· {stockItem.condition}</span>
                                </span>
                                <span className="font-semibold">
                                  {stockItem.price !== null ? `R$ ${stockItem.price.toFixed(2)}` : 'Sem preço'}
                                </span>
                              </div>
                              {stockItem.rarity && (
                                <div className="text-[10px] text-muted-foreground mb-1.5">{stockItem.rarity}</div>
                              )}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center justify-between bg-secondary rounded-md p-1 h-8 flex-1">
                                  <button 
                                    className="p-1 hover:bg-background rounded" 
                                    onClick={() => updateLocalQty(qtyId, -1, stockItem.quantity)}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="font-medium text-xs">{currentQty}</span>
                                  <button 
                                    className="p-1 hover:bg-background rounded disabled:opacity-50"
                                    disabled={currentQty >= stockItem.quantity}
                                    onClick={() => updateLocalQty(qtyId, 1, stockItem.quantity)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                <Button 
                                  size="sm" 
                                  className="h-8 px-2" 
                                  onClick={() => handleAddToCart(stockItem, card)}
                                  disabled={stockItem.price === null}
                                >
                                  <ShoppingCart className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1 text-center">
                                {stockItem.quantity} em estoque
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-auto pt-3">
                        <p className="text-xs text-muted-foreground text-center bg-secondary/50 py-2 rounded-lg">
                          Sem estoque
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      <CartFab />
    </div>
  );
}
