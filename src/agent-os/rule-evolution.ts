/**
 * Rule Evolution Module
 * Adaptive rule management and automated rule optimization
 */

import { RevenueLeak, LeakType, LeakSeverity } from '../types';
import { generateId } from '../utils/helpers';
import {
  EvolvableRule,
  RuleCondition,
  RuleAction,
  RulePerformance,
  RuleMutation,
  RuleEvolutionConfig,
} from './types';

export interface RuleCandidate {
  id: string;
  parentRuleId?: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  hypothesis: string;
  expectedImprovement: number;
  testPeriod: { start: Date; end: Date };
  testResults?: RulePerformance;
}

export interface RuleTest {
  id: string;
  ruleId: string;
  candidateId: string;
  status: 'running' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  controlResults: RulePerformance;
  testResults: RulePerformance;
  winner?: 'control' | 'candidate' | 'tie';
}

export interface EvolutionHistory {
  ruleId: string;
  events: Array<{
    timestamp: Date;
    eventType: 'created' | 'mutated' | 'tested' | 'promoted' | 'deprecated';
    details: string;
  }>;
}

export class RuleEvolutionEngine {
  private rules: Map<string, EvolvableRule> = new Map();
  private candidates: Map<string, RuleCandidate> = new Map();
  private mutations: Map<string, RuleMutation> = new Map();
  private tests: Map<string, RuleTest> = new Map();
  private history: Map<string, EvolutionHistory> = new Map();
  private config: RuleEvolutionConfig;

  constructor(config?: Partial<RuleEvolutionConfig>) {
    this.config = {
      enabled: true,
      autoEvolveEnabled: true,
      mutationRate: 0.1,
      testingPeriodDays: 14,
      minSampleSize: 50,
      ...config,
    };

    this.initializeDefaultRules();
  }

