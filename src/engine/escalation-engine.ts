/**
 * Escalation Chain Engine
 * Auto-creates tasks and manages escalation chains for unresolved leaks
 */

import { RevenueLeak, LeakType, LeakSeverity } from '../types';
import { generateId, daysBetween } from '../utils/helpers';

export interface EscalationRule {
  id: string;
  name: string;
  description: string;
  leakTypeFilter: LeakType | 'all';
  minSeverity: LeakSeverity;
  triggerCondition: 'days_unresolved' | 'revenue_threshold' | 'multiple_leaks' | 'task_overdue' | 'manual';
  daysThreshold?: number;
  revenueThreshold?: number;
  escalationLevel: 'level_1' | 'level_2' | 'level_3' | 'level_4';
  escalationAction: 'create_task' | 'send_email' | 'slack_notify' | 'teams_notify' | 'reassign_owner' | 'trigger_workflow' | 'multiple';
  escalationActionsConfig?: EscalationActionConfig[];
  escalateToUserId?: string;
  escalateToTeam?: string;
  workflowId?: string;
  notificationMessage?: string;
  isEnabled: boolean;
  priority: number;
  triggerCount: number;
  lastTriggered?: Date;
  nextEscalationRuleId?: string; // Chain to next level
  createdAt: Date;
}

export interface EscalationActionConfig {
  type: 'create_task' | 'send_email' | 'slack_notify' | 'teams_notify' | 'reassign_owner' | 'trigger_workflow';
  config: {
    assignTo?: string;
    channel?: string;
    workflowId?: string;
    message?: string;
    priority?: 'low' | 'medium' | 'high';
    dueInDays?: number;
  };
}

export interface EscalationEvent {
  id: string;
  leakId: string;
  ruleId: string;
  ruleName: string;
  escalationLevel: string;
  actionsTaken: string[];
  triggeredAt: Date;
  previousOwnerId?: string;
  newOwnerId?: string;
  taskId?: string;
  notificationsSent?: string[];
}

export interface PendingEscalation {
  leak: RevenueLeak;
  rule: EscalationRule;
  daysUntilEscalation: number;
  estimatedEscalationDate: Date;
}

export interface TaskCreationResult {
  success: boolean;
  taskId?: string;
  assignedTo?: string;
  dueDate?: Date;
  error?: string;
}

