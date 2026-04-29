"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  GitFork,
  Eye,
  Flame,
  TrendingUp,
  ExternalLink,
  Clock,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import StarChart from "@/components/tracker/StarChart";
import { trackerApi, type RepoDetail } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import JunoContextPanel from "@/components/juno/JunoContextPanel";

type PageProps = {
  params: Promise<{ locale: string; owner: string; name: string }>;
};

export default function RepoDetailPage({ params }: PageProps) {
  const { owner, name } = use(params);
  const locale = useLocale();
  const isZh = locale === "zh";
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [repo, setRepo] = useState<RepoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [junoOpen, setJunoOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await trackerApi.get(owner, name, 30);
      setRepo(res.data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, name]);

  const handleSync = async () => {
    if (!isAdmin || syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await trackerApi.adminSyncOne(`${owner}/${name}`);
      await load();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSyncError(detail ?? (isZh ? "同步失败，请稍后重试" : "Sync failed, please try again"));
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 pt-28 space-y-4">
          <div className="h-10 w-1/2 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-full bg-slate-800 rounded animate-pulse" />
          <div className="h-48 bg-slate-800/60 rounded-2xl animate-pulse mt-8" />
        </div>
      </div>
    );
  }

  if (notFound || !repo) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 pt-28 text-center">
          <AlertCircle className="mx-auto text-slate-500 mb-4" size={48} />
          <h1 className="text-2xl font-black text-white mb-2">
            {isZh ? "仓库未被追踪" : "Repository not tracked"}
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            {isZh
              ? `${owner}/${name} 不在我们的追踪列表里`
              : `${owner}/${name} is not in our tracker yet`}
          </p>
          <Link
            href={`/${locale}/tracker`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold rounded-full text-sm"
          >
            <ArrowLeft size={14} /> {isZh ? "返回榜单" : "Back to Leaderboard"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,1) 1px,transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <Link
          href={`/${locale}/tracker`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-cyan-300 mb-5 uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> {isZh ? "返回榜单" : "Back to Tracker"}
        </Link>

        {/* ── Header card ─────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 mb-6 overflow-hidden"
        >
          {/* Glow */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start gap-5">
            {repo.owner_avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={repo.owner_avatar_url}
                alt={repo.owner}
                className="w-16 h-16 rounded-full border-2 border-slate-700 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white break-words">
                <span className="text-slate-400">{repo.owner}/</span>
                {repo.name}
              </h1>
              {repo.description && (
                <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                  {repo.description}
                </p>
              )}
              {/* Topics */}
              {repo.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {repo.topics.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-semibold"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-xs rounded-full transition-colors uppercase tracking-wider"
              >
                GitHub <ExternalLink size={12} />
              </a>
              {repo.homepage && (
                <a
                  href={repo.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-full transition-colors"
                >
                  {isZh ? "官网" : "Homepage"} <ExternalLink size={11} />
                </a>
              )}
              {/* Juno Analysis button */}
              <button
                onClick={() => setJunoOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 hover:text-violet-200 font-bold text-xs rounded-full transition-colors"
              >
                <Sparkles size={11} className="text-violet-400" />
                {isZh ? "Juno 解读" : "Juno Analysis"}
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-semibold text-xs rounded-full transition-colors disabled:opacity-60"
                  >
                    <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
                    {isZh ? "立即同步" : "Sync Now"}
                  </button>
                  {syncError && (
                    <p className="text-[11px] text-red-400 max-w-[160px] text-right leading-tight">
                      {syncError}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.section>

        {/* ── Stats grid ──────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatBox
            icon={<Flame className="text-orange-400" size={18} />}
            label={isZh ? "黑马指数" : "Horse Score"}
            value={repo.horse_score.toFixed(1)}
            accent="from-orange-500/20 to-transparent"
            valueClass="text-orange-300"
          />
          <StatBox
            icon={<Star className="text-yellow-400 fill-yellow-400" size={18} />}
            label={isZh ? "总星数" : "Stars"}
            value={repo.stars_count.toLocaleString()}
            accent="from-yellow-500/20 to-transparent"
            valueClass="text-yellow-200"
          />
          <StatBox
            icon={<TrendingUp className="text-green-400" size={18} />}
            label={isZh ? "24h 增长" : "24h Growth"}
            value={`+${repo.stars_24h.toLocaleString()}`}
            accent="from-green-500/20 to-transparent"
            valueClass="text-green-300"
          />
          <StatBox
            icon={<TrendingUp className="text-cyan-400" size={18} />}
            label={isZh ? "7d 增长" : "7d Growth"}
            value={`+${repo.stars_7d.toLocaleString()}`}
            accent="from-cyan-500/20 to-transparent"
            valueClass="text-cyan-300"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <SmallStat label="Forks" value={repo.forks_count.toLocaleString()} icon={<GitFork size={14} />} />
          <SmallStat label="Issues" value={repo.open_issues_count.toLocaleString()} icon={<AlertCircle size={14} />} />
          <SmallStat label="Watchers" value={repo.watchers_count.toLocaleString()} icon={<Eye size={14} />} />
          <SmallStat label={isZh ? "语言" : "Language"} value={repo.language || "—"} icon={<span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />} />
        </div>

        {/* ── Star growth chart ───────────────────────── */}
        <section className="mb-8">
          <h2 className="text-sm font-black tracking-[0.2em] text-cyan-400 uppercase mb-3">
            {isZh ? "星数增长曲线" : "Star Growth Curve"}
          </h2>
          <StarChart snapshots={repo.snapshots} height={240} locale={locale} />
        </section>

        {/* ── Timeline ────────────────────────────────── */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 space-y-2 font-mono">
          <TimelineRow label={isZh ? "GitHub 创建于" : "Created on GitHub"} value={repo.gh_created_at} locale={locale} />
          <TimelineRow label={isZh ? "最近推送" : "Last pushed"} value={repo.gh_pushed_at} locale={locale} />
          <TimelineRow label={isZh ? "首次追踪" : "First tracked"} value={repo.first_seen_at} locale={locale} />
          <TimelineRow label={isZh ? "上次同步" : "Last synced"} value={repo.last_synced_at} locale={locale} />
        </section>
      </main>

      {/* Juno context panel — dark theme to match tracker */}
      <JunoContextPanel
        isOpen={junoOpen}
        onClose={() => setJunoOpen(false)}
        mode="analyze"
        contextText={[
          `GitHub 开源项目：${repo.owner}/${repo.name}`,
          repo.description ? `项目描述：${repo.description}` : "",
          `黑马指数：${repo.horse_score.toFixed(1)}`,
          `总 Star 数：${repo.stars_count.toLocaleString()}`,
          `24小时涨星：+${repo.stars_24h}`,
          `7天涨星：+${repo.stars_7d}`,
          repo.language ? `主要编程语言：${repo.language}` : "",
          repo.topics.length > 0 ? `话题标签：${repo.topics.join(", ")}` : "",
          repo.forks_count ? `Fork 数：${repo.forks_count}` : "",
        ]
          .filter(Boolean)
          .join("\n")}
        locale={locale}
        theme="dark"
      />
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  accent,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  valueClass: string;
}) {
  return (
    <div
      className={`relative bg-slate-900/70 border border-slate-700/60 rounded-2xl p-4 overflow-hidden`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} pointer-events-none`} />
      <div className="relative flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
          {label}
        </span>
      </div>
      <div className={`relative text-2xl font-black ${valueClass}`}>{value}</div>
    </div>
  );
}

function SmallStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
        {icon}
        {label}
      </div>
      <div className="text-sm font-black text-slate-200 truncate">{value}</div>
    </div>
  );
}

function TimelineRow({
  label,
  value,
  locale,
}: {
  label: string;
  value: string | null | undefined;
  locale: string;
}) {
  if (!value) return null;
  const d = new Date(value);
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300 inline-flex items-center gap-1">
        <Clock size={11} />
        {d.toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}
      </span>
    </div>
  );
}
