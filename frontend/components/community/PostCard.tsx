"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Eye } from "lucide-react";
import { useState } from "react";
import { postsApi, type PostListItem } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";

type Props = {
  post: PostListItem;
  locale: string;
  onLikeChange?: (uid: string, liked: boolean, likes_count: number) => void;
  onNavigate?: () => void;
};

export default function PostCard({ post, locale, onLikeChange, onNavigate }: Props) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [busy, setBusy] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    if (busy) return;
    setBusy(true);
    // Optimistic
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const res = await postsApi.toggleLike(post.post_uid);
      setLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
      onLikeChange?.(post.post_uid, res.data.liked, res.data.likes_count);
    } catch {
      // Revert
      setLiked(!nextLiked);
      setLikesCount((c) => c + (nextLiked ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.article
      id={`post-${post.post_uid}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all overflow-hidden"
    >
      <Link
        href={`/${locale}/community/posts/${post.post_uid}`}
        className="block"
        onClick={onNavigate}
      >
        {/* Cover — prefer first of images array, fall back to cover_image_url */}
        {(post.images?.[0] ?? post.cover_image_url) && (
          <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100">
            <Image
              src={(post.images?.[0] ?? post.cover_image_url)!}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized
            />
            {post.images && post.images.length > 1 && (
              <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                1/{post.images.length}
              </span>
            )}
          </div>
        )}

        <div className="p-5">
          {/* Author row */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {post.author.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {post.author.username}
              </p>
              <p className="text-xs text-gray-400">
                {timeAgo(post.created_at, locale)}
              </p>
            </div>
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-end max-w-[55%]">
                {post.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0"
                  >
                    #{t}
                  </span>
                ))}
                {post.tags.length > 3 && (
                  <span className="text-xs text-gray-400 px-1">+{post.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-black text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {post.title}
          </h3>

          {/* Excerpt */}
          <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
            {post.content_excerpt}
          </p>

          {/* Stats + like button */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Eye size={14} />
                {post.views_count}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={14} />
                {post.comments_count}
              </span>
            </div>
            <button
              onClick={handleLike}
              disabled={busy}
              aria-label="like"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                liked
                  ? "bg-red-50 text-red-500"
                  : "text-gray-400 hover:bg-gray-50 hover:text-red-500"
              }`}
            >
              <Heart size={15} fill={liked ? "currentColor" : "none"} />
              <span className="text-xs font-bold">{likesCount}</span>
            </button>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
