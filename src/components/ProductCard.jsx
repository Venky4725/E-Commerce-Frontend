import React, { memo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Package, Sparkles } from "lucide-react";
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
  const stockLabel = product.stock_quantity > 0
    ? `${product.stock_quantity} in stock`
    : "Out of stock";
  const summary = product.description?.trim() || "Fresh picks for your next order.";

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
    <Card className="group flex h-full flex-col overflow-hidden border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-square w-full overflow-hidden bg-gray-50 dark:bg-gray-700">
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
          <span className="absolute left-3 top-3 rounded-full border border-gray-200 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-900/90 dark:text-gray-100">
            {product.category || "Featured"}
          </span>
          <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] shadow-sm ${product.stock_quantity > 0 ? "bg-emerald-500/90 text-white" : "bg-rose-500/90 text-white"}`}>
            {product.stock_quantity > 0 ? "In stock" : "Sold out"}
          </span>
        </div>
      </Link>

      <CardContent className="flex flex-1 flex-col gap-3 pt-4">
        <div className="space-y-2">
          <Link to={`/product/${product.id}`}>
            <h2 className="text-sm font-semibold leading-snug text-gray-800 transition-colors hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400 line-clamp-2">
              <HighlightText text={product.name} highlight={highlight} />
            </h2>
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-300 line-clamp-2">{summary}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-300">
          {product.brand && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 dark:border-gray-700 dark:bg-gray-700/70">{product.brand}</span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
            <Package size={12} /> {stockLabel}
          </span>
        </div>

        {product._score > 0 && highlight && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-400">
            Match score: {Math.round(product._score)}%
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-400 dark:text-gray-400">Price</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">₹{Number(product.price).toLocaleString("en-IN")}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <Sparkles size={11} /> New
          </span>
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <Button
          size="sm"
          className="flex-1 items-center gap-1"
          onClick={handleAddToCart}
          disabled={product.stock_quantity === 0}
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
