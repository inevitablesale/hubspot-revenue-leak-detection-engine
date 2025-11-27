/**
 * Tests for Main Revenue Leak Detection Engine
 */

import RevenuLeakDetectionEngine from '../../src/engine';
import { Deal, Contact } from '../../src/types';

describe('RevenuLeakDetectionEngine', () => {
  let engine: RevenuLeakDetectionEngine;

  beforeEach(() => {
    engine = new RevenuLeakDetectionEngine();
  });

  describe('detectLeaks', () => {
    it('should run all detectors and aggregate results', async () => {
      const today = new Date();
      const oldCloseDate = new Date(today.getTime() - 300 * 24 * 60 * 60 * 1000);

      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Underbilled Deal',
            amount: '5000',
            dealstage: 'closedwon',
            closedate: oldCloseDate.toISOString(),
            pipeline: 'default',
          },
        },
      ];

      const averageDealValues = new Map<string, number>([
        ['default', 15000], // Deal is way below average
      ]);

      const result = await engine.detectLeaks({
        deals,
        averageDealValues,
      });

      expect(result.leaks.length).toBeGreaterThan(0);
      expect(result.summary.totalLeaks).toBeGreaterThan(0);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it('should generate correct summary statistics', async () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Deal 1',
            amount: '3000',
            dealstage: 'closedwon',
            pipeline: 'default',
          },
        },
        {
          id: 'deal-2',
          properties: {
            dealname: 'Deal 2',
            amount: '4000',
            dealstage: 'closedwon',
            pipeline: 'default',
          },
        },
      ];

      const averageDealValues = new Map<string, number>([
        ['default', 20000], // Both deals significantly below
      ]);

      const result = await engine.detectLeaks({
        deals,
        averageDealValues,
      });

      expect(result.summary.byType.underbilling).toBeGreaterThanOrEqual(2);
      expect(result.summary.totalPotentialRevenue).toBeGreaterThan(0);
    });

    it('should return empty results for healthy data', async () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Healthy Deal',
            amount: '10000',
            dealstage: 'closedwon',
            pipeline: 'default',
          },
        },
      ];

      const averageDealValues = new Map<string, number>([
        ['default', 10000], // Deal matches average exactly
      ]);

      const result = await engine.detectLeaks({
        deals,
        averageDealValues,
      });

      // No underbilling leaks for this healthy deal
      const underbillingLeaks = result.leaks.filter(l => l.type === 'underbilling');
      expect(underbillingLeaks.length).toBe(0);
    });
  });

  describe('detectByType', () => {
    it('should run specific detector only', async () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Test Deal',
            amount: '5000',
            dealstage: 'closedwon',
            pipeline: 'default',
          },
        },
      ];

      const averageDealValues = new Map<string, number>([
        ['default', 20000],
      ]);

      const leaks = await engine.detectByType('underbilling', {
        deals,
        averageDealValues,
      });

      expect(leaks.every(l => l.type === 'underbilling')).toBe(true);
    });
  });

  describe('filterBySeverity', () => {
    it('should filter leaks by minimum severity', async () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Critical Deal',
            amount: '2000',
            dealstage: 'closedwon',
            pipeline: 'critical',
          },
        },
        {
          id: 'deal-2',
          properties: {
            dealname: 'Minor Deal',
            amount: '15000',
            dealstage: 'closedwon',
            pipeline: 'minor',
          },
        },
      ];

      const averageDealValues = new Map<string, number>([
        ['critical', 20000], // 90% underbilling - critical
        ['minor', 20000], // 25% underbilling - medium
      ]);

      const result = await engine.detectLeaks({
        deals,
        averageDealValues,
      });

      const highSeverityLeaks = engine.filterBySeverity(result.leaks, 'high');
      
      expect(highSeverityLeaks.every(l => 
        l.severity === 'high' || l.severity === 'critical'
      )).toBe(true);
    });
  });

  describe('sortByPotentialRevenue', () => {
    it('should sort leaks by potential revenue descending', async () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Small Gap',
            amount: '8000',
            pipeline: 'default',
          },
        },
        {
          id: 'deal-2',
          properties: {
            dealname: 'Large Gap',
            amount: '2000',
            pipeline: 'default',
          },
        },
      ];

      const averageDealValues = new Map<string, number>([
        ['default', 20000],
      ]);

      const result = await engine.detectLeaks({
        deals,
        averageDealValues,
      });

      const sorted = engine.sortByPotentialRevenue(result.leaks);
      
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].potentialRevenue).toBeGreaterThanOrEqual(sorted[i].potentialRevenue);
      }
    });
  });
});
