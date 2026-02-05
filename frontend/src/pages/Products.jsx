// src/pages/Products.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import api from "../api/axios";
import { useCart } from "../context/CartContext";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Products() {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState(null);

  const formatPriceLKR = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "0.00";
    return new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      setProductsError(null);

      try {
        // Public endpoint: GET /api/v1/products/products
        const response = await api.get("/api/v1/products/products");
        const data = response.data;

        // Adjust this if your backend wraps results differently
        const items = Array.isArray(data) ? data : data?.products || [];
        setProducts(items);
      } catch (error) {
        console.error("Failed to load products:", error);
        const message = error.response?.data?.message || "Could not load products. Please try again.";
        setProductsError(message);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const handleViewDetails = (id) => {
    if (!id) return;
    navigate(`/products/${id}`);
  };

  const handleAddToCart = (product) => {
    if (!product || !product.id) return;
    addToCart(product, 1);
  };

  return (
    <div className="min-h-[60vh]">
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:storefront-outline" className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold tracking-wide text-gray-800">Products</h1>
            <p className="text-xs text-gray-500">Browse available items and add them to your cart.</p>
          </div>
        </div>

        {/* Simple count */}
        <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
          {products.length === 0
            ? "No products available"
            : `${products.length} product${products.length > 1 ? "s" : ""} found`}
        </div>
      </div>

      {/* Error */}
      {productsError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {productsError}
        </div>
      )}

      {/* Loading */}
      {loadingProducts && (
        <div className="flex items-center justify-center">
          <LoadingSpinner label="Loading products..." />
        </div>
      )}

      {/* Empty state (when not loading, no error, no products) */}
      {!loadingProducts && !productsError && products.length === 0 && (
        <div className="mt-10 flex flex-col items-center justify-center text-center text-sm text-gray-500">
          <Icon icon="mdi:package-variant-closed" className="mb-2 h-10 w-10 text-gray-300" />
          <p>No products are available right now.</p>
        </div>
      )}

      {/* Products grid (4 columns, desktop-only) */}
      {!loadingProducts && products.length > 0 && (
        <div className="grid grid-cols-4 gap-6">
          {products.map((product) => {
            const id = product.id || product._id;
            const name = product.name || product.title || "Unnamed product";
            const description = product.description || product.details || "No description available.";
            const price = typeof product.price === "number" ? product.price : parseFloat(product.price) || 0;
            const imageUrl = product.imageUrl || product.image || product.thumbnail || null;

            return (
              <div key={id} className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
                {/* Image area */}
                <div className="relative h-40 w-full overflow-hidden rounded-t-lg bg-gray-50">
                  {imageUrl ? (
                    <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                      <Icon icon="mdi:image-off-outline" className="h-10 w-10" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col px-4 py-3">
                  <h2 className="mb-1 line-clamp-1 text-sm font-semibold text-gray-800">{name}</h2>
                  <p className="mb-2 line-clamp-2 text-xs text-gray-500">{description}</p>

                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="text-base font-semibold text-gray-900">
                      {price > 0 ? (
                        <>LKR {formatPriceLKR(price)}</>
                      ) : (
                        <span className="text-xs text-gray-500">Price not available</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(id)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Icon icon="mdi:information-outline" className="h-3.5 w-3.5" />
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddToCart({ ...product, id })}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                      >
                        <Icon icon="mdi:cart-plus" className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
