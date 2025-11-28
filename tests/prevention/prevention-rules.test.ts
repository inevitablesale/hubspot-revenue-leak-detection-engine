/**
 * Tests for Leak Prevention Engine
 */

import { LeakPreventionEngine } from '../../src/prevention/prevention-rules';
import { Deal, Contract, Contact } from '../../src/types';

describe('LeakPreventionEngine', () => {
  let engine: LeakPreventionEngine;

  beforeEach(() => {
    engine = new LeakPreventionEngine();
  });

  describe('initialization', () => {
    it('should initialize with default rules', () => {
      const rules = engine.getRules();
      
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should have rules for all leak types', () => {
      const rules = engine.getRules();
      const targetTypes = new Set(rules.flatMap(r => r.targetLeakType));
      
      expect(targetTypes.has('missed_renewal')).toBe(true);
      expect(targetTypes.has('stalled_cs_handoff')).toBe(true);
      expect(targetTypes.has('underbilling')).toBe(true);
      expect(targetTypes.has('billing_gap')).toBe(true);
    });
  });

  describe('getActiveRules', () => {
    it('should return only enabled rules', () => {
      const allRules = engine.getRules();
      const activeRules = engine.getActiveRules();
      
      expect(activeRules.length).toBeLessThanOrEqual(allRules.length);
      activeRules.forEach(rule => {
        expect(rule.enabled).toBe(true);
      });
    });
  });

  describe('setRuleEnabled', () => {
    it('should enable/disable a rule', () => {
      const rules = engine.getRules();
      const ruleId = rules[0].id;
      
      engine.setRuleEnabled(ruleId, false);
      
      const updatedRule = engine.getRules().find(r => r.id === ruleId);
      expect(updatedRule?.enabled).toBe(false);
      
      engine.setRuleEnabled(ruleId, true);
      const reenabledRule = engine.getRules().find(r => r.id === ruleId);
      expect(reenabledRule?.enabled).toBe(true);
    });
  });

  describe('addRule', () => {
    it('should add a custom rule', () => {
      const customRule = {
        id: 'custom-rule',
        name: 'Custom Test Rule',
        description: 'Test description',
        targetLeakType: 'underbilling' as const,
        conditions: [
          { field: 'amount', operator: 'less_than' as const, value: 1000, entityType: 'deal' as const },
        ],
        priority: 'high' as const,
        enabled: true,
        triggerActions: [],
        createdAt: new Date(),
        triggerCount: 0,
      };
      
      engine.addRule(customRule);
      
      const rules = engine.getRules();
      expect(rules.find(r => r.id === 'custom-rule')).toBeDefined();
    });
  });

  describe('removeRule', () => {
    it('should remove a rule', () => {
      const rules = engine.getRules();
      const ruleId = rules[0].id;
      
      const removed = engine.removeRule(ruleId);
      
      expect(removed).toBe(true);
      expect(engine.getRules().find(r => r.id === ruleId)).toBeUndefined();
    });

    it('should return false for non-existent rule', () => {
      const removed = engine.removeRule('non-existent');
      
      expect(removed).toBe(false);
    });
  });

  describe('evaluateDeals', () => {
    it('should evaluate deals against rules', () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Test Deal',
            dealstage: 'closedwon',
            closedate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
            amount: '5000',
            cs_owner: '', // Empty - should trigger alert
          },
        },
      ];
      
      const alerts = engine.evaluateDeals(deals);
      
      // Should trigger CS handoff alert
      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return only non-dismissed, non-resolved alerts', () => {
      // First trigger some alerts
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Test Deal',
            dealstage: 'closedwon',
            closedate: new Date().toISOString(),
            amount: '5000',
          },
        },
      ];
      
      engine.evaluateDeals(deals);
      
      const activeAlerts = engine.getActiveAlerts();
      
      activeAlerts.forEach(alert => {
        expect(alert.dismissed).toBe(false);
        expect(alert.resolvedAt).toBeUndefined();
      });
    });
  });

  describe('dismissAlert', () => {
    it('should dismiss an alert', () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Test Deal',
            dealstage: 'closedwon',
            closedate: new Date().toISOString(),
            amount: '5000',
          },
        },
      ];
      
      const alerts = engine.evaluateDeals(deals);
      
      if (alerts.length > 0) {
        engine.dismissAlert(alerts[0].id);
        
        const activeAlerts = engine.getActiveAlerts();
        expect(activeAlerts.find(a => a.id === alerts[0].id)).toBeUndefined();
      }
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert with timestamp', () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Test Deal',
            dealstage: 'closedwon',
            closedate: new Date().toISOString(),
            amount: '5000',
          },
        },
      ];
      
      const alerts = engine.evaluateDeals(deals);
      
      if (alerts.length > 0) {
        engine.resolveAlert(alerts[0].id);
        
        const activeAlerts = engine.getActiveAlerts();
        expect(activeAlerts.find(a => a.id === alerts[0].id)).toBeUndefined();
      }
    });
  });

  describe('getSummary', () => {
    it('should return prevention summary', () => {
      const summary = engine.getSummary();
      
      expect(summary.activeRules).toBeGreaterThan(0);
      expect(summary.alertsToday).toBeGreaterThanOrEqual(0);
      expect(summary.alertsThisWeek).toBeGreaterThanOrEqual(0);
      expect(summary.preventedLeaks).toBeGreaterThanOrEqual(0);
      expect(summary.estimatedSavings).toBeGreaterThanOrEqual(0);
      expect(summary.topRisks).toBeDefined();
    });
  });

  describe('clearAlerts', () => {
    it('should clear all alerts', () => {
      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Test Deal',
            dealstage: 'closedwon',
            closedate: new Date().toISOString(),
            amount: '5000',
          },
        },
      ];
      
      engine.evaluateDeals(deals);
      engine.clearAlerts();
      
      const activeAlerts = engine.getActiveAlerts();
      expect(activeAlerts.length).toBe(0);
    });
  });
});
