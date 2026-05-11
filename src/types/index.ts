/**
 * TypeScript Type Definitions
 * Demonstrates: TypeScript interfaces, types, type safety
 * Use case: Type-safe props, API responses, state management
 */

// ==================== USER TYPES ====================
export interface User {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

// ==================== PRODUCT TYPES ====================
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
  category?: string;
  is_available?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stock: number;
  category?: string;
  image?: File | null;
}

export interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  size: number;
}

// ==================== CART TYPES ====================
export interface CartItem extends Product {
  quantity: number;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

// ==================== ORDER TYPES ====================
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export interface OrderItem {
  id: number;
  product_id: number;
  product?: Product;
  product_name?: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  user_id: number;
  user?: User;
  status: OrderStatus;
  total_price: number;
  shipping_address: string;
  phone?: string;
  order_items: OrderItem[];
  created_at: string;
  updated_at?: string;
}

export interface CheckoutData {
  shipping_address: string;
  phone: string;
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
}

// ==================== NOTIFICATION TYPES ====================
export type NotificationType = 
  | "order_shipped" 
  | "order_delivered" 
  | "order_cancelled" 
  | "product_unavailable"
  | "info";

export interface Notification {
  id: number | string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: string;
}

// ==================== API TYPES ====================
export interface ApiError {
  detail: string | Array<{ msg: string; type: string }>;
  status?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ==================== COMPONENT PROP TYPES ====================
export interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  showActions?: boolean;
}

export interface OrderCardProps {
  order: Order;
  onCancel?: (orderId: number) => void;
  showActions?: boolean;
}

export interface StatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md" | "lg";
}

export interface LoadingSkeletonProps {
  count?: number;
  className?: string;
}

// ==================== FORM TYPES ====================
export interface LoginFormInputs {
  username: string;
  password: string;
}

export interface RegisterFormInputs {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface CheckoutFormInputs {
  shipping_address: string;
  phone: string;
}

export interface ProductFormInputs {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image: FileList | null;
}

// ==================== HOOK RETURN TYPES ====================
export interface UseCartReturn {
  cart: CartItem[];
  isLoading: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  cartSummary: CartSummary;
}

export interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ==================== UTILITY TYPES ====================
export type SortOrder = "asc" | "desc" | "";
export type PriceRange = "all" | "0-100" | "100-1000" | "1000+";

export interface FilterOptions {
  search: string;
  priceRange: PriceRange;
  sortOrder: SortOrder;
  category?: string;
}
