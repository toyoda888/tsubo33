// Web版では認証機能は使用しない（ローカル完結アプリ）
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export type User = null;

export function useAuth(options?: UseAuthOptions) {
  // Web版ではログイン機能なし
  const user = null;
  const loading = false;
  const error = null;
  const isAuthenticated = false;

  const fetchUser = useCallback(async () => {
    // 何もしない
  }, []);

  const logout = useCallback(async () => {
    // 何もしない
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
