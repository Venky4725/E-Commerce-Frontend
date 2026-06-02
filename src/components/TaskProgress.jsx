import React from "react";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Progress } from "./ui/progress"; // Need to check if this exists, else use div
import { sanitizeErrorMessage } from "../lib/errorUtils";

export const TaskProgress = ({ task, label }) => {
  if (!task) return null;

  const status = task.status?.toLowerCase();
  const progress = Math.min(100, Math.max(0, Number(task.progress ?? 0)));
  const isDone = status === "completed" || status === "success";
  const isFailed = status === "failed" || status === "error";
  const isPending = !isDone && !isFailed;
  const message = sanitizeErrorMessage(task.message, "");
  const error = sanitizeErrorMessage(task.error, "");

  return (
    <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isPending && <Loader2 size={16} className="animate-spin text-blue-500" />}
          {isDone && <CheckCircle size={16} className="text-green-500" />}
          {isFailed && <XCircle size={16} className="text-red-500" />}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label || "Task progress"}
          </span>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {status}
        </span>
      </div>

      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
        <span>{isDone ? "Completed" : isFailed ? "Failed" : "Processing..."}</span>
        <span>{isDone ? "100%" : `${progress}%`}</span>
      </div>

      <Progress value={isDone ? 100 : progress} className={isFailed ? "[&>div]:bg-red-500" : isDone ? "[&>div]:bg-green-500" : ""} />

      {message && (
        <p className={`mt-2 text-xs ${isFailed ? "text-red-500" : "text-gray-600 dark:text-gray-400"}`}>
          {message}
        </p>
      )}

      {isFailed && error && (
        <div className="mt-2 flex items-start gap-1 rounded bg-red-50 p-2 text-[10px] text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
