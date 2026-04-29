"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, TrendingUp, Zap, ArrowRight, Heart, Eye, MessageCircle } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { communityApi, postsApi, type CommunityStats, type PostListItem } from "@/lib/api";

type Props = { locale: string };

export default function Section2Community({ locale }: Props) {
  const isZh = locale === "zh";
  const { user } = useAuthStore();

  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [hotPosts, setHotPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      communityApi.stats().catch(() => ({ data: null })),
      postsApi.list({ sort: "hot", page_size: 3 }).catch(() => ({ data: { items: [] as PostListItem[] } })),
    ]).then(([statsRes, postsRes]) => {
      if (!alive) return;
      setStats(statsRes.data as CommunityStats | null);
      setHotPosts((postsRes.data?.items || []) as PostListItem[]);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Stat mapping — fall back to "—" while loading
  const statCards = [
    {
      icon: Users,
      label: isZh ? "注册开发者" : "Developers",
      value: stats ? stats.total_users.toLocaleString() : "—",
    },
    {
      icon: TrendingUp,
      label: isZh ? "社区帖子" : "Community Posts",
      value: stats ? stats.total_posts.toLocaleString() : "—",
    },
    {
      icon: Zap,
      label: isZh ? "关注互动" : "Follows",
      value: stats ? stats.total_follows.toLocaleString() : "—",
    },
  ];

  return (
    <section className="min-h-screen bg-gradient-to-b from-gray-50 via-slate-100 to-slate-200 py-24 relative overflow-hidden border-t border-gray-200/70">
      {/* Subtle grid overlay — start of immersion */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#1e3a5f 1px,transparent 1px),linear-gradient(90deg,#1e3a5f 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
            {isZh ? "AI 开发者开放社区" : "AI Developer Community"}
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto font-medium italic">
            &ldquo;Searching for the infinite in AI, but finding the eternal in contentment.&rdquo;
          </p>
        </motion.div>

        {/* ── Stats row (live) ─────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-12 max-w-2xl mx-auto">
          {statCards.map(({ icon: Icon, label, value }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm"
            >
              <Icon className="mx-auto mb-2 text-blue-500" size={22} />
              <div className="text-2xl font-black text-gray-900">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-gray-100 rounded animate-pulse" />
                ) : (
                  value
                )}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Hot posts preview (live) ─────────────────────────── */}
        <div className="space-y-4 max-w-3xl mx-auto mb-12">
          {loading ? (
            // Skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-[72px] animate-pulse" />
            ))
          ) : hotPosts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <span className="text-4xl block mb-2">💭</span>
              <p className="text-sm text-gray-500 font-medium">
                {isZh ? "社区还没有帖子，来抢个沙发吧！" : "No posts yet — be the first to share!"}
              </p>
            </div>
          ) : (
            hotPosts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Link
                  href={`/${locale}/community/posts/${post.post_uid}`}
                  className="bg-white rounded-2xl border border-gray-100 px-6 py-5 flex items-center gap-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                >
                  {post.tags.length > 0 ? (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full flex-shrink-0">
                      #{post.tags[0]}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full flex-shrink-0">
                      #{isZh ? "随笔" : "Post"}
                    </span>
                  )}
                  <p className="font-bold text-gray-800 flex-1 line-clamp-1">{post.title}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400 flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <Heart size={12} /> {post.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> {post.comments_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {post.views_count.toLocaleString()}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>

        {/* CTA */}
        <div className="text-center">
          {user ? (
            <Link
              href={`/${locale}/community`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-full transition-all shadow-lg"
            >
              {isZh ? "进入社区" : "Enter Community"}
              <ArrowRight size={18} />
            </Link>
          ) : (
            <Link
              href={`/${locale}/auth/register`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-full transition-all shadow-lg"
            >
              {isZh ? "登录后进入社区" : "Join the Community"}
              <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
