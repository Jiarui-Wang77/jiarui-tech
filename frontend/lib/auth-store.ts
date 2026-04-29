"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "./api";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  _hasHydrated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      _hasHydrated: false,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: "jiarui-auth",
      // Only persist user — not loading flags
      partialize: (state) => ({ user: state.user }),
      // Called once localStorage has been read and state is ready
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
