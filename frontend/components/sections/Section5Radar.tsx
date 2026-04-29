"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { aiModelsApi, type AIModelListItem } from "@/lib/api";

type Props = { locale: string };

// Fixed star data — no Math.random() on server, generated once on client
type Star = { w: string; h: string; left: string; top: string; opacity: number; delay: string; duration: string };

function StarField() {
  const [stars, setStars] = useState<Star[]>([]);
  useEffect(() => {
    // Only runs on client — no hydration mismatch
    const seed = Array.from({ length: 60 }, (_, i) => {
      const rand = (n: number) => ((Math.sin(i * 9301 + n * 49297 + 233995) * 0.5 + 0.5));
      return {
        w: rand(1) > 0.8 ? "2px" : "1px",
        h: rand(2) > 0.8 ? "2px" : "1px",
        left: `${rand(3) * 100}%`,
        top: `${rand(4) * 100}%`,
        opacity: rand(5) * 0.6 + 0.1,
        delay: `${rand(6) * 4}s`,
        duration: `${2 + rand(7) * 3}s`,
      };
    });
    setStars(seed);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s, i) => (
        <div key={i} className="absolute rounded-full bg-white animate-pulse"
          style={{ width: s.w, height: s.h, left: s.left, top: s.top, opacity: s.opacity, animationDelay: s.delay, animationDuration: s.duration }}
        />
      ))}
    </div>
  );
}

export default function Section5Radar({ locale }: Props) {
  const isZh = locale === "zh";
  const { user } = useAuthStore();

  const [models, setModels] = useState<AIModelListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiModelsApi
      .list({ sort: "overall" })
      .then((r) => setModels(r.data.items.slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxScore = models.length > 0 ? Math.max(...models.map((m) => m.overall_score)) : 100;

  return (
    <section className="min-h-screen py-24 relative overflow-hidden border-t border-slate-800/80 shadow-[0_-1px_0_rgba(56,189,248,0.15)_inset]"
      style={{
        background: "linear-gradient(180deg, #02050d 0%, #010208 60%, #000104 100%)",
      }}
    >
      <StarField />

      {/* Cyber grid */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(0,212,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,1) 1px,transparent 1px)", backgroundSize: "40px 40px" }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            {isZh ? "AI 模型综合性能排行" : "AI Model Performance Leaderboard"}
          </h2>
          <p className="text-slate-500 text-base max-w-xl mx-auto">
            {isZh
              ? "实时更新 · 四大场景横纵评测 · 自研测试数据"
              : "Live rankings · 4-domain benchmark · Proprietary test data"}
          </p>
        </motion.div>

        {/* Performance bars — LIVE DATA */}
        <div className="max-w-3xl mx-auto mb-16 space-y-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-6 bg-slate-800/50 rounded-full animate-pulse" />
            ))
          ) : models.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-10 bg-slate-900/40 rounded-2xl border border-slate-800">
              {isZh ? "暂无模型数据，请运行 seed.py" : "No data yet — run seed.py"}
            </div>
          ) : (
            models.map((model, i) => {
              const color = model.brand_color || "#06b6d4";
              return (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                >
                  <Link
                    href={`/${locale}/ai-models/${model.slug}`}
                    className="flex items-center gap-4 group"
                  >
                    <span className="text-slate-500 text-xs w-4 text-right font-mono">{i + 1}</span>
                    <span className="text-sm font-bold text-white w-28 flex-shrink-0 truncate group-hover:text-cyan-400 transition-colors">
                      {model.name}
                    </span>
                    <div className="flex-1 bg-slate-800/60 rounded-full h-3 overflow-hidden border border-slate-700/50">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(model.overall_score / maxScore) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: i * 0.08 + 0.3, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${color}99, ${color})`,
                          boxShadow: `0 0 12px ${color}66`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-black w-12 text-right font-mono" style={{ color }}>
                      {model.overall_score.toFixed(1)}
                    </span>
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>

        {/* 4 domains preview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {[
            { icon: "💻", label: isZh ? "极客开发" : "Coding & Dev",    desc: isZh ? "代码生成·架构·Debug" : "Code gen · Arch · Debug" },
            { icon: "🔬", label: isZh ? "学术科研" : "Academic",         desc: isZh ? "文献综述·结构输出" : "Literature · Output" },
            { icon: "💼", label: isZh ? "职场效率" : "Office & Biz",     desc: isZh ? "表达·图表·沟通" : "Writing · Charts · Comm" },
            { icon: "🎮", label: isZh ? "生活策略" : "Lifestyle",         desc: isZh ? "行程规划·游戏策略" : "Planning · Strategy" },
          ].map((domain, i) => (
            <motion.div
              key={domain.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-5 text-center hover:border-cyan-500/40 hover:bg-slate-900/80 transition-all cursor-pointer group"
            >
              <span className="text-3xl mb-3 block">{domain.icon}</span>
              <p className="text-sm font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">{domain.label}</p>
              <p className="text-xs text-slate-500">{domain.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA — 进入完整雷达榜 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-3xl border border-cyan-500/20 bg-slate-900/40 p-10 text-center overflow-hidden"
          style={{ boxShadow: "0 0 80px rgba(0,212,255,0.05), inset 0 0 80px rgba(0,212,255,0.02)" }}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <Globe size={400} className="text-cyan-400" strokeWidth={0.3} />
          </div>
          <div className="relative z-10">
            <Trophy className="mx-auto text-cyan-400 mb-4" size={48} />
            <h3 className="text-2xl font-black text-white mb-2">
              {isZh ? "完整雷达 · 对比 · 社区评分" : "Full Radar · Compare · Community Voting"}
            </h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              {isZh
                ? "四维雷达图 · 多模型同框对比 · 真实用户评分加权"
                : "4-axis radar · Side-by-side compare · Community-weighted scoring"}
            </p>
            <Link
              href={`/${locale}/ai-models`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black rounded-full transition-all shadow-lg shadow-cyan-500/30"
            >
              {isZh ? "进入完整雷达榜" : "Enter Full Leaderboard"}
              <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>

        {/* Footer brand */}
        <div className="text-center mt-20 pb-4">
          <p className="font-black text-2xl text-white/10 tracking-widest">JIARUI TECH</p>
        </div>
      </div>
    </section>
  );
}
