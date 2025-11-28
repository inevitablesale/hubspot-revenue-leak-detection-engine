/**
 * Breeze-Native Fix Actions
 * AI-powered recovery actions that integrate with HubSpot Breeze
 */

import { RevenueLeak, RecoveryAction, LeakType } from '../types';
import { LeakScore } from '../scoring/leak-scorer';
import { generateId } from '../utils/helpers';

export interface BreezeAction {
  id: string;
  name: string;
  description: string;
  leakTypes: LeakType[];
  aiEnabled: boolean;
  automationLevel: 'manual' | 'semi-auto' | 'full-auto';
  requiredPermissions: string[];
  steps: BreezeActionStep[];
  successCriteria: string[];
  rollbackable: boolean;
}

export interface BreezeActionStep {
  id: string;
  order: number;
  name: string;
  type: 'hubspot_api' | 'breeze_ai' | 'notification' | 'validation' | 'human_review';
  config: Record<string, unknown>;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    retryConditions: string[];
  };
  onSuccess?: string;
  onFailure?: string;
}

export interface BreezeActionResult {
  actionId: string;
  leakId: string;
  status: 'success' | 'partial' | 'failed' | 'pending_review';
  stepsCompleted: number;
  totalSteps: number;
  recoveredAmount?: number;
  aiInsights?: string[];
  nextActions?: string[];
  executionTime: number;
  details: StepResult[];
}

export interface StepResult {
  stepId: string;
  stepName: string;
  status: 'completed' | 'failed' | 'skipped';
  output?: unknown;
  error?: string;
  duration: number;
}

export interface AIRecommendation {
  id: string;
  confidence: number;
  action: string;
  reasoning: string;
  expectedOutcome: string;
  risks: string[];
  alternatives: string[];
}

export interface BreezeContext {
  portalId: string;
  userId: string;
  leak: RevenueLeak;
  score?: LeakScore;
  customerHistory?: CustomerContext;
  similarResolutions?: SimilarResolution[];
}

export interface CustomerContext {
  totalValue: number;
  relationship: 'new' | 'established' | 'at-risk' | 'churned';
  recentInteractions: number;
  satisfactionScore?: number;
  previousLeaks: number;
}

export interface SimilarResolution {
  leakType: LeakType;
  actionTaken: string;
  success: boolean;
  recoveredAmount: number;
}

export class BreezeFixActions {
  private actions: Map<string, BreezeAction> = new Map();

  constructor() {
    this.initializeDefaultActions();
  }

