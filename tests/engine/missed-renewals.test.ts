/**
 * Tests for Missed Renewals Detector
 */

import { MissedRenewalsDetector } from '../../src/engine/missed-renewals';
import { Contract, Deal } from '../../src/types';

describe('MissedRenewalsDetector', () => {
  let detector: MissedRenewalsDetector;

  beforeEach(() => {
    detector = new MissedRenewalsDetector({
      renewalWindowDays: 90,
      inactivityThresholdDays: 30,
      minimumContractValue: 5000,
    });
  });

  describe('analyzeContracts', () => {
    it('should detect contracts approaching renewal without engagement', () => {
      const today = new Date();
      const renewalDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const contracts: Contract[] = [
        {
          id: 'contract-1',
          properties: {
            contract_name: 'Test Contract',
            contract_value: '25000',
            renewal_date: renewalDate.toISOString(),
          },
        },
      ];

      // Last activity was 45 days ago (exceeds threshold)
      const lastActivity = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000);
      const lastActivityDates = new Map<string, Date>([
        ['contract-1', lastActivity],
      ]);

      const leaks = detector.analyzeContracts(contracts, lastActivityDates);

      expect(leaks.length).toBe(1);
      expect(leaks[0].type).toBe('missed_renewal');
      expect(leaks[0].potentialRevenue).toBe(25000);
      expect(leaks[0].severity).toBe('high'); // 30 days out + high value
    });

    it('should flag already missed renewals as critical', () => {
      const today = new Date();
      const renewalDate = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago

      const contracts: Contract[] = [
        {
          id: 'contract-1',
          properties: {
            contract_name: 'Overdue Contract',
            contract_value: '10000',
            contract_status: 'active', // Not renewed
            renewal_date: renewalDate.toISOString(),
          },
        },
      ];

      const lastActivityDates = new Map<string, Date>();

      const leaks = detector.analyzeContracts(contracts, lastActivityDates);

      expect(leaks.length).toBe(1);
      expect(leaks[0].severity).toBe('critical');
      expect(leaks[0].metadata?.daysOverdue).toBe(14);
    });

    it('should not flag contracts with recent activity', () => {
      const today = new Date();
      const renewalDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days from now

      const contracts: Contract[] = [
        {
          id: 'contract-1',
          properties: {
            contract_name: 'Active Contract',
            contract_value: '20000',
            renewal_date: renewalDate.toISOString(),
          },
        },
      ];

      // Last activity was 5 days ago (within threshold)
      const lastActivity = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
      const lastActivityDates = new Map<string, Date>([
        ['contract-1', lastActivity],
      ]);

      const leaks = detector.analyzeContracts(contracts, lastActivityDates);

      expect(leaks.length).toBe(0);
    });

    it('should skip contracts below minimum value', () => {
      const today = new Date();
      const renewalDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const contracts: Contract[] = [
        {
          id: 'contract-1',
          properties: {
            contract_name: 'Small Contract',
            contract_value: '2000', // Below minimum
            renewal_date: renewalDate.toISOString(),
          },
        },
      ];

      const lastActivityDates = new Map<string, Date>();

      const leaks = detector.analyzeContracts(contracts, lastActivityDates);

      expect(leaks.length).toBe(0);
    });
  });

  describe('analyzeDeals', () => {
    it('should detect won deals approaching annual anniversary', () => {
      const today = new Date();
      // Deal closed 300 days ago (approaching 1-year mark)
      const closeDate = new Date(today.getTime() - 300 * 24 * 60 * 60 * 1000);

      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Annual Deal',
            amount: '15000',
            dealstage: 'closedwon',
            closedate: closeDate.toISOString(),
          },
        },
      ];

      const leaks = detector.analyzeDeals(deals);

      expect(leaks.length).toBe(1);
      expect(leaks[0].type).toBe('missed_renewal');
    });

    it('should not flag recently closed deals', () => {
      const today = new Date();
      // Deal closed 30 days ago
      const closeDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Recent Deal',
            amount: '15000',
            dealstage: 'closedwon',
            closedate: closeDate.toISOString(),
          },
        },
      ];

      const leaks = detector.analyzeDeals(deals);

      expect(leaks.length).toBe(0);
    });
  });
});
