"use client";

/**
 * Logo preview playground — lets you A/B compare 6 dragon-themed variants
 * against the current logo at multiple sizes.
 *
 * Not linked from the main nav; just visit:
 *   http://localhost:3000/zh/logo-preview
 */

const GRADIENT = "linear-gradient(135deg, #1e40af 0%, #6d28d9 55%, #312e81 100%)";

// ════════════════════════════════════════════════════════════════════
// Variant renderers — each is a `size`-agnostic component using viewBox
// ════════════════════════════════════════════════════════════════════

function LogoBase({ children, size }: { children: React.ReactNode; size: number }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden shadow-lg shadow-indigo-500/30"
      style={{ width: size, height: size, background: GRADIENT }}
    >
      {children}
      {/* glossy highlight */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

/* ── V0: Current logo (for comparison) ─────────────────────────── */
function V0Current({ size }: { size: number }) {
  return (
    <LogoBase size={size}>
      <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto" width={size * 0.6} height={size * 0.6}
        fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4 V14 a5 5 0 0 1 -10 0" />
        <circle cx="16" cy="4" r="1.4" fill="white" stroke="none" />
      </svg>
      <div className="absolute rounded-full bg-cyan-300"
        style={{ width: size * 0.14, height: size * 0.14, bottom: size * 0.09, right: size * 0.09,
          boxShadow: "0 0 7px rgba(103,232,249,0.9)" }} />
    </LogoBase>
  );
}

/* ── V1: Dragon Curl — 盘龙 J ─────────────────────────────────── */
/* Chinese-serpent-style curl, with pearl eye. J-like silhouette. */
function V1DragonCurl({ size }: { size: number }) {
  return (
    <LogoBase size={size}>
      <svg viewBox="0 0 24 24" className="absolute inset-0" width="100%" height="100%">
        <defs>
          <linearGradient id="dc1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
        {/* Serpentine dragon body forming a J */}
        <path
          d="M 17 4
             C 17 4, 18 6, 16 8
             C 14 10, 12 8, 12 10
             C 12 14, 14 16, 11 18
             C 8 19.5, 4.5 17.5, 5 13"
          fill="none"
          stroke="url(#dc1)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        {/* Dragon scales (small ticks along the body) */}
        <path d="M 14.5 8 l 0.5 -1  M 13 11 l 0.8 -0.6  M 12.5 14 l 1 -0.4  M 10 17 l 0.8 -0.8"
          stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
        {/* Pearl (dragon holds a pearl — classic motif) */}
        <circle cx="5" cy="13" r="1.6" fill="#67e8f9"
          style={{ filter: "drop-shadow(0 0 3px rgba(103,232,249,0.9))" }} />
        {/* Dragon head tip */}
        <circle cx="17.5" cy="4" r="0.8" fill="white" />
      </svg>
    </LogoBase>
  );
}

/* ── V2: Dragon Eye — 龙目 ─────────────────────────────────────── */
/* Almond-shaped eye with vertical slit pupil — tech + ancient. */
function V2DragonEye({ size }: { size: number }) {
  return (
    <LogoBase size={size}>
      <svg viewBox="0 0 24 24" className="absolute inset-0" width="100%" height="100%">
        <defs>
          <radialGradient id="eye-iris" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="80%" stopColor="#0e7490" />
          </radialGradient>
        </defs>
        {/* Eye shape — almond */}
        <path d="M 3 12 C 6 5, 18 5, 21 12 C 18 19, 6 19, 3 12 Z" fill="white" />
        {/* Iris */}
        <ellipse cx="12" cy="12" rx="4.2" ry="4.2" fill="url(#eye-iris)" />
        {/* Vertical slit pupil */}
        <path d="M 12 8.5 L 12 15.5" stroke="#0a0a0a" strokeWidth="1.8" strokeLinecap="round" />
        {/* Small J mark — tucked in the corner */}
        <text x="17" y="22" fontSize="5" fontWeight="900" fill="white" fontFamily="ui-sans-serif" opacity="0.9">J</text>
        {/* Highlight */}
        <circle cx="10.3" cy="10.3" r="0.9" fill="white" />
      </svg>
    </LogoBase>
  );
}

/* ── V3: Dragon Flame J — 龙焰 J ──────────────────────────────── */
/* Letter J with flame tendrils rising. */
function V3FlameJ({ size }: { size: number }) {
  return (
    <LogoBase size={size}>
      <svg viewBox="0 0 24 24" className="absolute inset-0" width="100%" height="100%">
        <defs>
          <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>
        </defs>
        {/* Flames rising behind J */}
        <path
          d="M 14 3 C 13 6, 15 7, 14 10 C 13 13, 16 14, 15 17
             M 17 4 C 17 7, 19 8, 18 11
             M 11 4 C 12 6, 10 8, 12 11"
          stroke="url(#flame)" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.85"
        />
        {/* Main J letter */}
        <path
          d="M 17 6 V 15 a5 5 0 0 1 -10 0"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Serif cap on top of J — suggesting horn */}
        <path d="M 14 6 L 20 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        {/* Ember dot */}
        <circle cx="17" cy="3" r="1.3" fill="#fef3c7"
          style={{ filter: "drop-shadow(0 0 4px rgba(254,243,199,0.9))" }} />
      </svg>
    </LogoBase>
  );
}

/* ── V4: Dragon Horn J — 龙角 J ───────────────────────────────── */
/* Letter J with stylised dragon horns at the top. */
function V4HornJ({ size }: { size: number }) {
  return (
    <LogoBase size={size}>
      <svg viewBox="0 0 24 24" className="absolute inset-0" width="100%" height="100%">
        {/* Horns (branching) */}
        <path
          d="M 16 6 C 15.5 3, 18 2, 19 3.5 C 19.5 4.5, 18.5 5.5, 17 5
             M 18.5 3.5 C 19.5 2.5, 21 3, 21 4.5"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* J letter */}
        <path
          d="M 16 6 V 14 a5 5 0 0 1 -10 0"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Scale texture — 3 tiny chevrons on J body */}
        <path d="M 16 8.5 l -1.2 0.6  M 16 10.5 l -1.2 0.6  M 16 12.5 l -1.2 0.6"
          stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
        {/* Pearl */}
        <circle cx="6" cy="14" r="0.9" fill="#67e8f9" />
      </svg>
    </LogoBase>
  );
}

