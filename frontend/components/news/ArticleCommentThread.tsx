"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Reply, Trash2 } from "lucide-react";
import type { Comment } from "@/lib/api";
import { articlesApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";

type Props = {
  comment: Comment;
  articleUid: string;
  locale: string;
  onDelete: (commentId: number) => void;
  onReply: (parentId: number, content: string) => Promise<void>;
  onLikeChange: (commentId: number, liked: boolean, count: number) => void;
  isReply?: boolean;
};

export default function ArticleCommentThread({
  comment,
  articleUid,
  locale,
  onDelete,
  onReply,
  onLikeChange,
  isReply,
}: Props) {
  const { user } = useAuthStore();
  const isZh = locale === "zh";

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [liked, setLiked] = useState(comment.liked_by_me);
  const [likesCount, setLikesCount] = useState(comment.likes_count);
  const [likeBusy, setLikeBusy] = useState(false);

  // Completely hide deleted comments — no "已删除" text shown
  if (comment.is_deleted && comment.replies.length === 0) return null;

  const canDelete =
    user && !comment.is_deleted && (user.id === comment.user.id || user.role === "admin");

  const handleToggleLike = async () => {
    if (!user || likeBusy) return;
    setLikeBusy(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const res = await articlesApi.toggleCommentLike(articleUid, comment.id);
      setLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
      onLikeChange(comment.id, res.data.liked, res.data.likes_count);
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

  return (
    <div className={isReply ? "pl-4 border-l-2 border-gray-100 ml-2" : ""}>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 py-3"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {comment.is_deleted ? "?" : comment.user.username.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Meta */}
          {!comment.is_deleted && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-gray-900">{comment.user.username}</span>
              <span className="text-xs text-gray-400">{formatDate(comment.created_at, locale)}</span>
            </div>
          )}

          {/* Content — hidden if deleted (show nothing, not "deleted" text) */}
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
                disabled={!user || likeBusy}
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                  liked ? "text-red-500" : "text-gray-400 hover:text-red-500"
                } disabled:opacity-50`}
              >
                <Heart size={12} fill={liked ? "currentColor" : "none"} />
                {likesCount > 0 && <span>{likesCount}</span>}
              </button>

              {/* Reply */}
              {!isReply && (
                <button
                  onClick={() => setReplyOpen(!replyOpen)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors"
                >
                  <Reply size={12} />
                  {isZh ? "回复" : "Reply"}
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
                          {isZh ? "确认删除？" : "Delete?"}
                        </span>
                        <button
                          onClick={() => { onDelete(comment.id); setConfirmDelete(false); }}
                          className="text-xs font-bold px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          {isZh ? "删除" : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="text-xs font-semibold px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                        >
                          {isZh ? "取消" : "No"}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="trash"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setConfirmDelete(true)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 font-medium transition-colors p-0.5"
                      >
                        <Trash2 size={12} />
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
                  placeholder={isZh ? `回复 @${comment.user.username}…` : `Reply to @${comment.user.username}…`}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => { setReplyOpen(false); setReplyText(""); }}
                    className="text-xs font-semibold px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {isZh ? "取消" : "Cancel"}
                  </button>
                  <button
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim() || submitting}
                    className="text-xs font-bold px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-full transition-colors disabled:opacity-50"
                  >
                    {submitting ? "..." : isZh ? "回复" : "Reply"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nested replies (1 level only) */}
          {!isReply && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((r) => (
                <ArticleCommentThread
                  key={r.id}
                  comment={r}
                  articleUid={articleUid}
                  locale={locale}
                  onDelete={onDelete}
                  onReply={onReply}
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
