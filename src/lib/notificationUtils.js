/**
 * Notification utility functions
 * 
 * NOTE: This is a CLIENT-SIDE DEMO implementation.
 * In production, notifications should come from the backend via WebSocket/Push.
 */

/**
 * Get notification details based on order status
 */
export const getNotificationForStatus = (status, orderId, productName = null) => {
  const statusLower = status?.toLowerCase();
  
  const notifications = {
    processing: {
      type: "order_processing",
      title: "Order Processing",
      message: productName 
        ? `Your ${productName} order is being processed.`
        : `Your order #${orderId} is being processed.`,
    },
    shipped: {
      type: "order_shipped",
      title: "Order Shipped",
      message: productName
        ? `Your ${productName} order has been shipped!`
        : `Your order #${orderId} has been shipped!`,
    },
    delivered: {
      type: "order_delivered",
      title: "Order Delivered",
      message: productName
        ? `Your ${productName} order has been delivered successfully!`
        : `Your order #${orderId} has been delivered successfully!`,
    },
    cancelled: {
      type: "order_cancelled",
      title: "Order Cancelled",
      message: productName
        ? `Your ${productName} order has been cancelled.`
        : `Your order #${orderId} has been cancelled.`,
    },
  };

  return notifications[statusLower] || {
    type: "order_processing",
    title: "Order Update",
    message: `Your order #${orderId} status has been updated to ${status}.`,
  };
};

/**
 * Create demo notifications for testing
 * This simulates what a backend would send
 */
export const createDemoNotifications = () => {
  const now = Date.now();
  
  return [
    {
      id: `demo-delivered-${now}`, // Unique ID
      type: "order_delivered",
      title: "Order Delivered",
      message: "Your iPhone 15 Pro order has been delivered successfully!",
      timestamp: new Date(now - 3600000).toISOString(), // 1 hour ago
      read: false,
    },
    {
      id: `demo-shipped-${now}`, // Unique ID
      type: "order_shipped",
      title: "Order Shipped",
      message: "Your Samsung Galaxy S24 order has been shipped!",
      timestamp: new Date(now - 7200000).toISOString(), // 2 hours ago
      read: false,
    },
    {
      id: `demo-processing-${now}`, // Unique ID
      type: "order_processing",
      title: "Order Processing",
      message: "Your MacBook Pro order is being processed.",
      timestamp: new Date(now - 86400000).toISOString(), // 1 day ago
      read: true,
    },
  ];
};

/**
 * Get product name from order items
 */
export const getProductNameFromOrder = (order) => {
  const items = order?.order_items || order?.items || [];
  if (items.length === 0) return null;
  
  // Get first product name
  const firstItem = items[0];
  const productName = firstItem?.product?.name || firstItem?.product_name;
  
  // If multiple items, add "and more"
  if (items.length > 1) {
    return `${productName} and ${items.length - 1} more item${items.length > 2 ? 's' : ''}`;
  }
  
  return productName;
};
