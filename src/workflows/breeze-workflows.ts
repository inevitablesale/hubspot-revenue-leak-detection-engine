/**
 * Breeze Workflows
 * "Recover All Leaks" and other automated recovery workflows
 */

import { RevenueLeak, RecoveryAction, LeakType } from '../types';
import { LeakScore } from '../scoring/leak-scorer';
import { generateId } from '../utils/helpers';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'delay' | 'branch' | 'notification';
  config: Record<string, unknown>;
  nextStepId?: string;
  onSuccess?: string;
  onFailure?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  enabled: boolean;
  createdAt: Date;
  lastRun?: Date;
  runCount: number;
}

export interface WorkflowTrigger {
  type: 'manual' | 'scheduled' | 'event' | 'threshold';
  config: Record<string, unknown>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentStepId?: string;
  results: WorkflowStepResult[];
  context: WorkflowContext;
}

export interface WorkflowStepResult {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  output?: unknown;
  error?: string;
}

export interface WorkflowContext {
  leaks: RevenueLeak[];
  scores: Map<string, LeakScore>;
  processedCount: number;
  recoveredRevenue: number;
  failedCount: number;
  variables: Map<string, unknown>;
}

export interface BatchRecoveryResult {
  executionId: string;
  totalLeaks: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  recoveredRevenue: number;
  duration: number;
  details: LeakRecoveryDetail[];
}

export interface LeakRecoveryDetail {
  leakId: string;
  leakType: LeakType;
  status: 'recovered' | 'partial' | 'failed' | 'skipped';
  actionsTaken: string[];
  recoveredAmount: number;
  error?: string;
}

