"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { articlesApi, type ArticleListItem } from "@/lib/api";
import ArticleCard from "./ArticleCard";
import CategoryMenu from "./CategoryMenu";
import Button from "@/components/ui/Button";

type Props = {
  locale: string;
  category?: string;
};

export default function NewsSection({ locale, category = "all" }: Props) {
  const t = useTranslations("home");
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // uid of the article to scroll to after restoration (null = no restore needed)
  const restoreUid = useRef<string | null>(null);
  const isFirstMount = useRef(true);
  const scrollKey = `news_scroll_${locale}_${category}`;

  const fetchArticles = useCallback(
    async (pageNum: number, reset: boolean) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await articlesApi.list({
          page: pageNum,
          page_size: 12,
          category: category !== "all" ? category : undefined,
          search: searchQuery || undefined,
        });
        setTotalPages(res.data.total_pages);
        setArticles((prev) => (reset ? res.data.items : [...prev, ...res.data.items]));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category, searchQuery]
  );

  // On first mount, check sessionStorage for a back-navigation restore request
  useEffect(() => {
    if (!isFirstMount.current) return;
    isFirstMount.current = false;

    const saved = sessionStorage.getItem(scrollKey);
    if (saved) {
      sessionStorage.removeItem(scrollKey);
      try {
        const { uid, page: savedPage } = JSON.parse(saved) as {
          uid: string;
          page: number;
        };
        restoreUid.current = uid;
        const pageCount = Math.max(1, savedPage);

        setLoading(true);
        Promise.all(
          Array.from({ length: pageCount }, (_, i) =>
            articlesApi.list({
              page: i + 1,
              page_size: 12,
              category: category !== "all" ? category : undefined,
              search: searchQuery || undefined,
            })
          )
        )
          .then((responses) => {
            setTotalPages(responses[responses.length - 1]?.data.total_pages ?? 1);
            setArticles(responses.flatMap((r) => r.data.items));
            setPage(pageCount);
          })
          .catch(() => {
            restoreUid.current = null;
            fetchArticles(1, true);
          })
          .finally(() => setLoading(false));
        return;
      } catch {
        // corrupt entry — fall through to normal load
      }
    }

    setPage(1);
    fetchArticles(1, true);
  }, [fetchArticles]); // eslint-disable-line react-hooks/exhaustive-deps

  // After loading finishes, scroll the saved article element into view
  useEffect(() => {
    if (loading || restoreUid.current === null) return;
    const uid = restoreUid.current;
    restoreUid.current = null;

    // Use rAF to ensure the DOM has been painted before scrolling
    requestAnimationFrame(() => {
      const el = document.getElementById(`article-card-${uid}`);
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "center" });
      }
    });
  }, [loading]);

  // Called on each article card click — save uid + page count
  const saveScrollState = useCallback(
    (uid: string) => {
      sessionStorage.setItem(scrollKey, JSON.stringify({ uid, page }));
    },
    [scrollKey, page]
  );

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchArticles(next, false);
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8 h-10 bg-gray-100 rounded-full w-96 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-72 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 overflow-x-auto">
        <CategoryMenu activeCategory={category} />
      </div>

      {searchQuery && (
        <p className="text-sm text-gray-500 mb-6">
          {locale === "zh"
            ? `搜索 "${searchQuery}" 的结果：${articles.length} 篇`
            : `Results for "${searchQuery}": ${articles.length} articles`}
        </p>
      )}

      {articles.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-medium">{t("no_articles")}</p>
        </div>
      ) : (
        <>
          {/* Featured first article */}
          {articles[0] && (
            <div
              id={`article-card-${articles[0].article_uid}`}
              className="mb-6 scroll-mt-24"
              onClick={() => saveScrollState(articles[0].article_uid)}
            >
              <ArticleCard article={articles[0]} featured index={0} prefetchOnMount />
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.slice(1).map((article, i) => (
              <div
                key={article.article_uid}
                id={`article-card-${article.article_uid}`}
                className="scroll-mt-24"
                onClick={() => saveScrollState(article.article_uid)}
              >
                <ArticleCard article={article} index={i + 1} prefetchOnMount={i < 3} />
              </div>
            ))}
          </div>

          {page < totalPages && (
            <div className="flex justify-center mt-12">
              <Button
                variant="secondary"
                size="lg"
                loading={loadingMore}
                onClick={handleLoadMore}
              >
                {t("load_more")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
