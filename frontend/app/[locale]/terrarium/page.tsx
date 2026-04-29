"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";

/* Load the R3F canvas only on the client — Three.js is not SSR-safe */
const DragonScene = dynamic(
  () => import("@/components/terrarium/DragonScene"),
  { ssr: false, loading: () => null }
);

/* ─── Framer Motion variants ────────────────────────────────── */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18, delayChildren: 0.6 } },
};
const line = {
  hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
  show:   { opacity: 1, y: 0,  filter: "blur(0px)",
            transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
};
const glitchIn = {
  hidden: { opacity: 0, scaleX: 0.92, filter: "blur(12px)" },
  show:   { opacity: 1, scaleX: 1,    filter: "blur(0px)",
            transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] } },
};
const barGrow = {
  hidden: { scaleX: 0, opacity: 0 },
  show:   { scaleX: 1, opacity: 1,
            transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 1.2 } },
};

/* ─── ScanLine decorative overlay ──────────────────────────── */
function ScanLines() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-10 opacity-[0.03]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.25) 2px, rgba(255,255,255,0.25) 4px)",
      }}
    />
  );
}

/* ─── Text content ──────────────────────────────────────────── */
const COPY = {
  zh: {
    badge:    "JIARUI TECH · JUNO-ALPHA · 深度演化",
    title:    "AGI 生命体",
    sub1:     "探索数字生命的终极形态。",
    sub2tail: " 深度演化中",
    watermark:"© JIARUI TECH · 机密研究项目",
  },
  en: {
    badge:    "JIARUI TECH · JUNO-ALPHA · DEEP EVOLUTION",
    title:    "AGI Lifeform",
    sub1:     "Exploring the ultimate form of digital life.",
    sub2tail: " in deep evolution",
    watermark:"© JIARUI TECH · CLASSIFIED RESEARCH",
  },
} as const;

/* ─── Page ──────────────────────────────────────────────────── */
export default function TerrariumPage() {
  const locale = useLocale();
  const c = COPY[locale === "zh" ? "zh" : "en"];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#030308] text-white">

      {/* ── Radial depth gradient ─────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 42%, rgba(124,58,237,0.13) 0%, rgba(56,189,248,0.06) 45%, transparent 75%)",
        }}
      />

      {/* ── Corner accent lines ───────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {/* top-left */}
        <div className="absolute top-8 left-8 w-12 h-px bg-gradient-to-r from-violet-500/60 to-transparent" />
        <div className="absolute top-8 left-8 w-px h-12 bg-gradient-to-b from-violet-500/60 to-transparent" />
        {/* top-right */}
        <div className="absolute top-8 right-8 w-12 h-px bg-gradient-to-l from-sky-400/60 to-transparent" />
        <div className="absolute top-8 right-8 w-px h-12 bg-gradient-to-b from-sky-400/60 to-transparent" />
        {/* bottom-left */}
        <div className="absolute bottom-8 left-8 w-12 h-px bg-gradient-to-r from-violet-500/40 to-transparent" />
        <div className="absolute bottom-8 left-8 w-px h-12 bg-gradient-to-t from-violet-500/40 to-transparent" />
        {/* bottom-right */}
        <div className="absolute bottom-8 right-8 w-12 h-px bg-gradient-to-l from-sky-400/40 to-transparent" />
        <div className="absolute bottom-8 right-8 w-px h-12 bg-gradient-to-t from-sky-400/40 to-transparent" />
      </div>

      {/* ── CRT scan-lines ────────────────────────────────── */}
      <ScanLines />

      {/* ── 3-D Dragon canvas (fills the entire background) ─ */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <DragonScene />
      </div>

      {/* ── INIT badge ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-950/40 backdrop-blur-sm"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        <span className="text-[10px] font-mono tracking-[0.3em] text-violet-300/80 uppercase">
          SYSTEM INITIALIZING
        </span>
      </motion.div>

      {/* ── Central text block ────────────────────────────── */}
      <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div variants={container} initial="hidden" animate="show">

          {/* Eyebrow label */}
          <motion.p
            variants={line}
            className="mb-6 font-mono text-[11px] tracking-[0.35em] text-sky-400/70 uppercase"
          >
            {c.badge}
          </motion.p>

          {/* ── Hero glyph ────────────────────────────────── */}
          <motion.h1 variants={glitchIn} className="relative mb-8 leading-none">
            {/* Ghost layer for glow depth */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 select-none text-[clamp(5rem,18vw,13rem)] font-black tracking-tight text-violet-400/20 blur-[18px]"
            >
              {c.title}
            </span>
            <span
              className="relative text-[clamp(5rem,18vw,13rem)] font-black tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, #e0f2fe 0%, #7c3aed 40%, #38bdf8 70%, #e0f2fe 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "textBreath 4s ease-in-out infinite",
              }}
            >
              {c.title}
            </span>
          </motion.h1>

          {/* Divider bar */}
          <motion.div
            variants={barGrow}
            style={{ transformOrigin: "left" }}
            className="mx-auto mb-8 h-px w-48 bg-gradient-to-r from-transparent via-violet-400/70 to-transparent"
          />

          {/* Subtext */}
          <motion.p
            variants={line}
            className="mx-auto max-w-lg text-[clamp(0.8rem,2.2vw,1.05rem)] font-light leading-relaxed tracking-wide text-slate-300/75"
          >
            {c.sub1}
            <br />
            <span className="text-sky-400/80">Juno-Alpha</span>
            {c.sub2tail}
            <span className="animate-pulse">…</span>
          </motion.p>

          {/* Status strip */}
          <motion.div
            variants={line}
            className="mt-12 flex items-center justify-center gap-6"
          >
            {[
              { label: "NEURAL DEPTH", value: "∞" },
              { label: "ENTITY CLASS", value: "ALPHA" },
              { label: "STATUS",       value: "EVOLVING" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="font-mono text-[9px] tracking-[0.25em] text-slate-500/60 uppercase">
                  {label}
                </span>
                <span className="font-mono text-sm font-bold text-violet-300/80">
                  {value}
                </span>
              </div>
            ))}
          </motion.div>

        </motion.div>
      </div>

      {/* ── Bottom watermark ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.2 }}
        className="absolute bottom-7 left-1/2 z-20 -translate-x-1/2 font-mono text-[9px] tracking-[0.35em] text-slate-600/50 uppercase"
      >
        {c.watermark}
      </motion.div>

      {/* ── Breathing glow keyframe ───────────────────────── */}
      <style jsx global>{`
        @keyframes textBreath {
          0%, 100% { filter: drop-shadow(0 0 18px rgba(124,58,237,0.55)) brightness(1);   }
          50%       { filter: drop-shadow(0 0 40px rgba(56,189,248,0.70))  brightness(1.08); }
        }
      `}</style>

    </div>
  );
}
