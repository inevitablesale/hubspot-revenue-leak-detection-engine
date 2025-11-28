/**
 * Rule Author Module
 * Enables AgentOS to generate, test, and evolve detection rules
 * for revenue leak identification
 */

import { generateId } from '../../utils/helpers';
import { LeakType, LeakSeverity } from '../../types';

// ============================================================
// Rule Author Types
// ============================================================

export type RuleOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'matches' | 'between';
export type RuleLogic = 'and' | 'or' | 'not';
export type RuleStatus = 'draft' | 'testing' | 'active' | 'deprecated' | 'disabled';

export interface AuthoredRule {
  id: string;
  name: string;
  description: string;
  leakType: LeakType;
  version: number;
  status: RuleStatus;
  conditions: RuleCondition[];
  logic: RuleLogic;
  severity: LeakSeverity;
  confidence: number;
  actions: RuleAction[];
  metadata: RuleMetadata;
  performance: RulePerformance;
  evolution: RuleEvolution;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
}

export interface RuleCondition {
  id: string;
  field: string;
  operator: RuleOperator;
  value: unknown;
  weight: number;
  description?: string;
}

export interface RuleAction {
  id: string;
  type: 'alert' | 'flag' | 'auto_fix' | 'escalate' | 'notify' | 'log';
  config: Record<string, unknown>;
  priority: number;
}

export interface RuleMetadata {
  author: 'agent' | 'user' | 'system';
  source: 'pattern_detection' | 'manual' | 'learning' | 'evolution';
  tags: string[];
  entityTypes: string[];
  requiredFields: string[];
  estimatedImpact: number;
}

export interface RulePerformance {
  applications: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  avgExecutionMs: number;
  lastApplied?: Date;
}

export interface RuleEvolution {
  parentRuleId?: string;
  generation: number;
  mutations: RuleMutation[];
  fitness: number;
  survivalScore: number;
}

export interface RuleMutation {
  id: string;
  type: 'threshold_adjust' | 'operator_change' | 'condition_add' | 'condition_remove' | 'weight_adjust';
  field?: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  appliedAt: Date;
  impactOnAccuracy: number;
}

export interface RuleTestCase {
  id: string;
  name: string;
  input: Record<string, unknown>;
  expectedMatch: boolean;
  expectedSeverity?: LeakSeverity;
  actualMatch?: boolean;
  passed?: boolean;
  executedAt?: Date;
}

export interface RuleTestSuite {
  id: string;
  ruleId: string;
  testCases: RuleTestCase[];
  passRate: number;
  lastRunAt?: Date;
}

export interface RuleSuggestion {
  id: string;
  basedOn: 'pattern' | 'feedback' | 'correlation' | 'anomaly';
  suggestedConditions: RuleCondition[];
  suggestedLeakType: LeakType;
  confidence: number;
  supportingEvidence: Evidence[];
  estimatedImpact: number;
  createdAt: Date;
}

export interface Evidence {
  type: string;
  description: string;
  dataPoints: number;
  correlation: number;
}

export interface PatternDiscovery {
  id: string;
  pattern: string;
  frequency: number;
  entities: string[];
  correlation: number;
  suggestedRule?: AuthoredRule;
  discoveredAt: Date;
}

// ============================================================
// Rule Author Implementation
// ============================================================

export class RuleAuthor {
  private rules: Map<string, AuthoredRule> = new Map();
  private testSuites: Map<string, RuleTestSuite> = new Map();
  private suggestions: Map<string, RuleSuggestion> = new Map();
  private discoveries: Map<string, PatternDiscovery> = new Map();
  private mutationHistory: RuleMutation[] = [];

  constructor() {
    this.initializeBaseRules();
  }

