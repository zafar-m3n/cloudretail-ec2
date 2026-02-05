import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import api from "../api/axios";
import LoadingSpinner from "../components/LoadingSpinner";

export default function OrderConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [orderWrapper, setOrderWrapper] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);

  // Extra metadata from checkout
  const extraState = location.state || {};
  const extraAddress = extraState.shippingAddress || null;
  const extraPayment = extraState.payment || null;

  const formatPriceLKR = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "0.00";
    return new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      setLoadingOrder(true);
      setOrderError(null);

      try {
        const response = await api.get(`/api/v1/orders/${id}`);
        setOrderWrapper(response.data || {});
      } catch (error) {
        console.error("Failed to fetch order:", error);
        const message = error.response?.data?.message || "Could not load your order details. Please try again.";
        setOrderError(message);
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrder();
  }, [id]);

  const handleBackToProducts = () => {
    navigate("/products");
  };

  if (loadingOrder && !orderWrapper && !orderError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Fetching your order details..." />
      </div>
    );
  }

  if (orderError && !orderWrapper) {
    return (
      <div className="min-h-[60vh]">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToProducts}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Icon icon="mdi:arrow-left" className="h-4 w-4" />
            Back to products
          </button>
        </div>
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{orderError}</div>
      </div>
    );
  }

  const order = orderWrapper?.order || {};
  const items = orderWrapper?.items || [];
  const status = (order.status || "PENDING").toUpperCase();
  const totalAmount =
    typeof order.totalAmount === "number" ? order.totalAmount : parseFloat(order.totalAmount || "0") || 0;

  const paymentStatus = order.paymentStatus || extraPayment?.status || "COMPLETED";
  const paymentMethod = order.paymentMethod || extraPayment?.method || "Card";
  const cardBrand = extraPayment?.cardBrand || "Card";
  const cardLast4 = extraPayment?.cardLast4 || null;

  return (
    <div className="min-h-[60vh]">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:receipt-text-outline" className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold tracking-wide text-gray-800">Order confirmation</h1>
            <p className="text-xs text-gray-500">Thank you for your purchase.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBackToProducts}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Icon icon="mdi:storefront-outline" className="h-4 w-4" />
          Back to products
        </button>
      </div>

      {/* Main card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {/* Top row */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-col text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Icon icon="mdi:identifier" className="h-4 w-4" />
              <span>Order ID: {order.id || id}</span>
            </span>
            {order.customerName && (
              <span className="mt-1 flex items-center gap-1">
                <Icon icon="mdi:account-outline" className="h-3.5 w-3.5" />
                <span>{order.customerName}</span>
              </span>
            )}
          </div>

          <div
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              status === "CONFIRMED"
                ? "bg-green-50 text-green-700 border-green-200"
                : status === "FAILED" || status === "CANCELLED"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-70" />
            {status === "CONFIRMED" ? "Confirmed" : status.charAt(0) + status.slice(1).toLowerCase()}
          </div>
        </div>

        {/* Status message */}
        <div className="mb-5">
          {status === "CONFIRMED" && (
            <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <Icon icon="mdi:check-circle-outline" className="mt-px h-4 w-4" />
              <div>
                <p className="font-semibold">Your order is confirmed.</p>
                <p className="text-xs text-green-900/80">
                  A confirmation email has been sent to you with the order details.
                </p>
              </div>
            </div>
          )}

          {status !== "CONFIRMED" && status !== "FAILED" && status !== "CANCELLED" && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              <Icon icon="mdi:clock-outline" className="mt-px h-4 w-4" />
              <div>
                <p className="font-semibold">Your order has been placed.</p>
                <p className="text-xs text-yellow-900/80">
                  The status will be updated by the system. You will receive an email once the order is confirmed.
                </p>
              </div>
            </div>
          )}

          {(status === "FAILED" || status === "CANCELLED") && (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <Icon icon="mdi:alert-circle-outline" className="mt-px h-4 w-4" />
              <div>
                <p className="font-semibold">There was a problem with your order.</p>
                <p className="text-xs text-red-900/80">You can try placing the order again from the products page.</p>
              </div>
            </div>
          )}
        </div>

        {/* Content rows */}
        <div className="flex gap-8 border-t border-dashed border-gray-200 pt-4">
          {/* Left: order + payment + address */}
          <div className="w-1/3 space-y-4 text-sm text-gray-700">
            <div>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Order summary</h2>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <span className="font-medium">
                  {status === "CONFIRMED" ? "Confirmed" : status.charAt(0) + status.slice(1).toLowerCase()}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-semibold text-gray-900">LKR {formatPriceLKR(totalAmount)}</span>
              </div>
            </div>

            <div>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Payment</h2>
              <div className="text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:credit-card-chip-outline" className="h-4 w-4 text-gray-500" />
                  <span>
                    {cardBrand} {cardLast4 ? `(ending in ${cardLast4})` : ""}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  Status: <span className="font-medium">{paymentStatus || "COMPLETED"}</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Shipping address</h2>
              {extraAddress ? (
                <div className="text-xs text-gray-700">
                  <div className="font-medium">{extraAddress.fullName}</div>
                  <div>{extraAddress.line1}</div>
                  {extraAddress.line2 && <div>{extraAddress.line2}</div>}
                  <div>
                    {[extraAddress.city, extraAddress.state, extraAddress.postalCode].filter(Boolean).join(", ")}
                  </div>
                  <div>{extraAddress.country}</div>
                </div>
              ) : order.shippingAddressId ? (
                <div className="text-xs text-gray-500">
                  Shipping address ID: <span className="font-medium">{order.shippingAddressId}</span>
                </div>
              ) : (
                <div className="text-xs text-gray-500">No shipping address recorded for this demo order.</div>
              )}
            </div>
          </div>

          {/* Right: items */}
          <div className="w-2/3">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Items in this order</h2>
            {items.length === 0 ? (
              <p className="text-xs text-gray-500">Item details are not available.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  const qty = item.quantity || 0;
                  const unitPrice =
                    typeof item.unitPrice === "number" ? item.unitPrice : parseFloat(item.unitPrice) || 0;
                  const lineTotal = unitPrice * qty;

                  return (
                    <div
                      key={`${item.productId || index}-${index}`}
                      className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">
                          {item.productName || `Product #${item.productId ?? "-"}`}
                        </span>
                        <span className="text-[11px] text-gray-500">Quantity: {qty}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right text-[11px] text-gray-600">
                          <div>Unit: LKR {formatPriceLKR(unitPrice)}</div>
                        </div>
                        <div className="text-right text-[11px] font-semibold text-gray-900">
                          Line total: LKR {formatPriceLKR(lineTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
          <span>You can return to the products page to continue shopping.</span>
          <button
            type="button"
            onClick={handleBackToProducts}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Icon icon="mdi:storefront-outline" className="h-4 w-4" />
            Continue shopping
          </button>
        </div>
      </div>
    </div>
  );
}