/* ── V5: Dragon Scale J — 龙鳞 J ──────────────────────────────── */
/* Letter J with a dragon-scale textured background. */
function V5ScaleJ({ size }: { size: number }) {
  const scaleId = `scales-${size}`;
  return (
    <LogoBase size={size}>
      <svg viewBox="0 0 24 24" className="absolute inset-0" width="100%" height="100%">
        <defs>
          <pattern id={scaleId} x="0" y="0" width="4" height="3" patternUnits="userSpaceOnUse">
            {/* Half-circle scale */}
            <path d="M -2 3 A 2 2 0 0 1 2 3 M 2 3 A 2 2 0 0 1 6 3"
              fill="none" stroke="white" strokeWidth="0.35" opacity="0.28" />
          </pattern>
        </defs>
        {/* Dragon scales covering whole badge */}
        <rect width="24" height="24" fill={`url(#${scaleId})`} />
        {/* Main J letter */}
        <path
          d="M 16 4 V 14 a5 5 0 0 1 -10 0"
          fill="none"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dragon whisker flourish at top of J */}
        <path d="M 16 4 C 18 3.5, 20 4.5, 20 5" stroke="#67e8f9" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* Pearl */}
        <circle cx="16" cy="4" r="1.2" fill="#67e8f9"
          style={{ filter: "drop-shadow(0 0 4px rgba(103,232,249,0.9))" }} />
      </svg>
    </LogoBase>
  );
}

/* ── V6: Dragon Claw J — 龙爪 J ───────────────────────────────── */
/* A stylised dragon claw (3 talons) forms a J-curve. */
function V6ClawJ({ size }: { size: number }) {
  return (
    <LogoBase size={size}>
      <svg viewBox="0 0 24 24" className="absolute inset-0" width="100%" height="100%">
        {/* Three talons curling down-left like a J hook */}
        <path
          d="M 18 4 C 18 8, 16 12, 12 14 C 8 16, 5 14, 5 11"
          fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round"
        />
        <path
          d="M 14 4 C 14 8, 13 11, 10 13"
          fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.8"
        />
        <path
          d="M 10 5 C 10 8, 9 10, 7 11"
          fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.55"
        />
        {/* Sharp talon tips */}
        <circle cx="18" cy="4" r="0.8" fill="white" />
        <circle cx="14" cy="4" r="0.6" fill="white" opacity="0.8" />
        <circle cx="10" cy="5" r="0.5" fill="white" opacity="0.6" />
        {/* Pearl at bottom */}
        <circle cx="5" cy="11" r="1.4" fill="#67e8f9"
          style={{ filter: "drop-shadow(0 0 4px rgba(103,232,249,0.9))" }} />
      </svg>
    </LogoBase>
  );
}

// ════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════

type Variant = {
  id: string;
  zh: string;
  en: string;
  desc_zh: string;
  comp: (s: number) => React.ReactNode;
};

