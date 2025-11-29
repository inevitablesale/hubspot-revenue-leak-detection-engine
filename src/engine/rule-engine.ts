/**
 * Configurable Detection Rule Engine
 * Allows admins to create and manage custom detection rules without code
 */

import { Deal, Contact, Company, RevenueLeak, LeakType, LeakSeverity } from '../types';
import { generateId, daysBetween } from '../utils/helpers';

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 
            'not_contains' | 'is_empty' | 'is_not_empty' | 'days_until' | 
            'days_since' | 'matches_regex' | 'in_list' | 'not_in_list';
  value: string | number | boolean | string[];
  valueType?: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  ruleType: LeakType | 'custom';
  targetEntity: 'deal' | 'contact' | 'company' | 'ticket';
  conditions: RuleCondition[];
  conditionLogic: 'all' | 'any'; // AND vs OR
  severity: LeakSeverity;
  suggestedAction: string;
  isEnabled: boolean;
  isSystemRule: boolean;
  // Automation settings
  autoCreateTask: boolean;
  taskOwnerType?: 'record_owner' | 'specific_user' | 'cs_owner' | 'sales_manager';
  taskOwnerId?: string;
  taskSubject?: string;
  taskBody?: string;
  taskDueDays?: number;
  // Notification settings
  notifySlack: boolean;
  slackChannel?: string;
  notifyTeams: boolean;
  teamsChannel?: string;
  // Tracking
  triggerCount: number;
  lastTriggered?: Date;
  createdAt: Date;
  createdBy?: string;
  updatedAt?: Date;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  entityId: string;
  entityType: string;
  entityName?: string;
  matchedConditions: string[];
  failedConditions: string[];
  leak?: RevenueLeak;
  taskCreated?: boolean;
  notificationsSent?: string[];
}

export interface RuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RuleTestResult {
  rule: DetectionRule;
  sampleSize: number;
  matchCount: number;
  matchedEntities: Array<{ id: string; name: string }>;
  estimatedLeaksPerDay: number;
  executionTimeMs: number;
}

export class ConfigurableRuleEngine {
  private rules: Map<string, DetectionRule> = new Map();
  private evaluationHistory: RuleEvaluationResult[] = [];

  constructor() {
    this.initializeSystemRules();
  }

