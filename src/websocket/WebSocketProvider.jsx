import React, { createContext, useContext, memo } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useWebSocket } from "./useWebSocket";
import useAuthStore from "../store/authStore";

const WebSocketContext = createContext(null);

export const WebSocketProvider = React.memo(function WebSocketProvider({ children }) {
  const value = useWebSocket();
  const token = useAuthStore((state) => state.token);
  const isConnected = value.connectionState === "connected";
  const isConnecting = value.connectionState === "connecting" || value.connectionState === "reconnecting";

  return (
    <WebSocketContext.Provider value={value}>
      {children}
      {token && (
        <div className="fixed bottom-4 left-4 z-40 hidden sm:flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          {isConnecting ? (
            <RefreshCw size={14} className="animate-spin text-blue-500" />
          ) : isConnected ? (
            <Wifi size={14} className="text-green-500" />
          ) : (
            <WifiOff size={14} className="text-yellow-500" />
          )}
          <span className="capitalize">{value.connectionState}</span>
          {!isConnected && (
            <button
              type="button"
              onClick={value.reconnect}
              className="ml-1 rounded px-1.5 py-0.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </WebSocketContext.Provider>
  );
});

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocketContext must be used inside WebSocketProvider");
  return context;
}
