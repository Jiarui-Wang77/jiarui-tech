"use client";

import { useState } from "react";
import {
  Wand2,
  Link2,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ArticleEditor from "@/components/admin/ArticleEditor";
import { adminApi, type ProcessedArticle } from "@/lib/api";

// ─── URL slot state ────────────────────────────────────────────────────────────

type SlotStatus = "idle" | "loading" | "done" | "error";

type Slot = {
  url: string;
  status: SlotStatus;
  result?: ProcessedArticle;
  error?: string;
};

const EMPTY_SLOTS: Slot[] = [
  { url: "", status: "idle" },
  { url: "", status: "idle" },
  { url: "", status: "idle" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewArticlePage() {
  const [open, setOpen] = useState(true);
  const [slots, setSlots] = useState<Slot[]>(EMPTY_SLOTS);
  const [prefillData, setPrefillData] = useState<ProcessedArticle | null>(null);

  const updateSlot = (i: number, patch: Partial<Slot>) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const handleProcess = async (i: number) => {
    const url = slots[i].url.trim();
    if (!url) return;
    updateSlot(i, { status: "loading", error: undefined, result: undefined });
    try {
      const res = await adminApi.processUrl(url);
      updateSlot(i, { status: "done", result: res.data });
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: { detail?: string | object }; status?: number };
        message?: string;
      };
      const rawDetail = errObj?.response?.data?.detail;
      const detail =
        typeof rawDetail === "string"
          ? rawDetail
          : typeof rawDetail === "object"
          ? JSON.stringify(rawDetail)
          : errObj?.message || null;
      updateSlot(i, {
        status: "error",
        error: detail || "处理失败，请检查 URL 是否有效或网站是否支持抓取",
      });
    }
  };

  const handleFill = (result: ProcessedArticle) => {
    setPrefillData(result);
    setTimeout(() => {
      document.getElementById("article-editor-anchor")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  return (
    <div>
      {/* ── URL Auto-Process Panel ─────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-8 pt-8">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-0">
          {/* Header / toggle */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
                <Wand2 size={15} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900 text-sm">智能 URL 加工</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  粘贴新闻链接 → AI 自动抓取 · 改写 · 生成深度解读 → 填入编辑器
                </p>
              </div>
            </div>
            {open ? (
              <ChevronUp size={17} className="text-gray-400 shrink-0" />
            ) : (
              <ChevronDown size={17} className="text-gray-400 shrink-0" />
            )}
          </button>

          {/* Slots */}
          {open && (
            <div className="border-t border-gray-100 px-6 pt-5 pb-6 space-y-4">
              <p className="text-xs text-gray-400">
                支持 36kr、虎嗅、量子位、TechCrunch、The Verge 等标准新闻站。每条链接独立处理，完成后点击「填入编辑器」。
              </p>

              {slots.map((slot, i) => (
                <div key={i} className="space-y-2">
                  {/* Input row */}
                  <div className="flex gap-3 items-center">
                    <span className="text-xs font-black text-gray-300 w-5 shrink-0 text-center">
                      {i + 1}
                    </span>
                    <div className="flex-1 relative">
                      <Link2
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <input
                        type="url"
                        value={slot.url}
                        onChange={(e) => updateSlot(i, { url: e.target.value })}
                        disabled={slot.status === "loading"}
                        placeholder={`粘贴新闻 URL — 如 https://36kr.com/p/xxxxxx`}
                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-60 placeholder:text-gray-300"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleProcess(i);
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleProcess(i)}
                      disabled={!slot.url.trim() || slot.status === "loading"}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shrink-0 min-w-[88px] justify-center"
                    >
                      {slot.status === "loading" ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          处理中
                        </>
                      ) : (
                        "处理"
                      )}
                    </button>
                  </div>

                  {/* Loading hint */}
                  {slot.status === "loading" && (
                    <div className="ml-8 flex items-center gap-2 text-xs text-blue-500">
                      <Loader2 size={11} className="animate-spin" />
                      AI 正在抓取正文并改写，预计 30–90 秒，请稍候……
                    </div>
                  )}

                  {/* Success card */}
                  {slot.status === "done" && slot.result && (
                    <div className="ml-8 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <CheckCircle2
                          size={16}
                          className="text-green-500 shrink-0 mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {slot.result.title_zh}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {slot.result.title_en}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFill(slot.result!)}
                        className="shrink-0 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                      >
                        填入编辑器 ↓
                      </button>
                    </div>
                  )}

                  {/* Error card */}
                  {slot.status === "error" && (
                    <div className="ml-8 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600 leading-relaxed">{slot.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Article Editor ─────────────────────────────────────────────── */}
      <div id="article-editor-anchor">
        <ArticleEditor mode="create" prefillData={prefillData} />
      </div>
    </div>
  );
}
