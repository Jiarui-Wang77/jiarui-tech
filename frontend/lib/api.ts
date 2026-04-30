import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// ── Token auto-refresh interceptor ─────────────────────────────────────────
// On 401: if it's an auth endpoint (me/login/refresh) → reject silently.
// Otherwise → try POST /auth/refresh, then retry the original request.
// If refresh also fails → reject silently (no forced redirect anywhere).

let _isRefreshing = false;
let _queue: Array<{ resolve: () => void; reject: (e: unknown) => void }> = [];

const _flushQueue = (err: unknown) => {
  _queue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve()));
  _queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status !== 401) return Promise.reject(error);

    const url: string = error.config?.url ?? "";
    const isAuthEndpoint = url.includes("/auth/");
    const alreadyRetried = error.config?._retry;

    // Auth endpoints (me, login, refresh) → reject silently, never redirect
    if (isAuthEndpoint || alreadyRetried) {
      return Promise.reject(error);
    }

    // Queue concurrent requests while refresh is in progress
    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _queue.push({
          resolve: () => resolve(api({ ...error.config, _retry: true })),
          reject,
        });
      });
    }

    error.config._retry = true;
    _isRefreshing = true;

    try {
      await api.post("/auth/refresh");
      _flushQueue(null);
      return api(error.config);
    } catch (refreshError) {
      _flushQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      _isRefreshing = false;
    }
  }
);

export type ArticleListItem = {
  id: number;
  article_uid: string;
  title_zh: string;
  title_en: string;
  cover_image_url: string | null;
  status: string;
  view_count: number;
  category: { id: number; name_zh: string; name_en: string; slug: string } | null;
  author: { id: number; username: string; avatar_url: string | null } | null;
  published_at: string | null;
  created_at: string;
};

export type Article = ArticleListItem & {
  content_zh: string;
  content_en: string;
  deep_analysis_zh: string | null;
  deep_analysis_en: string | null;
  updated_at: string;
};

export type Category = {
  id: number;
  name_zh: string;
  name_en: string;
  slug: string;
  sort_order: number;
  is_featured: boolean;
};

export type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
  created_at: string;
};

