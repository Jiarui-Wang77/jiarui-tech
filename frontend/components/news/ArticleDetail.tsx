"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Eye, ArrowLeft, MessageCircle, Send, Share2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { articlesApi, type Article, type ArticleListItem, type Comment } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import ArticleCard from "./ArticleCard";
import ArticleCommentThread from "./ArticleCommentThread";
import Button from "@/components/ui/Button";
import { formatDate, getCategoryName } from "@/lib/utils";
import JunoContextPanel from "@/components/juno/JunoContextPanel";

type Props = { article: Article; locale: string };

// 纯文本 → HTML 段落转换（仅对无块级标签的内容生效，已有 HTML 原样保留）
// 单个换行或多个换行都视为段落分隔，无需手动添加空行
function renderContent(text: string): string {
  if (!text) return "";
  if (/<(p|br|h[1-6]|ul|ol|li|div|blockquote|img)\b/i.test(text)) return text;
  return text
    .split(/\n+/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para}</p>`)
    .join("");
}

export default function ArticleDetail({ article, locale }: Props) {
  const t = useTranslations("article");
  const router = useRouter();
  const { user } = useAuthStore();

  const [comments, setComments] = useState<Comment[]>([]);
  const [recommended, setRecommended] = useState<ArticleListItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"zh" | "en">(locale as "zh" | "en");
  const [junoOpen, setJunoOpen] = useState(false);
  // portalReady: true only after client hydration — createPortal needs document.body
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => { setPortalReady(true); }, []);

  const title = activeTab === "zh" ? article.title_zh : article.title_en;
  const content = renderContent(activeTab === "zh" ? article.content_zh : article.content_en);
  const deepAnalysis = activeTab === "zh" ? article.deep_analysis_zh : article.deep_analysis_en;
  const categoryName = article.category ? getCategoryName(article.category, activeTab) : "";

  useEffect(() => {
    articlesApi.getComments(article.article_uid).then((r) => setComments(r.data)).catch(() => {});
    articlesApi.getRecommended(article.id).then((r) => setRecommended(r.data)).catch(() => {});
  }, [article.article_uid, article.id]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await articlesApi.postComment(article.article_uid, commentText.trim());
      setComments((prev) => [...prev, res.data]);
      setCommentText("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: number, content: string) => {
    const res = await articlesApi.postComment(article.article_uid, content, parentId);
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...c.replies, res.data] } : c
      )
    );
  };

  const handleDeleteComment = async (commentId: number) => {
    await articlesApi.deleteComment(article.article_uid, commentId);
    const markDeleted = (list: Comment[]): Comment[] =>
      list.map((c) => {
        if (c.id === commentId) return { ...c, is_deleted: true, content: "", replies: c.replies };
        return { ...c, replies: markDeleted(c.replies) };
      });
    setComments((prev) => markDeleted(prev));
  };

  const handleLikeChange = (commentId: number, liked: boolean, count: number) => {
    const update = (list: Comment[]): Comment[] =>
      list.map((c) => {
        if (c.id === commentId) return { ...c, liked_by_me: liked, likes_count: count };
        return { ...c, replies: update(c.replies) };
      });
    setComments((prev) => update(prev));
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert(activeTab === "zh" ? "链接已复制" : "Link copied");
    } catch {
      // no-op
    }
  };

  // Rough reading time (assume 300 zh chars/min or 200 en words/min)
  const readMinutes = Math.max(
    1,
    activeTab === "zh"
      ? Math.round(content.replace(/<[^>]+>/g, "").length / 300)
      : Math.round(content.replace(/<[^>]+>/g, "").split(/\s+/).length / 200)
  );

  return (
    <article className="bg-white">
      {/* ══════════════════════════════════════════════════════════════
          HERO — 大标题 + 分类 + 元信息（AP News 风格）
          ══════════════════════════════════════════════════════════════ */}
      <header className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
        {/* Back link */}
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push(`/${locale}/news/all`);
            }
          }}
          className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 mb-8 transition-colors font-semibold uppercase tracking-wider"
        >
          <ArrowLeft size={14} />
          {t("back_home")}
        </button>

        {/* Language tabs — subtle, top right */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-[11px] font-black tracking-[0.25em] text-blue-600 uppercase">
            {categoryName}
          </span>
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
            <button
              onClick={() => setActiveTab("zh")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activeTab === "zh"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              中文
            </button>
            <button
              onClick={() => setActiveTab("en")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activeTab === "en"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* 超大标题 */}
        <h1
          className="font-black text-gray-900 leading-[1.08] tracking-tight mb-6"
          style={{ fontSize: "clamp(2rem, 5vw, 3.75rem)" }}
        >
          {title}
        </h1>

        {/* 副标题 / dek — 深度分析可作为副标 */}
        {deepAnalysis && (
          <p className="text-lg sm:text-xl text-gray-600 leading-snug mb-8 font-medium max-w-3xl">
            {deepAnalysis.replace(/<[^>]+>/g, "").slice(0, 180)}
            {deepAnalysis.replace(/<[^>]+>/g, "").length > 180 ? "…" : ""}
          </p>
        )}

        {/* Byline row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-semibold">
            <span className="uppercase tracking-wider">
              BY <span className="text-gray-900">JIARUI TECH</span>
            </span>
            <span className="text-gray-300">|</span>
            {article.published_at && (
              <>
                <span className="uppercase tracking-wider">
                  {formatDate(article.published_at, activeTab)}
                </span>
                <span className="text-gray-300">|</span>
              </>
            )}
            <span className="uppercase tracking-wider">
              {readMinutes} {activeTab === "zh" ? "分钟阅读" : `min read`}
            </span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {article.view_count.toLocaleString()}
            </span>
            <span className="font-mono text-[10px] text-gray-400 normal-case tracking-normal ml-auto sm:ml-0">
              {article.article_uid}
            </span>
          </div>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-wider"
          >
            <Share2 size={13} />
            {activeTab === "zh" ? "分享" : "Share"}
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════
          COVER — 全宽大图
          ══════════════════════════════════════════════════════════════ */}
      {article.cover_image_url && (
        <figure className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <div className="relative aspect-[16/9] rounded-sm overflow-hidden bg-gray-100">
            <Image
              src={article.cover_image_url}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
              priority
            />
          </div>
        </figure>
      )}

      {/* ══════════════════════════════════════════════════════════════
          BODY — 护眼宽度 740px，专业新闻排版
          ══════════════════════════════════════════════════════════════ */}
      <div className="max-w-[740px] mx-auto px-4 sm:px-6 pb-16">
        <div
          className="article-body article-body-ap"
          style={{ whiteSpace: "pre-wrap" }}
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* ═══════════════════════════════════════════════════════════
            DEEP ANALYSIS — 明显的分隔标志（装饰性分隔线 + 醒目标题块）
            ═══════════════════════════════════════════════════════════ */}
        {deepAnalysis && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20"
          >
            {/* 装饰分隔线 — 居中、菱形点缀 */}
            <div className="flex items-center justify-center gap-4 mb-10" aria-hidden="true">
              <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-gray-300 to-gray-900" />
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rotate-45 bg-gray-900" />
                <span className="w-2 h-2 rotate-45 bg-gray-900" />
                <span className="w-1.5 h-1.5 rotate-45 bg-gray-900" />
              </div>
              <div className="flex-1 h-[2px] bg-gradient-to-l from-transparent via-gray-300 to-gray-900" />
            </div>

            {/* 醒目标题区 — 黑底白字章节头 */}
            <div className="relative bg-gradient-to-br from-slate-900 to-black rounded-2xl p-7 sm:p-9 mb-10 overflow-hidden">
              {/* 微光装饰 */}
              <div className="absolute top-0 right-0 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">🔬</span>
                  <span className="text-[11px] font-black tracking-[0.4em] text-cyan-400 uppercase">
                    {activeTab === "zh" ? "专家视角" : "Expert View"}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {t("deep_analysis")}
                </h2>
              </div>
            </div>

            {/* 深度分析正文 */}
            <div
              className="article-body article-body-ap"
              style={{ whiteSpace: "pre-wrap" }}
              dangerouslySetInnerHTML={{ __html: renderContent(deepAnalysis ?? "") }}
            />

            {/* 底部装饰分隔线 */}
            <div className="flex items-center justify-center gap-4 mt-12" aria-hidden="true">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] font-black tracking-[0.3em] text-gray-400 uppercase">
                — END —
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </motion.section>
        )}

        {/* Comments */}
        <section className="mt-16 pt-10 border-t border-gray-200">
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
            <MessageCircle size={22} />
            {t("comments")}
            <span className="text-sm font-normal text-gray-400">({comments.length})</span>
          </h2>

          {user ? (
            <form onSubmit={handleCommentSubmit} className="mb-8">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={t("comment_placeholder")}
                    rows={3}
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      type="submit"
                      size="sm"
                      loading={submitting}
                      disabled={!commentText.trim()}
                    >
                      <Send size={14} />
                      {t("comment_submit")}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="mb-8 p-4 bg-gray-50 rounded-xl text-sm text-gray-500 text-center">
              <Link
                href={`/${locale}/auth/login`}
                className="text-blue-600 font-semibold hover:underline"
              >
                {activeTab === "zh" ? "登录" : "Sign in"}
              </Link>{" "}
              {activeTab === "zh" ? "后参与评论" : "to join the discussion"}
            </div>
          )}

          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {activeTab === "zh" ? "暂无评论，来发表第一条吧" : "No comments yet — be the first!"}
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {comments.map((comment) => (
                <ArticleCommentThread
                  key={comment.id}
                  comment={comment}
                  articleUid={article.article_uid}
                  locale={activeTab}
                  onDelete={handleDeleteComment}
                  onReply={handleReply}
                  onLikeChange={handleLikeChange}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Juno floating ask button + context panel
          Rendered via Portal → document.body so that any CSS transform
          on ancestor elements (e.g. page-enter animation on <main>)
          cannot break position:fixed layout.
          ══════════════════════════════════════════════════════════════ */}
      {portalReady && createPortal(
        <>
          <button
            onClick={() => setJunoOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-neutral-900 hover:bg-neutral-700 text-white rounded-full shadow-xl text-sm font-bold transition-all duration-200 hover:scale-105 group"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06)" }}
            aria-label="Ask Juno AI"
          >
            <Sparkles
              size={15}
              className="text-violet-400 group-hover:text-violet-300 transition-colors"
            />
            <span className="hidden sm:inline">
              {activeTab === "zh" ? "问问 Juno" : "Ask Juno"}
            </span>
          </button>

          <JunoContextPanel
            isOpen={junoOpen}
            onClose={() => setJunoOpen(false)}
            mode="ask"
            contextText={`正在阅读文章：《${title}》\n\n文章摘要：${content
              .replace(/<[^>]+>/g, "")
              .slice(0, 600)}`}
            locale={activeTab}
            theme="light"
          />
        </>,
        document.body
      )}

      {/* ══════════════════════════════════════════════════════════════
          Related — 全宽推荐新闻 (MORE NEWS)
          ══════════════════════════════════════════════════════════════ */}
      {recommended.length > 0 && (
        <section className="border-t border-gray-200 bg-gray-50/50 py-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <Link
                href={`/${locale}/news/all`}
                className="text-xs font-black tracking-[0.25em] uppercase text-gray-900 hover:text-blue-600 transition-colors"
              >
                {activeTab === "zh" ? "更多新闻 →" : "More News →"}
              </Link>
              <Link
                href={`/${locale}`}
                className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-wider"
              >
                {activeTab === "zh" ? "返回首页 →" : "Back to Home →"}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommended.slice(0, 4).map((rec, i) => (
                <ArticleCard key={rec.article_uid} article={rec} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
