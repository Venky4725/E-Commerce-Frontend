import React, { memo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import api from "../api/api";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";
import useAuthStore from "../store/authStore";
import { buildAssetUrl } from "../api/endpoints";
import { HighlightText } from "./HighlightText";

function ProductCard({ product, highlight = "" }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);

  const imageUrl = product.image_url ? buildAssetUrl(product.image_url) : null;


  const handleAddToCart = useCallback(async () => {
    if (!token) {
      toast({ title: "Please login first", variant: "destructive" });
      navigate("/login");
      return;
    }

    try {
      await api.post("/cart/me/items", {
        product_id: product.id,
        quantity: 1,
      });
      toast({ title: "Added to cart!", description: product.name });
    } catch (err) {
      toast({
        title: "Failed to add to cart",
        description: err.response?.data?.detail || "Try again",
        variant: "destructive",
      });
    }
  }, [token, product.id, product.name, navigate, toast]);

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
      {/* Product image */}
      <Link to={`/product/${product.id}`}>
        <div className="aspect-square w-full overflow-hidden rounded-t-xl bg-gray-50 dark:bg-gray-700">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain p-2 hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' fill='%23f3f4f6'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400 bg-gray-100 dark:bg-gray-800">
              <img src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' fill='%23f3f4f6'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E" alt="No image available" className="h-full w-full object-contain p-2 opacity-50 grayscale" loading="lazy" />
            </div>
          )}
        </div>
      </Link>

      <CardContent className="flex-1 pt-4">
        <Link to={`/product/${product.id}`}>
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm leading-snug line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <HighlightText text={product.name} highlight={highlight} />
          </h2>
        </Link>
        {product._score > 0 && highlight && (
          <p className="mt-1 text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
            Relevance: {Math.round(product._score)}%
          </p>
        )}
        <p className="mt-2 text-lg font-bold text-blue-600 dark:text-blue-400">
          ₹{Number(product.price).toFixed(2)}
        </p>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <Button
          size="sm"
          className="flex-1 flex items-center gap-1"
          onClick={handleAddToCart}
        >
          <ShoppingCart size={14} /> Add to Cart
        </Button>
        <Link to={`/product/${product.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            View
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default React.memo(ProductCard);