  /**
   * Initialize default evolvable rules
   */
  private initializeDefaultRules(): void {
    // Underbilling detection rule
    this.addRule({
      id: 'underbilling-v1',
      name: 'Underbilling Detection',
      description: 'Detect deals priced significantly below pipeline average',
      version: 1,
      leakType: 'underbilling',
      conditions: [
        { field: 'deal_amount', operator: 'less_than', value: 0.7, confidence: 0.85 }, // 70% of average
        { field: 'discount_applied', operator: 'equals', value: false, confidence: 0.6 },
      ],
      actions: [
        { type: 'flag', config: { severity: 'medium' }, priority: 1 },
        { type: 'notify', config: { recipient: 'deal_owner' }, priority: 2 },
      ],
      performance: {
        accuracy: 0.82,
        precision: 0.78,
        recall: 0.85,
        f1Score: 0.81,
        totalApplications: 500,
        successfulApplications: 410,
        averageImpact: 5000,
      },
      status: 'active',
      createdAt: new Date(),
      lastModified: new Date(),
    });

    // Missed renewal detection rule
    this.addRule({
      id: 'missed-renewal-v1',
      name: 'Missed Renewal Detection',
      description: 'Detect contracts approaching renewal without engagement',
      version: 1,
      leakType: 'missed_renewal',
      conditions: [
        { field: 'days_to_renewal', operator: 'less_than', value: 90, confidence: 0.9 },
        { field: 'last_engagement_days', operator: 'greater_than', value: 30, confidence: 0.75 },
      ],
      actions: [
        { type: 'flag', config: { severity: 'high' }, priority: 1 },
        { type: 'create_task', config: { type: 'renewal_outreach' }, priority: 2 },
      ],
      performance: {
        accuracy: 0.75,
        precision: 0.72,
        recall: 0.80,
        f1Score: 0.76,
        totalApplications: 300,
        successfulApplications: 225,
        averageImpact: 15000,
      },
      status: 'active',
      createdAt: new Date(),
      lastModified: new Date(),
    });

    // CS handoff detection rule
    this.addRule({
      id: 'cs-handoff-v1',
      name: 'CS Handoff Detection',
      description: 'Detect won deals without CS owner assignment',
      version: 1,
      leakType: 'stalled_cs_handoff',
      conditions: [
        { field: 'deal_status', operator: 'equals', value: 'won', confidence: 1.0 },
        { field: 'cs_owner', operator: 'equals', value: null, confidence: 0.95 },
        { field: 'days_since_close', operator: 'greater_than', value: 3, confidence: 0.8 },
      ],
      actions: [
        { type: 'auto_assign', config: { assignType: 'round_robin' }, priority: 1 },
        { type: 'notify', config: { recipient: 'cs_manager' }, priority: 2 },
      ],
      performance: {
        accuracy: 0.92,
        precision: 0.90,
        recall: 0.94,
        f1Score: 0.92,
        totalApplications: 200,
        successfulApplications: 184,
        averageImpact: 8000,
      },
      status: 'active',
      createdAt: new Date(),
      lastModified: new Date(),
    });

    // Cross-sell opportunity rule
    this.addRule({
      id: 'crosssell-v1',
      name: 'Cross-sell Opportunity Detection',
      description: 'Detect customers eligible for product expansion',
      version: 1,
      leakType: 'untriggered_crosssell',
      conditions: [
        { field: 'customer_tenure_months', operator: 'greater_than', value: 6, confidence: 0.7 },
        { field: 'product_usage_score', operator: 'greater_than', value: 70, confidence: 0.75 },
        { field: 'has_expansion_potential', operator: 'equals', value: true, confidence: 0.65 },
      ],
      actions: [
        { type: 'flag', config: { severity: 'medium' }, priority: 1 },
        { type: 'create_opportunity', config: { type: 'expansion' }, priority: 2 },
      ],
      performance: {
        accuracy: 0.68,
        precision: 0.65,
        recall: 0.72,
        f1Score: 0.68,
        totalApplications: 150,
        successfulApplications: 102,
        averageImpact: 12000,
      },
      status: 'active',
      createdAt: new Date(),
      lastModified: new Date(),
    });

    // Billing gap rule
    this.addRule({
      id: 'billing-gap-v1',
      name: 'Billing Gap Detection',
      description: 'Detect gaps between service delivery and billing',
      version: 1,
      leakType: 'billing_gap',
      conditions: [
        { field: 'service_delivered', operator: 'equals', value: true, confidence: 0.95 },
        { field: 'invoice_generated', operator: 'equals', value: false, confidence: 0.9 },
        { field: 'days_since_delivery', operator: 'greater_than', value: 7, confidence: 0.85 },
      ],
      actions: [
        { type: 'generate_invoice', config: {}, priority: 1 },
        { type: 'notify', config: { recipient: 'billing_team' }, priority: 2 },
      ],
      performance: {
        accuracy: 0.88,
        precision: 0.85,
        recall: 0.90,
        f1Score: 0.87,
        totalApplications: 250,
        successfulApplications: 220,
        averageImpact: 3500,
      },
      status: 'active',
      createdAt: new Date(),
      lastModified: new Date(),
    });
  }

  /**
   * Add a rule
   */
  addRule(rule: EvolvableRule): void {
    this.rules.set(rule.id, rule);
    this.initializeRuleHistory(rule.id);
    this.recordHistoryEvent(rule.id, 'created', `Rule created: ${rule.name}`);
  }

  /**
   * Initialize history for a rule
   */
  private initializeRuleHistory(ruleId: string): void {
    if (!this.history.has(ruleId)) {
      this.history.set(ruleId, { ruleId, events: [] });
    }
  }

  /**
   * Record a history event
   */
  private recordHistoryEvent(ruleId: string, eventType: string, details: string): void {
    const history = this.history.get(ruleId);
    if (history) {
      history.events.push({
        timestamp: new Date(),
        eventType: eventType as 'created' | 'mutated' | 'tested' | 'promoted' | 'deprecated',
        details,
      });
    }
  }

