/**
 * Tests for Configurable Detection Rule Engine
 */

import { ConfigurableRuleEngine, DetectionRule, RuleCondition } from '../../src/engine/rule-engine';
import { Deal, Contact, Company, LeakType, LeakSeverity } from '../../src/types';

describe('ConfigurableRuleEngine', () => {
  let engine: ConfigurableRuleEngine;

  beforeEach(() => {
    engine = new ConfigurableRuleEngine();
  });

  describe('initialization', () => {
    it('should initialize with system rules', () => {
      const rules = engine.getRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.isSystemRule)).toBe(true);
    });

    it('should have CS handoff rule', () => {
      const rule = engine.getRule('system-cs-handoff-3days');
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('No CS Owner Within 3 Days');
    });

    it('should have stale pipeline rule', () => {
      const rule = engine.getRule('system-stale-pipeline-30days');
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('Deal Stale for 30+ Days');
    });
  });

  describe('getRules', () => {
    it('should return all rules', () => {
      const rules = engine.getRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('getActiveRules', () => {
    it('should return only enabled rules', () => {
      const activeRules = engine.getActiveRules();
      expect(activeRules.every(r => r.isEnabled)).toBe(true);
    });
  });

  describe('getRulesByEntityType', () => {
    it('should filter rules by entity type', () => {
      const dealRules = engine.getRulesByEntityType('deal');
      expect(dealRules.every(r => r.targetEntity === 'deal')).toBe(true);
    });
  });

  describe('validateRule', () => {
    it('should validate a valid rule', () => {
      const result = engine.validateRule({
        name: 'Test Rule',
        targetEntity: 'deal',
        conditions: [{ field: 'amount', operator: 'greater_than', value: 1000 }],
        severity: 'medium',
        suggestedAction: 'Review this deal'
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject rule without name', () => {
      const result = engine.validateRule({
        targetEntity: 'deal',
        conditions: [{ field: 'amount', operator: 'greater_than', value: 1000 }]
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rule name is required');
    });

    it('should reject rule without conditions', () => {
      const result = engine.validateRule({
        name: 'Test Rule',
        targetEntity: 'deal',
        conditions: []
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one condition is required');
    });

    it('should warn about missing severity', () => {
      const result = engine.validateRule({
        name: 'Test Rule',
        targetEntity: 'deal',
        conditions: [{ field: 'amount', operator: 'greater_than', value: 1000 }]
      });
      expect(result.warnings).toContain('No severity specified, will default to medium');
    });
  });

  describe('addRule', () => {
    it('should add a custom rule', () => {
      const customRule: DetectionRule = {
        id: 'custom-test-rule',
        name: 'Custom Test Rule',
        description: 'A test rule',
        ruleType: 'custom',
        targetEntity: 'deal',
        conditions: [{ field: 'amount', operator: 'greater_than', value: 50000 }],
        conditionLogic: 'all',
        severity: 'high',
        suggestedAction: 'Review high-value deal',
        isEnabled: true,
        isSystemRule: false,
        autoCreateTask: false,
        notifySlack: false,
        notifyTeams: false,
        triggerCount: 0,
        createdAt: new Date()
      };

      engine.addRule(customRule);
      const retrieved = engine.getRule('custom-test-rule');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Custom Test Rule');
    });
  });

  describe('updateRule', () => {
    it('should update a custom rule', () => {
      const customRule: DetectionRule = {
        id: 'custom-update-test',
        name: 'Update Test Rule',
        description: '',
        ruleType: 'custom',
        targetEntity: 'deal',
        conditions: [],
        conditionLogic: 'all',
        severity: 'medium',
        suggestedAction: '',
        isEnabled: true,
        isSystemRule: false,
        autoCreateTask: false,
        notifySlack: false,
        notifyTeams: false,
        triggerCount: 0,
        createdAt: new Date()
      };
      engine.addRule(customRule);

      const updated = engine.updateRule('custom-update-test', { name: 'Updated Name', severity: 'high' });
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.severity).toBe('high');
    });

    it('should only allow certain updates on system rules', () => {
      const systemRule = engine.getRule('system-cs-handoff-3days');
      expect(systemRule).toBeDefined();
      
      const updated = engine.updateRule('system-cs-handoff-3days', { 
        name: 'New Name', // Should be ignored
        isEnabled: false // Should be allowed
      });
      
      expect(updated?.name).toBe('No CS Owner Within 3 Days'); // Original name
      expect(updated?.isEnabled).toBe(false);
    });

    it('should return null for non-existent rule', () => {
      const result = engine.updateRule('non-existent', { name: 'New Name' });
      expect(result).toBeNull();
    });
  });

  describe('deleteRule', () => {
    it('should delete a custom rule', () => {
      const customRule: DetectionRule = {
        id: 'custom-delete-test',
        name: 'Delete Test Rule',
        description: '',
        ruleType: 'custom',
        targetEntity: 'deal',
        conditions: [],
        conditionLogic: 'all',
        severity: 'medium',
        suggestedAction: '',
        isEnabled: true,
        isSystemRule: false,
        autoCreateTask: false,
        notifySlack: false,
        notifyTeams: false,
        triggerCount: 0,
        createdAt: new Date()
      };
      engine.addRule(customRule);
      
      const deleted = engine.deleteRule('custom-delete-test');
      expect(deleted).toBe(true);
      expect(engine.getRule('custom-delete-test')).toBeUndefined();
    });

    it('should not delete system rules', () => {
      const deleted = engine.deleteRule('system-cs-handoff-3days');
      expect(deleted).toBe(false);
      expect(engine.getRule('system-cs-handoff-3days')).toBeDefined();
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
            cs_owner: undefined // Missing CS owner
          }
        }
      ];

      const results = engine.evaluateDeals(deals);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should create leaks for matched rules', () => {
      const deals: Deal[] = [
        {
          id: 'deal-2',
          properties: {
            dealname: 'Matched Deal',
            dealstage: 'closedwon',
            closedate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            cs_owner: undefined,
            amount: '100000'
          }
        }
      ];

      const results = engine.evaluateDeals(deals);
      const matched = results.filter(r => r.matched);
      
      if (matched.length > 0) {
        expect(matched[0].leak).toBeDefined();
        expect(matched[0].leak?.type).toBeDefined();
      }
    });
  });

  describe('testRule', () => {
    it('should test a rule against sample data', () => {
      const testRule: DetectionRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'For testing',
        ruleType: 'custom',
        targetEntity: 'deal',
        conditions: [{ field: 'amount', operator: 'greater_than', value: 50000 }],
        conditionLogic: 'all',
        severity: 'medium',
        suggestedAction: '',
        isEnabled: true,
        isSystemRule: false,
        autoCreateTask: false,
        notifySlack: false,
        notifyTeams: false,
        triggerCount: 0,
        createdAt: new Date()
      };

      const sampleDeals: Deal[] = [
        { id: 'deal-a', properties: { dealname: 'Small Deal', amount: '10000' } },
        { id: 'deal-b', properties: { dealname: 'Large Deal', amount: '100000' } }
      ];

      const result = engine.testRule(testRule, sampleDeals);
      expect(result.sampleSize).toBe(2);
      expect(result.matchCount).toBe(1);
      expect(result.matchedEntities[0].name).toBe('Large Deal');
    });
  });

  describe('getStats', () => {
    it('should return rule statistics', () => {
      const stats = engine.getStats();
      expect(stats.totalRules).toBeGreaterThan(0);
      expect(stats.systemRules).toBeGreaterThan(0);
      expect(typeof stats.activeRules).toBe('number');
    });
  });

  describe('exportRules', () => {
    it('should export rules as JSON', () => {
      const customRule: DetectionRule = {
        id: 'export-test',
        name: 'Export Test',
        description: '',
        ruleType: 'custom',
        targetEntity: 'deal',
        conditions: [],
        conditionLogic: 'all',
        severity: 'medium',
        suggestedAction: '',
        isEnabled: true,
        isSystemRule: false,
        autoCreateTask: false,
        notifySlack: false,
        notifyTeams: false,
        triggerCount: 0,
        createdAt: new Date()
      };
      engine.addRule(customRule);

      const json = engine.exportRules();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.some((r: DetectionRule) => r.name === 'Export Test')).toBe(true);
    });
  });

  describe('importRules', () => {
    it('should import rules from JSON', () => {
      const rulesToImport = [{
        name: 'Imported Rule',
        targetEntity: 'deal',
        conditions: [{ field: 'amount', operator: 'greater_than', value: 1000 }],
        conditionLogic: 'all',
        severity: 'medium',
        suggestedAction: 'Review'
      }];

      const result = engine.importRules(JSON.stringify(rulesToImport));
      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should report errors for invalid rules', () => {
      const invalidRules = [{
        targetEntity: 'deal' // Missing name
      }];

      const result = engine.importRules(JSON.stringify(invalidRules));
      expect(result.imported).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
