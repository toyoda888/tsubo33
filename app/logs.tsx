import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import logger from '@/lib/logger';

export default function LogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<{ key: string; content: string; timestamp: string }[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    const allLogs = await logger.getAllLogs();
    setLogs(allLogs);
    setIsLoading(false);
  };

  const handleDownloadLog = async (logKey: string, timestamp: string) => {
    const filename = `tsubo33-log-${timestamp}.txt`;
    await logger.downloadLog(logKey, filename);
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`ダウンロード完了\nログファイルをダウンロードしました: ${filename}`);
    }
  };

  const handleClearAllLogs = () => {
    if (typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm('全てのログを削除しますか？');
      if (confirmed) {
        (async () => {
          await logger.clearAllLogs();
          await loadLogs();
          window.alert('完了\nログをクリアしました');
        })();
      }
    }
  };

  const handleSaveCurrentSession = async () => {
    await logger.saveSession();
    await loadLogs();
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('保存完了\n現在のセッションログを保存しました');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const parts = timestamp.split('T');
    const date = parts[0];
    const time = parts[1]?.slice(0, 8) || '';
    return `${date} ${time}`;
  };

  const selectedLogContent = selectedLog ? logs.find(l => l.key === selectedLog)?.content : null;

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} className="flex-1">
      <View className="flex-1 px-4 py-6">
        {/* ヘッダー */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="py-2 px-4 bg-surface rounded-lg border border-border"
          >
            <Text className="text-foreground font-bold">← 戻る</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground">📝 ログ</Text>
          <View style={{ width: 70 }} />
        </View>

        {/* アクションボタン */}
        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity
            onPress={handleSaveCurrentSession}
            className="flex-1 py-3 bg-primary rounded-lg"
          >
            <Text className="text-white text-center font-bold">💾 保存</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={loadLogs}
            className="flex-1 py-3 bg-surface rounded-lg border border-border"
          >
            <Text className="text-foreground text-center font-bold">🔄 更新</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearAllLogs}
            className="flex-1 py-3 bg-error/10 rounded-lg border-2 border-error/30"
          >
            <Text className="text-error text-center font-bold">🗑️ 削除</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-muted">読み込み中...</Text>
          </View>
        ) : logs.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-5xl mb-4">📝</Text>
            <Text className="text-xl font-bold text-foreground mb-2">ログがありません</Text>
            <Text className="text-muted text-center">
              「💾 保存」ボタンを押すと{'\n'}現在のセッションログが保存されます
            </Text>
          </View>
        ) : (
          <View className="flex-1">
            {!selectedLog ? (
              /* ログ一覧 */
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <Text className="text-sm text-muted mb-3">
                  ログ件数: {logs.length}/5（最新5件まで保存）
                </Text>
                {logs.map((log, index) => (
                  <TouchableOpacity
                    key={log.key}
                    onPress={() => setSelectedLog(log.key)}
                    className="bg-surface rounded-xl p-4 mb-3 border border-border active:opacity-80"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-base font-bold text-foreground">
                        ログ #{logs.length - index}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDownloadLog(log.key, log.timestamp)}
                        className="py-1 px-3 bg-primary/10 rounded-lg"
                      >
                        <Text className="text-primary text-xs font-bold">⬇️ DL</Text>
                      </TouchableOpacity>
                    </View>
                    <Text className="text-sm text-muted">
                      {formatTimestamp(log.timestamp)}
                    </Text>
                    <Text className="text-xs text-muted mt-2" numberOfLines={2}>
                      {log.content.slice(0, 100)}...
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              /* ログ詳細 */
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-4">
                  <TouchableOpacity
                    onPress={() => setSelectedLog(null)}
                    className="py-2 px-4 bg-surface rounded-lg border border-border"
                  >
                    <Text className="text-foreground font-bold">← 一覧</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const log = logs.find(l => l.key === selectedLog);
                      if (log) {
                        handleDownloadLog(log.key, log.timestamp);
                      }
                    }}
                    className="py-2 px-4 bg-primary rounded-lg"
                  >
                    <Text className="text-white font-bold">⬇️ ダウンロード</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView className="flex-1 bg-surface rounded-xl p-4 border border-border">
                  <Text className="text-foreground font-mono text-xs" selectable>
                    {selectedLogContent}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* 使い方 */}
        {!selectedLog && logs.length > 0 && (
          <View className="bg-surface rounded-xl p-4 mt-4 border border-border">
            <Text className="text-sm font-bold text-foreground mb-2">💡 使い方</Text>
            <Text className="text-xs text-muted mb-1">• ログをタップして詳細を表示</Text>
            <Text className="text-xs text-muted mb-1">• 「DL」ボタンでテキストファイルをダウンロード</Text>
            <Text className="text-xs text-muted mb-1">• 「💾 保存」で現在のセッションを記録</Text>
            <Text className="text-xs text-muted">• 最新5件まで自動保存されます</Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