export type ArticleListResponse = {
  items: ArticleListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type Comment = {
  id: number;
  content: string;
  user: Pick<User, "id" | "username" | "avatar_url">;
  created_at: string;
  parent_id: number | null;
  likes_count: number;
  is_deleted: boolean;
  liked_by_me: boolean;
  replies: Comment[];
};

export const articlesApi = {
  list: (params: { page?: number; page_size?: number; category?: string; search?: string }) =>
    api.get<ArticleListResponse>("/articles", { params }),
  get: (uid: string) => api.get<Article>(`/articles/${uid}`),
  getComments: (uid: string) => api.get<Comment[]>(`/articles/${uid}/comments`),
  postComment: (uid: string, content: string, parent_id?: number) =>
    api.post<Comment>(`/articles/${uid}/comments`, { content, parent_id: parent_id ?? null }),
  deleteComment: (uid: string, commentId: number) =>
    api.delete(`/articles/${uid}/comments/${commentId}`),
  toggleCommentLike: (uid: string, commentId: number) =>
    api.post<{ liked: boolean; likes_count: number }>(`/articles/${uid}/comments/${commentId}/like`),
  getRecommended: (articleId: number) => api.get<ArticleListItem[]>(`/articles/recommended/${articleId}`),
};

export const categoriesApi = {
  list: () => api.get<Category[]>("/categories"),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (data: { username: string; email: string; password: string; confirm_password: string }) =>
    api.post("/auth/register", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get<User>("/auth/me"),
};

// ═══════════════════════════════════════════════════════════════════════
//  M2 — Community types & APIs
// ═══════════════════════════════════════════════════════════════════════

export type AuthorMini = {
  id: number;
  username: string;
  avatar_url: string | null;
  bio?: string | null;
};

export type PostListItem = {
  id: number;
  post_uid: string;
  title: string;
  content_excerpt: string;
  cover_image_url: string | null;
  images: string[];
  tags: string[];
  likes_count: number;
  comments_count: number;
  views_count: number;
  author: AuthorMini;
  created_at: string;
  liked_by_me: boolean;
};

export type Post = {
  id: number;
  post_uid: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  images: string[];
  tags: string[];
  likes_count: number;
  comments_count: number;
  views_count: number;
  hot_score: number;
  status: string;
  author: AuthorMini;
  created_at: string;
  updated_at: string;
  liked_by_me: boolean;
};

export type PostListResponse = {
  items: PostListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type PostComment = {
  id: number;
  post_id: number;
  parent_id: number | null;
  content: string;
  is_deleted: boolean;
  likes_count: number;
  liked_by_me: boolean;
  user: AuthorMini;
  created_at: string;
  replies: PostComment[];
};

export type LikeActionResponse = { liked: boolean; likes_count: number };
export type FollowActionResponse = { followed: boolean; followers_count: number };

export type UserProfile = {
  id: number;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  region: string | null;
  posts_count: number;
  followers_count: number;
  following_count: number;
  followed_by_me: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  user: AuthorMini;
  posts_count: number;
  total_likes: number;
  followers_count: number;
  score: number;
};

export type FollowListItem = {
  user: AuthorMini;
  followed_by_me: boolean;
};

export type CommunityStats = {
  total_posts: number;
  total_users: number;
  total_follows: number;
};

export const postsApi = {
  list: (params: {
    page?: number;
    page_size?: number;
    tag?: string;
    author_id?: number;
    search?: string;
    sort?: "latest" | "hot" | "top";
  }) => api.get<PostListResponse>("/posts", { params }),
  get: (uid: string) => api.get<Post>(`/posts/${uid}`),
  create: (data: { title: string; content: string; images?: string[]; cover_image_url?: string | null; tags?: string[] }) =>
    api.post<Post>("/posts", data),
  update: (uid: string, data: Partial<{ title: string; content: string; cover_image_url: string | null; tags: string[] }>) =>
    api.put<Post>(`/posts/${uid}`, data),
  delete: (uid: string) => api.delete(`/posts/${uid}`),
  toggleLike: (uid: string) => api.post<LikeActionResponse>(`/posts/${uid}/like`),
  getComments: (uid: string) => api.get<PostComment[]>(`/posts/${uid}/comments`),
  postComment: (uid: string, data: { content: string; parent_id?: number | null }) =>
    api.post<PostComment>(`/posts/${uid}/comments`, data),
  deleteComment: (commentId: number) => api.delete(`/posts/comments/${commentId}`),
  toggleCommentLike: (commentId: number) => api.post<LikeActionResponse>(`/posts/comments/${commentId}/like`),
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ url: string; filename: string }>("/posts/upload-image", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export const communityApi = {
  leaderboard: (limit = 20) =>
    api.get<LeaderboardEntry[]>("/community/leaderboard", { params: { limit } }),
  trendingTags: (limit = 10) =>
    api.get<Array<{ tag: string; count: number }>>("/community/trending-tags", { params: { limit } }),
  stats: () => api.get<CommunityStats>("/community/stats"),
};

export const usersApi = {
  getProfile: (username: string) => api.get<UserProfile>(`/users/${username}`),
  updateMyProfile: (data: {
    bio?: string | null;
    avatar_url?: string | null;
    age?: number | null;
    region?: string | null;
  }) => api.patch<UserProfile>("/users/me/profile", data),
  toggleFollow: (username: string) =>
    api.post<FollowActionResponse>(`/users/${username}/follow`),
  listFollowers: (username: string, limit = 50) =>
    api.get<FollowListItem[]>(`/users/${username}/followers`, { params: { limit } }),
  listFollowing: (username: string, limit = 50) =>
    api.get<FollowListItem[]>(`/users/${username}/following`, { params: { limit } }),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ url: string; filename: string }>("/users/me/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════
//  M3 — GitHub Tracker
// ═══════════════════════════════════════════════════════════════════════

export type RepoListItem = {
  id: number;
  full_name: string;
  owner: string;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  topics: string[];
  owner_avatar_url: string | null;
  stars_count: number;
  forks_count: number;
  stars_24h: number;
  stars_7d: number;
  horse_score: number;
  gh_pushed_at: string | null;
  last_synced_at: string;
};

export type RepoListResponse = {
  items: RepoListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type RepoSnapshot = {
  stars_count: number;
  forks_count: number;
  open_issues_count: number;
  captured_at: string;
};

export type RepoDetail = RepoListItem & {
  homepage: string | null;
  open_issues_count: number;
  watchers_count: number;
  gh_created_at: string | null;
  first_seen_at: string;
  snapshots: RepoSnapshot[];
};

export type TrackerStats = {
  total_repos: number;
  total_stars: number;
  avg_horse_score: number;
  languages: Array<{ language: string; count: number }>;
  top_topics: Array<{ topic: string; count: number }>;
};

export const trackerApi = {
  list: (params: {
    page?: number;
    page_size?: number;
    language?: string;
    topic?: string;
    search?: string;
    sort?: "horse" | "stars" | "stars_24h" | "stars_7d" | "newest";
  }) => api.get<RepoListResponse>("/tracker/repos", { params }),
  get: (owner: string, name: string, snapshotsLimit = 30) =>
    api.get<RepoDetail>(`/tracker/repos/${owner}/${name}`, {
      params: { snapshots_limit: snapshotsLimit },
    }),
  stats: () => api.get<TrackerStats>("/tracker/stats"),
  // Admin
  adminSyncAll: (limit?: number) =>
    api.post<{ updated: number; failed: number; total: number }>(
      "/tracker/admin/sync-all",
      null,
      { params: limit ? { limit } : {} }
    ),
  adminSyncOne: (fullName: string) =>
    api.post<{ full_name: string; stars_count: number; horse_score: number }>(
      "/tracker/admin/sync-one",
      null,
      { params: { full_name: fullName } }
    ),
  adminAddRepo: (fullName: string) =>
    api.post<RepoListItem>("/tracker/admin/repos", { full_name: fullName }),
  adminUntrack: (owner: string, name: string) =>
    api.delete(`/tracker/admin/repos/${owner}/${name}`),
};

// ═══════════════════════════════════════════════════════════════════════
//  M4 — AI Model Leaderboard
// ═══════════════════════════════════════════════════════════════════════

export type ModelDomain = "coding" | "academic" | "office" | "lifestyle";

export type ScoreItem = {
  domain: string;
  score: number;
  breakdown: Record<string, number | string>;
  notes_zh?: string | null;
  notes_en?: string | null;
};

export type AIModelListItem = {
  id: number;
  slug: string;
  name: string;
  vendor: string;
  logo_url: string | null;
  brand_color: string | null;
  overall_score: number;
  community_rating: number;
  votes_count: number;
  status: string;
  domain_scores: Partial<Record<ModelDomain, number>>;
};

export type AIModelListResponse = {
  items: AIModelListItem[];
  total: number;
};

export type UserVoteInfo = {
  rating: number;
  comment: string | null;
  updated_at: string;
};

export type AIModelDetail = {
  id: number;
  slug: string;
  name: string;
  vendor: string;
  logo_url: string | null;
  brand_color: string | null;
  description_zh: string | null;
  description_en: string | null;
  release_date: string | null;
  context_window: number | null;
  price_input_per_1m: number | null;
  price_output_per_1m: number | null;
  official_url: string | null;
  overall_score: number;
  community_rating: number;
  votes_count: number;
  status: string;
  scores: ScoreItem[];
  my_vote: UserVoteInfo | null;
};

export type ModelStats = {
  total_models: number;
  total_votes: number;
  by_vendor: Array<{ vendor: string; count: number; avg_score: number }>;
  domain_leaders: Record<string, { slug: string; name: string; score: number }>;
};

export type VoteResponse = {
  community_rating: number;
  votes_count: number;
  overall_score: number;
  my_vote: UserVoteInfo;
};

export const aiModelsApi = {
  list: (params?: {
    vendor?: string;
    domain?: string;
    sort?: "overall" | ModelDomain | "community" | "newest";
    status?: string;
  }) => api.get<AIModelListResponse>("/ai-models", { params }),
  get: (slug: string) => api.get<AIModelDetail>(`/ai-models/${slug}`),
  stats: () => api.get<ModelStats>("/ai-models/-/stats"),
  vote: (slug: string, rating: number, comment?: string) =>
    api.post<VoteResponse>(`/ai-models/${slug}/vote`, { rating, comment: comment || null }),
  removeVote: (slug: string) => api.delete(`/ai-models/${slug}/vote`),
  // Admin
  adminCreate: (data: Partial<AIModelDetail> & { slug: string; scores?: ScoreItem[] }) =>
    api.post<AIModelDetail>("/ai-models/admin/create", data),
  adminUpdate: (slug: string, data: Partial<AIModelDetail>) =>
    api.patch(`/ai-models/admin/${slug}`, data),
  adminSetScore: (slug: string, data: ScoreItem) =>
    api.put(`/ai-models/admin/${slug}/score`, data),
  adminDelete: (slug: string) => api.delete(`/ai-models/admin/${slug}`),
};

// ═══════════════════════════════════════════════════════════════════════
//  M5 — Juno-Alpha AI Assistant
// ═══════════════════════════════════════════════════════════════════════

export type PersonaSlug = "general" | "code" | "scholar" | "office" | "life";

export type PersonaInfo = {
  slug: PersonaSlug;
  name_zh: string;
  name_en: string;
  icon: string;
  color: string;
  greeting_zh: string;
  greeting_en: string;
};

export type JunoMessage = {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export type ConversationSummary = {
  id: number;
  title: string;
  persona: string;
  created_at: string;
  updated_at: string;
};

export type ConversationDetail = ConversationSummary & {
  messages: JunoMessage[];
};

export type JunoQuota = {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
};

export const junoApi = {
  listPersonas: () => api.get<PersonaInfo[]>("/juno/personas"),
  getQuota: () => api.get<JunoQuota>("/juno/quota"),
  listConversations: () => api.get<ConversationSummary[]>("/juno/conversations"),
  getConversation: (id: number) => api.get<ConversationDetail>(`/juno/conversations/${id}`),
  createConversation: (persona: PersonaSlug, title?: string) =>
    api.post<ConversationSummary>("/juno/conversations", { persona, title: title || null }),
  renameConversation: (id: number, title: string) =>
    api.patch<ConversationSummary>(`/juno/conversations/${id}`, { title }),
  deleteConversation: (id: number) => api.delete(`/juno/conversations/${id}`),
};

/**
 * Stream chat via Server-Sent Events.
 *
 * Uses fetch + ReadableStream (not EventSource — can't POST with EventSource).
 * Calls `handlers` as events arrive.
 */
export async function streamJunoChat(
  payload: {
    conversation_id?: number | null;
    persona?: PersonaSlug;
    content: string;
  },
  handlers: {
    onMeta?: (data: { conversation_id: number; title: string; persona: string }) => void;
    onDelta?: (content: string) => void;
    onDone?: (data: { conversation_id: number; title: string }) => void;
    onError?: (message: string) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const resp = await fetch("/api/juno/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => "");
    handlers.onError?.(text || `HTTP ${resp.status}`);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events separated by blank line
      const events = buffer.split("\n\n");
      buffer = events.pop() || ""; // last segment may be incomplete

      for (const raw of events) {
        if (!raw.trim()) continue;
        const lines = raw.split("\n");
        let eventName = "message";
        let dataStr = "";
        for (const line of lines) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
        }
        let data: unknown = null;
        try {
          data = JSON.parse(dataStr);
        } catch {
          continue;
        }

        if (eventName === "meta") handlers.onMeta?.(data as { conversation_id: number; title: string; persona: string });
        else if (eventName === "delta") handlers.onDelta?.((data as { content: string }).content || "");
        else if (eventName === "done") handlers.onDone?.(data as { conversation_id: number; title: string });
        else if (eventName === "error") handlers.onError?.((data as { message: string }).message || "Unknown error");
      }
    }
  } catch (err: unknown) {
    if ((err as Error).name !== "AbortError") {
      handlers.onError?.((err as Error).message);
    }
  }
}

export type AdminStats = {
  real_users: number;
  ai_bots: number;
  total_posts: number;
  ai_posts: number;
  human_posts: number;
};

export type AdminPostItem = {
  id: number;
  post_uid: string;
  title: string;
  author_username: string;
  is_ai_author: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  status: string;
};

export type ProcessedArticle = {
  title_zh: string;
  title_en: string;
  content_zh: string;
  content_en: string;
  deep_analysis_zh: string;
  deep_analysis_en: string;
};

export const adminApi = {
  listArticles: (params: { page?: number; status?: string }) =>
    api.get<ArticleListResponse>("/admin/articles", { params }),
  getArticle: (id: number) => api.get<Article>(`/admin/articles/${id}`),
  createArticle: (data: object) => api.post<Article>("/admin/articles", data),
  updateArticle: (id: number, data: object) => api.put<Article>(`/admin/articles/${id}`, data),
  deleteArticle: (id: number) => api.delete(`/admin/articles/${id}`),
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ url: string; filename: string }>("/admin/upload-image", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  // Dashboard
  getStats: () => api.get<AdminStats>("/admin/stats"),
  // Community moderation
  listPosts: (params: { page?: number; page_size?: number }) =>
    api.get<{ items: AdminPostItem[]; total: number; page: number; total_pages: number }>(
      "/admin/posts",
      { params }
    ),
  deletePost: (uid: string) => api.delete(`/admin/posts/${uid}`),
  // LLM connectivity test
  testLLM: () =>
    api.get<{ ok: boolean; reply?: string; error?: string; model?: string; base_url?: string }>(
      "/admin/test-llm"
    ),
  // Full step-by-step diagnostic
  debugGenerate: () =>
    api.get<{ steps: Record<string, unknown>[]; conclusion: string }>(
      "/admin/debug-generate"
    ),
  // AI content generation
  generateAIPosts: (count: number, topic?: string) =>
    api.post<{ generated: number; post_uids: string[]; error: string | null }>(
      "/admin/ai-posts/generate",
      { count, topic: topic ?? null }
    ),
  // URL auto-process: scrape + AI rewrite + deep analysis
  processUrl: (url: string) =>
    api.post<ProcessedArticle>("/admin/process-url", { url }, { timeout: 180000 }),
};
