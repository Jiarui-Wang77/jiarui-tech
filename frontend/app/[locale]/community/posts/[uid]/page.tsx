"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Eye, ArrowLeft, Trash2, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import CommentThread from "@/components/community/CommentThread";
import { postsApi, type Post, type PostComment } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { timeAgo } from "@/lib/utils";

type PageProps = { params: Promise<{ locale: string; uid: string }> };

// ── Image carousel ────────────────────────────────────────────────────────────
function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const total = images.length;

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    setIdx((i) => (i - 1 + total) % total);
  };
  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    setIdx((i) => (i + 1) % total);
  };

  if (total === 1) {
    return (
      <div className="relative w-full aspect-[16/9] bg-gray-100">
        <Image src={images[0]} alt={alt} fill className="object-cover" sizes="100vw" unoptimized priority />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden group">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image src={images[idx]} alt={`${alt} ${idx + 1}`} fill className="object-cover" sizes="100vw" unoptimized priority={idx === 0} />
        </motion.div>
      </AnimatePresence>

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
        aria-label="previous image"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
        aria-label="next image"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.preventDefault(); setIdx(i); }}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/50 hover:bg-white/75"}`}
            aria-label={`go to image ${i + 1}`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-3 right-3 z-10 bg-black/50 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
        {idx + 1} / {total}
      </div>
    </div>
  );
}

