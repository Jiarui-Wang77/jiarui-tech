"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import { Send, Bug, Lightbulb, MessageSquare, Bot, CheckCircle2 } from "lucide-react";

type FeedbackType = "bug" | "feature" | "ai" | "general";

const TYPES: { id: FeedbackType; iconZh: string; iconEn: string; icon: typeof Bug; color: string }[] = [
  { id: "bug",     iconZh: "Bug 报告",     iconEn: "Bug Report",       icon: Bug,           color: "border-red-200 bg-red-50 text-red-700"     },
  { id: "feature", iconZh: "功能建议",     iconEn: "Feature Request",  icon: Lightbulb,     color: "border-amber-200 bg-amber-50 text-amber-700"},
  { id: "ai",      iconZh: "AI 质量反馈",  iconEn: "AI Quality",       icon: Bot,           color: "border-violet-200 bg-violet-50 text-violet-700"},
  { id: "general", iconZh: "一般反馈",     iconEn: "General Feedback", icon: MessageSquare, color: "border-blue-200 bg-blue-50 text-blue-700"  },
];

export default function FeedbackPage() {
  const locale = useLocale();
  const isZh = locale === "zh";
  const router = useRouter();

  const [type, setType] = useState<FeedbackType>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedType = TYPES.find((t) => t.id === type);
    const typeLabel = isZh ? selectedType?.iconZh : selectedType?.iconEn;
    const mailSubject = encodeURIComponent(`[JIARUI TECH Feedback · ${typeLabel}] ${subject}`);
    const body = encodeURIComponent(
      `Type: ${typeLabel}\nSubject: ${subject}\nEmail: ${email || "Not provided"}\n\n${message}`
    );
    window.open(`mailto:jiaruiwang456@gmail.com?subject=${mailSubject}&body=${body}`, "_blank");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-white pt-[72px] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6 py-20">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-neutral-900 mb-3">
              {isZh ? "感谢您的反馈！" : "Thank you for your feedback!"}
            </h2>
            <p className="text-neutral-500 mb-8 leading-relaxed">
              {isZh
                ? "您的邮件客户端已打开，请确认发送。我们通常在 48 小时内回复。"
                : "Your email client should have opened. Please confirm to send. We typically respond within 48 hours."}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setSubmitted(false)}
                className="px-5 py-2.5 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {isZh ? "再提交一条" : "Submit another"}
              </button>
              <button
                onClick={() => router.push(`/${locale}`)}
                className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold hover:bg-neutral-700 transition-colors"
              >
                {isZh ? "返回首页" : "Back to Home"}
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white pt-[72px]">
        {/* Hero */}
        <div className="bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-2xl mx-auto px-6 py-14">
            <p className="text-xs font-bold tracking-[0.25em] text-neutral-400 uppercase mb-3">
              {isZh ? "与我们分享" : "Share With Us"}
            </p>
            <h1 className="text-4xl font-black text-neutral-900 tracking-tight mb-3">
              {isZh ? "意见反馈" : "Feedback"}
            </h1>
            <p className="text-neutral-500 leading-relaxed">
              {isZh
                ? "您的每一条反馈都会被认真阅读，帮助我们把 JIARUI TECH 做得更好。"
                : "Every piece of feedback is read carefully and helps us make JIARUI TECH better."}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto px-6 py-14">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Type selector */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-3">
                {isZh ? "反馈类型" : "Feedback Type"}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TYPES.map((t) => {
                  const Icon = t.icon;
                  const isActive = type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl border-2 transition-all text-center ${
                        isActive
                          ? t.color + " border-current shadow-sm"
                          : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-[12px] font-semibold leading-snug">
                        {isZh ? t.iconZh : t.iconEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                {isZh ? "主题" : "Subject"} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder={isZh ? "简短描述您的问题或建议…" : "Brief summary of your feedback…"}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-[15px] text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                {isZh ? "详细描述" : "Details"} <span className="text-red-400">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                placeholder={
                  isZh
                    ? "请描述您遇到的问题，或您希望看到的功能…\n\n如果是 Bug，请包括：重现步骤、预期行为、实际行为。"
                    : "Describe the issue or the feature you'd like to see…\n\nFor bugs, please include: steps to reproduce, expected vs actual behavior."
                }
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-[15px] text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Email (optional) */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                {isZh ? "您的邮箱（可选）" : "Your Email (Optional)"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isZh ? "方便我们回复您…" : "So we can follow up with you…"}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-[15px] text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
              />
              <p className="mt-1.5 text-[12px] text-neutral-400">
                {isZh ? "不填写则为匿名反馈" : "Leave blank to submit anonymously"}
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!subject.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-neutral-900 text-white rounded-xl font-semibold text-[15px] hover:bg-neutral-700 transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              {isZh ? "提交反馈" : "Submit Feedback"}
            </button>

            <p className="text-center text-[12px] text-neutral-400">
              {isZh
                ? "点击提交将打开您的邮件客户端。我们通常在 48 小时内回复。"
                : "Clicking submit will open your email client. We typically respond within 48 hours."}
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
