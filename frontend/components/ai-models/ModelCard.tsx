"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Users } from "lucide-react";
import type { AIModelListItem } from "@/lib/api";

const DOMAIN_LABELS_ZH: Record<string, string> = {
  coding: "编程",
  academic: "学术",
  office: "职场",
  lifestyle: "生活",
};

const DOMAIN_LABELS_EN: Record<string, string> = {
  coding: "Coding",
  academic: "Academic",
  office: "Office",
  lifestyle: "Lifestyle",
};

export default function ModelCard({
  model,
  locale,
  rank,
}: {
  model: AIModelListItem;
  locale: string;
  rank?: number;
}) {
  const isZh = locale === "zh";
  const domainLabels = isZh ? DOMAIN_LABELS_ZH : DOMAIN_LABELS_EN;
  const brandColor = model.brand_color || "#06b6d4";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-slate-900/60 backdrop-blur border border-slate-700/60 rounded-2xl p-5 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all"
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

      <Link href={`/${locale}/ai-models/${model.slug}`} className="block">
        {/* Header row: name + overall score */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-white text-lg truncate group-hover:text-cyan-400 transition-colors">
              {model.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold uppercase tracking-wider">
              {model.vendor}
            </p>
          </div>
          <div
            className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl shadow-md"
            style={{
              background: `linear-gradient(135deg, ${brandColor}40, ${brandColor}10)`,
              border: `1px solid ${brandColor}60`,
            }}
          >
            <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: brandColor }}>
              {isZh ? "综合" : "Score"}
            </span>
            <span className="text-lg font-black text-white leading-none">
              {model.overall_score.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Domain score bars */}
        <div className="space-y-1.5 mb-4">
          {(["coding", "academic", "office", "lifestyle"] as const).map((d) => {
            const v = model.domain_scores[d] ?? 0;
            return (
              <div key={d} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 w-10 flex-shrink-0 uppercase tracking-wider">
                  {domainLabels[d]}
                </span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${v}%`,
                      background: `linear-gradient(90deg, ${brandColor}80, ${brandColor})`,
                    }}
                  />
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-300 w-8 text-right">
                  {v.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Community rating + votes */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 text-xs">
          <div className="flex items-center gap-1.5 text-yellow-400">
            <Star size={12} className="fill-yellow-400" />
            <span className="font-bold">
              {model.community_rating > 0 ? model.community_rating.toFixed(1) : "—"}
            </span>
            <span className="text-slate-500 flex items-center gap-0.5">
              <Users size={10} /> {model.votes_count}
            </span>
          </div>
          <span className="text-cyan-400 font-bold uppercase tracking-wider text-[10px] group-hover:text-cyan-300">
            {isZh ? "详情" : "Details"} →
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