  /**
   * Initialize default Breeze actions
   */
  private initializeDefaultActions(): void {
    // Underbilling Fix
    this.actions.set('fix-underbilling', {
      id: 'fix-underbilling',
      name: 'AI Pricing Correction',
      description: 'Analyze deal pricing and suggest corrections based on market data and contract terms',
      leakTypes: ['underbilling'],
      aiEnabled: true,
      automationLevel: 'semi-auto',
      requiredPermissions: ['deals.write', 'contacts.read'],
      steps: [
        {
          id: 'step-1',
          order: 1,
          name: 'Analyze Deal Terms',
          type: 'breeze_ai',
          config: {
            prompt: 'Analyze deal {dealId} pricing against contract terms and similar deals',
            model: 'breeze-analyst',
          },
        },
        {
          id: 'step-2',
          order: 2,
          name: 'Generate Correction Proposal',
          type: 'breeze_ai',
          config: {
            prompt: 'Generate pricing correction proposal with justification',
            requiresApproval: true,
          },
        },
        {
          id: 'step-3',
          order: 3,
          name: 'Human Review',
          type: 'human_review',
          config: {
            assignTo: 'deal_owner',
            timeout: 86400, // 24 hours
          },
        },
        {
          id: 'step-4',
          order: 4,
          name: 'Update Deal Amount',
          type: 'hubspot_api',
          config: {
            endpoint: '/crm/v3/objects/deals/{dealId}',
            method: 'PATCH',
            body: { properties: { amount: '{correctedAmount}' } },
          },
        },
        {
          id: 'step-5',
          order: 5,
          name: 'Notify Stakeholders',
          type: 'notification',
          config: {
            template: 'pricing-correction',
            channels: ['email', 'slack'],
          },
        },
      ],
      successCriteria: ['deal_amount_updated', 'stakeholders_notified'],
      rollbackable: true,
    });

    // Renewal Recovery
    this.actions.set('fix-missed-renewal', {
      id: 'fix-missed-renewal',
      name: 'AI Renewal Recovery',
      description: 'Intelligently re-engage customers approaching or past renewal',
      leakTypes: ['missed_renewal'],
      aiEnabled: true,
      automationLevel: 'semi-auto',
      requiredPermissions: ['contacts.write', 'deals.write', 'workflows.execute'],
      steps: [
        {
          id: 'step-1',
          order: 1,
          name: 'Analyze Customer Health',
          type: 'breeze_ai',
          config: {
            prompt: 'Analyze customer health for {contactId} considering engagement, tickets, and product usage',
            model: 'breeze-analyst',
          },
        },
        {
          id: 'step-2',
          order: 2,
          name: 'Generate Personalized Outreach',
          type: 'breeze_ai',
          config: {
            prompt: 'Generate personalized renewal outreach based on customer context',
            model: 'breeze-copilot',
            outputType: 'email_draft',
          },
        },
        {
          id: 'step-3',
          order: 3,
          name: 'Create Renewal Deal',
          type: 'hubspot_api',
          config: {
            endpoint: '/crm/v3/objects/deals',
            method: 'POST',
            body: {
              properties: {
                dealname: 'Renewal - {companyName}',
                dealstage: 'renewalproposed',
                pipeline: 'renewals',
              },
            },
          },
        },
        {
          id: 'step-4',
          order: 4,
          name: 'Schedule Follow-up',
          type: 'hubspot_api',
          config: {
            endpoint: '/crm/v3/objects/tasks',
            method: 'POST',
            body: {
              properties: {
                hs_task_type: 'CALL',
                hs_task_subject: 'Renewal follow-up',
                hs_task_priority: 'HIGH',
              },
            },
          },
        },
        {
          id: 'step-5',
          order: 5,
          name: 'Enroll in Renewal Sequence',
          type: 'hubspot_api',
          config: {
            endpoint: '/automation/v2/workflows/{workflowId}/enrollments',
            method: 'POST',
          },
        },
      ],
      successCriteria: ['deal_created', 'outreach_sent', 'task_created'],
      rollbackable: false,
    });

    // CS Handoff Fix
    this.actions.set('fix-cs-handoff', {
      id: 'fix-cs-handoff',
      name: 'Instant CS Handoff',
      description: 'Automatically assign CS owner and initiate onboarding',
      leakTypes: ['stalled_cs_handoff'],
      aiEnabled: false,
      automationLevel: 'full-auto',
      requiredPermissions: ['deals.write', 'owners.read', 'workflows.execute'],
      steps: [
        {
          id: 'step-1',
          order: 1,
          name: 'Find Available CS Rep',
          type: 'hubspot_api',
          config: {
            endpoint: '/crm/v3/owners',
            method: 'GET',
            filter: { team: 'customer-success', available: true },
          },
        },
        {
          id: 'step-2',
          order: 2,
          name: 'Assign CS Owner',
          type: 'hubspot_api',
          config: {
            endpoint: '/crm/v3/objects/deals/{dealId}',
            method: 'PATCH',
            body: { properties: { cs_owner: '{selectedOwnerId}' } },
          },
        },
        {
          id: 'step-3',
          order: 3,
          name: 'Create Onboarding Task',
          type: 'hubspot_api',
          config: {
            endpoint: '/crm/v3/objects/tasks',
            method: 'POST',
            body: {
              properties: {
                hs_task_type: 'TODO',
                hs_task_subject: 'Onboarding kickoff',
                hs_task_priority: 'HIGH',
              },
            },
          },
        },
        {
          id: 'step-4',
          order: 4,
          name: 'Trigger Onboarding Workflow',
          type: 'hubspot_api',
          config: {
            endpoint: '/automation/v2/workflows/onboarding/enrollments',
            method: 'POST',
          },
        },
        {
          id: 'step-5',
          order: 5,
          name: 'Send Handoff Notification',
          type: 'notification',
          config: {
            template: 'cs-handoff',
            channels: ['email', 'slack'],
            recipients: ['cs_owner', 'sales_owner'],
          },
        },
      ],
      successCriteria: ['cs_owner_assigned', 'onboarding_started'],
      rollbackable: true,
    });

    // Cross-Sell Action
    this.actions.set('fix-crosssell', {
      id: 'fix-crosssell',
      name: 'AI Cross-Sell Opportunity',
      description: 'Identify and execute cross-sell opportunities using AI insights',
      leakTypes: ['untriggered_crosssell'],
      aiEnabled: true,
      automationLevel: 'semi-auto',
      requiredPermissions: ['contacts.write', 'deals.write'],
      steps: [
        {
          id: 'step-1',
          order: 1,
          name: 'Analyze Purchase History',
          type: 'breeze_ai',
          config: {
            prompt: 'Analyze {companyId} purchase history and identify expansion opportunities',
            model: 'breeze-analyst',
          },
        },
        {
          id: 'step-2',
          order: 2,
          name: 'Generate Product Recommendations',
          type: 'breeze_ai',
          config: {
            prompt: 'Based on usage patterns, recommend additional products for {companyName}',
            model: 'breeze-copilot',
          },
        },
        {
          id: 'step-3',
          order: 3,
          name: 'Create Expansion Deal',
          type: 'hubspot_api',
          config: {
            endpoint: '/crm/v3/objects/deals',
            method: 'POST',
            body: {
              properties: {
                dealname: 'Expansion - {companyName}',
                dealstage: 'qualifiedtobuy',
                pipeline: 'expansion',
              },
            },
          },
        },
        {
          id: 'step-4',
          order: 4,
          name: 'Draft Personalized Proposal',
          type: 'breeze_ai',
          config: {
            prompt: 'Draft expansion proposal email for {contactName}',
            model: 'breeze-copilot',
            outputType: 'email_draft',
          },
        },
      ],
      successCriteria: ['recommendations_generated', 'deal_created'],
      rollbackable: true,
    });

    // Billing Gap Fix
    this.actions.set('fix-billing-gap', {
      id: 'fix-billing-gap',
      name: 'Automated Invoice Recovery',
      description: 'Generate missing invoices and initiate collections',
      leakTypes: ['billing_gap'],
      aiEnabled: false,
      automationLevel: 'full-auto',
      requiredPermissions: ['invoices.write', 'payments.read'],
      steps: [
        {
          id: 'step-1',
          order: 1,
          name: 'Calculate Missing Amount',
          type: 'validation',
          config: {
            check: 'contract_value - invoiced_total',
            minDifference: 100,
          },
        },
        {
          id: 'step-2',
          order: 2,
          name: 'Generate Invoice',
          type: 'hubspot_api',
          config: {
            endpoint: '/crm/v3/objects/invoices',
            method: 'POST',
            body: {
              properties: {
                hs_amount_billed: '{missingAmount}',
                hs_invoice_status: 'sent',
              },
            },
          },
        },
        {
          id: 'step-3',
          order: 3,
          name: 'Send Invoice Notification',
          type: 'notification',
          config: {
            template: 'invoice-sent',
            channels: ['email'],
            recipients: ['billing_contact'],
          },
        },
        {
          id: 'step-4',
          order: 4,
          name: 'Schedule Follow-up',
          type: 'hubspot_api',
          config: {
            endpoint: '/crm/v3/objects/tasks',
            method: 'POST',
            body: {
              properties: {
                hs_task_type: 'CALL',
                hs_task_subject: 'Invoice follow-up',
                hs_timestamp: '{followUpDate}',
              },
            },
          },
        },
      ],
      successCriteria: ['invoice_generated', 'notification_sent'],
      rollbackable: true,
    });

    // Lifecycle Fix
    this.actions.set('fix-lifecycle', {
      id: 'fix-lifecycle',
      name: 'Lifecycle Path Correction',
      description: 'Correct lifecycle stage transitions and data quality issues',
      leakTypes: ['invalid_lifecycle_path'],
      aiEnabled: false,
      automationLevel: 'semi-auto',
      requiredPermissions: ['contacts.write'],
      steps: [
        {
          id: 'step-1',
          order: 1,
          name: 'Validate Current Stage',
          type: 'validation',
          config: {
            checkAgainst: 'deal_stage',
            allowedTransitions: ['subscriber->lead', 'lead->mql', 'mql->sql', 'sql->opportunity', 'opportunity->customer'],
          },
        },
        {
          id: 'step-2',
          order: 2,
          name: 'Correct Lifecycle Stage',
          type: 'hubspot_api',
          config: {
            endpoint: '/crm/v3/objects/contacts/{contactId}',
            method: 'PATCH',
            body: { properties: { lifecyclestage: '{correctStage}' } },
          },
        },
        {
          id: 'step-3',
          order: 3,
          name: 'Log Correction',
          type: 'notification',
          config: {
            template: 'lifecycle-correction',
            channels: ['internal'],
          },
        },
      ],
      successCriteria: ['lifecycle_corrected', 'logged'],
      rollbackable: true,
    });
  }

