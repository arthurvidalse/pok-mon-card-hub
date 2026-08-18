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
}
