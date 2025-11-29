/**
 * Tests for Natural Language Query Service
 */

import { NaturalLanguageQueryService, QueryContext, NLQueryRequest } from '../../src/breeze/nl-query-service';
import { RevenueLeak, LeakType, LeakSeverity } from '../../src/types';

describe('NaturalLanguageQueryService', () => {
  let service: NaturalLanguageQueryService;
  let mockLeaks: RevenueLeak[];

  beforeEach(() => {
    service = new NaturalLanguageQueryService();
    mockLeaks = [
      {
        id: 'leak-1',
        type: 'missed_renewal',
        severity: 'high',
        description: 'Missed renewal',
        potentialRevenue: 50000,
        affectedEntity: { type: 'deal', id: 'deal-1', name: 'Big Deal' },
        detectedAt: new Date(),
        suggestedActions: []
      },
      {
        id: 'leak-2',
        type: 'underbilling',
        severity: 'medium',
        description: 'Underbilling detected',
        potentialRevenue: 25000,
        affectedEntity: { type: 'deal', id: 'deal-2', name: 'Medium Deal' },
        detectedAt: new Date(),
        suggestedActions: []
      },
      {
        id: 'leak-3',
        type: 'billing_gap',
        severity: 'critical',
        description: 'Billing gap',
        potentialRevenue: 75000,
        affectedEntity: { type: 'deal', id: 'deal-3', name: 'Critical Deal' },
        detectedAt: new Date(),
        suggestedActions: []
      }
    ];
  });

  describe('processQuery', () => {
    it('should process revenue at risk query', async () => {
      const request: NLQueryRequest = {
        query: 'How much revenue is at risk?'
      };

      const context: QueryContext = {
        leaks: mockLeaks
      };

      const response = await service.processQuery(request, context);
      
      expect(response.query).toBe('How much revenue is at risk?');
      expect(response.answer).toContain('$150,000');
      expect(response.dataPoints.length).toBeGreaterThan(0);
      expect(response.confidence).toBeGreaterThan(0.5);
    });

    it('should process leak count query', async () => {
      const request: NLQueryRequest = {
        query: 'How many leaks do we have?'
      };

      const context: QueryContext = {
        leaks: mockLeaks
      };

      const response = await service.processQuery(request, context);
      
      expect(response.answer).toContain('3');
    });

    it('should process leak by type query', async () => {
      const request: NLQueryRequest = {
        query: 'What types of leaks do we have?'
      };

      const context: QueryContext = {
        leaks: mockLeaks
      };

      const response = await service.processQuery(request, context);
      
      expect(response.answer.toLowerCase()).toContain('billing');
      expect(response.dataPoints.length).toBeGreaterThan(0);
    });

    it('should process top leaks query', async () => {
      const request: NLQueryRequest = {
        query: 'What are the top 3 biggest leaks?'
      };

      const context: QueryContext = {
        leaks: mockLeaks
      };

      const response = await service.processQuery(request, context);
      
      expect(response.answer).toContain('top');
      expect(response.dataPoints.length).toBeGreaterThanOrEqual(3);
    });

    it('should process recovery rate query', async () => {
      const request: NLQueryRequest = {
        query: 'What is our recovery rate?'
      };

      const context: QueryContext = {
        leaks: mockLeaks
      };

      const response = await service.processQuery(request, context);
      
      expect(response.answer.toLowerCase()).toContain('recovery');
      expect(response.dataPoints.some(d => d.label === 'Recovery Rate')).toBe(true);
    });

    it('should process summary query', async () => {
      const request: NLQueryRequest = {
        query: 'Give me an executive summary'
      };

      const context: QueryContext = {
        leaks: mockLeaks
      };

      const response = await service.processQuery(request, context);
      
      expect(response.answer.toLowerCase()).toContain('summary');
      expect(response.dataPoints.length).toBeGreaterThan(0);
    });

    it('should process recommendations query', async () => {
      const request: NLQueryRequest = {
        query: 'What do you recommend?'
      };

      const context: QueryContext = {
        leaks: mockLeaks
      };

      const response = await service.processQuery(request, context);
      
      expect(response.answer.toLowerCase()).toContain('recommend');
    });

    it('should provide follow-up suggestions', async () => {
      const request: NLQueryRequest = {
        query: 'How much revenue is at risk?'
      };

      const context: QueryContext = {
        leaks: mockLeaks
      };

      const response = await service.processQuery(request, context);
      
      expect(response.suggestedFollowUps.length).toBeGreaterThan(0);
    });

    it('should handle unknown queries gracefully', async () => {
      const request: NLQueryRequest = {
        query: 'What is the weather like?'
      };

      const context: QueryContext = {
        leaks: mockLeaks
      };

      const response = await service.processQuery(request, context);
      
      expect(response.answer).toBeDefined();
      expect(response.confidence).toBeLessThan(0.7);
    });
  });

  describe('getQueryHistory', () => {
    it('should return query history', async () => {
      // Make some queries first
      await service.processQuery({ query: 'How many leaks?' }, { leaks: mockLeaks });
      await service.processQuery({ query: 'Total revenue at risk?' }, { leaks: mockLeaks });

      const history = service.getQueryHistory();
      expect(history.length).toBe(2);
    });

    it('should respect limit parameter', async () => {
      // Make several queries
      for (let i = 0; i < 5; i++) {
        await service.processQuery({ query: `Query ${i}` }, { leaks: mockLeaks });
      }

      const history = service.getQueryHistory(3);
      expect(history.length).toBe(3);
    });
  });

  describe('clearHistory', () => {
    it('should clear query history', async () => {
      await service.processQuery({ query: 'Test query' }, { leaks: mockLeaks });
      expect(service.getQueryHistory().length).toBeGreaterThan(0);

      service.clearHistory();
      expect(service.getQueryHistory().length).toBe(0);
    });
  });

  describe('data point types', () => {
    it('should return currency data points', async () => {
      const response = await service.processQuery(
        { query: 'How much revenue is at risk?' },
        { leaks: mockLeaks }
      );

      const currencyPoints = response.dataPoints.filter(d => d.type === 'currency');
      expect(currencyPoints.length).toBeGreaterThan(0);
    });

    it('should return number data points', async () => {
      const response = await service.processQuery(
        { query: 'How many leaks do we have?' },
        { leaks: mockLeaks }
      );

      const numberPoints = response.dataPoints.filter(d => d.type === 'number');
      expect(numberPoints.length).toBeGreaterThan(0);
    });
  });
});
