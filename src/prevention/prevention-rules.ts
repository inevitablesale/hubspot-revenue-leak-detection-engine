/**
 * Leak Prevention Rules
 * Proactive rules to prevent revenue leaks before they occur
 */

import { Deal, Contact, Company, Contract, RevenueLeak, LeakType } from '../types';
import { generateId, daysBetween } from '../utils/helpers';

export interface PreventionRule {
  id: string;
  name: string;
  description: string;
  targetLeakType: LeakType;
  conditions: RuleCondition[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  triggerActions: PreventionAction[];
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty' | 'days_until' | 'days_since';
  value: string | number | boolean;
  entityType: 'deal' | 'contact' | 'company' | 'contract';
}

export interface PreventionAction {
  type: 'alert' | 'task' | 'workflow' | 'property_update' | 'notification';
  config: Record<string, unknown>;
}

export interface PreventionAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  message: string;
  suggestedAction: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  dismissed: boolean;
  resolvedAt?: Date;
}

export interface PreventionSummary {
  activeRules: number;
  alertsToday: number;
  alertsThisWeek: number;
  preventedLeaks: number;
  estimatedSavings: number;
  topRisks: PreventionAlert[];
}

export class LeakPreventionEngine {
  private rules: Map<string, PreventionRule> = new Map();
  private alerts: PreventionAlert[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default prevention rules
   */
  private initializeDefaultRules(): void {
    // Renewal prevention rule
    this.addRule({
      id: 'prevent-missed-renewal',
      name: 'Renewal Approaching Without Contact',
      description: 'Alert when contract renewal is within 60 days with no recent customer contact',
      targetLeakType: 'missed_renewal',
      conditions: [
        { field: 'renewal_date', operator: 'days_until', value: 60, entityType: 'contract' },
        { field: 'last_contact_date', operator: 'days_since', value: 30, entityType: 'contact' },
      ],
      priority: 'high',
      enabled: true,
      triggerActions: [
        { type: 'alert', config: { channel: 'email', recipient: 'cs_owner' } },
        { type: 'task', config: { type: 'CALL', subject: 'Renewal Discussion' } },
      ],
      createdAt: new Date(),
      triggerCount: 0,
    });

    // CS Handoff prevention
    this.addRule({
      id: 'prevent-cs-handoff',
      name: 'New Deal Without CS Assignment',
      description: 'Alert when deal is won but no CS owner assigned within 48 hours',
      targetLeakType: 'stalled_cs_handoff',
      conditions: [
        { field: 'dealstage', operator: 'equals', value: 'closedwon', entityType: 'deal' },
        { field: 'closedate', operator: 'days_since', value: 2, entityType: 'deal' },
        { field: 'cs_owner', operator: 'is_empty', value: true, entityType: 'deal' },
      ],
      priority: 'critical',
      enabled: true,
      triggerActions: [
        { type: 'alert', config: { channel: 'slack', priority: 'urgent' } },
        { type: 'notification', config: { type: 'push', title: 'CS Assignment Needed' } },
      ],
      createdAt: new Date(),
      triggerCount: 0,
    });

    // Underbilling prevention
    this.addRule({
      id: 'prevent-underbilling',
      name: 'Deal Value Below Pipeline Average',
      description: 'Alert when deal is created significantly below pipeline average',
      targetLeakType: 'underbilling',
      conditions: [
        { field: 'amount', operator: 'less_than', value: 0.7, entityType: 'deal' }, // 70% of average
        { field: 'dealstage', operator: 'not_equals', value: 'closedlost', entityType: 'deal' },
      ],
      priority: 'medium',
      enabled: true,
      triggerActions: [
        { type: 'alert', config: { channel: 'email', recipient: 'sales_manager' } },
      ],
      createdAt: new Date(),
      triggerCount: 0,
    });

    // Billing gap prevention
    this.addRule({
      id: 'prevent-billing-gap',
      name: 'Invoice Overdue Warning',
      description: 'Alert when invoice approaches 30 days overdue',
      targetLeakType: 'billing_gap',
      conditions: [
        { field: 'hs_invoice_status', operator: 'not_equals', value: 'paid', entityType: 'deal' },
        { field: 'hs_due_date', operator: 'days_since', value: 25, entityType: 'deal' },
      ],
      priority: 'high',
      enabled: true,
      triggerActions: [
        { type: 'task', config: { type: 'CALL', subject: 'Invoice Follow-up' } },
        { type: 'workflow', config: { workflowId: 'collections-sequence' } },
      ],
      createdAt: new Date(),
      triggerCount: 0,
    });

    // Cross-sell opportunity prevention
    this.addRule({
      id: 'prevent-crosssell-miss',
      name: 'High-Value Customer Without Expansion',
      description: 'Alert for customers with high LTV but no expansion deals in 6 months',
      targetLeakType: 'untriggered_crosssell',
      conditions: [
        { field: 'total_revenue', operator: 'greater_than', value: 50000, entityType: 'company' },
        { field: 'last_deal_date', operator: 'days_since', value: 180, entityType: 'company' },
      ],
      priority: 'medium',
      enabled: true,
      triggerActions: [
        { type: 'alert', config: { channel: 'email', recipient: 'account_manager' } },
      ],
      createdAt: new Date(),
      triggerCount: 0,
    });

    // Lifecycle path prevention
    this.addRule({
      id: 'prevent-lifecycle-skip',
      name: 'Lifecycle Stage Skip Warning',
      description: 'Alert when contact jumps stages without proper qualification',
      targetLeakType: 'invalid_lifecycle_path',
      conditions: [
        { field: 'lifecyclestage_change', operator: 'greater_than', value: 2, entityType: 'contact' },
      ],
      priority: 'low',
      enabled: true,
      triggerActions: [
        { type: 'property_update', config: { property: 'needs_review', value: true } },
      ],
      createdAt: new Date(),
      triggerCount: 0,
    });
  }

  /**
   * Add a prevention rule
   */
  addRule(rule: PreventionRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Get all rules
   */
  getRules(): PreventionRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get active (enabled) rules
   */
  getActiveRules(): PreventionRule[] {
    return Array.from(this.rules.values()).filter(r => r.enabled);
  }

  /**
   * Evaluate deals against prevention rules
   */
  evaluateDeals(deals: Deal[]): PreventionAlert[] {
    const newAlerts: PreventionAlert[] = [];
    const dealRules = this.getActiveRules().filter(r => 
      r.conditions.some(c => c.entityType === 'deal')
    );

    for (const deal of deals) {
      for (const rule of dealRules) {
        if (this.evaluateConditions(rule.conditions, deal, 'deal')) {
          const alert = this.createAlert(rule, 'deal', deal.id, deal.properties.dealname);
          newAlerts.push(alert);
          this.alerts.push(alert);
          
          rule.lastTriggered = new Date();
          rule.triggerCount++;
        }
      }
    }

    return newAlerts;
  }

  /**
   * Evaluate contracts against prevention rules
   */
  evaluateContracts(contracts: Contract[]): PreventionAlert[] {
    const newAlerts: PreventionAlert[] = [];
    const contractRules = this.getActiveRules().filter(r => 
      r.conditions.some(c => c.entityType === 'contract')
    );

    for (const contract of contracts) {
      for (const rule of contractRules) {
        if (this.evaluateConditions(rule.conditions, contract, 'contract')) {
          const alert = this.createAlert(rule, 'contract', contract.id, contract.properties.contract_name);
          newAlerts.push(alert);
          this.alerts.push(alert);
          
          rule.lastTriggered = new Date();
          rule.triggerCount++;
        }
      }
    }

    return newAlerts;
  }

  /**
   * Evaluate contacts against prevention rules
   */
  evaluateContacts(contacts: Contact[]): PreventionAlert[] {
    const newAlerts: PreventionAlert[] = [];
    const contactRules = this.getActiveRules().filter(r => 
      r.conditions.some(c => c.entityType === 'contact')
    );

    for (const contact of contacts) {
      for (const rule of contactRules) {
        if (this.evaluateConditions(rule.conditions, contact, 'contact')) {
          const alert = this.createAlert(
            rule, 
            'contact', 
            contact.id, 
            `${contact.properties.firstname} ${contact.properties.lastname}`
          );
          newAlerts.push(alert);
          this.alerts.push(alert);
          
          rule.lastTriggered = new Date();
          rule.triggerCount++;
        }
      }
    }

    return newAlerts;
  }

  /**
   * Evaluate conditions against an entity
   */
  private evaluateConditions(
    conditions: RuleCondition[], 
    entity: Deal | Contact | Company | Contract, 
    entityType: string
  ): boolean {
    for (const condition of conditions) {
      if (condition.entityType !== entityType) {
        continue;
      }

      const value = (entity.properties as Record<string, unknown>)[condition.field];
      
      if (!this.evaluateCondition(condition, value)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: RuleCondition, value: unknown): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return typeof value === 'number' && value > (condition.value as number);
      case 'less_than':
        return typeof value === 'number' && value < (condition.value as number);
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
      default:
        return false;
    }
  }

  /**
   * Create a prevention alert
   */
  private createAlert(
    rule: PreventionRule, 
    entityType: string, 
    entityId: string, 
    entityName?: string
  ): PreventionAlert {
    return {
      id: generateId(),
      ruleId: rule.id,
      ruleName: rule.name,
      entityType,
      entityId,
      entityName,
      message: `Prevention rule triggered: ${rule.description}`,
      suggestedAction: this.getSuggestedAction(rule),
      risk: rule.priority,
      detectedAt: new Date(),
      dismissed: false,
    };
  }

  /**
   * Get suggested action text for rule
   */
  private getSuggestedAction(rule: PreventionRule): string {
    const actions: string[] = [];
    
    for (const action of rule.triggerActions) {
      switch (action.type) {
        case 'task':
          actions.push(`Create ${action.config.type} task: "${action.config.subject}"`);
          break;
        case 'alert':
          actions.push(`Send alert via ${action.config.channel}`);
          break;
        case 'workflow':
          actions.push(`Trigger workflow: ${action.config.workflowId}`);
          break;
        case 'notification':
          actions.push('Send push notification');
          break;
        case 'property_update':
          actions.push(`Update property: ${action.config.property}`);
          break;
      }
    }
    
    return actions.join(', ') || 'Review and take appropriate action';
  }

  /**
   * Dismiss an alert
   */
  dismissAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date();
    }
  }

  /**
   * Get active alerts (not dismissed or resolved)
   */
  getActiveAlerts(): PreventionAlert[] {
    return this.alerts.filter(a => !a.dismissed && !a.resolvedAt);
  }

  /**
   * Get alerts by risk level
   */
  getAlertsByRisk(risk: PreventionAlert['risk']): PreventionAlert[] {
    return this.alerts.filter(a => a.risk === risk && !a.dismissed && !a.resolvedAt);
  }

  /**
   * Get prevention summary
   */
  getSummary(): PreventionSummary {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const alertsToday = this.alerts.filter(a => a.detectedAt >= todayStart).length;
    const alertsThisWeek = this.alerts.filter(a => a.detectedAt >= weekStart).length;
    const resolved = this.alerts.filter(a => a.resolvedAt);

    return {
      activeRules: this.getActiveRules().length,
      alertsToday,
      alertsThisWeek,
      preventedLeaks: resolved.length,
      estimatedSavings: resolved.length * 5000, // Rough estimate
      topRisks: this.getActiveAlerts()
        .sort((a, b) => {
          const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return riskOrder[a.risk] - riskOrder[b.risk];
        })
        .slice(0, 5),
    };
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }
}

export default LeakPreventionEngine;
