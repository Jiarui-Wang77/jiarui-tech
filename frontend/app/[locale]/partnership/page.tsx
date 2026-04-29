import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import { Mail, Phone, Globe, Cpu, BarChart3, Newspaper } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return {
    title: locale === "zh" ? "商务合作 — JIARUI TECH" : "Partnership — JIARUI TECH",
  };
}

const partnerTypes = [
  {
    icon: Newspaper,
    titleZh: "内容合作",
    titleEn: "Content Partnership",
    descZh: "投稿优质 AI 科技文章，在 JIARUI TECH 平台上触达我们的读者群体。适合 AI 研究者、技术作者和科技媒体。",
    descEn: "Contribute high-quality AI and tech articles to reach our readership. Ideal for AI researchers, technical writers, and tech media outlets.",
    detailsZh: ["联合署名发布", "社区精选推荐位", "作者主页展示"],
    detailsEn: ["Co-bylined publications", "Featured community placement", "Author profile showcase"],
    color: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
  },
  {
    icon: Cpu,
    titleZh: "技术合作",
    titleEn: "Technology Partnership",
    descZh: "与 JIARUI TECH 共同开发 AI 功能、数据集成或平台扩展。适合 AI 公司、API 提供商和开发工具团队。",
    descEn: "Co-develop AI features, data integrations, or platform extensions. Ideal for AI companies, API providers, and developer tooling teams.",
    detailsZh: ["API 对接与集成", "联合技术白皮书", "产品功能共建"],
    detailsEn: ["API integration", "Joint technical white papers", "Co-built product features"],
    color: "bg-violet-50 border-violet-200",
    iconColor: "text-violet-600",
    iconBg: "bg-violet-100",
  },
  {
    icon: BarChart3,
    titleZh: "赞助与投资",
    titleEn: "Sponsorship & Investment",
    descZh: "支持 JIARUI TECH 的成长，获得品牌曝光、平台合作权益或战略投资机会。",
    descEn: "Support JIARUI TECH's growth and gain brand exposure, platform partnership rights, or strategic investment opportunities.",
    detailsZh: ["首页及 Juno 展示位", "定制化推广方案", "战略投资洽谈"],
    detailsEn: ["Homepage & Juno visibility", "Custom promotional packages", "Strategic investment discussions"],
    color: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100",
  },
  {
    icon: Globe,
    titleZh: "媒体与公关",
    titleEn: "Media & Press",
    descZh: "媒体报道、采访合作或内容授权。我们欢迎与科技媒体、播客和行业分析师建立联系。",
    descEn: "Press coverage, interview collaboration, or content licensing. We welcome connections with tech media, podcasters, and industry analysts.",
    detailsZh: ["新闻稿与资料包", "创始人专访", "独家内容授权"],
    detailsEn: ["Press releases & media kit", "Founder interviews", "Exclusive content licensing"],
    color: "bg-emerald-50 border-emerald-200",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100",
  },
];

export default async function PartnershipPage({ params }: Props) {
  const { locale } = await params;
  const isZh = locale === "zh";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white pt-[72px]">

        {/* Hero */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white">
          <div className="max-w-5xl mx-auto px-6 py-20 text-center">
            <p className="text-xs font-bold tracking-[0.25em] text-neutral-400 uppercase mb-4">
              {isZh ? "合作机会" : "Opportunities"}
            </p>
            <h1 className="text-5xl font-black tracking-tight mb-5">
              {isZh ? "商务合作" : "Partner With Us"}
            </h1>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              {isZh
                ? "JIARUI TECH 正处于快速成长阶段，我们欢迎各种形式的合作，共同构建 AI 科技生态。"
                : "JIARUI TECH is growing fast. We welcome partnerships of all kinds to build the AI tech ecosystem together."}
            </p>
          </div>
        </div>

        {/* Partnership types */}
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold text-neutral-900 text-center mb-3">
            {isZh ? "合作方式" : "Ways to Partner"}
          </h2>
          <p className="text-neutral-500 text-center mb-12 max-w-xl mx-auto">
            {isZh ? "选择最适合您的合作模式，我们会在 48 小时内回复。" : "Choose the model that fits you best. We respond within 48 hours."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {partnerTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.titleEn}
                  className={`rounded-2xl border p-7 ${type.color} transition-shadow hover:shadow-md`}
                >
                  <div className={`w-11 h-11 rounded-xl ${type.iconBg} flex items-center justify-center mb-5`}>
                    <Icon size={22} className={type.iconColor} />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">
                    {isZh ? type.titleZh : type.titleEn}
                  </h3>
                  <p className="text-[14px] text-neutral-600 leading-relaxed mb-5">
                    {isZh ? type.descZh : type.descEn}
                  </p>
                  <ul className="space-y-1.5">
                    {(isZh ? type.detailsZh : type.detailsEn).map((d) => (
                      <li key={d} className="flex items-center gap-2 text-[13px] text-neutral-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${type.iconBg} border ${type.color} flex-shrink-0`} />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact section */}
        <div className="bg-neutral-50 border-t border-neutral-200">
          <div className="max-w-3xl mx-auto px-6 py-20 text-center">
            <h2 className="text-3xl font-black text-neutral-900 mb-4">
              {isZh ? "开始合作" : "Get In Touch"}
            </h2>
            <p className="text-neutral-500 mb-10 leading-relaxed">
              {isZh
                ? "请通过以下任意方式联系我们，说明您的合作意向和基本情况。我们会认真对待每一封来信。"
                : "Reach out through any of the channels below with your partnership idea. We take every inquiry seriously."}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <a
                href="mailto:jiaruiwang456@gmail.com?subject=Partnership Inquiry — JIARUI TECH"
                className="flex items-center gap-2.5 px-6 py-3 bg-neutral-900 text-white rounded-xl font-semibold hover:bg-neutral-700 transition-colors"
              >
                <Mail size={16} />
                {isZh ? "发送合作邮件" : "Send Partnership Email"}
              </a>
              <a
                href="https://wa.me/60179636400"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-6 py-3 bg-[#25D366] text-white rounded-xl font-semibold hover:bg-[#1ebe5a] transition-colors"
              >
                <Phone size={16} />
                WhatsApp
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-neutral-500">
              <div className="bg-white border border-neutral-200 rounded-xl p-4">
                <p className="font-semibold text-neutral-700 mb-1">Email</p>
                <a href="mailto:jiaruiwang456@gmail.com" className="text-blue-600 text-[13px] hover:underline break-all">
                  jiaruiwang456@gmail.com
                </a>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-4">
                <p className="font-semibold text-neutral-700 mb-1">WeChat / 微信</p>
                <p className="text-[13px]">+86 155 9688 2359</p>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-4">
                <p className="font-semibold text-neutral-700 mb-1">WhatsApp</p>
                <p className="text-[13px]">+60 179 636 400</p>
              </div>
            </div>

            <p className="mt-8 text-[13px] text-neutral-400">
              {isZh ? "⏱ 通常在 48 小时内回复" : "⏱ Typically responds within 48 hours"}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
