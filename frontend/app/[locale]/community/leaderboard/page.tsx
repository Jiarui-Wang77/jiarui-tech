"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Heart, Users, PenSquare } from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { communityApi, type LeaderboardEntry } from "@/lib/api";

const RANK_COLOR = [
  "from-yellow-400 to-amber-500",  // 1
  "from-slate-300 to-slate-500",   // 2
  "from-amber-600 to-amber-800",   // 3
];

export default function LeaderboardPage() {
  const t = useTranslations("community");
  const locale = useLocale();
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityApi.leaderboard(50)
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <Link
          href={`/${locale}/community`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 font-medium"
        >
          <ArrowLeft size={15} /> {t("back_to_feed")}
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-3xl p-8 text-white mb-6 relative overflow-hidden"
        >
          <Trophy className="absolute -bottom-4 -right-4 text-white/10" size={180} strokeWidth={1.5} />
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-black mb-2 flex items-center gap-2">
              🏆 {t("leaderboard")}
            </h1>
            <p className="text-white/90 text-sm">
              {locale === "zh"
                ? "按贡献值排名 · 发帖 × 1 + 获赞 × 2 + 粉丝 × 3"
                : "Ranked by contribution · posts × 1 + likes × 2 + followers × 3"}
            </p>
          </div>
        </motion.div>

        {/* Board */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <span className="text-5xl block mb-3">🌱</span>
            <p className="text-gray-500 text-sm">
              {locale === "zh" ? "榜单还是空的，发一篇帖子就能上榜！" : "Leaderboard is empty — post something to get ranked!"}
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {rows.map((entry, i) => (
              <motion.li
                key={entry.user.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <Link
                  href={`/${locale}/community/users/${entry.user.username}`}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all p-5 group"
                >
                  {/* Rank badge */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md ${
                      entry.rank <= 3
                        ? `bg-gradient-to-br ${RANK_COLOR[entry.rank - 1]}`
                        : "bg-gray-200 !text-gray-600 !shadow-none"
                    }`}
                  >
                    {entry.rank}
                  </div>

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                    {entry.user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.user.avatar_url} alt={entry.user.username} className="w-full h-full object-cover" />
                    ) : (
                      entry.user.username.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {entry.user.username}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <PenSquare size={12} /> {entry.posts_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart size={12} /> {entry.total_likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {entry.followers_count}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-black text-blue-600">{entry.score.toFixed(0)}</div>
                    <div className="text-xs text-gray-400">{t("score")}</div>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