  /**
   * Initialize built-in system rules
   */
  private initializeSystemRules(): void {
    // CS Handoff rule - Detect if deal has no CS owner within 3 days
    this.addRule({
      id: 'system-cs-handoff-3days',
      name: 'No CS Owner Within 3 Days',
      description: 'Detect if deal has no CS owner assigned within 3 days of closing',
      ruleType: 'stalled_cs_handoff',
      targetEntity: 'deal',
      conditions: [
        { field: 'dealstage', operator: 'equals', value: 'closedwon' },
        { field: 'closedate', operator: 'days_since', value: 3 },
        { field: 'cs_owner', operator: 'is_empty', value: true }
      ],
      conditionLogic: 'all',
      severity: 'high',
      suggestedAction: 'Assign a Customer Success owner immediately to ensure proper onboarding',
      isEnabled: true,
      isSystemRule: true,
      autoCreateTask: true,
      taskOwnerType: 'sales_manager',
      taskSubject: 'Urgent: Assign CS Owner to Won Deal',
      taskDueDays: 1,
      notifySlack: false,
      notifyTeams: false,
      triggerCount: 0,
      createdAt: new Date()
    });

    // Stale pipeline rule
    this.addRule({
      id: 'system-stale-pipeline-30days',
      name: 'Deal Stale for 30+ Days',
      description: 'Detect deals that have not progressed in over 30 days',
      ruleType: 'stale_pipeline',
      targetEntity: 'deal',
      conditions: [
        { field: 'dealstage', operator: 'not_equals', value: 'closedwon' },
        { field: 'dealstage', operator: 'not_equals', value: 'closedlost' },
        { field: 'hs_lastmodifieddate', operator: 'days_since', value: 30 }
      ],
      conditionLogic: 'all',
      severity: 'medium',
      suggestedAction: 'Review deal status and update or close if no longer active',
      isEnabled: true,
      isSystemRule: true,
      autoCreateTask: true,
      taskOwnerType: 'record_owner',
      taskSubject: 'Review Stale Deal',
      taskDueDays: 3,
      notifySlack: false,
      notifyTeams: false,
      triggerCount: 0,
      createdAt: new Date()
    });

    // Renewal approaching without engagement
    this.addRule({
      id: 'system-renewal-no-engagement',
      name: 'Renewal Approaching - No Recent Engagement',
      description: 'Contract renewal within 60 days but no customer contact in last 30 days',
      ruleType: 'missed_renewal',
      targetEntity: 'deal',
      conditions: [
        { field: 'renewal_date', operator: 'days_until', value: 60 },
        { field: 'notes_last_updated', operator: 'days_since', value: 30 }
      ],
      conditionLogic: 'all',
      severity: 'high',
      suggestedAction: 'Initiate renewal conversation with customer immediately',
      isEnabled: true,
      isSystemRule: true,
      autoCreateTask: true,
      taskOwnerType: 'record_owner',
      taskSubject: 'Urgent: Customer Renewal Conversation Needed',
      taskDueDays: 2,
      notifySlack: false,
      notifyTeams: false,
      triggerCount: 0,
      createdAt: new Date()
    });

    // Missing contact email
    this.addRule({
      id: 'system-missing-email',
      name: 'Contact Missing Email',
      description: 'Contact record is missing email address',
      ruleType: 'data_quality',
      targetEntity: 'contact',
      conditions: [
        { field: 'email', operator: 'is_empty', value: true }
      ],
      conditionLogic: 'all',
      severity: 'low',
      suggestedAction: 'Add email address to contact record',
      isEnabled: true,
      isSystemRule: true,
      autoCreateTask: false,
      notifySlack: false,
      notifyTeams: false,
      triggerCount: 0,
      createdAt: new Date()
    });

    // High-value deal with no activity
    this.addRule({
      id: 'system-high-value-no-activity',
      name: 'High-Value Deal Without Activity',
      description: 'Deal over $50,000 with no activity in 14 days',
      ruleType: 'stale_pipeline',
      targetEntity: 'deal',
      conditions: [
        { field: 'amount', operator: 'greater_than', value: 50000 },
        { field: 'dealstage', operator: 'not_in_list', value: ['closedwon', 'closedlost'] },
        { field: 'notes_last_updated', operator: 'days_since', value: 14 }
      ],
      conditionLogic: 'all',
      severity: 'critical',
      suggestedAction: 'Immediately contact prospect and update deal status',
      isEnabled: true,
      isSystemRule: true,
      autoCreateTask: true,
      taskOwnerType: 'record_owner',
      taskSubject: 'URGENT: High-Value Deal Needs Attention',
      taskDueDays: 1,
      notifySlack: true,
      notifyTeams: false,
      triggerCount: 0,
      createdAt: new Date()
    });
  }

  /**
   * Add a new detection rule
   */
  addRule(rule: DetectionRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Update an existing rule
   */
  updateRule(ruleId: string, updates: Partial<DetectionRule>): DetectionRule | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;
    
    // Don't allow modifying system rule core properties
    if (rule.isSystemRule) {
      const allowedUpdates: (keyof DetectionRule)[] = [
        'isEnabled', 'severity', 'autoCreateTask', 'taskOwnerType',
        'taskOwnerId', 'taskSubject', 'taskDueDays', 'notifySlack',
        'slackChannel', 'notifyTeams', 'teamsChannel'
      ];
      
      const filteredUpdates: Partial<DetectionRule> = {};
      for (const key of allowedUpdates) {
        if (key in updates) {
          (filteredUpdates as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key];
        }
      }
      updates = filteredUpdates;
    }

    const updatedRule = { ...rule, ...updates, updatedAt: new Date() };
    this.rules.set(ruleId, updatedRule);
    return updatedRule;
  }

