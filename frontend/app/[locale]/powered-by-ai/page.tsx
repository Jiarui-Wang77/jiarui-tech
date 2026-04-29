import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import Link from "next/link";
import { Cpu, MessageSquare, Rss, Github, BarChart2, ShieldCheck } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return {
    title: locale === "zh" ? "AI 驱动技术 — JIARUI TECH" : "Powered by AI — JIARUI TECH",
  };
}

const aiFeatures = [
  {
    icon: MessageSquare,
    titleZh: "Juno AI 助手",
    titleEn: "Juno AI Assistant",
    descZh: "基于 DeepSeek-V3 大语言模型构建的多人格 AI 助手，支持全能、编程、学术、职场、生活五种专属人格，提供流式输出体验。",
    descEn: "A multi-persona AI assistant built on DeepSeek-V3 LLM, featuring General, Code, Scholar, Office, and Life personas with real-time streaming output.",
    tag: "DeepSeek-V3",
    tagColor: "bg-blue-100 text-blue-700",
  },
  {
    icon: Rss,
    titleZh: "AI 资讯精选",
    titleEn: "AI News Curation",
    descZh: "精心筛选全球 AI 与科技前沿资讯，深度分析与快报并重，帮助读者在信息爆炸时代掌握真正重要的动态。",
    descEn: "Carefully curated global AI and tech news, balancing deep analysis with breaking updates to help readers navigate the information age.",
    tag: "Human-curated",
    tagColor: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: Github,
    titleZh: "GitHub 黑马追踪器",
    titleEn: "GitHub Tracker",
    descZh: "通过 Horse Score 算法实时追踪开源项目增长势能，结合 24 小时、7 天 Star 增量综合评分，发现下一个明星项目。",
    descEn: "Real-time tracking of open-source project growth momentum via Horse Score algorithm, combining 24h and 7d star deltas to surface the next breakout project.",
    tag: "Custom Algorithm",
    tagColor: "bg-violet-100 text-violet-700",
  },
  {
    icon: BarChart2,
    titleZh: "AI 模型雷达榜",
    titleEn: "AI Model Radar",
    descZh: "综合专业评分与社区评价的 AI 模型排行榜，涵盖编程、学术、职场、生活四大领域，帮助用户找到最适合的 AI 工具。",
    descEn: "An AI model leaderboard combining expert scoring and community ratings across Coding, Academic, Office, and Lifestyle domains.",
    tag: "Community + Expert",
    tagColor: "bg-amber-100 text-amber-700",
  },
];

export default async function PoweredByAIPage({ params }: Props) {
  const { locale } = await params;
  const isZh = locale === "zh";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white pt-[72px]">

        {/* Hero */}
        <div className="bg-gradient-to-br from-[#0a0a0b] via-[#0f0a1e] to-[#0a0a0b] text-white">
          <div className="max-w-4xl mx-auto px-6 py-24 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-neutral-300 mb-8">
              <Cpu size={14} className="text-violet-400" />
              {isZh ? "技术架构" : "Technology Stack"}
            </div>
            <h1 className="text-5xl font-black tracking-tight mb-6">
              {isZh ? "由 AI 驱动" : "Powered by AI"}
            </h1>
            <p className="text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              {isZh
                ? "JIARUI TECH 将 AI 深度融入产品每一个环节——不只是一个聊天框，而是一个真正的 AI 原生平台。"
                : "JIARUI TECH weaves AI into every layer of the product — not just a chatbot, but a truly AI-native platform."}
            </p>
          </div>
        </div>

        {/* AI Features Grid */}
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold text-neutral-900 text-center mb-3">
            {isZh ? "AI 如何驱动我们的平台" : "How AI Powers Our Platform"}
          </h2>
          <p className="text-neutral-500 text-center mb-14 max-w-xl mx-auto">
            {isZh ? "从内容到助手，每个核心功能都经过 AI 技术加持。" : "From content to assistants, every core feature is enhanced by AI."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {aiFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.titleEn} className="p-7 rounded-2xl border border-neutral-200 hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center">
                      <Icon size={20} className="text-neutral-700" />
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${f.tagColor}`}>
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="text-[17px] font-bold text-neutral-900 mb-2">
                    {isZh ? f.titleZh : f.titleEn}
                  </h3>
                  <p className="text-[14px] text-neutral-600 leading-relaxed">
                    {isZh ? f.descZh : f.descEn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tech stack */}
        <div className="bg-neutral-50 border-y border-neutral-200">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="text-xl font-bold text-neutral-900 mb-10 text-center">
              {isZh ? "技术栈" : "Tech Stack"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {[
                { name: "Next.js 14",     desc: isZh ? "前端框架" : "Frontend",       badge: "App Router" },
                { name: "FastAPI",        desc: isZh ? "后端框架" : "Backend",        badge: "Python" },
                { name: "DeepSeek-V3",   desc: isZh ? "AI 模型" : "AI Model",        badge: "LLM" },
                { name: "PostgreSQL",    desc: isZh ? "数据库" : "Database",         badge: "Async" },
                { name: "SQLAlchemy 2",  desc: isZh ? "ORM" : "ORM",                badge: "Async" },
                { name: "Tailwind CSS",  desc: isZh ? "样式框架" : "Styling",        badge: "v3" },
                { name: "Server-Sent Events", desc: isZh ? "实时流式输出" : "Streaming", badge: "SSE" },
                { name: "next-intl",     desc: isZh ? "国际化" : "i18n",             badge: "zh / en" },
              ].map((item) => (
                <div key={item.name} className="bg-white border border-neutral-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-bold text-neutral-900">{item.name}</span>
                    <span className="text-[10px] font-bold bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[12px] text-neutral-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Responsible AI */}
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="flex items-start gap-5 p-8 rounded-2xl border border-neutral-200 bg-white">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={22} className="text-green-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                {isZh ? "负责任的 AI 使用" : "Responsible AI Use"}
              </h3>
              <p className="text-[14px] text-neutral-600 leading-relaxed">
                {isZh
                  ? "我们深知 AI 技术的强大与局限。Juno AI 的输出不构成专业建议，用户应保持独立判断。我们持续监控 AI 输出质量，致力于提供准确、有帮助且安全的 AI 体验。如发现任何 AI 质量问题，欢迎通过反馈渠道告知我们。"
                  : "We understand both the power and limitations of AI technology. Juno AI outputs do not constitute professional advice, and users should maintain independent judgment. We continuously monitor AI output quality and are committed to providing accurate, helpful, and safe AI experiences. If you notice any quality issues, please let us know through the feedback channel."}
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/${locale}/feedback`}
                  className="text-sm font-semibold text-neutral-700 underline underline-offset-2 hover:text-neutral-900 transition-colors"
                >
                  {isZh ? "提交 AI 质量反馈 →" : "Submit AI quality feedback →"}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-neutral-900 text-white">
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h2 className="text-3xl font-black mb-4">
              {isZh ? "亲身体验 Juno AI" : "Experience Juno AI"}
            </h2>
            <p className="text-neutral-400 mb-8">
              {isZh ? "免费试用，每天 50 次对话额度。" : "Free to try — 50 conversations per day."}
            </p>
            <Link
              href={`/${locale}/juno`}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-neutral-900 rounded-xl font-bold text-[15px] hover:bg-neutral-100 transition-colors"
            >
              ✨ {isZh ? "开始对话" : "Start Chatting"}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
