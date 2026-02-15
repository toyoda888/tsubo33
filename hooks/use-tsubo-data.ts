import { DEFAULT_TSUBO_DATA, Tsubo } from '@/data/tsubo-data';

export function useTsuboData() {
  return {
    tsuboData: DEFAULT_TSUBO_DATA as Tsubo[],
    isLoading: false,
  };
}
