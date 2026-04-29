import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateStr));
}

export function getArticleTitle(article: { title_zh: string; title_en: string }, locale: string) {
  return locale === "zh" ? article.title_zh : article.title_en;
}

export function getArticleContent(
  article: { content_zh: string; content_en: string },
  locale: string
) {
  return locale === "zh" ? article.content_zh : article.content_en;
}

export function getCategoryName(
  category: { name_zh: string; name_en: string } | null | undefined,
  locale: string
) {
  if (!category) return "";
  return locale === "zh" ? category.name_zh : category.name_en;
}

/** Relative time: "5m ago" / "2h ago" / "3d ago" / full date after 14 days. */
export function timeAgo(dateStr: string, locale: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  const isZh = locale === "zh";

  if (diffSec < 60) return isZh ? "刚刚" : "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isZh ? `${diffMin} 分钟前` : `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return isZh ? `${diffHr} 小时前` : `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 14) return isZh ? `${diffDay} 天前` : `${diffDay}d ago`;
  return formatDate(dateStr, locale);
}
