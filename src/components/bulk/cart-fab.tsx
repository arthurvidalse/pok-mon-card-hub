import { useState, useEffect } from "react";
import { ShoppingCart, X, Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCart, updateQty, removeFromCart, buildBulkOrderMessage, type Cart } from "@/lib/bulk-cart";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/collection.functions";

export function CartFab() {
  const [cart, setCart] = useState<Cart>({ items: [] });
  const [isOpen, setIsOpen] = useState(false);
  
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });
  
  useEffect(() => {
    setCart(getCart());
    const handleUpdate = () => setCart(getCart());
    window.addEventListener("cart-updated", handleUpdate);
    return () => window.removeEventListener("cart-updated", handleUpdate);
  }, []);
  
  if (cart.items.length === 0) return null;
  
  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  
  const whatsappNumber = settingsQuery.data?.whatsapp_number || "5584999693459";
  
  function handleCheckout() {
    const url = buildBulkOrderMessage(cart, whatsappNumber);
    window.open(url, "_blank");
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <ShoppingCart className="h-6 w-6" />
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
          {totalItems}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card shadow-xl border-l flex flex-col h-full animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Seu Carrinho
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.items.map(item => (
                <div key={item.id} className="flex gap-4 items-center bg-background p-3 rounded-xl border">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="w-16 h-auto object-contain rounded" />
                  ) : (
                    <div className="w-16 h-24 bg-muted rounded flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Sem Imagem</span>
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.cardName}</h3>
                    <p className="text-xs text-muted-foreground truncate">{item.setName} #{item.localId}</p>
                    <p className="text-xs font-medium uppercase text-primary mt-1">{item.condition}</p>
                    <p className="font-semibold mt-1">R$ {item.price.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                      <button 
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-background rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.maxQuantity}
                        className="p-1 hover:bg-background rounded disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t bg-muted/30">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold">R$ {totalPrice.toFixed(2)}</span>
              </div>
              <Button className="w-full h-12 text-lg" onClick={handleCheckout}>
                Fechar pedido no WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
