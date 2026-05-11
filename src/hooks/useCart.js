import { useState, useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Custom hook for cart management
 * Demonstrates: Custom hooks, useState, useCallback, useMemo, useLocalStorage
 * Use case: Shopping cart functionality with persistence
 * 
 * @returns {Object} Cart state and actions
 */
export function useCart() {
  const [cart, setCart] = useLocalStorage("shopping-cart", []);
  const [isLoading, setIsLoading] = useState(false);

  // Add item to cart
  const addToCart = useCallback(
    (product, quantity = 1) => {
      setIsLoading(true);
      
      setCart((prevCart) => {
        const existingItem = prevCart.find((item) => item.id === product.id);
        
        if (existingItem) {
          // Update quantity if item exists
          return prevCart.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          // Add new item
          return [...prevCart, { ...product, quantity }];
        }
      });
      
      setIsLoading(false);
    },
    [setCart]
  );

  // Remove item from cart
  const removeFromCart = useCallback(
    (productId) => {
      setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
    },
    [setCart]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    (productId, quantity) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }
      
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    },
    [setCart, removeFromCart]
  );

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([]);
  }, [setCart]);

  // Calculate totals using useMemo for performance
  const cartSummary = useMemo(() => {
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    const tax = subtotal * 0.18; // 18% tax
    const shipping = subtotal > 500 ? 0 : 50; // Free shipping over ₹500
    const total = subtotal + tax + shipping;

    return {
      itemCount,
      subtotal,
      tax,
      shipping,
      total,
    };
  }, [cart]);

  return {
    cart,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartSummary,
  };
}
