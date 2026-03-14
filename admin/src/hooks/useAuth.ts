"use client";

import { create } from "zustand";
import type { User } from "@/types";
import { login as apiLogin, logout as apiLogout, refreshSession } from "@/lib/auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (email, password) => {
    const user = await apiLogin(email, password);
    set({ user });
    return user;
  },

  logout: async () => {
    await apiLogout();
    set({ user: null });
  },

  refresh: async () => {
    set({ isLoading: true });
    const user = await refreshSession();
    set({ user, isLoading: false });
  },

  setUser: (user) => set({ user, isLoading: false }),
}));