  /**
   * Initialize base detection rules
   */
  private initializeBaseRules(): void {
    // Underbilling detection rule
    this.createRule({
      name: 'Underbilling Threshold',
      description: 'Detects deals significantly below pipeline average',
      leakType: 'underbilling',
      conditions: [
        {
          id: generateId(),
          field: 'deal.amount',
          operator: 'lt',
          value: 'pipeline_average * 0.7',
          weight: 0.8,
          description: 'Deal amount below 70% of pipeline average',
        },
        {
          id: generateId(),
          field: 'deal.stage',
          operator: 'in',
          value: ['closedwon', 'contractsent'],
          weight: 0.2,
          description: 'Deal in late stage',
        },
      ],
      logic: 'and',
      severity: 'medium',
      actions: [
        { id: generateId(), type: 'flag', config: { reason: 'potential_underbilling' }, priority: 1 },
        { id: generateId(), type: 'alert', config: { channel: 'slack' }, priority: 2 },
      ],
    });

    // Stale deal detection rule
    this.createRule({
      name: 'Stale Deal Detection',
      description: 'Detects deals with no activity beyond threshold',
      leakType: 'stale_pipeline',
      conditions: [
        {
          id: generateId(),
          field: 'deal.daysSinceLastActivity',
          operator: 'gt',
          value: 30,
          weight: 0.7,
          description: 'No activity in 30+ days',
        },
        {
          id: generateId(),
          field: 'deal.stage',
          operator: 'not_in',
          value: ['closedwon', 'closedlost'],
          weight: 0.3,
          description: 'Deal still open',
        },
      ],
      logic: 'and',
      severity: 'high',
      actions: [
        { id: generateId(), type: 'notify', config: { recipient: 'owner' }, priority: 1 },
        { id: generateId(), type: 'escalate', config: { level: 'manager' }, priority: 2 },
      ],
    });

    // Missing renewal detection
    this.createRule({
      name: 'Missing Renewal Flag',
      description: 'Detects contracts approaching end without renewal deal',
      leakType: 'missed_renewal',
      conditions: [
        {
          id: generateId(),
          field: 'contract.daysToExpiry',
          operator: 'lt',
          value: 90,
          weight: 0.6,
          description: 'Contract expiring within 90 days',
        },
        {
          id: generateId(),
          field: 'renewal.exists',
          operator: 'eq',
          value: false,
          weight: 0.4,
          description: 'No renewal deal exists',
        },
      ],
      logic: 'and',
      severity: 'critical',
      actions: [
        { id: generateId(), type: 'alert', config: { channel: 'email', urgency: 'high' }, priority: 1 },
        { id: generateId(), type: 'auto_fix', config: { action: 'create_renewal_task' }, priority: 2 },
      ],
    });
  }

