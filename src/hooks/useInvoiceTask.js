import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

const normalizeTask = (data) => ({
  id: data.task_id || data.id,
  status: data.status || "queued",
  progress: Number(data.progress ?? data.percent ?? 0),
  downloadUrl: data.download_url || data.file_url || data.url,
  ...data,
});

export function useInvoiceTask(orderId) {
  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/orders/${orderId}/invoice`);
      return normalizeTask(res.data);
    },
    onSuccess: (task) => {
      queryClient.setQueryData(["invoice-task", task.id], task);
    },
  });

  const taskId = createTask.data?.id;

  const task = useQuery({
    queryKey: ["invoice-task", taskId],
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}`, { silent: true });
      return normalizeTask(res.data);
    },
    enabled: Boolean(taskId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 1500;
    },
    staleTime: 0,
    retry: 1,
  });

  const downloadInvoice = useCallback(async () => {
    const url = task.data?.downloadUrl || createTask.data?.downloadUrl;
    if (url) {
      window.location.href = url;
      return;
    }
    const res = await api.get(`/orders/${orderId}/invoice/download`, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(res.data);
    window.location.href = blobUrl;
  }, [orderId, task.data?.downloadUrl, createTask.data?.downloadUrl]);

  return {
    start: createTask.mutate,
    isStarting: createTask.isPending,
    task: task.data || createTask.data,
    isPolling: task.isFetching,
    downloadInvoice,
  };
}
