"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  Plus,
  Trash2,
  Pencil,
  PanelLeftClose,
  PanelLeft,
  Square,
  Copy,
  Check,
  ChevronDown,
  Code2,
  GraduationCap,
  Briefcase,
  Sparkles,
  Coffee,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import MarkdownContent from "@/components/juno/MarkdownContent";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import {
  junoApi,
  streamJunoChat,
  type ConversationSummary,
  type JunoMessage,
  type PersonaInfo,
  type PersonaSlug,
  type JunoQuota,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

type UIMessage = JunoMessage & { streaming?: boolean; thinking?: boolean };

const PERSONA_ICONS: Record<PersonaSlug, typeof Sparkles> = {
  general: Sparkles,
  code: Code2,
  scholar: GraduationCap,
  office: Briefcase,
  life: Coffee,
};

const QUICK_PROMPTS: Record<PersonaSlug, { zh: string[]; en: string[] }> = {
  general: {
    zh: ["你能做什么", "帮我写一段自我介绍", "解释一下什么是 AGI", "推荐 3 部经典科幻片"],
    en: ["What can you do", "Write me an intro", "Explain AGI simply", "Recommend 3 sci-fi classics"],
  },
  code: {
    zh: ["写一个 React debounce Hook", "解释 Python 的 GIL", "对比 PostgreSQL 和 MySQL", "这段代码为什么会死锁"],
    en: ["Write a React debounce hook", "Explain Python's GIL", "Compare Postgres vs MySQL", "Why is this deadlocking"],
  },
  scholar: {
    zh: ["解读 Transformer 原始论文", "什么是 RLHF", "帮我写一段论文摘要", "定义涌现能力"],
    en: ["Explain the Transformer paper", "What is RLHF", "Write me an abstract", "Define emergent abilities"],
  },
  office: {
    zh: ["帮我写一封辞职邮件", "给领导的周报开头", "把这段话润色得更专业", "SWOT 分析模板"],
    en: ["Write a resignation email", "Weekly report opener", "Polish to be professional", "SWOT analysis template"],
  },
  life: {
    zh: ["上海 3 天周末怎么玩", "推荐适合独居的晚餐", "最近心情不好", "《原神》新手建议"],
    en: ["3-day Shanghai weekend", "Easy dinner for one", "I'm feeling down", "Genshin beginner tips"],
  },
};

export default function JunoPage() {
  const locale = useLocale();
  const isZh = locale === "zh";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [personas, setPersonas] = useState<PersonaInfo[]>([]);
  const [activePersona, setActivePersona] = useState<PersonaSlug>("general");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [quota, setQuota] = useState<JunoQuota | null>(null);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const personaMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user === null) {
      const t = setTimeout(() => {
        if (!useAuthStore.getState().user) router.replace(`/${locale}/auth/login`);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [user, router, locale]);

  useEffect(() => {
    if (!user) return;
    junoApi.listPersonas().then((r) => setPersonas(r.data)).catch(() => {});
    junoApi.listConversations().then((r) => setConversations(r.data)).catch(() => {});
    junoApi.getQuota().then((r) => setQuota(r.data)).catch(() => {});
  }, [user]);

  useEffect(() => {
    const convParam = searchParams.get("conv");
    if (convParam) {
      const cid = Number(convParam);
      if (!isNaN(cid)) loadConversation(cid);
    }
    const personaParam = searchParams.get("persona");
    if (personaParam && ["general", "code", "scholar", "office", "life"].includes(personaParam)) {
      setActivePersona(personaParam as PersonaSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (personaMenuRef.current && !personaMenuRef.current.contains(e.target as Node))
        setPersonaMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const loadConversation = useCallback(async (id: number) => {
    try {
      const res = await junoApi.getConversation(id);
      setActiveConvId(id);
      setActivePersona(res.data.persona as PersonaSlug);
      setMessages(res.data.messages);
    } catch { /* ignore */ }
  }, []);

  const startNewChat = () => {
    abortRef.current?.abort();
    setActiveConvId(null);
    setMessages([]);
  };

  const cancelStreaming = () => {
    abortRef.current?.abort();
    setSending(false);
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.streaming) {
        copy[copy.length - 1] = {
          ...last,
          content: last.content || (isZh ? "已停止" : "Stopped"),
          streaming: false,
          thinking: false,
        };
      }
      return copy;
    });
  };

  // Opens the confirmation modal — no deletion happens yet
  const deleteConv = (id: number, title: string) => {
    setDeleteTarget({ id, title });
  };

  // Called when user clicks "删除" inside the modal
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    await junoApi.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) startNewChat();
  };

  const startRename = (id: number, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const commitRename = async (id: number) => {
    const trimmed = editTitle.trim();
    setEditingId(null);
    if (!trimmed) return;
    const original = conversations.find((c) => c.id === id)?.title;
    if (trimmed === original) return;
    try {
      await junoApi.renameConversation(id, trimmed);
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c)));
    } catch { /* ignore */ }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px"; }
  };
  useEffect(autoResize, [input]);

  const send = async (overrideContent?: string) => {
    const content = (overrideContent ?? input).trim();
    if (!content || sending) return;
    if (quota && !quota.unlimited && quota.remaining <= 0) {
      alert(isZh ? "今日额度已用完" : "Daily limit reached");
      return;
    }

    setSending(true);
    if (!overrideContent) setInput("");

    const now = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      { id: -1, role: "user", content, created_at: now },
      { id: -2, role: "assistant", content: "", created_at: now, streaming: true, thinking: true },
    ]);

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    let fullResponse = "";

    await streamJunoChat(
      { conversation_id: activeConvId, persona: activePersona, content },
      {
        onMeta: (data) => {
          setActiveConvId(data.conversation_id);
          setConversations((prev) => [
            { id: data.conversation_id, title: data.title, persona: data.persona, created_at: now, updated_at: now },
            ...prev,
          ]);
        },
        onDelta: (delta) => {
          fullResponse += delta;
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.streaming) copy[copy.length - 1] = { ...last, content: fullResponse, thinking: false };
            return copy;
          });
        },
        onDone: (data) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.streaming) copy[copy.length - 1] = { ...last, streaming: false, thinking: false };
            return copy;
          });
          setConversations((prev) =>
            prev.map((c) => c.id === data.conversation_id ? { ...c, title: data.title, updated_at: new Date().toISOString() } : c)
          );
          junoApi.getQuota().then((r) => setQuota(r.data)).catch(() => {});
        },
        onError: (message) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.streaming) copy[copy.length - 1] = { ...last, content: message, streaming: false, thinking: false };
            return copy;
          });
        },
      },
      abortRef.current.signal
    );
    setSending(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const currentPersona = personas.find((p) => p.slug === activePersona);
  const showGreeting = messages.length === 0 && !sending;
  const CurrentIcon = PERSONA_ICONS[activePersona] || Sparkles;

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar />
        <div className="flex items-center justify-center pt-40 text-neutral-400 text-sm">
          {isZh ? "加载中…" : "Loading…"}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-50 overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden pt-[72px]">

        {/* ══════════════════════════════════════════════════════
            Sidebar — white, elevated above page bg
            ══════════════════════════════════════════════════════ */}
        <aside
          className={`${sidebarOpen ? "w-[260px]" : "w-0"
            } flex-shrink-0 overflow-hidden transition-all duration-200 flex flex-col bg-white border-r border-neutral-200`}
          style={{ boxShadow: "1px 0 0 rgba(0,0,0,0.04)" }}
        >
          {/* New chat */}
          <div className="p-3">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-neutral-700 hover:bg-neutral-100 transition-colors border border-neutral-200"
            >
              <Plus size={14} className="text-neutral-500" />
              <span className="font-semibold">{isZh ? "新对话" : "New chat"}</span>
            </button>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-neutral-400 text-xs">{isZh ? "还没有对话" : "No conversations yet"}</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <p className="px-2 pt-4 pb-1.5 text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  {isZh ? "历史对话" : "History"}
                </p>
                {conversations.map((c) => {
                  const isActive = activeConvId === c.id;
                  const isEditing = editingId === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`group relative rounded-xl transition-all duration-150 ${
                        isActive
                          ? "bg-neutral-900 shadow-sm"
                          : "hover:bg-neutral-100"
                      }`}
                    >
                      {isEditing ? (
                        /* ── 内联重命名输入框 ── */
                        <div className="px-3 py-2">
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => commitRename(c.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); commitRename(c.id); }
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="w-full text-[13px] bg-white rounded-lg px-2.5 py-1.5 outline-none border border-blue-400 shadow-sm text-neutral-900 ring-2 ring-blue-400/20"
                          />
                          <p className="text-[10px] text-neutral-400 mt-1 px-0.5">
                            {isZh ? "Enter 确认 · Esc 取消" : "Enter to save · Esc to cancel"}
                          </p>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => loadConversation(c.id)}
                            className="w-full text-left px-3 py-2.5 pr-[4.5rem]"
                          >
                            <p className={`text-[13px] leading-snug truncate ${
                              isActive ? "text-white font-semibold" : "text-neutral-700"
                            }`}>
                              {c.title}
                            </p>
                          </button>

                          {/* ── 操作按钮：hover 时出现 ── */}
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <button
                              onClick={(e) => { e.stopPropagation(); startRename(c.id, c.title); }}
                              title={isZh ? "重命名" : "Rename"}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isActive
                                  ? "text-white/60 hover:text-white hover:bg-white/10"
                                  : "text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200"
                              }`}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteConv(c.id, c.title); }}
                              title={isZh ? "删除" : "Delete"}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isActive
                                  ? "text-white/60 hover:text-red-400 hover:bg-red-500/15"
                                  : "text-neutral-400 hover:text-red-600 hover:bg-red-50"
                              }`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer: user + quota */}
          <div className="p-3 border-t border-neutral-200">
            <div className="px-2 py-2">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-full bg-neutral-900 flex items-center justify-center text-xs font-bold text-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-[13px] font-medium text-neutral-700 truncate">{user.username}</span>
              </div>
              {quota && (
                quota.unlimited ? (
                  <p className="text-[11px] text-neutral-400">{isZh ? "无限额度 · 管理员" : "Unlimited · Admin"}</p>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-neutral-400">{isZh ? "今日剩余" : "Today"}</span>
                      <span className="font-mono text-neutral-600">{quota.remaining}/{quota.limit}</span>
                    </div>
                    <div className="h-[3px] bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-800 rounded-full transition-all duration-300"
                        style={{ width: `${(quota.remaining / quota.limit) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════
            Main chat area — neutral-50 canvas
            ══════════════════════════════════════════════════════ */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-neutral-50">

          {/* Header — frosted white */}
          <header className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 flex-shrink-0 bg-white/80 backdrop-blur-xl">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
              aria-label="toggle sidebar"
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>

            {/* Persona selector */}
            <div className="relative" ref={personaMenuRef}>
              <button
                onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                disabled={activeConvId !== null}
                title={activeConvId !== null ? (isZh ? "切换人格需新建对话" : "Switch requires new chat") : undefined}
              >
                <CurrentIcon size={14} className="text-neutral-500" />
                <span className="text-sm font-semibold text-neutral-800">
                  Juno{" "}
                  <span className="text-neutral-400 font-normal">/</span>{" "}
                  {currentPersona
                    ? (isZh ? currentPersona.name_zh : currentPersona.name_en).replace(/^Juno[- ]?/, "") || "General"
                    : ""}
                </span>
                {activeConvId === null && (
                  <ChevronDown
                    size={13}
                    className={`text-neutral-400 transition-transform duration-150 ${personaMenuOpen ? "rotate-180" : ""}`}
                  />
                )}
              </button>

              {personaMenuOpen && activeConvId === null && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white border border-neutral-200 rounded-xl shadow-xl shadow-neutral-200/60 py-1.5 z-20">
                  {personas.map((p) => {
                    const PIcon = PERSONA_ICONS[p.slug as PersonaSlug] || Sparkles;
                    const active = activePersona === p.slug;
                    return (
                      <button
                        key={p.slug}
                        onClick={() => { setActivePersona(p.slug); setPersonaMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-neutral-50 transition-colors ${active ? "bg-neutral-50" : ""}`}
                      >
                        <PIcon size={15} className="text-neutral-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-800">{isZh ? p.name_zh : p.name_en}</p>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">{isZh ? p.greeting_zh : p.greeting_en}</p>
                        </div>
                        {active && <Check size={13} className="text-neutral-600 mt-1 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </header>

          {/* Messages scroll area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-8">
              {showGreeting && currentPersona ? (
                <EmptyState
                  persona={currentPersona}
                  isZh={isZh}
                  prompts={QUICK_PROMPTS[activePersona][isZh ? "zh" : "en"]}
                  onPickPrompt={(p) => send(p)}
                />
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => (
                    <MessageRow
                      key={`${msg.id}-${i}`}
                      message={msg}
                      personaName={currentPersona ? (isZh ? currentPersona.name_zh : currentPersona.name_en) : "Juno"}
                      username={user?.username || "you"}
                      isZh={isZh}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Input — white card with shadow */}
          <div className="flex-shrink-0 px-6 pb-6 pt-3 bg-neutral-50">
            <div className="max-w-3xl mx-auto">
              <div
                className={`relative bg-white rounded-2xl border transition-all duration-150 ${
                  sending
                    ? "border-neutral-300 shadow-lg shadow-neutral-200/50"
                    : "border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 focus-within:shadow-md focus-within:border-neutral-300"
                }`}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={isZh ? "给 Juno 发送消息…" : "Message Juno…"}
                  rows={1}
                  disabled={sending && !input}
                  className="w-full bg-transparent resize-none px-5 pt-4 pb-12 text-[15px] text-neutral-900 placeholder-neutral-400 outline-none disabled:opacity-50 leading-relaxed"
                  style={{ maxHeight: 200 }}
                />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400 px-2">
                    {isZh ? "Enter 发送 · Shift+Enter 换行" : "Enter to send · Shift+Enter for newline"}
                  </span>
                  {sending ? (
                    <button
                      onClick={cancelStreaming}
                      className="w-8 h-8 flex items-center justify-center bg-neutral-900 text-white rounded-full hover:bg-neutral-700 transition-colors"
                      aria-label="stop"
                    >
                      <Square size={12} fill="currentColor" />
                    </button>
                  ) : (
                    <button
                      onClick={() => send()}
                      disabled={!input.trim()}
                      className="w-8 h-8 flex items-center justify-center bg-neutral-900 text-white rounded-full hover:bg-neutral-700 transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
                      aria-label="send"
                    >
                      <ArrowUp size={15} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-neutral-400 text-center mt-3">
                {isZh ? "Juno 可能会出错 · 重要信息请自行核实" : "Juno can make mistakes · Verify important info"}
              </p>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes thinking-pulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.82); }
          40% { opacity: 1; transform: scale(1); }
        }
        .thinking-dot { animation: thinking-pulse 1.4s ease-in-out infinite; }
      `}</style>

      {/* ── Delete confirmation modal ───────────────────────── */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={deleteTarget?.title ?? ""}
        locale={locale}
        heading={isZh ? "删除聊天？" : "Delete chat?"}
        subtext={isZh
          ? "访问设置以删除此聊天期间保存的所有记忆。"
          : "Visit Settings to delete all memories saved during this chat."}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Empty state — clean, editorial, light
   ════════════════════════════════════════════════════════════════ */
function EmptyState({
  persona,
  isZh,
  prompts,
  onPickPrompt,
}: {
  persona: PersonaInfo;
  isZh: boolean;
  prompts: string[];
  onPickPrompt: (p: string) => void;
}) {
  const Icon = PERSONA_ICONS[persona.slug as PersonaSlug] || Sparkles;

  return (
    <div className="pt-14 pb-8">
      <div className="text-center mb-14">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-neutral-200 shadow-sm mb-5">
          <Icon size={22} className="text-neutral-700" />
        </div>
        <h1 className="text-[32px] font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
          {isZh ? persona.name_zh : persona.name_en}
        </h1>
        <p className="text-[15px] text-neutral-500 max-w-md mx-auto leading-relaxed">
          {isZh ? persona.greeting_zh : persona.greeting_en}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto">
        {prompts.map((p, i) => (
          <motion.button
            key={p}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.04, duration: 0.2 }}
            onClick={() => onPickPrompt(p)}
            className="group text-left px-4 py-3.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm transition-all duration-150"
          >
            <p className="text-[13px] text-neutral-600 group-hover:text-neutral-900 transition-colors leading-snug">
              {p}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Message row — light theme
   User: white card with subtle border (paper feel)
   AI: no bubble, clean text on neutral-50 canvas
   ════════════════════════════════════════════════════════════════ */
function MessageRow({
  message,
  personaName,
  username,
  isZh,
}: {
  message: UIMessage;
  personaName: string;
  username: string;
  isZh: boolean;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="flex justify-end mb-6"
      >
        <div className="max-w-[80%] bg-white border border-neutral-200 shadow-sm text-neutral-900 rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="group mb-10"
    >
      {/* AI label row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-neutral-900 flex items-center justify-center shadow-sm">
          <Sparkles size={11} className="text-white" />
        </div>
        <span className="text-[12px] font-semibold text-neutral-500 tracking-wide">
          {personaName}
        </span>
      </div>

      {/* Content */}
      <div className="pl-8 text-[15px] leading-[1.75] text-neutral-800">
        {message.thinking ? (
          <ThinkingDots isZh={isZh} />
        ) : message.content ? (
          <>
            <MarkdownContent text={message.content} />
            {message.streaming && (
              <span
                className="inline-block w-[7px] h-[1em] ml-0.5 align-middle bg-neutral-400 rounded-[2px] opacity-80"
                style={{ animation: "pulse 0.9s ease-in-out infinite" }}
              />
            )}
          </>
        ) : !message.streaming ? (
          <span className="text-neutral-400 text-[14px] italic">
            {isZh ? "Juno 暂无响应，请重试" : "No response from Juno, please retry"}
          </span>
        ) : null}
      </div>

      {/* Copy — appears on hover */}
      {!message.streaming && message.content && (
        <div className="pl-8 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={copy}
            className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            {copied ? (
              <><Check size={11} className="text-green-500" /> {isZh ? "已复制" : "Copied"}</>
            ) : (
              <><Copy size={11} /> {isZh ? "复制" : "Copy"}</>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}

function ThinkingDots({ isZh }: { isZh: boolean }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className="flex items-center gap-[5px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="thinking-dot w-[6px] h-[6px] rounded-full bg-neutral-400"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
      <span className="text-[13px] text-neutral-400">
        {isZh ? "Juno 思考中" : "Juno is thinking"}
      </span>
    </div>
  );
}