export class BreezeWorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  constructor() {
    this.initializeDefaultWorkflows();
  }

  /**
   * Initialize default workflows
   */
  private initializeDefaultWorkflows(): void {
    // Recover All Leaks Workflow
    this.workflows.set('recover-all-leaks', {
      id: 'recover-all-leaks',
      name: 'Recover All Leaks',
      description: 'Batch process all detected leaks with appropriate recovery actions',
      trigger: { type: 'manual', config: {} },
      steps: [
        {
          id: 'step-1-prioritize',
          name: 'Prioritize Leaks',
          type: 'action',
          config: { action: 'sort_by_score', order: 'descending' },
          nextStepId: 'step-2-filter',
        },
        {
          id: 'step-2-filter',
          name: 'Filter High Priority',
          type: 'condition',
          config: { field: 'score.composite', operator: '>=', value: 50 },
          onSuccess: 'step-3-branch',
          onFailure: 'step-6-notify-low',
        },
        {
          id: 'step-3-branch',
          name: 'Branch by Type',
          type: 'branch',
          config: { field: 'leak.type' },
          nextStepId: 'step-4-execute',
        },
        {
          id: 'step-4-execute',
          name: 'Execute Recovery Actions',
          type: 'action',
          config: { action: 'execute_recovery', parallel: true, maxConcurrency: 5 },
          nextStepId: 'step-5-verify',
        },
        {
          id: 'step-5-verify',
          name: 'Verify Recovery',
          type: 'action',
          config: { action: 'verify_resolution', timeout: 300 },
          nextStepId: 'step-7-report',
        },
        {
          id: 'step-6-notify-low',
          name: 'Queue Low Priority',
          type: 'notification',
          config: { type: 'queue', message: 'Low priority leak queued for review' },
          nextStepId: 'step-7-report',
        },
        {
          id: 'step-7-report',
          name: 'Generate Report',
          type: 'action',
          config: { action: 'generate_summary_report' },
        },
      ],
      enabled: true,
      createdAt: new Date(),
      runCount: 0,
    });

    // Quick Wins Workflow
    this.workflows.set('quick-wins', {
      id: 'quick-wins',
      name: 'Quick Wins Recovery',
      description: 'Process high-recoverability leaks for quick revenue recovery',
      trigger: { type: 'scheduled', config: { cron: '0 9 * * 1' } }, // Weekly on Monday
      steps: [
        {
          id: 'qw-1',
          name: 'Filter Quick Wins',
          type: 'condition',
          config: { field: 'score.recoverability', operator: '>=', value: 75 },
          onSuccess: 'qw-2',
          onFailure: 'qw-4',
        },
        {
          id: 'qw-2',
          name: 'Auto-Execute Easy Fixes',
          type: 'action',
          config: { 
            action: 'auto_execute', 
            leakTypes: ['billing_gap', 'stalled_cs_handoff'],
          },
          nextStepId: 'qw-3',
        },
        {
          id: 'qw-3',
          name: 'Send Summary',
          type: 'notification',
          config: { type: 'email', recipient: 'owner', template: 'quick-wins-summary' },
        },
        {
          id: 'qw-4',
          name: 'Queue for Manual Review',
          type: 'action',
          config: { action: 'queue_manual_review' },
        },
      ],
      enabled: true,
      createdAt: new Date(),
      runCount: 0,
    });

    // Critical Alerts Workflow
    this.workflows.set('critical-alerts', {
      id: 'critical-alerts',
      name: 'Critical Leak Alerts',
      description: 'Immediately notify stakeholders of critical revenue leaks',
      trigger: { type: 'event', config: { event: 'leak_detected', severity: 'critical' } },
      steps: [
        {
          id: 'ca-1',
          name: 'Enrich Leak Data',
          type: 'action',
          config: { action: 'enrich_with_customer_data' },
          nextStepId: 'ca-2',
        },
        {
          id: 'ca-2',
          name: 'Send Urgent Notification',
          type: 'notification',
          config: { 
            type: 'multi-channel',
            channels: ['email', 'slack', 'sms'],
            priority: 'urgent',
          },
          nextStepId: 'ca-3',
        },
        {
          id: 'ca-3',
          name: 'Create Urgent Task',
          type: 'action',
          config: { 
            action: 'create_task',
            taskType: 'URGENT',
            assignTo: 'leak_owner',
            dueIn: '4h',
          },
        },
      ],
      enabled: true,
      createdAt: new Date(),
      runCount: 0,
    });

    // Trend Analysis Workflow
    this.workflows.set('weekly-trends', {
      id: 'weekly-trends',
      name: 'Weekly Trend Analysis',
      description: 'Generate weekly leak trend report and predictions',
      trigger: { type: 'scheduled', config: { cron: '0 8 * * 5' } }, // Friday at 8am
      steps: [
        {
          id: 'wt-1',
          name: 'Collect Week Data',
          type: 'action',
          config: { action: 'collect_weekly_leaks' },
          nextStepId: 'wt-2',
        },
        {
          id: 'wt-2',
          name: 'Analyze Trends',
          type: 'action',
          config: { action: 'analyze_trends', comparePeriods: 4 },
          nextStepId: 'wt-3',
        },
        {
          id: 'wt-3',
          name: 'Generate Predictions',
          type: 'action',
          config: { action: 'generate_predictions', horizon: '4w' },
          nextStepId: 'wt-4',
        },
        {
          id: 'wt-4',
          name: 'Send Report',
          type: 'notification',
          config: { 
            type: 'email',
            recipient: 'leadership',
            template: 'weekly-trend-report',
          },
        },
      ],
      enabled: true,
      createdAt: new Date(),
      runCount: 0,
    });
  }

  /**
   * Get all workflows
   */
  getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get a specific workflow
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Execute the "Recover All Leaks" workflow
   */
  async executeRecoverAllLeaks(
    leaks: RevenueLeak[],
    scores: LeakScore[]
  ): Promise<BatchRecoveryResult> {
    const startTime = Date.now();
    const executionId = generateId();
    const scoreMap = new Map(scores.map(s => [s.leakId, s]));
    
    // Initialize execution context
    const context: WorkflowContext = {
      leaks,
      scores: scoreMap,
      processedCount: 0,
      recoveredRevenue: 0,
      failedCount: 0,
      variables: new Map(),
    };

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: 'recover-all-leaks',
      startedAt: new Date(),
      status: 'running',
      results: [],
      context,
    };

    this.executions.set(executionId, execution);

    // Sort leaks by score (highest first)
    const sortedLeaks = [...leaks].sort((a, b) => {
      const scoreA = scoreMap.get(a.id)?.composite || 0;
      const scoreB = scoreMap.get(b.id)?.composite || 0;
      return scoreB - scoreA;
    });

    const details: LeakRecoveryDetail[] = [];
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    let recoveredRevenue = 0;

    // Process each leak
    for (const leak of sortedLeaks) {
      const score = scoreMap.get(leak.id);
      
      // Skip low priority leaks
      if (score && score.composite < 35) {
        details.push({
          leakId: leak.id,
          leakType: leak.type,
          status: 'skipped',
          actionsTaken: [],
          recoveredAmount: 0,
        });
        skipped++;
        continue;
      }

      // Execute recovery for this leak
      const result = await this.executeLeakRecovery(leak, score);
      details.push(result);

      if (result.status === 'recovered') {
        succeeded++;
        recoveredRevenue += result.recoveredAmount;
      } else if (result.status === 'partial') {
        succeeded++;
        recoveredRevenue += result.recoveredAmount;
      } else if (result.status === 'failed') {
        failed++;
      }

      context.processedCount++;
    }

    // Complete execution
    execution.completedAt = new Date();
    execution.status = 'completed';
    context.recoveredRevenue = recoveredRevenue;
    context.failedCount = failed;

    // Update workflow stats
    const workflow = this.workflows.get('recover-all-leaks');
    if (workflow) {
      workflow.lastRun = new Date();
      workflow.runCount++;
    }

    return {
      executionId,
      totalLeaks: leaks.length,
      processed: context.processedCount,
      succeeded,
      failed,
      skipped,
      recoveredRevenue,
      duration: Date.now() - startTime,
      details,
    };
  }

  /**
   * Execute recovery actions for a single leak
   */
  private async executeLeakRecovery(
    leak: RevenueLeak,
    score?: LeakScore
  ): Promise<LeakRecoveryDetail> {
    const actionsTaken: string[] = [];
    let recoveredAmount = 0;
    let status: LeakRecoveryDetail['status'] = 'recovered';

    try {
      // Execute each suggested action
      for (const action of leak.suggestedActions) {
        const actionResult = await this.executeAction(action, leak);
        actionsTaken.push(`${action.type}: ${action.title}`);
        
        if (!actionResult.success) {
          status = 'partial';
        }
      }

      // Estimate recovered amount based on leak type and success
      if (status === 'recovered') {
        recoveredAmount = leak.potentialRevenue;
      } else if (status === 'partial') {
        recoveredAmount = leak.potentialRevenue * 0.5;
      }

    } catch (error) {
      status = 'failed';
      return {
        leakId: leak.id,
        leakType: leak.type,
        status: 'failed',
        actionsTaken,
        recoveredAmount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return {
      leakId: leak.id,
      leakType: leak.type,
      status,
      actionsTaken,
      recoveredAmount,
    };
  }

  /**
   * Execute a single recovery action
   */
  private async executeAction(
    action: RecoveryAction,
    leak: RevenueLeak
  ): Promise<{ success: boolean; message: string }> {
    // Simulate action execution
    // In production, this would integrate with HubSpot API
    
    switch (action.type) {
      case 'update_property':
        return { success: true, message: 'Property updated' };
      
      case 'create_task':
        return { success: true, message: 'Task created' };
      
      case 'send_notification':
        return { success: true, message: 'Notification sent' };
      
      case 'trigger_workflow':
        return { success: true, message: 'Workflow triggered' };
      
      case 'manual_review':
        return { success: true, message: 'Flagged for review' };
      
      default:
        return { success: false, message: 'Unknown action type' };
    }
  }

  /**
   * Execute a specific workflow
   */
  async executeWorkflow(workflowId: string, context: Partial<WorkflowContext>): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const execution: WorkflowExecution = {
      id: generateId(),
      workflowId,
      startedAt: new Date(),
      status: 'running',
      results: [],
      context: {
        leaks: context.leaks || [],
        scores: context.scores || new Map(),
        processedCount: 0,
        recoveredRevenue: 0,
        failedCount: 0,
        variables: context.variables || new Map(),
      },
    };

    this.executions.set(execution.id, execution);

    // Execute workflow steps
    let currentStepId: string | undefined = workflow.steps[0]?.id;
    
    while (currentStepId) {
      const step = workflow.steps.find(s => s.id === currentStepId);
      if (!step) break;

      execution.currentStepId = currentStepId;
      
      const stepResult: WorkflowStepResult = {
        stepId: step.id,
        status: 'running',
        startedAt: new Date(),
      };

      try {
        // Execute step based on type
        const output = await this.executeStep(step, execution.context);
        stepResult.status = 'completed';
        stepResult.completedAt = new Date();
        stepResult.output = output;
        
        // Determine next step
        if (step.type === 'condition') {
          currentStepId = output ? step.onSuccess : step.onFailure;
        } else {
          currentStepId = step.nextStepId;
        }
      } catch (error) {
        stepResult.status = 'failed';
        stepResult.completedAt = new Date();
        stepResult.error = error instanceof Error ? error.message : 'Unknown error';
        
        execution.status = 'failed';
        break;
      }

      execution.results.push(stepResult);
    }

    if (execution.status !== 'failed') {
      execution.status = 'completed';
    }
    execution.completedAt = new Date();

    // Update workflow stats
    workflow.lastRun = new Date();
    workflow.runCount++;

    return execution;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<unknown> {
    switch (step.type) {
      case 'action':
        return this.executeActionStep(step, context);
      case 'condition':
        return this.evaluateCondition(step, context);
      case 'delay':
        await this.delay(step.config.duration as number);
        return true;
      case 'notification':
        return this.sendNotification(step, context);
      case 'branch':
        return this.executeBranch(step, context);
      default:
        return null;
    }
  }

  /**
   * Execute an action step
   */
  private async executeActionStep(step: WorkflowStep, context: WorkflowContext): Promise<unknown> {
    const action = step.config.action as string;
    
    switch (action) {
      case 'sort_by_score':
        context.leaks.sort((a, b) => {
          const scoreA = context.scores.get(a.id)?.composite || 0;
          const scoreB = context.scores.get(b.id)?.composite || 0;
          return step.config.order === 'descending' ? scoreB - scoreA : scoreA - scoreB;
        });
        return context.leaks;
      
      case 'execute_recovery':
        // Execute recovery for all leaks
        return { processed: context.leaks.length };
      
      case 'verify_resolution':
        return { verified: true };
      
      case 'generate_summary_report':
        return {
          totalLeaks: context.leaks.length,
          processed: context.processedCount,
          recovered: context.recoveredRevenue,
        };
      
      default:
        return null;
    }
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(step: WorkflowStep, context: WorkflowContext): boolean {
    const field = step.config.field as string;
    const operator = step.config.operator as string;
    const value = step.config.value as number;

    // Get field value from context
    // Simplified - would need proper field path evaluation
    return true;
  }

  /**
   * Send notification
   */
  private async sendNotification(step: WorkflowStep, context: WorkflowContext): Promise<boolean> {
    console.log(`Sending notification: ${step.config.type}`);
    return true;
  }

  /**
   * Execute branch logic
   */
  private executeBranch(step: WorkflowStep, context: WorkflowContext): unknown {
    // Branch by field value
    return { branchField: step.config.field };
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get execution history
   */
  getExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }
}

export default BreezeWorkflowEngine;
