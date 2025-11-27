/**
 * Tests for CRM Card Builder
 */

import { CRMCardBuilder, buildDealCard, buildContactCard, buildCompanyCard } from '../../src/crm/card-builder';
import { RevenueLeak } from '../../src/types';

describe('CRMCardBuilder', () => {
  let builder: CRMCardBuilder;

  beforeEach(() => {
    builder = new CRMCardBuilder();
  });

  describe('buildCard', () => {
    it('should build a card with summary and leak sections', () => {
      const leaks: RevenueLeak[] = [
        {
          id: 'leak-1',
          type: 'underbilling',
          severity: 'high',
          description: 'Deal is significantly below average',
          potentialRevenue: 5000,
          affectedEntity: {
            type: 'deal',
            id: 'deal-1',
            name: 'Test Deal',
          },
          detectedAt: new Date(),
          suggestedActions: [
            {
              id: 'action-1',
              type: 'manual_review',
              title: 'Review Pricing',
              description: 'Review deal pricing',
              priority: 'high',
            },
          ],
        },
      ];

      const card = builder.buildCard(leaks, 'deal-1', 'deal');

      expect(card.results.length).toBeGreaterThan(0);
      expect(card.primaryAction).toBeDefined();
      expect(card.secondaryActions).toBeDefined();

      // Check summary section
      const summarySection = card.results.find(s => s.id === 'summary');
      expect(summarySection).toBeDefined();
      expect(summarySection?.title).toBe('Revenue Leak Summary');
    });

    it('should sort leaks by severity and potential revenue', () => {
      const leaks: RevenueLeak[] = [
        {
          id: 'leak-1',
          type: 'underbilling',
          severity: 'low',
          description: 'Low severity leak',
          potentialRevenue: 1000,
          affectedEntity: { type: 'deal', id: 'deal-1' },
          detectedAt: new Date(),
          suggestedActions: [],
        },
        {
          id: 'leak-2',
          type: 'billing_gap',
          severity: 'critical',
          description: 'Critical leak',
          potentialRevenue: 50000,
          affectedEntity: { type: 'deal', id: 'deal-1' },
          detectedAt: new Date(),
          suggestedActions: [],
        },
        {
          id: 'leak-3',
          type: 'missed_renewal',
          severity: 'high',
          description: 'High severity leak',
          potentialRevenue: 10000,
          affectedEntity: { type: 'deal', id: 'deal-1' },
          detectedAt: new Date(),
          suggestedActions: [],
        },
      ];

      const card = builder.buildCard(leaks, 'deal-1', 'deal');

      // Skip summary section, check leak order
      const leakSections = card.results.filter(s => s.id !== 'summary');
      
      // Critical should come first
      expect(leakSections[0].id).toBe('leak-2');
    });

    it('should limit sections to max configured', () => {
      const leaks: RevenueLeak[] = Array.from({ length: 10 }, (_, i) => ({
        id: `leak-${i}`,
        type: 'underbilling' as const,
        severity: 'medium' as const,
        description: `Leak ${i}`,
        potentialRevenue: 1000 * (i + 1),
        affectedEntity: { type: 'deal' as const, id: 'deal-1' },
        detectedAt: new Date(),
        suggestedActions: [],
      }));

      const customBuilder = new CRMCardBuilder({ maxSections: 3 });
      const card = customBuilder.buildCard(leaks, 'deal-1', 'deal');

      // Should have summary + 3 leak sections max
      expect(card.results.length).toBeLessThanOrEqual(4);
    });
  });

  describe('buildEmptyCard', () => {
    it('should return healthy status card', () => {
      const card = builder.buildEmptyCard();

      expect(card.results.length).toBe(1);
      expect(card.results[0].title).toBe('Revenue Health');
      
      const statusItem = card.results[0].items.find(i => i.label === 'Status');
      expect(statusItem?.value).toBe('Healthy');
    });
  });
});

describe('Card Builder Helpers', () => {
  describe('buildDealCard', () => {
    it('should filter leaks for specific deal', () => {
      const leaks: RevenueLeak[] = [
        {
          id: 'leak-1',
          type: 'underbilling',
          severity: 'high',
          description: 'Deal 1 leak',
          potentialRevenue: 5000,
          affectedEntity: { type: 'deal', id: 'deal-1' },
          detectedAt: new Date(),
          suggestedActions: [],
        },
        {
          id: 'leak-2',
          type: 'underbilling',
          severity: 'high',
          description: 'Deal 2 leak',
          potentialRevenue: 5000,
          affectedEntity: { type: 'deal', id: 'deal-2' },
          detectedAt: new Date(),
          suggestedActions: [],
        },
      ];

      const card = buildDealCard(leaks, 'deal-1');

      // Should only show leak-1
      const leakSections = card.results.filter(s => s.id !== 'summary');
      expect(leakSections.length).toBe(1);
      expect(leakSections[0].id).toBe('leak-1');
    });

    it('should return empty card when no leaks for deal', () => {
      const leaks: RevenueLeak[] = [
        {
          id: 'leak-1',
          type: 'underbilling',
          severity: 'high',
          description: 'Different deal leak',
          potentialRevenue: 5000,
          affectedEntity: { type: 'deal', id: 'deal-other' },
          detectedAt: new Date(),
          suggestedActions: [],
        },
      ];

      const card = buildDealCard(leaks, 'deal-1');

      expect(card.results[0].title).toBe('Revenue Health');
    });
  });

  describe('buildContactCard', () => {
    it('should filter leaks for specific contact', () => {
      const leaks: RevenueLeak[] = [
        {
          id: 'leak-1',
          type: 'stalled_cs_handoff',
          severity: 'high',
          description: 'Contact leak',
          potentialRevenue: 3000,
          affectedEntity: { type: 'contact', id: 'contact-1' },
          detectedAt: new Date(),
          suggestedActions: [],
        },
      ];

      const card = buildContactCard(leaks, 'contact-1');

      const leakSections = card.results.filter(s => s.id !== 'summary');
      expect(leakSections.length).toBe(1);
    });
  });

  describe('buildCompanyCard', () => {
    it('should filter leaks for specific company', () => {
      const leaks: RevenueLeak[] = [
        {
          id: 'leak-1',
          type: 'untriggered_crosssell',
          severity: 'medium',
          description: 'Company cross-sell opportunity',
          potentialRevenue: 10000,
          affectedEntity: { type: 'company', id: 'company-1' },
          detectedAt: new Date(),
          suggestedActions: [],
        },
      ];

      const card = buildCompanyCard(leaks, 'company-1');

      const leakSections = card.results.filter(s => s.id !== 'summary');
      expect(leakSections.length).toBe(1);
    });
  });
});
