"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Flame,
  Star,
  TrendingUp,
  Clock,
  Search,
  X,
  RefreshCw,
  Github,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import RepoCard from "@/components/tracker/RepoCard";
import {
  trackerApi,
  type RepoListItem,
  type TrackerStats,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

type SortKey = "horse" | "stars" | "stars_24h" | "stars_7d" | "newest";

const SORT_TABS: { key: SortKey; icon: React.ReactNode; zh: string; en: string }[] = [
  { key: "horse", icon: <Flame size={14} />, zh: "黑马指数", en: "Horse Score" },
  { key: "stars_24h", icon: <TrendingUp size={14} />, zh: "24h 增长", en: "24h Growth" },
  { key: "stars_7d", icon: <TrendingUp size={14} />, zh: "7d 增长", en: "7d Growth" },
  { key: "stars", icon: <Star size={14} />, zh: "总星数", en: "Most Starred" },
  { key: "newest", icon: <Clock size={14} />, zh: "最新仓库", en: "Newest" },
];

export default function TrackerPage() {
  const t = useTranslations("community"); // reuse
  const locale = useLocale();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const isZh = locale === "zh";

  const [sort, setSort] = useState<SortKey>("horse");
  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [repos, setRepos] = useState<RepoListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const PAGE_SIZE = 18;

  const fetchRepos = useCallback(
    async (pageNum: number, reset: boolean) => {
      if (reset) setLoading(true);
      try {
        const res = await trackerApi.list({
          page: pageNum,
          page_size: PAGE_SIZE,
          sort,
          language: activeLang || undefined,
          topic: activeTopic || undefined,
          search: searchTerm || undefined,
        });
        setTotal(res.data.total);
        setRepos((prev) => (reset ? res.data.items : [...prev, ...res.data.items]));
      } finally {
        setLoading(false);
      }
    },
    [sort, activeLang, activeTopic, searchTerm]
  );

  useEffect(() => {
    setPage(1);
    fetchRepos(1, true);
  }, [fetchRepos]);

  useEffect(() => {
    trackerApi.stats().then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput("");
    setSearchTerm("");
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchRepos(next, false);
  };

  const handleAdminSync = async () => {
    if (!isAdmin || syncing) return;
    setSyncing(true);
    setSyncMessage("");
    try {
      const res = await trackerApi.adminSyncAll();
      setSyncMessage(
        isZh
          ? `✅ 同步完成：${res.data.updated} 个成功，${res.data.failed} 个失败`
          : `✅ Sync done: ${res.data.updated} updated, ${res.data.failed} failed`
      );
      // Refresh list + stats
      fetchRepos(1, true);
      trackerApi.stats().then((r) => setStats(r.data)).catch(() => {});
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSyncMessage(isZh ? `❌ 同步失败：${msg || "未知错误"}` : `❌ Sync failed: ${msg || "unknown"}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(""), 6000);
    }
  };

  const hasMore = repos.length < total;

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Cyber grid background */}
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
          className="mb-10"
        >
          <div className="relative rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,212,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.5) 1px,transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Github className="text-cyan-400" size={22} />
                  <span className="text-[11px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                    {isZh ? "GitHub 追踪器" : "GitHub Tracker"}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
                  {isZh ? "AI 黑马仓库榜单" : "AI Black-Horse Leaderboard"}
                </h1>
                <p className="text-slate-400 text-sm max-w-xl">
                  {isZh
                    ? "每日抓取 · 黑马算法 · 实时星数增长追踪 — 发现明日之星"
                    : "Daily crawl · Proprietary scoring · Live star-growth tracking — spot tomorrow's stars"}
                </p>
                {stats && (
                  <div className="flex flex-wrap gap-5 mt-4 text-xs text-slate-300">
                    <span>
                      <strong className="text-cyan-400 font-black text-base">
                        {stats.total_repos}
                      </strong>{" "}
                      {isZh ? "追踪中" : "tracked"}
                    </span>
                    <span>
                      <strong className="text-cyan-400 font-black text-base">
                        {(stats.total_stars / 1000).toFixed(1)}k
                      </strong>{" "}
                      {isZh ? "总星数" : "total stars"}
                    </span>
                    <span>
                      <strong className="text-orange-400 font-black text-base">
                        {stats.avg_horse_score}
                      </strong>{" "}
                      {isZh ? "平均黑马值" : "avg horse score"}
                    </span>
                  </div>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={handleAdminSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold rounded-full transition-all disabled:opacity-60 flex-shrink-0"
                >
                  <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
                  {isZh ? "同步 GitHub" : "Sync GitHub"}
                </button>
              )}
            </div>
            {syncMessage && (
              <div className="relative z-10 mt-4 text-xs text-cyan-300 bg-cyan-500/5 border border-cyan-500/20 rounded-xl px-3 py-2">
                {syncMessage}
              </div>
            )}
          </div>
        </motion.header>

        {/* ── Search ─────────────────────────────────────── */}
        <form onSubmit={handleSearchSubmit} className="mb-5">
          <div className="relative max-w-2xl">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={isZh ? "搜索仓库名或描述..." : "Search by repo name or description..."}
              className="w-full pl-11 pr-24 py-2.5 text-sm bg-slate-900/80 border border-slate-700 rounded-full text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-[76px] top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900 text-xs font-black rounded-full"
            >
              {isZh ? "搜索" : "Search"}
            </button>
          </div>
        </form>

        {/* ── Sort tabs ──────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
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
              {tab.icon}
              {isZh ? tab.zh : tab.en}
            </button>
          ))}
        </div>

        {/* ── Filters (languages + topics) ──────────────── */}
        {stats && (stats.languages.length > 0 || stats.top_topics.length > 0) && (
          <div className="space-y-3 mb-8">
            {stats.languages.length > 0 && (
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[11px] font-black tracking-widest text-slate-500 uppercase mt-1.5">
                  {isZh ? "语言" : "Lang"}
                </span>
                {stats.languages.map(({ language, count }) => (
                  <FilterChip
                    key={language}
                    label={language}
                    count={count}
                    active={activeLang === language}
                    onClick={() => setActiveLang(activeLang === language ? null : language)}
                  />
                ))}
              </div>
            )}
            {stats.top_topics.length > 0 && (
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[11px] font-black tracking-widest text-slate-500 uppercase mt-1.5">
                  {isZh ? "话题" : "Topic"}
                </span>
                {stats.top_topics.map(({ topic, count }) => (
                  <FilterChip
                    key={topic}
                    label={`#${topic}`}
                    count={count}
                    active={activeTopic === topic}
                    onClick={() => setActiveTopic(activeTopic === topic ? null : topic)}
                  />
                ))}
              </div>
            )}
            {(activeLang || activeTopic) && (
              <button
                onClick={() => {
                  setActiveLang(null);
                  setActiveTopic(null);
                }}
                className="text-xs text-cyan-400 hover:underline font-semibold"
              >
                {isZh ? "清除筛选" : "Clear filters"} ✕
              </button>
            )}
          </div>
        )}

        {/* ── Grid ───────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-5 h-52 animate-pulse"
              />
            ))}
          </div>
        ) : repos.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-16 text-center">
            <Sparkles className="mx-auto text-slate-600 mb-3" size={40} />
            <p className="text-slate-400 font-semibold">
              {searchTerm
                ? isZh
                  ? `未找到匹配"${searchTerm}"的仓库`
                  : `No repos match "${searchTerm}"`
                : isZh
                ? "暂无数据，请管理员同步 GitHub"
                : "No data yet — admin needs to sync GitHub"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {repos.map((repo, i) => (
                <RepoCard
                  key={`${repo.owner}/${repo.name}`}
                  repo={repo}
                  locale={locale}
                  rank={sort === "horse" || sort === "stars" || sort === "stars_24h" ? i + 1 : undefined}
                />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={handleLoadMore}
                  className="px-8 py-3 bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-300 font-black rounded-full transition-all uppercase tracking-wider text-sm"
                >
                  {isZh ? "加载更多" : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
        active
          ? "bg-cyan-500 text-slate-900 shadow"
          : "bg-slate-900/60 text-slate-400 border border-slate-700/60 hover:border-cyan-500/40 hover:text-cyan-300"
      }`}
    >
      {label}
      <span className="ml-1 opacity-60">{count}</span>
    </button>
  );
}
