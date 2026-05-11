import React, { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Eye } from "lucide-react";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import type { Product } from "../types";

/**
 * ProductCard Component (TypeScript)
 * Demonstrates: TypeScript, React.memo, props, conditional rendering
 * Performance: Memoized to prevent unnecessary re-renders
 * 
 * @param {ProductCardProps} props - Component props
 */
interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  showActions?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = memo(({ 
  product, 
  onAddToCart,
  showActions = true 
}) => {
  const navigate = useNavigate();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/product/${product.id}`);
  };

  // Image URL handling
  const imageUrl = product.image_url 
    ? `http://127.0.0.1:8000${product.image_url}`
    : "https://via.placeholder.com/300x300?text=No+Image";

  // Stock status
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <Card className="group bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <Link to={`/product/${product.id}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
          
          {/* Stock Badge */}
          {isOutOfStock && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              Out of Stock
            </div>
          )}
          {isLowStock && (
            <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
              Only {product.stock} left
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleViewDetails}
              className="flex items-center gap-2"
            >
              <Eye size={16} />
              Quick View
            </Button>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {product.name}
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {product.description}
          </p>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₹{product.price.toFixed(2)}
            </span>
            {product.price > 100 && (
              <span className="text-sm text-gray-500 line-through">
                ₹{(product.price * 1.2).toFixed(2)}
              </span>
            )}
          </div>
        </CardContent>
      </Link>

      {/* Actions */}
      {showActions && (
        <CardFooter className="p-4 pt-0">
          <Button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={18} />
            {isOutOfStock ? "Out of Stock" : "Add to Cart"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
