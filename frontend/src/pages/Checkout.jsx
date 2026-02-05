import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, total, clearCart } = useCart();
  const { user } = useAuth();

  const [notes, setNotes] = useState("");
  const [checkoutError, setCheckoutError] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const formatPriceLKR = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "0.00";
    return new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleBackToCart = () => {
    navigate("/cart");
  };

  const handlePlaceOrder = async () => {
    if (!items || items.length === 0) {
      setCheckoutError("Your cart is empty. Add items before checking out.");
      return;
    }

    setCheckoutError(null);
    setIsPlacingOrder(true);

    try {
      // Build order payload from cart
      const orderItems = items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.price,
      }));

      const orderPayload = {
        items: orderItems,
        totalAmount: total,
        currency: "LKR",
        notes: notes.trim() || undefined,
      };

      // 1) Create order: POST /api/v1/orders
      const orderResponse = await api.post("/api/v1/orders", orderPayload);
      const orderData = orderResponse.data || {};

      // Handle the actual response shape:
      // {
      //   message: "Order created successfully",
      //   order: { id: 2, ... },
      //   items: [...]
      // }
      const orderId = orderData.order?.id || orderData.orderId || orderData.id;

      if (!orderId) {
        throw new Error("Order ID missing from response.");
      }

      // 2) Initiate payment: POST /api/v1/payments
      const paymentPayload = {
        orderId,
        amount: total,
        currency: "LKR",
      };

      const paymentResponse = await api.post("/api/v1/payments", paymentPayload);
      const paymentData = paymentResponse.data || {};
      const paymentStatus = paymentData.status || paymentData.paymentStatus || "SUCCESS";

      if (paymentStatus !== "SUCCESS" && paymentStatus !== "COMPLETED" && paymentStatus !== "PAID") {
        throw new Error(paymentData.message || "Payment was not successful.");
      }

      // If we reach here, treat payment as successful
      clearCart();
      navigate(`/orders/${orderId}`);
    } catch (error) {
      console.error("Checkout failed:", error);
      const message =
        error.response?.data?.message || error.message || "Something went wrong while processing your order.";
      setCheckoutError(message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Empty cart view (just in case user hits route directly)
  if (!items || items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Icon icon="mdi:cart-off" className="mb-3 h-12 w-12 text-gray-300" />
        <h1 className="mb-1 text-lg font-semibold text-gray-800">Your cart is empty</h1>
        <p className="mb-4 text-sm text-gray-500">Add some products to your cart before checking out.</p>
        <button
          type="button"
          onClick={() => navigate("/products")}
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
          <Icon icon="mdi:credit-card-outline" className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold tracking-wide text-gray-800">Checkout</h1>
            <p className="text-xs text-gray-500">Review your order and confirm payment.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBackToCart}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Icon icon="mdi:arrow-left" className="h-4 w-4" />
          Back to cart
        </button>
      </div>

      {checkoutError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {checkoutError}
        </div>
      )}

      <div className="flex gap-8">
        {/* Left: Order details / "form" */}
        <div className="w-2/3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">Order details</h2>

          {/* User summary */}
          <div className="mb-5 rounded-md border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-800">
            <div className="mb-1 flex items-center gap-2">
              <Icon icon="mdi:account-outline" className="h-4 w-4 text-gray-500" />
              <span>{user?.fullName || user?.full_name || user?.name || "Customer"}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Icon icon="mdi:email-outline" className="h-3.5 w-3.5 text-gray-400" />
              <span>{user?.email || "No email available"}</span>
            </div>
          </div>

          {/* Items preview */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
              <span>Items in this order</span>
              <span>{items.length} item(s)</span>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 overflow-hidden rounded-md bg-white">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <Icon icon="mdi:image-off-outline" className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{item.name || "Product"}</p>
                      <p className="text-[11px] text-gray-500">
                        Qty {item.quantity || 1} · LKR {formatPriceLKR(item.price || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] font-semibold text-gray-800">
                    LKR {formatPriceLKR((item.price || 0) * (item.quantity || 0))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="mb-1 block text-xs font-medium text-gray-700">
              Order notes (optional)
            </label>
            <textarea
              id="notes"
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Add any special instructions for your order."
            />
          </div>
        </div>

        {/* Right: Summary + action */}
        <div className="w-1/3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">Payment summary</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">LKR {formatPriceLKR(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Shipping</span>
              <span>Included in assignment scenario</span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Taxes</span>
              <span>Included in assignment scenario</span>
            </div>

            <div className="border-t border-dashed border-gray-200 pt-3" />

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-800">Total</span>
              <span className="text-base font-semibold text-gray-900">LKR {formatPriceLKR(total)}</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || items.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {isPlacingOrder ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Processing payment...
                </>
              ) : (
                <>
                  <Icon icon="mdi:credit-card-check-outline" className="h-4 w-4" />
                  Place order &amp; pay
                </>
              )}
            </button>

            <p className="mt-3 text-[11px] text-gray-500">
              After a successful payment, you will be taken to the order confirmation page. A confirmation email will be
              sent to you separately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
