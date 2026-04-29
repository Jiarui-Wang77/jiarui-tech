"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Trash2, PlusCircle, Filter } from "lucide-react";
import { adminApi, type ArticleListItem } from "@/lib/api";
import Button from "@/components/ui/Button";

type StatusFilter = "all" | "published" | "draft";

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi
      .listArticles({ page, status: statusFilter !== "all" ? statusFilter : undefined })
      .then((res) => {
        setArticles(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.total_pages);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await adminApi.deleteArticle(id);
      setArticles((prev) => prev.filter((a) => a.id !== id));
      setTotal((t) => t - 1);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Articles</h1>
          <p className="text-sm text-gray-500 mt-1">{total} articles total</p>
        </div>
        <Link
          href="/admin/articles/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          <PlusCircle size={17} />
          New Article
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <Filter size={15} className="text-gray-400" />
        {(["all", "published", "draft"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${
              statusFilter === s ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Article</th>
              <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
              <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Views</th>
              <th className="text-right px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-3/4 mb-1" /><div className="h-3 bg-gray-100 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-5 bg-gray-100 rounded-full w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-12 ml-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              : articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-sm text-gray-900 max-w-xs truncate">{article.title_zh}</p>
                      <p className="text-xs text-blue-400 font-mono mt-0.5">{article.article_uid}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                        {article.category?.name_zh ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          article.status === "published"
                            ? "bg-green-50 text-green-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {article.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm text-gray-500 flex items-center justify-end gap-1">
                        <Eye size={13} /> {article.view_count}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/articles/${article.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(article.id, article.title_zh)}
                          disabled={deleting === article.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
