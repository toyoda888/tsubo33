import AsyncStorage from './async-storage-web';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

const MAX_LOGS = 5;
const LOG_KEY_PREFIX = 'app_log_';
const LOG_INDEX_KEY = 'app_log_index';

class Logger {
  private currentSessionLogs: LogEntry[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    this.log('info', 'System', 'Logger initialized', { sessionId: this.sessionId });
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  log(level: LogLevel, category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      category,
      message,
      data,
    };

    this.currentSessionLogs.push(entry);

    // コンソールにも出力
    const consoleMessage = `[${entry.timestamp}] [${level.toUpperCase()}] [${category}] ${message}`;
    switch (level) {
      case 'error':
        console.error(consoleMessage, data || '');
        break;
      case 'warn':
        console.warn(consoleMessage, data || '');
        break;
      case 'debug':
        console.debug(consoleMessage, data || '');
        break;
      default:
        console.log(consoleMessage, data || '');
    }
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data);
  }

  debug(category: string, message: string, data?: any) {
    this.log('debug', category, message, data);
  }

  async saveSession() {
    try {
      // 現在のログインデックスを取得
      const indexStr = await AsyncStorage.getItem(LOG_INDEX_KEY);
      const logIndex: string[] = indexStr ? JSON.parse(indexStr) : [];

      // 新しいログキー
      const newLogKey = `${LOG_KEY_PREFIX}${this.sessionId}`;

      // ログを保存
      const logContent = this.formatLogsAsText();
      await AsyncStorage.setItem(newLogKey, logContent);

      // インデックスに追加
      logIndex.push(newLogKey);

      // 古いログを削除（最新5個のみ保持）
      if (logIndex.length > MAX_LOGS) {
        const toDelete = logIndex.slice(0, logIndex.length - MAX_LOGS);
        for (const key of toDelete) {
          await AsyncStorage.removeItem(key);
        }
        // インデックスを更新
        const newIndex = logIndex.slice(-MAX_LOGS);
        await AsyncStorage.setItem(LOG_INDEX_KEY, JSON.stringify(newIndex));
      } else {
        await AsyncStorage.setItem(LOG_INDEX_KEY, JSON.stringify(logIndex));
      }

      console.log(`[Logger] Session logs saved: ${newLogKey}`);
    } catch (error) {
      console.error('[Logger] Failed to save session logs:', error);
    }
  }

  private formatLogsAsText(): string {
    let text = `=== アプリログ ===\n`;
    text += `セッションID: ${this.sessionId}\n`;
    text += `ログ件数: ${this.currentSessionLogs.length}\n`;
    text += `\n`;

    for (const entry of this.currentSessionLogs) {
      text += `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]\n`;
      text += `  ${entry.message}\n`;
      if (entry.data) {
        text += `  データ: ${JSON.stringify(entry.data, null, 2)}\n`;
      }
      text += `\n`;
    }

    return text;
  }

  async getAllLogs(): Promise<{ key: string; content: string; timestamp: string }[]> {
    try {
      const indexStr = await AsyncStorage.getItem(LOG_INDEX_KEY);
      const logIndex: string[] = indexStr ? JSON.parse(indexStr) : [];

      const logs = [];
      for (const key of logIndex) {
        const content = await AsyncStorage.getItem(key);
        if (content) {
          // キーからタイムスタンプを抽出
          const timestamp = key.replace(LOG_KEY_PREFIX, '');
          logs.push({ key, content, timestamp });
        }
      }

      // 新しい順にソート
      logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return logs;
    } catch (error) {
      console.error('[Logger] Failed to get all logs:', error);
      return [];
    }
  }

  async downloadLog(logKey: string, filename?: string) {
    try {
      const content = await AsyncStorage.getItem(logKey);
      if (!content) {
        console.error('[Logger] Log not found:', logKey);
        return;
      }

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${logKey}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('[Logger] Log downloaded:', filename || logKey);
    } catch (error) {
      console.error('[Logger] Failed to download log:', error);
    }
  }

  async clearAllLogs() {
    try {
      const indexStr = await AsyncStorage.getItem(LOG_INDEX_KEY);
      const logIndex: string[] = indexStr ? JSON.parse(indexStr) : [];

      for (const key of logIndex) {
        await AsyncStorage.removeItem(key);
      }

      await AsyncStorage.removeItem(LOG_INDEX_KEY);
      console.log('[Logger] All logs cleared');
    } catch (error) {
      console.error('[Logger] Failed to clear logs:', error);
    }
  }

  getCurrentSessionLogs(): LogEntry[] {
    return [...this.currentSessionLogs];
  }
}

// グローバルロガーインスタンス
const logger = new Logger();

// ページ離脱時にログを保存
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logger.saveSession();
  });

  // 定期的に保存（5分ごと）
  setInterval(() => {
    logger.saveSession();
  }, 5 * 60 * 1000);
}

export default logger;
