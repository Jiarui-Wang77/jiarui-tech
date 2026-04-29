"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Image as ImageIcon, X, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { adminApi, categoriesApi, type Article, type Category, type ProcessedArticle } from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const schema = z.object({
  title_zh: z.string().min(1, "Required"),
  title_en: z.string().min(1, "Required"),
  content_zh: z.string().min(1, "Required"),
  content_en: z.string().min(1, "Required"),
  deep_analysis_zh: z.string().optional(),
  deep_analysis_en: z.string().optional(),
  category_id: z.number({ coerce: true }).min(1, "Select a category"),
  status: z.enum(["draft", "published"]),
  cover_image_url: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Props = {
  mode: "create" | "edit";
  article?: Article;
  prefillData?: ProcessedArticle | null;
};

type Tab = "zh" | "en";

/**
 * If the text has no block-level HTML tags (p, br, h1-h6, img, div…),
 * treat it as plain text and wrap paragraphs in <p> tags with <br /> for
 * single newlines. Otherwise assume it is already valid HTML and leave it
 * untouched — prevents double-processing on re-edit.
 */
function plaintextToHtml(text: string): string {
  if (!text) return text;
  if (/<(p|br|h[1-6]|ul|ol|li|div|blockquote|img|table)\b/i.test(text)) return text;
  return text
    .split(/\n+/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para}</p>`)
    .join("");
}

export default function ArticleEditor({ mode, article, prefillData }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("zh");
  const [uploading, setUploading] = useState(false);
  const [coverPreview, setCoverPreview] = useState(article?.cover_image_url || "");
  const [serverError, setServerError] = useState("");
  const [inlineUploading, setInlineUploading] = useState<"zh" | "en" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inlineFileInputZhRef = useRef<HTMLInputElement>(null);
  const inlineFileInputEnRef = useRef<HTMLInputElement>(null);
  const contentZhRef = useRef<HTMLTextAreaElement | null>(null);
  const contentEnRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      title_zh: article?.title_zh ?? "",
      title_en: article?.title_en ?? "",
      content_zh: article?.content_zh ?? "",
      content_en: article?.content_en ?? "",
      deep_analysis_zh: article?.deep_analysis_zh ?? "",
      deep_analysis_en: article?.deep_analysis_en ?? "",
      category_id: article?.category?.id ?? 0,
      status: (article?.status as "draft" | "published") ?? "draft",
      cover_image_url: article?.cover_image_url ?? "",
    },
  });

  useEffect(() => {
    categoriesApi.list().then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  // Auto-fill form when URL-processed article data arrives
  useEffect(() => {
    if (!prefillData) return;
    setValue("title_zh", prefillData.title_zh);
    setValue("title_en", prefillData.title_en);
    setValue("content_zh", prefillData.content_zh);
    setValue("content_en", prefillData.content_en);
    setValue("deep_analysis_zh", prefillData.deep_analysis_zh || "");
    setValue("deep_analysis_en", prefillData.deep_analysis_en || "");
  }, [prefillData, setValue]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await adminApi.uploadImage(file);
      const url = res.data.url;
      setValue("cover_image_url", url);
      setCoverPreview(url);
    } catch {
      setServerError("Image upload failed. Check file size (max 10MB).");
    } finally {
      setUploading(false);
    }
  };

  const handleInlineImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    lang: "zh" | "en"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInlineUploading(lang);
    try {
      const res = await adminApi.uploadImage(file);
      const url = res.data.url;
      const tag = `<img src="${url}" alt="" style="max-width:100%;border-radius:8px;margin:1em 0;" />`;
      const fieldName = lang === "zh" ? "content_zh" : "content_en";
      const ref = lang === "zh" ? contentZhRef.current : contentEnRef.current;
      const current = (watch(fieldName) as string) || "";
      const cursor = ref?.selectionStart ?? current.length;
      const next = current.slice(0, cursor) + "\n" + tag + "\n" + current.slice(cursor);
      setValue(fieldName, next);
      // Restore focus + cursor after the inserted tag
      setTimeout(() => {
        if (ref) {
          ref.focus();
          const pos = cursor + tag.length + 2;
          ref.setSelectionRange(pos, pos);
        }
      }, 50);
    } catch {
      setServerError("Inline image upload failed.");
    } finally {
      setInlineUploading(null);
      e.target.value = "";
    }
  };

  const onSubmit = async (data: FormData) => {
    setServerError("");
    // Convert any plain-text paragraphs to HTML before persisting
    const payload = {
      ...data,
      content_zh: plaintextToHtml(data.content_zh),
      content_en: plaintextToHtml(data.content_en),
      deep_analysis_zh: data.deep_analysis_zh ? plaintextToHtml(data.deep_analysis_zh) : data.deep_analysis_zh,
      deep_analysis_en: data.deep_analysis_en ? plaintextToHtml(data.deep_analysis_en) : data.deep_analysis_en,
    };
    try {
      if (mode === "create") {
        await adminApi.createArticle(payload);
        router.push("/admin/articles");
      } else if (article) {
        await adminApi.updateArticle(article.id, payload);
        router.push("/admin/articles");
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setServerError(msg || "Failed to save article. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!article) return;
    setDeleting(true);
    try {
      await adminApi.deleteArticle(article.id);
      router.push("/admin/articles");
    } catch {
      setServerError("Delete failed. Please try again.");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  // When validation fails, auto-switch to the tab that has an error so the user can see it
  const onInvalid = (errs: typeof errors) => {
    const hasZhErr = !!(errs.title_zh || errs.content_zh);
    const hasEnErr = !!(errs.title_en || errs.content_en);
    if (activeTab === "zh" && !hasZhErr && hasEnErr) setActiveTab("en");
    else if (activeTab === "en" && !hasEnErr && hasZhErr) setActiveTab("zh");
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "zh", label: "🇨🇳 中文内容" },
    { key: "en", label: "🇬🇧 English Content" },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            {mode === "create" ? "New Article" : "Edit Article"}
          </h1>
          {article && (
            <p className="text-sm text-blue-400 font-mono mt-1">{article.article_uid}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Language tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-5 py-3 text-sm font-semibold transition-colors ${
                      activeTab === tab.key
                        ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/50"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ═══════════════════════════════════════════════════════════
                  关键修复：两个面板始终渲染，只用 CSS 切换可见性。
                  这样中文和英文各有独立的 DOM 节点，永远不会串内容。
              ═══════════════════════════════════════════════════════════ */}

              {/* 🇨🇳 Chinese panel — 独立 DOM，永久挂载 */}
              <div className={`p-5 space-y-4 ${activeTab === "zh" ? "" : "hidden"}`}>
                <Input
                  label="标题（中文）"
                  placeholder="输入文章标题..."
                  error={errors.title_zh?.message}
                  {...register("title_zh")}
                />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">
                      正文内容（支持 HTML）
                    </label>
                    <button
                      type="button"
                      onClick={() => inlineFileInputZhRef.current?.click()}
                      disabled={inlineUploading === "zh"}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {inlineUploading === "zh" ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <ImagePlus size={12} />
                      )}
                      插入图片
                    </button>
                    <input
                      ref={inlineFileInputZhRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => handleInlineImageUpload(e, "zh")}
                    />
                  </div>
                  <textarea
                    rows={16}
                    placeholder="支持 HTML 富文本内容..."
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    {...register("content_zh")}
                    ref={(el) => {
                      contentZhRef.current = el;
                      const { ref: rhfRef } = register("content_zh");
                      if (typeof rhfRef === "function") rhfRef(el);
                    }}
                  />
                  {errors.content_zh && (
                    <p className="text-xs text-red-500">{errors.content_zh.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">
                    深度分析（可选）
                  </label>
                  <textarea
                    rows={6}
                    placeholder="文末深度分析板块内容..."
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    {...register("deep_analysis_zh")}
                  />
                </div>
              </div>

              {/* 🇬🇧 English panel — 独立 DOM，永久挂载 */}
              <div className={`p-5 space-y-4 ${activeTab === "en" ? "" : "hidden"}`}>
                <Input
                  label="Title (English)"
                  placeholder="Enter article title..."
                  error={errors.title_en?.message}
                  {...register("title_en")}
                />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">
                      Content (HTML supported)
                    </label>
                    <button
                      type="button"
                      onClick={() => inlineFileInputEnRef.current?.click()}
                      disabled={inlineUploading === "en"}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {inlineUploading === "en" ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <ImagePlus size={12} />
                      )}
                      Insert Image
                    </button>
                    <input
                      ref={inlineFileInputEnRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => handleInlineImageUpload(e, "en")}
                    />
                  </div>
                  <textarea
                    rows={16}
                    placeholder="Supports HTML rich text content..."
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    {...register("content_en")}
                    ref={(el) => {
                      contentEnRef.current = el;
                      const { ref: rhfRef } = register("content_en");
                      if (typeof rhfRef === "function") rhfRef(el);
                    }}
                  />
                  {errors.content_en && (
                    <p className="text-xs text-red-500">{errors.content_en.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">
                    Deep Analysis (optional)
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Deep analysis section content..."
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    {...register("deep_analysis_en")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: settings panel */}
          <div className="space-y-4">
            {/* Publish settings */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm">Publish Settings</h3>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Status</label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Category</label>
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value={0}>Select category...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name_zh} / {cat.name_en}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.category_id && (
                  <p className="text-xs text-red-500">{errors.category_id.message}</p>
                )}
              </div>

              {serverError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {serverError}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <Button type="submit" loading={isSubmitting} className="w-full">
                  {mode === "create" ? "Publish Article" : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>

                {mode === "edit" && (
                  <div className="pt-2 border-t border-gray-100">
                    {confirmDelete ? (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-semibold text-red-700 text-center">
                          确认删除此文章？此操作不可撤销。
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60"
                          >
                            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            确认删除
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xl transition-colors"
                      >
                        <Trash2 size={13} />
                        Delete Article
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cover image */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h3 className="font-bold text-gray-900 text-sm">Cover Image</h3>

              {coverPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverPreview("");
                      setValue("cover_image_url", "");
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-gray-400 hover:text-blue-500"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ImageIcon size={24} />
                      <span className="text-xs font-medium">Click to upload image</span>
                      <span className="text-xs">JPEG, PNG, WebP · Max 10MB</span>
                    </>
                  )}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageUpload}
              />

              <Input
                label="Or paste image URL"
                placeholder="https://..."
                value={watch("cover_image_url") || ""}
                onChange={(e) => {
                  setValue("cover_image_url", e.target.value);
                  setCoverPreview(e.target.value);
                }}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
