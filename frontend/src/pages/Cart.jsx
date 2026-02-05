// src/pages/Cart.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, clearCart, subtotal, total } = useCart();

  const formatPriceLKR = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "0.00";
    return new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleQuantityChange = (id, value) => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      updateQuantity(id, 1);
    } else {
      updateQuantity(id, parsed);
    }
  };

  const handleProceedToCheckout = () => {
    if (items.length === 0) return;
    navigate("/checkout");
  };

  const handleContinueShopping = () => {
    navigate("/products");
  };

  // Empty cart UI
  if (!items || items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Icon icon="mdi:cart-off" className="mb-3 h-12 w-12 text-gray-300" />
        <h1 className="mb-1 text-lg font-semibold text-gray-800">Your cart is empty</h1>
        <p className="mb-4 text-sm text-gray-500">Add some products to your cart to see them here.</p>
        <button
          type="button"
          onClick={handleContinueShopping}
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Icon icon="mdi:storefront-outline" className="h-4 w-4" />
          Browse products
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh]">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:cart-outline" className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold tracking-wide text-gray-800">Your cart</h1>
            <p className="text-xs text-gray-500">Review your items before proceeding to checkout.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Icon icon="mdi:trash-can-outline" className="h-4 w-4" />
          Clear cart
        </button>
      </div>

      <div className="flex gap-8">
        {/* Left: Items list */}
        <div className="w-2/3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
            <span>Item</span>
            <div className="flex w-1/2 justify-between">
              <span>Price</span>
              <span>Quantity</span>
              <span>Total</span>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const lineTotal = (item.price || 0) * (item.quantity || 0);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-3"
                >
                  {/* Item info */}
                  <div className="flex w-1/2 items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-md bg-white">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <Icon icon="mdi:image-off-outline" className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.name || "Product"}</p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-600"
                      >
                        <Icon icon="mdi:delete-outline" className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Price / Quantity / Line total */}
                  <div className="flex w-1/2 items-center justify-between text-sm">
                    {/* Price */}
                    <div className="text-gray-800">LKR {formatPriceLKR(item.price || 0)}</div>

                    {/* Quantity */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, Math.max((item.quantity || 1) - 1, 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        <Icon icon="mdi:minus" className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity || 1}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className="w-14 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        <Icon icon="mdi:plus" className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Line total */}
                    <div className="text-right font-semibold text-gray-900">LKR {formatPriceLKR(lineTotal)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Summary */}
        <div className="w-1/3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">Order summary</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">LKR {formatPriceLKR(subtotal)}</span>
            </div>

            {/* Placeholder for future shipping/tax if needed */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Shipping &amp; taxes</span>
              <span>Calculated at checkout</span>
            </div>

            <div className="border-t border-dashed border-gray-200 pt-3" />

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-800">Total</span>
              <span className="text-base font-semibold text-gray-900">LKR {formatPriceLKR(total)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleProceedToCheckout}
              disabled={items.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              <Icon icon="mdi:credit-card-outline" className="h-4 w-4" />
              Proceed to checkout
            </button>

            <button
              type="button"
              onClick={handleContinueShopping}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Icon icon="mdi:storefront-outline" className="h-4 w-4" />
              Continue shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
