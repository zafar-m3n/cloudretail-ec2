import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "cloudretail_cart";

function loadInitialCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error("Failed to parse stored cart:", err);
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => loadInitialCart());

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error("Failed to save cart:", err);
    }
  }, [items]);

  /**
   * Expected product shape (you can adjust this later based on your API):
   * {
   *   id,
   *   name,
   *   price,
   *   imageUrl,
   *   ...etc
   * }
   */
  const addToCart = (product, quantity = 1) => {
    if (!product || !product.id) return;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);

      if (existingIndex !== -1) {
        // Increase quantity of existing item
        const updated = [...prev];
        const existing = updated[existingIndex];
        updated[existingIndex] = {
          ...existing,
          quantity: existing.quantity + quantity,
        };
        return updated;
      }

      // Add new item
      return [
        ...prev,
        {
          id: product.id,
          name: product.name || product.title || "Product",
          price: product.price || 0,
          imageUrl: product.imageUrl || product.image || null,
          quantity,
        },
      ];
    });
  };

  const removeFromCart = (productId) => {
    setItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      // If quantity becomes 0 or negative, just remove item
      removeFromCart(productId);
      return;
    }

    setItems((prev) => prev.map((item) => (item.id === productId ? { ...item, quantity } : item)));
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartItemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

  // For now, total = subtotal (no shipping/tax)
  const total = subtotal;

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartItemCount,
    subtotal,
    total,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