  /**
   * Generate mutations for a rule
   */
  generateMutations(ruleId: string): RuleMutation[] {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const mutations: RuleMutation[] = [];

    // Threshold adjustments
    for (const condition of rule.conditions) {
      if (typeof condition.value === 'number') {
        // Try increasing threshold
        mutations.push(this.createMutation(
          rule,
          'threshold_adjust',
          {
            field: condition.field,
            originalValue: condition.value,
            newValue: condition.value * 1.1,
          },
          `Increase ${condition.field} threshold by 10% to reduce false positives`
        ));

        // Try decreasing threshold
        mutations.push(this.createMutation(
          rule,
          'threshold_adjust',
          {
            field: condition.field,
            originalValue: condition.value,
            newValue: condition.value * 0.9,
          },
          `Decrease ${condition.field} threshold by 10% to improve recall`
        ));
      }
    }

    // Condition weight adjustments
    const lowConfidenceConditions = rule.conditions.filter(c => c.confidence < 0.7);
    if (lowConfidenceConditions.length > 0) {
      mutations.push(this.createMutation(
        rule,
        'condition_remove',
        {
          removedConditions: lowConfidenceConditions.map(c => c.field),
        },
        'Remove low-confidence conditions to simplify rule'
      ));
    }

    // Store mutations
    for (const mutation of mutations) {
      this.mutations.set(mutation.id, mutation);
    }

    return mutations;
  }

  /**
   * Create a mutation
   */
  private createMutation(
    rule: EvolvableRule,
    type: RuleMutation['mutationType'],
    changes: Record<string, unknown>,
    hypothesis: string
  ): RuleMutation {
    return {
      id: generateId(),
      ruleId: rule.id,
      mutationType: type,
      changes,
      hypothesis,
      status: 'proposed',
      createdAt: new Date(),
    };
  }

  /**
   * Apply a mutation to create a candidate rule
   */
  applyMutation(mutationId: string): RuleCandidate {
    const mutation = this.mutations.get(mutationId);
    if (!mutation) {
      throw new Error(`Mutation ${mutationId} not found`);
    }

    const rule = this.rules.get(mutation.ruleId);
    if (!rule) {
      throw new Error(`Rule ${mutation.ruleId} not found`);
    }

    // Create candidate with mutation applied
    let newConditions = [...rule.conditions];
    const newActions = [...rule.actions];

    switch (mutation.mutationType) {
      case 'threshold_adjust':
        const field = mutation.changes['field'] as string;
        const newValue = mutation.changes['newValue'];
        newConditions = newConditions.map(c =>
          c.field === field ? { ...c, value: newValue } : c
        );
        break;

      case 'condition_remove':
        const toRemove = mutation.changes['removedConditions'] as string[];
        newConditions = newConditions.filter(c => !toRemove.includes(c.field));
        break;

      case 'condition_add':
        const newCondition = mutation.changes['condition'] as RuleCondition;
        newConditions.push(newCondition);
        break;
    }

    const candidate: RuleCandidate = {
      id: generateId(),
      parentRuleId: rule.id,
      conditions: newConditions,
      actions: newActions,
      hypothesis: mutation.hypothesis,
      expectedImprovement: 0.05, // 5% expected improvement
      testPeriod: {
        start: new Date(),
        end: new Date(Date.now() + this.config.testingPeriodDays * 24 * 60 * 60 * 1000),
      },
    };

    this.candidates.set(candidate.id, candidate);
    mutation.status = 'testing';

    this.recordHistoryEvent(rule.id, 'mutated', `Mutation applied: ${mutation.hypothesis}`);

    return candidate;
  }

  /**
   * Start an A/B test for a candidate rule
   */
  startTest(ruleId: string, candidateId: string): RuleTest {
    const rule = this.rules.get(ruleId);
    const candidate = this.candidates.get(candidateId);

    if (!rule || !candidate) {
      throw new Error('Rule or candidate not found');
    }

    const test: RuleTest = {
      id: generateId(),
      ruleId,
      candidateId,
      status: 'running',
      startDate: new Date(),
      controlResults: { ...rule.performance },
      testResults: {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        totalApplications: 0,
        successfulApplications: 0,
        averageImpact: 0,
      },
    };

    this.tests.set(test.id, test);
    this.recordHistoryEvent(ruleId, 'tested', `A/B test started: ${test.id}`);

    return test;
  }

