/**
 * Tests for Underbilling Detector
 */

import { UnderbillingDetector } from '../../src/engine/underbilling';
import { Deal, Contract, Invoice } from '../../src/types';

describe('UnderbillingDetector', () => {
  let detector: UnderbillingDetector;

  beforeEach(() => {
    detector = new UnderbillingDetector({
      expectedMarginThreshold: 0.20,
      minimumDealValue: 1000,
      discountThreshold: 0.15,
    });
  });

  describe('analyzeDeals', () => {
    it('should detect deals significantly below average pipeline value', () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Test Deal',
            amount: '5000',
            pipeline: 'default',
            dealstage: 'closedwon',
          },
        },
      ];

      const averageValues = new Map<string, number>([
        ['default', 10000], // Average is $10k, deal is $5k (50% below)
      ]);

      const leaks = detector.analyzeDeals(deals, averageValues);

      expect(leaks.length).toBe(1);
      expect(leaks[0].type).toBe('underbilling');
      expect(leaks[0].potentialRevenue).toBe(5000);
      expect(leaks[0].affectedEntity.id).toBe('deal-1');
    });

    it('should not flag deals within acceptable range', () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Test Deal',
            amount: '9000',
            pipeline: 'default',
            dealstage: 'closedwon',
          },
        },
      ];

      const averageValues = new Map<string, number>([
        ['default', 10000], // Deal is 10% below average, within threshold
      ]);

      const leaks = detector.analyzeDeals(deals, averageValues);

      expect(leaks.length).toBe(0);
    });

    it('should skip deals below minimum value', () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Small Deal',
            amount: '500', // Below minimum of $1000
            pipeline: 'default',
            dealstage: 'closedwon',
          },
        },
      ];

      const averageValues = new Map<string, number>([
        ['default', 5000],
      ]);

      const leaks = detector.analyzeDeals(deals, averageValues);

      expect(leaks.length).toBe(0);
    });

    it('should calculate correct severity based on underbilling ratio', () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Critical Deal',
            amount: '2000',
            pipeline: 'critical',
            dealstage: 'closedwon',
          },
        },
        {
          id: 'deal-2',
          properties: {
            dealname: 'Medium Deal',
            amount: '7000',
            pipeline: 'medium',
            dealstage: 'closedwon',
          },
        },
      ];

      const averageValues = new Map<string, number>([
        ['critical', 10000], // 80% underbilling - critical
        ['medium', 10000], // 30% underbilling - medium
      ]);

      const leaks = detector.analyzeDeals(deals, averageValues);

      const criticalLeak = leaks.find(l => l.affectedEntity.id === 'deal-1');
      const mediumLeak = leaks.find(l => l.affectedEntity.id === 'deal-2');

      expect(criticalLeak?.severity).toBe('critical');
      expect(mediumLeak?.severity).toBe('medium');
    });
  });

  describe('analyzeContracts', () => {
    it('should detect unbilled contract value', () => {
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          properties: {
            contract_name: 'Test Contract',
            contract_value: '50000',
          },
        },
      ];

      // No invoices for this contract
      const invoices: Invoice[] = [];

      const leaks = detector.analyzeContracts(contracts, invoices);

      expect(leaks.length).toBe(1);
      expect(leaks[0].type).toBe('underbilling');
      expect(leaks[0].potentialRevenue).toBe(50000);
    });
  });
});