  /**
   * Delete a rule (only custom rules can be deleted)
   */
  deleteRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule || rule.isSystemRule) return false;
    return this.rules.delete(ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): DetectionRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get active rules
   */
  getActiveRules(): DetectionRule[] {
    return this.getRules().filter(r => r.isEnabled);
  }

  /**
   * Get rules by entity type
   */
  getRulesByEntityType(entityType: DetectionRule['targetEntity']): DetectionRule[] {
    return this.getRules().filter(r => r.targetEntity === entityType);
  }

  /**
   * Get a specific rule
   */
  getRule(ruleId: string): DetectionRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Validate a rule definition
   */
  validateRule(rule: Partial<DetectionRule>): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rule.name?.trim()) {
      errors.push('Rule name is required');
    }

    if (!rule.targetEntity) {
      errors.push('Target entity type is required');
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      errors.push('At least one condition is required');
    } else {
      rule.conditions.forEach((cond, index) => {
        if (!cond.field) {
          errors.push(`Condition ${index + 1}: Field is required`);
        }
        if (!cond.operator) {
          errors.push(`Condition ${index + 1}: Operator is required`);
        }
        if (cond.value === undefined && !['is_empty', 'is_not_empty'].includes(cond.operator)) {
          errors.push(`Condition ${index + 1}: Value is required`);
        }
      });
    }

    if (!rule.severity) {
      warnings.push('No severity specified, will default to medium');
    }

    if (!rule.suggestedAction?.trim()) {
      warnings.push('No suggested action provided');
    }

    if (rule.autoCreateTask && !rule.taskOwnerType) {
      warnings.push('Auto-create task enabled but no owner type specified');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Evaluate rules against deals
   */
  evaluateDeals(deals: Deal[]): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    const dealRules = this.getActiveRules().filter(r => r.targetEntity === 'deal');

    for (const deal of deals) {
      for (const rule of dealRules) {
        const result = this.evaluateEntity(rule, deal, 'deal', deal.properties.dealname);
        results.push(result);
        if (result.matched) {
          rule.triggerCount++;
          rule.lastTriggered = new Date();
        }
      }
    }

    this.evaluationHistory.push(...results.filter(r => r.matched));
    return results;
  }

  /**
   * Evaluate rules against contacts
   */
  evaluateContacts(contacts: Contact[]): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    const contactRules = this.getActiveRules().filter(r => r.targetEntity === 'contact');

    for (const contact of contacts) {
      for (const rule of contactRules) {
        const name = `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim();
        const result = this.evaluateEntity(rule, contact, 'contact', name);
        results.push(result);
        if (result.matched) {
          rule.triggerCount++;
          rule.lastTriggered = new Date();
        }
      }
    }

    this.evaluationHistory.push(...results.filter(r => r.matched));
    return results;
  }

  /**
   * Evaluate rules against companies
   */
  evaluateCompanies(companies: Company[]): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    const companyRules = this.getActiveRules().filter(r => r.targetEntity === 'company');

    for (const company of companies) {
      for (const rule of companyRules) {
        const result = this.evaluateEntity(rule, company, 'company', company.properties.name);
        results.push(result);
        if (result.matched) {
          rule.triggerCount++;
          rule.lastTriggered = new Date();
        }
      }
    }

    this.evaluationHistory.push(...results.filter(r => r.matched));
    return results;
  }

  /**
   * Evaluate a single entity against a rule
   */
  private evaluateEntity(
    rule: DetectionRule,
    entity: Deal | Contact | Company,
    entityType: string,
    entityName?: string
  ): RuleEvaluationResult {
    const matchedConditions: string[] = [];
    const failedConditions: string[] = [];

    for (const condition of rule.conditions) {
      const value = this.getFieldValue(entity.properties, condition.field);
      const conditionMet = this.evaluateCondition(condition, value);
      
      const conditionDesc = `${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`;
      if (conditionMet) {
        matchedConditions.push(conditionDesc);
      } else {
        failedConditions.push(conditionDesc);
      }
    }

    // Determine if rule matched based on logic type
    const matched = rule.conditionLogic === 'all'
      ? failedConditions.length === 0
      : matchedConditions.length > 0;

    const result: RuleEvaluationResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      matched,
      entityId: entity.id,
      entityType,
      entityName,
      matchedConditions,
      failedConditions
    };

    if (matched) {
      result.leak = this.createLeakFromRule(rule, entity, entityType, entityName);
    }

    return result;
  }

  /**
   * Get field value from entity properties (supports dot notation)
   */
  private getFieldValue(properties: Record<string, unknown>, field: string): unknown {
    const parts = field.split('.');
    let value: unknown = properties;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    
    return value;
  }

  /**
   * Parse a value as numeric (handles string numbers from HubSpot)
   */
  private parseNumericValue(value: unknown): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: RuleCondition, value: unknown): boolean {
    // Try to convert string values to numbers for numeric comparisons
    const numericValue = this.parseNumericValue(value);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      
      case 'not_equals':
        return value !== condition.value;
      
      case 'greater_than':
        return numericValue !== null && numericValue > (condition.value as number);
      
      case 'less_than':
        return numericValue !== null && numericValue < (condition.value as number);
      
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value as string);
      
      case 'not_contains':
        return typeof value === 'string' && !value.includes(condition.value as string);
      
      case 'is_empty':
        return value === null || value === undefined || value === '';
      
      case 'is_not_empty':
        return value !== null && value !== undefined && value !== '';
      
      case 'days_until':
        if (typeof value === 'string') {
          const targetDate = new Date(value);
          const days = daysBetween(new Date(), targetDate);
          return days <= (condition.value as number) && days > 0;
        }
        return false;
      
      case 'days_since':
        if (typeof value === 'string') {
          const targetDate = new Date(value);
          const days = daysBetween(targetDate, new Date());
          return days >= (condition.value as number);
        }
        return false;
      
      case 'matches_regex':
        if (typeof value === 'string') {
          try {
            const regex = new RegExp(condition.value as string);
            return regex.test(value);
          } catch {
            return false;
          }
        }
        return false;
      
      case 'in_list':
        if (Array.isArray(condition.value)) {
          return condition.value.includes(value as string);
        }
        return false;
      
      case 'not_in_list':
        if (Array.isArray(condition.value)) {
          return !condition.value.includes(value as string);
        }
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Create a RevenueLeak from a matched rule
   */
  private createLeakFromRule(
    rule: DetectionRule,
    entity: Deal | Contact | Company,
    entityType: string,
    entityName?: string
  ): RevenueLeak {
    const potentialRevenue = this.estimatePotentialRevenue(entity, rule);

    return {
      id: generateId(),
      type: rule.ruleType === 'custom' ? 'data_quality' : rule.ruleType,
      severity: rule.severity,
      description: `${rule.name}: ${rule.description}`,
      potentialRevenue,
      affectedEntity: {
        type: entityType as 'deal' | 'contact' | 'company',
        id: entity.id,
        name: entityName
      },
      detectedAt: new Date(),
      suggestedActions: [{
        id: generateId(),
        type: rule.autoCreateTask ? 'create_task' : 'manual_review',
        title: rule.autoCreateTask ? 'Review and Take Action' : 'Manual Review Required',
        description: rule.suggestedAction,
        priority: rule.severity === 'critical' ? 'high' : rule.severity === 'high' ? 'high' : 'medium'
      }],
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        detectionSource: rule.isSystemRule ? 'system_rule' : 'custom_rule'
      }
    };
  }

  /**
   * Estimate potential revenue impact
   */
  private estimatePotentialRevenue(entity: Deal | Contact | Company, rule: DetectionRule): number {
    // Try to get amount from deal
    if ('amount' in (entity.properties as Record<string, unknown>)) {
      const amount = parseFloat((entity.properties as Record<string, unknown>).amount as string || '0');
      if (amount > 0) return amount;
    }

    // Try to get annual revenue from company
    if ('annualrevenue' in (entity.properties as Record<string, unknown>)) {
      const revenue = parseFloat((entity.properties as Record<string, unknown>).annualrevenue as string || '0');
      if (revenue > 0) return revenue * 0.1; // Estimate 10% at risk
    }

    // Default estimates by severity
    const defaultEstimates: Record<LeakSeverity, number> = {
      critical: 25000,
      high: 10000,
      medium: 5000,
      low: 1000
    };

    return defaultEstimates[rule.severity];
  }

  /**
   * Test a rule against sample data without persisting
   */
  testRule(rule: DetectionRule, entities: Array<Deal | Contact | Company>): RuleTestResult {
    const startTime = Date.now();
    const matchedEntities: Array<{ id: string; name: string }> = [];

    for (const entity of entities) {
      const props = entity.properties as Record<string, unknown>;
      let name = '';
      
      if (rule.targetEntity === 'deal') {
        name = (props.dealname as string) || entity.id;
      } else if (rule.targetEntity === 'contact') {
        name = `${props.firstname || ''} ${props.lastname || ''}`.trim() || entity.id;
      } else {
        name = (props.name as string) || entity.id;
      }

      const result = this.evaluateEntity(rule, entity, rule.targetEntity, name);
      if (result.matched) {
        matchedEntities.push({ id: entity.id, name });
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const matchCount = matchedEntities.length;
    const sampleSize = entities.length;

    // Estimate daily leaks based on sample match rate
    const matchRate = sampleSize > 0 ? matchCount / sampleSize : 0;
    const estimatedLeaksPerDay = Math.round(matchRate * 100); // Rough estimate

    return {
      rule,
      sampleSize,
      matchCount,
      matchedEntities: matchedEntities.slice(0, 10), // Limit to 10 examples
      estimatedLeaksPerDay,
      executionTimeMs
    };
  }

  /**
   * Get evaluation statistics
   */
  getStats(): {
    totalRules: number;
    activeRules: number;
    systemRules: number;
    customRules: number;
    totalTriggers: number;
    topRules: Array<{ id: string; name: string; triggerCount: number }>;
  } {
    const rules = this.getRules();
    const totalTriggers = rules.reduce((sum, r) => sum + r.triggerCount, 0);
    const topRules = [...rules]
      .sort((a, b) => b.triggerCount - a.triggerCount)
      .slice(0, 5)
      .map(r => ({ id: r.id, name: r.name, triggerCount: r.triggerCount }));

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isEnabled).length,
      systemRules: rules.filter(r => r.isSystemRule).length,
      customRules: rules.filter(r => !r.isSystemRule).length,
      totalTriggers,
      topRules
    };
  }

  /**
   * Get recent evaluation history
   */
  getEvaluationHistory(limit: number = 100): RuleEvaluationResult[] {
    return this.evaluationHistory.slice(-limit);
  }

  /**
   * Create a rule from a template
   */
  createRuleFromTemplate(
    templateId: string,
    customizations: Partial<DetectionRule>
  ): DetectionRule | null {
    const templates = this.getRuleTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) return null;

    const newRule: DetectionRule = {
      ...template,
      id: generateId(),
      isSystemRule: false,
      triggerCount: 0,
      createdAt: new Date(),
      ...customizations
    };

    this.addRule(newRule);
    return newRule;
  }

  /**
   * Get available rule templates
   */
  getRuleTemplates(): DetectionRule[] {
    return this.getRules().filter(r => r.isSystemRule);
  }

  /**
   * Export rules to JSON
   */
  exportRules(): string {
    const rules = this.getRules().filter(r => !r.isSystemRule);
    return JSON.stringify(rules, null, 2);
  }

  /**
   * Import rules from JSON
   */
  importRules(json: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const rules = JSON.parse(json) as DetectionRule[];
      
      for (const rule of rules) {
        const validation = this.validateRule(rule);
        if (validation.isValid) {
          rule.id = generateId(); // Generate new ID
          rule.isSystemRule = false; // Imported rules are never system rules
          rule.triggerCount = 0;
          rule.createdAt = new Date();
          this.addRule(rule);
          imported++;
        } else {
          errors.push(`Rule "${rule.name}": ${validation.errors.join(', ')}`);
        }
      }
    } catch (e) {
      errors.push(`Invalid JSON: ${(e as Error).message}`);
    }

    return { imported, errors };
  }
}

export default ConfigurableRuleEngine;
