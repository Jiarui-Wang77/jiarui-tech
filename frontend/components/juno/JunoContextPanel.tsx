"use client";

/**
 * JunoContextPanel — A contextual Juno AI side panel.
 *
 * Used in three places:
 *  - News article pages  (mode="ask",      theme="light")
 *  - Community new post  (mode="optimize",  theme="light",  onApply callback)
 *  - Tracker repo detail (mode="analyze",   theme="dark")
 *
 * The panel slides in from the right. The parent controls open/close state
 * so the trigger button can be positioned freely (fixed, inline, etc.).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { streamJunoChat } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import MarkdownContent from "./MarkdownContent";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PanelMode = "ask" | "optimize" | "analyze";
export type PanelTheme = "light" | "dark";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  isAutoLabel?: boolean; // special label for auto-sent optimize request
}

export interface JunoContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mode: PanelMode;
  /**
   * Prepended as [Context] block to the first *manual* user message.
   * For optimize mode leave this empty and use autoPrompt directly.
   */
  contextText: string;
  locale: string;
  theme?: PanelTheme;
  /** Callback when user clicks "Apply" (optimize mode only). */
  onApply?: (text: string) => void;
  /**
   * If provided, this message is sent automatically when the panel opens.
   * No user bubble is added; the panel shows "✨ 正在处理…" then streams
   * the AI response directly.
   */
  autoPrompt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick prompt chips per mode
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_PROMPTS: Record<PanelMode, { zh: string[]; en: string[] }> = {
  ask: {
    zh: ["这篇文章主要讲了什么？", "解释其中的核心概念", "这对 AI 行业有什么影响？"],
    en: ["Summarize this article", "Explain the key concepts", "What does this mean for AI?"],
  },
  analyze: {
    zh: ["这个项目是做什么的？", "为什么最近在涨星？", "适合哪些人使用？", "有哪些竞品？"],
    en: ["What does this project do?", "Why is it trending?", "Who should use this?", "What are alternatives?"],
  },
  optimize: {
    zh: ["优化整体表达", "让标题更吸引人", "让内容更简洁", "用更专业的语气重写"],
    en: ["Improve the overall writing", "Make the title catchier", "Make it more concise", "Rewrite more professionally"],
  },
};

