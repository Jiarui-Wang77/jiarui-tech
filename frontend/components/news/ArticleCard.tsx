"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Eye, Clock } from "lucide-react";
import { motion } from "framer-motion";
import type { ArticleListItem } from "@/lib/api";
import { cn, formatDate, getArticleTitle, getCategoryName } from "@/lib/utils";

type Props = {
  article: ArticleListItem;
  featured?: boolean;
  index?: number;
  prefetchOnMount?: boolean;
};

export default function ArticleCard({ article, featured = false, index = 0, prefetchOnMount = false }: Props) {
  const locale   = useLocale();
  const t        = useTranslations("home");
  const router   = useRouter();
  const [going, setGoing] = useState(false);

  const title        = getArticleTitle(article, locale);
  const categoryName = getCategoryName(article.category, locale);
  const href         = `/${locale}/news/article/${article.article_uid}`;

  // For high-priority cards (first few in the list), prefetch immediately on mount
  // so the page is ready before the user even moves the mouse.
  useEffect(() => {
    if (prefetchOnMount) router.prefetch(href);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch for all other cards when the user hovers.
  const handleMouseEnter = useCallback(() => {
    router.prefetch(href);
  }, [router, href]);

  // Navigate programmatically so we can flip `going` before the router
  // starts — this gives INSTANT visual feedback on every click.
  const handleClick = useCallback(() => {
    if (going) return;
    setGoing(true);
    router.push(href);
  }, [going, router, href]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.975 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={cn(
        "group relative bg-white rounded-2xl overflow-hidden border border-gray-100",
        "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer select-none",
        featured && "md:flex",
        going && "opacity-60"
      )}
    >
      {/* ── Instant loading overlay — appears in the same frame as the click ── */}
      {going && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/40 backdrop-blur-[2px]">
          <div className="h-7 w-7 rounded-full border-[2.5px] border-blue-600 border-t-transparent animate-spin" />
        </div>
      )}

      {/* ── Cover image ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "relative overflow-hidden bg-gray-100",
          featured ? "md:w-2/5 md:flex-shrink-0 h-52 md:h-auto" : "h-48"
        )}
      >
        {article.cover_image_url ? (
          <Image
            src={article.cover_image_url}
            alt={title}
            fill
            sizes={
              featured
                ? "(max-width: 768px) 100vw, 40vw"
                : "(max-width: 768px) 100vw, 33vw"
            }
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center">
            <span className="text-4xl font-black text-blue-200 select-none">
              {article.category?.slug.toUpperCase() ?? "NEWS"}
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-full text-gray-700">
            {categoryName}
          </span>
        </div>
      </div>

      {/* ── Text content ─────────────────────────────────────────────── */}
      <div className={cn("p-5 flex flex-col", featured && "md:p-7 justify-center")}>
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <span className="font-mono text-blue-400">{article.article_uid}</span>
          {article.published_at && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {formatDate(article.published_at, locale)}
              </span>
            </>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <Eye size={11} />
            {article.view_count.toLocaleString()}
          </span>
        </div>

        <h2
          className={cn(
            "font-black leading-snug text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2",
            featured ? "text-2xl" : "text-lg"
          )}
        >
          {title}
        </h2>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {article.author?.username?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <span className="text-xs font-medium text-gray-600">
              {article.author?.username ?? ""}
            </span>
          </div>
          <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-800 flex items-center gap-1">
            {t("read_more")} →
          </span>
        </div>
      </div>
    </motion.article>
  );
}
