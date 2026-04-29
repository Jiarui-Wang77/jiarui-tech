import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/navbar/Navbar";
import NewsSection from "@/components/news/NewsSection";

type Props = { params: Promise<{ locale: string; category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  return {
    title: `${category.toUpperCase()} — JIARUI TECH`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params;

  return (
    <main className="min-h-screen bg-gray-50 page-enter">
      <Navbar />
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Suspense fallback={<div className="h-96 animate-pulse bg-gray-100 rounded-2xl" />}>
            <NewsSection locale={locale} category={category} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
