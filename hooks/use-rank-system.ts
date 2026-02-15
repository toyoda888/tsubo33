import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '../lib/async-storage-web';

const RANK_STORAGE_KEY = '@tsubomi_rank_system';

// 身分の定義
export interface Rank {
  id: string;
  name: string;
  requiredCorrect: number;
  emoji: string;
}

export const RANKS: Rank[] = [
  { id: 'beginner', name: '見習い', requiredCorrect: 0, emoji: '🌱' },
  { id: 'eta_tsubonin', name: 'えたつぼにん', requiredCorrect: 10, emoji: '👤' },
  { id: 'tsubo_hyakusho', name: 'つぼ百姓', requiredCorrect: 50, emoji: '🌾' },
  { id: 'tsubo_shonin', name: 'つぼ商人', requiredCorrect: 100, emoji: '💼' },
  { id: 'tsubo_musume', name: 'つぼ娘', requiredCorrect: 150, emoji: '👧' },
  { id: 'tsubo_jochu', name: 'つぼ女中', requiredCorrect: 200, emoji: '👩' },
  { id: 'tsubo_hime', name: 'つぼ姫', requiredCorrect: 250, emoji: '👸' },
  { id: 'tsubo_okata', name: 'つぼのお方', requiredCorrect: 300, emoji: '👑' },
  { id: 'tsubo_gozen', name: 'つぼ御前', requiredCorrect: 350, emoji: '🏯' },
  { id: 'tsubomi_san', name: 'つぼみさん', requiredCorrect: 361, emoji: '🌸' },
];

export interface RankData {
  totalCorrect: number;
  currentRankId: string;
}

const DEFAULT_RANK_DATA: RankData = {
  totalCorrect: 0,
  currentRankId: 'beginner',
};

export function useRankSystem() {
  const [rankData, setRankData] = useState<RankData>(DEFAULT_RANK_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  // 現在の身分を取得
  const currentRank = useMemo(() => {
    return RANKS.find(r => r.id === rankData.currentRankId) || RANKS[0];
  }, [rankData.currentRankId]);

  // 次の身分を取得
  const nextRank = useMemo(() => {
    const currentIndex = RANKS.findIndex(r => r.id === rankData.currentRankId);
    if (currentIndex < RANKS.length - 1) {
      return RANKS[currentIndex + 1];
    }
    return null;
  }, [rankData.currentRankId]);

  // 次の身分までの残り正解数
  const correctToNextRank = useMemo(() => {
    if (!nextRank) return 0;
    return nextRank.requiredCorrect - rankData.totalCorrect;
  }, [nextRank, rankData.totalCorrect]);

  // 進捗率（現在の身分から次の身分まで）
  const progressToNextRank = useMemo(() => {
    if (!nextRank) return 100;
    const currentIndex = RANKS.findIndex(r => r.id === rankData.currentRankId);
    const prevRequired = currentIndex > 0 ? RANKS[currentIndex].requiredCorrect : 0;
    const nextRequired = nextRank.requiredCorrect;
    const range = nextRequired - prevRequired;
    const progress = rankData.totalCorrect - prevRequired;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  }, [nextRank, rankData.totalCorrect, rankData.currentRankId]);

  // 累計正解数から身分を計算
  const calculateRank = useCallback((totalCorrect: number): string => {
    let rankId = 'beginner';
    for (const rank of RANKS) {
      if (totalCorrect >= rank.requiredCorrect) {
        rankId = rank.id;
      } else {
        break;
      }
    }
    return rankId;
  }, []);

  // データを読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.getItem(RANK_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as RankData;
          setRankData(parsed);
        }
      } catch (error) {
        console.error('Failed to load rank data:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // データを保存
  const saveData = useCallback(async (data: RankData) => {
    try {
      await AsyncStorage.setItem(RANK_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save rank data:', error);
    }
  }, []);

  // 正解を追加
  const addCorrect = useCallback(async (count: number = 1): Promise<{ newRank: Rank | null; previousRank: Rank }> => {
    const newTotalCorrect = rankData.totalCorrect + count;
    const newRankId = calculateRank(newTotalCorrect);
    const previousRank = currentRank;
    
    const newData: RankData = {
      totalCorrect: newTotalCorrect,
      currentRankId: newRankId,
    };
    
    setRankData(newData);
    await saveData(newData);
    
    // 身分が上がったかどうかをチェック
    const rankChanged = newRankId !== rankData.currentRankId;
    const newRank = rankChanged ? RANKS.find(r => r.id === newRankId) || null : null;
    
    return { newRank, previousRank };
  }, [rankData, currentRank, calculateRank, saveData]);

  // リセット
  const resetRank = useCallback(async () => {
    setRankData(DEFAULT_RANK_DATA);
    await saveData(DEFAULT_RANK_DATA);
  }, [saveData]);

  return {
    rankData,
    currentRank,
    nextRank,
    correctToNextRank,
    progressToNextRank,
    isLoaded,
    addCorrect,
    resetRank,
    allRanks: RANKS,
  };
}
