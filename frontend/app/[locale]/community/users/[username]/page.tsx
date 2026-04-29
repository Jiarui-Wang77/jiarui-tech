"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  UserPlus,
  UserCheck,
  Edit3,
  ArrowLeft,
  MapPin,
  Calendar,
  Camera,
  Loader2,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import PostCard from "@/components/community/PostCard";
import {
  usersApi,
  postsApi,
  type UserProfile,
  type PostListItem,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

type PageProps = { params: Promise<{ locale: string; username: string }> };

export default function UserProfilePage({ params }: PageProps) {
  const { username } = use(params);
  const t = useTranslations("community");
  const locale = useLocale();
  const router = useRouter();
  const { user: me } = useAuthStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

  // ── Edit profile modal state ───────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editAge, setEditAge] = useState<string>("");
  const [editRegion, setEditRegion] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pRes = await usersApi.getProfile(username);
      setProfile(pRes.data);
      const byAuthor = await postsApi.list({
        page: 1,
        page_size: 20,
        author_id: pRes.data.id,
        sort: "latest",
      });
      setPosts(byAuthor.data.items);
    } catch {
      router.replace(`/${locale}/community`);
    } finally {
      setLoading(false);
    }
  }, [username, locale, router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleFollow = async () => {
    if (!me) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    if (!profile || followBusy) return;
    setFollowBusy(true);
    try {
      const res = await usersApi.toggleFollow(username);
      setProfile({ ...profile, followed_by_me: res.data.followed, followers_count: res.data.followers_count });
    } finally {
      setFollowBusy(false);
    }
  };

  const openEdit = () => {
    if (!profile) return;
    setEditBio(profile.bio || "");
    setEditAvatar(profile.avatar_url || "");
    setEditAge(profile.age != null ? String(profile.age) : "");
    setEditRegion(profile.region || "");
    setAvatarError("");
    setEditOpen(true);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError("");

    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setAvatarError(locale === "zh" ? "仅支持 JPG/PNG/WebP/GIF" : "Only JPG/PNG/WebP/GIF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarError(locale === "zh" ? "图片不能超过 10MB" : "Image exceeds 10MB");
      return;
    }

    setAvatarUploading(true);
    try {
      const res = await usersApi.uploadAvatar(file);
      setEditAvatar(res.data.url);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setAvatarError(msg || (locale === "zh" ? "上传失败" : "Upload failed"));
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const parsedAge = editAge.trim() === "" ? null : Number(editAge);
      if (parsedAge !== null && (!Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 150)) {
        alert(locale === "zh" ? "年龄应在 0-150 之间" : "Age must be between 0 and 150");
        setSavingProfile(false);
        return;
      }
      const res = await usersApi.updateMyProfile({
        bio: editBio.trim() || null,
        avatar_url: editAvatar.trim() || null,
        age: parsedAge,
        region: editRegion.trim() || null,
      });
      setProfile(res.data);
      setEditOpen(false);
    } finally {
      setSavingProfile(false);
    }
  };

  const isMe = me && profile && me.id === profile.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-28 space-y-4">
          <div className="h-40 bg-gray-200 rounded-3xl animate-pulse" />
          <div className="h-8 w-1/3 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <Link
          href={`/${locale}/community`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 font-medium"
        >
          <ArrowLeft size={15} /> {t("back_to_feed")}
        </Link>

        {/* Profile header */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 mb-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-3xl font-black flex-shrink-0 overflow-hidden">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                profile.username.charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-gray-900">{profile.username}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {profile.bio || (locale === "zh" ? "这个人很懒，什么都没留下" : "This user hasn't written a bio yet.")}
              </p>

              {/* Demographics row */}
              {(profile.age != null || profile.region) && (
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                  {profile.age != null && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} /> {profile.age}{locale === "zh" ? " 岁" : " yrs"}
                    </span>
                  )}
                  {profile.region && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {profile.region}
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-6 mt-4 text-sm">
                <span>
                  <span className="font-black text-gray-900">{profile.posts_count}</span>{" "}
                  <span className="text-gray-500">{t("posts_count")}</span>
                </span>
                <span>
                  <span className="font-black text-gray-900">{profile.followers_count}</span>{" "}
                  <span className="text-gray-500">{t("followers")}</span>
                </span>
                <span>
                  <span className="font-black text-gray-900">{profile.following_count}</span>{" "}
                  <span className="text-gray-500">{t("following")}</span>
                </span>
              </div>
            </div>

            {/* Action button */}
            <div className="flex-shrink-0">
              {isMe ? (
                <button
                  onClick={openEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-full transition-colors"
                >
                  <Edit3 size={14} /> {t("edit_profile")}
                </button>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  disabled={followBusy}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full transition-colors disabled:opacity-60 ${
                    profile.followed_by_me
                      ? "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {profile.followed_by_me ? (
                    <>
                      <UserCheck size={14} /> {t("unfollow")}
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> {t("follow")}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.section>

        {/* User's posts */}
        <section>
          <h2 className="text-lg font-black text-gray-900 mb-4">
            {locale === "zh" ? `${profile.username} 的帖子` : `Posts by ${profile.username}`}
          </h2>
          {posts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <span className="text-5xl block mb-3">📝</span>
              <p className="text-gray-500 text-sm">{t("empty_posts")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} locale={locale} />
              ))}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  Edit profile modal                                        */}
        {/* ══════════════════════════════════════════════════════════ */}
        {editOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => !savingProfile && setEditOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-black mb-5">{t("edit_profile")}</h3>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Avatar — upload + preview */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {locale === "zh" ? "头像" : "Avatar"}
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-2xl font-black overflow-hidden flex-shrink-0">
                      {editAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={editAvatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        profile.username.charAt(0).toUpperCase()
                      )}
                      {avatarUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 size={20} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <button
                        type="button"
                        onClick={() => avatarFileRef.current?.click()}
                        disabled={avatarUploading}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full transition-colors disabled:opacity-60"
                      >
                        <Camera size={13} />
                        {locale === "zh" ? "上传头像" : "Upload"}
                      </button>
                      {editAvatar && (
                        <button
                          type="button"
                          onClick={() => setEditAvatar("")}
                          className="ml-2 text-xs text-gray-400 hover:text-red-600 font-medium"
                        >
                          {locale === "zh" ? "移除" : "Remove"}
                        </button>
                      )}
                      <input
                        type="file"
                        ref={avatarFileRef}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                  {avatarError && (
                    <p className="text-xs text-red-500 mt-1.5">{avatarError}</p>
                  )}
                  {/* Optional: allow pasting a URL */}
                  <input
                    type="url"
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    placeholder={locale === "zh" ? "或粘贴头像链接 https://..." : "or paste avatar URL https://..."}
                    className="w-full mt-3 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {locale === "zh" ? "个人简介" : "Bio"}
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder={t("bio_placeholder")}
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none resize-none"
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{editBio.length}/200</p>
                </div>

                {/* Age + Region */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {locale === "zh" ? "年龄" : "Age"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={150}
                      value={editAge}
                      onChange={(e) => setEditAge(e.target.value)}
                      placeholder={locale === "zh" ? "可不填" : "Optional"}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {locale === "zh" ? "地区" : "Region"}
                    </label>
                    <input
                      type="text"
                      value={editRegion}
                      onChange={(e) => setEditRegion(e.target.value)}
                      maxLength={100}
                      placeholder={locale === "zh" ? "如：上海" : "e.g. Shanghai"}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile || avatarUploading}
                    className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-full transition-colors disabled:opacity-60"
                  >
                    {savingProfile ? "..." : t("save_profile")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