  /**
   * Record test results
   */
  recordTestResults(testId: string, results: Partial<RulePerformance>): void {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    Object.assign(test.testResults, results);
    test.testResults.totalApplications++;
  }

  /**
   * Complete a test and determine winner
   */
  completeTest(testId: string): RuleTest {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'completed';
    test.endDate = new Date();

    // Determine winner based on F1 score
    const controlF1 = test.controlResults.f1Score;
    const testF1 = test.testResults.f1Score;
    const improvementThreshold = 0.02; // 2% improvement required

    if (testF1 > controlF1 + improvementThreshold) {
      test.winner = 'candidate';
    } else if (controlF1 > testF1 + improvementThreshold) {
      test.winner = 'control';
    } else {
      test.winner = 'tie';
    }

    this.recordHistoryEvent(
      test.ruleId,
      'tested',
      `A/B test completed. Winner: ${test.winner}`
    );

    return test;
  }

  /**
   * Promote a winning candidate to active rule
   */
  promoteCandidate(candidateId: string): EvolvableRule {
    const candidate = this.candidates.get(candidateId);
    if (!candidate || !candidate.parentRuleId) {
      throw new Error('Candidate not found or has no parent');
    }

    const parentRule = this.rules.get(candidate.parentRuleId);
    if (!parentRule) {
      throw new Error('Parent rule not found');
    }

    // Create new version of the rule
    const newRule: EvolvableRule = {
      id: `${parentRule.id.replace(/-v\d+$/, '')}-v${parentRule.version + 1}`,
      name: parentRule.name,
      description: parentRule.description,
      version: parentRule.version + 1,
      leakType: parentRule.leakType,
      conditions: candidate.conditions,
      actions: candidate.actions,
      performance: candidate.testResults || parentRule.performance,
      status: 'active',
      parentRuleId: parentRule.id,
      createdAt: new Date(),
      lastModified: new Date(),
    };

    // Deprecate old rule
    parentRule.status = 'deprecated';
    parentRule.lastModified = new Date();

    // Add new rule
    this.rules.set(newRule.id, newRule);
    this.initializeRuleHistory(newRule.id);

    this.recordHistoryEvent(parentRule.id, 'deprecated', `Superseded by ${newRule.id}`);
    this.recordHistoryEvent(newRule.id, 'promoted', `Evolved from ${parentRule.id}`);

    // Clean up candidate
    this.candidates.delete(candidateId);

    return newRule;
  }

  /**
   * Evaluate rules against leaks and update performance
   */
  evaluateRules(leaks: RevenueLeak[]): Map<string, RulePerformance> {
    const results = new Map<string, RulePerformance>();

    for (const rule of this.rules.values()) {
      if (rule.status !== 'active') continue;

      // Find leaks matching this rule's leak type
      const relevantLeaks = leaks.filter(l => l.type === rule.leakType);
      
      if (relevantLeaks.length === 0) continue;

      // Evaluate rule against leaks (simplified evaluation)
      let truePositives = 0;
      let falsePositives = 0;
      let totalImpact = 0;

      for (const leak of relevantLeaks) {
        const matches = this.evaluateConditions(rule.conditions, leak);
        
        if (matches) {
          // Assume detected leaks are true positives
          // In production, this would compare against confirmed outcomes
          truePositives++;
          totalImpact += leak.potentialRevenue;
        }
      }

      // Calculate performance metrics
      const precision = truePositives / (truePositives + falsePositives) || 0;
      const recall = truePositives / relevantLeaks.length || 0;
      const f1Score = (2 * precision * recall) / (precision + recall) || 0;

      const performance: RulePerformance = {
        accuracy: f1Score,
        precision,
        recall,
        f1Score,
        totalApplications: rule.performance.totalApplications + relevantLeaks.length,
        successfulApplications: rule.performance.successfulApplications + truePositives,
        averageImpact: totalImpact / truePositives || rule.performance.averageImpact,
      };

      // Update rule performance (running average)
      rule.performance = this.mergePerformance(rule.performance, performance);
      rule.lastModified = new Date();

      results.set(rule.id, performance);
    }

    return results;
  }

