"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Mail, Phone, MessageCircle, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

/* ══════════════════════════════════════════════════════════════════
   JW Personal Logo — real PNG (public/jw-logo.png)
   LOGO 是黑色的，页脚背景是黑色的，用 invert 让它变成白色显示
   ══════════════════════════════════════════════════════════════════ */
function JWLogo() {
  return (
    <Image
      src="/jw-logo.png"
      alt="JW — Jiarui Wang · JIARUI TECH"
      width={100}
      height={100}
      className="object-contain"
      style={{ filter: "invert(1) brightness(0.9)" }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════
   JIARUI TECH Site Logo (text version, white on dark)
   ══════════════════════════════════════════════════════════════════ */
function SiteLogo() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg"
        style={{ background: "linear-gradient(135deg, #1e40af 0%, #6d28d9 55%, #312e81 100%)" }}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white"
          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4 V14 a5 5 0 0 1 -10 0" />
          <circle cx="16" cy="4" r="1.4" fill="white" stroke="none" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-[3px] right-[3px] w-[5px] h-[5px] rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(103,232,249,0.9)]" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-black text-[20px] tracking-tight text-white">
          JIARUI
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
            {" "}TECH
          </span>
        </span>
        <span className="text-[8.5px] font-bold tracking-[0.28em] text-neutral-500 uppercase mt-[3px]">
          AI · Tech · Insight
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Main Footer
   ══════════════════════════════════════════════════════════════════ */
export default function Footer() {
  const locale = useLocale();
  const isZh = locale === "zh";
  const year = new Date().getFullYear();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const navLinks = [
    { href: `/${locale}`,                     label: isZh ? "首页"  : "Home"       },
    { href: `/${locale}/juno`,                label: "✨ Juno AI"                   },
    { href: `/${locale}/community`,           label: isZh ? "社区"  : "Community"  },
    { href: `/${locale}/tracker`,             label: isZh ? "追踪器": "Tracker"    },
    { href: `/${locale}/ai-models`,           label: isZh ? "雷达榜": "AI Radar"   },
    { href: `/${locale}/community/leaderboard`, label: isZh ? "榜单" : "Rankings"  },
  ];

  return (
    <footer className="bg-[#0a0a0b] border-t border-white/[0.06]">

      {/* ── Thin gold top accent line ── */}
      <div
        className="h-[1px] w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #B8860B 25%, #FFD700 50%, #B8860B 75%, transparent 100%)",
        }}
      />

      {/* ── Main footer body ── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

          {/* ── Column 1: Branding ── */}
          <div className="lg:col-span-1">
            <SiteLogo />

            <p className="mt-5 text-[13px] text-neutral-500 leading-relaxed max-w-[220px]">
              {isZh
                ? "汇聚 AI 前沿资讯、开发者社区、\n开源追踪与智能助手的科技生态平台。"
                : "Your hub for AI news, developer community, open-source tracking, and Juno AI assistant."}
            </p>

            {/* JW Personal Logo */}
            <div className="mt-8 pt-8 border-t border-white/[0.06]">
              <p className="text-[10px] font-bold tracking-[0.22em] text-neutral-600 uppercase mb-3">
                {isZh ? "创始人" : "Founder"}
              </p>
              <JWLogo />
              <p className="mt-2 text-[12px] text-neutral-500">Jiarui Wang</p>
            </div>
          </div>

          {/* ── Column 2: Navigation ── */}
          <div>
            <h3 className="text-[11px] font-bold tracking-[0.22em] text-neutral-500 uppercase mb-5">
              {isZh ? "导航" : "Navigation"}
            </h3>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-neutral-400 hover:text-white transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Column 3: Contact ── */}
          <div>
            <h3 className="text-[11px] font-bold tracking-[0.22em] text-neutral-500 uppercase mb-5">
              {isZh ? "联系方式" : "Contact"}
            </h3>

            <ul className="space-y-4">
              {/* WeChat / China */}
              <li className="flex items-start gap-2.5">
                <div className="mt-0.5 w-5 h-5 rounded-md bg-[#07C160]/15 flex items-center justify-center flex-shrink-0">
                  <MessageCircle size={11} className="text-[#07C160]" />
                </div>
                <div>
                  <p className="text-[13px] text-neutral-200 font-medium tracking-wide">+86 155 9688 2359</p>
                  <p className="text-[11px] text-neutral-600 mt-0.5">WeChat {isZh ? "同号" : "same"}</p>
                </div>
              </li>

              {/* WhatsApp / Malaysia */}
              <li className="flex items-start gap-2.5">
                <div className="mt-0.5 w-5 h-5 rounded-md bg-[#25D366]/15 flex items-center justify-center flex-shrink-0">
                  <Phone size={11} className="text-[#25D366]" />
                </div>
                <div>
                  <p className="text-[13px] text-neutral-200 font-medium tracking-wide">+60 179 636 400</p>
                  <p className="text-[11px] text-neutral-600 mt-0.5">WhatsApp {isZh ? "同号" : "same"}</p>
                </div>
              </li>

              {/* UK */}
              <li className="flex items-start gap-2.5">
                <div className="mt-0.5 w-5 h-5 rounded-md bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <Phone size={11} className="text-neutral-400" />
                </div>
                <div>
                  <p className="text-[13px] text-neutral-200 font-medium tracking-wide">+44 7432 549 220</p>
                  <p className="text-[11px] text-neutral-600 mt-0.5">UK</p>
                </div>
              </li>

              {/* Email */}
              <li className="flex items-start gap-2.5">
                <div className="mt-0.5 w-5 h-5 rounded-md bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                  <Mail size={11} className="text-blue-400" />
                </div>
                <div>
                  <a
                    href="mailto:jiaruiwang456@gmail.com"
                    className="text-[13px] text-neutral-200 font-medium hover:text-white transition-colors break-all"
                  >
                    jiaruiwang456@gmail.com
                  </a>
                  <p className="text-[11px] text-neutral-600 mt-0.5">{isZh ? "邮箱" : "Email"}</p>
                </div>
              </li>
            </ul>
          </div>

          {/* ── Column 4: About + Legal ── */}
          <div>
            <h3 className="text-[11px] font-bold tracking-[0.22em] text-neutral-500 uppercase mb-5">
              {isZh ? "关于" : "About"}
            </h3>

            <ul className="space-y-3 mb-8">
              <li>
                <Link href={`/${locale}/community`}
                  className="text-[14px] text-neutral-400 hover:text-white transition-colors">
                  {isZh ? "加入社区" : "Join Community"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/juno`}
                  className="text-[14px] text-neutral-400 hover:text-white transition-colors">
                  {isZh ? "体验 Juno AI" : "Try Juno AI"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/partnership`}
                  className="text-[14px] text-neutral-400 hover:text-white transition-colors">
                  {isZh ? "商务合作" : "Partnership"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/feedback`}
                  className="text-[14px] text-neutral-400 hover:text-white transition-colors">
                  {isZh ? "意见反馈" : "Feedback"}
                </Link>
              </li>
            </ul>

            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] text-neutral-500">
                {isZh ? "所有服务运行正常" : "All systems operational"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-neutral-600">
            © {year} JIARUI TECH. {isZh ? "保留所有权利。" : "All rights reserved."}
          </p>
          <div className="flex items-center gap-5">
            <Link href={`/${locale}/legal/privacy`} className="text-[12px] text-neutral-600 hover:text-neutral-300 transition-colors">
              {isZh ? "隐私政策" : "Privacy Policy"}
            </Link>
            <Link href={`/${locale}/legal/terms`} className="text-[12px] text-neutral-600 hover:text-neutral-300 transition-colors">
              {isZh ? "使用条款" : "Terms of Service"}
            </Link>
            <Link href={`/${locale}/powered-by-ai`} className="text-[12px] text-neutral-600 hover:text-neutral-300 transition-colors">
              {isZh ? "由 AI 驱动" : "Powered by AI"}
            </Link>
            {isAdmin && (
              <Link
                href={`/${locale}/admin`}
                className="inline-flex items-center gap-1 text-[12px] text-red-600/70 hover:text-red-400 transition-colors"
              >
                <ShieldAlert size={11} />
                {isZh ? "管理后台" : "Admin"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
