import { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, StyleSheet, Modal, ScrollView, Image, Switch } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { CATEGORIES, CategoryKey } from "@/data/tsubo-data";
import { MERIDIANS, MERIDIAN_ORDER, MeridianKey, filterTsuboByMeridian } from "@/data/meridian-data";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import { useTsuboData } from "@/hooks/use-tsubo-data";
import { useRankSystem } from "@/hooks/use-rank-system";
import { useGameStorage } from "@/hooks/use-game-storage";
import { useAppSettings } from "@/hooks/use-app-settings";
import { Alert } from "react-native";
import logger from "@/lib/logger";

const QUESTION_COUNTS = [10, 15, 20] as const;

type GameMode = 'all' | 'review' | 'category' | 'meridian';

export default function HomeScreen() {
  const router = useRouter();
  const { progress, resetProgress, clearHistory: clearLearningHistory } = useLearningProgress();
  const { tsuboData } = useTsuboData();
  const { rankData, currentRank, nextRank, correctToNextRank, resetRank } = useRankSystem();
  const { clearHistory } = useGameStorage();
  const { settings, toggleCombo, setTimeAttackDefault } = useAppSettings();
  
  const [showModeModal, setShowModeModal] = useState(false);
  const [showGameModeSelectModal, setShowGameModeSelectModal] = useState(false);
  const [showMeridianModal, setShowMeridianModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | 'all' | 'review'>('all');
  const [selectedMeridian, setSelectedMeridian] = useState<MeridianKey | null>(null);
  const [showQuestionCountModal, setShowQuestionCountModal] = useState(false);
  const [showTimeAttackModal, setShowTimeAttackModal] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('all');
  const [playMode, setPlayMode] = useState<'normal' | 'survival'>('normal');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(10);

  const unmasteredCount = tsuboData.length - progress.masteredIds.length;
  const reviewCount = progress.unsureIds.length + progress.wrongIds.length;
  
  // ログ記録
  useEffect(() => {
    logger.info('HomeScreen', '学習進捗データ', {
      masteredCount: progress.masteredIds.length,
      unsureCount: progress.unsureIds.length,
      wrongCount: progress.wrongIds.length,
      reviewCount,
      unmasteredCount,
      totalTsuboCount: tsuboData.length,
    });
  }, [progress, reviewCount, unmasteredCount, tsuboData.length]);

  // 正解率を計算
  const correctRate = progress.masteredIds.length > 0 
    ? Math.round((progress.masteredIds.length / tsuboData.length) * 100) 
    : 0;

  const handlePress = (route: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route as any);
  };

  const handleStartGame = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowGameModeSelectModal(true);
  };

  const handlePlayModeSelect = (mode: 'normal' | 'survival') => {
    setPlayMode(mode);
    setShowGameModeSelectModal(false);
    setShowModeModal(true);
  };

  const handleModeSelect = (mode: GameMode, meridian?: MeridianKey) => {
    setGameMode(mode);
    if (mode === 'meridian' && meridian) {
      setSelectedMeridian(meridian);
    }
    setShowModeModal(false);
    setShowMeridianModal(false);
    
    if (playMode === 'survival') {
      // サバイバルモードは問題数選択なし、直接開始
      startGame(0, false);
    } else {
      // 日常モードは問題数選択
      setShowQuestionCountModal(true);
    }
  };

  const handleQuestionCountSelect = (count: number) => {
    setSelectedQuestionCount(count);
    setShowQuestionCountModal(false);
    setShowTimeAttackModal(true);
  };

  const handleTimeAttackSelect = (enabled: boolean) => {
    setShowTimeAttackModal(false);
    startGame(selectedQuestionCount, enabled);
  };

  const startGame = (count: number, timeAttackEnabled: boolean) => {
    let targetTsuboIds: string[] = [];
    
    logger.info('HomeScreen', 'startGame呼び出し', {
      gameMode,
      playMode,
      count,
      timeAttackEnabled,
      selectedMeridian,
    });
    
    if (gameMode === 'all') {
      const unmasteredTsubos = tsuboData.filter(t => !progress.masteredIds.includes(t.id));
      targetTsuboIds = unmasteredTsubos.map(t => t.id);
      logger.info('HomeScreen', '通常モード', {
        unmasteredCount: unmasteredTsubos.length,
      });
    } else if (gameMode === 'review') {
      // 復習モード：重複を除去
      const uniqueReviewIds = [...new Set([...progress.unsureIds, ...progress.wrongIds])];
      targetTsuboIds = uniqueReviewIds;
      logger.info('HomeScreen', '復習モード', {
        unsureIds: progress.unsureIds,
        wrongIds: progress.wrongIds,
        uniqueReviewIds,
        targetCount: targetTsuboIds.length,
      });
    } else if (gameMode === 'meridian' && selectedMeridian) {
      const meridianTsubos = filterTsuboByMeridian(tsuboData, selectedMeridian);
      const unmasteredMeridianTsubos = meridianTsubos.filter(t => !progress.masteredIds.includes(t.id));
      targetTsuboIds = unmasteredMeridianTsubos.map(t => t.id);
      logger.info('HomeScreen', '経絡モード', {
        meridian: selectedMeridian,
        meridianTsubosCount: meridianTsubos.length,
        unmasteredCount: unmasteredMeridianTsubos.length,
      });
    }

    if (targetTsuboIds.length === 0) {
      logger.warn('HomeScreen', '対象ツボがゼロ', { gameMode, playMode });
      Alert.alert('出題できません', '対象となるツボがありません');
      return;
    }

    logger.info('HomeScreen', 'ゲーム画面へ遷移', {
      category: gameMode === 'all' ? 'all' : gameMode === 'review' ? 'review' : 'all',
      meridian: selectedMeridian || '',
      questionCount: count,
      isSurvivalMode: playMode === 'survival',
      isTimeAttackMode: timeAttackEnabled,
      timeLimit: settings.timeAttackDefault,
      targetTsuboCount: targetTsuboIds.length,
    });

    router.push({
      pathname: '/game',
      params: {
        category: gameMode === 'all' ? 'all' : gameMode === 'review' ? 'review' : 'all',
        meridian: selectedMeridian || '',
        questionCount: count.toString(),
        isSurvivalMode: playMode === 'survival' ? 'true' : 'false',
        isTimeAttackMode: timeAttackEnabled ? 'true' : 'false',
        timeLimit: settings.timeAttackDefault.toString(),
      },
    } as any);
  };

  const handleResetData = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      'データリセット',
      '本当に全てのデータをリセットしますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: async () => {
            await resetProgress();
            await clearHistory();
            await resetRank();
            setShowSettingsModal(false);
            Alert.alert('完了', 'データをリセットしました');
          },
        },
      ]
    );
  };



  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-1 items-center px-4 pt-8">


          {/* キャラクターイラストとタイトル */}
          <View className="items-center mb-6">
            <View style={styles.characterContainer}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.characterImage}
                resizeMode="contain"
              />
            </View>
            <Text className="text-2xl font-bold text-center text-primary mb-1">つぼ３３ 🌸</Text>
            <Text className="text-base text-center text-muted mb-4">
              楽しく遊んでツボを覚えよう ✨💖
            </Text>
          </View>

          {/* コンパクトなステータス表示 */}
          <View className="bg-surface rounded-2xl p-3 mb-4 mx-4 w-full max-w-sm border border-border" style={styles.card}>
            {/* 1行目：身分＋ポイント */}
            <View style={styles.statusRow}>
              <Text className="text-base font-semibold text-foreground">
                {currentRank.emoji} {currentRank.name}
              </Text>
              <Text className="text-base text-muted mx-2">│</Text>
              <Text className="text-base font-semibold text-primary">{rankData.totalCorrect}pt 💰</Text>
            </View>
            
            {/* 2行目：学習進捗＋サバイバル */}
            <View style={styles.statusRow}>
              <Text className="text-sm text-muted">
                📚 {progress.masteredIds.length}/{tsuboData.length} ({correctRate}%)
              </Text>
              <Text className="text-sm text-muted">
                💀 最高{settings.survivalBestRecord}問
              </Text>
            </View>
          </View>

          {/* ゲーム開始ボタン */}
          <TouchableOpacity
            onPress={handleStartGame}
            style={styles.startButton}
            className="w-full max-w-xs rounded-2xl py-4 items-center active:opacity-80 mb-4"
          >
            <Text style={styles.startButtonText}>ゲームを始める 🎮</Text>
          </TouchableOpacity>

          {/* サブメニュー */}
          <View style={styles.subMenu}>
            <TouchableOpacity
              onPress={() => handlePress('/study')}
              style={styles.menuButton}
            >
              <Text style={styles.menuText}>📖 辞典</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handlePress('/stats')}
              style={styles.menuButton}
            >
              <Text style={styles.menuText}>📊 成績</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSettingsModal(true)}
              style={styles.menuButton}
            >
              <Text style={styles.menuText}>⚙️ 設定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* プレイモード選択モーダル（日常 or サバイバル） */}
      <Modal
        visible={showGameModeSelectModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGameModeSelectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View className="p-6">
              <Text style={styles.modalTitle}>
                モードを選択 🎮
              </Text>
              <Text style={styles.modalSubtitle}>
                プレイモードを選んでください
              </Text>

              <TouchableOpacity
                onPress={() => handlePlayModeSelect('normal')}
                style={styles.modeOption}
              >
                <View className="items-center">
                  <Text className="text-3xl mb-2">📚</Text>
                  <Text className="text-lg font-bold text-foreground mb-1">日常モード</Text>
                  <Text className="text-sm text-muted">
                    問題数を選んで学習
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePlayModeSelect('survival')}
                style={[styles.modeOption, styles.modeOptionSurvival]}
              >
                <View className="items-center">
                  <Text className="text-3xl mb-2">💀</Text>
                  <Text className="text-lg font-bold text-error mb-1">サバイバルモード</Text>
                  <Text className="text-sm text-muted">
                    間違えるまで無限に挑戦
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowGameModeSelectModal(false)}
                style={styles.cancelButton}
              >
                <Text className="text-muted text-base">キャンセル</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 出題モード選択モーダル */}
      <Modal
        visible={showModeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="p-6">
                <Text className="text-2xl font-bold text-center text-foreground mb-2">
                  出題モードを選択
                </Text>
                <Text className="text-sm text-center text-muted mb-6">
                  学習したいモードを選んでください
                </Text>

                {/* すべてのツボ */}
                <TouchableOpacity
                  onPress={() => handleModeSelect('all')}
                  style={styles.modeOption}
                  className="bg-surface rounded-xl p-4 mb-3 border-2 border-border active:opacity-80"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-foreground mb-1">すべてのツボ</Text>
                      <Text className="text-sm text-muted">
                        未習得: {unmasteredCount}個
                      </Text>
                    </View>
                    <Text className="text-2xl">🌸</Text>
                  </View>
                </TouchableOpacity>

                {/* 復習モード */}
                <TouchableOpacity
                  onPress={() => handleModeSelect('review')}
                  style={styles.modeOption}
                  className="bg-surface rounded-xl p-4 mb-3 border-2 border-border active:opacity-80"
                  disabled={reviewCount === 0}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className={`text-lg font-bold ${reviewCount === 0 ? 'text-muted' : 'text-foreground'} mb-1`}>
                        復習モード
                      </Text>
                      <Text className="text-sm text-muted">
                        {reviewCount === 0 ? '復習するツボがありません' : `復習: ${reviewCount}個`}
                      </Text>
                    </View>
                    <Text className="text-2xl">🔄</Text>
                  </View>
                </TouchableOpacity>

                {/* 経絡別 */}
                <TouchableOpacity
                  onPress={() => {
                    setShowModeModal(false);
                    setShowMeridianModal(true);
                  }}
                  style={styles.modeOption}
                  className="bg-surface rounded-xl p-4 mb-3 border-2 border-border active:opacity-80"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-foreground mb-1">経絡別</Text>
                      <Text className="text-sm text-muted">14経絡から選択</Text>
                    </View>
                    <Text className="text-2xl">🔍</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowModeModal(false)}
                  className="mt-2 py-3 items-center"
                >
                  <Text className="text-muted">キャンセル</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 経絡選択モーダル */}
      <Modal
        visible={showMeridianModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMeridianModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="p-6">
                <Text className="text-2xl font-bold text-center text-foreground mb-2">
                  経絡を選択
                </Text>
                <Text className="text-sm text-center text-muted mb-6">
                  学習したい経絡を選んでください
                </Text>

                {MERIDIAN_ORDER.map((key) => {
                  const meridian = MERIDIANS[key];
                  const meridianTsubos = filterTsuboByMeridian(tsuboData, key);
                  const unmasteredMeridianCount = meridianTsubos.filter(
                    t => !progress.masteredIds.includes(t.id)
                  ).length;

                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => handleModeSelect('meridian', key)}
                      style={styles.meridianOption}
                      className="bg-surface rounded-xl p-4 mb-3 border border-border active:opacity-80"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-base font-bold text-foreground mb-1">
                            {meridian.name}
                          </Text>
                          <Text className="text-sm text-muted">
                            未習得: {unmasteredMeridianCount}/{meridianTsubos.length}個
                          </Text>
                        </View>
                        <Text className="text-xl">{meridian.emoji}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  onPress={() => {
                    setShowMeridianModal(false);
                    setShowModeModal(true);
                  }}
                  className="mt-2 py-3 items-center"
                >
                  <Text className="text-muted">戻る</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 問題数選択モーダル */}
      <Modal
        visible={showQuestionCountModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowQuestionCountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View className="p-6">
              <Text className="text-2xl font-bold text-center text-foreground mb-2">
                問題数を選択
              </Text>
              <Text className="text-sm text-center text-muted mb-6">
                出題する問題数を選んでください
              </Text>

              {QUESTION_COUNTS.map((count) => (
                <TouchableOpacity
                  key={count}
                  onPress={() => handleQuestionCountSelect(count)}
                  style={styles.countOption}
                  className="bg-surface rounded-xl py-4 px-6 mb-3 border-2 border-border active:opacity-80"
                >
                  <Text className="text-center text-xl font-bold text-foreground">
                    {count}問
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => {
                  setShowQuestionCountModal(false);
                  setShowModeModal(true);
                }}
                className="mt-2 py-3 items-center"
              >
                <Text className="text-muted">戻る</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* タイムアタック選択モーダル */}
      <Modal
        visible={showTimeAttackModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTimeAttackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View className="p-6">
              <Text className="text-2xl font-bold text-center text-foreground mb-2">
                タイムアタック ⏱️
              </Text>
              <Text className="text-sm text-center text-muted mb-6">
                時間制限を設定しますか？
              </Text>

              <TouchableOpacity
                onPress={() => handleTimeAttackSelect(true)}
                style={styles.timeAttackOption}
                className="bg-surface rounded-xl p-4 mb-3 border-2 border-warning active:opacity-80"
              >
                <View className="items-center">
                  <Text className="text-2xl mb-2">⏱️</Text>
                  <Text className="text-lg font-bold text-foreground mb-1">制限あり</Text>
                  <Text className="text-sm text-muted">
                    1問{settings.timeAttackDefault}秒
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleTimeAttackSelect(false)}
                style={styles.timeAttackOption}
                className="bg-surface rounded-xl p-4 mb-3 border-2 border-border active:opacity-80"
              >
                <View className="items-center">
                  <Text className="text-2xl mb-2">∞</Text>
                  <Text className="text-lg font-bold text-foreground mb-1">制限なし</Text>
                  <Text className="text-sm text-muted">
                    じっくり考える
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowTimeAttackModal(false);
                  setShowQuestionCountModal(true);
                }}
                className="mt-2 py-3 items-center"
              >
                <Text className="text-muted">戻る</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 設定モーダル */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="p-6">
                <Text className="text-2xl font-bold text-center text-foreground mb-6">
                  設定 ⚙️
                </Text>

                {/* コンボシステム */}
                <View className="bg-surface rounded-xl p-4 mb-4 border border-border">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-foreground mb-1">
                        🔥 コンボシステム
                      </Text>
                      <Text className="text-sm text-muted">
                        連続正解でボーナスポイント
                      </Text>
                    </View>
                    <Switch
                      value={settings.comboEnabled}
                      onValueChange={toggleCombo}
                      trackColor={{ false: '#F0E4E9', true: '#E8A4C9' }}
                      thumbColor={settings.comboEnabled ? '#FFFFFF' : '#E8A4C9'}
                    />
                  </View>
                  {settings.comboEnabled && (
                    <View className="mt-2 pl-2">
                      <Text className="text-xs text-muted">3連続: +1pt</Text>
                      <Text className="text-xs text-muted">5連続: +3pt</Text>
                      <Text className="text-xs text-muted">10連続: +5pt</Text>
                    </View>
                  )}
                </View>

                {/* タイムアタックデフォルト設定 */}
                <View className="bg-surface rounded-xl p-4 mb-4 border border-border">
                  <Text className="text-base font-bold text-foreground mb-3">
                    ⏱️ タイムアタック設定
                  </Text>
                  <Text className="text-sm text-muted mb-3">
                    デフォルトの制限時間（1問あたり）
                  </Text>
                  <View className="flex-row gap-2">
                    {[3, 5, 8, 10].map((seconds) => (
                      <TouchableOpacity
                        key={seconds}
                        onPress={() => setTimeAttackDefault(seconds as 3 | 5 | 8 | 10)}
                        style={[
                          styles.timeSettingButton,
                          settings.timeAttackDefault === seconds && styles.timeSettingButtonActive
                        ]}
                        className="flex-1 py-3 rounded-lg items-center"
                      >
                        <Text
                          className={`font-bold ${
                            settings.timeAttackDefault === seconds ? 'text-white' : 'text-foreground'
                          }`}
                        >
                          {seconds}秒
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* データリセット */}
                <TouchableOpacity
                  onPress={handleResetData}
                  style={styles.resetButton}
                  className="bg-error/10 rounded-xl py-4 px-6 border-2 border-error/30 active:opacity-80"
                >
                  <Text className="text-center text-base font-bold text-error">
                    🗑️ データをリセット
                  </Text>
                </TouchableOpacity>

                {/* ログ確認 */}
                <TouchableOpacity
                  onPress={() => {
                    setShowSettingsModal(false);
                    router.push('/logs');
                  }}
                  className="bg-surface rounded-xl py-4 px-6 border border-border mt-4 active:opacity-80"
                >
                  <Text className="text-center text-base font-bold text-foreground">
                    📝 ログを確認
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowSettingsModal(false)}
                  className="mt-4 py-3 items-center"
                >
                  <Text className="text-muted">閉じる</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  characterContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  characterImage: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#E8A4C9',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#9E8A92',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0E4E9',
    shadowColor: '#E8A4C9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
    maxWidth: 360,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A3F45',
  },
  divider: {
    fontSize: 16,
    color: '#F0E4E9',
    marginHorizontal: 8,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E8A4C9',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  survivalText: {
    fontSize: 14,
    color: '#666',
  },
  startButton: {
    backgroundColor: '#E8A4C9',
    shadowColor: '#E8A4C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subMenu: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 360,
  },
  menuButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#F0E4E9',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 14,
    color: '#4A3F45',
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4A3F45',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#9E8A92',
    marginBottom: 24,
  },
  modeOption: {
    backgroundColor: '#FDF8FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F0E4E9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeOptionSurvival: {
    borderColor: 'rgba(232, 164, 164, 0.3)',
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A3F45',
    marginBottom: 4,
  },
  modeTitleSurvival: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E8A4A4',
    marginBottom: 4,
  },
  modeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#9E8A92',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#9E8A92',
  },
  meridianOption: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  countOption: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeAttackOption: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeSettingButton: {
    backgroundColor: '#F0E4E9',
  },
  timeSettingButtonActive: {
    backgroundColor: '#E8A4C9',
  },
  resetButton: {
    shadowColor: '#E8A4A4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
