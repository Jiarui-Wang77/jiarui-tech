"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star, GitFork, TrendingUp, Flame, ExternalLink } from "lucide-react";
import type { RepoListItem } from "@/lib/api";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3572A5",
  "C++": "#f34b7d",
  C: "#555555",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  Swift: "#ffac45",
  Kotlin: "#a97bff",
  Ruby: "#701516",
  PHP: "#4f5d95",
  "C#": "#178600",
  Dart: "#00b4ab",
  Shell: "#89e051",
  Zig: "#ec915c",
};

export default function RepoCard({
  repo,
  locale,
  rank,
}: {
  repo: RepoListItem;
  locale: string;
  rank?: number;
}) {
  const langColor = repo.language ? LANG_COLORS[repo.language] || "#888" : "#666";
  const isZh = locale === "zh";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-slate-900/60 backdrop-blur border border-slate-700/60 rounded-2xl p-5 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300"
    >
      {/* Rank badge */}
      {rank !== undefined && rank <= 3 && (
        <div
          className={`absolute -top-2 -left-2 w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm shadow-lg ${
            rank === 1
              ? "bg-gradient-to-br from-yellow-400 to-amber-500"
              : rank === 2
              ? "bg-gradient-to-br from-slate-300 to-slate-500"
              : "bg-gradient-to-br from-amber-600 to-amber-800"
          }`}
        >
          {rank}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <Link
          href={`/${locale}/tracker/${repo.owner}/${repo.name}`}
          className="flex items-center gap-2.5 min-w-0 group/link"
        >
          {repo.owner_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={repo.owner_avatar_url}
              alt={repo.owner}
              className="w-7 h-7 rounded-full flex-shrink-0 border border-slate-700"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-700 flex-shrink-0" />
          )}
          <h3 className="font-bold text-white text-sm truncate group-hover/link:text-cyan-400 transition-colors">
            {repo.owner}<span className="text-slate-500">/</span>
            <span className="text-white">{repo.name}</span>
          </h3>
        </Link>

        {/* Horse score pill */}
        <div className="flex items-center gap-1 bg-orange-500/20 text-orange-300 text-xs font-black px-2.5 py-1 rounded-full border border-orange-500/30 flex-shrink-0">
          <Flame size={11} />
          {repo.horse_score.toFixed(1)}
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-400 text-xs leading-relaxed mb-4 line-clamp-2 min-h-[32px]">
        {repo.description || (isZh ? "暂无描述" : "No description")}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs mb-3 flex-wrap">
        <span className="flex items-center gap-1 text-yellow-500/90">
          <Star size={12} className="fill-yellow-500 text-yellow-500" />
          <span className="font-bold">{repo.stars_count.toLocaleString()}</span>
        </span>

        {repo.stars_24h > 0 && (
          <span className="flex items-center gap-1 text-green-400 font-bold">
            <TrendingUp size={12} />
            +{repo.stars_24h.toLocaleString()}<span className="opacity-60 font-normal">/24h</span>
          </span>
        )}

        <span className="flex items-center gap-1 text-slate-500">
          <GitFork size={12} />
          {repo.forks_count.toLocaleString()}
        </span>

        {repo.language && (
          <span className="flex items-center gap-1.5 text-slate-400 ml-auto">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: langColor }}
            />
            {repo.language}
          </span>
        )}
      </div>

      {/* Topics */}
      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {repo.topics.slice(0, 4).map((t) => (
            <span
              key={t}
              className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-semibold"
            >
              #{t}
            </span>
          ))}
          {repo.topics.length > 4 && (
            <span className="text-[10px] text-slate-500 px-1">+{repo.topics.length - 4}</span>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 text-[11px]">
        <Link
          href={`/${locale}/tracker/${repo.owner}/${repo.name}`}
          className="text-cyan-400 font-bold hover:text-cyan-300 uppercase tracking-wider"
        >
          {isZh ? "查看详情" : "View Details"} →
        </Link>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-300 uppercase tracking-wider font-bold"
        >
          GitHub <ExternalLink size={10} />
        </a>
      </div>
    </motion.article>
  );
}
