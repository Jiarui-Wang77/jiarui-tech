"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { adminApi, type Article } from "@/lib/api";
import ArticleEditor from "@/components/admin/ArticleEditor";

type PageProps = { params: Promise<{ id: string }> };

export default function EditArticlePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    adminApi
      .getArticle(Number(id))
      .then((res) => setArticle(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-100 rounded" />
        <div className="h-64 bg-gray-100 rounded-2xl mt-6" />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">Article not found.</p>
        <button
          onClick={() => router.push("/admin/articles")}
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          ← Back to articles
        </button>
      </div>
    );
  }

  return <ArticleEditor mode="edit" article={article} />;
}
