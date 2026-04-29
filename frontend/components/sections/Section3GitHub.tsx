"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, TrendingUp, ArrowRight, Flame, Github } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { trackerApi, type RepoListItem } from "@/lib/api";

type Props = { locale: string };

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  Python: "#3572A5",
  "C++": "#f34b7d",
  Rust: "#dea584",
  Go: "#00ADD8",
  JavaScript: "#f7df1e",
};

export default function Section3GitHub({ locale }: Props) {
  const isZh = locale === "zh";
  const { user } = useAuthStore();

  const [repos, setRepos] = useState<RepoListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackerApi
      .list({ page: 1, page_size: 5, sort: "horse" })
      .then((r) => setRepos(r.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="min-h-screen bg-gradient-to-b from-slate-300 via-slate-500 to-slate-800 py-24 relative overflow-hidden border-t border-slate-400/50 shadow-[0_-1px_0_rgba(255,255,255,0.08)_inset]">
      {/* Grid tightens and brightens */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,1) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 text-[11px] font-black tracking-[0.25em] text-cyan-400 uppercase mb-3">
            <Github size={14} />
            {isZh ? "GitHub 追踪器" : "GitHub Tracker"}
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            {isZh ? "GitHub AI 黑马追踪器" : "GitHub AI Horse Tracker"}
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            {isZh
              ? "每日抓取 AI 仓库 · 黑马算法识别新星 · 实时增长追踪"
              : "Daily AI repo crawl · Black-horse scoring · Live growth tracking"}
          </p>
        </motion.div>

        {/* Repo cards — live data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-12">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 h-56 animate-pulse"
              />
            ))
          ) : repos.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-5 text-center bg-slate-900/60 rounded-2xl border border-slate-700 p-12">
              <Github className="mx-auto text-slate-600 mb-3" size={40} />
              <p className="text-slate-400">
                {isZh
                  ? "暂无数据 · 管理员需要先同步 GitHub"
                  : "No data yet — admin must sync GitHub first"}
              </p>
            </div>
          ) : (
            repos.map((repo, i) => {
              const langColor = repo.language
                ? LANG_COLORS[repo.language] || "#888"
                : "#666";
              return (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Link
                    href={`/${locale}/tracker/${repo.owner}/${repo.name}`}
                    className="block bg-slate-900/80 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 group cursor-pointer h-full"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors truncate max-w-[70%]">
                        {repo.owner}/<span>{repo.name}</span>
                      </h3>
                      <div className="flex items-center gap-1 bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-1 rounded-full border border-orange-500/30 flex-shrink-0">
                        <Flame size={11} />
                        {repo.horse_score.toFixed(1)}
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed mb-4 line-clamp-2 min-h-[32px]">
                      {repo.description || (isZh ? "暂无描述" : "No description")}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-500" />
                        {repo.stars_count.toLocaleString()}
                      </span>
                      {repo.stars_24h > 0 && (
                        <span className="flex items-center gap-1 text-green-400 font-bold">
                          <TrendingUp size={12} />+{repo.stars_24h.toLocaleString()} / 24h
                        </span>
                      )}
                      {repo.language && (
                        <span className="flex items-center gap-1.5 ml-auto">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: langColor }}
                          />
                          {repo.language}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {repo.topics.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="text-center">
          {user ? (
            <Link
              href={`/${locale}/tracker`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black rounded-full transition-all shadow-lg shadow-cyan-500/30"
            >
              {isZh ? "进入完整榜单" : "Enter Full Leaderboard"}
              <ArrowRight size={18} />
            </Link>
          ) : (
            <Link
              href={`/${locale}/auth/login`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black rounded-full transition-all shadow-lg shadow-cyan-500/30"
            >
              {isZh ? "登录查看完整数据" : "Login to Explore Full Data"}
              <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
