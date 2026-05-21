export const ACTIVE_STATUSES = ["pending", "processing", "shipped"];
export const DELIVERED_STATUSES = ["delivered"];
export const CANCELLED_STATUSES = ["cancelled"];

export const normalizeStatus = (status) => String(status || "pending").toLowerCase();

export const getOrderItems = (order) => order?.order_items ?? order?.items ?? [];

export const getOrderTotal = (order) => {
  const directTotal = order?.total_amount ?? order?.total_price ?? order?.total;
  if (Number(directTotal) > 0) return Number(directTotal);

  return getOrderItems(order).reduce((sum, item) => {
    const price = Number(item.product?.price ?? item.price ?? 0);
    const quantity = Number(item.quantity ?? 1);
    return sum + price * quantity;
  }, 0);
};

export const normalizeOrderList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.orders)) return data.orders;
  return [];
};

export const orderMatchesTab = (order, tab) => {
  const status = normalizeStatus(order?.status);
  const isDeleted = Boolean(order?.is_deleted || order?.deleted_at || order?.archived);
  if (tab === "active") return ACTIVE_STATUSES.includes(status) && !isDeleted;
  if (tab === "delivered") return DELIVERED_STATUSES.includes(status) && !isDeleted;
  if (tab === "cancelled") return CANCELLED_STATUSES.includes(status) && !isDeleted;
  if (tab === "deleted") return isDeleted;
  return true;
};

export const mergeOrderPatch = (order, patch) => {
  const id = patch.id ?? patch.order_id ?? patch.orderId;
  if (String(order.id) !== String(id)) return order;
  return {
    ...order,
    ...patch,
    id: order.id,
    status: patch.status ?? order.status,
    updated_at: patch.updated_at || patch.timestamp || new Date().toISOString(),
  };
};

export const upsertOrder = (orders = [], patch) => {
  const id = patch.id ?? patch.order_id ?? patch.orderId;
  if (!id) return orders;
  const exists = orders.some((order) => String(order.id) === String(id));
  if (!exists) return [patch, ...orders];
  return orders.map((order) => mergeOrderPatch(order, patch));
};

export const buildOrderNotification = (payload, fallbackUserId) => {
  const status = normalizeStatus(payload.status);
  const orderId = payload.order_id || payload.orderId || payload.id;
  return {
    id: payload.notification_id || `order-${orderId}-${status}-${payload.updated_at || payload.timestamp || Date.now()}`,
    userId: payload.user_id || payload.userId || fallbackUserId,
    type: ["processing", "shipped", "delivered", "cancelled"].includes(status)
      ? `order_${status}`
      : "order_processing",
    title: payload.title || "Order status updated",
    message: payload.message || `Order #${orderId} is now ${status}.`,
    orderId,
    timestamp: payload.created_at || payload.updated_at || payload.timestamp || new Date().toISOString(),
  };
};
