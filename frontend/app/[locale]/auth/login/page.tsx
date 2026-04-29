"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useTranslations("auth");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    try {
      const res = await authApi.login(data.email, data.password);
      setUser(res.data.user);
      router.push(`/${locale}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setServerError(msg || tErr("server_error"));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cyber-grid bg-cyber-grid opacity-30"
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href={`/${locale}`} className="inline-block font-black text-2xl tracking-tight mb-6">
              JIARUI<span className="text-blue-500"> TECH</span>
            </Link>
            <h1 className="text-2xl font-black text-gray-900">{t("login_title")}</h1>
            <p className="text-sm text-gray-500 mt-1">{t("login_subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label={t("email")}
              type="email"
              placeholder={t("email_placeholder")}
              error={errors.email?.message ? tErr("email_invalid") : undefined}
              {...register("email")}
            />
            <Input
              label={t("password")}
              type="password"
              placeholder={t("password_placeholder")}
              error={errors.password?.message ? tErr("password_min") : undefined}
              {...register("password")}
            />

            {serverError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              className="w-full mt-2"
            >
              {t("login_btn")}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t("no_account")}{" "}
            <Link
              href={`/${locale}/auth/register`}
              className="text-blue-600 font-semibold hover:underline"
            >
              {t("go_register")}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
