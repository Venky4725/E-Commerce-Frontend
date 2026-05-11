import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ShoppingCart, Loader2, PackageOpen, Trash2, Plus, Minus } from "lucide-react";
import { useToast } from "../components/ui/toast";
import useAuthStore from "../store/authStore";

const Cart = () => {
  const [items, setItems] = useState([]);   // enriched items: { product_id, quantity, product }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Track which product_ids have a pending API call to disable their buttons
  const [pending, setPending] = useState({});

  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);

  // ── Initial fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchCart = async () => {
      try {
        // Step 1: get cart
        const res = await api.get("/cart/me");
        const rawItems = res.data?.cart_items ?? [];

        // Step 2: enrich each item with product details in parallel
        const enriched = await Promise.all(
          rawItems.map(async (item) => {
            try {
              const productRes = await api.get(`/products/${item.product_id}`);
              return { ...item, product: productRes.data };
            } catch {
              return { ...item, product: null };
            }
          })
        );

        setItems(enriched);
      } catch (err) {
        setError("Failed to load cart.");
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const setPendingFor = (productId, value) =>
    setPending((prev) => ({ ...prev, [productId]: value }));

  // ── Update quantity ──────────────────────────────────────────────────────────
  const handleUpdateQuantity = async (productId, newQty) => {
    // Quantity floor is 1
    if (newQty < 1) return;

    // Stock ceiling — read from the enriched product data
    const item = items.find((i) => i.product_id === productId);
    const stock = item?.product?.stock_quantity ?? null;
    if (stock !== null && newQty > stock) {
      toast({
        title: "Not enough stock",
        description: `Only ${stock} item${stock !== 1 ? "s" : ""} available.`,
        variant: "destructive",
      });
      return;
    }

    // Optimistic UI update
    setItems((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, quantity: newQty } : item
      )
    );

    setPendingFor(productId, true);
    try {
      await api.put(`/cart/me/items/${productId}`, { quantity: newQty });
    } catch (err) {
      // Roll back on failure
      setItems((prev) =>
        prev.map((item) =>
          item.product_id === productId
            ? { ...item, quantity: newQty === item.quantity ? item.quantity : newQty - 1 }
            : item
        )
      );
      toast({
        title: "Failed to update quantity",
        description: err.response?.data?.detail || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingFor(productId, false);
    }
  };

  // ── Remove item ──────────────────────────────────────────────────────────────
  const handleRemove = async (productId) => {
    // Optimistic UI — remove immediately
    const previousItems = items;
    setItems((prev) => prev.filter((item) => item.product_id !== productId));

    setPendingFor(productId, true);
    try {
      await api.delete(`/cart/me/items/${productId}`);
      toast({ title: "Item removed from cart" });
    } catch (err) {
      // Roll back on failure
      setItems(previousItems);
      toast({
        title: "Failed to remove item",
        description: err.response?.data?.detail || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingFor(productId, false);
    }
  };

  // ── Total ────────────────────────────────────────────────────────────────────
  const total = items.reduce((sum, item) => {
    return sum + (item.product?.price ?? 0) * (item.quantity ?? 1);
  }, 0);

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sign in to view your cart</h2>
        <p className="text-gray-500 mb-6">You need to be logged in to access your cart.</p>
        <Link to="/login">
          <Button>Login</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-red-500">
        {error}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart size={24} /> Your Cart
        </h1>
        {items.length > 0 && (
          <span className="text-sm text-gray-500">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="text-center py-20">
          <PackageOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium mb-1">Your cart is empty</p>
          <p className="text-gray-400 text-sm mb-6">Add some products to get started.</p>
          <Link to="/">
            <Button variant="outline">Browse Products</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const productId  = item.product_id;
            const name       = item.product?.name  ?? `Product #${productId}`;
            const price      = item.product?.price ?? null;
            const stock      = item.product?.stock_quantity ?? null;
            const quantity   = item.quantity ?? 1;
            const atStockLimit = stock !== null && quantity >= stock;
            const imageUrl   = item.product?.image_url
              ? `http://127.0.0.1:8000${item.product.image_url}`
              : null;
            const isBusy = !!pending[productId];

            return (
              <Card key={productId}>
                <CardContent className="flex items-center gap-4 py-4">

                  {/* Product image */}
                  <div className="h-20 w-20 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={name}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <ShoppingCart size={22} className="text-gray-300" />
                    )}
                  </div>

                  {/* Name + price */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{name}</p>
                    {price !== null && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        ₹{Number(price).toFixed(2)} each
                      </p>
                    )}
                    {/* Stock availability */}
                    {stock !== null && (
                      <p className={`text-xs mt-0.5 ${atStockLimit ? "text-orange-500 font-medium" : "text-gray-400"}`}>
                        {atStockLimit ? `Max stock reached (${stock})` : `Stock: ${stock} available`}
                      </p>
                    )}

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 mt-3">
                      {/* Decrease */}
                      <button
                        onClick={() => handleUpdateQuantity(productId, quantity - 1)}
                        disabled={isBusy || quantity <= 1}
                        aria-label="Decrease quantity"
                        className="h-7 w-7 rounded-full border border-gray-300 bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus size={13} />
                      </button>

                      {/* Quantity display */}
                      <span className="w-8 text-center text-sm font-semibold text-gray-800">
                        {isBusy ? (
                          <Loader2 size={13} className="animate-spin mx-auto text-gray-400" />
                        ) : (
                          quantity
                        )}
                      </span>

                      {/* Increase */}
                      <button
                        onClick={() => handleUpdateQuantity(productId, quantity + 1)}
                        disabled={isBusy || atStockLimit}
                        aria-label="Increase quantity"
                        className="h-7 w-7 rounded-full border border-green-400 bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Right side: subtotal + remove */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    {price !== null && (
                      <p className="font-bold text-blue-600 text-base">
                        ₹{(price * quantity).toFixed(2)}
                      </p>
                    )}
                    <button
                      onClick={() => handleRemove(productId)}
                      disabled={isBusy}
                      aria-label={`Remove ${name} from cart`}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>

                </CardContent>
              </Card>
            );
          })}

          {/* Order summary */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5 mt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})
              </span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">₹{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-600 pt-3 mt-1 mb-4">
              <span className="font-bold text-gray-900 dark:text-white text-lg">Total</span>
              <span className="font-bold text-blue-600 text-xl">₹{total.toFixed(2)}</span>
            </div>
            <Link to="/checkout">
              <Button className="w-full" size="lg">Proceed to Checkout</Button>
            </Link>
          </div>

        </div>
      )}
    </div>
  );
};

export default Cart;
