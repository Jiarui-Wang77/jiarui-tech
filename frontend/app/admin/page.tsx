"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Eye, PlusCircle, TrendingUp } from "lucide-react";
import { adminApi, type ArticleListResponse } from "@/lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState<{
    total: number;
    published: number;
    draft: number;
    totalViews: number;
  } | null>(null);
  const [recentArticles, setRecentArticles] = useState<ArticleListResponse["items"]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.listArticles({ page: 1 }),
      adminApi.listArticles({ page: 1, status: "published" }),
      adminApi.listArticles({ page: 1, status: "draft" }),
    ])
      .then(([all, published, draft]) => {
        const totalViews = all.data.items.reduce((sum, a) => sum + a.view_count, 0);
        setStats({
          total: all.data.total,
          published: published.data.total,
          draft: draft.data.total,
          totalViews,
        });
        setRecentArticles(all.data.items.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Total Articles", value: stats?.total ?? "—", icon: FileText, color: "blue" },
    { label: "Published", value: stats?.published ?? "—", icon: TrendingUp, color: "green" },
    { label: "Drafts", value: stats?.draft ?? "—", icon: FileText, color: "yellow" },
    { label: "Total Views", value: stats?.totalViews.toLocaleString() ?? "—", icon: Eye, color: "violet" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back to the CMS</p>
        </div>
        <Link
          href="/admin/articles/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          <PlusCircle size={17} />
          New Article
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className={`inline-flex p-2.5 rounded-xl mb-3 ${colorMap[card.color]}`}>
              <card.icon size={20} />
            </div>
            <div className="text-3xl font-black text-gray-900">{loading ? "..." : card.value}</div>
            <div className="text-sm text-gray-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Recent articles */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Recent Articles</h2>
          <Link href="/admin/articles" className="text-sm text-blue-600 hover:underline font-medium">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex gap-4 animate-pulse">
                  <div className="flex-1 h-5 bg-gray-100 rounded" />
                  <div className="w-20 h-5 bg-gray-100 rounded" />
                </div>
              ))
            : recentArticles.map((article) => (
                <div key={article.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{article.title_zh}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{article.article_uid}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      article.status === "published"
                        ? "bg-green-50 text-green-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {article.status}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1 w-16 justify-end">
                    <Eye size={12} /> {article.view_count}
                  </span>
                  <Link
                    href={`/admin/articles/${article.id}/edit`}
                    className="text-xs text-blue-600 hover:underline font-medium ml-2"
                  >
                    Edit
                  </Link>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
