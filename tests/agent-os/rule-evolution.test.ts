/**
 * Tests for Rule Evolution Module
 */

import { RuleEvolutionEngine } from '../../src/agent-os/rule-evolution';
import { RevenueLeak } from '../../src/types';

describe('RuleEvolutionEngine', () => {
  let engine: RuleEvolutionEngine;

  beforeEach(() => {
    engine = new RuleEvolutionEngine();
  });

  const createMockLeak = (
    id: string,
    type: string,
    revenue: number
  ): RevenueLeak => ({
    id,
    type: type as RevenueLeak['type'],
    severity: revenue > 10000 ? 'critical' : revenue > 5000 ? 'high' : 'medium',
    description: `Test leak ${id}`,
    potentialRevenue: revenue,
    affectedEntity: { type: 'deal', id: `deal-${id}`, name: `Deal ${id}` },
    detectedAt: new Date(),
    suggestedActions: [],
  });

  describe('initialization', () => {
    it('should initialize with default rules', () => {
      const rules = engine.getActiveRules();
      
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should have rules for common leak types', () => {
      const rules = engine.getActiveRules();
      const leakTypes = rules.map(r => r.leakType);
      
      expect(leakTypes).toContain('underbilling');
      expect(leakTypes).toContain('missed_renewal');
      expect(leakTypes).toContain('billing_gap');
    });
  });

  describe('getActiveRules', () => {
    it('should return only active rules', () => {
      const activeRules = engine.getActiveRules();
      
      expect(activeRules.every(r => r.status === 'active')).toBe(true);
    });
  });

  describe('getRule', () => {
    it('should retrieve a rule by ID', () => {
      const rules = engine.getActiveRules();
      if (rules.length > 0) {
        const rule = engine.getRule(rules[0].id);
        expect(rule).toBeDefined();
        expect(rule?.id).toBe(rules[0].id);
      }
    });

    it('should return undefined for non-existent rule', () => {
      const rule = engine.getRule('non-existent');
      expect(rule).toBeUndefined();
    });
  });

  describe('generateMutations', () => {
    it('should generate mutations for a rule', () => {
      const rules = engine.getActiveRules();
      if (rules.length > 0) {
        const mutations = engine.generateMutations(rules[0].id);
        expect(Array.isArray(mutations)).toBe(true);
      }
    });

    it('should throw for non-existent rule', () => {
      expect(() => engine.generateMutations('non-existent'))
        .toThrow('Rule non-existent not found');
    });

    it('should generate threshold adjustments', () => {
      const rules = engine.getActiveRules();
      if (rules.length > 0) {
        const mutations = engine.generateMutations(rules[0].id);
        const thresholdMutations = mutations.filter(m => m.mutationType === 'threshold_adjust');
        expect(thresholdMutations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('applyMutation', () => {
    it('should apply a mutation and create a candidate', () => {
      const rules = engine.getActiveRules();
      if (rules.length > 0) {
        const mutations = engine.generateMutations(rules[0].id);
        if (mutations.length > 0) {
          const candidate = engine.applyMutation(mutations[0].id);
          expect(candidate).toBeDefined();
          expect(candidate.parentRuleId).toBe(rules[0].id);
        }
      }
    });

    it('should throw for non-existent mutation', () => {
      expect(() => engine.applyMutation('non-existent'))
        .toThrow('Mutation non-existent not found');
    });
  });

  describe('evaluateRules', () => {
    it('should evaluate rules against leaks', () => {
      const leaks = [
        createMockLeak('1', 'underbilling', 15000),
        createMockLeak('2', 'billing_gap', 8000),
      ];

      const results = engine.evaluateRules(leaks);

      expect(results).toBeDefined();
      expect(results instanceof Map).toBe(true);
    });
  });

  describe('autoEvolve', () => {
    it('should return evolution results', () => {
      const result = engine.autoEvolve();

      expect(result.evolvedRules).toBeDefined();
      expect(result.mutations).toBeDefined();
      expect(Array.isArray(result.evolvedRules)).toBe(true);
      expect(Array.isArray(result.mutations)).toBe(true);
    });
  });

  describe('getRuleHistory', () => {
    it('should return history for a rule', () => {
      const rules = engine.getActiveRules();
      if (rules.length > 0) {
        const history = engine.getRuleHistory(rules[0].id);
        expect(history).toBeDefined();
        expect(history?.events).toBeDefined();
      }
    });
  });

  describe('getStats', () => {
    it('should return evolution statistics', () => {
      const stats = engine.getStats();

      expect(stats.totalRules).toBeGreaterThan(0);
      expect(stats.activeRules).toBeGreaterThan(0);
      expect(typeof stats.averagePerformance).toBe('number');
    });
  });

  describe('getPendingMutations', () => {
    it('should return pending mutations', () => {
      const pending = engine.getPendingMutations();
      expect(Array.isArray(pending)).toBe(true);
    });
  });

  describe('getActiveTests', () => {
    it('should return active tests', () => {
      const tests = engine.getActiveTests();
      expect(Array.isArray(tests)).toBe(true);
    });
  });
});
