"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Reply, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PostComment } from "@/lib/api";
import { postsApi } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";

type Props = {
  comment: PostComment;
  locale: string;
  onReply: (parentId: number, content: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  onLikeChange?: (commentId: number, liked: boolean, count: number) => void;
  /** If true, this is a nested reply — suppress further nesting. */
  isReply?: boolean;
};

export default function CommentThread({ comment, locale, onReply, onDelete, onLikeChange, isReply }: Props) {
  const t = useTranslations("community");
  const { user } = useAuthStore();
  const router = useRouter();

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [liked, setLiked] = useState(comment.liked_by_me);
  const [likesCount, setLikesCount] = useState(comment.likes_count);
  const [likeBusy, setLikeBusy] = useState(false);

  const canDelete = user && !comment.is_deleted && (user.id === comment.user.id || user.role === "admin");

  const handleToggleLike = async () => {
    if (!user) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const res = await postsApi.toggleCommentLike(comment.id);
      setLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
      onLikeChange?.(comment.id, res.data.liked, res.data.likes_count);
    } catch {
      setLiked(!nextLiked);
      setLikesCount((c) => c + (nextLiked ? -1 : 1));
    } finally {
      setLikeBusy(false);
    }
  };

  const handleSubmitReply = async () => {
    const v = replyText.trim();
    if (!v || submitting) return;
    setSubmitting(true);
    try {
      await onReply(comment.id, v);
      setReplyText("");
      setReplyOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Hide deleted comments entirely — no "已删除" placeholder shown
  if (comment.is_deleted && comment.replies.length === 0) return null;

  return (
    <div className={`${isReply ? "pl-4 border-l-2 border-gray-100 ml-2" : ""}`}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 py-3"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {comment.user.username.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Meta */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">{comment.user.username}</span>
            <span className="text-xs text-gray-400">{timeAgo(comment.created_at, locale)}</span>
          </div>

          {/* Body — only show if not deleted */}
          {!comment.is_deleted && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed break-words">
              {comment.content}
            </p>
          )}

          {/* Actions */}
          {!comment.is_deleted && (
            <div className="flex items-center gap-3 mt-2">
              {/* Like */}
              <button
                onClick={handleToggleLike}
                disabled={likeBusy}
                className={`flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  liked ? "text-red-500" : "text-gray-400 hover:text-red-500"
                }`}
              >
                <Heart size={13} fill={liked ? "currentColor" : "none"} />
                {likesCount > 0 && <span>{likesCount}</span>}
              </button>

              {!isReply && (
                <button
                  onClick={() => setReplyOpen(!replyOpen)}
                  className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors"
                >
                  <Reply size={13} />
                  {t("reply")}
                </button>
              )}

              {/* Delete — premium inline confirm */}
              {canDelete && (
                <div className="relative">
                  <AnimatePresence mode="wait">
                    {confirmDelete ? (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, scale: 0.9, y: -2 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -2 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-1.5 bg-white border border-red-100 rounded-2xl px-2.5 py-1 shadow-lg shadow-red-500/10"
                      >
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                          {locale === "zh" ? "确认删除？" : "Delete?"}
                        </span>
                        <button
                          onClick={() => { onDelete(comment.id); setConfirmDelete(false); }}
                          className="text-xs font-bold px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          {locale === "zh" ? "删除" : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="text-xs font-semibold px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
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
                        onClick={() => setConfirmDelete(true)}
                        className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 font-medium transition-colors p-0.5"
                      >
                        <Trash2 size={13} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* Reply form */}
          <AnimatePresence>
            {replyOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t("leave_reply", { username: comment.user.username })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => { setReplyOpen(false); setReplyText(""); }}
                    className="text-xs font-semibold px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim() || submitting}
                    className="text-xs font-bold px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "..." : t("submit_comment")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replies (1 level only) */}
          {!isReply && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((r) => (
                <CommentThread
                  key={r.id}
                  comment={r}
                  locale={locale}
                  onReply={onReply}
                  onDelete={onDelete}
                  onLikeChange={onLikeChange}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