  /**
   * Get action for a leak type
   */
  getActionForLeakType(leakType: LeakType): BreezeAction | undefined {
    for (const action of this.actions.values()) {
      if (action.leakTypes.includes(leakType)) {
        return action;
      }
    }
    return undefined;
  }

  /**
   * Get all available actions
   */
  getAllActions(): BreezeAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Execute a Breeze action for a leak
   */
  async executeAction(
    actionId: string,
    context: BreezeContext
  ): Promise<BreezeActionResult> {
    const startTime = Date.now();
    const action = this.actions.get(actionId);
    
    if (!action) {
      return {
        actionId,
        leakId: context.leak.id,
        status: 'failed',
        stepsCompleted: 0,
        totalSteps: 0,
        executionTime: Date.now() - startTime,
        details: [],
      };
    }

    const details: StepResult[] = [];
    let stepsCompleted = 0;

    // Execute each step
    for (const step of action.steps.sort((a, b) => a.order - b.order)) {
      const stepStartTime = Date.now();
      
      try {
        const output = await this.executeStep(step, context);
        
        details.push({
          stepId: step.id,
          stepName: step.name,
          status: 'completed',
          output,
          duration: Date.now() - stepStartTime,
        });
        
        stepsCompleted++;
      } catch (error) {
        details.push({
          stepId: step.id,
          stepName: step.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - stepStartTime,
        });
        
        // Check if we should continue on failure
        if (step.onFailure !== 'continue') {
          break;
        }
      }
    }

    const success = stepsCompleted === action.steps.length;
    const partial = stepsCompleted > 0 && stepsCompleted < action.steps.length;

    return {
      actionId,
      leakId: context.leak.id,
      status: success ? 'success' : partial ? 'partial' : 'failed',
      stepsCompleted,
      totalSteps: action.steps.length,
      recoveredAmount: success ? context.leak.potentialRevenue : 
                      partial ? context.leak.potentialRevenue * 0.5 : 0,
      aiInsights: this.getAIInsights(action, context),
      nextActions: this.getNextActions(action, context, success),
      executionTime: Date.now() - startTime,
      details,
    };
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: BreezeActionStep,
    context: BreezeContext
  ): Promise<unknown> {
    // Simulate step execution
    // In production, this would integrate with HubSpot API
    
    switch (step.type) {
      case 'hubspot_api':
        // Would make actual API call
        return { success: true, response: {} };
      
      case 'breeze_ai':
        // Would call Breeze AI
        return { success: true, analysis: 'AI analysis completed' };
      
      case 'notification':
        // Would send notification
        return { success: true, sent: true };
      
      case 'validation':
        // Would validate data
        return { success: true, valid: true };
      
      case 'human_review':
        // Would create review task
        return { success: true, taskId: generateId() };
      
      default:
        return { success: true };
    }
  }

