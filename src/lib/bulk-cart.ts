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
}
