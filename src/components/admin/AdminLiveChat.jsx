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
  
  const adminId = useMemo(() => {
    if (!admin) return "admin";
    const id = admin.id || admin.email;
    return id ? `user-${id}` : "admin";
  }, [admin]);

  const rawAdminId = useMemo(() => {
    if (!admin) return "admin";
    return admin.id || admin.email || "admin";
  }, [admin]);

  const queryClient = useQueryClient();

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [draft, setDraft] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [closedSessionIds, setClosedSessionIds] = useState(() => {
    try {
      const stored = localStorage.getItem("closed-support-sessions");
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });

  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting" || connectionState === "reconnecting";

  // Sync closed sessions to localStorage
  useEffect(() => {
    localStorage.setItem("closed-support-sessions", JSON.stringify(Array.from(closedSessionIds)));
  }, [closedSessionIds]);

  const sessions = useMemo(() => {
    const byCustomer = new Map();

    // 1. Scan localStorage for chat histories
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("chat-history-") && !key.startsWith("chat-history-support-")) {
          const customerId = key.replace("chat-history-", "");
          if (customerId && customerId !== "anonymous") {
            try {
              const data = JSON.parse(localStorage.getItem(key) || "[]");
              if (Array.isArray(data) && data.length > 0) {
                const last = data[data.length - 1];
                const isClosed = closedSessionIds.has(customerId);
                
                // Only count unread for active sessions
                const unread = isClosed ? 0 : data.filter((m) => {
                  let sender = m.user_id || m.userId;
                  if (sender && sender !== "anonymous" && !String(sender).startsWith("user-")) {
                    sender = `user-${sender}`;
                  }
                  const fromCustomer = sender && String(sender) === String(customerId);
                  const fromAdmin = sender && String(sender) === String(adminId);
                  return fromCustomer && !fromAdmin && !m.read; 
                }).length;

                byCustomer.set(customerId, {
                  customerId,
                  lastMessage: last?.body || last?.message || "",
                  lastTimestamp: last?.timestamp,
                  unread,
                  isClosed,
                });
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // 2. Scan queryClient cache
    const cache = queryClient.getQueryCache();
    const liveChatQueries = cache
      .getAll()
      .filter((q) => Array.isArray(q.queryKey) && q.queryKey[0] === "live-chat");

    for (const q of liveChatQueries) {
      const key = q.queryKey;
      if (!key || !Array.isArray(key) || key.length < 2) continue;
      const customerId = key[1];
      if (!customerId || customerId === "anonymous") continue;
      
      const data = q.state?.data;
      if (!Array.isArray(data) || data.length === 0) continue;

      const last = data[data.length - 1];
      const isClosed = closedSessionIds.has(customerId);
      
      // Only count unread for active sessions
      const unread = isClosed ? 0 : data.filter((m) => {
        let sender = m.user_id || m.userId;
        if (sender && sender !== "anonymous" && !String(sender).startsWith("user-")) {
          sender = `user-${sender}`;
        }
        const fromCustomer = sender && String(sender) === String(customerId);
        const fromAdmin = sender && String(sender) === String(adminId);
        return fromCustomer && !fromAdmin && !m.read;
      }).length;

      byCustomer.set(customerId, {
        customerId,
        lastMessage: last?.body || last?.message || "",
        lastTimestamp: last?.timestamp,
        unread,
        isClosed,
      });
    }

    const sessionsNext = Array.from(byCustomer.values())
      .filter(s => activeTab === "active" ? !s.isClosed : s.isClosed)
      .sort((a, b) => {
        return new Date(b.lastTimestamp || 0).getTime() - new Date(a.lastTimestamp || 0).getTime();
      });

    return sessionsNext;
  }, [queryClient, adminId, closedSessionIds, activeTab]);

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
    return ["live-chat", selectedCustomerId || "anonymous"];
  }, [selectedCustomerId]);

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: messagesQueryKey,
    queryFn: () => {
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
      // Mark as read if currently viewing this session
      const updatedMessages = messages.map(m => {
        let sender = m.user_id || m.userId;
        if (sender && sender !== "anonymous" && !String(sender).startsWith("user-")) {
          sender = `user-${sender}`;
        }
        const fromCustomer = sender && String(sender) === String(selectedCustomerId);
        if (fromCustomer && !m.read) {
          return { ...m, read: true };
        }
        return m;
      });

      const hasChanges = updatedMessages.some((m, i) => m.read !== messages[i].read);
      
      if (hasChanges) {
        queryClient.setQueryData(messagesQueryKey, updatedMessages);
      }
      
      localStorage.setItem(historyKey, JSON.stringify(updatedMessages.slice(-200)));
    }
  }, [messages, selectedCustomerId, queryClient, messagesQueryKey]);

  const handleCloseSession = useCallback(() => {
    if (!selectedCustomerId) return;
    if (window.confirm("Close this conversation?")) {
      setClosedSessionIds(prev => {
        const next = new Set(prev);
        next.add(selectedCustomerId);
        return next;
      });
      setSelectedCustomerId(null);
    }
  }, [selectedCustomerId]);

  const handleReopenSession = useCallback(() => {
    if (!selectedCustomerId) return;
    setClosedSessionIds(prev => {
      const next = new Set(prev);
      next.delete(selectedCustomerId);
      return next;
    });
  }, [selectedCustomerId]);

  const handleDeleteSession = useCallback(() => {
    if (!selectedCustomerId) return;
    if (window.confirm("Are you sure you want to delete this session and all its history?")) {
      const historyKey = `chat-history-${selectedCustomerId}`;
      localStorage.removeItem(historyKey);
      queryClient.removeQueries({ queryKey: ["live-chat", selectedCustomerId] });
      setClosedSessionIds(prev => {
        const next = new Set(prev);
        next.delete(selectedCustomerId);
        return next;
      });
      setSelectedCustomerId(null);
    }
  }, [selectedCustomerId, queryClient]);

  const send = useCallback(() => {
    if (!draft.trim() || !selectedSession || !isConnected) return;

    const timestamp = new Date().toISOString();
    
    // Ensure raw IDs in payload to prevent duplication
    const rawCustomerId = String(selectedSession.customerId).replace(/^user-/, "");
    
    const payload = {
      id: `${rawAdminId}-${Date.now()}`,
      body: draft.trim(),
      message: draft.trim(),
      user_id: rawAdminId,
      userId: rawAdminId,
      username: admin?.username || admin?.email || "Admin",
      timestamp,
      session_id: selectedSession.roomId,
      room_id: selectedSession.roomId,
      conversation_id: selectedSession.roomId,
      customer_id: rawCustomerId,
      admin_id: rawAdminId,
    };

    const sent = sendJson({ type: "chat.message", payload });
    if (sent) {
      queryClient.setQueryData(messagesQueryKey, (current = []) => {
        if (current.some((m) => String(m.id) === String(payload.id))) return current;
        return [...current, payload].slice(-200);
      });
      setDraft("");
    }
  }, [draft, selectedSession, isConnected, sendJson, queryClient, messagesQueryKey, rawAdminId, admin]);

  const statusIcon = useMemo(() => {
    if (isConnecting) return <RefreshCw size={14} className="animate-spin" />;
    if (isConnected) return <Users size={14} />;
    return <RefreshCw size={14} />;
  }, [isConnected, isConnecting]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: sessions */}
      <aside className="lg:col-span-4 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-blue-500" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Support Chats</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {statusIcon}
            {!isConnected && (
              <button type="button" onClick={reconnect} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition">
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2 text-xs font-medium transition ${
              activeTab === "active" 
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10" 
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab("closed")}
            className={`flex-1 py-2 text-xs font-medium transition ${
              activeTab === "closed" 
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10" 
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Closed
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[400px]">
          {sessions.length === 0 ? (
            <div className="p-10 text-center">
              <div className="bg-gray-100 dark:bg-gray-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">No {activeTab} chats</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {activeTab === "active" ? "Waiting for customer messages..." : "No closed conversations found."}
              </p>
            </div>
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
                          Customer {s.customerId.replace(/^user-/, "")}
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
      <section className="lg:col-span-8 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {selectedSession ? `Chat with customer ${selectedSession.customerId.replace(/^user-/, "")}` : "Support Messaging"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedSession ? (activeTab === "closed" ? "Closed Conversation" : "Realtime support messaging") : "Select a session to start chatting"}
              </p>
            </div>
            {selectedSession && (
              <div className="flex items-center gap-2">
                {activeTab === "active" ? (
                  <Button variant="outline" size="xs" onClick={handleCloseSession} className="text-[10px] h-7 px-2 border-yellow-200 hover:bg-yellow-50 text-yellow-700 dark:border-yellow-900/50 dark:hover:bg-yellow-900/20">
                    Close Chat
                  </Button>
                ) : (
                  <Button variant="outline" size="xs" onClick={handleReopenSession} className="text-[10px] h-7 px-2">
                    Reopen
                  </Button>
                )}
                <Button variant="destructive" size="xs" onClick={handleDeleteSession} className="text-[10px] h-7 px-2">
                  Delete Chat
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900/30 p-4">
          {!selectedSession ? (
            <div className="flex flex-col h-full items-center justify-center text-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <MessageCircle size={32} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Customer Support</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                Select a conversation from the left to view message history and respond to inquiries.
              </p>
            </div>
          ) : loadingMessages ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw size={24} className="animate-spin text-blue-500" />
                <span className="text-xs text-gray-500">Loading history...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center p-8">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No message history found for this session.</p>
                <p className="text-xs text-gray-400 mt-2">History starts when a message is sent or received.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, idx) => {
                let senderId = m.user_id || m.userId;
                if (senderId && senderId !== "anonymous" && !String(senderId).startsWith("user-")) {
                  senderId = `user-${senderId}`;
                }
                const isSelf = senderId && String(senderId) === String(adminId);
                return (
                  <div
                    key={m.id || `${m.timestamp || ""}-${idx}`}
                    className={isSelf ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={
                        "max-w-[85%] rounded-2xl px-4 py-2 shadow-sm border " +
                        (isSelf
                          ? "bg-blue-600 text-white border-blue-500 dark:bg-blue-600 dark:text-white rounded-tr-none"
                          : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 rounded-tl-none")
                      }
                    >
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className={`font-bold text-[10px] ${isSelf ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}>
                          {isSelf ? "Support Team" : m.username || "Customer"}
                        </span>
                        {m.timestamp && (
                          <span className={`text-[10px] ${isSelf ? "text-blue-200" : "text-gray-400"}`}>{formatTime(m.timestamp)}</span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body || m.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 shrink-0">
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={isConnected ? (activeTab === "closed" ? "Conversation is closed" : "Type a reply...") : "Reconnecting..."}
              disabled={!isConnected || !selectedSession || activeTab === "closed"}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            />
            <Button onClick={send} disabled={!isConnected || !selectedSession || !draft.trim() || activeTab === "closed"} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send size={16} />
            </Button>
          </div>
          {activeTab === "closed" && (
            <p className="text-[10px] text-center text-gray-500 mt-2">
              This conversation is moved to closed. Reopen to send messages.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

