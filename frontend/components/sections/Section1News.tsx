"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Eye, Clock, Search, X, ArrowRight } from "lucide-react";
import { articlesApi, type ArticleListItem } from "@/lib/api";
import { formatDate, getArticleTitle, getCategoryName } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";

type Props = { locale: string };

const CATEGORIES = [
  { slug: "all", zh: "全部", en: "All" },
  { slug: "ai", zh: "AI", en: "AI" },
  { slug: "tech", zh: "科技", en: "Tech" },
  { slug: "finance", zh: "金融", en: "Finance" },
  { slug: "product", zh: "产品", en: "Product" },
  { slug: "life", zh: "生活", en: "Lifestyle" },
];

const PAGE_SIZE = 5; // 1 featured + 4 grid items

export default function Section1News({ locale }: Props) {
  const isZh = locale === "zh";
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState("ai");
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchArticles = useCallback(
    async (cat: string, search?: string) => {
      setLoading(true);
      try {
        const res = await articlesApi.list({
          page: 1,
          page_size: PAGE_SIZE,
          category: cat !== "all" ? cat : undefined,
          search: search || undefined,
        });
        setArticles(res.data.items);
      } catch (err) {
        console.error("fetchArticles error:", err);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchArticles(activeCategory, searchTerm);
  }, [activeCategory, searchTerm, fetchArticles]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
  };

  const featured = articles[0];
  const rest = articles.slice(1);

  const NAVBAR_H = 72;   // matches Navbar h-[72px]
  const SEARCH_H = 64;
  const CAT_H = 52;

  return (
    <section className="min-h-screen bg-white">
      {/* 顶部留白 + 搜索栏 */}
      <div
        style={{ paddingTop: NAVBAR_H, height: NAVBAR_H + SEARCH_H }}
        className="bg-white flex items-center"
      >
        <form onSubmit={handleSearchSubmit} className="w-full flex justify-center px-4 pt-3">
          <div className="relative w-full max-w-2xl group">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
              size={18}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                isZh
                  ? "搜索新闻标题或文章编号（如 JT-202604-XXXXXX）"
                  : "Search by title or article ID (e.g. JT-202604-XXXXXX)"
              }
              className="w-full pl-12 pr-28 py-3 text-sm bg-gray-50 rounded-full border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-[92px] top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="clear"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-full transition-colors shadow-sm"
            >
              {isZh ? "搜索" : "Search"}
            </button>
          </div>
        </form>
      </div>

      {/* 分类栏 */}
      <div
        style={{ height: CAT_H }}
        className="bg-white border-b border-gray-100 flex items-end"
      >
        <div className="w-full flex justify-center gap-1 pb-2 overflow-x-auto scrollbar-hide px-4">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.slug;
            const isAI = cat.slug === "ai";
            const label = isZh ? cat.zh : cat.en;
            return (
              <motion.button
                key={cat.slug}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat.slug)}
                className={[
                  "flex-shrink-0 px-5 py-2 rounded-full text-sm transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-gray-900 text-white font-bold shadow"
                    : isAI
                    ? "font-extrabold hover:bg-gray-100"
                    : "text-gray-500 font-medium hover:bg-gray-100 hover:text-gray-900",
                ].join(" ")}
              >
                {isAI && !isActive ? (
                  <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent text-[15px] italic font-extrabold">
                    {label}
                  </span>
                ) : (
                  label
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          AP TOP NEWS 风格 — 黑色 section header
          ═══════════════════════════════════════════════════════════════ */}
      <div className="relative bg-gradient-to-b from-gray-900 to-black py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tight uppercase">
            {isZh ? "今日头条" : "Top News"}
          </h2>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          主内容区 — 特色 + 网格
          ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <LoadingGrid />
        ) : articles.length === 0 ? (
          <EmptyState
            locale={locale}
            hasSearch={!!searchTerm}
            searchTerm={searchTerm}
            onClear={handleClearSearch}
          />
        ) : (
          <>
            {/* 网格 — 左大右小 4 宫格 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
              {/* 左：Featured */}
              {featured && <FeaturedArticle article={featured} locale={locale} />}

              {/* 右：2x2 网格 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {rest.slice(0, 4).map((article) => (
                  <SmallCard key={article.article_uid} article={article} locale={locale} />
                ))}
                {/* 如果不足 4 篇，显示占位 */}
                {rest.length === 0 &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={`placeholder-${i}`}
                      className="bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs h-48"
                    >
                      {isZh ? "暂无更多新闻" : "No more news"}
                    </div>
                  ))}
              </div>
            </div>

            {/* MORE NEWS */}
            <div className="relative z-10 mt-14 pt-10 border-t border-gray-200 flex flex-col items-center gap-4">
              <p className="text-[11px] font-black tracking-[0.25em] text-blue-600 uppercase">
                {isZh ? "继续阅读" : "Continue Reading"}
              </p>

              {/* 唯一且绝对纯粹的跳转按钮 */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/${locale}/news/all`);
                }}
                className="inline-flex items-center gap-3 px-10 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
              >
                <ArrowRight size={16} />
                <span className="uppercase tracking-wider text-sm">
                  {isZh ? "更多新闻" : "More News"}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Featured Article — 左侧大卡（AP 头条样式）
   ═══════════════════════════════════════════════════════════════════ */
function FeaturedArticle({ article, locale }: { article: ArticleListItem; locale: string }) {
  const title = getArticleTitle(article, locale);
  const categoryName = article.category ? getCategoryName(article.category, locale) : "";

  return (
    <Link
      href={`/${locale}/news/article/${article.article_uid}`}
      className="group block self-start select-none"
      draggable={false}
    >
      <article className="flex flex-col">
        {/* Big cover */}
        <div className="relative w-full aspect-[16/11] overflow-hidden bg-gray-100 rounded-sm mb-5">
          {article.cover_image_url ? (
            <Image
              src={article.cover_image_url}
              alt={title}
              fill
              draggable={false}
              className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-violet-800 flex items-center justify-center">
              <span className="text-7xl font-black text-white/10 select-none">
                {article.category?.slug.toUpperCase() ?? ""}
              </span>
            </div>
          )}
        </div>

        {/* Category label (small, uppercase) */}
        <div className="mb-2">
          <span className="text-[11px] font-black tracking-[0.2em] text-blue-600 uppercase">
            {categoryName}
          </span>
        </div>

        {/* Big title */}
        <h3
          className="font-black text-gray-900 leading-[1.1] tracking-tight mb-3 group-hover:text-blue-700 transition-colors line-clamp-3"
          style={{ fontSize: "clamp(1.6rem, 2.4vw, 2.125rem)" }}
        >
          {title}
        </h3>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 uppercase tracking-wider font-semibold mt-auto">
          {article.published_at && (
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              {formatDate(article.published_at, locale)}
            </span>
          )}
          <span className="font-mono text-[11px] text-gray-400 normal-case tracking-normal">
            {article.article_uid}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye size={12} />
            {article.view_count.toLocaleString()}
          </span>
        </div>
      </article>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Small Card — 右侧小卡（2×2 网格）
   ═══════════════════════════════════════════════════════════════════ */
function SmallCard({ article, locale }: { article: ArticleListItem; locale: string }) {
  const title = getArticleTitle(article, locale);
  const categoryName = article.category ? getCategoryName(article.category, locale) : "";

  return (
    <Link
      href={`/${locale}/news/article/${article.article_uid}`}
      className="group block select-none"
      draggable={false}
    >
      <article className="flex flex-col">
        {/* Cover */}
        <div className="relative w-full aspect-[16/10] overflow-hidden bg-gray-100 rounded-sm mb-3">
          {article.cover_image_url ? (
            <Image
              src={article.cover_image_url}
              alt={title}
              fill
              draggable={false}
              className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
              <span className="text-4xl font-black text-white/15 select-none">
                {article.category?.slug.toUpperCase() ?? ""}
              </span>
            </div>
          )}
        </div>

        {/* Category */}
        <div className="mb-1.5">
          <span className="text-[10px] font-black tracking-[0.2em] text-blue-600 uppercase">
            {categoryName}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-black text-gray-900 leading-snug mb-2 group-hover:text-blue-700 transition-colors line-clamp-3 text-[15px] sm:text-base">
          {title}
        </h4>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 uppercase tracking-wider font-semibold mt-auto">
          {article.published_at && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatDate(article.published_at, locale)}
            </span>
          )}
          <span className="font-mono text-[10px] text-gray-400 normal-case tracking-normal">
            {article.article_uid}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={10} />
            {article.view_count.toLocaleString()}
          </span>
        </div>
      </article>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Loading skeleton (grid shape)
   ═══════════════════════════════════════════════════════════════════ */
function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
      <div className="space-y-4">
        <div className="w-full aspect-[16/11] bg-gray-100 rounded-sm animate-pulse" />
        <div className="h-4 w-1/5 bg-gray-100 rounded animate-pulse" />
        <div className="h-10 w-4/5 bg-gray-100 rounded animate-pulse" />
        <div className="h-10 w-3/5 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="w-full aspect-[16/10] bg-gray-100 rounded-sm animate-pulse" />
            <div className="h-3 w-1/4 bg-gray-100 rounded animate-pulse" />
            <div className="h-5 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-5 w-3/4 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Empty state
   ═══════════════════════════════════════════════════════════════════ */
function EmptyState({
  locale,
  hasSearch,
  searchTerm,
  onClear,
}: {
  locale: string;
  hasSearch: boolean;
  searchTerm: string;
  onClear: () => void;
}) {
  const isZh = locale === "zh";
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">🔍</span>
        <p className="font-semibold text-lg text-gray-600">
          {isZh ? `未找到与 "${searchTerm}" 相关的文章` : `No articles found for "${searchTerm}"`}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          {isZh ? "换个关键词试试，或清空搜索浏览全部" : "Try a different keyword, or clear search to browse all"}
        </p>
        <button
          onClick={onClear}
          className="mt-5 px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-full transition-colors"
        >
          {isZh ? "清空搜索" : "Clear Search"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-6xl mb-4">📭</span>
      <p className="font-semibold text-lg text-gray-500">
        {isZh ? "还没有新闻，敬请期待" : "No news yet — stay tuned"}
      </p>
      <p className="text-sm text-gray-400 mt-1">
        {isZh ? "编辑部正在精选中，每日定期发布" : "Our editorial team publishes daily"}
      </p>
      {isAdmin && (
        <Link
          href="/admin/articles/new"
          className="mt-5 text-blue-600 hover:underline text-sm font-medium"
        >
          {isZh ? "前往发布 →" : "Publish now →"}
        </Link>
      )}
    </div>
  );
}
