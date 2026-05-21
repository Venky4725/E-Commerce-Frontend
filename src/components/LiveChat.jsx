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

  const userId = user?.id || user?.email || "anonymous";
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

  const statusIcon = useMemo(() => {
    if (isConnecting) return <Loader2 size={14} className="animate-spin" />;
    if (isConnected) return <Wifi size={14} />;
    return <WifiOff size={14} />;
  }, [isConnected, isConnecting]);

  const sendMessage = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || !isConnected) return;
    
    const timestamp = new Date().toISOString();
    const payload = {
      id: `${userId}-${Date.now()}`,
      body: trimmed,
      message: trimmed, // for compatibility
      user_id: user?.id,
      userId: user?.id, // for compatibility
      username: user?.username || user?.email || "User",
      timestamp: timestamp,
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
  }, [isConnected, message, sendJson, user, userId, queryClient]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 flex flex-col h-80">
      <div className="mb-3 flex items-center justify-between gap-3 shrink-0">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
          <MessageCircle size={18} /> Live chat
        </h3>
        <div className={`flex items-center gap-1 text-xs capitalize ${stateStyles[connectionState] || stateStyles.idle}`}>
          {statusIcon}
          <span>{connectionState}</span>
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
          <p className="text-gray-500 dark:text-gray-400 text-center mt-10">No messages yet.</p>
        ) : (
          <>
            {messages.map((item, index) => {
              const isSelf = item.user_id === user?.id || item.userId === user?.id;
              return (
                <div key={item.id || `${item.timestamp}-${index}`} className={`rounded-md px-3 py-2 shadow-sm ${isSelf ? "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100 ml-4" : "bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200 mr-4"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[11px] opacity-70">{item.username || "Support"}</span>
                    {item.timestamp && (
                      <span className="text-[10px] opacity-50">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words">{item.body || item.message}</p>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        <Input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && sendMessage()}
          placeholder={isConnected ? "Type a message" : "Connecting..."}
          disabled={!isConnected}
          className="dark:border-gray-600 dark:bg-gray-700"
        />
        <Button onClick={sendMessage} disabled={!isConnected || !message.trim()} aria-label="Send message">
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
});

export default LiveChat;
