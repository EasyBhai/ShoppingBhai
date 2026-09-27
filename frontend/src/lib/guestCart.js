const KEY = 'guest_cart';

export function getGuestCart() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function addToGuestCart(productId, quantity = 1) {
  const cart = getGuestCart();
  const existing = cart.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId, quantity });
  }
  localStorage.setItem(KEY, JSON.stringify(cart));
  return cart;
}

export function removeFromGuestCart(productId) {
  const cart = getGuestCart().filter((i) => i.productId !== productId);
  localStorage.setItem(KEY, JSON.stringify(cart));
  return cart;
}

export function updateGuestCartQuantity(productId, quantity) {
  const cart = getGuestCart();
  const item = cart.find((i) => i.productId === productId);
  if (item) item.quantity = quantity;
  localStorage.setItem(KEY, JSON.stringify(cart));
  return cart;
}

export function clearGuestCart() {
  localStorage.removeItem(KEY);
}
