"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, Plus } from "lucide-react";
import { api, type Category } from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const schema = z.object({
  name_zh: z.string().min(1),
  name_en: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, hyphens only"),
  sort_order: z.number({ coerce: true }).default(0),
  is_featured: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    api.get<Category[]>("/categories").then((r) => setCategories(r.data)).finally(() => setLoading(false));
  }, []);

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      const res = await api.post<Category>("/categories", data);
      setCategories((prev) => [...prev, res.data].sort((a, b) => a.sort_order - b.sort_order));
      reset();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Failed to create category");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("Cannot delete — category may have articles linked to it.");
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-black text-gray-900 mb-8">Categories</h1>

      <div className="grid grid-cols-1 gap-6">
        {/* Add category form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-5">Add New Category</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="中文名称" placeholder="例：科技" error={errors.name_zh?.message} {...register("name_zh")} />
              <Input label="English Name" placeholder="e.g. Tech" error={errors.name_en?.message} {...register("name_en")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Slug (URL)"
                placeholder="e.g. tech"
                error={errors.slug?.message}
                hint="Lowercase only, used in URLs"
                {...register("slug")}
              />
              <Input
                label="Sort Order"
                type="number"
                defaultValue={0}
                {...register("sort_order")}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" {...register("is_featured")} className="rounded" />
              Mark as featured (AI category highlight)
            </label>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <Button type="submit" loading={isSubmitting} size="sm">
              <Plus size={15} />
              Add Category
            </Button>
          </form>
        </div>

        {/* Category list */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Existing Categories</h2>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                  <span className="font-mono text-xs text-gray-400 w-8">{cat.sort_order}</span>
                  <div className="flex-1">
                    <span className="font-semibold text-sm text-gray-900">{cat.name_zh}</span>
                    <span className="text-gray-400 mx-2">/</span>
                    <span className="text-sm text-gray-600">{cat.name_en}</span>
                  </div>
                  <span className="font-mono text-xs text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full">
                    /{cat.slug}
                  </span>
                  {cat.is_featured && (
                    <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                      featured
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(cat.id, cat.name_zh)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
