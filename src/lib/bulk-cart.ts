<<<<<<< HEAD
import { buildWhatsAppUrl } from "./whatsapp";

export type CartItem = {
  id: string; // usually set_id + local_id + condition
  setId: string;
  setName: string;
  localId: string;
  cardName: string;
  condition: string;
  quantity: number;
  price: number;
  maxQuantity: number;
  imageUrl?: string;
};

export type Cart = {
  items: CartItem[];
};

const CART_KEY = "avcollectr_bulk_cart";

export function getCart(): Cart {
  try {
    const data = localStorage.getItem(CART_KEY);
    if (data) {
      return JSON.parse(data) as Cart;
    }
  } catch (err) {
    console.error("Error reading cart from localStorage", err);
  }
  return { items: [] };
}

function saveCart(cart: Cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  const existing = cart.items.find(i => i.id === item.id);
  
  if (existing) {
    existing.quantity = Math.min(existing.quantity + item.quantity, existing.maxQuantity);
  } else {
    cart.items.push(item);
  }
  
  saveCart(cart);
  window.dispatchEvent(new Event("cart-updated"));
}

export function removeFromCart(itemId: string) {
  const cart = getCart();
  cart.items = cart.items.filter(i => i.id !== itemId);
  saveCart(cart);
  window.dispatchEvent(new Event("cart-updated"));
}

export function updateQty(itemId: string, quantity: number) {
  const cart = getCart();
  const existing = cart.items.find(i => i.id === itemId);
  if (existing) {
    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.id !== itemId);
    } else {
      existing.quantity = Math.min(quantity, existing.maxQuantity);
    }
    saveCart(cart);
    window.dispatchEvent(new Event("cart-updated"));
  }
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event("cart-updated"));
}

export function buildBulkOrderMessage(cart: Cart, whatsappNumber: string): string {
  let message = "Olá! Gostaria de comprar as seguintes cartas do Bulk:\n\n";
  let total = 0;
  
  for (const item of cart.items) {
    const subtotal = item.quantity * item.price;
    total += subtotal;
    message += `${item.quantity}x ${item.cardName} (${item.setName} #${item.localId}) - Condição: ${item.condition} - R$ ${subtotal.toFixed(2)}\n`;
  }
  
  message += `\nTotal: R$ ${total.toFixed(2)}\n`;
  
  return buildWhatsAppUrl(whatsappNumber, message);
=======
import { useCallback, useSyncExternalStore } from "react";

export type CartItem = {
  key: string;
  setId: string;
  setName: string;
  localId: string;
  name: string;
  condition: string;
  price: number | null;
  quantity: number;
  maxQuantity: number;
  image: string | null;
};

const STORAGE_KEY = "avcollectr.bulk.cart";
const listeners = new Set<() => void>();
let cache: CartItem[] = [];
let cacheRaw = "[]";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  if (raw !== cacheRaw) {
    try {
      const parsed = JSON.parse(raw);
      cache = Array.isArray(parsed) ? (parsed as CartItem[]) : [];
    } catch {
      cache = [];
    }
    cacheRaw = raw;
  }
  return cache;
}

function write(items: CartItem[]) {
  cacheRaw = JSON.stringify(items);
  cache = items;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, cacheRaw);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function cartItemKey(setId: string, localId: string, condition: string) {
  return `${setId}|${localId}|${condition}`;
}

export function useCart() {
  const items = useSyncExternalStore(
    subscribe,
    read,
    () => [] as CartItem[],
  );

  const add = useCallback((item: Omit<CartItem, "key">) => {
    const key = cartItemKey(item.setId, item.localId, item.condition);
    const current = read();
    const existing = current.find((row) => row.key === key);
    const next = existing
      ? current.map((row) =>
          row.key === key
            ? { ...row, quantity: Math.min(row.quantity + item.quantity, item.maxQuantity) }
            : row,
        )
      : [...current, { ...item, key }];
    write(next);
  }, []);

  const remove = useCallback((key: string) => {
    write(read().filter((row) => row.key !== key));
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    write(
      read().map((row) =>
        row.key === key
          ? { ...row, quantity: Math.max(1, Math.min(quantity, row.maxQuantity)) }
          : row,
      ),
    );
  }, []);

  const clear = useCallback(() => write([]), []);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);

  return { items, add, remove, setQuantity, clear, count, total };
}

export function formatBRL(value: number | null | undefined) {
  if (value === null || value === undefined) return "A combinar";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildOrderMessage(items: CartItem[], total: number) {
  const lines = items.map(
    (item) =>
      `• ${item.name} (${item.setName} #${item.localId}) — ${item.condition} — ${item.quantity}x ${formatBRL(item.price)}` +
      (item.price !== null ? ` = ${formatBRL(item.price * item.quantity)}` : ""),
  );
  const hasUnpriced = items.some((item) => item.price === null);
  return [
    "Olá! Quero fechar um pedido de cartas em lote (Bulk):",
    "",
    ...lines,
    "",
    `Total: ${formatBRL(total)}${hasUnpriced ? " (+ itens a combinar)" : ""}`,
  ].join("\n");
>>>>>>> f5e97af8e5abd158a7357a3bb14eb108e18c294a
}
