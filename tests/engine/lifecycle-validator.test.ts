/**
 * Tests for Lifecycle Path Validator
 */

import { LifecyclePathValidator, LifecycleHistory } from '../../src/engine/lifecycle-validator';
import { Contact, Deal } from '../../src/types';

describe('LifecyclePathValidator', () => {
  let validator: LifecyclePathValidator;

  beforeEach(() => {
    validator = new LifecyclePathValidator();
  });

  describe('validateContacts', () => {
    it('should detect skipped lifecycle stages', () => {
      const histories: LifecycleHistory[] = [
        {
          contact: {
            id: 'contact-1',
            properties: {
              firstname: 'John',
              lastname: 'Doe',
              email: 'john@example.com',
              lifecyclestage: 'customer',
            },
          },
          stageHistory: [
            { stage: 'subscriber', timestamp: new Date('2024-01-01') },
            { stage: 'customer', timestamp: new Date('2024-01-15') }, // Skipped lead, mql, sql, opportunity
          ],
        },
      ];

      const leaks = validator.validateContacts(histories);

      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0].type).toBe('invalid_lifecycle_path');
      expect(leaks[0].description).toContain('skipped lifecycle stages');
    });

    it('should detect missing required stages for won deals', () => {
      const histories: LifecycleHistory[] = [
        {
          contact: {
            id: 'contact-1',
            properties: {
              firstname: 'Jane',
              lastname: 'Smith',
              email: 'jane@example.com',
              lifecyclestage: 'customer',
            },
          },
          stageHistory: [
            { stage: 'subscriber', timestamp: new Date('2024-01-01') },
            { stage: 'customer', timestamp: new Date('2024-01-10') },
          ],
          associatedDeals: [
            {
              id: 'deal-1',
              properties: {
                dealname: 'Jane Deal',
                amount: '10000',
                dealstage: 'closedwon',
              },
            },
          ],
        },
      ];

      const leaks = validator.validateContacts(histories);

      const missingStagesLeak = leaks.find(l => 
        l.description.includes('never passed through')
      );

      expect(missingStagesLeak).toBeDefined();
      expect(missingStagesLeak?.severity).toBe('high');
    });

    it('should not flag contacts with proper lifecycle progression', () => {
      const histories: LifecycleHistory[] = [
        {
          contact: {
            id: 'contact-1',
            properties: {
              firstname: 'Good',
              lastname: 'Contact',
              email: 'good@example.com',
              lifecyclestage: 'customer',
            },
          },
          stageHistory: [
            { stage: 'subscriber', timestamp: new Date('2024-01-01') },
            { stage: 'lead', timestamp: new Date('2024-01-05') },
            { stage: 'marketingqualifiedlead', timestamp: new Date('2024-01-10') },
            { stage: 'salesqualifiedlead', timestamp: new Date('2024-01-15') },
            { stage: 'opportunity', timestamp: new Date('2024-01-20') },
            { stage: 'customer', timestamp: new Date('2024-01-25') },
          ],
        },
      ];

      const leaks = validator.validateContacts(histories);

      expect(leaks.length).toBe(0);
    });
  });

  describe('validateDeals', () => {
    it('should detect backward stage transitions', () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Regression Deal',
            amount: '15000',
            dealstage: 'closedwon',
          },
        },
      ];

      const stageHistories = new Map<string, Array<{ stage: string; timestamp: Date }>>([
        [
          'deal-1',
          [
            { stage: 'appointmentscheduled', timestamp: new Date('2024-01-01') },
            { stage: 'qualifiedtobuy', timestamp: new Date('2024-01-05') },
            { stage: 'appointmentscheduled', timestamp: new Date('2024-01-10') }, // Went backward
            { stage: 'closedwon', timestamp: new Date('2024-01-15') },
          ],
        ],
      ]);

      // Need to configure stage order for deals
      const dealValidator = new LifecyclePathValidator({
        stageOrder: ['appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled', 'decisionmakerboughtin', 'closedwon'],
        validTransitions: new Map(),
        requiredStagesForDealWon: [],
      });

      const leaks = dealValidator.validateDeals(deals, stageHistories);

      expect(leaks.length).toBe(1);
      expect(leaks[0].type).toBe('invalid_lifecycle_path');
      expect(leaks[0].description).toContain('moved backward');
    });
  });
});