export default function PostDetailPage({ params }: PageProps) {
  const { uid } = use(params);
  const t = useTranslations("community");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);

  const fetchPost = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        postsApi.get(uid),
        postsApi.getComments(uid),
      ]);
      setPost(pRes.data);
      setComments(cRes.data);
    } catch {
      // not found or server err → redirect
      router.replace(`/${locale}/community`);
    } finally {
      setLoading(false);
    }
  }, [uid, router, locale]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleToggleLike = async () => {
    if (!user) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    if (!post || likeBusy) return;
    setLikeBusy(true);
    const nextLiked = !post.liked_by_me;
    setPost({ ...post, liked_by_me: nextLiked, likes_count: post.likes_count + (nextLiked ? 1 : -1) });
    try {
      const res = await postsApi.toggleLike(uid);
      setPost((p) => (p ? { ...p, liked_by_me: res.data.liked, likes_count: res.data.likes_count } : p));
    } catch {
      setPost((p) =>
        p ? { ...p, liked_by_me: !nextLiked, likes_count: p.likes_count + (nextLiked ? -1 : 1) } : p
      );
    } finally {
      setLikeBusy(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    const v = commentText.trim();
    if (!v || submitting) return;
    setSubmitting(true);
    try {
      const res = await postsApi.postComment(uid, { content: v });
      // Add to top-level list (new top-level comment)
      setComments((prev) => [...prev, res.data]);
      if (post) setPost({ ...post, comments_count: post.comments_count + 1 });
      setCommentText("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: number, content: string) => {
    if (!user) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    const res = await postsApi.postComment(uid, { content, parent_id: parentId });
    // Attach to parent in local state
    setComments((prev) =>
      prev.map((c) => (c.id === parentId ? { ...c, replies: [...c.replies, res.data] } : c))
    );
    if (post) setPost({ ...post, comments_count: post.comments_count + 1 });
  };

  const handleDeleteComment = async (commentId: number) => {
    await postsApi.deleteComment(commentId);
    // Mark as deleted locally (soft delete)
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) return { ...c, is_deleted: true, content: "" };
        return {
          ...c,
          replies: c.replies.map((r) =>
            r.id === commentId ? { ...r, is_deleted: true, content: "" } : r
          ),
        };
      })
    );
    if (post && post.comments_count > 0) setPost({ ...post, comments_count: post.comments_count - 1 });
  };

  const handleLikeComment = (commentId: number, liked: boolean, count: number) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) return { ...c, liked_by_me: liked, likes_count: count };
        return {
          ...c,
          replies: c.replies.map((r) =>
            r.id === commentId ? { ...r, liked_by_me: liked, likes_count: count } : r
          ),
        };
      })
    );
  };

  const handleDeletePost = async () => {
    if (!post) return;
    await postsApi.delete(post.post_uid);
    router.replace(`/${locale}/community`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert(locale === "zh" ? "链接已复制" : "Link copied");
    } catch {
      // no-op
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 pt-28 space-y-4">
          <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!post) return null;

  const isOwner = user && (user.id === post.author.id || user.role === "admin");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <Link
          href={`/${locale}/community`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 font-medium"
        >
          <ArrowLeft size={15} /> {t("back_to_feed")}
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm"
        >
          {/* Cover / Carousel */}
          {(post.images?.length > 0 || post.cover_image_url) && (
            <ImageCarousel
              images={post.images?.length > 0 ? post.images : [post.cover_image_url!]}
              alt={post.title}
            />
          )}

          <div className="p-6 sm:p-8">
            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4 leading-tight">
              {post.title}
            </h1>

            {/* Meta row */}
            <div className="flex items-center justify-between pb-5 border-b border-gray-100 mb-5">
              <Link
                href={`/${locale}/community/users/${post.author.username}`}
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
                  {post.author.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {post.author.username}
                  </p>
                  <p className="text-xs text-gray-400">
                    {timeAgo(post.created_at, locale)} · <Eye size={10} className="inline" />{" "}
                    {post.views_count} {t("views")}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-1">
                {isOwner && (
                <AnimatePresence mode="wait">
                  {confirmDeletePost ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2 bg-white border border-red-100 rounded-2xl px-3 py-1.5 shadow-lg shadow-red-500/10 mr-1"
                    >
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {locale === "zh" ? "确认删除？" : "Delete post?"}
                      </span>
                      <button
                        onClick={() => { handleDeletePost(); setConfirmDeletePost(false); }}
                        className="text-xs font-bold px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                      >
                        {locale === "zh" ? "删除" : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmDeletePost(false)}
                        className="text-xs font-semibold px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
                      >
                        {locale === "zh" ? "取消" : "No"}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="trash"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setConfirmDeletePost(true)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      aria-label="delete post"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
                <button
                  onClick={handleShare}
                  className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="share"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-sm sm:prose-base max-w-none">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
            </div>

            {/* UID */}
            <p className="text-xs text-gray-300 font-mono mt-6 pt-4 border-t border-gray-100">
              {post.post_uid}
            </p>
          </div>

          {/* Action bar */}
          <div className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
            <button
              onClick={handleToggleLike}
              disabled={likeBusy}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all ${
                post.liked_by_me
                  ? "bg-red-50 text-red-500"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-red-300 hover:text-red-500"
              }`}
            >
              <Heart size={16} fill={post.liked_by_me ? "currentColor" : "none"} />
              {post.likes_count}
            </button>
            <div className="flex items-center gap-2 px-5 py-2 text-gray-500 text-sm font-medium">
              <MessageCircle size={16} /> {post.comments_count}
            </div>
          </div>
        </motion.article>

        {/* Comments section */}
        <section className="mt-8 bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
          <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
            <MessageCircle size={18} className="text-blue-500" /> {t("comments")}
            <span className="text-sm font-semibold text-gray-400">({post.comments_count})</span>
          </h2>

          {/* Compose */}
          {user ? (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t("leave_comment")}
                rows={3}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!commentText.trim() || submitting}
                  className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "..." : t("submit_comment")}
                </button>
              </div>
            </form>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl text-center">
              <Link
                href={`/${locale}/auth/login`}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                {t("login_to_comment")}
              </Link>
            </div>
          )}

          {/* Thread */}
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t("no_comments")}</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {comments.map((c) => (
                <CommentThread
                  key={c.id}
                  comment={c}
                  locale={locale}
                  onReply={handleReply}
                  onDelete={handleDeleteComment}
                  onLikeChange={handleLikeComment}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
