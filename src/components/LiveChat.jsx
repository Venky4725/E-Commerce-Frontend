import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { Loader2, MessageCircle, RefreshCw, Send, Wifi, WifiOff } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useWebSocketContext } from "../websocket/WebSocketProvider";
import useAuthStore from "../store/authStore";

const stateStyles = {
  connected: "text-green-600 dark:text-green-400",
  connecting: "text-blue-600 dark:text-blue-400",
  reconnecting: "text-blue-600 dark:text-blue-400",
  disconnected: "text-yellow-600 dark:text-yellow-400",
  error: "text-red-600 dark:text-red-400",
  idle: "text-gray-500 dark:text-gray-400",
};

const LiveChat = React.memo(function LiveChat() {
  const [message, setMessage] = useState("");
  const { sendJson, connectionState, reconnect } = useWebSocketContext();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);

  const userId = useMemo(() => {
    if (!user) return "anonymous";
    const id = user.id || user.email;
    return id ? `user-${id}` : "anonymous";
  }, [user]);

  const rawUserId = useMemo(() => {
    if (!user) return "anonymous";
    return user.id || user.email || "anonymous";
  }, [user]);

  const adminId = "admin"; // best-effort (backend may override via payload)
  const conversationKey = `support-admin-${userId}`;
  const historyKey = `chat-history-${userId}`;


  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["live-chat", userId],
    queryFn: () => {
      try {
        const cached = localStorage.getItem(historyKey);
        return cached ? JSON.parse(cached) : [];
      } catch (e) {
        console.error("Failed to load chat history", e);
        return [];
      }
    },
    staleTime: Infinity,
  });

  // Auto-scroll on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    
    if (messages.length > 0) {
      localStorage.setItem(historyKey, JSON.stringify(messages.slice(-100)));
    }
    return () => clearTimeout(timer);
  }, [messages, historyKey]);

  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting" || connectionState === "reconnecting";
  const connectionLabel = isConnected ? "Connected" : "Reconnecting...";

  const statusIcon = useMemo(() => {
    if (isConnecting) return <Loader2 size={14} className="animate-spin" />;
    if (isConnected) return <Wifi size={14} />;
    return <WifiOff size={14} />;
  }, [isConnected, isConnecting]);

  const sendMessage = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || !isConnected) return;

    const timestamp = new Date().toISOString();

    // Ensure raw IDs in payload to prevent duplication
    const payload = {
      id: `${rawUserId}-${Date.now()}`,
      body: trimmed,
      message: trimmed, // for compatibility
      user_id: rawUserId,
      userId: rawUserId, // for compatibility
      username: user?.username || user?.email || "User",
      timestamp,
      session_id: conversationKey,
      room_id: conversationKey,
      conversation_id: conversationKey,
      customer_id: rawUserId,
      admin_id: adminId,
    };

    const sent = sendJson({ type: "chat.message", payload });

    
    if (sent) {
      // Optimistic update
      queryClient.setQueryData(["live-chat", userId], (current = []) => {
        if (current.some(m => String(m.id) === String(payload.id))) return current;
        return [...current, payload].slice(-100);
      });
      setMessage("");
    }
  }, [isConnected, message, sendJson, user, userId, rawUserId, queryClient]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 flex flex-col h-96">
      <div className="mb-3 flex items-center justify-between gap-3 shrink-0">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
          <MessageCircle size={18} /> Live Chat
        </h3>
        <div className={`flex items-center gap-2 text-xs capitalize ${stateStyles[connectionState] || stateStyles.idle}`}>
          <div className="flex items-center gap-1">
            {statusIcon}
            <span>{connectionLabel}</span>
          </div>
          {!isConnected && (
            <button type="button" onClick={reconnect} className="ml-1 rounded px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700">
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 flex-1 space-y-2 overflow-y-auto rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-900/50">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={20} className="animate-spin text-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center text-center opacity-60 p-4">
            <MessageCircle size={32} className="mb-2 text-gray-400" />
            <p className="text-gray-900 dark:text-white font-medium">No messages yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Send a message to start a support session.</p>
          </div>
        ) : (
          <>
            {messages.map((item, index) => {
              let senderId = item.user_id || item.userId;
              if (senderId && senderId !== "anonymous" && !String(senderId).startsWith("user-")) {
                senderId = `user-${senderId}`;
              }
              const isSelf = senderId === userId;
              return (
                <div key={item.id || `${item.timestamp}-${index}`} className={`rounded-lg px-3 py-2 shadow-sm ${isSelf ? "bg-blue-600 text-white ml-6" : "bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200 mr-6 border border-gray-100 dark:border-gray-700"}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`font-bold text-[10px] ${isSelf ? "text-blue-100" : "text-gray-400"}`}>{isSelf ? "You" : item.username || "Support"}</span>
                    {item.timestamp && (
                      <span className={`text-[10px] ${isSelf ? "text-blue-200" : "text-gray-400"}`}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{item.body || item.message}</p>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && sendMessage()}
            placeholder={isConnected ? "Type a message..." : "Reconnecting..."}
            disabled={!isConnected}
            className="dark:border-gray-600 dark:bg-gray-700 bg-white dark:bg-gray-800"
          />
          <Button onClick={sendMessage} disabled={!isConnected || !message.trim()} aria-label="Send message" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
});

export default LiveChat;
