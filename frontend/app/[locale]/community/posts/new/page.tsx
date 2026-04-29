"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Tag as TagIcon, X, Upload, Plus, Loader2, Sparkles, Images } from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { postsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import JunoContextPanel from "@/components/juno/JunoContextPanel";

const TAG_SUGGESTIONS = [
  "大模型", "工具推荐", "AI学术", "前端", "后端", "DevOps", "产品设计", "求职", "随笔",
];

const MAX_TAGS = 5;
const MAX_TAG_LEN = 20;
const MAX_IMAGES = 6;

export default function NewPostPage() {
  const t = useTranslations("community");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Multi-image state
  const [images, setImages] = useState<string[]>([]);          // committed upload URLs
  const [previews, setPreviews] = useState<string[]>([]);      // local blob previews while uploading
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null); // which slot is uploading
  const [uploadError, setUploadError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [junoOpen, setJunoOpen] = useState(false);

  useEffect(() => {
    if (user === null) {
      const timer = setTimeout(() => {
        if (!useAuthStore.getState().user) router.replace(`/${locale}/auth/login`);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [user, locale, router]);

  // ── Tag management ─────────────────────────────────────
  const addTag = (raw: string) => {
    const cleaned = raw.trim().replace(/^#+/, "").trim();
    if (!cleaned || cleaned.length > MAX_TAG_LEN) return;
    if (tags.length >= MAX_TAGS) return;
    if (tags.some((t) => t.toLowerCase() === cleaned.toLowerCase())) return;
    setTags([...tags, cleaned]);
  };
  const toggleSuggestion = (s: string) => {
    if (tags.some((t) => t.toLowerCase() === s.toLowerCase())) setTags(tags.filter((t) => t.toLowerCase() !== s.toLowerCase()));
    else addTag(s);
  };
  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));
  const handleTagInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "，") {
      e.preventDefault();
      if (tagInput.trim()) { addTag(tagInput); setTagInput(""); }
    }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) { e.preventDefault(); setTags(tags.slice(0, -1)); }
  };
  const handleTagInputBlur = () => { if (tagInput.trim()) { addTag(tagInput); setTagInput(""); } };

  // ── Multi-image upload ─────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadError("");

    for (const file of files) {
      if (images.length >= MAX_IMAGES) break;

      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
        setUploadError(locale === "zh" ? "仅支持 JPG/PNG/WebP/GIF 格式" : "Only JPG/PNG/WebP/GIF allowed");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(locale === "zh" ? "图片不能超过 10MB" : "Image exceeds 10MB");
        continue;
      }

      const slotIdx = images.length + (previews.length - images.length);
      const localUrl = URL.createObjectURL(file);
      setPreviews((prev) => [...prev, localUrl]);
      setUploadingIdx(slotIdx);

      try {
        const res = await postsApi.uploadImage(file);
        setImages((prev) => [...prev, res.data.url]);
      } catch {
        setUploadError(locale === "zh" ? "上传失败，请重试" : "Upload failed, please retry");
        setPreviews((prev) => prev.slice(0, -1));
      } finally {
        URL.revokeObjectURL(localUrl);
        setUploadingIdx(null);
      }
    }
    // reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !content.trim()) {
      setError(locale === "zh" ? "标题和正文都不能为空" : "Title and content are required");
      return;
    }
    if (uploadingIdx !== null) {
      setError(locale === "zh" ? "图片上传中，请稍候" : "Image still uploading");
      return;
    }
    setSubmitting(true);
    try {
      const res = await postsApi.create({
        title: title.trim(),
        content: content.trim(),
        tags,
        images,
        cover_image_url: images[0] || null,
      });
      router.push(`/${locale}/community/posts/${res.data.post_uid}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || (locale === "zh" ? "发布失败，请稍后再试" : "Failed to publish"));
      setSubmitting(false);
    }
  };

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

        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl font-black text-gray-900 mb-6">{t("write_post")}</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Title ───────────────────────────────────── */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t("post_title")}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("post_title_placeholder")}
                maxLength={300}
                className="w-full px-4 py-3 text-base font-semibold border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/300</p>
            </div>

            {/* ── Multi-image upload ──────────────────────── */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Images size={14} />
                {locale === "zh" ? `图片（最多 ${MAX_IMAGES} 张）` : `Images (up to ${MAX_IMAGES})`}
              </label>

              <div className="grid grid-cols-3 gap-3">
                {/* Uploaded image slots */}
                {images.map((url, idx) => (
                  <div key={idx} className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 group border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`image ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-2 left-2 text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        {locale === "zh" ? "封面" : "Cover"}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {/* Uploading slot */}
                {uploadingIdx !== null && (
                  <div className="aspect-[4/3] rounded-2xl bg-gray-100 border-2 border-blue-200 flex items-center justify-center">
                    <Loader2 size={22} className="animate-spin text-blue-500" />
                  </div>
                )}

                {/* Add more button */}
                {images.length < MAX_IMAGES && uploadingIdx === null && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-blue-600"
                  >
                    <Plus size={22} />
                    <span className="text-xs font-semibold">
                      {images.length === 0
                        ? (locale === "zh" ? "添加图片" : "Add images")
                        : (locale === "zh" ? "继续添加" : "Add more")}
                    </span>
                  </button>
                )}
              </div>

              {images.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {locale === "zh"
                    ? "第一张图片将作为封面，可拖动调整顺序"
                    : "First image is the cover · tap × to remove"}
                </p>
              )}

              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {uploadError && <p className="text-xs text-red-500 mt-2">{uploadError}</p>}
            </div>

            {/* ── Tags ────────────────────────────────────── */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <TagIcon size={14} /> {t("post_tag")}
                <span className="text-xs font-normal text-gray-400 ml-1">
                  {locale === "zh" ? `(最多 ${MAX_TAGS} 个 · 可自定义)` : `(up to ${MAX_TAGS} · custom allowed)`}
                </span>
              </label>
              <div className="min-h-[44px] w-full px-2 py-1.5 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-500 flex flex-wrap gap-1.5 items-center transition-all">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs font-bold text-white bg-blue-600 pl-2.5 pr-1 py-1 rounded-full">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 p-0.5 hover:bg-blue-800 rounded-full transition-colors"><X size={11} /></button>
                  </span>
                ))}
                {tags.length < MAX_TAGS && (
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value.slice(0, MAX_TAG_LEN))}
                    onKeyDown={handleTagInputKey}
                    onBlur={handleTagInputBlur}
                    placeholder={tags.length === 0 ? (locale === "zh" ? "输入标签后按回车 或 点击下方推荐" : "Type & press Enter, or pick below") : (locale === "zh" ? "继续添加..." : "add more...")}
                    className="flex-1 min-w-[140px] px-2 py-1 text-sm bg-transparent outline-none"
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {TAG_SUGGESTIONS.map((opt) => {
                  const isSelected = tags.some((t) => t.toLowerCase() === opt.toLowerCase());
                  return (
                    <button type="button" key={opt} onClick={() => toggleSuggestion(opt)} disabled={!isSelected && tags.length >= MAX_TAGS}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isSelected ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-transparent"}`}>
                      {isSelected ? "✓ " : "+ "}{opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Content ─────────────────────────────────── */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t("post_content")}</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("post_content_placeholder")}
                rows={12}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none resize-y font-mono leading-relaxed"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">{error}</div>
            )}

            {/* ── Actions ─────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => { if (!title.trim() && !content.trim()) return; setJunoOpen(true); }}
                disabled={!title.trim() && !content.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles size={14} />
                {locale === "zh" ? "✨ AI 优化" : "✨ AI Improve"}
              </button>
              <div className="flex gap-3">
                <Link href={`/${locale}/community`} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                  {t("cancel")}
                </Link>
                <button
                  type="submit"
                  disabled={submitting || uploadingIdx !== null}
                  className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? t("publishing") : t("publish")}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      <JunoContextPanel
        isOpen={junoOpen}
        onClose={() => setJunoOpen(false)}
        mode="optimize"
        contextText=""
        autoPrompt={
          locale === "zh"
            ? `请帮我优化以下帖子的表达，保持原意，让文字更流畅有力，直接返回优化后的完整正文内容（只返回正文，不要标题，不要解释）：\n\n标题参考：${title.trim() || "(无标题)"}\n\n正文内容：\n${content.trim() || "(正文为空)"}`
            : `Please improve the following post. Keep the original meaning but make it more engaging and clear. Return only the improved body content (no title, no explanation):\n\nTitle reference: ${title.trim() || "(no title)"}\n\nBody:\n${content.trim() || "(empty)"}`
        }
        locale={locale}
        theme="light"
        onApply={(text) => setContent(text)}
      />
    </div>
  );
}
