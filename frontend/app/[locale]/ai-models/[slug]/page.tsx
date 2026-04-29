"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Users,
  Zap,
  Calendar,
  DollarSign,
  Database,
  AlertCircle,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import RadarChart from "@/components/ai-models/RadarChart";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { aiModelsApi, type AIModelDetail } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const DOMAIN_LABELS_ZH: Record<string, string> = {
  coding: "编程开发",
  academic: "学术研究",
  office: "职场办公",
  lifestyle: "生活娱乐",
};
const DOMAIN_LABELS_EN: Record<string, string> = {
  coding: "Coding",
  academic: "Academic",
  office: "Office",
  lifestyle: "Lifestyle",
};

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export default function ModelDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const locale = useLocale();
  const isZh = locale === "zh";
  const router = useRouter();
  const { user } = useAuthStore();

  const [model, setModel] = useState<AIModelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Vote state
  const [voteRating, setVoteRating] = useState<number>(0);
  const [hoverStar, setHoverStar] = useState<number>(0);
  const [voteComment, setVoteComment] = useState("");
  const [voting, setVoting] = useState(false);
  const [confirmRemoveVote, setConfirmRemoveVote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aiModelsApi.get(slug);
      setModel(res.data);
      if (res.data.my_vote) {
        setVoteRating(res.data.my_vote.rating);
        setVoteComment(res.data.my_vote.comment || "");
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmitVote = async () => {
    if (!user) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    if (voteRating < 1 || voteRating > 5 || voting) return;
    setVoting(true);
    try {
      const res = await aiModelsApi.vote(slug, voteRating, voteComment.trim() || undefined);
      setModel((m) =>
        m
          ? {
              ...m,
              community_rating: res.data.community_rating,
              votes_count: res.data.votes_count,
              overall_score: res.data.overall_score,
              my_vote: res.data.my_vote,
            }
          : m
      );
    } finally {
      setVoting(false);
    }
  };

  const handleRemoveVote = () => {
    if (!user || !model?.my_vote) return;
    setConfirmRemoveVote(true);
  };

  const confirmRemoveVoteFn = async () => {
    setConfirmRemoveVote(false);
    await aiModelsApi.removeVote(slug);
    setVoteRating(0);
    setVoteComment("");
    await load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 pt-28 space-y-4">
          <div className="h-12 w-1/2 bg-slate-800 rounded animate-pulse" />
          <div className="h-64 bg-slate-800/60 rounded-2xl animate-pulse mt-8" />
        </div>
      </div>
    );
  }

  if (notFound || !model) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 pt-28 text-center">
          <AlertCircle className="mx-auto text-slate-500 mb-4" size={48} />
          <h1 className="text-2xl font-black text-white mb-2">
            {isZh ? "模型不存在" : "Model not found"}
          </h1>
          <Link
            href={`/${locale}/ai-models`}
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold rounded-full text-sm"
          >
            <ArrowLeft size={14} /> {isZh ? "返回榜单" : "Back"}
          </Link>
        </div>
      </div>
    );
  }

  const brandColor = model.brand_color || "#06b6d4";
  const description = (isZh ? model.description_zh : model.description_en) || "";
  const domainLabels = isZh ? DOMAIN_LABELS_ZH : DOMAIN_LABELS_EN;

  const radarSeries = [
    {
      name: model.name,
      color: brandColor,
      values: (["coding", "academic", "office", "lifestyle"] as const).map((d) => {
        const s = model.scores.find((x) => x.domain === d);
        return s ? s.score : 0;
      }),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
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
          href={`/${locale}/ai-models`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-cyan-300 mb-5 uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> {isZh ? "返回榜单" : "Back to Leaderboard"}
        </Link>

        {/* ── Hero ─────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl p-6 sm:p-8 mb-6 overflow-hidden border border-slate-700"
          style={{
            background: `linear-gradient(135deg, ${brandColor}25 0%, #0f172a 60%, #0f172a 100%)`,
          }}
        >
          <div
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
            style={{ background: `${brandColor}20` }}
          />

          <div className="relative flex flex-col sm:flex-row items-start gap-5">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-black tracking-[0.25em] uppercase" style={{ color: brandColor }}>
                {model.vendor}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 mt-1">
                {model.name}
              </h1>
              {description && (
                <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
                  {description}
                </p>
              )}
              {model.official_url && (
                <a
                  href={model.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
                >
                  {isZh ? "官方网站" : "Official Site"} <ExternalLink size={11} />
                </a>
              )}
            </div>

            {/* Overall score badge */}
            <div
              className="flex-shrink-0 w-28 h-28 rounded-2xl flex flex-col items-center justify-center shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${brandColor}, ${brandColor}80)`,
              }}
            >
              <span className="text-[10px] font-black tracking-[0.2em] text-white/80 uppercase">
                {isZh ? "综合分" : "Overall"}
              </span>
              <span className="text-4xl font-black text-white leading-none mt-1">
                {model.overall_score.toFixed(1)}
              </span>
              <span className="text-[10px] text-white/60 mt-1">/ 100</span>
            </div>
          </div>
        </motion.section>

        {/* ── Metrics grid ─────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <MetricBox
            icon={<Calendar size={14} />}
            label={isZh ? "发布日期" : "Released"}
            value={
              model.release_date
                ? new Date(model.release_date).toLocaleDateString(isZh ? "zh-CN" : "en-US", { year: "numeric", month: "short" })
                : "—"
            }
          />
          <MetricBox
            icon={<Database size={14} />}
            label={isZh ? "上下文" : "Context"}
            value={model.context_window ? `${(model.context_window / 1000).toFixed(0)}K` : "—"}
          />
          <MetricBox
            icon={<DollarSign size={14} />}
            label={isZh ? "输入 / 1M" : "Input / 1M"}
            value={model.price_input_per_1m != null ? `$${model.price_input_per_1m}` : (isZh ? "开源" : "Free")}
          />
          <MetricBox
            icon={<DollarSign size={14} />}
            label={isZh ? "输出 / 1M" : "Output / 1M"}
            value={model.price_output_per_1m != null ? `$${model.price_output_per_1m}` : (isZh ? "开源" : "Free")}
          />
        </div>

        {/* ── Radar + domain scores ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 mb-8">
          {/* Radar */}
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4">
            <p className="text-[11px] font-black tracking-[0.2em] text-cyan-400 uppercase mb-2 text-center">
              {isZh ? "四维雷达" : "Radar"}
            </p>
            <RadarChart
              axes={(["coding", "academic", "office", "lifestyle"] as const).map((d) => domainLabels[d])}
              series={radarSeries}
              size={340}
            />
          </div>

          {/* Domain breakdown cards */}
          <div className="space-y-3">
            {(["coding", "academic", "office", "lifestyle"] as const).map((d) => {
              const s = model.scores.find((x) => x.domain === d);
              if (!s) return null;
              const breakdown = s.breakdown as Record<string, number>;
              return (
                <div
                  key={d}
                  className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-white text-sm">
                      {domainLabels[d]}
                    </h3>
                    <span
                      className="text-xl font-black font-mono"
                      style={{ color: brandColor }}
                    >
                      {s.score.toFixed(1)}
                    </span>
                  </div>
                  {breakdown && Object.keys(breakdown).length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(breakdown).map(([k, v]) => (
                        <div
                          key={k}
                          className="bg-slate-800/60 rounded-lg px-2 py-1.5 text-center"
                        >
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider truncate">
                            {k.replace(/_/g, " ")}
                          </div>
                          <div className="text-sm font-black text-white font-mono">
                            {typeof v === "number" ? v : v}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Community voting ──────────────────────── */}
        <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Star className="text-yellow-400 fill-yellow-400" size={20} />
                {isZh ? "社区评分" : "Community Rating"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isZh ? "真实用户的综合使用体验" : "Real user composite experience"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-yellow-400 font-mono">
                {model.community_rating > 0 ? model.community_rating.toFixed(1) : "—"}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                <Users size={11} /> {model.votes_count} {isZh ? "人" : "votes"}
              </div>
            </div>
          </div>

          {/* Voting form */}
          {user ? (
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {model.my_vote ? (isZh ? "你的评分" : "Your Rating") : (isZh ? "为这个模型打分" : "Rate this model")}
              </p>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onMouseEnter={() => setHoverStar(n)}
                    onMouseLeave={() => setHoverStar(0)}
                    onClick={() => setVoteRating(n)}
                    className="transition-transform hover:scale-110"
                    aria-label={`Rate ${n}`}
                  >
                    <Star
                      size={28}
                      className={`transition-colors ${
                        n <= (hoverStar || voteRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-600"
                      }`}
                    />
                  </button>
                ))}
                {voteRating > 0 && (
                  <span className="ml-2 text-sm font-bold text-yellow-400">
                    {voteRating}.0 / 5
                  </span>
                )}
              </div>
              <textarea
                value={voteComment}
                onChange={(e) => setVoteComment(e.target.value)}
                placeholder={isZh ? "说说你的使用体验（可选）..." : "Share your experience (optional)..."}
                rows={2}
                maxLength={2000}
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 resize-none"
              />
              <div className="flex justify-between items-center mt-3">
                {model.my_vote && (
                  <button
                    onClick={handleRemoveVote}
                    className="text-xs text-slate-500 hover:text-red-400 font-semibold"
                  >
                    {isZh ? "撤回评分" : "Remove vote"}
                  </button>
                )}
                <button
                  onClick={handleSubmitVote}
                  disabled={voteRating < 1 || voting}
                  className="ml-auto px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black rounded-full text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {voting ? "..." : model.my_vote ? (isZh ? "更新评分" : "Update") : (isZh ? "提交评分" : "Submit")}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/40 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-400 mb-2">
                {isZh ? "登录后参与评分" : "Sign in to rate this model"}
              </p>
              <Link
                href={`/${locale}/auth/login`}
                className="inline-block px-5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold rounded-full text-xs uppercase tracking-wider"
              >
                {isZh ? "去登录" : "Sign in"}
              </Link>
            </div>
          )}
        </section>
      </main>

      <DeleteConfirmModal
        isOpen={confirmRemoveVote}
        onClose={() => setConfirmRemoveVote(false)}
        onConfirm={confirmRemoveVoteFn}
        title={model?.name ?? ""}
        locale={locale}
        heading={isZh ? "撤回评分？" : "Remove Vote?"}
        subtext={isZh ? "你的评分将从榜单中移除。" : "Your rating will be removed from the leaderboard."}
      />
    </div>
  );
}

function MetricBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
        {icon}
        {label}
      </div>
      <div className="text-sm font-black text-slate-100 truncate">{value}</div>
    </div>
  );
}
