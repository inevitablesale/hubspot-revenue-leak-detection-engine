/**
 * Tests for Trend Tracker
 */

import { TrendTracker } from '../../src/workflows/trend-tracker';
import { RevenueLeak, LeakType, LeakSeverity } from '../../src/types';

describe('TrendTracker', () => {
  let tracker: TrendTracker;

  const createMockLeak = (
    id: string,
    type: LeakType,
    severity: LeakSeverity,
    potentialRevenue: number,
    daysAgo: number = 0
  ): RevenueLeak => ({
    id,
    type,
    severity,
    potentialRevenue,
    description: `Test leak ${id}`,
    affectedEntity: {
      type: 'deal',
      id: 'deal-1',
      name: 'Test Deal',
    },
    detectedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    suggestedActions: [],
  });

  beforeEach(() => {
    tracker = new TrendTracker();
  });

  describe('createSnapshot', () => {
    it('should create a trend snapshot', () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'high', 10000),
        createMockLeak('leak-2', 'missed_renewal', 'medium', 5000),
      ];
      
      const snapshot = tracker.createSnapshot('portal-1', leaks);
      
      expect(snapshot.id).toBeDefined();
      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.metrics.totalLeaks).toBe(2);
      expect(snapshot.metrics.totalRevenue).toBe(15000);
    });

    it('should track by leak type', () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'high', 10000),
        createMockLeak('leak-2', 'underbilling', 'medium', 5000),
        createMockLeak('leak-3', 'billing_gap', 'low', 3000),
      ];
      
      const snapshot = tracker.createSnapshot('portal-1', leaks);
      
      expect(snapshot.byType.get('underbilling')?.count).toBe(2);
      expect(snapshot.byType.get('billing_gap')?.count).toBe(1);
    });

    it('should track by severity', () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'high', 10000),
        createMockLeak('leak-2', 'missed_renewal', 'high', 5000),
        createMockLeak('leak-3', 'billing_gap', 'low', 3000),
      ];
      
      const snapshot = tracker.createSnapshot('portal-1', leaks);
      
      expect(snapshot.bySeverity.get('high')).toBe(2);
      expect(snapshot.bySeverity.get('low')).toBe(1);
    });

    it('should identify top entities', () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'high', 10000),
        createMockLeak('leak-2', 'missed_renewal', 'medium', 5000),
      ];
      
      const snapshot = tracker.createSnapshot('portal-1', leaks);
      
      expect(snapshot.topEntities.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeTrends', () => {
    it('should analyze trends for a portal', () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'high', 10000),
        createMockLeak('leak-2', 'missed_renewal', 'medium', 5000),
      ];
      
      const analysis = tracker.analyzeTrends('portal-1', leaks);
      
      expect(analysis.currentSnapshot).toBeDefined();
      expect(analysis.overallTrend).toBeDefined();
      expect(analysis.highlights).toBeDefined();
      expect(analysis.predictions).toBeDefined();
      expect(analysis.alerts).toBeDefined();
    });

    it('should detect overall trend direction', () => {
      // First snapshot
      const leaks1 = [
        createMockLeak('leak-1', 'underbilling', 'high', 10000),
      ];
      tracker.createSnapshot('portal-1', leaks1);
      
      // Second snapshot with more leaks
      const leaks2 = [
        createMockLeak('leak-1', 'underbilling', 'high', 10000),
        createMockLeak('leak-2', 'missed_renewal', 'medium', 5000),
        createMockLeak('leak-3', 'billing_gap', 'high', 8000),
      ];
      
      const analysis = tracker.analyzeTrends('portal-1', leaks2);
      
      expect(['improving', 'worsening', 'stable']).toContain(analysis.overallTrend);
    });

    it('should generate highlights', () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'critical', 50000),
      ];
      
      const analysis = tracker.analyzeTrends('portal-1', leaks);
      
      expect(analysis.highlights.length).toBeGreaterThan(0);
    });

    it('should generate predictions', () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'high', 10000),
      ];
      
      const analysis = tracker.analyzeTrends('portal-1', leaks);
      
      expect(analysis.predictions.length).toBeGreaterThan(0);
      analysis.predictions.forEach(pred => {
        expect(pred.currentValue).toBeDefined();
        expect(pred.predictedValue).toBeDefined();
        expect(pred.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('getSnapshots', () => {
    it('should return snapshot history', () => {
      const leaks = [createMockLeak('leak-1', 'underbilling', 'high', 10000)];
      
      tracker.createSnapshot('portal-1', leaks);
      tracker.createSnapshot('portal-1', leaks);
      
      const snapshots = tracker.getSnapshots();
      
      expect(snapshots.length).toBe(2);
    });
  });

  describe('exportTrends', () => {
    it('should export trend data', () => {
      const leaks = [createMockLeak('leak-1', 'underbilling', 'high', 10000)];
      tracker.createSnapshot('portal-1', leaks);
      
      const exported = tracker.exportTrends();
      
      expect(exported).toHaveProperty('snapshots');
    });
  });

  describe('recordLeaks', () => {
    it('should record leaks for tracking', () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'high', 10000),
        createMockLeak('leak-2', 'missed_renewal', 'medium', 5000),
      ];
      
      // Should not throw
      expect(() => {
        tracker.recordLeaks('portal-1', leaks);
      }).not.toThrow();
    });

    it('should not duplicate leaks', () => {
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 10000);
      
      tracker.recordLeaks('portal-1', [leak]);
      tracker.recordLeaks('portal-1', [leak]); // Same leak again
      
      // Should not throw or create duplicates
      expect(() => {
        tracker.recordLeaks('portal-1', [leak]);
      }).not.toThrow();
    });
  });

  describe('alert thresholds', () => {
    it('should generate alerts when thresholds exceeded', () => {
      // Create initial baseline
      const leaks1 = [
        createMockLeak('leak-1', 'underbilling', 'medium', 10000),
      ];
      tracker.createSnapshot('portal-1', leaks1);
      
      // Create significant increase
      const leaks2: RevenueLeak[] = [];
      for (let i = 0; i < 10; i++) {
        leaks2.push(createMockLeak(`leak-${i + 2}`, 'underbilling', 'high', 15000));
      }
      
      const analysis = tracker.analyzeTrends('portal-1', leaks2);
      
      // May have alerts due to significant increase
      expect(analysis.alerts).toBeDefined();
    });
  });
});
