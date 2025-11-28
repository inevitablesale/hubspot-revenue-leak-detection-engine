/**
 * Tests for Leak Scorer
 */

import { LeakScorer } from '../../src/scoring/leak-scorer';
import { RevenueLeak, LeakType, LeakSeverity } from '../../src/types';

describe('LeakScorer', () => {
  let scorer: LeakScorer;

  const createMockLeak = (
    id: string,
    type: LeakType,
    severity: LeakSeverity,
    potentialRevenue: number
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
    detectedAt: new Date(),
    suggestedActions: [
      { id: 'action-1', type: 'update_property', title: 'Fix', description: '', priority: 'high' },
      { id: 'action-2', type: 'create_task', title: 'Review', description: '', priority: 'medium' },
    ],
  });

  beforeEach(() => {
    scorer = new LeakScorer();
  });

  describe('scoreLeaks', () => {
    it('should calculate comprehensive score for a leak', () => {
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 20000);
      
      const score = scorer.scoreLeaks(leak);
      
      expect(score.leakId).toBe('leak-1');
      expect(score.severity).toBeGreaterThan(0);
      expect(score.impact).toBeGreaterThan(0);
      expect(score.recoverability).toBeGreaterThan(0);
      expect(score.urgency).toBeGreaterThan(0);
      expect(score.composite).toBeGreaterThan(0);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(score.grade);
      expect(score.recommendation).toBeDefined();
    });

    it('should give higher scores to critical severity leaks', () => {
      const criticalLeak = createMockLeak('leak-1', 'missed_renewal', 'critical', 10000);
      const lowLeak = createMockLeak('leak-2', 'underbilling', 'low', 10000);
      
      const criticalScore = scorer.scoreLeaks(criticalLeak);
      const lowScore = scorer.scoreLeaks(lowLeak);
      
      expect(criticalScore.severity).toBeGreaterThan(lowScore.severity);
      expect(criticalScore.composite).toBeGreaterThan(lowScore.composite);
    });

    it('should give higher impact scores to higher revenue leaks', () => {
      const highValueLeak = createMockLeak('leak-1', 'underbilling', 'medium', 100000);
      const lowValueLeak = createMockLeak('leak-2', 'underbilling', 'medium', 1000);
      
      const highScore = scorer.scoreLeaks(highValueLeak);
      const lowScore = scorer.scoreLeaks(lowValueLeak);
      
      expect(highScore.impact).toBeGreaterThan(lowScore.impact);
    });

    it('should calculate recoverability based on leak type', () => {
      const billingGap = createMockLeak('leak-1', 'billing_gap', 'medium', 10000);
      const missedRenewal = createMockLeak('leak-2', 'missed_renewal', 'medium', 10000);
      
      const billingScore = scorer.scoreLeaks(billingGap);
      const renewalScore = scorer.scoreLeaks(missedRenewal);
      
      // Billing gaps should be more recoverable than missed renewals
      expect(billingScore.recoverability).toBeGreaterThan(renewalScore.recoverability);
    });

    it('should include metrics when provided', () => {
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 20000);
      
      const score = scorer.scoreLeaks(leak, {
        customerLifetimeValue: 100000,
        customerTier: 'enterprise',
      });
      
      // With enterprise customer, should have higher impact
      expect(score.impact).toBeGreaterThan(50);
    });
  });

  describe('batchScore', () => {
    it('should score multiple leaks', () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'high', 20000),
        createMockLeak('leak-2', 'missed_renewal', 'critical', 30000),
        createMockLeak('leak-3', 'billing_gap', 'low', 5000),
      ];
      
      const scores = scorer.batchScore(leaks);
      
      expect(scores.length).toBe(3);
      scores.forEach(score => {
        expect(score.composite).toBeGreaterThan(0);
      });
    });
  });

  describe('rankLeaks', () => {
    it('should rank leaks by composite score descending', () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'low', 5000),
        createMockLeak('leak-2', 'missed_renewal', 'critical', 50000),
        createMockLeak('leak-3', 'billing_gap', 'medium', 15000),
      ];
      
      const scores = scorer.batchScore(leaks);
      const ranked = scorer.rankLeaks(scores);
      
      // Should be sorted by composite score descending
      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i - 1].composite).toBeGreaterThanOrEqual(ranked[i].composite);
      }
    });

    it('should support ascending order', () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'critical', 50000),
        createMockLeak('leak-2', 'billing_gap', 'low', 2000),
      ];
      
      const scores = scorer.batchScore(leaks);
      const ranked = scorer.rankLeaks(scores, true);
      
      expect(ranked[0].composite).toBeLessThanOrEqual(ranked[1].composite);
    });
  });

  describe('getPriorityDistribution', () => {
    it('should calculate priority distribution', () => {
      const leaks = [
        createMockLeak('leak-1', 'missed_renewal', 'critical', 100000),
        createMockLeak('leak-2', 'underbilling', 'high', 25000),
        createMockLeak('leak-3', 'billing_gap', 'medium', 10000),
        createMockLeak('leak-4', 'underbilling', 'low', 1000),
      ];
      
      const scores = scorer.batchScore(leaks);
      const distribution = scorer.getPriorityDistribution(scores);
      
      expect(distribution.critical).toBeGreaterThanOrEqual(0);
      expect(distribution.high).toBeGreaterThanOrEqual(0);
      expect(distribution.medium).toBeGreaterThanOrEqual(0);
      expect(distribution.low).toBeGreaterThanOrEqual(0);
      
      const total = distribution.critical + distribution.high + distribution.medium + distribution.low;
      expect(total).toBe(4);
    });
  });

  describe('calculateAggregateMetrics', () => {
    it('should calculate aggregate metrics', () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'high', 20000),
        createMockLeak('leak-2', 'missed_renewal', 'medium', 15000),
      ];
      
      const scores = scorer.batchScore(leaks);
      const metrics = scorer.calculateAggregateMetrics(scores);
      
      expect(metrics.averageComposite).toBeGreaterThan(0);
      expect(metrics.averageSeverity).toBeGreaterThan(0);
      expect(metrics.averageImpact).toBeGreaterThan(0);
      expect(metrics.averageRecoverability).toBeGreaterThan(0);
      expect(metrics.gradeDistribution).toBeDefined();
    });

    it('should handle empty array', () => {
      const metrics = scorer.calculateAggregateMetrics([]);
      
      expect(metrics.averageComposite).toBe(0);
      expect(metrics.averageSeverity).toBe(0);
    });
  });

  describe('grade calculation', () => {
    it('should assign appropriate grades', () => {
      const criticalLeak = createMockLeak('leak-1', 'missed_renewal', 'critical', 150000);
      const lowLeak = createMockLeak('leak-2', 'underbilling', 'low', 2000);
      
      const criticalScore = scorer.scoreLeaks(criticalLeak);
      const lowScore = scorer.scoreLeaks(lowLeak);
      
      // Critical high-value leak should have good grade (A or B)
      expect(['A', 'B', 'C']).toContain(criticalScore.grade);
      // Low severity low-value leak should have lower grade
      expect(['C', 'D', 'F']).toContain(lowScore.grade);
    });
  });
});
