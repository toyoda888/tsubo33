import { describe, it, expect } from 'vitest';
import { 
  DEFAULT_TSUBO_DATA, 
  CATEGORIES, 
} from '../data/tsubo-data';

describe('Tsubo Data', () => {
  describe('DEFAULT_TSUBO_DATA', () => {
    it('should have WHO recognized 361 acupoints', () => {
      expect(DEFAULT_TSUBO_DATA.length).toBe(361);
    });

    it('should have valid structure for each tsubo', () => {
      DEFAULT_TSUBO_DATA.forEach((tsubo) => {
        expect(tsubo).toHaveProperty('id');
        expect(tsubo).toHaveProperty('name');
        expect(tsubo).toHaveProperty('reading');
        expect(tsubo).toHaveProperty('location');
        expect(tsubo).toHaveProperty('effect');
        expect(tsubo).toHaveProperty('category');
        
        expect(typeof tsubo.id).toBe('string');
        expect(typeof tsubo.name).toBe('string');
        expect(typeof tsubo.reading).toBe('string');
        expect(typeof tsubo.location).toBe('string');
        expect(typeof tsubo.effect).toBe('string');
        expect(Object.keys(CATEGORIES)).toContain(tsubo.category);
      });
    });

    it('should have unique ids', () => {
      const ids = DEFAULT_TSUBO_DATA.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should cover all categories', () => {
      const categories = new Set(DEFAULT_TSUBO_DATA.map((t) => t.category));
      expect(categories.size).toBe(Object.keys(CATEGORIES).length);
    });
  });

  describe('CATEGORIES', () => {
    it('should have 5 categories', () => {
      expect(Object.keys(CATEGORIES).length).toBe(5);
    });

    it('should have correct category labels', () => {
      expect(CATEGORIES.head).toBe('頭部');
      expect(CATEGORIES.face).toBe('顔面');
      expect(CATEGORIES.upper_limb).toBe('上肢');
      expect(CATEGORIES.trunk).toBe('体幹');
      expect(CATEGORIES.lower_limb).toBe('下肢');
    });
  });
});
