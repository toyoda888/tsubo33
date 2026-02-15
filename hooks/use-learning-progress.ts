import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '../lib/async-storage-web';
import { CategoryKey } from '@/data/tsubo-data';

const MASTERED_KEY = 'tsubo_mastered';
const UNSURE_KEY = 'tsubo_unsure';
const WRONG_KEY = 'tsubo_wrong';
const HISTORY_KEY = 'tsubo_learning_history';

export type AnswerType = 'correct' | 'unsure' | 'wrong';

export interface LearningRecord {
  tsuboId: string;
  tsuboName: string;
  answerType: AnswerType;
  timestamp: number;
  category: CategoryKey;
}

export interface LearningHistory {
  records: LearningRecord[];
}

export interface LearningProgress {
  masteredIds: string[];
  unsureIds: string[];
  wrongIds: string[];
}

const DEFAULT_PROGRESS: LearningProgress = {
  masteredIds: [],
  unsureIds: [],
  wrongIds: [],
};

const DEFAULT_HISTORY: LearningHistory = {
  records: [],
};

export function useLearningProgress() {
  const [progress, setProgress] = useState<LearningProgress>(DEFAULT_PROGRESS);
  const [history, setHistory] = useState<LearningHistory>(DEFAULT_HISTORY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [mastered, unsure, wrong, historyData] = await Promise.all([
        AsyncStorage.getItem(MASTERED_KEY),
        AsyncStorage.getItem(UNSURE_KEY),
        AsyncStorage.getItem(WRONG_KEY),
        AsyncStorage.getItem(HISTORY_KEY),
      ]);

      setProgress({
        masteredIds: mastered ? JSON.parse(mastered) : [],
        unsureIds: unsure ? JSON.parse(unsure) : [],
        wrongIds: wrong ? JSON.parse(wrong) : [],
      });

      if (historyData) {
        setHistory(JSON.parse(historyData));
      }
    } catch (error) {
      console.error('Failed to load learning progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const recordAnswer = useCallback(async (
    tsuboId: string,
    tsuboName: string,
    answerType: AnswerType,
    category: CategoryKey
  ) => {
    try {
      const newRecord: LearningRecord = {
        tsuboId,
        tsuboName,
        answerType,
        timestamp: Date.now(),
        category,
      };

      // 履歴に追加（最新500件まで保持）
      const newHistory: LearningHistory = {
        records: [...history.records.slice(-499), newRecord],
      };
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);

      // 進捗を更新
      let newMastered = [...progress.masteredIds];
      let newUnsure = [...progress.unsureIds];
      let newWrong = [...progress.wrongIds];

      // 既存のリストから削除
      newMastered = newMastered.filter(id => id !== tsuboId);
      newUnsure = newUnsure.filter(id => id !== tsuboId);
      newWrong = newWrong.filter(id => id !== tsuboId);

      // 新しいリストに追加
      if (answerType === 'correct') {
        newMastered.push(tsuboId);
      } else if (answerType === 'unsure') {
        newUnsure.push(tsuboId);
      } else {
        newWrong.push(tsuboId);
      }

      await Promise.all([
        AsyncStorage.setItem(MASTERED_KEY, JSON.stringify(newMastered)),
        AsyncStorage.setItem(UNSURE_KEY, JSON.stringify(newUnsure)),
        AsyncStorage.setItem(WRONG_KEY, JSON.stringify(newWrong)),
      ]);

      setProgress({
        masteredIds: newMastered,
        unsureIds: newUnsure,
        wrongIds: newWrong,
      });
    } catch (error) {
      console.error('Failed to record answer:', error);
    }
  }, [progress, history]);

  const resetProgress = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(MASTERED_KEY),
        AsyncStorage.removeItem(UNSURE_KEY),
        AsyncStorage.removeItem(WRONG_KEY),
      ]);
      setProgress(DEFAULT_PROGRESS);
    } catch (error) {
      console.error('Failed to reset progress:', error);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
      setHistory(DEFAULT_HISTORY);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }, []);

  const getUnmasteredIds = useCallback((allIds: string[]) => {
    return allIds.filter(id => !progress.masteredIds.includes(id));
  }, [progress.masteredIds]);

  const getReviewIds = useCallback(() => {
    return [...new Set([...progress.unsureIds, ...progress.wrongIds])];
  }, [progress.unsureIds, progress.wrongIds]);

  const getHistoryByDate = useCallback((date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return history.records.filter(
      record => record.timestamp >= startOfDay.getTime() && record.timestamp <= endOfDay.getTime()
    );
  }, [history.records]);

  const getRecentHistory = useCallback((limit: number = 50) => {
    return history.records.slice(-limit).reverse();
  }, [history.records]);

  return {
    progress,
    history,
    isLoading,
    recordAnswer,
    resetProgress,
    clearHistory,
    getUnmasteredIds,
    getReviewIds,
    getHistoryByDate,
    getRecentHistory,
  };
}
