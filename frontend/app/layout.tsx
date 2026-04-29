import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "JIARUI TECH", template: "%s | JIARUI TECH" },
  description: "综合科技生态门户 — 双语资讯、AI 开发者社区、开源追踪器",
  keywords: ["AI", "Tech", "开发者", "开源", "科技资讯"],
  openGraph: {
    siteName: "JIARUI TECH",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <NextTopLoader
          color="#6d28d9"
          initialPosition={0.15}
          crawlSpeed={200}
          height={3}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #6d28d9, 0 0 5px #6d28d9"
        />
        {children}
      </body>
    </html>
  );
}
