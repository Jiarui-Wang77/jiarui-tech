import Navbar from "@/components/navbar/Navbar";
import Section1News from "@/components/sections/Section1News";
import Section2Community from "@/components/sections/Section2Community";
import Section3GitHub from "@/components/sections/Section3GitHub";
import Section4JunoAlpha from "@/components/sections/Section4JunoAlpha";
import Section5Radar from "@/components/sections/Section5Radar";
import Section6Terrarium from "@/components/sections/Section6Terrarium";
import Footer from "@/components/footer/Footer";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "zh" ? "JIARUI TECH — AI 科技生态门户" : "JIARUI TECH — Your AI Tech Hub",
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;

  return (
    <main>
      <Navbar />
      {/* Section 1 — 白色简洁，首屏即是新闻 */}
      <Section1News locale={locale} />
      {/* Section 2 — AI 开发者社区预览，开始过渡 */}
      <Section2Community locale={locale} />
      {/* Section 3 — GitHub 黑马追踪器，中深色 */}
      <Section3GitHub locale={locale} />
      {/* Section 4 — Juno-Alpha Coming Soon，深色科幻 */}
      <Section4JunoAlpha locale={locale} />
      {/* Section 5 — Global AI Radar，极客深色 */}
      <Section5Radar locale={locale} />
      {/* Section 6 — AGI 生命体 · Digital Lifeform Teaser */}
      <Section6Terrarium locale={locale} />
      {/* Footer */}
      <Footer />
    </main>
  );
}
