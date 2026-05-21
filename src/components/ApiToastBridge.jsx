import React, { useEffect, memo } from "react";
import { setApiToastHandler } from "../api/api";
import { useToast } from "./ui/toast";

function ApiToastBridge() {
  const { toast } = useToast();

  useEffect(() => {
    setApiToastHandler(toast);
    return () => setApiToastHandler(null);
  }, [toast]);

  return null;
}

export default React.memo(ApiToastBridge);
