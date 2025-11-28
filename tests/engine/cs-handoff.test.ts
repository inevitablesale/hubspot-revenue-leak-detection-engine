/**
 * Tests for CS Handoff Detector
 */

import { CSHandoffDetector, HandoffData } from '../../src/engine/cs-handoff';
import { Deal, Contact } from '../../src/types';

describe('CSHandoffDetector', () => {
  let detector: CSHandoffDetector;

  beforeEach(() => {
    detector = new CSHandoffDetector({
      maxHandoffDays: 7,
      requiredHandoffStages: ['closedwon', 'onboarding', 'implementation'],
      csOwnerProperty: 'cs_owner',
      minimumDealValue: 2500,
    });
  });

  describe('analyzeDeals', () => {
    it('should detect won deals without CS owner assigned', () => {
      const today = new Date();
      const closedDate = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago

      const handoffData: HandoffData[] = [
        {
          deal: {
            id: 'deal-1',
            properties: {
              dealname: 'Orphan Deal',
              amount: '15000',
              dealstage: 'closedwon',
              closedate: closedDate.toISOString(),
            },
          },
          salesOwner: 'sales-rep-1',
          csOwner: undefined, // No CS owner assigned
          closedDate,
        },
      ];

      const leaks = detector.analyzeDeals(handoffData);

      expect(leaks.length).toBe(1);
      expect(leaks[0].type).toBe('stalled_cs_handoff');
      expect(leaks[0].description).toContain('no CS owner assigned');
    });

    it('should detect delayed onboarding after handoff', () => {
      const today = new Date();
      const closedDate = new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000); // 21 days ago
      const handoffDate = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago

      const handoffData: HandoffData[] = [
        {
          deal: {
            id: 'deal-1',
            properties: {
              dealname: 'Stalled Onboarding',
              amount: '20000',
              dealstage: 'closedwon',
              closedate: closedDate.toISOString(),
            },
          },
          salesOwner: 'sales-rep-1',
          csOwner: 'cs-rep-1',
          closedDate,
          handoffDate,
          onboardingStartDate: undefined, // Onboarding never started
        },
      ];

      const leaks = detector.analyzeDeals(handoffData);

      expect(leaks.length).toBe(1);
      expect(leaks[0].type).toBe('stalled_cs_handoff');
      expect(leaks[0].description).toContain("onboarding hasn't started");
    });

    it('should not flag deals with timely CS assignment', () => {
      const today = new Date();
      const closedDate = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

      const handoffData: HandoffData[] = [
        {
          deal: {
            id: 'deal-1',
            properties: {
              dealname: 'Healthy Deal',
              amount: '15000',
              dealstage: 'closedwon',
              closedate: closedDate.toISOString(),
            },
          },
          salesOwner: 'sales-rep-1',
          csOwner: 'cs-rep-1', // CS owner assigned
          closedDate,
        },
      ];

      const leaks = detector.analyzeDeals(handoffData);

      expect(leaks.length).toBe(0);
    });

    it('should skip deals below minimum value', () => {
      const today = new Date();
      const closedDate = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

      const handoffData: HandoffData[] = [
        {
          deal: {
            id: 'deal-1',
            properties: {
              dealname: 'Small Deal',
              amount: '1000', // Below minimum
              dealstage: 'closedwon',
              closedate: closedDate.toISOString(),
            },
          },
          salesOwner: 'sales-rep-1',
          closedDate,
        },
      ];

      const leaks = detector.analyzeDeals(handoffData);

      expect(leaks.length).toBe(0);
    });
  });

  describe('analyzeContacts', () => {
    it('should detect new customers with potential dropped handoffs', () => {
      const today = new Date();
      const closedDate = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

      const contacts: Contact[] = [
        {
          id: 'contact-1',
          properties: {
            firstname: 'John',
            lastname: 'Doe',
            email: 'john@example.com',
            lifecyclestage: 'customer',
          },
        },
      ];

      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'John Deal',
            amount: '10000',
            dealstage: 'closedwon',
            closedate: closedDate.toISOString(),
          },
        },
      ];

      const dealAssociations = new Map<string, Deal[]>([
        ['contact-1', deals],
      ]);

      const leaks = detector.analyzeContacts(contacts, dealAssociations);

      expect(leaks.length).toBe(1);
      expect(leaks[0].type).toBe('stalled_cs_handoff');
      expect(leaks[0].description).toContain('dropped during handoff');
    });
  });
});
