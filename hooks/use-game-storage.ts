import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '../lib/async-storage-web';
import { GameResult, AnswerRecord } from './use-game';

const STORAGE_KEY = 'tsubo_game_history';

export interface GameHistory {
  results: GameResult[];
  totalGames: number;
  totalCorrect: number;
  totalUnsure: number;
  totalWrong: number;
  totalQuestions: number;
  weakTsuboIds: Record<string, number>;
}

const DEFAULT_HISTORY: GameHistory = {
  results: [],
  totalGames: 0,
  totalCorrect: 0,
  totalUnsure: 0,
  totalWrong: 0,
  totalQuestions: 0,
  weakTsuboIds: {},
};

export function useGameStorage() {
  const [history, setHistory] = useState<GameHistory>(DEFAULT_HISTORY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load game history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveResult = useCallback(async (result: GameResult) => {
    try {
      const newWeakTsuboIds = { ...history.weakTsuboIds };
      
      // 不正解と自信なしのツボをカウント
      result.answers.forEach((answer: AnswerRecord) => {
        if (answer.answerType === 'wrong' || answer.answerType === 'unsure') {
          const tsuboId = answer.question.tsubo.id;
          newWeakTsuboIds[tsuboId] = (newWeakTsuboIds[tsuboId] || 0) + 1;
        }
      });

      const newHistory: GameHistory = {
        results: [...history.results.slice(-49), result],
        totalGames: history.totalGames + 1,
        totalCorrect: history.totalCorrect + result.correctAnswers,
        totalUnsure: (history.totalUnsure || 0) + result.unsureAnswers,
        totalWrong: (history.totalWrong || 0) + result.wrongAnswers,
        totalQuestions: history.totalQuestions + result.totalQuestions,
        weakTsuboIds: newWeakTsuboIds,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (error) {
      console.error('Failed to save game result:', error);
    }
  }, [history]);

  const clearHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setHistory(DEFAULT_HISTORY);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }, []);

  const getAverageScore = useCallback(() => {
    if (history.totalQuestions === 0) return 0;
    return Math.round((history.totalCorrect / history.totalQuestions) * 100);
  }, [history.totalCorrect, history.totalQuestions]);

  const getBestScore = useCallback(() => {
    if (history.results.length === 0) return 0;
    const bestResult = history.results.reduce((best, current) => {
      // totalQuestions が 0 の結果をスキップ
      if (current.totalQuestions === 0) return best;
      if (best.totalQuestions === 0) return current;
      
      const currentRate = current.correctAnswers / current.totalQuestions;
      const bestRate = best.correctAnswers / best.totalQuestions;
      return currentRate > bestRate ? current : best;
    });
    
    // 最終的に totalQuestions が 0 なら 0 を返す
    if (bestResult.totalQuestions === 0) return 0;
    
    return Math.round((bestResult.correctAnswers / bestResult.totalQuestions) * 100);
  }, [history.results]);

  const getWeakTsuboIds = useCallback(() => {
    return Object.entries(history.weakTsuboIds)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);
  }, [history.weakTsuboIds]);

  return {
    history,
    isLoading,
    saveResult,
    clearHistory,
    getAverageScore,
    getBestScore,
    getWeakTsuboIds,
  };
}
