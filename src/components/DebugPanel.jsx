import React, { useState } from "react";
import useAuthStore from "../store/authStore";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Bug, X } from "lucide-react";

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const { token, user } = useAuthStore();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg"
        aria-label="Open debug panel"
      >
        <Bug size={20} />
      </button>
    );
  }

  const localStorageToken = localStorage.getItem("access_token");
  const zustandState = JSON.parse(localStorage.getItem("auth-storage") || "{}");

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm dark:text-white flex items-center gap-2">
            <Bug size={16} /> Debug Panel
          </CardTitle>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Zustand State */}
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Zustand Auth Store:</p>
            <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded font-mono">
              <p className="text-green-600 dark:text-green-400">
                token: {token ? "✅ EXISTS" : "❌ NULL"}
              </p>
              <p className="text-blue-600 dark:text-blue-400">
                user: {user ? `✅ ${user.username || user.email}` : "❌ NULL"}
              </p>
            </div>
          </div>

          {/* localStorage */}
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">localStorage:</p>
            <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded font-mono">
              <p className="text-purple-600 dark:text-purple-400">
                access_token: {localStorageToken ? "✅ EXISTS" : "❌ NULL"}
              </p>
              {localStorageToken && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {localStorageToken.substring(0, 30)}...
                </p>
              )}
            </div>
          </div>

          {/* Zustand Persist */}
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Zustand Persist (auth-storage):</p>
            <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded font-mono max-h-32 overflow-auto">
              <pre className="text-xs text-gray-600 dark:text-gray-400">
                {JSON.stringify(zustandState, null, 2)}
              </pre>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                console.log("🔍 Debug Info:");
                console.log("Zustand token:", token);
                console.log("Zustand user:", user);
                console.log("localStorage token:", localStorageToken);
                console.log("Zustand persist:", zustandState);
              }}
              className="flex-1"
            >
              Log to Console
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="flex-1"
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