  /**
   * Get AI-generated insights
   */
  private getAIInsights(action: BreezeAction, context: BreezeContext): string[] {
    if (!action.aiEnabled) return [];
    
    const insights: string[] = [];
    
    // Generate insights based on context
    if (context.customerHistory) {
      if (context.customerHistory.relationship === 'at-risk') {
        insights.push('Customer relationship is at-risk. Consider additional outreach.');
      }
      if (context.customerHistory.previousLeaks > 2) {
        insights.push(`This customer has had ${context.customerHistory.previousLeaks} previous leaks. Review account health.`);
      }
    }
    
    if (context.similarResolutions?.length) {
      const successRate = context.similarResolutions.filter(r => r.success).length / 
        context.similarResolutions.length;
      insights.push(`Similar issues have a ${(successRate * 100).toFixed(0)}% success rate with this action.`);
    }
    
    return insights;
  }

  /**
   * Get recommended next actions
   */
  private getNextActions(action: BreezeAction, context: BreezeContext, success: boolean): string[] {
    const nextActions: string[] = [];
    
    if (success) {
      nextActions.push('Verify resolution in 24-48 hours');
      nextActions.push('Update customer health score');
    } else {
      nextActions.push('Escalate to manager for review');
      nextActions.push('Schedule manual follow-up');
    }
    
    // Type-specific next actions
    if (context.leak.type === 'missed_renewal' && success) {
      nextActions.push('Set renewal reminder for next year');
    }
    
    return nextActions;
  }

