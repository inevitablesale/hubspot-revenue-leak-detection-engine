/**
 * Tests for Cross-Sell Detector
 */

import { CrossSellDetector, CustomerProfile } from '../../src/engine/crosssell';
import { Deal, Contact, Company } from '../../src/types';

describe('CrossSellDetector', () => {
  let detector: CrossSellDetector;

  beforeEach(() => {
    detector = new CrossSellDetector({
      minimumCustomerValue: 5000,
      daysSinceLastPurchase: 90,
    });
  });

  describe('analyzeCustomers', () => {
    it('should detect cross-sell opportunities for eligible customers', () => {
      const profiles: CustomerProfile[] = [
        {
          contact: {
            id: 'contact-1',
            properties: {
              firstname: 'John',
              lastname: 'Doe',
              email: 'john@example.com',
            },
          },
          company: {
            id: 'company-1',
            properties: {
              name: 'Acme Corp',
            },
          },
          deals: [],
          totalValue: 15000,
          products: ['basic'], // Eligible for professional, enterprise
          lastPurchaseDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        },
      ];

      const leaks = detector.analyzeCustomers(profiles);

      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0].type).toBe('untriggered_crosssell');
    });

    it('should not flag customers below minimum value', () => {
      const profiles: CustomerProfile[] = [
        {
          contact: {
            id: 'contact-1',
            properties: {
              email: 'small@example.com',
            },
          },
          deals: [],
          totalValue: 2000, // Below minimum
          products: ['basic'],
        },
      ];

      const leaks = detector.analyzeCustomers(profiles);

      expect(leaks.length).toBe(0);
    });

    it('should not flag customers who already have recommended products', () => {
      const profiles: CustomerProfile[] = [
        {
          contact: {
            id: 'contact-1',
            properties: {
              email: 'complete@example.com',
            },
          },
          deals: [],
          totalValue: 50000,
          products: ['basic', 'professional', 'enterprise', 'add-ons'], // Already has all
        },
      ];

      const leaks = detector.analyzeCustomers(profiles);

      expect(leaks.length).toBe(0);
    });
  });

  describe('analyzeDeals', () => {
    it('should detect expansion opportunities for high-value inactive customers', () => {
      const today = new Date();
      // Last deal closed 120 days ago
      const closeDate = new Date(today.getTime() - 120 * 24 * 60 * 60 * 1000);

      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Big Deal',
            amount: '25000',
            dealstage: 'closedwon',
            closedate: closeDate.toISOString(),
          },
          associations: {
            companies: { results: [{ id: 'company-1' }] },
          },
        },
      ];

      const leaks = detector.analyzeDeals(deals);

      expect(leaks.length).toBe(1);
      expect(leaks[0].type).toBe('untriggered_crosssell');
    });

    it('should not flag customers with recent activity', () => {
      const today = new Date();
      // Last deal closed 30 days ago (within threshold)
      const closeDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Recent Deal',
            amount: '25000',
            dealstage: 'closedwon',
            closedate: closeDate.toISOString(),
          },
          associations: {
            companies: { results: [{ id: 'company-1' }] },
          },
        },
      ];

      const leaks = detector.analyzeDeals(deals);

      expect(leaks.length).toBe(0);
    });

    it('should aggregate deals by company for accurate customer value', () => {
      const today = new Date();
      const oldCloseDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);

      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Deal 1',
            amount: '10000',
            dealstage: 'closedwon',
            closedate: oldCloseDate.toISOString(),
          },
          associations: {
            companies: { results: [{ id: 'company-1' }] },
          },
        },
        {
          id: 'deal-2',
          properties: {
            dealname: 'Deal 2',
            amount: '15000',
            dealstage: 'closedwon',
            closedate: oldCloseDate.toISOString(),
          },
          associations: {
            companies: { results: [{ id: 'company-1' }] }, // Same company
          },
        },
      ];

      const leaks = detector.analyzeDeals(deals);

      // Should create one leak for the company with total value of $25k
      expect(leaks.length).toBe(1);
      expect(leaks[0].metadata?.totalValue).toBe(25000);
    });
  });
});