  /**
   * Create a new detection rule
   */
  createRule(params: {
    name: string;
    description: string;
    leakType: LeakType;
    conditions: RuleCondition[];
    logic: RuleLogic;
    severity: LeakSeverity;
    actions?: RuleAction[];
    metadata?: Partial<RuleMetadata>;
  }): AuthoredRule {
    const rule: AuthoredRule = {
      id: generateId(),
      name: params.name,
      description: params.description,
      leakType: params.leakType,
      version: 1,
      status: 'draft',
      conditions: params.conditions,
      logic: params.logic,
      severity: params.severity,
      confidence: 0.5,
      actions: params.actions || [],
      metadata: {
        author: 'agent',
        source: 'manual',
        tags: [],
        entityTypes: this.inferEntityTypes(params.conditions),
        requiredFields: params.conditions.map(c => c.field),
        estimatedImpact: 0,
        ...params.metadata,
      },
      performance: {
        applications: 0,
        truePositives: 0,
        falsePositives: 0,
        trueNegatives: 0,
        falseNegatives: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        avgExecutionMs: 0,
      },
      evolution: {
        generation: 1,
        mutations: [],
        fitness: 0.5,
        survivalScore: 1,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(rule.id, rule);
    this.createTestSuite(rule.id);
    return rule;
  }

  /**
   * Generate rule from pattern discovery
   */
  generateRuleFromPattern(pattern: PatternDiscovery): AuthoredRule {
    const conditions: RuleCondition[] = this.patternToConditions(pattern);
    
    const rule = this.createRule({
      name: `Auto-${pattern.pattern}`,
      description: `Auto-generated rule from pattern: ${pattern.pattern}`,
      leakType: this.inferLeakType(pattern),
      conditions,
      logic: 'and',
      severity: this.inferSeverity(pattern),
      metadata: {
        author: 'agent',
        source: 'pattern_detection',
      },
    });

    pattern.suggestedRule = rule;
    return rule;
  }

  /**
   * Apply mutation to evolve a rule
   */
  mutateRule(ruleId: string, mutationType: RuleMutation['type'], params: Record<string, unknown>): AuthoredRule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule with id '${ruleId}' not found`);
    }

    const mutation: RuleMutation = {
      id: generateId(),
      type: mutationType,
      field: params.field as string,
      oldValue: params.oldValue,
      newValue: params.newValue,
      reason: params.reason as string || 'Optimization mutation',
      appliedAt: new Date(),
      impactOnAccuracy: 0,
    };

    // Apply mutation based on type
    switch (mutationType) {
      case 'threshold_adjust':
        this.applyThresholdMutation(rule, params);
        break;
      case 'operator_change':
        this.applyOperatorMutation(rule, params);
        break;
      case 'condition_add':
        this.applyConditionAddMutation(rule, params);
        break;
      case 'condition_remove':
        this.applyConditionRemoveMutation(rule, params);
        break;
      case 'weight_adjust':
        this.applyWeightMutation(rule, params);
        break;
    }

    rule.evolution.mutations.push(mutation);
    rule.version++;
    rule.updatedAt = new Date();
    this.mutationHistory.push(mutation);

    return rule;
  }

  /**
   * Test a rule against test cases
   */
  testRule(ruleId: string): RuleTestSuite {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule with id '${ruleId}' not found`);
    }

    let suite = this.testSuites.get(ruleId);
    if (!suite) {
      suite = this.createTestSuite(ruleId);
    }

    let passCount = 0;
    for (const testCase of suite.testCases) {
      const result = this.evaluateRule(rule, testCase.input);
      testCase.actualMatch = result.matched;
      testCase.passed = testCase.actualMatch === testCase.expectedMatch;
      testCase.executedAt = new Date();
      
      if (testCase.passed) passCount++;
    }

    suite.passRate = suite.testCases.length > 0 ? passCount / suite.testCases.length : 0;
    suite.lastRunAt = new Date();

    // Update rule status based on test results
    if (suite.passRate >= 0.9 && rule.status === 'draft') {
      rule.status = 'testing';
    }

