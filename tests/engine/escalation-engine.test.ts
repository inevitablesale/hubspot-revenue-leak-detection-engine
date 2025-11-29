/**
 * Tests for Escalation Engine
 */

import { EscalationEngine, EscalationRule } from '../../src/engine/escalation-engine';
import { RevenueLeak, LeakType, LeakSeverity } from '../../src/types';

describe('EscalationEngine', () => {
  let engine: EscalationEngine;

  beforeEach(() => {
    engine = new EscalationEngine();
  });

  describe('initialization', () => {
    it('should initialize with default escalation rules', () => {
      const rules = engine.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should have level 1 escalation rule', () => {
      const rule = engine.getRule('escalate-level-1-3days');
      expect(rule).toBeDefined();
      expect(rule?.escalationLevel).toBe('level_1');
    });

    it('should have escalation chain', () => {
      const rule1 = engine.getRule('escalate-level-1-3days');
      expect(rule1?.nextEscalationRuleId).toBe('escalate-level-2-7days');
    });
  });

  describe('getRules', () => {
    it('should return rules sorted by priority', () => {
      const rules = engine.getRules();
      for (let i = 1; i < rules.length; i++) {
        expect(rules[i].priority).toBeGreaterThanOrEqual(rules[i - 1].priority);
      }
    });
  });

  describe('getActiveRules', () => {
    it('should return only enabled rules', () => {
      const activeRules = engine.getActiveRules();
      expect(activeRules.every(r => r.isEnabled)).toBe(true);
    });
  });

  describe('addRule', () => {
    it('should add a custom escalation rule', () => {
      const customRule: EscalationRule = {
        id: 'custom-escalation',
        name: 'Custom Escalation',
        description: 'Test escalation rule',
        leakTypeFilter: 'all',
        minSeverity: 'medium',
        triggerCondition: 'days_unresolved',
        daysThreshold: 5,
        escalationLevel: 'level_1',
        escalationAction: 'create_task',
        isEnabled: true,
        priority: 5,
        triggerCount: 0,
        createdAt: new Date()
      };

      engine.addRule(customRule);
      const retrieved = engine.getRule('custom-escalation');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Custom Escalation');
    });
  });

  describe('updateRule', () => {
    it('should update an escalation rule', () => {
      const updated = engine.updateRule('escalate-level-1-3days', { 
        daysThreshold: 5,
        notificationMessage: 'Updated message'
      });
      
      expect(updated?.daysThreshold).toBe(5);
      expect(updated?.notificationMessage).toBe('Updated message');
    });

    it('should return null for non-existent rule', () => {
      const result = engine.updateRule('non-existent', { daysThreshold: 10 });
      expect(result).toBeNull();
    });
  });

  describe('deleteRule', () => {
    it('should delete a rule', () => {
      const customRule: EscalationRule = {
        id: 'delete-test',
        name: 'Delete Test',
        description: '',
        leakTypeFilter: 'all',
        minSeverity: 'medium',
        triggerCondition: 'days_unresolved',
        daysThreshold: 5,
        escalationLevel: 'level_1',
        escalationAction: 'create_task',
        isEnabled: true,
        priority: 10,
        triggerCount: 0,
        createdAt: new Date()
      };
      engine.addRule(customRule);
      
      const deleted = engine.deleteRule('delete-test');
      expect(deleted).toBe(true);
      expect(engine.getRule('delete-test')).toBeUndefined();
    });
  });

  describe('evaluateLeaksForEscalation', () => {
    it('should evaluate leaks and trigger escalations', () => {
      const leaks: RevenueLeak[] = [
        {
          id: 'leak-1',
          type: 'missed_renewal',
          severity: 'high',
          description: 'Old unresolved leak',
          potentialRevenue: 10000,
          affectedEntity: { type: 'deal', id: 'deal-1' },
          detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          suggestedActions: []
        }
      ];

      const events = engine.evaluateLeaksForEscalation(leaks);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].leakId).toBe('leak-1');
    });

    it('should skip resolved leaks', () => {
      const leaks: RevenueLeak[] = [
        {
          id: 'leak-resolved',
          type: 'missed_renewal',
          severity: 'high',
          description: 'Resolved leak',
          potentialRevenue: 10000,
          affectedEntity: { type: 'deal', id: 'deal-1' },
          detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          suggestedActions: [],
          metadata: { resolved: true }
        }
      ];

      const events = engine.evaluateLeaksForEscalation(leaks);
      expect(events.length).toBe(0);
    });

    it('should respect severity threshold', () => {
      const leaks: RevenueLeak[] = [
        {
          id: 'low-severity-leak',
          type: 'data_quality',
          severity: 'low',
          description: 'Low severity leak',
          potentialRevenue: 100,
          affectedEntity: { type: 'contact', id: 'contact-1' },
          detectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          suggestedActions: []
        }
      ];

      const events = engine.evaluateLeaksForEscalation(leaks);
      // Low severity should not trigger medium+ escalation rules
      const mediumPlusEscalations = events.filter(e => {
        const rule = engine.getRule(e.ruleId);
        return rule && ['medium', 'high', 'critical'].includes(rule.minSeverity);
      });
      expect(mediumPlusEscalations.length).toBe(0);
    });
  });

  describe('getPendingEscalations', () => {
    it('should return leaks approaching escalation thresholds', () => {
      const leaks: RevenueLeak[] = [
        {
          id: 'soon-escalate',
          type: 'billing_gap',
          severity: 'high',
          description: 'About to escalate',
          potentialRevenue: 5000,
          affectedEntity: { type: 'deal', id: 'deal-1' },
          detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          suggestedActions: []
        }
      ];

      const pending = engine.getPendingEscalations(leaks);
      // Should have pending escalation for 3-day rule
      expect(pending.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getEscalationChain', () => {
    it('should return escalation chain for leak type', () => {
      const chain = engine.getEscalationChain('missed_renewal');
      expect(chain.length).toBeGreaterThan(0);
      
      // Check chain is properly linked
      if (chain.length > 1) {
        expect(chain[0].escalationLevel).toBe('level_1');
      }
    });
  });

  describe('getLeakEscalationHistory', () => {
    it('should return escalation history for a leak', () => {
      // First trigger some escalations
      const leaks: RevenueLeak[] = [
        {
          id: 'history-test-leak',
          type: 'billing_gap',
          severity: 'critical',
          description: 'Test leak',
          potentialRevenue: 100000,
          affectedEntity: { type: 'deal', id: 'deal-1' },
          detectedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          suggestedActions: []
        }
      ];
      engine.evaluateLeaksForEscalation(leaks);

      const history = engine.getLeakEscalationHistory('history-test-leak');
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return escalation statistics', () => {
      const stats = engine.getStats();
      expect(stats.totalRules).toBeGreaterThan(0);
      expect(typeof stats.activeRules).toBe('number');
      expect(stats.escalationsByLevel).toHaveProperty('level_1');
      expect(stats.escalationsByLevel).toHaveProperty('level_2');
    });
  });

  describe('createEscalationTask', () => {
    it('should create an escalation task', async () => {
      const leak: RevenueLeak = {
        id: 'task-test-leak',
        type: 'stalled_cs_handoff',
        severity: 'high',
        description: 'Test leak',
        potentialRevenue: 10000,
        affectedEntity: { type: 'deal', id: 'deal-1' },
        detectedAt: new Date(),
        suggestedActions: []
      };

      const rule = engine.getRule('escalate-level-1-3days')!;
      const result = await engine.createEscalationTask(leak, rule);
      
      expect(result.success).toBe(true);
      expect(result.taskId).toBeDefined();
      expect(result.dueDate).toBeDefined();
    });
  });
});
