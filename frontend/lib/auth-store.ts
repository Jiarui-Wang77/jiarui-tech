"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "./api";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "jiarui-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
