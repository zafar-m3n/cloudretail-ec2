// src/pages/OrderConfirmation.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import api from "../api/axios";
import LoadingSpinner from "../components/LoadingSpinner";

export default function OrderConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);

  const formatPriceLKR = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "0.00";
    return new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusLabel = (statusRaw) => {
    const status = (statusRaw || "").toUpperCase();
    switch (status) {
      case "PENDING":
        return "Pending";
      case "PROCESSING":
        return "Processing";
      case "CONFIRMED":
        return "Confirmed";
      case "FAILED":
        return "Failed";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status || "Unknown";
    }
  };

  const getStatusBadgeClasses = (statusRaw) => {
    const status = (statusRaw || "").toUpperCase();
    if (status === "CONFIRMED") return "bg-green-50 text-green-700 border-green-200";
    if (status === "FAILED" || status === "CANCELLED" || status === "REJECTED")
      return "bg-red-50 text-red-700 border-red-200";
    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  };

  const fetchOrder = async () => {
    if (!id) return;
    setLoadingOrder(true);
    setOrderError(null);

    try {
      // GET /api/v1/orders/:id
      const response = await api.get(`/api/v1/orders/${id}`);
      const data = response.data || {};

      // Handle both { order, items } and plain order
      const orderData = data.order || data;
      const itemsData = data.items || orderData.items || [];

      setOrder(orderData);
      setItems(Array.isArray(itemsData) ? itemsData : []);
    } catch (error) {
      console.error("Failed to fetch order:", error);
      const message = error.response?.data?.message || "Could not load your order details. Please try again.";
      setOrderError(message);
    } finally {
      setLoadingOrder(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleBackToProducts = () => {
    navigate("/products");
  };

  const handleGoHome = () => {
    navigate("/products");
  };

  // Initial loading
  if (loadingOrder && !order && !orderError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Fetching your order details..." />
      </div>
    );
  }

  // Error
  if (orderError && !order) {
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

  const status = order?.status || "PENDING";
  const totalAmount = typeof order?.totalAmount === "number" ? order.totalAmount : parseFloat(order?.totalAmount) || 0;

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
        {/* Top row: order id + status */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-col text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Icon icon="mdi:identifier" className="h-4 w-4" />
              <span>Order ID: {order?.id || id}</span>
            </span>
            {order?.userId && (
              <span className="mt-1 flex items-center gap-1">
                <Icon icon="mdi:account-outline" className="h-3.5 w-3.5" />
                <span>User ID: {order.userId}</span>
              </span>
            )}
          </div>

          <div
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClasses(
              status,
            )}`}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-70" />
            {getStatusLabel(status)}
          </div>
        </div>

        {/* Status message & email info */}
        <div className="mb-5">
          {status.toUpperCase() === "CONFIRMED" && (
            <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <Icon icon="mdi:check-circle-outline" className="mt-px h-4 w-4" />
              <div>
                <p className="font-semibold">Your order is confirmed.</p>
                <p className="text-xs text-green-900/80">
                  A confirmation email will be sent to you with the order details.
                </p>
              </div>
            </div>
          )}

          {status.toUpperCase() !== "CONFIRMED" &&
            status.toUpperCase() !== "FAILED" &&
            status.toUpperCase() !== "CANCELLED" && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                <Icon icon="mdi:clock-outline" className="mt-px h-4 w-4" />
                <div>
                  <p className="font-semibold">Your order has been placed.</p>
                  <p className="text-xs text-yellow-900/80">
                    The status will be updated by the system. A confirmation email will be sent to you once the order is
                    confirmed.
                  </p>
                </div>
              </div>
            )}

          {(status.toUpperCase() === "FAILED" ||
            status.toUpperCase() === "CANCELLED" ||
            status.toUpperCase() === "REJECTED") && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <Icon icon="mdi:alert-circle-outline" className="mt-px h-4 w-4" />
              <div>
                <p className="font-semibold">There was a problem with your order.</p>
                <p className="text-xs text-red-900/80">You can try placing the order again from the products page.</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="flex gap-8 border-t border-dashed border-gray-200 pt-4">
          {/* Left: order summary */}
          <div className="w-1/3 space-y-3 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status</span>
              <span className="font-medium">{getStatusLabel(status)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total amount</span>
              <span className="font-semibold text-gray-900">LKR {formatPriceLKR(totalAmount)}</span>
            </div>
            {order?.shippingAddressId && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Shipping address ID</span>
                <span>{order.shippingAddressId}</span>
              </div>
            )}
          </div>

          {/* Right: items list */}
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
                        <span className="font-medium text-gray-800">Product #{item.productId ?? "-"}</span>
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

        {/* Footer action */}
        <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
          <span>You can return to the products page to continue shopping.</span>
          <button
            type="button"
            onClick={handleGoHome}
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
