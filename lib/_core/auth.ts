// Web版では認証機能は使用しない（完全ローカル）
import { Platform } from "react-native";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
};

// Web版では何もしない（認証不要）
export async function getSessionToken(): Promise<string | null> {
  return null;
}

export async function setSessionToken(token: string): Promise<void> {
  // 何もしない
}

export async function removeSessionToken(): Promise<void> {
  // 何もしない
}

export async function getUserInfo(): Promise<User | null> {
  return null;
}

export async function setUserInfo(user: User): Promise<void> {
  // 何もしない
}

export async function clearUserInfo(): Promise<void> {
  // 何もしない
}
