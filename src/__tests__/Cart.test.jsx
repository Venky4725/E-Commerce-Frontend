/**
 * Sample Test File - Cart Hook
 * Demonstrates: Testing custom hooks
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCart } from "../hooks/useCart";

describe("useCart Hook", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should initialize with empty cart", () => {
    const { result } = renderHook(() => useCart());
    
    expect(result.current.cart).toEqual([]);
    expect(result.current.cartSummary.itemCount).toBe(0);
    expect(result.current.cartSummary.total).toBe(0);
  });

  it("should add item to cart", () => {
    const { result } = renderHook(() => useCart());
    
    const product = {
      id: 1,
      name: "Test Product",
      price: 100,
      stock: 10,
    };

    act(() => {
      result.current.addToCart(product, 2);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(2);
    expect(result.current.cartSummary.itemCount).toBe(2);
  });

  it("should update quantity of existing item", () => {
    const { result } = renderHook(() => useCart());
    
    const product = {
      id: 1,
      name: "Test Product",
      price: 100,
      stock: 10,
    };

    act(() => {
      result.current.addToCart(product, 1);
      result.current.addToCart(product, 1);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(2);
  });

  it("should remove item from cart", () => {
    const { result } = renderHook(() => useCart());
    
    const product = {
      id: 1,
      name: "Test Product",
      price: 100,
      stock: 10,
    };

    act(() => {
      result.current.addToCart(product, 1);
      result.current.removeFromCart(1);
    });

    expect(result.current.cart).toHaveLength(0);
  });

  it("should calculate cart summary correctly", () => {
    const { result } = renderHook(() => useCart());
    
    const product1 = { id: 1, name: "Product 1", price: 100, stock: 10 };
    const product2 = { id: 2, name: "Product 2", price: 200, stock: 10 };

    act(() => {
      result.current.addToCart(product1, 2); // 200
      result.current.addToCart(product2, 1); // 200
    });

    const { cartSummary } = result.current;
    
    expect(cartSummary.itemCount).toBe(3);
    expect(cartSummary.subtotal).toBe(400);
    expect(cartSummary.tax).toBe(400 * 0.18); // 18% tax
    expect(cartSummary.shipping).toBe(50); // Under ₹500
  });

  it("should clear entire cart", () => {
    const { result } = renderHook(() => useCart());
    
    const product = {
      id: 1,
      name: "Test Product",
      price: 100,
      stock: 10,
    };

    act(() => {
      result.current.addToCart(product, 1);
      result.current.clearCart();
    });

    expect(result.current.cart).toHaveLength(0);
    expect(result.current.cartSummary.itemCount).toBe(0);
  });
});
