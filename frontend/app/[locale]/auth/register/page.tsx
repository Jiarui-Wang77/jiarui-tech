"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const schema = z
  .object({
    username: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(8),
    confirm_password: z.string(),
    captcha: z.string().min(4),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "passwords_not_match",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

function generateCaptcha(): { text: string; dataUrl: string } {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const text = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 36;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f0f4ff";
  ctx.fillRect(0, 0, 100, 36);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = `hsl(${Math.random() * 360},70%,70%)`;
    ctx.fillRect(Math.random() * 100, Math.random() * 36, 30, 1);
  }
  ctx.font = "bold 22px monospace";
  ctx.fillStyle = "#1e3a5f";
  ctx.letterSpacing = "6px";
  ctx.fillText(text, 8, 26);
  return { text, dataUrl: canvas.toDataURL() };
}

export default function RegisterPage() {
  const t = useTranslations("auth");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [serverError, setServerError] = useState("");

  const captchaRef = useRef<{ text: string; dataUrl: string }>({ text: "", dataUrl: "" });
  const [captchaDataUrl, setCaptchaDataUrl] = useState<string>("");

  const refreshCaptcha = () => {
    const c = generateCaptcha();
    captchaRef.current = c;
    setCaptchaDataUrl(c.dataUrl);
  };

  // 只在客户端初始化验证码，避免 SSR hydration 不一致
  useEffect(() => {
    refreshCaptcha();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    if (data.captcha.toUpperCase() !== captchaRef.current.text) {
      setServerError(locale === "zh" ? "验证码错误，请重新输入" : "Incorrect captcha, please try again");
      refreshCaptcha();
      return;
    }
    try {
      const res = await authApi.register({
        username: data.username,
        email: data.email,
        password: data.password,
        confirm_password: data.confirm_password,
      });
      setUser(res.data.user);
      router.push(`/${locale}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setServerError(msg || tErr("server_error"));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cyber-grid bg-cyber-grid opacity-30" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <Link href={`/${locale}`} className="inline-block font-black text-2xl tracking-tight mb-6">
              JIARUI<span className="text-blue-500"> TECH</span>
            </Link>
            <h1 className="text-2xl font-black text-gray-900">{t("register_title")}</h1>
            <p className="text-sm text-gray-500 mt-1">{t("register_subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label={t("username")}
              placeholder={t("username_placeholder")}
              error={errors.username?.message ? tErr("username_min") : undefined}
              {...register("username")}
            />
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
            <Input
              label={t("confirm_password")}
              type="password"
              placeholder={t("password_placeholder")}
              error={errors.confirm_password?.message ? tErr("passwords_not_match") : undefined}
              {...register("confirm_password")}
            />

            {/* Captcha */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">{t("captcha")}</label>
              <div className="flex items-center gap-3">
                <Input
                  placeholder={t("captcha_placeholder")}
                  className="flex-1"
                  maxLength={4}
                  error={errors.captcha?.message ? tErr("required") : undefined}
                  {...register("captcha")}
                />
                <div className="flex items-center gap-2 flex-shrink-0">
                  {captchaDataUrl && (
                    <img
                      src={captchaDataUrl}
                      alt="captcha"
                      className="h-10 rounded-lg border border-gray-200 cursor-pointer select-none"
                      onClick={refreshCaptcha}
                    />
                  )}
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
                    title={t("captcha_refresh")}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>
            </div>

            {serverError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
                {serverError}
              </div>
            )}

            <Button type="submit" size="lg" loading={isSubmitting} className="w-full mt-2">
              {t("register_btn")}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t("has_account")}{" "}
            <Link href={`/${locale}/auth/login`} className="text-blue-600 font-semibold hover:underline">
              {t("go_login")}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
