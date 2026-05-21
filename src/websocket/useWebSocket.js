import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WS_URL } from "../api/endpoints";
import useAuthStore from "../store/authStore";
import useNotificationStore from "../store/notificationStore";
import { buildOrderNotification, upsertOrder } from "../lib/orderUtils";

const CONNECTING = "connecting";
const RECONNECTING = "reconnecting";
const CONNECTED = "connected";
const DISCONNECTED = "disconnected";
const ERROR = "error";
const IDLE = "idle";

const normalizeMessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    // Handle cases where the message is wrapped in an event object
    if (data.event && data.data) return { type: data.event, payload: data.data };
    return data;
  } catch {
    return { type: "message", payload: event.data };
  }
};

const getMessageType = (message) => message.type || message.event || message.action;
const getPayload = (message) => message.payload || message.data || message.order || message;

const isOrderEvent = (type) =>
  ["order_status_updated", "order.updated", "order_update", "notification", "order_processing", "order_shipped", "order_delivered", "order_cancelled"].includes(type);

const isChatEvent = (type) => ["chat.message", "chat_message", "message", "chat"].includes(type);

export function useWebSocket() {
  const queryClient = useQueryClient();
  const { token, user, isHydrated } = useAuthStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const setCurrentUser = useNotificationStore((state) => state.setCurrentUser);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const attemptsRef = useRef(0);
  const shouldReconnectRef = useRef(false);
  const [connectionState, setConnectionState] = useState(IDLE);
  const [nextRetryAt, setNextRetryAt] = useState(null);

  const userId = user?.id || user?.email;

  const url = useMemo(() => {
    if (!token) return null;
    const base = WS_URL.startsWith("/") ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}${WS_URL}` : WS_URL;
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}token=${encodeURIComponent(token)}`;
  }, [token]);

  const applyOrderEvent = useCallback(
    (payload) => {
      const orderId = payload.id || payload.order_id || payload.orderId;
      if (!orderId) return;

      const patch = {
        ...payload,
        id: orderId,
        status: payload.status,
      };

      // Optimistic update for both user and admin order lists
      queryClient.setQueriesData({ queryKey: ["user-orders"] }, (current = []) =>
        upsertOrder(current, patch)
      );
      queryClient.setQueriesData({ queryKey: ["admin-orders"] }, (current = []) =>
        upsertOrder(current, patch)
      );
      
      // Also update individual order details if open
      queryClient.setQueriesData({ queryKey: ["order", orderId] }, (current) => {
        if (!current) return current;
        return { ...current, ...patch };
      });

      // Add notification if it's for the current user (or if current user is admin)
      const payloadUserId = payload.user_id || payload.userId;
      if (payload.status || payload.title || payload.message) {
        if (!user?.is_admin || !payloadUserId || String(payloadUserId) === String(user?.id)) {
          addNotification(buildOrderNotification(payload, userId));
        }
      }
    },
    [addNotification, queryClient, userId, user?.is_admin, user?.id]
  );

  const handleMessage = useCallback(
    (message) => {
      const type = getMessageType(message);
      const payload = getPayload(message);
      
      if (!type) return;

      if (isOrderEvent(type)) {
        applyOrderEvent(payload);
      } else if (isChatEvent(type)) {
        const chatUserId = userId || "anonymous";
        const msgId = payload.id || `${payload.user_id || payload.username || "support"}-${payload.timestamp || Date.now()}`;
        
        queryClient.setQueryData(["live-chat", chatUserId], (current = []) => {
          if (current.some((item) => String(item.id) === String(msgId))) {
            return current;
          }
          return [...current, { ...payload, id: msgId }].slice(-100);
        });

        // Add notification for incoming chat messages (not from self)
        const senderId = payload.user_id || payload.userId;
        const isFromSelf = senderId && user?.id && String(senderId) === String(user.id);
        
        if (!isFromSelf && !window.location.pathname.includes("/orders")) {
          addNotification({
            id: `chat-${msgId}`,
            type: "chat_message",
            title: `Message from ${payload.username || "Support"}`,
            message: payload.body || payload.message || "New message received",
            userId: userId,
            timestamp: payload.timestamp || new Date().toISOString(),
          });
        }
      }
    },
    [addNotification, applyOrderEvent, queryClient, userId, user?.id]
  );

  const cleanupSocket = useCallback(() => {
    if (socketRef.current) {
      const socket = socketRef.current;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      socketRef.current = null;
    }
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const handleMessageRef = useRef(handleMessage);
  handleMessageRef.current = handleMessage;

  const connect = useCallback(() => {
    if (!url || !token) {
      setConnectionState(IDLE);
      return;
    }

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    cleanupSocket();
    shouldReconnectRef.current = true;
    setConnectionState(attemptsRef.current > 0 ? RECONNECTING : CONNECTING);

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setNextRetryAt(null);
        setConnectionState(CONNECTED);
        if (userId) setCurrentUser(userId);
        
        // Subscription logic might vary by backend, but common practice
        socket.send(JSON.stringify({ type: "subscribe", payload: { channels: ["orders", "notifications", "chat"] } }));
        
        // Reset attempts after stable connection
        const timer = setTimeout(() => {
          if (socketRef.current === socket && socket.readyState === WebSocket.OPEN) {
             attemptsRef.current = 0;
          }
        }, 5000);
        return () => clearTimeout(timer);
      };

      socket.onmessage = (event) => {
        const message = normalizeMessage(event);
        handleMessageRef.current(message);
      };

      socket.onclose = (event) => {
        if (socketRef.current === socket) {
           socketRef.current = null;
        }
        setConnectionState(DISCONNECTED);
        
        if (shouldReconnectRef.current && token) {
          const delay = Math.min(30000, 1000 * Math.pow(2, attemptsRef.current));
          setNextRetryAt(Date.now() + delay);
          attemptsRef.current += 1;
          reconnectTimerRef.current = window.setTimeout(connect, delay);
        }
      };

      socket.onerror = (error) => {
        console.error("❌ WebSocket Error:", error);
        setConnectionState(ERROR);
      };
    } catch (err) {
      console.error("❌ Failed to create WebSocket:", err);
      setConnectionState(ERROR);
      // Try to reconnect even if creation failed
      if (shouldReconnectRef.current && token) {
        const delay = Math.min(30000, 1000 * Math.pow(2, attemptsRef.current));
        setNextRetryAt(Date.now() + delay);
        attemptsRef.current += 1;
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      }
    }
  }, [setCurrentUser, token, url, userId, cleanupSocket]);

  useEffect(() => {
    if (!isHydrated || !token) {
      shouldReconnectRef.current = false;
      cleanupSocket();
      setConnectionState(IDLE);
      return;
    }

    connect();
    return () => {
      shouldReconnectRef.current = false;
      cleanupSocket();
    };
  }, [cleanupSocket, connect, isHydrated, token]);

  const reconnect = useCallback(() => {
    attemptsRef.current = 0;
    setNextRetryAt(null);
    cleanupSocket();
    connect();
  }, [cleanupSocket, connect]);

  const sendJson = useCallback((payload) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false;
    socketRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  return { connectionState, nextRetryAt, sendJson, reconnect };
}

