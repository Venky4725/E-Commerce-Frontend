import React, { useState } from "react";
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "./ui/toast";
import api from "../api/api";
import { useTaskPolling } from "../hooks/useTask";
import { TaskProgress } from "./TaskProgress";

const BulkUploadModal = ({ onClose, onSaved }) => {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [taskId, setTaskId] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/admin/products/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data; // Should return { task_id: "..." }
    },
    onSuccess: (data) => {
      setTaskId(data.task_id || data.id);
      toast({ title: "Upload started", description: "Processing your CSV file..." });
    },
    onError: (err) => {
      toast({
        title: "Upload failed",
        description: err.response?.data?.detail || "Make sure it's a valid CSV",
        variant: "destructive",
      });
    },
  });

  const { data: task } = useTaskPolling(taskId);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === "text/csv") {
      setFile(selected);
    } else {
      toast({ title: "Invalid file", description: "Please select a CSV file", variant: "destructive" });
    }
  };

  const isDone = task?.status?.toLowerCase() === "completed" || task?.status?.toLowerCase() === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-2xl dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Upload size={20} className="text-blue-500" />
              Bulk Product Upload
            </CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={20} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {!taskId ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-10 bg-gray-50 dark:bg-gray-900/50 transition-colors hover:bg-gray-100 dark:hover:bg-gray-900">
                <FileText size={40} className="text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                  Drag and drop your CSV file here or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button asChild variant="outline" className="cursor-pointer">
                    <span>{file ? file.name : "Select CSV File"}</span>
                  </Button>
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  disabled={!file || uploadMutation.isPending}
                  onClick={() => uploadMutation.mutate(file)}
                >
                  {uploadMutation.isPending ? (
                    <><Loader2 size={16} className="animate-spin mr-2" /> Uploading...</>
                  ) : "Start Upload"}
                </Button>
                <Button variant="ghost" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <TaskProgress task={task} label="Importing Products" />
              
              {isDone && (
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-800 dark:text-green-400 flex items-center gap-2 mb-2">
                    <CheckCircle size={16} /> Import Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-gray-600 dark:text-gray-400">Total Rows:</div>
                    <div className="font-bold text-gray-900 dark:text-white text-right">{task?.result?.total_rows || 0}</div>
                    <div className="text-green-600 dark:text-green-400 font-medium">Successful:</div>
                    <div className="font-bold text-green-700 dark:text-green-300 text-right">{task?.result?.success_count || 0}</div>
                    <div className="text-red-600 dark:text-red-400 font-medium">Failed:</div>
                    <div className="font-bold text-red-700 dark:text-red-300 text-right">{task?.result?.failed_count || 0}</div>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                variant={isDone ? "default" : "outline"}
                onClick={isDone ? () => { onSaved(); onClose(); } : onClose}
              >
                {isDone ? "Done" : "Close & Keep Processing"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkUploadModal;
