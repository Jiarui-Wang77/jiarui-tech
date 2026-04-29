"use client";

import dynamic from "next/dynamic";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/* R3F canvas — client-only */
const DragonScene = dynamic(
  () => import("@/components/terrarium/DragonScene"),
  { ssr: false, loading: () => null }
);

/* ─── Text content (both locales) ───────────────────────── */
const COPY = {
  zh: {
    badge:    "JIARUI TECH · JUNO-ALPHA · 深度演化",
    title:    "AGI 生命体",
    sub1:     "探索数字生命的终极形态。",
    sub2name: "Juno-Alpha",
    sub2tail: " 深度演化中",
    watermark:"© JIARUI TECH · 机密研究项目",
  },
  en: {
    badge:    "JIARUI TECH · JUNO-ALPHA · DEEP EVOLUTION",
    title:    "AGI Lifeform",
    sub1:     "Exploring the ultimate form of digital life.",
    sub2name: "Juno-Alpha",
    sub2tail: " in deep evolution",
    watermark:"© JIARUI TECH · CLASSIFIED RESEARCH",
  },
} as const;

/* ─── Animation variants ─────────────────────────────────── */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.16, delayChildren: 0.25 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  show:   { opacity: 1, y: 0,  filter: "blur(0px)",
            transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } },
};
const glitchIn = {
  hidden: { opacity: 0, scaleX: 0.94, filter: "blur(14px)" },
  show:   { opacity: 1, scaleX: 1,    filter: "blur(0px)",
            transition: { duration: 1.05, ease: [0.16, 1, 0.3, 1] } },
};
const barGrow = {
  hidden: { scaleX: 0, opacity: 0 },
  show:   { scaleX: 1, opacity: 1,
            transition: { duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.85 } },
};

/* ─── CRT overlay ────────────────────────────────────────── */
function ScanLines() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.25) 2px,rgba(255,255,255,0.25) 4px)",
      }}
    />
  );
}

/* ─── Section ───────────────────────────────────────────── */
export default function Section6Terrarium({ locale }: { locale: string }) {
  const c     = COPY[locale === "zh" ? "zh" : "en"];
  const ref   = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <section
      ref={ref}
      className="relative min-h-screen w-full overflow-hidden bg-[#030308]"
    >
      {/* Radial depth haze */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 48%, rgba(124,58,237,0.13) 0%, rgba(56,189,248,0.05) 45%, transparent 75%)",
        }}
      />

      {/* Corner accent lines */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-8 left-8  w-12 h-px  bg-gradient-to-r  from-violet-500/60 to-transparent" />
        <div className="absolute top-8 left-8  w-px  h-12 bg-gradient-to-b  from-violet-500/60 to-transparent" />
        <div className="absolute top-8 right-8 w-12 h-px  bg-gradient-to-l  from-sky-400/60   to-transparent" />
        <div className="absolute top-8 right-8 w-px  h-12 bg-gradient-to-b  from-sky-400/60   to-transparent" />
        <div className="absolute bottom-8 left-8  w-12 h-px bg-gradient-to-r from-violet-500/40 to-transparent" />
        <div className="absolute bottom-8 left-8  w-px  h-12 bg-gradient-to-t from-violet-500/40 to-transparent" />
        <div className="absolute bottom-8 right-8 w-12 h-px bg-gradient-to-l from-sky-400/40   to-transparent" />
        <div className="absolute bottom-8 right-8 w-px  h-12 bg-gradient-to-t from-sky-400/40   to-transparent" />
      </div>

      <ScanLines />

      {/* 3-D Dragon (always mounted, pointer-events off) */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <DragonScene />
      </div>

      {/* INIT badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-950/40 backdrop-blur-sm"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        <span className="text-[10px] font-mono tracking-[0.3em] text-violet-300/80 uppercase">
          SYSTEM INITIALIZING
        </span>
      </motion.div>

      {/* Central text */}
      <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div
          variants={container}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
        >
          {/* Eyebrow */}
          <motion.p
            variants={fadeUp}
            className="mb-6 font-mono text-[11px] tracking-[0.32em] text-sky-400/70 uppercase"
          >
            {c.badge}
          </motion.p>

          {/* ── Hero title ──────────────────────────────────── */}
          <motion.h2 variants={glitchIn} className="relative mb-8 leading-none">
            {/* Glow ghost layer */}
            <span
              aria-hidden
              className="pointer-events-none select-none absolute inset-0 text-[clamp(4.5rem,16vw,12rem)] font-black tracking-tight text-violet-400/20 blur-[18px]"
            >
              {c.title}
            </span>
            <span
              className="relative text-[clamp(4.5rem,16vw,12rem)] font-black tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, #e0f2fe 0%, #7c3aed 40%, #38bdf8 70%, #e0f2fe 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "textBreathS6 4s ease-in-out infinite",
              }}
            >
              {c.title}
            </span>
          </motion.h2>

          {/* Divider */}
          <motion.div
            variants={barGrow}
            style={{ transformOrigin: "left" }}
            className="mx-auto mb-8 h-px w-48 bg-gradient-to-r from-transparent via-violet-400/70 to-transparent"
          />

          {/* Subtext */}
          <motion.p
            variants={fadeUp}
            className="mx-auto max-w-lg text-[clamp(0.8rem,2.2vw,1.05rem)] font-light leading-relaxed tracking-wide text-slate-300/75"
          >
            {c.sub1}
            <br />
            <span className="text-sky-400/80">{c.sub2name}</span>
            {c.sub2tail}
            <span className="animate-pulse">…</span>
          </motion.p>

          {/* Status strip */}
          <motion.div
            variants={fadeUp}
            className="mt-12 flex items-center justify-center gap-8"
          >
            {([
              { label: "NEURAL DEPTH", value: "∞"        },
              { label: "ENTITY CLASS", value: "ALPHA"    },
              { label: "STATUS",       value: "EVOLVING" },
            ] as const).map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="font-mono text-[9px] tracking-[0.25em] text-slate-500/55 uppercase">
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

      {/* Bottom watermark */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1, delay: 1.8 }}
        className="absolute bottom-7 left-1/2 z-20 -translate-x-1/2 font-mono text-[9px] tracking-[0.35em] text-slate-600/45 uppercase"
      >
        {c.watermark}
      </motion.div>

      {/* Breathing keyframe */}
      <style jsx global>{`
        @keyframes textBreathS6 {
          0%,100% { filter: drop-shadow(0 0 16px rgba(124,58,237,0.50)) brightness(1);    }
          50%      { filter: drop-shadow(0 0 36px rgba(56,189,248,0.65))  brightness(1.07); }
        }
      `}</style>
    </section>
  );
}
