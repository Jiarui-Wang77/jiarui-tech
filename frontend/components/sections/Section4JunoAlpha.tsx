"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

type Props = { locale: string };

export default function Section4JunoAlpha({ locale }: Props) {
  const isZh = locale === "zh";
  const { user } = useAuthStore();

  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden border-t border-slate-700/60 shadow-[0_-1px_0_rgba(56,189,248,0.12)_inset]"
      style={{
        // 深海压迫感渐变：从顶部近黑 → 深海墨蓝 → 深渊黑
        background: "radial-gradient(ellipse 120% 80% at 50% 110%, #001024 0%, #020814 40%, #000306 90%)",
      }}
    >

      {/* ── 深海压迫感背景氛围 ───────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">

        {/* 顶部黑色压迫 — 像深海水压从上方压下 */}
        <div className="absolute top-0 left-0 right-0 h-[40%]"
          style={{ background: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0.85) 40%, transparent 100%)" }}
        />

        {/* 从下而上的幽暗蓝光 — 深渊光束 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px]
                        bg-[#001a38]/90 rounded-full blur-[120px]" />

        {/* 两侧暗角 — vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 90% 60% at 50% 50%, transparent 0%, transparent 40%, rgba(0,0,0,0.75) 100%)" }}
        />

        {/* 远处悬浮粒子 — 深海浮游物 */}
        {[...Array(18)].map((_, i) => {
          const top = (i * 37) % 100;
          const left = (i * 53) % 100;
          const size = 1 + ((i * 7) % 3);
          return (
            <div key={i}
              className="absolute rounded-full bg-cyan-100/20"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: size,
                height: size,
                boxShadow: "0 0 4px rgba(103,232,249,0.35)",
              }}
            />
          );
        })}

        {/* 红色深渊光 — 来自怪兽 */}
        <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[360px] h-[140px]
                        bg-red-900/40 rounded-full blur-[70px]" />

        {/* 细密网格 */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(0,212,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,1) 1px,transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* 扫描线 */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,180,255,0.4) 2px,rgba(0,180,255,0.4) 3px)" }}
        />

        {/* 噪点胶片纹理 — 海报感 */}
        <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* ── 主体内容 ─────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col items-center">

        {/* ── 标题：3/4 在海面上，1/4 在海水中 ─────────── */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-0"
        >
          {/* 主标题容器 */}
          <div className="relative overflow-hidden" style={{ paddingBottom: "0.05em" }}>
            <h1
              className="text-[clamp(4rem,12vw,9rem)] font-black tracking-tight whitespace-nowrap leading-none select-none"
              style={{
                background: "linear-gradient(180deg, #e0f2fe 0%, #7dd3fc 35%, #38bdf8 55%, #0c4a6e 80%, #071e33 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Juno-Alpha 1.0
            </h1>

            {/* 海水遮罩 — 覆盖底部 1/4 */}
            <div
              className="absolute bottom-0 left-0 right-0 pointer-events-none"
              style={{ height: "28%" }}
            >
              {/* 波浪表面 */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.6) 20%, rgba(14,165,233,0.9) 50%, rgba(56,189,248,0.6) 80%, transparent 100%)",
                  boxShadow: "0 0 12px rgba(56,189,248,0.5), 0 0 30px rgba(14,165,233,0.2)",
                }}
              />
              {/* 水体渐变 */}
              <div
                className="absolute inset-0 top-[3px]"
                style={{
                  background: "linear-gradient(180deg, rgba(7,30,60,0.88) 0%, rgba(2,5,12,0.97) 100%)",
                }}
              />
              {/* 水中文字扭曲感 — 用模糊叠加模拟折射 */}
              <div
                className="absolute inset-0 top-[3px]"
                style={{
                  backdropFilter: "blur(1.5px)",
                  WebkitBackdropFilter: "blur(1.5px)",
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* ── COMING SOON ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-6 flex flex-col items-center gap-3"
        >
          {/* CTA — Juno-Alpha 上线！可点击进入 */}
          <Link
            href={user ? `/${locale}/juno` : `/${locale}/auth/login`}
            className="group flex items-center gap-4 px-10 py-5 border border-cyan-500/40 rounded-2xl hover:border-cyan-400 transition-all hover:scale-[1.02]"
            style={{
              background: "rgba(0,212,255,0.08)",
              boxShadow: "0 0 40px rgba(0,212,255,0.12), inset 0 0 40px rgba(0,212,255,0.04)",
            }}
          >
            {/* 脉冲点 — 绿色表示在线 */}
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            {/* 主文案 */}
            <span
              style={{
                fontSize: "clamp(1.4rem, 3.5vw, 2.6rem)",
                fontWeight: 900,
                fontStyle: "italic",
                letterSpacing: "0.04em",
                background: "linear-gradient(90deg, #7dd3fc, #38bdf8, #818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {isZh ? "立即对话" : "Chat Now"}
            </span>
            <ArrowRight className="text-cyan-300 group-hover:translate-x-1 transition-transform" size={28} />
          </Link>

          {/* 品牌标识行 — 更明显但不过大 */}
          <p
            style={{
              letterSpacing: "0.2em",
              fontWeight: 900,
              fontStyle: "normal",
              fontSize: "clamp(0.78rem, 1.4vw, 1rem)",
              background: "linear-gradient(90deg, #cbd5e1, #e0f2fe, #cbd5e1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 18px rgba(148,197,253,0.3)",
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
            }}
          >
            JIARUI TECH &nbsp;|&nbsp; Juno-Alpha 1.0
          </p>
        </motion.div>
      </div>

      {/* ── 深渊红眼 — 从海水里偷看 ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
        className="absolute bottom-[4%] left-1/2 -translate-x-1/2 flex flex-col items-center"
      >
        {/* 眼睛容器 */}
        <div className="relative flex items-center justify-center">
          {/* 外层红晕 — 最大 */}
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              width: 140, height: 60,
              background: "radial-gradient(ellipse, rgba(220,38,38,0.12) 0%, transparent 70%)",
              animationDuration: "3s",
            }}
          />
          {/* 中层红晕 */}
          <div
            className="absolute rounded-full"
            style={{
              width: 90, height: 38,
              background: "radial-gradient(ellipse, rgba(220,38,38,0.22) 0%, transparent 70%)",
            }}
          />
          {/* 眼白（深红色虹膜） */}
          <div
            className="relative rounded-full overflow-hidden"
            style={{
              width: 56, height: 22,
              background: "radial-gradient(ellipse at 50% 50%, #7f1d1d 0%, #450a0a 60%, #1c0404 100%)",
              boxShadow: "0 0 20px rgba(220,38,38,0.6), 0 0 50px rgba(220,38,38,0.25), inset 0 0 10px rgba(0,0,0,0.8)",
            }}
          >
            {/* 瞳孔 */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 14, height: 18,
                background: "radial-gradient(ellipse, #000 60%, #1a0000 100%)",
                boxShadow: "0 0 6px rgba(220,38,38,0.8)",
              }}
            />
            {/* 高光 */}
            <div
              className="absolute rounded-full bg-white/30"
              style={{ width: 5, height: 5, top: 4, left: 14 }}
            />
          </div>
        </div>

        {/* 眼睛下方水纹 */}
        <div
          className="mt-1 opacity-30"
          style={{
            width: 120,
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.6), transparent)",
          }}
        />
      </motion.div>

    </section>
  );
}
