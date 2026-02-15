import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Tsubo, CategoryKey } from '@/data/tsubo-data';
import { MeridianKey, filterTsuboByMeridian } from '@/data/meridian-data';

export type AnswerType = 'correct' | 'unsure' | 'wrong';

export interface Question {
  tsubo: Tsubo;
  options: string[];
  correctIndex: number;
}

export interface AnswerRecord {
  question: Question;
  selectedIndex: number;
  answerType: AnswerType;
}

export interface GameResult {
  totalQuestions: number;
  correctAnswers: number;
  unsureAnswers: number;
  wrongAnswers: number;
  answers: AnswerRecord[];
  timestamp: number;
  category: CategoryKey | 'all' | 'review';
  meridian?: MeridianKey;
}

export interface GameConfig {
  category: CategoryKey | 'all' | 'review';
  meridian?: MeridianKey;
  excludeMastered: boolean;
  questionCount: number;
  isSurvivalMode?: boolean;
  isTimeAttackMode?: boolean;
  timeLimit?: number;
}

const DEFAULT_CONFIG: GameConfig = {
  category: 'all',
  excludeMastered: true,
  questionCount: 10,
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateQuestion(tsubo: Tsubo, allTsubo: Tsubo[]): Question {
  const otherTsubo = allTsubo.filter((t) => t.id !== tsubo.id);
  const wrongOptions = shuffleArray(otherTsubo).slice(0, 3).map((t) => t.name);
  const allOptions = shuffleArray([tsubo.name, ...wrongOptions]);
  const correctIndex = allOptions.indexOf(tsubo.name);

  return {
    tsubo,
    options: allOptions,
    correctIndex,
  };
}

export function useGame(tsuboData: Tsubo[], allTsuboData: Tsubo[], masteredIds: string[] = []) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [currentAnswerType, setCurrentAnswerType] = useState<AnswerType | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  
  // タイムアタック用
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isTimeOut, setIsTimeOut] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // コンボシステム用
  const [comboCount, setComboCount] = useState(0);
  const [totalBonusPoints, setTotalBonusPoints] = useState(0);
  
  // サバイバルモード用
  const [survivalQuestionCount, setSurvivalQuestionCount] = useState(0);
  const [availableTsuboPool, setAvailableTsuboPool] = useState<Tsubo[]>([]);

  const currentQuestion = useMemo(() => {
    return questions[currentQuestionIndex] || null;
  }, [questions, currentQuestionIndex]);

  const score = useMemo(() => {
    return answers.filter(a => a.answerType === 'correct').length + totalBonusPoints;
  }, [answers, totalBonusPoints]);

  const unsureCount = useMemo(() => {
    return answers.filter(a => a.answerType === 'unsure').length;
  }, [answers]);

  const wrongCount = useMemo(() => {
    return answers.filter(a => a.answerType === 'wrong').length;
  }, [answers]);

  const startGame = useCallback((config: Partial<GameConfig> = {}) => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    setGameConfig(finalConfig);

    let availableTsubo = [...tsuboData];

    // 経絡でフィルタリング（経絡が指定されている場合）
    if (finalConfig.meridian) {
      availableTsubo = filterTsuboByMeridian(availableTsubo, finalConfig.meridian);
    }
    // カテゴリでフィルタリング（経絡が指定されていない場合）
    else if (finalConfig.category !== 'all' && finalConfig.category !== 'review') {
      availableTsubo = availableTsubo.filter(t => t.category === finalConfig.category);
    }

    // 習得済みを除外
    if (finalConfig.excludeMastered && masteredIds.length > 0) {
      availableTsubo = availableTsubo.filter(t => !masteredIds.includes(t.id));
    }

    // サバイバルモードの場合
    if (finalConfig.isSurvivalMode) {
      if (availableTsubo.length === 0) {
        setQuestions([]);
        setIsGameActive(false);
        setIsGameFinished(true);
        return;
      }
      setAvailableTsuboPool(availableTsubo);
      setSurvivalQuestionCount(0);
      const firstQuestion = generateQuestion(availableTsubo[Math.floor(Math.random() * availableTsubo.length)], allTsuboData);
      setQuestions([firstQuestion]);
    } else {
      // 通常モード
      const questionCount = Math.min(finalConfig.questionCount, availableTsubo.length);
      
      if (questionCount === 0) {
        setQuestions([]);
        setIsGameActive(false);
        setIsGameFinished(true);
        return;
      }

      const shuffledTsubo = shuffleArray(availableTsubo).slice(0, questionCount);
      const newQuestions = shuffledTsubo.map((tsubo) => generateQuestion(tsubo, allTsuboData));
      setQuestions(newQuestions);
    }
    
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setIsGameActive(true);
    setIsGameFinished(false);
    setSelectedAnswer(null);
    setCurrentAnswerType(null);
    setShowResult(false);
    setComboCount(0);
    setTotalBonusPoints(0);
    setIsTimeOut(false);
    
    // タイムアタックの場合、タイマー開始
    if (finalConfig.isTimeAttackMode && finalConfig.timeLimit) {
      setTimeRemaining(finalConfig.timeLimit);
    } else {
      setTimeRemaining(null);
    }
  }, [tsuboData, allTsuboData, masteredIds]);

  const answerQuestion = useCallback((selectedIndex: number, isUnsure: boolean = false) => {
    if (!currentQuestion || selectedAnswer !== null) return;

    // タイマー停止
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setSelectedAnswer(selectedIndex);
    setShowResult(true);

    const isCorrect = selectedIndex === currentQuestion.correctIndex;
    let answerType: AnswerType;
    
    if (isUnsure) {
      answerType = 'unsure';
    } else if (isCorrect) {
      answerType = 'correct';
    } else {
      answerType = 'wrong';
    }

    setCurrentAnswerType(answerType);
    setAnswers((prev) => [...prev, { 
      question: currentQuestion, 
      selectedIndex,
      answerType,
    }]);
    
    // コンボシステム
    if (answerType === 'correct' && !isUnsure) {
      const newCombo = comboCount + 1;
      setComboCount(newCombo);
      
      // ボーナスポイント計算
      let bonusPoints = 0;
      if (newCombo === 3) bonusPoints = 1;
      else if (newCombo === 5) bonusPoints = 3;
      else if (newCombo === 10) bonusPoints = 5;
      
      if (bonusPoints > 0) {
        setTotalBonusPoints(prev => prev + bonusPoints);
      }
    } else if (answerType === 'wrong' || answerType === 'unsure') {
      setComboCount(0);
    }
    
    // サバイバルモードで不正解の場合、即座にゲーム終了
    if (gameConfig.isSurvivalMode && answerType === 'wrong') {
      setIsGameActive(false);
      setIsGameFinished(true);
    }
  }, [currentQuestion, selectedAnswer, comboCount, gameConfig.isSurvivalMode]);

  const nextQuestion = useCallback(() => {
    // サバイバルモードの場合
    if (gameConfig.isSurvivalMode) {
      if (currentAnswerType === 'wrong') {
        // 既に終了処理済み
        return;
      }
      
      // 新しい問題を生成
      if (availableTsuboPool.length > 0) {
        const nextTsubo = availableTsuboPool[Math.floor(Math.random() * availableTsuboPool.length)];
        const newQuestion = generateQuestion(nextTsubo, allTsuboData);
        setQuestions([newQuestion]);
        setCurrentQuestionIndex(0);
        setSurvivalQuestionCount(prev => prev + 1);
        setSelectedAnswer(null);
        setCurrentAnswerType(null);
        setShowResult(false);
        
        // タイマーリセット
        if (gameConfig.isTimeAttackMode && gameConfig.timeLimit) {
          setTimeRemaining(gameConfig.timeLimit);
          setIsTimeOut(false);
        }
      } else {
        setIsGameActive(false);
        setIsGameFinished(true);
      }
    } else {
      // 通常モード
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setCurrentAnswerType(null);
        setShowResult(false);
        
        // タイマーリセット
        if (gameConfig.isTimeAttackMode && gameConfig.timeLimit) {
          setTimeRemaining(gameConfig.timeLimit);
          setIsTimeOut(false);
        }
      } else {
        setIsGameActive(false);
        setIsGameFinished(true);
      }
    }
  }, [currentQuestionIndex, questions.length, gameConfig, availableTsuboPool, allTsuboData, currentAnswerType]);

  const getGameResult = useCallback((): GameResult => {
    return {
      totalQuestions: questions.length,
      correctAnswers: answers.filter(a => a.answerType === 'correct').length,
      unsureAnswers: answers.filter(a => a.answerType === 'unsure').length,
      wrongAnswers: answers.filter(a => a.answerType === 'wrong').length,
      answers,
      timestamp: Date.now(),
      category: gameConfig.category,
      meridian: gameConfig.meridian,
    };
  }, [questions.length, answers, gameConfig.category, gameConfig.meridian]);

  const resetGame = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setIsGameActive(false);
    setIsGameFinished(false);
    setSelectedAnswer(null);
    setCurrentAnswerType(null);
    setShowResult(false);
    setTimeRemaining(null);
    setIsTimeOut(false);
    setComboCount(0);
    setTotalBonusPoints(0);
    setSurvivalQuestionCount(0);
    setAvailableTsuboPool([]);
  }, []);

  // タイマー効果
  useEffect(() => {
    if (isGameActive && gameConfig.isTimeAttackMode && timeRemaining !== null && timeRemaining > 0 && !showResult) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 0) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [isGameActive, gameConfig.isTimeAttackMode, timeRemaining, showResult]);
  
  // タイムアウト処理
  useEffect(() => {
    if (timeRemaining === 0 && !showResult && isGameActive) {
      setIsTimeOut(true);
      // 自動的に不正解扱い
      if (currentQuestion) {
        answerQuestion(-1, false);
      }
    }
  }, [timeRemaining, showResult, isGameActive, currentQuestion]);

  return {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions: gameConfig.isSurvivalMode ? survivalQuestionCount + 1 : questions.length,
    score,
    unsureCount,
    wrongCount,
    isGameActive,
    isGameFinished,
    selectedAnswer,
    currentAnswerType,
    showResult,
    gameConfig,
    answers,
    timeRemaining,
    isTimeOut,
    comboCount,
    totalBonusPoints,
    survivalQuestionCount,
    startGame,
    answerQuestion,
    nextQuestion,
    getGameResult,
    resetGame,
  };
}
