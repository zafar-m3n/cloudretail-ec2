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

  // Shipping address form
  const [address, setAddress] = useState({
    fullName: user?.fullName || user?.full_name || user?.name || "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Sri Lanka",
  });

  // Card details form
  const [card, setCard] = useState({
    nameOnCard: "",
    number: "",
    expiry: "",
    cvc: "",
  });

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

  const handleAddressChange = (field, value) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleCardChange = (field, value) => {
    setCard((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!items || !items.length) {
      setCheckoutError("Your cart is empty. Add items before checking out.");
      return false;
    }

    if (!address.fullName.trim() || !address.line1.trim() || !address.city.trim() || !address.country.trim()) {
      setCheckoutError("Please fill in the required shipping address fields.");
      return false;
    }

    const rawNumber = card.number.replace(/\s+/g, "");
    if (!card.nameOnCard.trim() || rawNumber.length < 12 || !card.expiry.trim() || card.cvc.trim().length < 3) {
      setCheckoutError("Please enter valid card details.");
      return false;
    }

    return true;
  };

  const inferCardBrand = (num) => {
    const n = num.replace(/\s+/g, "");
    if (/^4/.test(n)) return "VISA";
    if (/^5[1-5]/.test(n)) return "MASTERCARD";
    if (/^3[47]/.test(n)) return "AMEX";
    return "CARD";
  };

  const handlePlaceOrder = async () => {
    setCheckoutError(null);

    if (!validateForm()) return;

    setIsPlacingOrder(true);

    try {
      const orderItems = items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.price,
      }));

      const rawNumber = card.number.replace(/\s+/g, "");
      const cardLast4 = rawNumber.slice(-4);
      const cardBrand = inferCardBrand(rawNumber);

      // Backend: we still only *need* items (and optionally notes).
      // Extra fields (shippingAddress + paymentMeta) are for UI/assignment purposes.
      const orderPayload = {
        items: orderItems,
        notes: notes.trim() || undefined,
        // Optional metadata the backend may ignore, but we keep for realism
        shippingAddress: address,
        payment: {
          method: "CARD",
          cardBrand,
          cardLast4,
        },
      };

      // Single call – backend does stock + payment + order
      const orderResponse = await api.post("/api/v1/orders", orderPayload);
      const orderData = orderResponse.data || {};
      const orderId = orderData.order?.id || orderData.orderId || orderData.id;

      if (!orderId) {
        throw new Error("Order ID missing from response.");
      }

      clearCart();

      // Pass safe metadata to confirmation page
      navigate(`/orders/${orderId}`, {
        state: {
          shippingAddress: address,
          payment: {
            method: "Card",
            cardBrand,
            cardLast4,
          },
        },
      });
    } catch (error) {
      console.error("Checkout failed:", error);
      const message =
        error.response?.data?.message || error.message || "Something went wrong while processing your order.";
      setCheckoutError(message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Empty cart view (just in case user hits /checkout directly)
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
            <p className="text-xs text-gray-500">Enter your shipping and payment details to complete the order.</p>
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
        {/* LEFT: forms + items */}
        <div className="w-2/3 space-y-5">
          {/* User summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">Customer</h2>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Icon icon="mdi:account-outline" className="h-5 w-5 text-gray-500" />
              <div>
                <div>{user?.fullName || user?.full_name || user?.name || "Customer"}</div>
                <div className="text-xs text-gray-500">{user?.email || "No email available"}</div>
              </div>
            </div>
          </div>

          {/* Shipping address */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Icon icon="mdi:map-marker-outline" className="h-4 w-4 text-blue-600" />
              Shipping address
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="mb-1 block font-medium text-gray-700">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.fullName}
                  onChange={(e) => handleAddressChange("fullName", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block font-medium text-gray-700">
                  Address line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.line1}
                  onChange={(e) => handleAddressChange("line1", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Street address, building, etc."
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-gray-700">Address line 2 (optional)</label>
                <input
                  type="text"
                  value={address.line2}
                  onChange={(e) => handleAddressChange("line2", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Apartment, floor, etc."
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-700">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-gray-700">State / Province</label>
                <input
                  type="text"
                  value={address.state}
                  onChange={(e) => handleAddressChange("state", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-gray-700">Postal code</label>
                <input
                  type="text"
                  value={address.postalCode}
                  onChange={(e) => handleAddressChange("postalCode", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-700">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.country}
                  onChange={(e) => handleAddressChange("country", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Payment details */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Icon icon="mdi:credit-card-chip-outline" className="h-4 w-4 text-blue-600" />
              Payment details
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="mb-1 block font-medium text-gray-700">
                  Name on card <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={card.nameOnCard}
                  onChange={(e) => handleCardChange("nameOnCard", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block font-medium text-gray-700">
                  Card number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={card.number}
                  onChange={(e) => handleCardChange("number", e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-700">
                  Expiry (MM/YY) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={card.expiry}
                  onChange={(e) => handleCardChange("expiry", e.target.value)}
                  placeholder="08/27"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-700">
                  CVC <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={card.cvc}
                  onChange={(e) => handleCardChange("cvc", e.target.value)}
                  placeholder="123"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-800">Order notes (optional)</h2>
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

        {/* RIGHT: summary + action */}
        <div className="w-1/3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">Order summary</h2>

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