const VARIANTS: Variant[] = [
  {
    id: "v0",
    zh: "当前 LOGO（对照组）",
    en: "Current Logo",
    desc_zh: "现在正在用的设计 — 纯字母 J + 电光点",
    comp: (s) => <V0Current size={s} />,
  },
  {
    id: "v1",
    zh: "方案一：盘龙 J",
    en: "Dragon Curl",
    desc_zh: "中式长龙缠绕成 J 字形，龙口衔明珠。最有东方意境，识别度最高",
    comp: (s) => <V1DragonCurl size={s} />,
  },
  {
    id: "v2",
    zh: "方案二：龙目",
    en: "Dragon Eye",
    desc_zh: "龙瞳锁定目光 — 竖瞳 + 虹膜。神秘、锐利、科技感，J 字藏于右下",
    comp: (s) => <V2DragonEye size={s} />,
  },
  {
    id: "v3",
    zh: "方案三：龙焰 J",
    en: "Flame J",
    desc_zh: "J 字被龙焰环绕升腾 — 动感、燃动、AI 之火",
    comp: (s) => <V3FlameJ size={s} />,
  },
  {
    id: "v4",
    zh: "方案四：龙角 J",
    en: "Horn J",
    desc_zh: "J 字顶部长出分叉龙角，字身带龙鳞纹 — 最保守的龙元素，兼容性好",
    comp: (s) => <V4HornJ size={s} />,
  },
  {
    id: "v5",
    zh: "方案五：龙鳞 J",
    en: "Scale J",
    desc_zh: "整个徽章填满细密龙鳞纹理，J 字浮于其上 + 龙须 + 明珠",
    comp: (s) => <V5ScaleJ size={s} />,
  },
  {
    id: "v6",
    zh: "方案六：龙爪 J",
    en: "Claw J",
    desc_zh: "三道龙爪钩出 J 形 — 爪尖锋利，最抽象、最有攻击性的设计",
    comp: (s) => <V6ClawJ size={s} />,
  },
];

const SIZES = [32, 44, 64, 96];

export default function LogoPreviewPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">LOGO 设计方案对比</h1>
          <p className="text-sm text-gray-500">
            6 个龙元素方案 · 每个方案在 4 种尺寸下预览（32 / 44 / 64 / 96 px） · 选一个告诉我方案号即可
          </p>
        </div>

        <div className="space-y-8">
          {VARIANTS.map((v, idx) => (
            <section
              key={v.id}
              className={`bg-white rounded-3xl border p-6 sm:p-8 shadow-sm ${
                v.id === "v0" ? "border-gray-200" : "border-blue-100"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
                <div className="flex-1">
                  <div className="flex items-baseline gap-3 mb-1">
                    <h2 className={`font-black ${v.id === "v0" ? "text-gray-500 text-lg" : "text-xl text-gray-900"}`}>
                      {v.zh}
                    </h2>
                    <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">
                      {v.en}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{v.desc_zh}</p>
                </div>
                {v.id !== "v0" && (
                  <span className="text-[11px] font-black tracking-[0.2em] text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full flex-shrink-0">
                    方案 {idx}
                  </span>
                )}
              </div>

              {/* Size preview row */}
              <div className="flex flex-wrap items-end gap-6 justify-start">
                {SIZES.map((s) => (
                  <div key={s} className="flex flex-col items-center gap-2">
                    {v.comp(s)}
                    <span className="text-[10px] text-gray-400 font-mono">{s}px</span>
                  </div>
                ))}
                {/* In-navbar mockup (简化) */}
                <div className="flex flex-col items-start gap-2 ml-auto">
                  <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
                    {v.comp(44)}
                    <span className="font-black text-[24px] tracking-tight text-gray-900 leading-none">
                      JIARUI
                      <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                        {" "}TECH
                      </span>
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">Navbar 效果</span>
                </div>
              </div>

              {/* Dark background preview */}
              <div className="mt-5 p-4 bg-slate-900 rounded-2xl flex items-center gap-4">
                {v.comp(44)}
                <span className="font-black text-[20px] tracking-tight text-white">
                  JIARUI <span className="text-cyan-400">TECH</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono ml-auto">深色背景效果</span>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 p-6 bg-blue-50 border border-blue-200 rounded-2xl">
          <h3 className="font-black text-blue-900 mb-2">🎯 选好之后告诉我方案号（1-6）</h3>
          <p className="text-sm text-blue-700">
            比如：&ldquo;我要<strong>方案 3</strong>&rdquo; — 我就把它应用到 Navbar 里，替换当前的 LOGO。
          </p>
        </div>
      </div>
    </main>
  );
}