  /**
   * Evaluate conditions against a leak
   */
  private evaluateConditions(conditions: RuleCondition[], leak: RevenueLeak): boolean {
    for (const condition of conditions) {
      const value = this.getLeakValue(leak, condition.field);
      if (!this.evaluateCondition(condition, value)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get value from leak
   */
  private getLeakValue(leak: RevenueLeak, field: string): unknown {
    switch (field) {
      case 'severity':
        return leak.severity;
      case 'potential_revenue':
        return leak.potentialRevenue;
      case 'type':
        return leak.type;
      default:
        return leak.metadata?.[field];
    }
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: RuleCondition, value: unknown): boolean {
    if (value === undefined || value === null) return false;

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      default:
        return false;
    }
  }

  /**
   * Merge performance metrics
   */
  private mergePerformance(
    existing: RulePerformance,
    newPerf: RulePerformance,
    weight: number = 0.3
  ): RulePerformance {
    return {
      accuracy: existing.accuracy * (1 - weight) + newPerf.accuracy * weight,
      precision: existing.precision * (1 - weight) + newPerf.precision * weight,
      recall: existing.recall * (1 - weight) + newPerf.recall * weight,
      f1Score: existing.f1Score * (1 - weight) + newPerf.f1Score * weight,
      totalApplications: existing.totalApplications + newPerf.totalApplications,
      successfulApplications: existing.successfulApplications + newPerf.successfulApplications,
      averageImpact: (existing.averageImpact + newPerf.averageImpact) / 2,
    };
  }

  /**
   * Auto-evolve rules based on performance
   */
  autoEvolve(): { evolvedRules: string[]; mutations: RuleMutation[] } {
    if (!this.config.autoEvolveEnabled) {
      return { evolvedRules: [], mutations: [] };
    }

    const evolvedRules: string[] = [];
    const generatedMutations: RuleMutation[] = [];

    for (const rule of this.rules.values()) {
      if (rule.status !== 'active') continue;

      // Check if rule needs improvement
      const needsImprovement = 
        rule.performance.f1Score < 0.75 ||
        rule.performance.totalApplications >= this.config.minSampleSize;

      if (needsImprovement) {
        // Generate mutations
        const mutations = this.generateMutations(rule.id);
        generatedMutations.push(...mutations);

        // Apply best mutation based on hypothesis
        if (mutations.length > 0 && Math.random() < this.config.mutationRate) {
          const candidate = this.applyMutation(mutations[0].id);
          evolvedRules.push(rule.id);
        }
      }
    }

    return { evolvedRules, mutations: generatedMutations };
  }

  /**
   * Get all active rules
   */
  getActiveRules(): EvolvableRule[] {
    return Array.from(this.rules.values()).filter(r => r.status === 'active');
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): EvolvableRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): EvolvableRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule history
   */
  getRuleHistory(ruleId: string): EvolutionHistory | undefined {
    return this.history.get(ruleId);
  }

  /**
   * Get pending mutations
   */
  getPendingMutations(): RuleMutation[] {
    return Array.from(this.mutations.values()).filter(m => m.status === 'proposed');
  }

  /**
   * Get active tests
   */
  getActiveTests(): RuleTest[] {
    return Array.from(this.tests.values()).filter(t => t.status === 'running');
  }

  /**
   * Get evolution statistics
   */
  getStats(): {
    totalRules: number;
    activeRules: number;
    deprecatedRules: number;
    averagePerformance: number;
    pendingMutations: number;
    activeTests: number;
    promotedRules: number;
  } {
    const rules = this.getAllRules();
    const active = rules.filter(r => r.status === 'active');
    const deprecated = rules.filter(r => r.status === 'deprecated');
    const avgPerf = active.length > 0
      ? active.reduce((sum, r) => sum + r.performance.f1Score, 0) / active.length
      : 0;

    return {
      totalRules: rules.length,
      activeRules: active.length,
      deprecatedRules: deprecated.length,
      averagePerformance: avgPerf,
      pendingMutations: this.getPendingMutations().length,
      activeTests: this.getActiveTests().length,
      promotedRules: rules.filter(r => r.parentRuleId).length,
    };
  }
}

export default RuleEvolutionEngine;
