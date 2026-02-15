import { useEffect, useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, Modal, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  Easing,
  FadeIn,
} from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { useGame, AnswerType } from "@/hooks/use-game";
import { useGameStorage } from "@/hooks/use-game-storage";
import { useTsuboData } from "@/hooks/use-tsubo-data";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import { CATEGORIES, CategoryKey } from "@/data/tsubo-data";
import { MERIDIANS, MeridianKey, filterTsuboByMeridian } from "@/data/meridian-data";
import logger from "@/lib/logger";

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    category?: string; 
    meridian?: string; 
    questionCount?: string;
    isSurvivalMode?: string;
    isTimeAttackMode?: string;
    timeLimit?: string;
  }>();
  
  // ✅ すべてのフックを最初に呼ぶ（条件分岐の前）
  const { tsuboData } = useTsuboData();
  const { saveResult } = useGameStorage();
  const { progress, recordAnswer, isLoading: progressLoading } = useLearningProgress();

  const category = (params.category || 'all') as CategoryKey | 'all' | 'review';
  const meridian = params.meridian as MeridianKey | undefined;
  const questionCount = parseInt(params.questionCount || '10', 10);
  const isSurvivalMode = params.isSurvivalMode === 'true';
  const isTimeAttackMode = params.isTimeAttackMode === 'true';
  const timeLimit = parseInt(params.timeLimit || '8', 10);
  
  // ✅ targetTsuboData もフック呼び出し後に計算（早期リターン前）
  const targetTsuboData = (() => {
    if (category === 'review') {
      const reviewIds = [...new Set([...progress.unsureIds, ...progress.wrongIds])];
      return tsuboData.filter(t => reviewIds.includes(t.id));
    }
    if (meridian) {
      return filterTsuboByMeridian(tsuboData, meridian);
    }
    return tsuboData;
  })();

  // ✅ useGame フックも条件分岐の前に呼ぶ
  const {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    score,
    unsureCount,
    wrongCount,
    isGameActive,
    isGameFinished,
    selectedAnswer,
    currentAnswerType,
    showResult,
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
  } = useGame(targetTsuboData, tsuboData, progress.masteredIds);

  const [showAnswerPopup, setShowAnswerPopup] = useState(false);

  const progressWidth = useSharedValue(0);
  const cardScale = useSharedValue(1);

  useEffect(() => {
    // ✅ progressLoading 完了後のみ startGame を実行
    if (progressLoading) {
      logger.info('GameScreen', 'useEffect: progressLoading=true のためスキップ');
      return;
    }

    try {
      logger.info('GameScreen', 'startGame呼び出し', {
        category,
        meridian,
        excludeMastered: category !== 'review',
        questionCount,
        isSurvivalMode,
        isTimeAttackMode,
        timeLimit: isTimeAttackMode ? timeLimit : undefined,
        targetTsuboDataCount: targetTsuboData.length,
        tsuboDataCount: tsuboData.length,
        masteredIdsCount: progress.masteredIds.length,
      });
      
      if (targetTsuboData.length === 0 && category === 'review') {
        logger.warn('GameScreen', '復習対象が0件のため startGame をスキップ', {
          progressUnsureCount: progress.unsureIds.length,
          progressWrongCount: progress.wrongIds.length,
        });
        return;
      }
      
      startGame({ 
        category,
        meridian,
        excludeMastered: category !== 'review',
        questionCount,
        isSurvivalMode,
        isTimeAttackMode,
        timeLimit: isTimeAttackMode ? timeLimit : undefined,
      });
    } catch (error) {
      logger.error('GameScreen', 'startGameエラー', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      logger.saveSession();
    }

    return () => {
      logger.info('GameScreen', 'cleanup: resetGame呼び出し');
      resetGame();
    };
  }, [progressLoading, category, meridian, questionCount]);

  useEffect(() => {
    if (totalQuestions > 0) {
      progressWidth.value = withTiming(
        ((currentQuestionIndex + 1) / totalQuestions) * 100,
        { duration: 300, easing: Easing.out(Easing.cubic) }
      );
    }
  }, [currentQuestionIndex, totalQuestions]);

  useEffect(() => {
    if (isGameFinished) {
      const result = getGameResult();
      logger.info('GameScreen', 'ゲーム終了', {
        score: result.correctAnswers,
        unsure: result.unsureAnswers,
        wrong: result.wrongAnswers,
        total: result.totalQuestions,
        category: result.category,
        isSurvivalMode,
      });
      saveResult(result);
      logger.saveSession(); // セッションログを保存
      router.replace({
        pathname: "/result" as any,
        params: {
          score: result.correctAnswers.toString(),
          unsure: result.unsureAnswers.toString(),
          wrong: result.wrongAnswers.toString(),
          total: result.totalQuestions.toString(),
          answers: JSON.stringify(result.answers),
          category: result.category,
          isSurvivalMode: isSurvivalMode ? 'true' : 'false',
        },
      });
    }
  }, [isGameFinished]);

  // 回答後にポップアップを表示
  useEffect(() => {
    if (showResult && currentQuestion) {
      setShowAnswerPopup(true);
    }
  }, [showResult, currentQuestion]);

  // ✅ useAnimatedStyle も早期リターン前に呼ぶ
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  // ✅ ログ出力（全フック呼び出し後）
  logger.info('GameScreen', 'ゲーム画面初期化', {
    category,
    meridian,
    questionCount,
    isSurvivalMode,
    isTimeAttackMode,
    timeLimit,
    progressLoading,
    progressMasteredCount: progress.masteredIds.length,
    progressUnsureCount: progress.unsureIds.length,
    progressWrongCount: progress.wrongIds.length,
    targetTsuboDataCount: targetTsuboData.length,
  });
  
  // ✅ ローディング中はここで早期リターン（全フック呼び出し後）
  if (progressLoading) {
    logger.info('GameScreen', 'データロード中', { progressLoading });
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text className="text-muted">データを読み込み中...</Text>
      </ScreenContainer>
    );
  }

  const handleAnswer = (index: number, isUnsure: boolean = false) => {
    if (selectedAnswer !== null) return;

    cardScale.value = withSequence(
      withTiming(0.98, { duration: 50 }),
      withTiming(1, { duration: 100 })
    );

    answerQuestion(index, isUnsure);

    // 学習進捗を記録
    if (currentQuestion) {
      const isCorrect = index === currentQuestion.correctIndex;
      let answerType: AnswerType;
      if (isUnsure) {
        answerType = 'unsure';
      } else if (isCorrect) {
        answerType = 'correct';
      } else {
        answerType = 'wrong';
      }
      recordAnswer(
        currentQuestion.tsubo.id,
        currentQuestion.tsubo.name,
        answerType,
        currentQuestion.tsubo.category
      );

    }

    if (Platform.OS !== "web") {
      if (!isUnsure && index === currentQuestion?.correctIndex) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (isUnsure) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleClosePopupAndNext = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowAnswerPopup(false);
    nextQuestion();
  };

  // 出題可能な問題がない場合
  if (isGameFinished && totalQuestions === 0) {
    logger.warn('GameScreen', '出題可能な問題がない', {
      category,
      meridian,
      targetTsuboDataCount: targetTsuboData.length,
      progressUnsureCount: progress.unsureIds.length,
      progressWrongCount: progress.wrongIds.length,
    });
    logger.saveSession();
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]} className="flex-1 items-center justify-center px-6">
        <View className="items-center">
          <Text className="text-5xl mb-4">🎉</Text>
          <Text className="text-2xl font-bold text-foreground mb-2">おめでとう！</Text>
          <Text className="text-base text-muted text-center mb-6">
            {category === 'review' 
              ? "復習する問題がありません\n\nまずは日常モードで問題を解いてみましょう。\n不正解・うろ覚えの問題が復習対象になります。"
              : "すべてのツボを習得しました！"}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.nextButton}
            className="rounded-xl py-4 px-8 items-center active:opacity-80"
          >
            <Text className="text-white text-lg font-bold">ホームに戻る</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  if (!isGameActive || !currentQuestion) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text className="text-muted">読み込み中...</Text>
      </ScreenContainer>
    );
  }

  const getResultEmoji = () => {
    if (currentAnswerType === 'correct') return "🎉";
    if (currentAnswerType === 'unsure') return "🤔";
    return "💪";
  };

  const getResultTitle = () => {
    if (currentAnswerType === 'correct') {
      let bonusText = '';
      if (comboCount === 3) bonusText = ' (+1pt コンボボーナス!)';
      else if (comboCount === 5) bonusText = ' (+3pt コンボボーナス!!)';
      else if (comboCount === 10) bonusText = ' (+5pt コンボボーナス!!!)';
      return `正解！ +1pt${bonusText}`;
    }
    if (currentAnswerType === 'unsure') return "自信なし";
    if (isTimeOut) return "時間切れ...";
    return "不正解...";
  };

  const getResultColor = () => {
    if (currentAnswerType === 'correct') return "#4CAF50";
    if (currentAnswerType === 'unsure') return "#FF9800";
    return "#E57373";
  };

  const getOptionStyle = (index: number) => {
    if (!showResult) return styles.optionDefault;
    if (index === currentQuestion.correctIndex) return styles.optionCorrect;
    if (index === selectedAnswer && index !== currentQuestion.correctIndex) return styles.optionWrong;
    return styles.optionDefault;
  };

  const getOptionTextStyle = (index: number) => {
    if (!showResult) return styles.optionTextDefault;
    if (index === currentQuestion.correctIndex) return styles.optionTextCorrect;
    if (index === selectedAnswer && index !== currentQuestion.correctIndex) return styles.optionTextWrong;
    return styles.optionTextDefault;
  };

  const getCategoryTitle = () => {
    if (isSurvivalMode) return '💀 サバイバルモード';
    if (meridian) return MERIDIANS[meridian].name;
    if (category === 'all') return 'すべてのツボ';
    if (category === 'review') return '復習モード';
    return CATEGORIES[category as CategoryKey];
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} className="flex-1">
      <View className="flex-1 px-4 pt-4">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 active:opacity-60"
          >
            <Text className="text-base text-primary">✕ 終了</Text>
          </TouchableOpacity>
          <Text className="text-sm text-muted">{getCategoryTitle()}</Text>
          <View className="flex-row items-center gap-2">
            {isTimeAttackMode && timeRemaining !== null && (
              <View className="flex-row items-center gap-1 bg-warning/20 px-2 py-1 rounded-lg">
                <Text className="text-base">⏱️</Text>
                <Text className="text-base font-bold text-warning">{timeRemaining}s</Text>
              </View>
            )}
            {comboCount >= 3 && (
              <View className="flex-row items-center gap-1 bg-error/20 px-2 py-1 rounded-lg">
                <Text className="text-base">🔥</Text>
                <Text className="text-base font-bold text-error">{comboCount}</Text>
              </View>
            )}
            <Text className="text-lg font-bold text-success">{score}pt</Text>
          </View>
        </View>

        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-muted">
              {isSurvivalMode ? `問題 ${survivalQuestionCount + 1}` : `問題 ${currentQuestionIndex + 1} / ${totalQuestions}`}
            </Text>
            <View className="flex-row gap-2">
              <Text className="text-xs text-success">✓{score}</Text>
              <Text className="text-xs text-warning">?{unsureCount}</Text>
              <Text className="text-xs text-error">✗{wrongCount}</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
        </View>

        <Animated.View style={[styles.questionCard, cardAnimatedStyle]} className="bg-surface rounded-3xl p-6 mb-4 border border-border">
          <View className="items-center mb-4">
            <View style={styles.questionIcon}>
              <Text style={styles.questionIconText}>❓</Text>
            </View>
          </View>
          
          <Text className="text-center text-sm text-muted mb-2">このツボの名前は？</Text>
          
          <View className="bg-background rounded-xl p-4 mb-3">
            <Text className="text-sm font-semibold text-primary mb-1">📍 位置</Text>
            <Text className="text-base text-foreground leading-6">{currentQuestion.tsubo.location}</Text>
          </View>
          
          <View className="bg-background rounded-xl p-4">
            <Text className="text-sm font-semibold text-primary mb-1">✨ 効能</Text>
            <Text className="text-base text-foreground leading-6">{currentQuestion.tsubo.effect}</Text>
          </View>
        </Animated.View>

        <View className="gap-2">
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleAnswer(index, false)}
              disabled={showResult}
              style={[styles.optionButton, getOptionStyle(index)]}
              className="rounded-xl py-3 px-4 active:opacity-80"
            >
              <Text style={[styles.optionText, getOptionTextStyle(index)]}>{option}</Text>
              {showResult && index === currentQuestion.correctIndex && (
                <Text style={styles.correctBadge}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* 自信がないボタン */}
        {!showResult && (
          <TouchableOpacity
            onPress={() => handleAnswer(currentQuestion.correctIndex, true)}
            style={styles.unsureButton}
            className="mt-4 rounded-xl py-3 items-center active:opacity-80"
          >
            <Text className="text-warning text-base font-semibold">🤔 自信がない（正解を見る）</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 正解ポップアップ */}
      <Modal
        visible={showAnswerPopup}
        animationType="slide"
        transparent
        onRequestClose={handleClosePopupAndNext}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={FadeIn.duration(200)}
            style={styles.modalContent} 
            className="bg-surface"
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 結果ヘッダー */}
              <View className="items-center mb-4">
                <View style={[styles.resultIcon, { backgroundColor: `${getResultColor()}20` }]}>
                  <Text style={styles.resultIconText}>{getResultEmoji()}</Text>
                </View>
                <Text style={[styles.resultTitle, { color: getResultColor() }]}>
                  {getResultTitle()}
                </Text>
                {currentAnswerType === 'wrong' && (
                  <Text className="text-sm text-muted mt-1">
                    あなたの回答: {currentQuestion.options[selectedAnswer!]}
                  </Text>
                )}
                {currentAnswerType === 'unsure' && (
                  <Text className="text-sm text-muted mt-1">
                    次回の復習リストに追加されました
                  </Text>
                )}
              </View>

              {/* 正解のツボ情報 */}
              <View style={styles.answerCard} className="bg-background rounded-2xl p-5 mb-4">
                <View className="items-center mb-4">
                  <Text className="text-sm text-muted mb-1">正解</Text>
                  <Text className="text-2xl font-bold text-foreground">{currentQuestion.tsubo.name}</Text>
                  <Text className="text-base text-muted">{currentQuestion.tsubo.reading}</Text>
                  <View style={styles.categoryBadge} className="mt-2">
                    <Text style={styles.categoryBadgeText}>{CATEGORIES[currentQuestion.tsubo.category]}</Text>
                  </View>
                </View>

                <View className="gap-3">
                  <View className="bg-surface rounded-xl p-4">
                    <Text className="text-sm font-semibold text-primary mb-2">📍 位置</Text>
                    <Text className="text-base text-foreground leading-6">{currentQuestion.tsubo.location}</Text>
                  </View>

                  <View className="bg-surface rounded-xl p-4">
                    <Text className="text-sm font-semibold text-primary mb-2">✨ 効能</Text>
                    <Text className="text-base text-foreground leading-6">{currentQuestion.tsubo.effect}</Text>
                  </View>
                </View>
              </View>

              {/* 次へボタン */}
              <TouchableOpacity
                onPress={handleClosePopupAndNext}
                style={styles.nextButton}
                className="rounded-xl py-4 items-center active:opacity-80"
              >
                <Text className="text-white text-lg font-bold">
                  {currentQuestionIndex < totalQuestions - 1 ? "次の問題へ →" : "結果を見る 🎉"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  progressBar: {
    height: 8,
    backgroundColor: "#F0E4E9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#E8A4C9",
    borderRadius: 4,
  },
  questionCard: {
    shadowColor: "#E8A4C9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  questionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FDF8FA",
    alignItems: "center",
    justifyContent: "center",
  },
  questionIconText: {
    fontSize: 24,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
  },
  optionDefault: {
    backgroundColor: "#FFFFFF",
    borderColor: "#F0E4E9",
  },
  optionCorrect: {
    backgroundColor: "#E8F5E9",
    borderColor: "#7DD3A8",
  },
  optionWrong: {
    backgroundColor: "#FFEBEE",
    borderColor: "#E8A4A4",
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  optionTextDefault: {
    color: "#4A3F45",
  },
  optionTextCorrect: {
    color: "#2E7D32",
  },
  optionTextWrong: {
    color: "#C62828",
  },
  correctBadge: {
    fontSize: 18,
    color: "#7DD3A8",
    fontWeight: "bold",
  },
  unsureButton: {
    backgroundColor: "#FFF8E1",
    borderWidth: 2,
    borderColor: "#F5C77E",
  },
  nextButton: {
    backgroundColor: "#E8A4C9",
    shadowColor: "#E8A4C9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  resultIconText: {
    fontSize: 32,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  answerCard: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBadge: {
    backgroundColor: "#FDF8FA",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0E4E9",
  },
  categoryBadgeText: {
    fontSize: 12,
    color: "#E8A4C9",
    fontWeight: "500",
  },
});
