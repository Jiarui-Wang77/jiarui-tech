"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { categoriesApi, type Category } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  activeCategory: string;
};

const DEFAULT_CATEGORIES = [
  { id: 0, name_zh: "全部", name_en: "All", slug: "all", sort_order: -1, is_featured: false },
];

export default function CategoryMenu({ activeCategory }: Props) {
  const t = useTranslations("categories");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    categoriesApi.list().then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const allCategories = [...DEFAULT_CATEGORIES, ...categories];

  const handleSelect = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    router.push(`/${locale}/news/${slug}?${params.toString()}`);
  };

  const getName = (cat: Category) => {
    if (cat.slug === "all") return t("all");
    return locale === "zh" ? cat.name_zh : cat.name_en;
  };

  return (
    <div className="relative flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {allCategories.map((cat) => {
        const isActive = cat.slug === activeCategory;
        const isAI = cat.slug === "ai";

        return (
          <motion.button
            key={cat.slug}
            onClick={() => handleSelect(cat.slug)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className={cn(
              "relative flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
              isActive
                ? "bg-gray-900 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100",
              isAI && !isActive && "text-blue-600 font-bold italic"
            )}
          >
            {isAI ? (
              <span
                className={cn(
                  "transition-all duration-200",
                  isAI && !isActive
                    ? "text-[15px] italic font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent"
                    : ""
                )}
              >
                {getName(cat)}
              </span>
            ) : (
              getName(cat)
            )}

            {isActive && (
              <motion.span
                layoutId="category-indicator"
                className="absolute inset-0 bg-gray-900 rounded-full -z-10"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