export class EscalationEngine {
  private rules: Map<string, EscalationRule> = new Map();
  private escalationHistory: EscalationEvent[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default escalation rules
   */
  private initializeDefaultRules(): void {
    // Level 1: Team Lead after 3 days
    this.addRule({
      id: 'escalate-level-1-3days',
      name: 'Escalate to Team Lead After 3 Days',
      description: 'Escalate unresolved leaks to team lead after 3 days',
      leakTypeFilter: 'all',
      minSeverity: 'medium',
      triggerCondition: 'days_unresolved',
      daysThreshold: 3,
      escalationLevel: 'level_1',
      escalationAction: 'create_task',
      escalateToTeam: 'team_lead',
      notificationMessage: 'This revenue leak has been unresolved for 3 days and requires your attention.',
      isEnabled: true,
      priority: 1,
      triggerCount: 0,
      nextEscalationRuleId: 'escalate-level-2-7days',
      createdAt: new Date()
    });

    // Level 2: Manager after 7 days
    this.addRule({
      id: 'escalate-level-2-7days',
      name: 'Escalate to Manager After 7 Days',
      description: 'Escalate unresolved leaks to manager after 7 days',
      leakTypeFilter: 'all',
      minSeverity: 'medium',
      triggerCondition: 'days_unresolved',
      daysThreshold: 7,
      escalationLevel: 'level_2',
      escalationAction: 'multiple',
      escalationActionsConfig: [
        { type: 'create_task', config: { assignTo: 'manager', priority: 'high', dueInDays: 2 } },
        { type: 'slack_notify', config: { channel: '#revenue-alerts', message: 'Revenue leak escalated to manager level' } }
      ],
      notificationMessage: 'This revenue leak has been unresolved for 7 days and has been escalated to management.',
      isEnabled: true,
      priority: 2,
      triggerCount: 0,
      nextEscalationRuleId: 'escalate-level-3-14days',
      createdAt: new Date()
    });

    // Level 3: Director after 14 days
    this.addRule({
      id: 'escalate-level-3-14days',
      name: 'Escalate to Director After 14 Days',
      description: 'Escalate unresolved leaks to director after 14 days',
      leakTypeFilter: 'all',
      minSeverity: 'high',
      triggerCondition: 'days_unresolved',
      daysThreshold: 14,
      escalationLevel: 'level_3',
      escalationAction: 'multiple',
      escalationActionsConfig: [
        { type: 'create_task', config: { assignTo: 'director', priority: 'high', dueInDays: 1 } },
        { type: 'send_email', config: { message: 'Urgent: Revenue leak requires director attention' } },
        { type: 'slack_notify', config: { channel: '#executive-alerts' } }
      ],
      notificationMessage: 'URGENT: This revenue leak has been unresolved for 14 days and requires executive attention.',
      isEnabled: true,
      priority: 3,
      triggerCount: 0,
      nextEscalationRuleId: 'escalate-level-4-30days',
      createdAt: new Date()
    });

    // Level 4: Executive after 30 days
    this.addRule({
      id: 'escalate-level-4-30days',
      name: 'Escalate to Executive After 30 Days',
      description: 'Escalate unresolved leaks to executive after 30 days',
      leakTypeFilter: 'all',
      minSeverity: 'high',
      triggerCondition: 'days_unresolved',
      daysThreshold: 30,
      escalationLevel: 'level_4',
      escalationAction: 'multiple',
      escalationActionsConfig: [
        { type: 'create_task', config: { assignTo: 'executive', priority: 'high', dueInDays: 1 } },
        { type: 'send_email', config: { message: 'CRITICAL: Revenue leak requires executive decision' } },
        { type: 'slack_notify', config: { channel: '#c-suite-alerts' } },
        { type: 'teams_notify', config: { channel: 'Executive Team' } }
      ],
      notificationMessage: 'CRITICAL: This revenue leak has been unresolved for 30 days and requires executive decision.',
      isEnabled: true,
      priority: 4,
      triggerCount: 0,
      createdAt: new Date()
    });

    // High-value immediate escalation
    this.addRule({
      id: 'escalate-high-value',
      name: 'Immediate Escalation for High-Value Leaks',
      description: 'Immediately escalate leaks over $50,000 to management',
      leakTypeFilter: 'all',
      minSeverity: 'high',
      triggerCondition: 'revenue_threshold',
      revenueThreshold: 5000000, // $50,000 in cents
      escalationLevel: 'level_2',
      escalationAction: 'multiple',
      escalationActionsConfig: [
        { type: 'create_task', config: { assignTo: 'manager', priority: 'high', dueInDays: 1 } },
        { type: 'slack_notify', config: { channel: '#high-value-alerts', message: 'High-value revenue leak detected!' } }
      ],
      notificationMessage: 'HIGH-VALUE LEAK: This leak represents over $50,000 in potential revenue loss.',
      isEnabled: true,
      priority: 0, // Highest priority
      triggerCount: 0,
      createdAt: new Date()
    });

    // Critical severity immediate escalation
    this.addRule({
      id: 'escalate-critical-severity',
      name: 'Immediate Escalation for Critical Leaks',
      description: 'Immediately escalate critical severity leaks',
      leakTypeFilter: 'all',
      minSeverity: 'critical',
      triggerCondition: 'days_unresolved',
      daysThreshold: 1,
      escalationLevel: 'level_2',
      escalationAction: 'multiple',
      escalationActionsConfig: [
        { type: 'create_task', config: { assignTo: 'manager', priority: 'high', dueInDays: 1 } },
        { type: 'slack_notify', config: { channel: '#critical-alerts' } },
        { type: 'send_email', config: { message: 'Critical revenue leak requires immediate attention' } }
      ],
      notificationMessage: 'CRITICAL LEAK: This leak has critical severity and requires immediate attention.',
      isEnabled: true,
      priority: 0,
      triggerCount: 0,
      createdAt: new Date()
    });

    // Renewal-specific escalation
    this.addRule({
      id: 'escalate-missed-renewal',
      name: 'Escalate Missed Renewal After 2 Days',
      description: 'Quickly escalate missed renewal leaks',
      leakTypeFilter: 'missed_renewal',
      minSeverity: 'medium',
      triggerCondition: 'days_unresolved',
      daysThreshold: 2,
      escalationLevel: 'level_1',
      escalationAction: 'multiple',
      escalationActionsConfig: [
        { type: 'create_task', config: { assignTo: 'cs_manager', priority: 'high', dueInDays: 1 } },
        { type: 'slack_notify', config: { channel: '#renewals', message: 'Renewal at risk - immediate action needed' } }
      ],
      notificationMessage: 'RENEWAL AT RISK: A customer renewal leak requires immediate attention to prevent churn.',
      isEnabled: true,
      priority: 1,
      triggerCount: 0,
      createdAt: new Date()
    });
  }

  /**
   * Add an escalation rule
   */
  addRule(rule: EscalationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Update an escalation rule
   */
  updateRule(ruleId: string, updates: Partial<EscalationRule>): EscalationRule | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);
    return updatedRule;
  }