const PANEL_TITLES: Record<PanelMode, { zh: string; en: string }> = {
  ask: { zh: "问问 Juno", en: "Ask Juno" },
  analyze: { zh: "Juno 解读", en: "Juno Analysis" },
  optimize: { zh: "AI 写作助手", en: "AI Writing Helper" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function JunoContextPanel({
  isOpen,
  onClose,
  mode,
  contextText,
  locale,
  theme = "light",
  onApply,
  autoPrompt,
}: JunoContextPanelProps) {
  const isZh = locale === "zh";
  const { user } = useAuthStore();
  const isDark = theme === "dark";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const [applied, setApplied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledRef = useRef(false);

  // Last assistant text (for Apply button)
  const lastAIText =
    [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";

  // Track whether the user has scrolled up away from the bottom
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      userScrolledRef.current = scrollHeight - scrollTop - clientHeight > 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll only when user hasn't manually scrolled up
  useEffect(() => {
    if (!userScrolledRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // When streaming finishes, scroll to bottom and reset scroll lock
  useEffect(() => {
    if (!streaming) {
      userScrolledRef.current = false;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streaming]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        abortRef.current?.abort();
        setMessages([]);
        setConvId(null);
        setStreaming(false);
        setInput("");
        setApplied(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Core send function ──────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string, opts?: { isAuto?: boolean; currentConvId?: number | null }) => {
      if (!text.trim() || streaming) return;

      const { isAuto = false, currentConvId = convId } = opts ?? {};

      // For normal user messages, add user bubble
      if (!isAuto) {
        const userMsg: Message = { role: "user", content: text };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
      }

      setStreaming(true);

      // Prepend context only on the first non-auto message
      const isFirstMessage = messages.length === 0 && !isAuto;
      const fullContent =
        isFirstMessage && contextText
          ? `[背景信息]\n${contextText}\n\n[用户问题]\n${text}`
          : text;

      // Placeholder streaming message
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", streaming: true },
      ]);

      abortRef.current = new AbortController();

      let resolvedConvId = currentConvId;

      try {
        await streamJunoChat(
          {
            conversation_id: resolvedConvId ?? undefined,
            persona: "general",
            content: fullContent,
          },
          {
            onMeta: (data) => {
              resolvedConvId = data.conversation_id;
              setConvId(data.conversation_id);
            },
            onDelta: (chunk) => {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = {
                    ...last,
                    content: last.content + chunk,
                    streaming: true,
                  };
                }
                return copy;
              });
            },
            onDone: () => {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = { ...last, streaming: false };
                }
                return copy;
              });
              setStreaming(false);
            },
            onError: (msg) => {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = {
                    ...last,
                    content: `⚠️ ${msg}`,
                    streaming: false,
                  };
                }
                return copy;
              });
              setStreaming(false);
            },
          },
          abortRef.current.signal
        );
      } catch {
        setStreaming(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streaming, messages, contextText, convId]
  );

  // Auto-send when panel opens with autoPrompt
  useEffect(() => {
    if (isOpen && autoPrompt && messages.length === 0 && user) {
      const t = setTimeout(() => {
        sendMessage(autoPrompt, { isAuto: true });
      }, 150);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && user && !autoPrompt) {
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [isOpen, user, autoPrompt]);

  const handleApply = () => {
    if (lastAIText && onApply) {
      onApply(lastAIText);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const tokens = {
    panel: isDark
      ? "bg-slate-900 border-slate-700 shadow-2xl"
      : "bg-white border-neutral-200 shadow-2xl",
    header: isDark ? "bg-slate-800/80 border-slate-700" : "bg-neutral-50 border-neutral-200",
    divider: isDark ? "border-slate-700" : "border-neutral-200",
    titleText: isDark ? "text-white" : "text-neutral-900",
    subText: isDark ? "text-slate-400" : "text-neutral-500",
    closeBtn: isDark
      ? "text-slate-400 hover:bg-slate-700 hover:text-white"
      : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900",
    chip: isDark
      ? "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-cyan-500/50 hover:text-cyan-300"
      : "bg-neutral-100 border-neutral-200 text-neutral-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700",
    userBubble: isDark
      ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-100"
      : "bg-neutral-900 text-white",
    aiBubble: isDark
      ? "bg-slate-800/70 border border-slate-700"
      : "bg-neutral-50 border border-neutral-200",
    input: isDark
      ? "bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-cyan-500/30"
      : "bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:ring-neutral-300",
    sendBtn: isDark
      ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900"
      : "bg-neutral-900 hover:bg-neutral-700 text-white",
    applyBtn: isDark
      ? "bg-cyan-500 text-slate-900 hover:bg-cyan-400"
      : "bg-neutral-900 text-white hover:bg-neutral-700",
    applyDone: "bg-green-500 text-white",
    sparkle: isDark ? "text-cyan-400" : "text-violet-500",
    iconBg: isDark ? "bg-slate-700" : "bg-neutral-900",
    authBox: isDark
      ? "bg-slate-800/60 border-slate-700"
      : "bg-neutral-50 border-neutral-200",
    authBtn: isDark
      ? "bg-cyan-500 text-slate-900 hover:bg-cyan-400"
      : "bg-neutral-900 text-white hover:bg-neutral-700",
    cursor: isDark ? "bg-cyan-400" : "bg-neutral-900",
    sectionLabel: isDark
      ? "text-slate-500 tracking-widest"
      : "text-neutral-400 tracking-widest",
    inputFooter: isDark ? "text-slate-600" : "text-neutral-400",
  };

  const titleObj = PANEL_TITLES[mode];
  const panelTitle = isZh ? titleObj.zh : titleObj.en;
  const quickPrompts = QUICK_PROMPTS[mode][isZh ? "zh" : "en"];
  const showQuickPrompts =
    user && messages.length === 0 && !autoPrompt && !streaming;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — mobile only */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 md:bg-transparent"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={`fixed top-0 right-0 bottom-0 z-50 w-full md:w-[380px] flex flex-col border-l ${tokens.panel}`}
          >
            {/* ── Header ───────────────────────────────────── */}
            <div
              className={`flex items-center justify-between px-4 py-3.5 border-b flex-shrink-0 ${tokens.header} ${tokens.divider}`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${tokens.iconBg}`}
                >
                  <Sparkles size={14} className={tokens.sparkle} />
                </div>
                <div>
                  <p className={`text-[13px] font-black ${tokens.titleText}`}>
                    {panelTitle}
                  </p>
                  <p className={`text-[10px] ${tokens.subText}`}>
                    Juno AI · JIARUI TECH
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${tokens.closeBtn}`}
                aria-label="close"
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Scrollable content area ───────────────────── */}
            <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

              {/* Auth gate */}
              {!user && (
                <div
                  className={`rounded-2xl border p-6 text-center ${tokens.authBox}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${tokens.iconBg}`}
                  >
                    <Sparkles size={20} className={tokens.sparkle} />
                  </div>
                  <p className={`text-sm font-black mb-1 ${tokens.titleText}`}>
                    {isZh ? "登录后使用 Juno AI" : "Sign in to use Juno AI"}
                  </p>
                  <p className={`text-xs mb-4 leading-relaxed ${tokens.subText}`}>
                    {isZh
                      ? "免费注册，每天 50 次 AI 对话额度"
                      : "Free to join — 50 AI chats per day"}
                  </p>
                  <Link
                    href={`/${locale}/auth/login`}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors ${tokens.authBtn}`}
                  >
                    {isZh ? "去登录" : "Sign In"}
                    <ArrowUpRight size={11} />
                  </Link>
                </div>
              )}

              {/* Auto-prompt loading indicator */}
              {user && autoPrompt && messages.length === 0 && (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 size={14} className={`animate-spin ${tokens.subText}`} />
                  <span className={`text-[12px] ${tokens.subText}`}>
                    {isZh ? "Juno 正在处理…" : "Juno is working…"}
                  </span>
                </div>
              )}

              {/* Quick prompt chips */}
              {showQuickPrompts && (
                <div>
                  <p
                    className={`text-[10px] font-black uppercase mb-3 ${tokens.sectionLabel}`}
                  >
                    {isZh ? "快捷提问" : "Quick Prompts"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {quickPrompts.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className={`text-[12px] px-3 py-1.5 rounded-full border transition-all font-medium ${tokens.chip}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message list */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "user" ? (
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${tokens.userBubble}`}
                    >
                      {msg.content}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[95%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${tokens.aiBubble}`}
                    >
                      {msg.content ? (
                        <MarkdownContent text={msg.content} dark={isDark} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader2
                            size={13}
                            className={`animate-spin ${tokens.subText}`}
                          />
                          <span className={`text-[12px] ${tokens.subText}`}>
                            {isZh ? "正在思考…" : "Thinking…"}
                          </span>
                        </div>
                      )}
                      {msg.streaming && msg.content && (
                        <span
                          className={`inline-block w-0.5 h-3.5 animate-pulse ml-0.5 align-middle opacity-70 rounded-full ${tokens.cursor}`}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Apply button — optimize mode only */}
              {mode === "optimize" &&
                onApply &&
                lastAIText &&
                !streaming && (
                  <div className="flex justify-center pt-1 pb-2">
                    <button
                      onClick={handleApply}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${
                        applied ? tokens.applyDone : tokens.applyBtn
                      }`}
                    >
                      {applied ? (
                        <>
                          <Check size={14} />
                          {isZh ? "已应用到正文！" : "Applied to editor!"}
                        </>
                      ) : (
                        <>{isZh ? "✓ 应用到正文" : "✓ Apply to editor"}</>
                      )}
                    </button>
                  </div>
                )}

              <div ref={bottomRef} />
            </div>

            {/* ── Input bar ────────────────────────────────── */}
            {user && (
              <div
                className={`flex-shrink-0 px-3 pt-2 pb-3 border-t ${tokens.divider}`}
              >
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isZh
                        ? mode === "optimize"
                          ? "追加修改要求…"
                          : "输入问题…"
                        : mode === "optimize"
                        ? "Add more instructions…"
                        : "Ask anything…"
                    }
                    rows={1}
                    disabled={streaming}
                    className={`flex-1 px-3 py-2.5 text-[13px] border rounded-xl outline-none resize-none transition-all focus:ring-2 ${tokens.input}`}
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || streaming}
                    className={`p-2.5 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0 ${tokens.sendBtn}`}
                    aria-label="send"
                  >
                    {streaming ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                  </button>
                </div>
                <p className={`text-[10px] mt-1.5 text-center ${tokens.inputFooter}`}>
                  {isZh
                    ? "Enter 发送 · Shift+Enter 换行"
                    : "Enter to send · Shift+Enter for newline"}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
