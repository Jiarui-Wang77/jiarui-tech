"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { PenSquare, Flame, Clock, TrendingUp, Users, ChevronDown, ChevronUp } from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import PostCard from "@/components/community/PostCard";
import { postsApi, communityApi, type PostListItem, type CommunityStats } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const TAGS_INITIAL = 12;

type SortKey = "latest" | "hot" | "top";

export default function CommunityFeed() {
  const t = useTranslations("community");
  const locale = useLocale();
  const { user } = useAuthStore();

  const [sort, setSort] = useState<SortKey>("latest");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const scrollTargetRef = useRef<{ uid: string; targetPage: number } | null>(null);
  const scrollDoneRef = useRef(false);
  const autoLoadingRef = useRef(false);

  const fetchPosts = useCallback(async (sortKey: SortKey, tag: string | null, pageNum: number, reset: boolean) => {
    if (reset) setLoading(true);
    try {
      const res = await postsApi.list({
        page: pageNum,
        page_size: 12,
        sort: sortKey,
        tag: tag || undefined,
      });
      setTotalPages(res.data.total_pages);
      setPosts((prev) => {
        if (reset) return res.data.items;
        const seen = new Set(prev.map((p) => p.post_uid));
        return [...prev, ...res.data.items.filter((p) => !seen.has(p.post_uid))];
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchPosts(sort, activeTag, 1, true);
  }, [sort, activeTag, fetchPosts]);

  useEffect(() => {
    communityApi.trendingTags(50).then((r) => setTags(r.data)).catch(() => {});
    communityApi.stats().then((r) => setStats(r.data)).catch(() => {});
  }, []);

  // On mount: read saved scroll target from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("scroll:community-feed");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.uid && data.targetPage) scrollTargetRef.current = data;
        else sessionStorage.removeItem("scroll:community-feed");
      } catch {
        sessionStorage.removeItem("scroll:community-feed");
      }
    }
  }, []);

  // Auto-load pages until target post is in DOM, then scrollIntoView.
  // Uses posts.length as trigger so it fires when each page's data arrives (reset=false doesn't set loading=true).
  useEffect(() => {
    if (loading || scrollDoneRef.current || !scrollTargetRef.current || autoLoadingRef.current) return;
    const { uid, targetPage } = scrollTargetRef.current;

    if (page < targetPage && page < totalPages) {
      // Need to load the next page before we can scroll
      autoLoadingRef.current = true;
      const next = page + 1;
      setPage(next);
      fetchPosts(sort, activeTag, next, false).then(() => {
        autoLoadingRef.current = false;
        // posts.length change re-triggers this effect
      });
    } else {
      // All needed pages loaded — find card and scroll to it
      scrollDoneRef.current = true;
      sessionStorage.removeItem("scroll:community-feed");
      scrollTargetRef.current = null;
      requestAnimationFrame(() => {
        const el = document.getElementById(`post-${uid}`);
        if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
      });
    }
  }, [loading, page, posts.length, totalPages, sort, activeTag, fetchPosts]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(sort, activeTag, next, false);
  };

  const handleLikeChange = (uid: string, liked: boolean, likes_count: number) => {
    setPosts((prev) => prev.map((p) => (p.post_uid === uid ? { ...p, liked_by_me: liked, likes_count } : p)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* ── Hero ───────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-br from-blue-600 via-violet-600 to-indigo-700 rounded-3xl px-8 py-10 text-white relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black mb-2">{t("title")}</h1>
                <p className="text-white/80 text-sm sm:text-base">{t("subtitle")}</p>
                {stats && (
                  <div className="flex flex-wrap gap-5 mt-4 text-sm text-white/90">
                    <span className="flex items-center gap-1.5">
                      <PenSquare size={16} /> {stats.total_posts} {t("posts_count")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={16} /> {stats.total_users} {locale === "zh" ? "开发者" : "Developers"}
                    </span>
                  </div>
                )}
              </div>
              {user ? (
                <Link
                  href={`/${locale}/community/posts/new`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-black rounded-full hover:shadow-xl hover:scale-105 transition-all flex-shrink-0"
                >
                  <PenSquare size={18} />
                  {t("new_post")}
                </Link>
              ) : (
                <Link
                  href={`/${locale}/auth/login`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/30 text-white font-bold rounded-full hover:bg-white/20 transition-all flex-shrink-0"
                >
                  {t("login_to_post")}
                </Link>
              )}
            </div>
          </div>
        </motion.header>

        {/* ── Layout: main feed + right rail ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          {/* Feed */}
          <section>
            {/* Sort tabs */}
            <div className="flex items-center gap-2 mb-5 overflow-x-auto scrollbar-hide">
              <SortTab active={sort === "latest"} onClick={() => setSort("latest")} icon={<Clock size={14} />} label={t("latest")} />
              <SortTab active={sort === "hot"} onClick={() => setSort("hot")} icon={<Flame size={14} />} label={t("hot")} />
              <SortTab active={sort === "top"} onClick={() => setSort("top")} icon={<TrendingUp size={14} />} label={t("top")} />
              {activeTag && (
                <button
                  onClick={() => setActiveTag(null)}
                  className="ml-auto text-xs font-semibold text-blue-600 hover:underline flex-shrink-0"
                >
                  #{activeTag} ✕
                </button>
              )}
            </div>

            {/* Posts grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-56" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <span className="text-6xl block mb-4">📝</span>
                <p className="font-semibold text-gray-600">{t("empty_posts")}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {posts.map((p) => (
                    <PostCard
                      key={p.post_uid}
                      post={p}
                      locale={locale}
                      onLikeChange={handleLikeChange}
                      onNavigate={() =>
                        sessionStorage.setItem(
                          "scroll:community-feed",
                          JSON.stringify({ uid: p.post_uid, targetPage: page })
                        )
                      }
                    />
                  ))}
                </div>
                {page < totalPages && (
                  <div className="text-center mt-8">
                    <button
                      onClick={handleLoadMore}
                      className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-full transition-colors"
                    >
                      {locale === "zh" ? "加载更多" : "Load More"}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Right rail */}
          <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            {/* Tags */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-black text-gray-900 mb-3 flex items-center gap-1.5">
                <TrendingUp size={15} className="text-blue-500" /> {t("all_tags")}
              </h3>
              {tags.length === 0 ? (
                <p className="text-xs text-gray-400">—</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(showAllTags ? tags : tags.slice(0, TAGS_INITIAL)).map(({ tag, count }) => (
                      <button
                        key={tag}
                        onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                          activeTag === tag
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                        }`}
                      >
                        #{tag}
                        <span className="ml-1 opacity-60">{count}</span>
                      </button>
                    ))}
                  </div>
                  {tags.length > TAGS_INITIAL && (
                    <button
                      onClick={() => setShowAllTags((v) => !v)}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      {showAllTags ? (
                        <><ChevronUp size={12} />{locale === "zh" ? "收起" : "Show less"}</>
                      ) : (
                        <><ChevronDown size={12} />{locale === "zh" ? `查看更多 (${tags.length - TAGS_INITIAL}+)` : `More (${tags.length - TAGS_INITIAL}+)`}</>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Leaderboard teaser */}
            <Link
              href={`/${locale}/community/leaderboard`}
              className="block bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-5 hover:shadow-md transition-shadow"
            >
              <h3 className="font-black text-amber-900 mb-1 flex items-center gap-1.5">
                🏆 {t("leaderboard")}
              </h3>
              <p className="text-xs text-amber-700/80">
                {locale === "zh" ? "查看贡献榜 →" : "See top contributors →"}
              </p>
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SortTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
        active
          ? "bg-gray-900 text-white shadow"
          : "text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
