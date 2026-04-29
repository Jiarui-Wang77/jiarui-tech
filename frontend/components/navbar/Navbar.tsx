"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { User, LogOut, Settings, ChevronDown, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await authApi.logout();
    setUser(null);
    setUserMenuOpen(false);
    router.push(`/${locale}`);
  };

  const toggleLocale = () => {
    const newLocale = locale === "zh" ? "en" : "zh";
    router.push(window.location.pathname.replace(`/${locale}`, `/${newLocale}`));
  };

  const navBg = scrolled
    ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100"
    : "bg-white border-b border-gray-100";

  return (
    <nav className={cn("fixed top-0 left-0 right-0 z-50 transition-all duration-300", navBg)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">

          {/* ── LOGO ─────────────────────────────────────────────── */}
          <Link
            href={`/${locale}`}
            className="flex items-center gap-3 flex-shrink-0 group"
            aria-label="JIARUI TECH"
          >
            {/* ── 可替换 LOGO 图片 ── 将图片文件放入 public/logo.png 即可生效 */}
            <Image
              src="/logo.png"
              alt="JIARUI TECH Logo"
              width={44}
              height={44}
              priority
              className="h-11 w-auto object-contain"
            />
            {/* Logo mark — 渐变方块 + 字母 J + 电光点 */}
            <div
              className="relative w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-[1.04] transition-all duration-300"
              style={{
                background:
                  "linear-gradient(135deg, #1e40af 0%, #6d28d9 55%, #312e81 100%)",
              }}
            >
              {/* 主字母 J — 自定义 SVG，比纯文字有设计感 */}
              <svg
                viewBox="0 0 24 24"
                className="w-[26px] h-[26px] relative z-10"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 4 V14 a5 5 0 0 1 -10 0" />
                <circle cx="16" cy="4" r="1.4" fill="white" stroke="none" />
              </svg>
              {/* 光泽高光 */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
              {/* 右下电光点 */}
              <div className="absolute bottom-[4px] right-[4px] w-[6px] h-[6px] rounded-full bg-cyan-300 shadow-[0_0_7px_rgba(103,232,249,0.9)]" />
            </div>
            {/* Wordmark */}
            <div className="flex flex-col leading-none">
              <span className="font-black text-[24px] tracking-tight text-gray-900">
                JIARUI
                <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  {" "}TECH
                </span>
              </span>
              <span className="text-[9.5px] font-bold tracking-[0.32em] text-gray-400 uppercase mt-[4px] hidden sm:block">
                AI · Tech · Insight
              </span>
            </div>
          </Link>

          {/* ── 中部导航 ─────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href={`/${locale}`}
              className="text-sm font-semibold px-3 py-1.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {locale === "zh" ? "首页" : "Home"}
            </Link>
            <Link
              href={`/${locale}/juno`}
              className="relative text-sm font-black px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
            >
              <span className="flex items-center gap-1">
                ✨ Juno
              </span>
            </Link>
            <Link
              href={`/${locale}/community`}
              className="text-sm font-semibold px-3 py-1.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {locale === "zh" ? "社区" : "Community"}
            </Link>
            <Link
              href={`/${locale}/tracker`}
              className="text-sm font-semibold px-3 py-1.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {locale === "zh" ? "追踪器" : "Tracker"}
            </Link>
            <Link
              href={`/${locale}/ai-models`}
              className="text-sm font-semibold px-3 py-1.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {locale === "zh" ? "雷达榜" : "AI Radar"}
            </Link>
            <Link
              href={`/${locale}/community/leaderboard`}
              className="text-sm font-semibold px-3 py-1.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {locale === "zh" ? "榜单" : "Rankings"}
            </Link>
          </div>

          {/* ── 右侧控件 ─────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            {/* 语言切换 */}
            <button
              onClick={toggleLocale}
              className="hidden md:flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {locale === "zh" ? "🇬🇧 EN" : "🇨🇳 中文"}
            </button>

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:block text-gray-900">{user.username}</span>
                  <ChevronDown size={14} className="text-gray-900" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50"
                    >
                      <Link
                        href={`/${locale}/community/users/${user.username}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User size={15} />
                        {t("profile")}
                      </Link>
                      {user.role === "admin" && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings size={15} />
                          {t("admin")}
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={15} />
                        {t("logout")}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/auth/login`}
                  className="text-sm font-medium px-4 py-1.5 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {t("login")}
                </Link>
                <Link
                  href={`/${locale}/auth/register`}
                  className="text-sm font-semibold px-4 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  {t("register")}
                </Link>
              </div>
            )}

            {/* 移动端菜单按钮 */}
            <button
              className="md:hidden p-2 text-gray-900"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* 移动端菜单 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              <Link
                href={`/${locale}`}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-semibold text-gray-700 px-3 py-2 hover:bg-gray-50 rounded-lg"
              >
                {locale === "zh" ? "首页" : "Home"}
              </Link>
              <Link
                href={`/${locale}/juno`}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-black text-white px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg"
              >
                ✨ Juno AI
              </Link>
              <Link
                href={`/${locale}/community`}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-semibold text-gray-700 px-3 py-2 hover:bg-gray-50 rounded-lg"
              >
                {locale === "zh" ? "社区" : "Community"}
              </Link>
              <Link
                href={`/${locale}/tracker`}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-semibold text-gray-700 px-3 py-2 hover:bg-gray-50 rounded-lg"
              >
                {locale === "zh" ? "追踪器" : "Tracker"}
              </Link>
              <Link
                href={`/${locale}/ai-models`}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-semibold text-gray-700 px-3 py-2 hover:bg-gray-50 rounded-lg"
              >
                {locale === "zh" ? "雷达榜" : "AI Radar"}
              </Link>
              <Link
                href={`/${locale}/community/leaderboard`}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-semibold text-gray-700 px-3 py-2 hover:bg-gray-50 rounded-lg"
              >
                {locale === "zh" ? "榜单" : "Rankings"}
              </Link>
              <div className="h-px bg-gray-100 my-2" />
              <button
                onClick={toggleLocale}
                className="w-full text-left text-sm text-gray-600 px-3 py-2 hover:bg-gray-50 rounded-lg"
              >
                {locale === "zh" ? "🇬🇧 Switch to English" : "🇨🇳 切换为中文"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