    return suite;
  }

  /**
   * Activate a rule for production use
   */
  activateRule(ruleId: string): AuthoredRule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule with id '${ruleId}' not found`);
    }

    const suite = this.testSuites.get(ruleId);
    if (!suite || suite.passRate < 0.8) {
      throw new Error('Rule must pass at least 80% of tests before activation');
    }

    rule.status = 'active';
    rule.activatedAt = new Date();
    rule.updatedAt = new Date();

    return rule;
  }

  /**
   * Deactivate a rule
   */
  deactivateRule(ruleId: string): AuthoredRule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule with id '${ruleId}' not found`);
    }

    rule.status = 'disabled';
    rule.updatedAt = new Date();

    return rule;
  }

  /**
   * Deprecate a rule (replaced by evolved version)
   */
  deprecateRule(ruleId: string, replacedBy: string): AuthoredRule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule with id '${ruleId}' not found`);
    }

    rule.status = 'deprecated';
    rule.updatedAt = new Date();

    // Link the new rule as child
    const newRule = this.rules.get(replacedBy);
    if (newRule) {
      newRule.evolution.parentRuleId = ruleId;
    }

    return rule;
  }

  /**
   * Record rule application result for learning
   */
  recordResult(ruleId: string, isCorrect: boolean, wasMatch: boolean): void {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    rule.performance.applications++;
    
    if (wasMatch && isCorrect) {
      rule.performance.truePositives++;
    } else if (wasMatch && !isCorrect) {
      rule.performance.falsePositives++;
    } else if (!wasMatch && isCorrect) {
      rule.performance.trueNegatives++;
    } else {
      rule.performance.falseNegatives++;
    }

    // Recalculate metrics
    const tp = rule.performance.truePositives;
    const fp = rule.performance.falsePositives;
    const fn = rule.performance.falseNegatives;

    rule.performance.precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    rule.performance.recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    rule.performance.f1Score = rule.performance.precision + rule.performance.recall > 0
      ? 2 * (rule.performance.precision * rule.performance.recall) / (rule.performance.precision + rule.performance.recall)
      : 0;

    // Update confidence based on F1 score
    rule.confidence = rule.performance.f1Score;
    rule.performance.lastApplied = new Date();

    // Update evolution fitness
    rule.evolution.fitness = rule.performance.f1Score;
    rule.evolution.survivalScore = rule.performance.precision * rule.evolution.fitness;
  }

  /**
   * Discover patterns from data
   */
  discoverPatterns(data: Record<string, unknown>[]): PatternDiscovery[] {
    const patterns: PatternDiscovery[] = [];
    
    // Simple pattern discovery based on field distributions
    const fieldPatterns = this.analyzeFieldPatterns(data);
    
    for (const [pattern, info] of Object.entries(fieldPatterns)) {
      if (info.frequency >= 0.1 && info.correlation >= 0.5) {
        const discovery: PatternDiscovery = {
          id: generateId(),
          pattern,
          frequency: info.frequency,
          entities: info.entities,
          correlation: info.correlation,
          discoveredAt: new Date(),
        };
        
        patterns.push(discovery);
        this.discoveries.set(discovery.id, discovery);
      }
    }

    return patterns;
  }

  /**
   * Generate rule suggestions based on analysis
   */
  generateSuggestions(feedback: { ruleId: string; wasCorrect: boolean }[]): RuleSuggestion[] {
    const suggestions: RuleSuggestion[] = [];
    
    // Analyze feedback to suggest improvements
    const incorrectFeedback = feedback.filter(f => !f.wasCorrect);
    const ruleGroups = this.groupByRule(incorrectFeedback);

    for (const [ruleId, feedbackItems] of Object.entries(ruleGroups)) {
      const rule = this.rules.get(ruleId);
      if (!rule || feedbackItems.length < 3) continue;

      // Suggest threshold adjustments
      const suggestion: RuleSuggestion = {
        id: generateId(),
        basedOn: 'feedback',
        suggestedConditions: rule.conditions.map(c => ({
          ...c,
          value: this.adjustValue(c.value, 0.1), // Adjust by 10%
        })),
        suggestedLeakType: rule.leakType,
        confidence: 0.7,
        supportingEvidence: [{
          type: 'feedback_analysis',
          description: `${feedbackItems.length} false positives detected`,
          dataPoints: feedbackItems.length,
          correlation: 0.8,
        }],
        estimatedImpact: feedbackItems.length * 100,
        createdAt: new Date(),
      };

      suggestions.push(suggestion);
      this.suggestions.set(suggestion.id, suggestion);
    }

    return suggestions;
  }

  /**
   * Apply a suggestion to create or update a rule
   */
  applySuggestion(suggestionId: string): AuthoredRule {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) {
      throw new Error(`Suggestion with id '${suggestionId}' not found`);
    }

    return this.createRule({
      name: `Suggested Rule ${suggestion.id.slice(0, 8)}`,
      description: `Rule generated from ${suggestion.basedOn} analysis`,
      leakType: suggestion.suggestedLeakType,
      conditions: suggestion.suggestedConditions,
      logic: 'and',
      severity: 'medium',
      metadata: {
        author: 'agent',
        source: 'learning',
        estimatedImpact: suggestion.estimatedImpact,
      },
    });
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): AuthoredRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): AuthoredRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by status
   */
  getRulesByStatus(status: RuleStatus): AuthoredRule[] {
    return this.getRules().filter(r => r.status === status);
  }

  /**
   * Get rules by leak type
   */
  getRulesByLeakType(leakType: LeakType): AuthoredRule[] {
    return this.getRules().filter(r => r.leakType === leakType);
  }

  /**
   * Get top performing rules
   */
  getTopPerformingRules(limit: number = 10): AuthoredRule[] {
    return this.getRules()
      .filter(r => r.status === 'active')
      .sort((a, b) => b.performance.f1Score - a.performance.f1Score)
      .slice(0, limit);
  }

  /**
   * Get suggestions
   */
  getSuggestions(): RuleSuggestion[] {
    return Array.from(this.suggestions.values());
  }

  /**
   * Get discoveries
   */
  getDiscoveries(): PatternDiscovery[] {
    return Array.from(this.discoveries.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRules: number;
    activeRules: number;
    avgF1Score: number;
    avgPrecision: number;
    avgRecall: number;
    totalApplications: number;
    pendingSuggestions: number;
    patternDiscoveries: number;
    mutationHistory: number;
  } {
    const rules = this.getRules();
    const activeRules = rules.filter(r => r.status === 'active');
    
    const avgF1Score = activeRules.length > 0
      ? activeRules.reduce((sum, r) => sum + r.performance.f1Score, 0) / activeRules.length
      : 0;
    
    const avgPrecision = activeRules.length > 0
      ? activeRules.reduce((sum, r) => sum + r.performance.precision, 0) / activeRules.length
      : 0;

    const avgRecall = activeRules.length > 0
      ? activeRules.reduce((sum, r) => sum + r.performance.recall, 0) / activeRules.length
      : 0;

    return {
      totalRules: rules.length,
      activeRules: activeRules.length,
      avgF1Score,
      avgPrecision,
      avgRecall,
      totalApplications: rules.reduce((sum, r) => sum + r.performance.applications, 0),
      pendingSuggestions: this.suggestions.size,
      patternDiscoveries: this.discoveries.size,
      mutationHistory: this.mutationHistory.length,
    };
  }

  // Private helper methods

  private createTestSuite(ruleId: string): RuleTestSuite {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule with id '${ruleId}' not found`);
    }

    // Generate test cases based on rule conditions
    const testCases: RuleTestCase[] = [
      {
        id: generateId(),
        name: 'Should match positive case',
        input: this.generatePositiveCase(rule),
        expectedMatch: true,
        expectedSeverity: rule.severity,
      },
      {
        id: generateId(),
        name: 'Should not match negative case',
        input: this.generateNegativeCase(rule),
        expectedMatch: false,
      },
      {
        id: generateId(),
        name: 'Edge case - boundary values',
        input: this.generateEdgeCase(rule),
        expectedMatch: true,
      },
    ];

    const suite: RuleTestSuite = {
      id: generateId(),
      ruleId,
      testCases,
      passRate: 0,
    };

    this.testSuites.set(ruleId, suite);
    return suite;
  }

  private evaluateRule(rule: AuthoredRule, data: Record<string, unknown>): { matched: boolean; confidence: number } {
    const results: boolean[] = [];

    for (const condition of rule.conditions) {
      const fieldValue = this.getNestedValue(data, condition.field);
      const matched = this.evaluateCondition(condition, fieldValue);
      results.push(matched);
    }

    let matched: boolean;
    switch (rule.logic) {
      case 'and':
        matched = results.every(r => r);
        break;
      case 'or':
        matched = results.some(r => r);
        break;
      case 'not':
        matched = !results[0];
        break;
      default:
        matched = false;
    }

    return { matched, confidence: rule.confidence };
  }

  private evaluateCondition(condition: RuleCondition, value: unknown): boolean {
    const target = condition.value;

    switch (condition.operator) {
      case 'eq':
        return value === target;
      case 'ne':
        return value !== target;
      case 'gt':
        return typeof value === 'number' && typeof target === 'number' && value > target;
      case 'gte':
        return typeof value === 'number' && typeof target === 'number' && value >= target;
      case 'lt':
        return typeof value === 'number' && typeof target === 'number' && value < target;
      case 'lte':
        return typeof value === 'number' && typeof target === 'number' && value <= target;
      case 'in':
        return Array.isArray(target) && target.includes(value);
      case 'not_in':
        return Array.isArray(target) && !target.includes(value);
      case 'contains':
        return typeof value === 'string' && typeof target === 'string' && value.includes(target);
      case 'matches':
        return typeof value === 'string' && typeof target === 'string' && new RegExp(target).test(value);
      case 'between':
        if (Array.isArray(target) && target.length === 2 && typeof value === 'number') {
          return value >= (target[0] as number) && value <= (target[1] as number);
        }
        return false;
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private inferEntityTypes(conditions: RuleCondition[]): string[] {
    const types = new Set<string>();
    
    for (const condition of conditions) {
      const parts = condition.field.split('.');
      if (parts.length > 0) {
        types.add(parts[0]);
      }
    }
    
    return Array.from(types);
  }

  private inferLeakType(pattern: PatternDiscovery): LeakType {
    const p = pattern.pattern.toLowerCase();
    if (p.includes('bill') || p.includes('invoice')) return 'underbilling';
    if (p.includes('renew')) return 'missed_renewal';
    if (p.includes('stale') || p.includes('inactive')) return 'stale_pipeline';
    if (p.includes('handoff') || p.includes('cs')) return 'missed_handoff';
    return 'data_quality';
  }

  private inferSeverity(pattern: PatternDiscovery): LeakSeverity {
    if (pattern.correlation >= 0.8 && pattern.frequency >= 0.3) return 'critical';
    if (pattern.correlation >= 0.6) return 'high';
    if (pattern.correlation >= 0.4) return 'medium';
    return 'low';
  }

  private patternToConditions(pattern: PatternDiscovery): RuleCondition[] {
    // Simple pattern-to-condition conversion
    return [{
      id: generateId(),
      field: 'entity.pattern',
      operator: 'matches',
      value: pattern.pattern,
      weight: pattern.correlation,
      description: `Pattern: ${pattern.pattern}`,
    }];
  }

  private generatePositiveCase(rule: AuthoredRule): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    
    for (const condition of rule.conditions) {
      const parts = condition.field.split('.');
      let current = data;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]] as Record<string, unknown>;
      }
      
      current[parts[parts.length - 1]] = this.generateMatchingValue(condition);
    }
    
    return data;
  }

  private generateNegativeCase(rule: AuthoredRule): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    
    for (const condition of rule.conditions) {
      const parts = condition.field.split('.');
      let current = data;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]] as Record<string, unknown>;
      }
      
      current[parts[parts.length - 1]] = this.generateNonMatchingValue(condition);
    }
    
    return data;
  }

  private generateEdgeCase(rule: AuthoredRule): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    
    for (const condition of rule.conditions) {
      const parts = condition.field.split('.');
      let current = data;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]] as Record<string, unknown>;
      }
      
      current[parts[parts.length - 1]] = this.generateEdgeValue(condition);
    }
    
    return data;
  }

  private generateMatchingValue(condition: RuleCondition): unknown {
    switch (condition.operator) {
      case 'eq':
        return condition.value;
      case 'gt':
        return typeof condition.value === 'number' ? condition.value + 1 : condition.value;
      case 'lt':
        return typeof condition.value === 'number' ? condition.value - 1 : condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.length > 0 ? condition.value[0] : condition.value;
      default:
        return condition.value;
    }
  }

  private generateNonMatchingValue(condition: RuleCondition): unknown {
    switch (condition.operator) {
      case 'eq':
        return typeof condition.value === 'number' ? condition.value + 1 : 'different_value';
      case 'gt':
        return typeof condition.value === 'number' ? condition.value - 1 : condition.value;
      case 'lt':
        return typeof condition.value === 'number' ? condition.value + 1 : condition.value;
      case 'in':
        return 'not_in_list';
      default:
        return null;
    }
  }

  private generateEdgeValue(condition: RuleCondition): unknown {
    switch (condition.operator) {
      case 'gt':
        return typeof condition.value === 'number' ? condition.value + 0.01 : condition.value;
      case 'lt':
        return typeof condition.value === 'number' ? condition.value - 0.01 : condition.value;
      case 'gte':
        return condition.value;
      case 'lte':
        return condition.value;
      default:
        return condition.value;
    }
  }

  private applyThresholdMutation(rule: AuthoredRule, params: Record<string, unknown>): void {
    const conditionId = params.conditionId as string;
    const newThreshold = params.newValue as number;
    
    const condition = rule.conditions.find(c => c.id === conditionId);
    if (condition && typeof condition.value === 'number') {
      condition.value = newThreshold;
    }
  }

  private applyOperatorMutation(rule: AuthoredRule, params: Record<string, unknown>): void {
    const conditionId = params.conditionId as string;
    const newOperator = params.newValue as RuleOperator;
    
    const condition = rule.conditions.find(c => c.id === conditionId);
    if (condition) {
      condition.operator = newOperator;
    }
  }

  private applyConditionAddMutation(rule: AuthoredRule, params: Record<string, unknown>): void {
    const newCondition = params.newValue as RuleCondition;
    if (newCondition) {
      rule.conditions.push({
        ...newCondition,
        id: generateId(),
      });
    }
  }

  private applyConditionRemoveMutation(rule: AuthoredRule, params: Record<string, unknown>): void {
    const conditionId = params.conditionId as string;
    rule.conditions = rule.conditions.filter(c => c.id !== conditionId);
  }

  private applyWeightMutation(rule: AuthoredRule, params: Record<string, unknown>): void {
    const conditionId = params.conditionId as string;
    const newWeight = params.newValue as number;
    
    const condition = rule.conditions.find(c => c.id === conditionId);
    if (condition) {
      condition.weight = newWeight;
    }
  }

  private analyzeFieldPatterns(data: Record<string, unknown>[]): Record<string, { frequency: number; entities: string[]; correlation: number }> {
    const patterns: Record<string, { count: number; entities: string[] }> = {};
    
    for (const item of data) {
      const pattern = JSON.stringify(Object.keys(item).sort());
      if (!patterns[pattern]) {
        patterns[pattern] = { count: 0, entities: [] };
      }
      patterns[pattern].count++;
      patterns[pattern].entities.push(item.id as string || 'unknown');
    }

    const result: Record<string, { frequency: number; entities: string[]; correlation: number }> = {};
    for (const [pattern, info] of Object.entries(patterns)) {
      result[pattern] = {
        frequency: info.count / data.length,
        entities: info.entities,
        correlation: Math.min(1, info.count / 10),
      };
    }

    return result;
  }

  private groupByRule(feedback: { ruleId: string; wasCorrect: boolean }[]): Record<string, typeof feedback> {
    const groups: Record<string, typeof feedback> = {};
    
    for (const item of feedback) {
      if (!groups[item.ruleId]) {
        groups[item.ruleId] = [];
      }
      groups[item.ruleId].push(item);
    }
    
    return groups;
  }

  private adjustValue(value: unknown, percentage: number): unknown {
    if (typeof value === 'number') {
      return value * (1 + percentage);
    }
    return value;
  }
}

export default RuleAuthor;