  /**
   * Delete an escalation rule
   */
  deleteRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all escalation rules
   */
  getRules(): EscalationRule[] {
    return Array.from(this.rules.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get active escalation rules
   */
  getActiveRules(): EscalationRule[] {
    return this.getRules().filter(r => r.isEnabled);
  }

  /**
   * Get a specific rule
   */
  getRule(ruleId: string): EscalationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Evaluate leaks for escalation
   */
  evaluateLeaksForEscalation(leaks: RevenueLeak[]): EscalationEvent[] {
    const events: EscalationEvent[] = [];
    const sortedRules = this.getActiveRules();

    for (const leak of leaks) {
      // Skip resolved leaks
      if ((leak.metadata as Record<string, unknown>)?.resolved) continue;

      for (const rule of sortedRules) {
        if (this.shouldEscalate(leak, rule)) {
          const event = this.createEscalationEvent(leak, rule);
          events.push(event);
          
          rule.triggerCount++;
          rule.lastTriggered = new Date();
          
          // Only apply one escalation rule per leak (highest priority)
          break;
        }
      }
    }

    this.escalationHistory.push(...events);
    return events;
  }

  /**
   * Check if a leak should be escalated by a rule
   */
  private shouldEscalate(leak: RevenueLeak, rule: EscalationRule): boolean {
    // Check leak type filter
    if (rule.leakTypeFilter !== 'all' && rule.leakTypeFilter !== leak.type) {
      return false;
    }

    // Check minimum severity
    const severityOrder: LeakSeverity[] = ['low', 'medium', 'high', 'critical'];
    if (severityOrder.indexOf(leak.severity) < severityOrder.indexOf(rule.minSeverity)) {
      return false;
    }

    // Check trigger condition
    switch (rule.triggerCondition) {
      case 'days_unresolved':
        const daysSinceDetection = daysBetween(leak.detectedAt, new Date());
        return daysSinceDetection >= (rule.daysThreshold || 0);

      case 'revenue_threshold':
        return leak.potentialRevenue >= (rule.revenueThreshold || 0);

      case 'multiple_leaks':
        // This would need context about other leaks for the same entity
        return false;

      case 'task_overdue':
        // This would need context about associated tasks
        return false;

      case 'manual':
        return false;

      default:
        return false;
    }
  }

  /**
   * Create an escalation event
   */
  private createEscalationEvent(leak: RevenueLeak, rule: EscalationRule): EscalationEvent {
    const actionsTaken: string[] = [];
    const notificationsSent: string[] = [];

    // Process escalation actions
    if (rule.escalationAction === 'multiple' && rule.escalationActionsConfig) {
      for (const action of rule.escalationActionsConfig) {
        actionsTaken.push(`${action.type}: ${JSON.stringify(action.config)}`);
        if (action.type.includes('notify')) {
          notificationsSent.push(action.type);
        }
      }
    } else {
      actionsTaken.push(rule.escalationAction);
      if (rule.escalationAction.includes('notify')) {
        notificationsSent.push(rule.escalationAction);
      }
    }

    return {
      id: generateId(),
      leakId: leak.id,
      ruleId: rule.id,
      ruleName: rule.name,
      escalationLevel: rule.escalationLevel,
      actionsTaken,
      triggeredAt: new Date(),
      newOwnerId: rule.escalateToUserId,
      notificationsSent: notificationsSent.length > 0 ? notificationsSent : undefined
    };
  }

  /**
   * Get pending escalations (leaks approaching escalation thresholds)
   */
  getPendingEscalations(leaks: RevenueLeak[]): PendingEscalation[] {
    const pending: PendingEscalation[] = [];
    const sortedRules = this.getActiveRules().filter(r => r.triggerCondition === 'days_unresolved');

    for (const leak of leaks) {
      if ((leak.metadata as Record<string, unknown>)?.resolved) continue;

      const daysSinceDetection = daysBetween(leak.detectedAt, new Date());

      for (const rule of sortedRules) {
        // Check if leak matches rule criteria (except days)
        if (rule.leakTypeFilter !== 'all' && rule.leakTypeFilter !== leak.type) continue;
        
        const severityOrder: LeakSeverity[] = ['low', 'medium', 'high', 'critical'];
        if (severityOrder.indexOf(leak.severity) < severityOrder.indexOf(rule.minSeverity)) continue;

        const threshold = rule.daysThreshold || 0;
        const daysUntilEscalation = threshold - daysSinceDetection;

        // Only include if escalation is within next 7 days but not yet triggered
        if (daysUntilEscalation > 0 && daysUntilEscalation <= 7) {
          const estimatedEscalationDate = new Date();
          estimatedEscalationDate.setDate(estimatedEscalationDate.getDate() + daysUntilEscalation);

          pending.push({
            leak,
            rule,
            daysUntilEscalation,
            estimatedEscalationDate
          });
          break; // Only one pending escalation per leak
        }
      }
    }

    return pending.sort((a, b) => a.daysUntilEscalation - b.daysUntilEscalation);
  }

  /**
   * Create a HubSpot task for escalation
   */
  async createEscalationTask(
    leak: RevenueLeak,
    rule: EscalationRule
  ): Promise<TaskCreationResult> {
    // In production, this would integrate with HubSpot API
    // For now, return simulated result
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (rule.escalationActionsConfig?.[0]?.config?.dueInDays || 3));

    return {
      success: true,
      taskId: generateId(),
      assignedTo: rule.escalateToUserId || rule.escalateToTeam || 'unassigned',
      dueDate
    };
  }

  /**
   * Get the escalation chain for a leak type
   */
  getEscalationChain(leakType: LeakType): EscalationRule[] {
    const chain: EscalationRule[] = [];
    const rules = this.getActiveRules().filter(
      r => r.leakTypeFilter === 'all' || r.leakTypeFilter === leakType
    );

    // Build chain by following nextEscalationRuleId
    let currentRuleId = rules.find(r => r.escalationLevel === 'level_1')?.id;
    
    while (currentRuleId) {
      const rule = this.rules.get(currentRuleId);
      if (rule) {
        chain.push(rule);
        currentRuleId = rule.nextEscalationRuleId;
      } else {
        break;
      }
    }

    return chain;
  }

  /**
   * Get escalation statistics
   */
  getStats(): {
    totalRules: number;
    activeRules: number;
    totalEscalations: number;
    escalationsByLevel: Record<string, number>;
    recentEscalations: EscalationEvent[];
  } {
    const rules = this.getRules();
    const escalationsByLevel: Record<string, number> = {
      level_1: 0,
      level_2: 0,
      level_3: 0,
      level_4: 0
    };

    for (const rule of rules) {
      escalationsByLevel[rule.escalationLevel] += rule.triggerCount;
    }

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isEnabled).length,
      totalEscalations: this.escalationHistory.length,
      escalationsByLevel,
      recentEscalations: this.escalationHistory.slice(-10)
    };
  }

  /**
   * Get escalation history for a specific leak
   */
  getLeakEscalationHistory(leakId: string): EscalationEvent[] {
    return this.escalationHistory.filter(e => e.leakId === leakId);
  }

  /**
   * Clear escalation history
   */
  clearHistory(): void {
    this.escalationHistory = [];
  }
}

export default EscalationEngine;
