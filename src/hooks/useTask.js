import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../api/api";

const normalizeTask = (data) => ({
  id: data.task_id || data.id,
  status: data.status || "queued",
  progress: Number(data.progress ?? data.percent ?? 0),
  result: data.result,
  error: data.error || data.message,
  ...data,
});

export function useTaskPolling(taskId) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}`, { silent: true });
      return normalizeTask(res.data);
    },
    enabled: Boolean(taskId),
    refetchInterval: (query) => {
      const status = query.state.data?.status?.toLowerCase();
      // Stop polling if completed or failed
      if (["completed", "success", "failed", "error"].includes(status)) {
        return false;
      }
      return 1500; // Poll every 1.5 seconds
    },
    staleTime: 0,
    retry: 1,
  });
}
