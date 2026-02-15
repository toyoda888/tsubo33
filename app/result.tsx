import { useMemo, useState, useEffect } from "react";
import { Text, View, ScrollView, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { AnswerRecord } from "@/hooks/use-game";
import { CATEGORIES, CategoryKey } from "@/data/tsubo-data";
import { useRankSystem, Rank } from "@/hooks/use-rank-system";
import { useAppSettings } from "@/hooks/use-app-settings";

type FilterType = 'all' | 'correct' | 'unsure' | 'wrong';

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    score: string;
    unsure: string;
    wrong: string;
    total: string;
    answers: string;
    category: string;
    isSurvivalMode?: string;
  }>();

  const { addCorrect, currentRank, rankData } = useRankSystem();
  const { settings, updateSurvivalBest } = useAppSettings();
  const [filter, setFilter] = useState<FilterType>('all');
  const [rankUpInfo, setRankUpInfo] = useState<{
    newRank: Rank | null;
    previousRank: Rank;
  } | null>(null);

  const score = parseInt(params.score || "0", 10);
  const unsure = parseInt(params.unsure || "0", 10);
  const wrong = parseInt(params.wrong || "0", 10);
  const total = parseInt(params.total || "10", 10);
  const percentage = Math.round((score / total) * 100);
  const category = params.category || 'all';
  const isSurvivalMode = params.isSurvivalMode === 'true';
  const [isNewRecord, setIsNewRecord] = useState(false);

  const answers: AnswerRecord[] = useMemo(() => {
    try {
      return JSON.parse(params.answers || "[]");
    } catch {
      return [];
    }
  }, [params.answers]);

  // 正解数を記録（初回のみ）
  useEffect(() => {
    if (!rankUpInfo && score > 0) {
      const recordCorrect = async () => {
        const result = await addCorrect(score);
        setRankUpInfo(result);
        
        // サバイバルモードの場合、最高記録更新チェック
        if (isSurvivalMode) {
          const isNew = updateSurvivalBest(total);
          setIsNewRecord(isNew);
        }
        
        // 身分が上がった場合はハプティクスフィードバック
        if (result.newRank && Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      };
      recordCorrect();
    } else if (!rankUpInfo && score === 0) {
      setRankUpInfo({ newRank: null, previousRank: currentRank });
    }
  }, []);

  const filteredAnswers = useMemo(() => {
    if (filter === 'all') return answers;
    return answers.filter(a => a.answerType === filter);
  }, [answers, filter]);

  const getResultEmoji = () => {
    if (percentage >= 90) return "🎉";
    if (percentage >= 70) return "✨";
    if (percentage >= 50) return "💪";
    return "📚";
  };

  const getResultMessage = () => {
    if (percentage >= 90) return "すばらしい！完璧です！";
    if (percentage >= 70) return "よくできました！";
    if (percentage >= 50) return "もう少し！がんばって！";
    return "復習してみましょう！";
  };

  const getResultColor = () => {
    if (percentage >= 70) return "#7DD3A8";
    if (percentage >= 50) return "#F5C77E";
    return "#E8A4A4";
  };

  const getCategoryTitle = () => {
    if (isSurvivalMode) return '💀 サバイバルモード';
    if (category === 'all') return 'すべてのツボ';
    if (category === 'review') return '復習モード';
    return CATEGORIES[category as CategoryKey];
  };

  const handlePlayAgain = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace({ pathname: "/game" as any, params: { category } });
  };

  const handleGoHome = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace("/");
  };

  const getAnswerTypeStyle = (type: string) => {
    switch (type) {
      case 'correct': return { bg: '#E8F5E9', border: '#7DD3A8', text: '#2E7D32', emoji: '✓' };
      case 'unsure': return { bg: '#FFF8E1', border: '#F5C77E', text: '#F57C00', emoji: '?' };
      case 'wrong': return { bg: '#FFEBEE', border: '#E8A4A4', text: '#C62828', emoji: '✗' };
      default: return { bg: '#F5F5F5', border: '#E0E0E0', text: '#757575', emoji: '' };
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} className="flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* 身分アップ演出 */}
        {rankUpInfo?.newRank && (
          <Animated.View 
            entering={FadeIn.delay(100).duration(500)}
            className="bg-primary/20 rounded-2xl p-4 mb-4 items-center border-2 border-primary"
          >
            <Text className="text-4xl mb-2">{rankUpInfo.newRank.emoji}</Text>
            <Text className="text-xl font-bold text-primary">身分が上がりました！</Text>
            <Text className="text-lg text-foreground mt-1">
              {rankUpInfo.previousRank.name} → {rankUpInfo.newRank.name}
            </Text>
          </Animated.View>
        )}
        
        {/* サバイバルモード新記録 */}
        {isSurvivalMode && isNewRecord && (
          <Animated.View 
            entering={FadeIn.delay(100).duration(500)}
            className="bg-gradient-to-r from-primary/30 to-error/30 rounded-2xl p-6 mb-4 items-center border-2 border-primary"
            style={styles.newRecordCard}
          >
            <Text className="text-6xl mb-3">🎉</Text>
            <Text className="text-2xl font-bold text-primary mb-2">🏆 新記録達成！</Text>
            <Text className="text-3xl font-bold text-foreground mb-1">{total}問連続正解</Text>
            <Text className="text-sm text-muted mt-2">前回の記録: {settings.survivalBestRecord - total > 0 ? settings.survivalBestRecord - total : 0}問</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(100).duration(400)} className="items-center mb-6 pt-2">
          <Text className="text-sm text-muted mb-2">{getCategoryTitle()}</Text>
          <View style={[styles.resultCircle, { borderColor: getResultColor() }]}>
            <Text style={styles.resultEmoji}>{getResultEmoji()}</Text>
            <Text style={[styles.resultPercentage, { color: getResultColor() }]}>{percentage}%</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground mt-4">{getResultMessage()}</Text>
        </Animated.View>

        {/* 正解数と身分 */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} className="mb-4">
          <View className="bg-surface rounded-2xl p-4 border border-border" style={styles.card}>
            <View className="items-center mb-3">
              <Text className="text-sm text-muted">{isSurvivalMode ? '連続正解' : '今回の獲得ポイント'}</Text>
              <Text className="text-4xl font-bold text-success">{isSurvivalMode ? `${total}問` : `+${score} pt`}</Text>
              {isSurvivalMode && (
                <Text className="text-xs text-muted mt-1">最高記録: {settings.survivalBestRecord}問</Text>
              )}
            </View>
            <View className="border-t border-border pt-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted">累計ポイント</Text>
                <Text className="text-lg font-bold text-foreground">{rankData.totalCorrect} pt</Text>
              </View>
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-sm text-muted">現在の身分</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl">{currentRank.emoji}</Text>
                  <Text className="text-lg font-bold text-primary">{currentRank.name}</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* スコア詳細 */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mb-6">
          <View className="bg-surface rounded-2xl p-4 border border-border" style={styles.card}>
            <View className="flex-row justify-between items-center">
              <TouchableOpacity 
                onPress={() => setFilter('correct')}
                className={`items-center flex-1 py-2 rounded-lg ${filter === 'correct' ? 'bg-success/20' : ''}`}
              >
                <Text className="text-2xl font-bold text-success">{score}</Text>
                <Text className="text-xs text-muted">正解</Text>
              </TouchableOpacity>
              <View className="w-px h-10 bg-border" />
              <TouchableOpacity 
                onPress={() => setFilter('unsure')}
                className={`items-center flex-1 py-2 rounded-lg ${filter === 'unsure' ? 'bg-warning/20' : ''}`}
              >
                <Text className="text-2xl font-bold text-warning">{unsure}</Text>
                <Text className="text-xs text-muted">自信なし</Text>
              </TouchableOpacity>
              <View className="w-px h-10 bg-border" />
              <TouchableOpacity 
                onPress={() => setFilter('wrong')}
                className={`items-center flex-1 py-2 rounded-lg ${filter === 'wrong' ? 'bg-error/20' : ''}`}
              >
                <Text className="text-2xl font-bold text-error">{wrong}</Text>
                <Text className="text-xs text-muted">不正解</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              onPress={() => setFilter('all')}
              className={`mt-3 py-2 rounded-lg items-center ${filter === 'all' ? 'bg-primary/20' : 'bg-background'}`}
            >
              <Text className={`text-sm ${filter === 'all' ? 'text-primary font-medium' : 'text-muted'}`}>
                すべて表示 ({total}問)
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* 回答一覧 */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <Text className="text-lg font-bold text-foreground mb-3">
            {filter === 'all' ? '回答一覧' : 
             filter === 'correct' ? '正解した問題' :
             filter === 'unsure' ? '自信がなかった問題' : '不正解の問題'}
          </Text>
          
          {filteredAnswers.length === 0 ? (
            <View className="bg-surface rounded-xl p-6 items-center border border-border">
              <Text className="text-muted">該当する問題はありません</Text>
            </View>
          ) : (
            <View className="gap-3">
              {filteredAnswers.map((answer, index) => {
                const style = getAnswerTypeStyle(answer.answerType);
                return (
                  <View 
                    key={index} 
                    className="bg-surface rounded-xl p-4 border border-border"
                    style={[styles.answerCard, { borderLeftColor: style.border, borderLeftWidth: 4 }]}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-lg font-bold text-foreground">{answer.question.tsubo.name}</Text>
                      <View style={[styles.answerBadge, { backgroundColor: style.bg }]}>
                        <Text style={{ color: style.text, fontWeight: '600' }}>
                          {style.emoji} {answer.answerType === 'correct' ? '正解' : answer.answerType === 'unsure' ? '自信なし' : '不正解'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-sm text-muted mb-1">読み: {answer.question.tsubo.reading}</Text>
                    <Text className="text-sm text-foreground mb-1">📍 {answer.question.tsubo.location}</Text>
                    <Text className="text-sm text-foreground">✨ {answer.question.tsubo.effect}</Text>
                    {answer.answerType === 'wrong' && (
                      <View className="mt-2 pt-2 border-t border-border">
                        <Text className="text-sm text-error">
                          あなたの回答: {answer.question.options[answer.selectedIndex]}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* ボタン */}
        <View className="mt-6 gap-3">
          <TouchableOpacity
            onPress={handlePlayAgain}
            style={styles.primaryButton}
            className="rounded-2xl py-4 items-center active:opacity-80"
          >
            <Text className="text-white text-lg font-bold">もう一度プレイ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleGoHome}
            className="bg-surface rounded-2xl py-4 items-center border border-border active:opacity-80"
          >
            <Text className="text-foreground text-lg font-semibold">ホームに戻る</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  resultCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  resultPercentage: {
    fontSize: 36,
    fontWeight: "bold",
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  newRecordCard: {
    shadowColor: "#E8A4C9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  answerCard: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  answerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: "#E8A4C9",
    shadowColor: "#E8A4C9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
});
