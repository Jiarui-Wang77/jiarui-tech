"use client";

import { useEffect } from "react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [setUser, setLoading]);

  return <>{children}</>;
}
