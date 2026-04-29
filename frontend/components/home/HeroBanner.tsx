"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

type Props = { locale: string };

export default function HeroBanner({ locale }: Props) {
  const isZh = locale === "zh";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 pt-24 pb-20">
      {/* Animated grid background */}
      <div
        className="absolute inset-0 bg-cyber-grid bg-cyber-grid opacity-40"
        aria-hidden="true"
      />
      {/* Radial glow */}
      <div
        className="absolute inset-0 bg-hero-radial"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span className="inline-block text-xs font-bold tracking-[0.3em] uppercase text-blue-400 mb-6 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20">
            {isZh ? "综合科技生态门户" : "Comprehensive Tech Ecosystem"}
          </span>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-none mb-6 tracking-tight">
            JIARUI{" "}
            <span className="cyber-text-gradient">TECH</span>
          </h1>

          <p className="text-lg sm:text-xl text-blue-200/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            {isZh
              ? "双语科技资讯 · AI 开发者社区 · 实时开源追踪 · 硬核数据可视化"
              : "Bilingual Tech News · AI Developer Community · Real-time Open Source Tracking · Data Visualization"}
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href={`/${locale}/news/all`}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40"
            >
              {isZh ? "探索资讯" : "Explore News"}
            </Link>
            <Link
              href={`/${locale}/auth/register`}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full border border-white/20 hover:border-white/40 transition-all duration-200 backdrop-blur-sm"
            >
              {isZh ? "加入社区" : "Join Community"}
            </Link>
          </div>
        </motion.div>

        {/* Floating stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto"
        >
          {[
            { label: isZh ? "双语文章" : "Bilingual Articles", value: "1000+" },
            { label: isZh ? "AI 工具" : "AI Tools", value: "500+" },
            { label: isZh ? "开源项目" : "Open Source", value: "Daily" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center"
            >
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-blue-300/70 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
