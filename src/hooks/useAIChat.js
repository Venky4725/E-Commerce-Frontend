import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import useAuthStore from "../store/authStore";
import { API_URL } from "../api/endpoints";
import { useToast } from "../components/ui/toast";
import { preprocessQuery, getDynamicSuggestions } from "../lib/aiQueryUtils";
import { sanitizeErrorMessage } from "../lib/errorUtils";

const AI_FALLBACK_MESSAGE = "I’m pulling the best ShopKart options for you right now.";
const AI_ERROR_MESSAGE = "I’m having trouble connecting right now. Please try again in a moment — I’ll keep the shopping flow smooth.";
const STREAM_TIMEOUT_MS = 45000;

const suggestionMap = {
  best_laptops: {
    query: "laptop",
    recommendation_mode: "best"
  },
  budget_laptops: {
    query: "laptop",
    recommendation_mode: "budget"
  },
  best_sellers: {
    query: "popular products",
    recommendation_mode: "best"
  },
  new_arrivals: {
    query: "latest products",
    recommendation_mode: false
  }
};

/**
 * Hook for AI Chat streaming integration with robust lifecycle management
 */
export const useAIChat = () => {
  const user = useAuthStore((state) => state.user);
  const { token } = useAuthStore();
  
  // Robust userId scoping for storage isolation
  const userId = useMemo(() => {
    if (!user) return "anonymous";
    const id = user.id || user.email;
    return id ? `user-${id}` : "anonymous";
  }, [user]);

  const rawUserId = useMemo(() => {
    if (!user) return "anonymous";
    return user.id || user.email || "anonymous";
  }, [user]);

  const storageKey = `ai-chat-history-${userId}`;
  const exclusionStorageKey = `ai-chat-exclusions-${userId}`;

  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [exclusions, setExclusions] = useState(() => {
    try {
      const stored = localStorage.getItem(exclusionStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [lastQueryMeta, setLastQueryMeta] = useState({ intent: "none", normalized: "", filters: {} });
  const { toast } = useToast();
  const abortControllerRef = useRef(null);
  const timeoutRef = useRef(null);
  const messagesRef = useRef([]);
  const streamIdRef = useRef(0);

  // Sync messages and exclusions when user changes
  useEffect(() => {
    try {
      const storedMsg = localStorage.getItem(storageKey);
      const storedExcl = localStorage.getItem(exclusionStorageKey);
      setMessages(storedMsg ? JSON.parse(storedMsg) : []);
      setExclusions(storedExcl ? JSON.parse(storedExcl) : []);
      setActiveProduct(null);
      setLastQueryMeta({ intent: "none", normalized: "", filters: {} });
    } catch {
      setMessages([]);
      setExclusions([]);
    }
  }, [storageKey, exclusionStorageKey]);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      const persistableMessages = messages.filter((message) => !message.isStreaming);
      localStorage.setItem(storageKey, JSON.stringify(persistableMessages));
    } catch (e) {
      console.error("Failed to save AI chat history", e);
    }
  }, [messages, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(exclusionStorageKey, JSON.stringify(exclusions));
    } catch (e) {
      console.error("Failed to save AI chat exclusions", e);
    }
  }, [exclusions, exclusionStorageKey]);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const finalizeAssistantMessage = useCallback((messageId, content, products, isError = false, debug_info = null, isUnavailable = false) => {
    // Phase 5: Track active product if matches were found
    if (Array.isArray(products) && products.length > 0) {
      setActiveProduct(products[0]);
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              content: content || msg.content || (isError ? AI_ERROR_MESSAGE : AI_FALLBACK_MESSAGE),
              products: Array.isArray(products) && products.length > 0 ? products : msg.products,
              isStreaming: false,
              isError,
              isUnavailable: isUnavailable || msg.isUnavailable,
              debug_info: debug_info || msg.debug_info,
            }
          : msg
      )
    );
  }, []);

  const cleanup = useCallback(
    (streamId, reason = "stream-end") => {
      if (streamId !== streamIdRef.current) {
        return;
      }

      setIsLoading(false);
      clearTimeoutRef();
      abortControllerRef.current = null;
    },
    [clearTimeoutRef]
  );

  // Cleanup active streams and timeouts on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const sendMessage = useCallback(
    async (input) => {
      // 1. Check if input is a structured suggestion
      const isSuggestion = typeof input === "object" && input.suggestion_type;
      
      let text = "";
      let meta = {};

      if (isSuggestion) {
        // Structured suggestion flow
        const mapped = suggestionMap[input.suggestion_type] || { query: input.label, recommendation_mode: "best" };
        
        text = input.label || "";
        
        meta = {
          original: text,
          normalized: mapped.query,
          maxPrice: null,
          intent: "product_search",
          localResponse: null,
          recommendationMode: mapped.recommendation_mode,
          suggestion_type: input.suggestion_type
        };
        
        setLastQueryMeta(meta);
      } else {
        // Normal text flow
        text = typeof input === "string" ? input : input?.query || "";
        if (!text.trim()) return;

        // PHASE 7 STABILIZATION: Contextual Suggestions
        meta = preprocessQuery(text);
        setLastQueryMeta(meta);

        if (typeof input === "object" && input.type) {
          // Meta handled
        }
      }

      if (!text.trim()) return;

      // Handle Exclusions
      if (meta.excludedBrand) {
        setExclusions(prev => {
          if (!prev.includes(meta.excludedBrand)) {
            return [...prev, meta.excludedBrand];
          }
          return prev;
        });
      }

      if (meta.needsExclusion && activeProduct?.brand) {
        setExclusions(prev => {
          if (!prev.includes(activeProduct.brand)) {
            return [...prev, activeProduct.brand];
          }
          return prev;
        });
      }

      
      const streamId = streamIdRef.current + 1;
      streamIdRef.current = streamId;

      let isFinalized = false;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const userMessage = {
        role: "user",
        content: typeof input === "object" ? input.label : text,
        id: `${Date.now()}-user`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => {
        const next = [...prev, userMessage];
        messagesRef.current = next;
        return next;
      });

      setIsLoading(true);

      const aiMessageId = `${Date.now()}-assistant`;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          id: aiMessageId,
          isStreaming: true,
          timestamp: new Date().toISOString(),
          products: [],
        },
      ]);

      // Handle Unavailable Brand Short-circuit
      if (meta.unavailableBrand) {
        const brandName = meta.unavailableBrand;
        const fallbackText = `${brandName} is currently unavailable. I’ve found some great alternatives for you.`;
        
        // Suggest alternatives from the same category
        meta.normalized = meta.category ? `${meta.category}` : "popular products";
        meta.recommendationMode = "best";
        // Ensure we don't try to find the unavailable brand
        meta.brand = null;
        
        // We will continue with the fetch but using the category alternatives
        // but we'll prepend the unavailability message to the content later.
      }

      // SHORT-CIRCUIT: Conversational Bypass (Phase 4)
      if (meta.localResponse) {
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    content: meta.localResponse,
                    isStreaming: false,
                  }
                : msg
            )
          );
          setIsLoading(false);
          cleanup(streamId, "conversational-bypass");
        }, 300);
        return;
      }

      let reader = null;
      let aiContent = "";
      let aiProducts = [];
      let aiDebugInfo = null;
      let hasReceivedChunk = false;

      const parseChunkPayload = (rawData) => {
        if (typeof rawData !== "string" || rawData === "") return { type: "skip" };
        if (rawData === "[DONE]") return { type: "done" };

        try {
          const parsed = JSON.parse(rawData);
          const delta = parsed.message || parsed.content || parsed.text || parsed.delta || "";
          const products = Array.isArray(parsed.products) ? parsed.products : [];
          const debug_info = parsed.debug_info || null;
          return { type: "payload", delta, products, debug_info };
        } catch (error) {
          return { type: "error", error };
        }
      };

      const processBuffer = (buffer) => {
        const parts = buffer.split("\n\n");
        const remaining = parts.pop() || "";
        let encounteredDone = false;

        for (const part of parts) {
          const lines = part.split("\n");
          let dataPayload = "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === "data: [DONE]") {
              encounteredDone = true;
              continue;
            }
            if (trimmed.startsWith("data: ")) {
              dataPayload += (dataPayload ? "\n" : "") + trimmed.slice(6);
            }
          }

          if (dataPayload) {
            const parsed = parseChunkPayload(dataPayload);
            if (parsed.type === "done") {
              encounteredDone = true;
            } else if (parsed.type === "payload") {
              if (parsed.delta) {
                aiContent = parsed.delta;
                hasReceivedChunk = true;
              }
              if (parsed.products.length > 0) {
                aiProducts = parsed.products;
              }
              if (parsed.debug_info) {
                aiDebugInfo = parsed.debug_info;
              }
            }
          }
        }

        return { remaining, encounteredDone };
      };

      const updateAssistantMessage = () => {
        let displayContent = aiContent;
        if (meta.unavailableBrand && !aiContent.includes(meta.unavailableBrand)) {
          displayContent = `${meta.unavailableBrand} is currently unavailable. I’ve found some great alternatives for you. ${aiContent}`;
        }

        // Client-side filtering as a safety layer
        const filteredProducts = aiProducts.filter(p => {
          if (!p.brand) return true;
          return !exclusions.some(excl => 
            p.brand.toLowerCase().includes(excl.toLowerCase()) || 
            excl.toLowerCase().includes(p.brand.toLowerCase())
          );
        });

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  content: displayContent,
                  products: filteredProducts,
                  debug_info: aiDebugInfo,
                  isUnavailable: !!meta.unavailableBrand,
                }
              : msg
          )
        );
      };

      const finalize = (content, products, error = false) => {
        if (isFinalized) return;
        isFinalized = true;

        let finalContent = content;
        if (meta.unavailableBrand && content && !content.includes(meta.unavailableBrand)) {
          finalContent = `${meta.unavailableBrand} is currently unavailable. I’ve found some great alternatives for you. ${content}`;
        }

        // Client-side filtering as a safety layer
        const filteredProducts = products.filter(p => {
          if (!p.brand) return true;
          return !exclusions.some(excl => 
            p.brand.toLowerCase().includes(excl.toLowerCase()) || 
            excl.toLowerCase().includes(p.brand.toLowerCase())
          );
        });

        // Finalize state
        finalizeAssistantMessage(aiMessageId, error ? undefined : finalContent, filteredProducts, error, aiDebugInfo, !!meta.unavailableBrand);
      };

      const handleStreamTimeout = () => {
        if (reader) reader.cancel().catch(() => {});
        abortControllerRef.current?.abort();
        finalize(aiContent || undefined, aiProducts, true);
        cleanup(streamId, "timeout");
      };

      const resetInactivityTimeout = () => {
        clearTimeoutRef();
        timeoutRef.current = setTimeout(handleStreamTimeout, STREAM_TIMEOUT_MS);
      };

      resetInactivityTimeout();

      try {
        const isFollowUp = meta.intent === "follow_up" && !!activeProduct;
        const payload = {
          messages: [
            ...messagesRef.current
              .filter(m => !m.isError && !m.isStreaming && m.content)
              .map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: meta.normalized }
          ],
          max_price: meta.maxPrice,
          brand_hint: meta.brand || null,
          category_hint: meta.category || null,
          price_sort: meta.priceSort || null,
          follow_up: isFollowUp,
          active_product: isFollowUp ? {
            id: activeProduct.id,
            name: activeProduct.name,
            category: activeProduct.category
          } : null,
          recommendation_mode: meta.recommendationMode || false,
          stream: true,
          exclude_brands: exclusions,
        };

        if (meta.suggestion_type) {
          payload.suggestion_type = meta.suggestion_type;
        }

        // Fetch AI response
        const response = await fetch(`${API_URL}/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            sanitizeErrorMessage(
              errorData.detail || errorData.message,
              "Failed to connect to AI assistant"
            )
          );
        }

        if (!response.body) {
          throw new Error("No response body from AI assistant");
        }

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // Reset timeout now that the connection has resolved
        resetInactivityTimeout();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            const result = processBuffer(buffer);
            buffer = result.remaining;
            updateAssistantMessage();
            finalize(hasReceivedChunk ? aiContent : undefined, aiProducts, !hasReceivedChunk);
            cleanup(streamId, "stream-complete");
            return;
          }

          resetInactivityTimeout();
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const result = processBuffer(buffer);
          buffer = result.remaining;
          updateAssistantMessage();

          if (result.encounteredDone) {
            finalize(aiContent, aiProducts, false);
            cleanup(streamId, "stream-complete");
            return;
          }
        }
      } catch (error) {
        if (error?.name === "AbortError") {
          finalize(aiContent, aiProducts, false);
          cleanup(streamId, "abort");
          return;
        }

        console.error("AI Chat Error:", error);

        let friendlyMessage = "I’m having trouble connecting right now. Please try again in a moment — I’ll keep the shopping flow smooth.";
        const errorStr = sanitizeErrorMessage(error?.message || error, "").toLowerCase();

        if (errorStr.includes("rate limit") || errorStr.includes("429")) {
          friendlyMessage = "I’m a little busy right now. Please wait a few seconds before asking again.";
        } else if (errorStr.includes("timeout") || errorStr.includes("deadline")) {
          friendlyMessage = "The request took too long. My connection might be slow, so please try again in a moment.";
        }

        toast({
          title: "Assistant unavailable",
          description: friendlyMessage,
          variant: "destructive",
        });

        finalize(undefined, aiProducts, true);
        cleanup(streamId, "error");
      } finally {
        clearTimeoutRef();

        if (reader) {
          try {
            reader.releaseLock();
          } catch (error) {
            console.warn("AI Chat: Failed to release reader lock", error);
          }
        }
      }
    },
    [clearTimeoutRef, cleanup, finalizeAssistantMessage, toast, token, activeProduct, exclusions, rawUserId]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setExclusions([]);
    setActiveProduct(null);
  }, []);

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

    if (lastUserMessage) {
      const index = messages.indexOf(lastUserMessage);
      setMessages(messages.slice(0, index));
      sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  const contextualSuggestions = getDynamicSuggestions(lastQueryMeta.normalized, lastQueryMeta.intent);

  return {
    messages,
    sendMessage,
    isLoading,
    clearChat,
    retryLastMessage,
    lastQueryMeta,
    contextualSuggestions,
  };
};

export default useAIChat;

