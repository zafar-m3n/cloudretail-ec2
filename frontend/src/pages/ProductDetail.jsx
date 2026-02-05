// src/pages/ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import api from "../api/axios";
import { useCart } from "../context/CartContext";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [productError, setProductError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const formatPriceLKR = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "0.00";
    return new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      setLoadingProduct(true);
      setProductError(null);

      try {
        // GET /api/v1/products/products/:id
        const response = await api.get(`/api/v1/products/products/${id}`);
        const data = response.data;

        // In case the backend wraps it: { product: {...} }
        const item = data?.product || data;
        setProduct(item);
      } catch (error) {
        console.error("Failed to load product:", error);
        const message = error.response?.data?.message || "Could not load this product. Please try again.";
        setProductError(message);
      } finally {
        setLoadingProduct(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleBack = () => {
    navigate("/products");
  };

  const handleAddToCart = () => {
    if (!product) return;

    const idValue = product.id || product._id || id;
    addToCart(
      {
        ...product,
        id: idValue,
      },
      quantity,
    );
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (Number.isNaN(value) || value <= 0) {
      setQuantity(1);
    } else {
      setQuantity(value);
    }
  };

  // Loading state
  if (loadingProduct) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Loading product details..." />
      </div>
    );
  }

  // Error or not found state
  if (productError || (!product && !loadingProduct)) {
    return (
      <div className="min-h-[60vh]">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Icon icon="mdi:arrow-left" className="h-4 w-4" />
            Back to products
          </button>
        </div>
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {productError || "This product could not be found."}
        </div>
      </div>
    );
  }

  const idValue = product.id || product._id || id;
  const name = product.name || product.title || "Unnamed product";
  const description = product.description || product.details || "No description is available for this product.";
  const price = typeof product.price === "number" ? product.price : parseFloat(product.price) || 0;
  const imageUrl = product.imageUrl || product.image || product.thumbnail || null;

  return (
    <div className="min-h-[60vh]">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Icon icon="mdi:arrow-left" className="h-4 w-4" />
          Back to products
        </button>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Icon icon="mdi:identifier" className="h-3.5 w-3.5" />
          <span>ID: {idValue}</span>
        </div>
      </div>

      {/* Product content */}
      <div className="flex gap-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {/* Image section */}
        <div className="flex w-2/5 items-center justify-center">
          <div className="relative h-64 w-full overflow-hidden rounded-lg bg-gray-50">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-300">
                <Icon icon="mdi:image-off-outline" className="h-10 w-10" />
                <span className="text-xs">No image available</span>
              </div>
            )}
          </div>
        </div>

        {/* Details section */}
        <div className="flex w-3/5 flex-col">
          <div className="mb-3">
            <h1 className="mb-1 text-xl font-semibold tracking-wide text-gray-800">{name}</h1>
            <p className="text-xs uppercase tracking-wide text-gray-400">Product details</p>
          </div>

          <p className="mb-4 text-sm text-gray-600 leading-relaxed">{description}</p>

          <div className="mb-6 flex items-center gap-6">
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="text-2xl font-semibold text-gray-900">
                {price > 0 ? (
                  <>LKR {formatPriceLKR(price)}</>
                ) : (
                  <span className="text-sm text-gray-500">Price not available</span>
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Quantity</p>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-auto flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Icon icon="mdi:cart-plus" className="h-4 w-4" />
              Add to cart
            </button>

            <button
              type="button"
              onClick={() => navigate("/cart")}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Icon icon="mdi:cart-outline" className="h-4 w-4" />
              View cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
