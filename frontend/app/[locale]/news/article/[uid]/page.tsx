import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/navbar/Navbar";
import ArticleDetail from "@/components/news/ArticleDetail";

type Props = { params: Promise<{ locale: string; uid: string }> };

async function fetchArticle(uid: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${apiUrl}/api/articles/${uid}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, uid } = await params;
  const article = await fetchArticle(uid);
  if (!article) return { title: "Article Not Found" };
  return {
    title: locale === "zh" ? article.title_zh : article.title_en,
    description: (locale === "zh" ? article.content_zh : article.content_en).slice(0, 160),
    openGraph: {
      images: article.cover_image_url ? [article.cover_image_url] : [],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { locale, uid } = await params;
  const article = await fetchArticle(uid);

  if (!article) notFound();

  return (
    <main className="min-h-screen bg-white page-enter">
      <Navbar />
      <div className="pt-[72px]">
        <ArticleDetail article={article} locale={locale} />
      </div>
    </main>
  );
}
