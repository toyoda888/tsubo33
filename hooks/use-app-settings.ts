import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '../lib/async-storage-web';

const SETTINGS_STORAGE_KEY = '@tsubomi_app_settings';

export interface AppSettings {
  comboEnabled: boolean;
  timeAttackDefault: 3 | 5 | 8 | 10;
  survivalBestRecord: number;
  lastPlayedMode: {
    mode: 'normal' | 'survival';
    category?: string;
    meridian?: string;
    questionCount?: number;
  } | null;
}

const DEFAULT_SETTINGS: AppSettings = {
  comboEnabled: true,
  timeAttackDefault: 8,
  survivalBestRecord: 0,
  lastPlayedMode: null,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // 設定を読み込み
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as AppSettings;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (error) {
        console.error('Failed to load app settings:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // 設定を保存
  const saveSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save app settings:', error);
    }
  }, [settings]);

  // コンボシステム切り替え
  const toggleCombo = useCallback(() => {
    saveSettings({ comboEnabled: !settings.comboEnabled });
  }, [settings.comboEnabled, saveSettings]);

  // タイムアタックデフォルト秒数設定
  const setTimeAttackDefault = useCallback((seconds: 3 | 5 | 8 | 10) => {
    saveSettings({ timeAttackDefault: seconds });
  }, [saveSettings]);

  // サバイバルモード最高記録更新
  const updateSurvivalBest = useCallback((record: number) => {
    if (record > settings.survivalBestRecord) {
      saveSettings({ survivalBestRecord: record });
      return true; // 新記録
    }
    return false; // 更新なし
  }, [settings.survivalBestRecord, saveSettings]);

  // 最後に遊んだモードを保存
  const saveLastPlayedMode = useCallback((mode: AppSettings['lastPlayedMode']) => {
    saveSettings({ lastPlayedMode: mode });
  }, [saveSettings]);

  return {
    settings,
    isLoaded,
    toggleCombo,
    setTimeAttackDefault,
    updateSurvivalBest,
    saveLastPlayedMode,
    saveSettings,
  };
}
