import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Send, Clock, RefreshCw, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useWebSocketContext } from "../../websocket/WebSocketProvider";
import useAuthStore from "../../store/authStore";

const formatTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const sessionKey = (customerId, adminId) => {
  const a = adminId ?? "admin";
  const c = customerId ?? "anonymous";
  // Deterministic room id for this pair
  return `support-${String(a)}-${String(c)}`;
};

/**
 * AdminLiveChat
 * - Left panel: active customer sessions (best-effort from cached websocket messages)
 * - Right panel: realtime messages for the selected session
 */
export default function AdminLiveChat() {
  const { sendJson, connectionState, reconnect } = useWebSocketContext();
  const admin = useAuthStore((s) => s.user);
  const adminId = admin?.id || admin?.email || "admin";

  const queryClient = useQueryClient();

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [draft, setDraft] = useState("");

  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting" || connectionState === "reconnecting";

  const allChatMessages = useQuery({
    queryKey: ["admin-all-chat-messages"],
    queryFn: () => {
      // Best-effort: we rely on websocket updates putting messages into per-session caches.
      // We return empty; sessions list is derived below from query cache.
      return [];
    },
    staleTime: 0,
  });

  const sessions = useMemo(() => {
    // Derive active sessions by scanning cached live-chat queries.
    // Debug: show query cache contents for session derivation.
    if (import.meta?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[admin-chat-debug] derive sessions", {
        selectedCustomerId,
        adminId,
        cacheQueriesCount: queryClient.getQueryCache().getAll().length,
      });
    }

    const cache = queryClient.getQueryCache();
    const queries = cache.findAll({ queryKey: ["live-chat", "*"] });


    // But queryClient does not support wildcard in findAll strongly across versions.
    // So instead we scan for keys that start with ["live-chat", ...]
    const liveChatQueries = cache
      .getAll()
      .filter((q) => Array.isArray(q.queryKey) && q.queryKey[0] === "live-chat");

    if (import.meta?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[admin-chat-debug] live-chat query keys", liveChatQueries.map((q) => q.queryKey));
    }


    const byCustomer = new Map();

    for (const q of liveChatQueries) {
      const key = q.queryKey;
      if (!key || !Array.isArray(key) || key.length < 2) continue;
      const customerId = key[1];
      const data = q.state?.data;
      if (!Array.isArray(data) || data.length === 0) continue;

      const last = data[data.length - 1];
      const unread = data.filter((m) => {
        const sender = m.user_id || m.userId;
        const fromCustomer = sender && String(sender) === String(customerId);
        const fromAdmin = sender && String(sender) === String(adminId);
        return fromCustomer && !fromAdmin; // best-effort unread
      }).length;

      byCustomer.set(customerId, {
        customerId,
        lastMessage: last?.body || last?.message || "",
        lastTimestamp: last?.timestamp,
        unread,
      });
    }

    const sessionsNext = Array.from(byCustomer.values()).sort((a, b) => {
      return new Date(b.lastTimestamp || 0).getTime() - new Date(a.lastTimestamp || 0).getTime();
    });

    if (import.meta?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[admin-chat-debug] sessions derived", sessionsNext);
    }

    return sessionsNext;

  }, [queryClient, adminId]);

  useEffect(() => {
    if (!selectedCustomerId && sessions.length > 0) {
      setSelectedCustomerId(String(sessions[0].customerId));
    }
  }, [selectedCustomerId, sessions]);

  const selectedSession = useMemo(() => {
    if (!selectedCustomerId) return null;
    return {
      customerId: String(selectedCustomerId),
      roomId: sessionKey(selectedCustomerId, adminId),
    };
  }, [selectedCustomerId, adminId]);

  const messagesQueryKey = useMemo(() => {
    // We store chat by customerId so that existing websocket logic can reuse it.
    // After backend fix, we can store by roomId.
    return ["live-chat", selectedCustomerId || "anonymous"];
  }, [selectedCustomerId]);

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: messagesQueryKey,
    queryFn: () => {
      // rely on websocket-populated data in cache; fallback to localStorage
      const historyKey = `chat-history-${selectedCustomerId || "anonymous"}`;
      try {
        const cached = localStorage.getItem(historyKey);
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!selectedCustomerId) return;
    const historyKey = `chat-history-${selectedCustomerId}`;
    if (messages.length > 0) {
      localStorage.setItem(historyKey, JSON.stringify(messages.slice(-200)));
    }
  }, [messages, selectedCustomerId]);

  const send = useCallback(() => {
    if (!draft.trim() || !selectedSession || !isConnected) return;

    const timestamp = new Date().toISOString();
    const payload = {
      id: `${adminId}-${Date.now()}`,
      body: draft.trim(),
      message: draft.trim(),
      user_id: adminId,
      userId: adminId,
      username: admin?.username || admin?.email || "Admin",
      timestamp,
      // session hints for backend (best-effort)
      session_id: selectedSession.roomId,
      room_id: selectedSession.roomId,
      conversation_id: selectedSession.roomId,
      customer_id: selectedSession.customerId,
      admin_id: adminId,
    };

    const sent = sendJson({ type: "chat.message", payload });
    if (sent) {
      // Optimistic update into the session cache used by this component
      queryClient.setQueryData(messagesQueryKey, (current = []) => {
        if (current.some((m) => String(m.id) === String(payload.id))) return current;
        return [...current, payload].slice(-200);
      });
      setDraft("");
    }
  }, [draft, selectedSession, isConnected, sendJson, queryClient, messagesQueryKey, adminId, admin]);

  const statusIcon = useMemo(() => {
    if (isConnecting) return <RefreshCw size={14} className="animate-spin" />;
    if (isConnected) return <Users size={14} />;
    return <RefreshCw size={14} />;
  }, [isConnected, isConnecting]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: sessions */}
      <aside className="lg:col-span-4 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Support chats</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {statusIcon}
            <span className="capitalize">{connectionState}</span>
            {!isConnected && (
              <button
                type="button"
                onClick={reconnect}
                className="rounded px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[520px] overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No active customer chats.</div>
          ) : (
            <div>
              {sessions.map((s) => {
                const isActive = String(s.customerId) === String(selectedCustomerId);
                return (
                  <button
                    key={s.customerId}
                    type="button"
                    onClick={() => setSelectedCustomerId(String(s.customerId))}
                    className={
                      "w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 transition " +
                      (isActive
                        ? "bg-blue-50 dark:bg-blue-900/30"
                        : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          Customer {s.customerId}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.lastMessage || ""}</p>
                      </div>
                      <div className="text-right">
                        {s.lastTimestamp && (
                          <p className="text-[10px] text-gray-400">{formatTime(s.lastTimestamp)}</p>
                        )}
                        {s.unread > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] px-2 py-0.5 mt-1">
                            {s.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Right: messages */}
      <section className="lg:col-span-8 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {selectedSession ? `Chat with customer ${selectedSession.customerId}` : "Select a customer session"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedSession ? "Realtime support messaging" : "Choose a session on the left"}
              </p>
            </div>
            {selectedSession && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock size={14} />
                <span className="uppercase tracking-wide">Support</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 h-[520px] overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
          {selectedSession && loadingMessages ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading messages...</div>
            </div>
          ) : !selectedSession ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">No session selected.</div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">No messages yet.</div>
          ) : (
            <div className="space-y-2">
              {messages.map((m, idx) => {
                const senderId = m.user_id || m.userId;
                const isSelf = senderId && String(senderId) === String(adminId);
                return (
                  <div
                    key={m.id || `${m.timestamp || ""}-${idx}`}
                    className={isSelf ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={
                        "max-w-[78%] rounded-md px-3 py-2 shadow-sm border " +
                        (isSelf
                          ? "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/50 dark:text-blue-100"
                          : "bg-white text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200")
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[11px] opacity-70">
                          {isSelf ? "You" : m.username || "Customer"}
                        </span>
                        {m.timestamp && (
                          <span className="text-[10px] opacity-50">{formatTime(m.timestamp)}</span>
                        )}
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{m.body || m.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={isConnected ? "Type a reply" : "Connecting..."}
              disabled={!isConnected || !selectedSession}
              className="dark:border-gray-600 dark:bg-gray-700"
            />
            <Button onClick={send} disabled={!isConnected || !selectedSession || !draft.trim()} aria-label="Send reply">
              <Send size={16} />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

