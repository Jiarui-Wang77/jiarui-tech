"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Trophy, Zap, Crown, Sparkles, GitCompare } from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import ModelCard from "@/components/ai-models/ModelCard";
import RadarChart from "@/components/ai-models/RadarChart";
import {
  aiModelsApi,
  type AIModelListItem,
  type ModelStats,
} from "@/lib/api";

type SortKey = "overall" | "coding" | "academic" | "office" | "lifestyle" | "community" | "newest";

const SORT_TABS: { key: SortKey; zh: string; en: string }[] = [
  { key: "overall", zh: "综合", en: "Overall" },
  { key: "coding", zh: "编程", en: "Coding" },
  { key: "academic", zh: "学术", en: "Academic" },
  { key: "office", zh: "职场", en: "Office" },
  { key: "lifestyle", zh: "生活", en: "Lifestyle" },
  { key: "community", zh: "社区评分", en: "Community" },
  { key: "newest", zh: "最新", en: "Newest" },
];

const DOMAIN_AXES = ["Coding", "Academic", "Office", "Lifestyle"];
const COMPARE_COLORS = ["#06b6d4", "#f59e0b", "#a78bfa"];

export default function AIModelsLeaderboard() {
  const locale = useLocale();
  const isZh = locale === "zh";

  const [sort, setSort] = useState<SortKey>("overall");
  const [vendor, setVendor] = useState<string | null>(null);
  const [models, setModels] = useState<AIModelListItem[]>([]);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Compare slots
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aiModelsApi.list({
        sort,
        vendor: vendor || undefined,
      });
      setModels(res.data.items);
    } finally {
      setLoading(false);
    }
  }, [sort, vendor]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    aiModelsApi.stats().then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const toggleCompare = (slug: string) => {
    setCompareSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, slug];
    });
  };

  const compareSeries = useMemo(() => {
    return compareSlugs
      .map((slug, i) => {
        const m = models.find((x) => x.slug === slug);
        if (!m) return null;
        return {
          name: m.name,
          color: m.brand_color || COMPARE_COLORS[i % COMPARE_COLORS.length],
          values: [
            m.domain_scores.coding ?? 0,
            m.domain_scores.academic ?? 0,
            m.domain_scores.office ?? 0,
            m.domain_scores.lifestyle ?? 0,
          ],
        };
      })
      .filter(Boolean) as { name: string; color: string; values: number[] }[];
  }, [compareSlugs, models]);

  const vendors = stats?.by_vendor || [];

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Background */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,1) 1px,transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* ── Hero ───────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-cyan-400" size={22} />
                <span className="text-[11px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                  {isZh ? "AI 雷达榜" : "AI Radar"}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
                {isZh ? "AI 模型综合性能榜" : "AI Model Performance Leaderboard"}
              </h1>
              <p className="text-slate-400 text-sm max-w-2xl">
                {isZh
                  ? "四大领域横向评测 · 社区投票加权 · 实时综合分数"
                  : "4-domain benchmarks · Community-weighted · Live composite scoring"}
              </p>
              {stats && (
                <div className="flex flex-wrap gap-5 mt-4 text-xs text-slate-300">
                  <Stat label={isZh ? "模型数" : "Models"} value={stats.total_models} icon={<Trophy size={14} />} />
                  <Stat label={isZh ? "社区投票" : "Votes"} value={stats.total_votes} icon={<Zap size={14} />} />
                  <Stat label={isZh ? "厂商数" : "Vendors"} value={stats.by_vendor.length} icon={<Crown size={14} />} />
                </div>
              )}
            </div>
          </div>
        </motion.header>

        {/* ── Domain leaders strip ──────────────────────── */}
        {stats && Object.keys(stats.domain_leaders).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {(["coding", "academic", "office", "lifestyle"] as const).map((d) => {
              const leader = stats.domain_leaders[d];
              if (!leader) return null;
              const icon = { coding: "💻", academic: "🔬", office: "💼", lifestyle: "🎮" }[d];
              const label =
                isZh
                  ? { coding: "编程之王", academic: "学术之王", office: "职场之王", lifestyle: "生活之王" }[d]
                  : { coding: "Coding King", academic: "Academic King", office: "Office King", lifestyle: "Lifestyle King" }[d];
              return (
                <Link
                  key={d}
                  href={`/${locale}/ai-models/${leader.slug}`}
                  className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 hover:border-cyan-500/50 transition-all group"
                >
                  <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-1">
                    {icon} {label}
                  </div>
                  <div className="font-black text-white text-base truncate group-hover:text-cyan-400 transition-colors">
                    {leader.name}
                  </div>
                  <div className="text-xs font-mono text-cyan-400 mt-1">{leader.score.toFixed(1)}</div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Comparison panel ───────────────────────────── */}
        {compareSeries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-8 bg-slate-900/60 border border-cyan-500/30 rounded-2xl p-5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black tracking-[0.2em] text-cyan-400 uppercase flex items-center gap-2">
                <GitCompare size={16} />
                {isZh ? "对比模式" : "Compare"}
                <span className="text-slate-500 text-xs font-normal tracking-normal">
                  ({compareSeries.length}/3)
                </span>
              </h3>
              <button
                onClick={() => setCompareSlugs([])}
                className="text-xs text-slate-400 hover:text-white font-semibold"
              >
                {isZh ? "清空" : "Clear"} ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 items-center">
              <RadarChart axes={DOMAIN_AXES} series={compareSeries} size={340} />
              <div className="space-y-2">
                {compareSeries.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: s.color }}
                    />
                    <span className="text-sm font-bold text-white truncate">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Sort tabs ──────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSort(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                sort === tab.key
                  ? "bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/25"
                  : "bg-slate-900/60 text-slate-400 border border-slate-700/60 hover:text-cyan-300 hover:border-cyan-500/40"
              }`}
            >
              {isZh ? tab.zh : tab.en}
            </button>
          ))}
        </div>

        {/* Vendors */}
        {vendors.length > 0 && (
          <div className="flex items-start gap-2 flex-wrap mb-8">
            <span className="text-[11px] font-black tracking-widest text-slate-500 uppercase mt-1.5">
              {isZh ? "厂商" : "Vendor"}
            </span>
            <button
              onClick={() => setVendor(null)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                !vendor
                  ? "bg-cyan-500 text-slate-900"
                  : "bg-slate-900/60 text-slate-400 border border-slate-700/60 hover:text-cyan-300"
              }`}
            >
              {isZh ? "全部" : "All"}
            </button>
            {vendors.map((v) => (
              <button
                key={v.vendor}
                onClick={() => setVendor(vendor === v.vendor ? null : v.vendor)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                  vendor === v.vendor
                    ? "bg-cyan-500 text-slate-900"
                    : "bg-slate-900/60 text-slate-400 border border-slate-700/60 hover:text-cyan-300"
                }`}
              >
                {v.vendor}
                <span className="ml-1 opacity-60">{v.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Grid ───────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-900/60 border border-slate-700/60 rounded-2xl h-64 animate-pulse"
              />
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="text-center bg-slate-900/40 border border-slate-800 rounded-2xl p-16">
            <Sparkles className="mx-auto text-slate-600 mb-3" size={40} />
            <p className="text-slate-400">
              {isZh ? "暂无模型数据，请运行 seed.py" : "No models yet — run seed.py"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {models.map((m, i) => (
              <div key={m.slug} className="relative">
                <ModelCard
                  model={m}
                  locale={locale}
                  rank={sort === "overall" ? i + 1 : undefined}
                />
                {/* Compare checkbox */}
                <button
                  onClick={() => toggleCompare(m.slug)}
                  aria-label="toggle compare"
                  className={`absolute top-3 right-3 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all ${
                    compareSlugs.includes(m.slug)
                      ? "bg-cyan-500 border-cyan-400 text-slate-900"
                      : "bg-slate-800/80 border-slate-600 text-slate-500 hover:border-cyan-400 hover:text-cyan-400"
                  }`}
                  title={isZh ? "加入对比" : "Add to compare"}
                >
                  {compareSlugs.includes(m.slug) ? "✓" : "+"}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      <strong className="text-cyan-400 font-black text-base">{value}</strong>
      <span className="text-slate-400">{label}</span>
    </span>
  );
}
