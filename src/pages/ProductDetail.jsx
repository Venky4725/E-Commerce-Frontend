import React, { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useProduct } from "../hooks/useProducts";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useToast } from "../components/ui/toast";
import { ShoppingCart, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import api from "../api/api";
import useAuthStore from "../store/authStore";
import { buildAssetUrl } from "../api/endpoints";
import { getCategoryPlaceholder } from "../lib/utils";
import { extractErrorMessage } from "../lib/errorUtils";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);
  const [addingToCart, setAddingToCart] = useState(false);

  // React Query
  const { data: product, isLoading, isError, refetch } = useProduct(id);

  const handleAddToCart = useCallback(async () => {
    if (!token) {
      toast({ title: "Please login first", variant: "destructive" });
      navigate("/login");
      return;
    }

    setAddingToCart(true);
    try {
      await api.post("/cart/me/items", {
        product_id: product.id,
        quantity: 1,
      });
      toast({ title: "Added to cart!", description: product.name });
    } catch (err) {
      toast({
        title: "Failed to add to cart",
        description: extractErrorMessage(err, "Try again"),
        variant: "destructive",
      });
    } finally {
      setAddingToCart(false);
    }
  }, [token, product?.id, product?.name, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 size={36} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-lg mb-4">Product not found or failed to load.</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2">
            <RefreshCw size={15} /> Retry
          </Button>
          <Link to="/">
            <Button variant="outline">Back to Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = product.image_url ? buildAssetUrl(product.image_url) : null;


  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Image */}
            <div className="md:w-1/2 bg-gray-50 dark:bg-gray-700 rounded-t-xl md:rounded-l-xl md:rounded-tr-none flex items-center justify-center p-8 aspect-square md:aspect-auto min-h-72">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  loading="eager"
                  decoding="async"
                  className="max-h-80 w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getCategoryPlaceholder(product.category, product.name);
                  }}
                />
              ) : (
                <div className="flex w-full aspect-square items-center justify-center text-sm text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-t-xl md:rounded-l-xl md:rounded-tr-none">
                  <img src={getCategoryPlaceholder(product.category, product.name)} alt={product.name} className="max-h-80 w-full object-contain grayscale transition-transform hover:scale-105" loading="lazy" />
                </div>
              )}

            </div>

            {/* Details */}
            <div className="md:w-1/2 p-8 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {product.name}
                </h1>

                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-6">
                  ₹{Number(product.price).toLocaleString('en-IN')}
                </p>

                {product.description && (
                  <div className="mb-6">
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Description
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                )}

                {product.stock_quantity !== undefined && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {product.stock_quantity > 0
                      ? `${product.stock_quantity} in stock`
                      : "Out of stock"}
                  </p>
                )}
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={addingToCart || product.stock_quantity === 0}
                className="w-full flex items-center gap-2 mt-4"
                size="lg"
              >
                {addingToCart ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ShoppingCart size={18} />
                )}
                {addingToCart ? "Adding..." : product.stock_quantity === 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductDetail;
