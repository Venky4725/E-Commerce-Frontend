import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import api from "../api/api";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";
import useAuthStore from "../store/authStore";

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);

  const imageUrl = product.image_url
    ? `http://127.0.0.1:8000${product.image_url}`
    : "https://placehold.co/300x300?text=No+Image";

  const handleAddToCart = async () => {
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
  };

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
      {/* Product image */}
      <Link to={`/product/${product.id}`}>
        <div className="h-48 w-full overflow-hidden rounded-t-xl bg-gray-50 dark:bg-gray-700">
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-contain p-2 hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              e.target.src = "https://placehold.co/300x300?text=No+Image";
            }}
          />
        </div>
      </Link>

      <CardContent className="flex-1 pt-4">
        <Link to={`/product/${product.id}`}>
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm leading-snug line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {product.name}
          </h2>
        </Link>
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
