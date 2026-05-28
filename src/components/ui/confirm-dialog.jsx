import React, { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";
import { Card, CardContent } from "./card";

const ConfirmDialog = ({
  open,
  title = "Confirm",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const dialogId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onMouseDown={(e) => {
        // close when clicking backdrop
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <Card className="w-full max-w-lg dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-5">
          <div className="space-y-3">
            <h2 id={dialogId} className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            {description ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                {cancelText}
              </Button>
              <Button
                variant={danger ? "destructive" : "default"}
                onClick={onConfirm}
                disabled={isLoading}
                className={danger ? "gap-2" : undefined}
              >
                {isLoading ? "Working..." : confirmText}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};

export default React.memo(ConfirmDialog);

