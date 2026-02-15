import { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, StyleSheet, Modal } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useGameStorage } from "@/hooks/use-game-storage";
import { useTsuboData } from "@/hooks/use-tsubo-data";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useRankSystem } from "@/hooks/use-rank-system";
import { CATEGORIES, CategoryKey } from "@/data/tsubo-data";

export default function StatsScreen() {
  const { history, getAverageScore, getBestScore, getWeakTsuboIds } = useGameStorage();
  const { tsuboData } = useTsuboData();
  const { progress, getRecentHistory } = useLearningProgress();
  const { settings } = useAppSettings();
  const { rankData, currentRank, nextRank, correctToNextRank, progressToNextRank, allRanks } = useRankSystem();
  const [showHistoryModal, setShowHistoryModal] = useState(false);



  const recentHistory = getRecentHistory(30);
  const weakTsuboIds = getWeakTsuboIds();
  const weakTsubo = tsuboData.filter((t) => weakTsuboIds.includes(t.id));

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getAnswerTypeLabel = (type: string) => {
    switch (type) {
      case 'correct': return { text: '正解', color: '#7DD3A8' };
      case 'unsure': return { text: '自信なし', color: '#F5C77E' };
      case 'wrong': return { text: '不正解', color: '#E8A4A4' };
      default: return { text: '', color: '#999' };
    }
  };

  return (
    <ScreenContainer className="flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="text-2xl font-bold text-foreground mb-6">📊 成績・履歴</Text>

        {/* 学習進捗 */}
        <View className="bg-surface rounded-2xl p-5 mb-4 border border-border" style={styles.card}>
          <Text className="text-lg font-semibold text-foreground mb-4">📈 学習進捗</Text>
          <View className="flex-row justify-between mb-4">
            <View className="items-center flex-1">
              <Text className="text-3xl font-bold text-success">{progress.masteredIds.length}</Text>
              <Text className="text-sm text-muted">習得済み</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-3xl font-bold text-warning">{progress.unsureIds.length}</Text>
              <Text className="text-sm text-muted">自信なし</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-3xl font-bold text-error">{progress.wrongIds.length}</Text>
              <Text className="text-sm text-muted">要復習</Text>
            </View>
          </View>
          
          {/* プログレスバー */}
          <View className="mb-2">
            <View className="flex-row justify-between mb-1">
              <Text className="text-xs text-muted">進捗</Text>
              <Text className="text-xs text-muted">{progress.masteredIds.length}/{tsuboData.length}</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFillGreen, 
                  { width: `${(progress.masteredIds.length / tsuboData.length) * 100}%` }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* ランクシステム */}
        <View className="bg-surface rounded-2xl p-5 mb-4 border border-border" style={styles.card}>
          <Text className="text-lg font-semibold text-foreground mb-4">🏆 ランクシステム</Text>
          
          {/* 現在のランク情報 */}
          <View className="bg-primary/10 rounded-xl p-4 mb-4 border-2 border-primary">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-3xl">{currentRank.emoji}</Text>
                <View>
                  <Text className="text-lg font-bold text-foreground">{currentRank.name}</Text>
                  <Text className="text-sm text-primary font-semibold">現在のランク</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-2xl font-bold text-primary">{rankData.totalCorrect}</Text>
                <Text className="text-xs text-muted">pt</Text>
              </View>
            </View>
            
            {nextRank && (
              <View className="mt-3">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-muted">次のランクまで</Text>
                  <Text className="text-sm font-semibold text-primary">あと {correctToNextRank} pt</Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFillPrimary, 
                      { width: `${progressToNextRank}%` }
                    ]} 
                  />
                </View>
                <Text className="text-xs text-muted mt-1">次: {nextRank.emoji} {nextRank.name} ({nextRank.requiredCorrect} pt)</Text>
              </View>
            )}
          </View>

          {/* 全ランク一覧 */}
          <Text className="text-sm font-semibold text-foreground mb-3">🎖️ 全ランク一覧</Text>
          <View className="gap-2">
            {allRanks.map((rank, index) => {
              const isPassed = rankData.totalCorrect >= rank.requiredCorrect;
              const isCurrent = rank.id === currentRank.id;
              const isNext = nextRank && rank.id === nextRank.id;
              
              return (
                <View 
                  key={rank.id}
                  className={`rounded-xl p-3 border ${
                    isCurrent 
                      ? 'bg-primary/10 border-primary border-2' 
                      : isPassed 
                      ? 'bg-success/5 border-success/30' 
                      : 'bg-background border-border'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      <Text className="text-2xl" style={{ opacity: isPassed ? 1 : 0.3 }}>{rank.emoji}</Text>
                      <View className="flex-1">
                        <Text 
                          className="text-base font-semibold"
                          style={{ 
                            color: isCurrent ? '#E8A4C9' : isPassed ? '#7DD3A8' : '#9B8A91' 
                          }}
                        >
                          {rank.name}
                        </Text>
                        <Text className="text-xs text-muted">{rank.requiredCorrect} pt 以上</Text>
                      </View>
                    </View>
                    {isCurrent && (
                      <View className="bg-primary rounded-full px-3 py-1">
                        <Text className="text-white text-xs font-bold">現在</Text>
                      </View>
                    )}
                    {isPassed && !isCurrent && (
                      <Text className="text-success text-xl">✓</Text>
                    )}
                    {isNext && (
                      <View className="bg-primary/20 rounded-full px-3 py-1">
                        <Text className="text-primary text-xs font-bold">次</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ゲーム統計 */}
        <View className="bg-surface rounded-2xl p-5 mb-4 border border-border" style={styles.card}>
          <Text className="text-lg font-semibold text-foreground mb-4">🎮 ゲーム統計</Text>
          <View className="flex-row flex-wrap gap-4">
            <View className="flex-1 min-w-[100px] bg-background rounded-xl p-4 items-center">
              <Text className="text-2xl font-bold text-foreground">{history.totalGames}</Text>
              <Text className="text-xs text-muted">プレイ回数</Text>
            </View>
            <View className="flex-1 min-w-[100px] bg-background rounded-xl p-4 items-center">
              <Text className="text-2xl font-bold text-primary">{getAverageScore()}%</Text>
              <Text className="text-xs text-muted">平均正答率</Text>
            </View>
            <View className="flex-1 min-w-[100px] bg-background rounded-xl p-4 items-center">
              <Text className="text-2xl font-bold text-success">{getBestScore()}%</Text>
              <Text className="text-xs text-muted">最高正答率</Text>
            </View>
          </View>
        </View>

        {/* 学習履歴 */}
        <TouchableOpacity 
          onPress={() => setShowHistoryModal(true)}
          className="bg-surface rounded-2xl p-5 mb-4 border border-border active:opacity-80" 
          style={styles.card}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-foreground">📝 学習履歴</Text>
            <Text className="text-sm text-primary">詳細を見る →</Text>
          </View>
          
          {recentHistory.length === 0 ? (
            <Text className="text-muted text-center py-2">まだ学習履歴がありません</Text>
          ) : (
            <View className="gap-2">
              {recentHistory.slice(0, 5).map((item, index) => {
                const label = getAnswerTypeLabel(item.answerType);
                return (
                  <View key={index} className="flex-row items-center justify-between bg-background rounded-lg p-3">
                    <View className="flex-row items-center gap-2 flex-1">
                      <View style={[styles.historyDot, { backgroundColor: label.color }]} />
                      <Text className="text-sm text-foreground flex-1" numberOfLines={1}>{item.tsuboName}</Text>
                    </View>
                    <Text className="text-xs text-muted">{formatDate(item.timestamp)}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </TouchableOpacity>

        {/* 苦手なツボ */}
        {weakTsubo.length > 0 && (
          <View className="bg-surface rounded-2xl p-5 mb-4 border border-border" style={styles.card}>
            <Text className="text-lg font-semibold text-foreground mb-4">😅 苦手なツボ</Text>
            <View className="gap-2">
              {weakTsubo.slice(0, 5).map((tsubo) => (
                <View key={tsubo.id} className="bg-background rounded-lg p-3">
                  <Text className="text-base font-medium text-foreground">{tsubo.name}</Text>
                  <Text className="text-xs text-muted">{tsubo.reading}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 学習履歴モーダル */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} className="bg-surface">
            <Text className="text-xl font-bold text-foreground mb-4 text-center">📝 学習履歴</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {recentHistory.length === 0 ? (
                <Text className="text-muted text-center py-8">まだ学習履歴がありません</Text>
              ) : (
                <View className="gap-2">
                  {recentHistory.map((item, index) => {
                    const label = getAnswerTypeLabel(item.answerType);
                    return (
                      <View key={index} className="bg-background rounded-xl p-4">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-base font-semibold text-foreground">{item.tsuboName}</Text>
                          <View style={[styles.answerBadge, { backgroundColor: label.color + '20' }]}>
                            <Text style={{ color: label.color, fontSize: 12, fontWeight: '600' }}>{label.text}</Text>
                          </View>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs text-muted">{CATEGORIES[item.category as CategoryKey] || item.category}</Text>
                          <Text className="text-xs text-muted">{formatDate(item.timestamp)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowHistoryModal(false)}
              className="mt-4 py-3 items-center"
            >
              <Text className="text-muted text-base">閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F0E4E9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFillGreen: {
    height: "100%",
    backgroundColor: "#7DD3A8",
    borderRadius: 4,
  },
  progressFillPrimary: {
    height: "100%",
    backgroundColor: "#E8A4C9",
    borderRadius: 4,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  answerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    maxHeight: "80%",
  },
});
