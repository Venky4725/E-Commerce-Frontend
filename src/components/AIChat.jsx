import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  X,
  Loader2,
  Trash2,
  RefreshCw,
  Terminal,
  ArrowRight,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";
import useAIChat from "../hooks/useAIChat";
import { cn, getCategoryPlaceholder } from "../lib/utils";
import { buildAssetUrl } from "../api/endpoints";

const AI_FALLBACK_MESSAGE = "How can I help you discover the best ShopKart picks today?";

/**
 * AI Chat Component - Floating Assistant with Neo-Brutalist and Live Debug Overlay
 */
const AIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  
  const { 
    messages, 
    sendMessage, 
    isLoading, 
    clearChat, 
    retryLastMessage,
    contextualSuggestions
  } = useAIChat();
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue);
    setInputValue("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Extract the latest debug metrics from the chat log
  const lastDebugMsg = [...messages].reverse().find(msg => msg.debug_info);

  const getAssistantMessage = (msg) => {
    if (msg.isError) {
      return "I’m having trouble connecting right now. Please try again in a moment — I’ll keep the shopping flow smooth.";
    }

    const content = (msg.content || "").trim();
    const lower = content.toLowerCase();

    if (lower.includes("no matching products found") || lower.includes("no products found")) {
      return "I couldn’t find that exact item, but these related picks are worth exploring.";
    }

    if (msg.products?.length > 0) {
      return content || "I found a few strong matches in our catalog.";
    }

    return content || AI_FALLBACK_MESSAGE;
  };

  const renderDebugPanel = () => {
    if (!lastDebugMsg || !lastDebugMsg.debug_info) {
      return (
        <div className="p-3 text-[10px] text-black/60 bg-white font-bold border-b-4 border-black italic text-center select-none">
          No active search queries evaluated yet. Ask for a product to stream retrieval metrics.
        </div>
      );
    }

    const { 
      raw_query, 
      normalized_query, 
      detected_intent, 
      ranking_logic, 
      embedding_source_text, 
      products 
    } = lastDebugMsg.debug_info;

    return (
      <div className="border-b-4 border-black bg-white p-3 font-bold text-xs text-black max-h-[240px] overflow-y-auto space-y-2 select-text no-scrollbar divide-y-2 divide-black/10">
        
        {/* Row 1: Queries */}
        <div className="grid grid-cols-2 gap-2 text-[10px] pb-1">
          <div className="border-2 border-black bg-neo-bg p-1.5 shadow-[2px_2px_0px_0px_#000] rounded-none">
            <p className="text-[7.5px] uppercase text-black/50 tracking-wider font-black">Raw Query</p>
            <p className="truncate mt-0.5 text-black font-extrabold">{raw_query || "—"}</p>
          </div>
          <div className="border-2 border-black bg-neo-bg p-1.5 shadow-[2px_2px_0px_0px_#000] rounded-none">
            <p className="text-[7.5px] uppercase text-black/50 tracking-wider font-black">Normalized query</p>
            <p className="truncate mt-0.5 text-black font-extrabold">{normalized_query || "—"}</p>
          </div>
        </div>

        {/* Row 2: Intent & Ranking */}
        <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 pb-1">
          <div className="border-2 border-black bg-white p-1.5 shadow-[2px_2px_0px_0px_#000] rounded-none">
            <p className="text-[7.5px] uppercase text-black/50 tracking-wider font-black">Detected Intent</p>
            <p className={cn("mt-0.5 uppercase font-black", detected_intent ? "text-neo-accent" : "text-black")}>
              {detected_intent || "semantic_only"}
            </p>
          </div>
          <div className="border-2 border-black bg-white p-1.5 shadow-[2px_2px_0px_0px_#000] rounded-none">
            <p className="text-[7.5px] uppercase text-black/50 tracking-wider font-black">Ranking Logic</p>
            <p className="truncate mt-0.5 text-black font-extrabold">{ranking_logic || "—"}</p>
          </div>
        </div>

        {/* Monospace Embedding Source Text Block */}
        {embedding_source_text && (
          <div className="border-2 border-black p-2 bg-black text-emerald-400 font-mono text-[9px] shadow-[2px_2px_0px_0px_#000] leading-tight pt-2">
            <p className="text-[7px] text-white/50 uppercase tracking-widest font-black mb-1">Embedding Index representation (Top Match)</p>
            <div className="max-h-14 overflow-y-auto whitespace-pre-wrap select-all font-mono no-scrollbar border border-emerald-950 p-1.5 bg-zinc-950">
              {embedding_source_text}
            </div>
          </div>
        )}

        {/* Candidate matches table */}
        {products && products.length > 0 && (
          <div className="border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] overflow-hidden text-[9px] rounded-none pt-2">
            <div className="bg-neo-secondary border-b-2 border-black px-2 py-1 text-[8px] uppercase tracking-wider font-black">
              Vector candidates & matched keywords
            </div>
            <div className="divide-y border-t border-black divide-black max-h-[100px] overflow-y-auto no-scrollbar">
              {products.map((p, idx) => (
                <div key={p.product_id || idx} className="p-1.5 flex items-center justify-between gap-1.5 hover:bg-neo-bg">
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-black uppercase text-[8.5px]">{idx + 1}. {p.name}</p>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {p.matched_fields?.map((f) => (
                        <span key={f} className="text-[7px] px-1 border border-black bg-neo-bg text-black font-extrabold uppercase shrink-0">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono bg-neo-muted text-black px-1 border border-black text-[8px] font-bold">
                      dist: {p.semantic_distance}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-blue-200 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white shadow-[0_18px_36px_-12px_rgba(59,130,246,0.55)] transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_24px_42px_-12px_rgba(59,130,246,0.7)] focus:outline-none focus:ring-4 focus:ring-blue-300/60"
          aria-label="Open AI Assistant"
        >
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_35%)]" />
          <ShoppingBag size={24} className="relative animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/40 bg-emerald-400 text-[9px] font-black text-slate-900 shadow-sm uppercase">AI</span>
          <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-blue-200/30 animate-ping opacity-50" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[640px] w-[420px] flex-col overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/95 text-slate-100 shadow-[0_28px_60px_-18px_rgba(15,23,42,0.75)] backdrop-blur-xl max-h-[calc(100vh-24px)] max-w-[calc(100vw-24px)] transition-all duration-300 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-950 to-blue-950/80 p-4 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-slate-900 shadow-[0_12px_24px_-10px_rgba(59,130,246,0.7)]">
            <Bot size={20} className="text-white" />
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border border-slate-950 bg-emerald-400 shadow-[0_0_0_3px_rgba(15,23,42,0.7)]" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-blue-200/90">Smart shopping assistant</p>
            <h3 className="text-sm font-semibold text-white">ShopKart AI Assistant</h3>
            <p className="text-[11px] text-slate-300">Live catalog + recommendations</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsDebugOpen(!isDebugOpen)}
            className={cn(
              "rounded-xl border border-slate-700 bg-slate-900/90 p-2 text-slate-100 transition-all duration-200 hover:border-blue-400 hover:bg-slate-800",
              isDebugOpen && "border-blue-400 bg-blue-500/10 text-blue-100"
            )}
            title="Toggle Developer Debug Console"
          >
            <Terminal size={14} strokeWidth={3} />
          </button>
          <button
            onClick={clearChat}
            className="rounded-xl border border-slate-700 bg-slate-900/90 p-2 text-slate-100 transition-all duration-200 hover:border-rose-400 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            title="Clear conversation"
            disabled={messages.length === 0}
          >
            <Trash2 size={14} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-xl border border-slate-700 bg-slate-900/90 p-2 text-slate-100 transition-all duration-200 hover:border-blue-400 hover:bg-slate-800"
            title="Close Assistant"
          >
            <X size={14} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Collapsible Debug Overlay Drawer */}
      {isDebugOpen && renderDebugPanel()}

      {/* Messages Area with Graph-Paper Grid Background */}
      <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)] p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-5 text-center p-6 animate-[fadeIn_220ms_ease-out]">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-slate-900 shadow-[0_18px_28px_-12px_rgba(59,130,246,0.75)]">
              <Sparkles size={28} className="text-white" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-white">ShopKart AI shopping assistant</p>
              <p className="text-sm text-slate-300 max-w-[280px] leading-relaxed">Ask for products, compare options, and explore curated recommendations in a premium shopping flow.</p>
            </div>
            <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-inner shadow-slate-950/40">
              <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-blue-200/90 text-left">Popular shopping starts</p>
              <div className="grid grid-cols-2 gap-2 w-full">
                {contextualSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-2xl border border-slate-700 bg-slate-800/90 p-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-slate-700/90"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col",
                  msg.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "relative max-w-[88%] rounded-3xl border p-4 text-sm shadow-[0_14px_26px_-14px_rgba(15,23,42,0.85)] select-text transition-all duration-200",
                    msg.role === "user"
                      ? "border-blue-500/60 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white shadow-[0_18px_30px_-14px_rgba(59,130,246,0.55)]"
                      : msg.isError
                      ? "border-rose-500/50 bg-rose-500/10 text-rose-100"
                      : "border-slate-800 bg-slate-900/95 text-slate-100"
                  )}
                >
                  {msg.content || !msg.isStreaming ? (
                    <div className="whitespace-pre-wrap break-words leading-relaxed text-[13px] font-medium text-slate-100">
                      {getAssistantMessage(msg)}
                      {msg.isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse align-middle" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-1 font-bold text-xs">
                      <Loader2 size={13} className="animate-spin text-blue-200" />
                      <span className="uppercase tracking-[0.18em] text-slate-100">Searching the ShopKart catalog...</span>
                    </div>
                  )}

                  {/* AI Recommended Products Cards inside Speech Bubbles */}
                  {msg.role === "assistant" && msg.products && msg.products.length > 0 && (
                    <div className="mt-3.5 flex flex-col gap-3 w-full animate-[fadeIn_220ms_ease-out]">
                      {msg.products.map((product) => {
                        const imageUrl = (product.image || product.image_url) 
                          ? buildAssetUrl(product.image || product.image_url) 
                          : null;
                          
                        const placeholderUrl = getCategoryPlaceholder(product.category, product.name);
                        
                        // Parse tags safely
                        let tags = [];
                        if (product.tags) {
                          if (Array.isArray(product.tags)) tags = product.tags;
                          else if (typeof product.tags === "string") tags = product.tags.split(",").map(t => t.trim()).filter(Boolean);
                        }

                        return (
                          <Link
                            key={product.id}
                            to={`/product/${product.id}`}
                            className="group flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/90 p-3 shadow-[0_14px_24px_-16px_rgba(15,23,42,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400/80 hover:bg-slate-900 hover:shadow-[0_18px_28px_-14px_rgba(59,130,246,0.45)]"
                          >
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-white p-1.5 shadow-inner shadow-slate-200/70">
                              <img 
                                src={imageUrl || placeholderUrl} 
                                alt={product.name}
                                className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = placeholderUrl;
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                              <div>
                                <h4 className="truncate text-[12px] font-semibold text-slate-100 transition-colors group-hover:text-blue-200">
                                  {product.name}
                                </h4>
                              </div>
                              
                              {/* Brand and category tag stickers inside cards */}
                              {(product.brand || tags.length > 0) && (
                                <div className="flex items-center flex-wrap gap-1 mt-0.5">
                                  {product.brand && (
                                    <span className="rounded-full border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100 shrink-0">
                                      {product.brand}
                                    </span>
                                  )}
                                  {tags.slice(0, 1).map(t => (
                                    <span key={t} className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100 shrink-0">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-1 pt-0.5 border-t border-black/10">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[11px] font-semibold text-white">
                                    ₹{Number(product.price).toLocaleString('en-IN')}
                                  </p>
                                  {product.category && (
                                    <span className="rounded-full border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200 truncate max-w-[70px]">
                                      {product.category}
                                    </span>
                                  )}
                                </div>
                                <ArrowRight size={10} className="text-blue-200 transition-all group-hover:translate-x-1" />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  
                  {msg.isError && (
                    <button 
                      onClick={retryLastMessage}
                      className="mt-2.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-700 hover:underline"
                    >
                      <RefreshCw size={11} strokeWidth={2.5} /> Retry search
                    </button>
                  )}
                </div>
                <span className="mt-1 px-1 text-[8.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            
            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 bg-slate-950/95 p-4 shrink-0">
        {!isLoading && messages.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-3.5 no-scrollbar">
            {contextualSuggestions.map((suggestion) => (
              <button
                key={suggestion.label}
                onClick={() => sendMessage(suggestion)}
                className="whitespace-nowrap rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-slate-800"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask for laptops, phones, furniture..."
            className="flex-1 h-12 rounded-2xl border border-slate-700 bg-slate-900/95 px-4 text-sm text-white placeholder:text-slate-400 shadow-inner shadow-slate-950/40 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-slate-900 text-white shadow-[0_14px_24px_-12px_rgba(59,130,246,0.65)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_28px_-12px_rgba(59,130,246,0.85)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin text-black" />
            ) : (
              <Send size={16} strokeWidth={3} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AIChat);
