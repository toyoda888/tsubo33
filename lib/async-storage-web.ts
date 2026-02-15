// Web用のローカルストレージラッパー
// AsyncStorageの代わりにlocalStorageを使用

export const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.error('AsyncStorage getItem error:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('AsyncStorage setItem error:', error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('AsyncStorage removeItem error:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
      }
    } catch (error) {
      console.error('AsyncStorage clear error:', error);
    }
  },

  async getAllKeys(): Promise<readonly string[]> {
    try {
      if (typeof window !== 'undefined') {
        return Object.keys(window.localStorage);
      }
      return [];
    } catch (error) {
      console.error('AsyncStorage getAllKeys error:', error);
      return [];
    }
  },

  async multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]> {
    try {
      if (typeof window !== 'undefined') {
        return keys.map(key => [key, window.localStorage.getItem(key)]);
      }
      return keys.map(key => [key, null]);
    } catch (error) {
      console.error('AsyncStorage multiGet error:', error);
      return keys.map(key => [key, null]);
    }
  },

  async multiSet(keyValuePairs: readonly [string, string][]): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        keyValuePairs.forEach(([key, value]) => {
          window.localStorage.setItem(key, value);
        });
      }
    } catch (error) {
      console.error('AsyncStorage multiSet error:', error);
    }
  },

  async multiRemove(keys: readonly string[]): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        keys.forEach(key => {
          window.localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.error('AsyncStorage multiRemove error:', error);
    }
  },
};

export default AsyncStorage;
