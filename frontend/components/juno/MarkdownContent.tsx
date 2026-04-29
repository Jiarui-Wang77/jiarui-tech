"use client";

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * Markdown renderer.
 * Supports light (default) and dark themes via the `dark` prop.
 */

type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; text: string; href: string };

function tokenizeInline(src: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let i = 0;
  let buf = "";
  const flush = () => { if (buf) { tokens.push({ type: "text", value: buf }); buf = ""; } };

  while (i < src.length) {
    if (src[i] === "`") {
      const end = src.indexOf("`", i + 1);
      if (end > i) {
        flush();
        tokens.push({ type: "code", value: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (src.startsWith("**", i)) {
      const end = src.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        tokens.push({ type: "bold", value: src.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (src[i] === "*" && src[i + 1] !== "*") {
      const end = src.indexOf("*", i + 1);
      if (end > i + 1) {
        flush();
        tokens.push({ type: "italic", value: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (src[i] === "[") {
      const closeBracket = src.indexOf("]", i + 1);
      if (closeBracket > i && src[closeBracket + 1] === "(") {
        const closeParen = src.indexOf(")", closeBracket + 2);
        if (closeParen > closeBracket) {
          flush();
          tokens.push({
            type: "link",
            text: src.slice(i + 1, closeBracket),
            href: src.slice(closeBracket + 2, closeParen),
          });
          i = closeParen + 1;
          continue;
        }
      }
    }
    buf += src[i];
    i += 1;
  }
  flush();
  return tokens;
}

function renderInline(tokens: InlineToken[], keyPrefix: string, dark = false) {
  return tokens.map((t, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (t.type) {
      case "text":
        return <span key={key}>{t.value}</span>;
      case "bold":
        return (
          <strong
            key={key}
            className={`font-semibold ${dark ? "text-white" : "text-neutral-900"}`}
          >
            {t.value}
          </strong>
        );
      case "italic":
        return (
          <em
            key={key}
            className={`italic ${dark ? "text-slate-400" : "text-neutral-600"}`}
          >
            {t.value}
          </em>
        );
      case "code":
        return (
          <code
            key={key}
            className={`px-1.5 py-0.5 rounded-[5px] text-[0.87em] border font-medium ${
              dark
                ? "bg-slate-700 text-cyan-300 border-slate-600"
                : "bg-neutral-100 text-rose-600 border-neutral-200"
            }`}
            style={{ fontFamily: "'Fira Code', 'JetBrains Mono', ui-monospace, monospace" }}
          >
            {t.value}
          </code>
        );
      case "link":
        return (
          <a
            key={key}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline underline-offset-2 transition-colors ${
              dark
                ? "text-cyan-400 decoration-cyan-600 hover:decoration-cyan-400"
                : "text-blue-600 decoration-blue-300 hover:decoration-blue-500"
            }`}
          >
            {t.text}
          </a>
        );
    }
  });
}

type Block =
  | { type: "para"; text: string }
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; lang: string; code: string }
  | { type: "quote"; text: string }
  | { type: "hr" };

function parseBlocks(src: string): Block[] {
  const lines = src.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      const level = h[1].length as 1 | 2 | 3;
      blocks.push({ type: `h${level}` as "h1" | "h2" | "h3", text: h[2].trim() });
      i += 1;
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: quoteLines.join("\n") });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    if (!line.trim()) { i += 1; continue; }

    const paraLines: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+[.)]\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "para", text: paraLines.join(" ") });
  }

  return blocks;
}

/* ── Code block ───────────────────────────────────────────────── */
function CodeBlock({ lang, code, dark = false }: { lang: string; code: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div
      className={`relative my-4 rounded-xl overflow-hidden border ${
        dark
          ? "bg-slate-800 border-slate-700"
          : "bg-neutral-50 border-neutral-200"
      }`}
    >
      {/* Header bar */}
      <div
        className={`flex items-center justify-between px-4 py-2 border-b ${
          dark
            ? "bg-slate-700/80 border-slate-600"
            : "bg-neutral-100 border-neutral-200"
        }`}
      >
        <span
          className={`text-[11px] font-mono tracking-wide ${
            dark ? "text-slate-400" : "text-neutral-500"
          }`}
        >
          {lang || "plaintext"}
        </span>
        <button
          onClick={copy}
          className={`flex items-center gap-1.5 text-[11px] transition-colors ${
            dark
              ? "text-slate-400 hover:text-slate-200"
              : "text-neutral-400 hover:text-neutral-700"
          }`}
        >
          {copied ? (
            <><Check size={10} className="text-green-500" /> Copied</>
          ) : (
            <><Copy size={10} /> Copy</>
          )}
        </button>
      </div>
      {/* Code body */}
      <pre className="p-4 overflow-x-auto text-[13px] leading-[1.7]">
        <code
          className={`whitespace-pre ${dark ? "text-slate-200" : "text-neutral-800"}`}
          style={{ fontFamily: "'Fira Code', 'JetBrains Mono', ui-monospace, monospace" }}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}

export default function MarkdownContent({
  text,
  dark = false,
}: {
  text: string;
  dark?: boolean;
}) {
  const blocks = useMemo(() => parseBlocks(text), [text]);

  return (
    <div className="break-words">
      {blocks.map((b, i) => {
        const key = `b-${i}`;
        switch (b.type) {
          case "h1":
            return (
              <h1
                key={key}
                className={`text-[20px] font-semibold mt-5 mb-2.5 tracking-tight ${
                  dark ? "text-white" : "text-neutral-900"
                }`}
              >
                {renderInline(tokenizeInline(b.text), key, dark)}
              </h1>
            );
          case "h2":
            return (
              <h2
                key={key}
                className={`text-[17px] font-semibold mt-5 mb-2 tracking-tight ${
                  dark ? "text-slate-100" : "text-neutral-900"
                }`}
              >
                {renderInline(tokenizeInline(b.text), key, dark)}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={key}
                className={`text-[15px] font-semibold mt-4 mb-1.5 ${
                  dark ? "text-slate-200" : "text-neutral-800"
                }`}
              >
                {renderInline(tokenizeInline(b.text), key, dark)}
              </h3>
            );
          case "para":
            return (
              <p
                key={key}
                className={`mb-3.5 last:mb-0 ${
                  dark ? "text-slate-200" : "text-neutral-800"
                }`}
              >
                {renderInline(tokenizeInline(b.text), key, dark)}
              </p>
            );
          case "ul":
            return (
              <ul
                key={key}
                className={`list-disc pl-6 mb-3.5 space-y-1.5 ${
                  dark ? "marker:text-slate-500" : "marker:text-neutral-400"
                }`}
              >
                {b.items.map((it, j) => (
                  <li
                    key={`${key}-${j}`}
                    className={dark ? "text-slate-200" : "text-neutral-800"}
                  >
                    {renderInline(tokenizeInline(it), `${key}-${j}`, dark)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol
                key={key}
                className={`list-decimal pl-6 mb-3.5 space-y-1.5 marker:font-medium ${
                  dark ? "marker:text-slate-500" : "marker:text-neutral-500"
                }`}
              >
                {b.items.map((it, j) => (
                  <li
                    key={`${key}-${j}`}
                    className={dark ? "text-slate-200" : "text-neutral-800"}
                  >
                    {renderInline(tokenizeInline(it), `${key}-${j}`, dark)}
                  </li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote
                key={key}
                className={`border-l-2 pl-4 italic my-4 py-1 rounded-r-md ${
                  dark
                    ? "border-slate-600 text-slate-400 bg-slate-800/50"
                    : "border-neutral-300 text-neutral-500 bg-neutral-50"
                }`}
              >
                {renderInline(tokenizeInline(b.text), key, dark)}
              </blockquote>
            );
          case "code":
            return <CodeBlock key={key} lang={b.lang} code={b.code} dark={dark} />;
          case "hr":
            return (
              <hr
                key={key}
                className={`my-5 ${dark ? "border-slate-700" : "border-neutral-200"}`}
              />
            );
        }
      })}
    </div>
  );
}
