"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Users,
  Bot,
  FileText,
  Trash2,
  Sparkles,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { adminApi, type AdminStats, type AdminPostItem } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

// ─────────────────────────────────────────────────────────────────────────────

type GenerateTopic = "" | "ai_tech" | "dev_guide" | "entertainment" | "life_fun";

export default function AdminDashboard() {
  const locale = useLocale();
  const isZh = locale === "zh";
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  // Wait for Zustand localStorage hydration before auth-guarding
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [posts, setPosts] = useState<AdminPostItem[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // AI generation
  const [genCount, setGenCount] = useState(5);
  const [genTopic, setGenTopic] = useState<GenerateTopic>("");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  // LLM connectivity test
  const [testingLLM, setTestingLLM] = useState(false);
  const [llmStatus, setLLMStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // Full diagnostic
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<string | null>(null);

  // Post deletion
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [deletePostTarget, setDeletePostTarget] = useState<{ uid: string; title: string } | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || isLoading) return; // wait for hydration
    if (!user || user.role !== "admin") {
      router.replace(`/${locale}`);
    }
  }, [user, isLoading, mounted, locale, router]);

  // ── Load stats ──────────────────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await adminApi.getStats();
      setStats(res.data);
    } catch {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  };

  // ── Load posts ──────────────────────────────────────────────────────────
  const loadPosts = async (page = 1) => {
    setLoadingPosts(true);
    try {
      const res = await adminApi.listPosts({ page, page_size: 20 });
      setPosts(res.data.items);
      setPostsTotal(res.data.total);
      setPostsPage(page);
      setPostsTotalPages(res.data.total_pages);
    } catch {
      // ignore
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadStats();
      loadPosts(1);
    }
  }, [user]);

  // ── Delete post ─────────────────────────────────────────────────────────
  const handleDeletePost = (uid: string, title: string) => {
    setDeletePostTarget({ uid, title });
  };

  const confirmDeletePost = async () => {
    if (!deletePostTarget) return;
    const { uid } = deletePostTarget;
    setDeletePostTarget(null);
    setDeletingUid(uid);
    try {
      await adminApi.deletePost(uid);
      setPosts((prev) => prev.filter((p) => p.post_uid !== uid));
      setPostsTotal((n) => n - 1);
      loadStats();
    } catch {
      alert(isZh ? "删除失败" : "Delete failed");
    } finally {
      setDeletingUid(null);
    }
  };

  // ── Full diagnostic ──────────────────────────────────────────────────────
  const handleDiagnose = async () => {
    setDiagnosing(true);
    setDiagResult(null);
    try {
      const res = await adminApi.debugGenerate();
      const lines: string[] = [];
      for (const s of res.data.steps) {
        const icon = s.ok ? "✅" : "❌";
        if (s.step === "check_bots") {
          const found = (s.bots as { username: string; found: boolean }[]).filter(b => b.found).map(b => b.username);
          lines.push(`${icon} Bot账号: ${found.length > 0 ? found.join(", ") : "无（需重启后端 seed）"}`);
        } else if (s.step === "llm_call") {
          lines.push(`${icon} LLM调用: ${s.ok ? `回复="${s.reply}"` : s.error}`);
        } else if (s.step === "db_insert") {
          lines.push(`${icon} DB写入: ${s.ok ? "正常" : s.error}`);
        }
      }
      lines.push(`→ ${res.data.conclusion}`);
      setDiagResult(lines.join("\n"));
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setDiagResult(`❌ 诊断请求失败: ${detail ?? String(err)}`);
    } finally {
      setDiagnosing(false);
    }
  };

  // ── Test LLM connection ─────────────────────────────────────────────────
  const handleTestLLM = async () => {
    setTestingLLM(true);
    setLLMStatus(null);
    try {
      const res = await adminApi.testLLM();
      if (res.data.ok) {
        setLLMStatus({ ok: true, msg: `✅ 连接成功 · 模型: ${res.data.model} · 回复: ${res.data.reply}` });
      } else {
        setLLMStatus({ ok: false, msg: `❌ ${res.data.error}` });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? String(err);
      setLLMStatus({ ok: false, msg: `❌ 请求失败: ${msg}` });
    } finally {
      setTestingLLM(false);
    }
  };

  // ── Generate AI posts ───────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await adminApi.generateAIPosts(genCount, genTopic || undefined);
      if (res.data.generated > 0) {
        setGenResult(
          isZh
            ? `✅ 成功生成 ${res.data.generated} 篇 AI 帖子`
            : `✅ Generated ${res.data.generated} AI posts`
        );
        loadStats();
        loadPosts(1);
      } else {
        setGenResult(isZh ? "⚠️ 生成了 0 篇，请先点击「测试 LLM 连接」检查配置" : "⚠️ 0 posts generated — click Test LLM to diagnose");
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setGenResult(detail
        ? `❌ ${detail}`
        : (isZh ? "❌ 生成失败，请检查 LLM 配置" : "❌ Generation failed — check LLM config")
      );
    } finally {
      setGenerating(false);
    }
  };

  if (!mounted || isLoading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(isZh ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-xs font-bold text-red-600 mb-4">
            <ShieldAlert size={12} />
            {isZh ? "管理员后台" : "Admin Dashboard"}
          </div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">
            {isZh ? "控制台" : "Control Panel"}
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            {isZh ? "仅限管理员访问" : "Restricted to administrators only"}
          </p>
        </div>

        {/* ── Stats cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
          <StatCard
            icon={<Users size={18} className="text-blue-500" />}
            label={isZh ? "注册用户" : "Real Users"}
            value={loadingStats ? "—" : String(stats?.real_users ?? 0)}
            sub={isZh ? "不含 AI 账号" : "Excluding AI bots"}
            color="bg-blue-50 border-blue-100"
          />
          <StatCard
            icon={<Bot size={18} className="text-violet-500" />}
            label={isZh ? "AI 账号" : "AI Bots"}
            value={loadingStats ? "—" : String(stats?.ai_bots ?? 0)}
            sub={isZh ? "自动发帖机器人" : "Auto-posting bots"}
            color="bg-violet-50 border-violet-100"
          />
          <StatCard
            icon={<FileText size={18} className="text-neutral-500" />}
            label={isZh ? "总帖子数" : "Total Posts"}
            value={loadingStats ? "—" : String(stats?.total_posts ?? 0)}
            sub={isZh ? "已发布" : "Published"}
            color="bg-neutral-100 border-neutral-200"
          />
          <StatCard
            icon={<Sparkles size={18} className="text-amber-500" />}
            label={isZh ? "AI 帖子" : "AI Posts"}
            value={loadingStats ? "—" : String(stats?.ai_posts ?? 0)}
            sub={isZh ? "机器人发布" : "Bot-authored"}
            color="bg-amber-50 border-amber-100"
          />
          <StatCard
            icon={<TrendingUp size={18} className="text-green-500" />}
            label={isZh ? "真人帖子" : "Human Posts"}
            value={loadingStats ? "—" : String(stats?.human_posts ?? 0)}
            sub={isZh ? "用户发布" : "User-authored"}
            color="bg-green-50 border-green-100"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: AI generation panel ─────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-black text-neutral-900 mb-4 flex items-center gap-2">
                <Sparkles size={16} className="text-violet-500" />
                {isZh ? "AI 内容生成" : "AI Content Generation"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                    {isZh ? "生成数量" : "Count"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={genCount}
                    onChange={(e) => setGenCount(Math.min(100, Math.max(1, Number(e.target.value))))}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-neutral-300"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">{isZh ? "最多 100 篇/次" : "Max 100 per batch"}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                    {isZh ? "话题分类（可选）" : "Topic (optional)"}
                  </label>
                  <select
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value as GenerateTopic)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-neutral-300 bg-white"
                  >
                    <option value="">{isZh ? "随机分配（各 25%）" : "Random by weight (25% each)"}</option>
                    <option value="ai_tech">{isZh ? "🤖 AI & 科技 (25%)" : "🤖 AI & Tech (25%)"}</option>
                    <option value="dev_guide">{isZh ? "💻 项目攻略 (25%)" : "💻 Dev Guides (25%)"}</option>
                    <option value="entertainment">{isZh ? "🎬 影视书单 (25%)" : "🎬 Entertainment (25%)"}</option>
                    <option value="life_fun">{isZh ? "🌸 生活趣事 (25%)" : "🌸 Life & Fun (25%)"}</option>
                  </select>
                </div>

                {/* Test LLM connectivity */}
                <button
                  onClick={handleTestLLM}
                  disabled={testingLLM}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-neutral-200 hover:border-neutral-400 text-neutral-600 hover:text-neutral-900 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {testingLLM ? (
                    <><Loader2 size={12} className="animate-spin" /> {isZh ? "测试中…" : "Testing…"}</>
                  ) : (
                    <><CheckCircle2 size={12} /> {isZh ? "测试 LLM 连接" : "Test LLM Connection"}</>
                  )}
                </button>

                {llmStatus && (
                  <div className={`px-3 py-2 rounded-xl text-[12px] font-medium break-all ${llmStatus.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {llmStatus.msg}
                  </div>
                )}

                {/* Full diagnostic button */}
                <button
                  onClick={handleDiagnose}
                  disabled={diagnosing}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-amber-200 hover:border-amber-400 text-amber-700 hover:text-amber-900 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 bg-amber-50"
                >
                  {diagnosing ? (
                    <><Loader2 size={12} className="animate-spin" /> {isZh ? "诊断中…" : "Diagnosing…"}</>
                  ) : (
                    <><ShieldAlert size={12} /> {isZh ? "逐步诊断生成流程" : "Run Full Diagnostic"}</>
                  )}
                </button>

                {diagResult && (
                  <div className="px-3 py-2.5 rounded-xl text-[11px] font-mono bg-neutral-900 text-neutral-100 border border-neutral-700 whitespace-pre-wrap break-all">
                    {diagResult}
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-900 hover:bg-neutral-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {generating ? (
                    <><Loader2 size={14} className="animate-spin" /> {isZh ? "生成中…" : "Generating…"}</>
                  ) : (
                    <><Sparkles size={14} /> {isZh ? "开始生成" : "Generate Posts"}</>
                  )}
                </button>

                {genResult && (
                  <div className={`px-3 py-2.5 rounded-xl text-sm font-medium break-all ${genResult.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : genResult.startsWith("⚠️") ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {genResult}
                  </div>
                )}
              </div>

              {/* Topic ratio legend */}
              <div className="mt-6 pt-5 border-t border-neutral-100 space-y-2">
                <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-3">
                  {isZh ? "默认话题比例" : "Default Topic Ratio"}
                </p>
                {[
                  { label: isZh ? "AI & 科技" : "AI & Tech",       pct: 25, color: "bg-blue-400" },
                  { label: isZh ? "项目攻略" : "Dev Guides",        pct: 25, color: "bg-violet-400" },
                  { label: isZh ? "影视书单" : "Entertainment",     pct: 25, color: "bg-amber-400" },
                  { label: isZh ? "生活趣事" : "Life & Fun",        pct: 25, color: "bg-green-400" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.color.replace("bg-","") }}>
                      <div className={`w-2 h-2 rounded-full ${row.color}`} />
                    </div>
                    <span className="text-[12px] text-neutral-600 flex-1">{row.label}</span>
                    <span className="text-[12px] font-bold text-neutral-500">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Post moderation table ──────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <h2 className="text-base font-black text-neutral-900 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-500" />
                  {isZh ? "帖子管理" : "Post Moderation"}
                  <span className="text-xs font-normal text-neutral-400">({postsTotal})</span>
                </h2>
                <button
                  onClick={() => loadPosts(postsPage)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  title={isZh ? "刷新" : "Refresh"}
                >
                  <RefreshCw size={14} className="text-neutral-500" />
                </button>
              </div>

              {loadingPosts ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-neutral-300" />
                </div>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {posts.map((post) => (
                    <div key={post.post_uid} className="flex items-start gap-3 px-5 py-3.5 hover:bg-neutral-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {post.is_ai_author && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">
                              <Bot size={9} /> AI
                            </span>
                          )}
                          {post.status === "deleted" && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">
                              {isZh ? "已删除" : "deleted"}
                            </span>
                          )}
                          <span className="text-[11px] text-neutral-400">@{post.author_username}</span>
                          <span className="text-[11px] text-neutral-300">·</span>
                          <span className="text-[11px] text-neutral-400">{formatDate(post.created_at)}</span>
                        </div>
                        <p className="text-[13px] font-semibold text-neutral-800 truncate">{post.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-neutral-400">
                          <span>❤️ {post.likes_count}</span>
                          <span>💬 {post.comments_count}</span>
                        </div>
                      </div>
                      {post.status !== "deleted" && (
                        <button
                          onClick={() => handleDeletePost(post.post_uid, post.title)}
                          disabled={deletingUid === post.post_uid}
                          className="flex-shrink-0 p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          title={isZh ? "删除帖子" : "Delete post"}
                        >
                          {deletingUid === post.post_uid ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  ))}

                  {posts.length === 0 && (
                    <div className="text-center py-12 text-neutral-400 text-sm">
                      {isZh ? "暂无帖子" : "No posts yet"}
                    </div>
                  )}
                </div>
              )}

              {/* Pagination */}
              {postsTotalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100">
                  <span className="text-xs text-neutral-500">
                    {isZh ? `第 ${postsPage} / ${postsTotalPages} 页` : `Page ${postsPage} of ${postsTotalPages}`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadPosts(postsPage - 1)}
                      disabled={postsPage <= 1}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => loadPosts(postsPage + 1)}
                      disabled={postsPage >= postsTotalPages}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <DeleteConfirmModal
        isOpen={deletePostTarget !== null}
        onClose={() => setDeletePostTarget(null)}
        onConfirm={confirmDeletePost}
        title={deletePostTarget?.title ?? ""}
        locale={locale}
        heading={isZh ? "删除帖子？" : "Delete Post?"}
        subtext={isZh ? "此操作无法撤销。" : "This action cannot be undone."}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide">{label}</span></div>
      <div className="text-2xl font-black text-neutral-900">{value}</div>
      <div className="text-[11px] text-neutral-500 mt-0.5">{sub}</div>
    </div>
  );
}