  /**
   * Get AI recommendation for a leak
   */
  async getAIRecommendation(context: BreezeContext): Promise<AIRecommendation> {
    const action = this.getActionForLeakType(context.leak.type);
    const confidence = this.calculateConfidence(context);
    
    return {
      id: generateId(),
      confidence,
      action: action?.name || 'Manual Review Required',
      reasoning: this.generateReasoning(context),
      expectedOutcome: `Potential recovery of ${formatCurrency(context.leak.potentialRevenue)}`,
      risks: this.identifyRisks(context),
      alternatives: this.suggestAlternatives(context),
    };
  }

  /**
   * Calculate AI confidence
   */
  private calculateConfidence(context: BreezeContext): number {
    let confidence = 0.5;
    
    if (context.score && context.score.recoverability >= 70) {
      confidence += 0.2;
    }
    
    if (context.similarResolutions?.length) {
      const successRate = context.similarResolutions.filter(r => r.success).length / 
        context.similarResolutions.length;
      confidence += successRate * 0.2;
    }
    
    if (context.customerHistory?.relationship === 'established') {
      confidence += 0.1;
    }
    
    return Math.min(0.95, confidence);
  }

  /**
   * Generate AI reasoning
   */
  private generateReasoning(context: BreezeContext): string {
    const reasons: string[] = [];
    
    reasons.push(`Leak type: ${context.leak.type}`);
    reasons.push(`Severity: ${context.leak.severity}`);
    
    if (context.score) {
      reasons.push(`Priority score: ${context.score.composite}/100`);
    }
    
    return reasons.join('. ');
  }

  /**
   * Identify risks
   */
  private identifyRisks(context: BreezeContext): string[] {
    const risks: string[] = [];
    
    if (context.customerHistory?.relationship === 'at-risk') {
      risks.push('Customer relationship is fragile');
    }
    
    if (context.leak.potentialRevenue >= 50000) {
      risks.push('High-value recovery - requires careful handling');
    }
    
    return risks;
  }

  /**
   * Suggest alternatives
   */
  private suggestAlternatives(context: BreezeContext): string[] {
    const alternatives: string[] = [];
    
    alternatives.push('Manual outreach by account manager');
    alternatives.push('Executive sponsor engagement');
    
    if (context.leak.type === 'missed_renewal') {
      alternatives.push('Offer incentive for immediate renewal');
    }
    
    return alternatives;
  }
}

/**
 * Format currency helper
 */
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

export default BreezeFixActions;
