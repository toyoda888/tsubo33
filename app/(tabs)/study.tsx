import { useState, useMemo, useCallback, useEffect } from "react";
import { Text, View, FlatList, TouchableOpacity, Modal, StyleSheet, TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useTsuboData } from "@/hooks/use-tsubo-data";
import { useAppSettings } from "@/hooks/use-app-settings";
import { Tsubo } from "@/data/tsubo-data";
import { MERIDIANS, MERIDIAN_ORDER, MeridianKey, getMeridianKeyFromId } from "@/data/meridian-data";
import AsyncStorage from "@/lib/async-storage-web";

export default function StudyScreen() {
  const { tsuboData, isLoading } = useTsuboData();
  const { settings } = useAppSettings();
  const [selectedMeridian, setSelectedMeridian] = useState<MeridianKey | "all">("all");
  const [selectedTsubo, setSelectedTsubo] = useState<Tsubo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

  // 最近閲覧したツボを読み込み
  useEffect(() => {
    const loadRecentlyViewed = async () => {
      try {
        const stored = await AsyncStorage.getItem('@tsubo_recently_viewed');
        if (stored) {
          setRecentlyViewedIds(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load recently viewed:', error);
      }
    };
    loadRecentlyViewed();
  }, []);

  // 閲覧履歴を保存
  const saveRecentlyViewed = useCallback(async (tsuboId: string) => {
    try {
      const newRecent = [tsuboId, ...recentlyViewedIds.filter(id => id !== tsuboId)].slice(0, 5);
      setRecentlyViewedIds(newRecent);
      await AsyncStorage.setItem('@tsubo_recently_viewed', JSON.stringify(newRecent));
    } catch (error) {
      console.error('Failed to save recently viewed:', error);
    }
  }, [recentlyViewedIds]);

  // かなをローマ字に変換（簡易版）
  const toRomaji = (kana: string): string => {
    const kanaMap: Record<string, string> = {
      'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
      'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
      'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
      'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
      'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
      'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
      'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
      'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
      'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
      'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
      'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
      'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
      'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
      'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
      'わ': 'wa', 'を': 'wo', 'ん': 'n',
      // カタカナも追加
      'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
      'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
      'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
      'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
      'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
      'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
      'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
      'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
      'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
      'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
      'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
      'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
      'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
      'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
      'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n',
    };
    
    return kana.split('').map(char => kanaMap[char] || char).join('');
  };



  const filteredData = useMemo(() => {
    let data = tsuboData;
    
    if (selectedMeridian !== "all") {
      data = data.filter((t) => getMeridianKeyFromId(t.id) === selectedMeridian);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const queryRomaji = toRomaji(query);
      
      data = data.filter((t) => {
        // 前方一致検索（始まりのみ）
        const nameMatch = t.name.toLowerCase().startsWith(query);
        const readingMatch = t.reading.toLowerCase().startsWith(query);
        
        // 効能は部分一致のまま（「頭痛」で複数ヒットさせるため）
        const effectMatch = t.effect.toLowerCase().includes(query);
        
        // かな検索（readingをローマ字化して前方一致）
        const readingRomaji = toRomaji(t.reading.toLowerCase());
        const kanaMatch = readingRomaji.startsWith(queryRomaji);
        
        return nameMatch || readingMatch || effectMatch || kanaMatch;
      });
    }
    
    return data;
  }, [tsuboData, selectedMeridian, searchQuery]);

  const handleSelectTsubo = (tsubo: Tsubo) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    saveRecentlyViewed(tsubo.id);
    setSelectedTsubo(tsubo);
  };

  // 最近閲覧したツボを取得
  const recentlyViewedTsubo = useMemo(() => {
    return recentlyViewedIds
      .map(id => tsuboData.find(t => t.id === id))
      .filter((t): t is Tsubo => t !== undefined);
  }, [recentlyViewedIds, tsuboData]);

  const handleMeridianPress = (meridian: MeridianKey | "all") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedMeridian(meridian);
  };

  // 経絡名を取得（ツボ詳細表示用）
  const getMeridianName = (tsuboId: string): string => {
    const key = getMeridianKeyFromId(tsuboId);
    if (key && MERIDIANS[key]) {
      return MERIDIANS[key].name;
    }
    return "";
  };

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text className="text-muted">読み込み中...</Text>
      </ScreenContainer>
    );
  }

  // 経絡リストを作成
  const meridianList = [
    { key: "all" as const, label: "すべて", count: tsuboData.length },
    ...MERIDIAN_ORDER.map((key) => ({
      key,
      label: MERIDIANS[key].shortName,
      count: MERIDIANS[key].count,
    })),
  ];

  return (
    <ScreenContainer className="flex-1">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-foreground mb-4">📚 つぼ辞典</Text>
        
        <View className="bg-surface rounded-xl px-4 py-3 mb-4 border border-border">
          <TextInput
            placeholder="ツボ名、読み、効能で検索（例：こうけつ、頭痛）"
            placeholderTextColor="#9B8A91"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="text-foreground text-base"
            returnKeyType="search"
          />
        </View>

        {/* 最近閲覧したツボ */}
        {!searchQuery && recentlyViewedTsubo.length > 0 && (
          <View className="mb-4">
            <Text className="text-sm font-semibold text-muted mb-2">🕒 最近見たツボ</Text>
            <View className="flex-row flex-wrap gap-2">
              {recentlyViewedTsubo.map((tsubo) => (
                <TouchableOpacity
                  key={tsubo.id}
                  onPress={() => handleSelectTsubo(tsubo)}
                  className="bg-primary/10 rounded-lg px-3 py-2 border border-primary/30 active:opacity-70"
                >
                  <Text className="text-sm font-medium text-primary">{tsubo.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={meridianList}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleMeridianPress(item.key)}
              style={[
                styles.categoryChip,
                selectedMeridian === item.key && styles.categoryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedMeridian === item.key && styles.categoryChipTextActive,
                ]}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  styles.countText,
                  selectedMeridian === item.key && styles.countTextActive,
                ]}
              >
                {item.count}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 8 }}
        />
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelectTsubo(item)}
            className="bg-surface rounded-xl p-4 mb-3 border border-border active:opacity-80"
            style={styles.card}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground">{item.name}</Text>
                <Text className="text-sm text-muted mt-1">{item.reading}</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{getMeridianName(item.id)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center py-8">
            <Text className="text-muted">該当するツボが見つかりません</Text>
          </View>
        }
      />

      <Modal
        visible={selectedTsubo !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTsubo(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} className="bg-surface">
            {selectedTsubo && (
              <>
                <View className="items-center mb-4">
                  <View style={styles.modalIcon}>
                    <Text style={styles.modalIconText}>💫</Text>
                  </View>
                  <Text className="text-2xl font-bold text-foreground mt-3">{selectedTsubo.name}</Text>
                  <Text className="text-base text-muted">{selectedTsubo.reading}</Text>
                  <View style={styles.meridianBadge}>
                    <Text style={styles.meridianBadgeText}>{getMeridianName(selectedTsubo.id)}</Text>
                  </View>
                </View>

                <View className="gap-4">
                  <View className="bg-background rounded-xl p-4">
                    <Text className="text-sm font-semibold text-primary mb-2">📍 位置</Text>
                    <Text className="text-base text-foreground leading-6">{selectedTsubo.location}</Text>
                  </View>

                  <View className="bg-background rounded-xl p-4">
                    <Text className="text-sm font-semibold text-primary mb-2">✨ 効能</Text>
                    <Text className="text-base text-foreground leading-6">{selectedTsubo.effect}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedTsubo(null)}
                  style={styles.closeButton}
                  className="mt-6 rounded-xl py-4 items-center active:opacity-80"
                >
                  <Text className="text-white text-base font-semibold">閉じる</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FDF8FA",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#F0E4E9",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: "#E8A4C9",
    borderColor: "#E8A4C9",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#9B8A91",
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  countText: {
    fontSize: 12,
    color: "#C4B5BB",
    fontWeight: "400",
  },
  countTextActive: {
    color: "#FFE4F0",
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBadge: {
    backgroundColor: "#FDF8FA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0E4E9",
    maxWidth: 100,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: "#E8A4C9",
    fontWeight: "500",
  },
  meridianBadge: {
    backgroundColor: "#FDF8FA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8A4C9",
    marginTop: 8,
  },
  meridianBadgeText: {
    fontSize: 13,
    color: "#E8A4C9",
    fontWeight: "600",
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
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FDF8FA",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconText: {
    fontSize: 28,
  },
  closeButton: {
    backgroundColor: "#E8A4C9",
  },
});
