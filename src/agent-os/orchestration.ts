/**
 * Orchestration Module
 * Capacity-aware workflow coordination and execution
 */

import { RevenueLeak, RecoveryAction } from '../types';
import { generateId } from '../utils/helpers';
import {
  OrchestrationPlan,
  OrchestrationStep,
  PlanDependency,
  CapacityRequirement,
  RetryPolicy,
  OrchestrationConfig,
} from './types';

export interface CapacityPool {
  apiCalls: { used: number; limit: number; resetAt: Date };
  concurrentTasks: { used: number; limit: number };
  memory: { used: number; limit: number };
}

export interface ExecutionResult {
  planId: string;
  status: 'completed' | 'failed' | 'partial';
  stepsCompleted: number;
  totalSteps: number;
  duration: number;
  outputs: Map<string, unknown>;
  errors: Map<string, string>;
}

export interface StepExecutor {
  type: string;
  execute(step: OrchestrationStep, context: ExecutionContext): Promise<unknown>;
}

export interface ExecutionContext {
  planId: string;
  variables: Map<string, unknown>;
  outputs: Map<string, unknown>;
  capacityPool: CapacityPool;
}

export class OrchestrationEngine {
  private plans: Map<string, OrchestrationPlan> = new Map();
  private executors: Map<string, StepExecutor> = new Map();
  private capacityPool: CapacityPool;
  private config: OrchestrationConfig;

  constructor(config?: Partial<OrchestrationConfig>) {
    this.config = {
      enabled: true,
      maxConcurrentPlans: 5,
      defaultTimeout: 300000, // 5 minutes
      capacityLimits: {
        api_calls: 100,
        concurrent_tasks: 10,
        memory: 512, // MB
      },
      ...config,
    };

    this.capacityPool = {
      apiCalls: { 
        used: 0, 
        limit: this.config.capacityLimits['api_calls'] || 100, 
        resetAt: new Date(Date.now() + 60000) 
      },
      concurrentTasks: { 
        used: 0, 
        limit: this.config.capacityLimits['concurrent_tasks'] || 10 
      },
      memory: { 
        used: 0, 
        limit: this.config.capacityLimits['memory'] || 512 
      },
    };

    this.initializeDefaultExecutors();
  }

  /**
   * Initialize default step executors
   */
  private initializeDefaultExecutors(): void {
    // Action executor
    this.executors.set('action', {
      type: 'action',
      execute: async (step: OrchestrationStep, context: ExecutionContext) => {
        // Simulate action execution
        await this.simulateDelay(100);
        return { success: true, action: step.config.action };
      },
    });

    // Validation executor
    this.executors.set('validation', {
      type: 'validation',
      execute: async (step: OrchestrationStep, context: ExecutionContext) => {
        const rules = step.config.rules as string[] || [];
        const results = rules.map(rule => ({ rule, passed: true }));
        return { valid: true, results };
      },
    });

    // Decision executor
    this.executors.set('decision', {
      type: 'decision',
      execute: async (step: OrchestrationStep, context: ExecutionContext) => {
        const condition = step.config.condition as string;
        const variable = context.variables.get(condition);
        return { decision: Boolean(variable), condition };
      },
    });

    // Wait executor
    this.executors.set('wait', {
      type: 'wait',
      execute: async (step: OrchestrationStep, context: ExecutionContext) => {
        const duration = step.config.duration as number || 1000;
        await this.simulateDelay(Math.min(duration, 5000)); // Max 5s for simulation
        return { waited: duration };
      },
    });

    // Parallel executor
    this.executors.set('parallel', {
      type: 'parallel',
      execute: async (step: OrchestrationStep, context: ExecutionContext) => {
        const tasks = step.config.tasks as string[] || [];
        const results = await Promise.all(
          tasks.map(async task => {
            await this.simulateDelay(50);
            return { task, completed: true };
          })
        );
        return { parallelResults: results };
      },
    });

    // Loop executor
    this.executors.set('loop', {
      type: 'loop',
      execute: async (step: OrchestrationStep, context: ExecutionContext) => {
        const iterations = step.config.iterations as number || 1;
        const results: unknown[] = [];
        for (let i = 0; i < iterations; i++) {
          await this.simulateDelay(50);
          results.push({ iteration: i, completed: true });
        }
        return { loopResults: results };
      },
    });
  }

  /**
   * Create an orchestration plan for leak recovery
   */
  createRecoveryPlan(
    leaks: RevenueLeak[],
    options: {
      prioritizeBy?: 'revenue' | 'severity' | 'age';
      maxParallel?: number;
      includeValidation?: boolean;
    } = {}
  ): OrchestrationPlan {
    const { 
      prioritizeBy = 'revenue', 
      maxParallel = 3, 
      includeValidation = true 
    } = options;

    // Sort leaks by priority
    const sortedLeaks = this.sortLeaks(leaks, prioritizeBy);

    // Build steps
    const steps: OrchestrationStep[] = [];
    let stepOrder = 0;

    // Initial validation step
    if (includeValidation) {
      steps.push({
        id: `step-${++stepOrder}`,
        name: 'Pre-execution Validation',
        type: 'validation',
        config: { rules: ['capacity_check', 'data_integrity', 'permissions'] },
        status: 'pending',
        dependencies: [],
        timeout: 30000,
      });
    }

    // Group leaks for parallel processing
    const batches = this.batchLeaks(sortedLeaks, maxParallel);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchDependency = stepOrder > 0 ? [`step-${stepOrder}`] : [];

      // Create parallel step for batch
      if (batch.length > 1) {
        steps.push({
          id: `step-${++stepOrder}`,
          name: `Batch ${batchIndex + 1} Recovery`,
          type: 'parallel',
          config: { 
            tasks: batch.map(l => l.id),
            leakIds: batch.map(l => l.id),
          },
          status: 'pending',
          dependencies: batchDependency,
          timeout: this.config.defaultTimeout,
        });
      } else if (batch.length === 1) {
        // Single leak action
        steps.push({
          id: `step-${++stepOrder}`,
          name: `Recover: ${batch[0].description.substring(0, 50)}`,
          type: 'action',
          config: { 
            action: 'recover_leak',
            leakId: batch[0].id,
            leakType: batch[0].type,
          },
          status: 'pending',
          dependencies: batchDependency,
          timeout: this.config.defaultTimeout,
          retryPolicy: this.getRetryPolicy(batch[0]),
        });
      }
    }

    // Final validation step
    if (includeValidation) {
      steps.push({
        id: `step-${++stepOrder}`,
        name: 'Post-execution Validation',
        type: 'validation',
        config: { rules: ['recovery_verification', 'data_consistency'] },
        status: 'pending',
        dependencies: [`step-${stepOrder - 1}`],
        timeout: 30000,
      });
    }

    // Calculate capacity requirements
    const capacityRequirements: CapacityRequirement[] = [
      { resourceType: 'api_calls', amount: leaks.length * 3, priority: 'required' },
      { resourceType: 'concurrent_tasks', amount: maxParallel, priority: 'required' },
    ];

    const plan: OrchestrationPlan = {
      id: generateId(),
      name: `Recovery Plan - ${leaks.length} Leaks`,
      description: `Automated recovery of ${leaks.length} revenue leaks prioritized by ${prioritizeBy}`,
      priority: this.calculatePlanPriority(leaks),
      status: 'pending',
      steps,
      dependencies: [],
      capacityRequirements,
      estimatedDuration: this.estimateDuration(steps),
      createdAt: new Date(),
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * Execute an orchestration plan
   */
  async executePlan(planId: string): Promise<ExecutionResult> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (!this.config.enabled) {
      throw new Error('Orchestration engine is disabled');
    }

    // Check capacity
    if (!this.hasCapacity(plan.capacityRequirements)) {
      throw new Error('Insufficient capacity to execute plan');
    }

    const startTime = Date.now();
    const context: ExecutionContext = {
      planId,
      variables: new Map(),
      outputs: new Map(),
      capacityPool: this.capacityPool,
    };

    plan.status = 'executing';
    plan.startedAt = new Date();

    const errors = new Map<string, string>();
    let stepsCompleted = 0;

    // Execute steps in dependency order
    const executedSteps = new Set<string>();
    const stepQueue = [...plan.steps];

    while (stepQueue.length > 0) {
      // Find steps that can be executed (all dependencies met)
      const readySteps = stepQueue.filter(step =>
        step.dependencies.every(dep => executedSteps.has(dep))
      );

      if (readySteps.length === 0) {
        // No ready steps but queue not empty - dependency cycle or failure
        break;
      }

      // Execute ready steps
      for (const step of readySteps) {
        try {
          const result = await this.executeStep(step, context);
          step.status = 'completed';
          step.output = result;
          context.outputs.set(step.id, result);
          executedSteps.add(step.id);
          stepsCompleted++;
        } catch (error) {
          step.status = 'failed';
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.set(step.id, errorMessage);
          
          // Check retry policy
          if (step.retryPolicy && step.retryPolicy.maxRetries > 0) {
            const retried = await this.retryStep(step, context, step.retryPolicy);
            if (retried) {
              step.status = 'completed';
              executedSteps.add(step.id);
              stepsCompleted++;
              errors.delete(step.id);
            }
          }
        }

        // Remove from queue
        const index = stepQueue.indexOf(step);
        if (index > -1) {
          stepQueue.splice(index, 1);
        }
      }
    }

    // Update plan status
    const allCompleted = stepsCompleted === plan.steps.length;
    const anyCompleted = stepsCompleted > 0;

    plan.status = allCompleted ? 'completed' : (anyCompleted ? 'paused' : 'failed');
    plan.completedAt = new Date();

    return {
      planId,
      status: allCompleted ? 'completed' : (anyCompleted ? 'partial' : 'failed'),
      stepsCompleted,
      totalSteps: plan.steps.length,
      duration: Date.now() - startTime,
      outputs: context.outputs,
      errors,
    };
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: OrchestrationStep,
    context: ExecutionContext
  ): Promise<unknown> {
    step.status = 'running';

    // Reserve capacity
    this.reserveCapacity(step.type);

    try {
      const executor = this.executors.get(step.type);
      if (!executor) {
        throw new Error(`No executor found for step type: ${step.type}`);
      }

      // Execute with timeout
      const result = await this.withTimeout(
        executor.execute(step, context),
        step.timeout
      );

      return result;
    } finally {
      // Release capacity
      this.releaseCapacity(step.type);
    }
  }

  /**
   * Retry a failed step
   */
  private async retryStep(
    step: OrchestrationStep,
    context: ExecutionContext,
    policy: RetryPolicy
  ): Promise<boolean> {
    let delay = policy.initialDelay;

    for (let attempt = 0; attempt < policy.maxRetries; attempt++) {
      await this.simulateDelay(delay);
      
      try {
        const result = await this.executeStep(step, context);
        step.output = result;
        context.outputs.set(step.id, result);
        return true;
      } catch {
        delay = Math.min(delay * policy.backoffMultiplier, policy.maxDelay);
      }
    }

    return false;
  }

  /**
   * Check if sufficient capacity exists
   */
  hasCapacity(requirements: CapacityRequirement[]): boolean {
    for (const req of requirements) {
      if (req.priority !== 'required') continue;

      switch (req.resourceType) {
        case 'api_calls':
          if (this.capacityPool.apiCalls.used + req.amount > this.capacityPool.apiCalls.limit) {
            return false;
          }
          break;
        case 'concurrent_tasks':
          if (this.capacityPool.concurrentTasks.used + req.amount > this.capacityPool.concurrentTasks.limit) {
            return false;
          }
          break;
        case 'memory':
          if (this.capacityPool.memory.used + req.amount > this.capacityPool.memory.limit) {
            return false;
          }
          break;
      }
    }
    return true;
  }

  /**
   * Reserve capacity for step execution
   */
  private reserveCapacity(stepType: string): void {
    this.capacityPool.concurrentTasks.used++;
    if (stepType === 'action') {
      this.capacityPool.apiCalls.used++;
    }
  }

  /**
   * Release capacity after step completion
   */
  private releaseCapacity(stepType: string): void {
    this.capacityPool.concurrentTasks.used = Math.max(0, this.capacityPool.concurrentTasks.used - 1);
    if (stepType === 'action') {
      this.capacityPool.apiCalls.used = Math.max(0, this.capacityPool.apiCalls.used - 1);
    }
  }

  /**
   * Get capacity status
   */
  getCapacityStatus(): CapacityPool {
    // Reset API calls if needed
    if (new Date() > this.capacityPool.apiCalls.resetAt) {
      this.capacityPool.apiCalls.used = 0;
      this.capacityPool.apiCalls.resetAt = new Date(Date.now() + 60000);
    }
    return { ...this.capacityPool };
  }

  /**
   * Get retry policy based on leak characteristics
   */
  private getRetryPolicy(leak: RevenueLeak): RetryPolicy {
    // More retries for higher value leaks
    const maxRetries = leak.potentialRevenue > 10000 ? 3 : 2;
    
    return {
      maxRetries,
      backoffMultiplier: 2,
      initialDelay: 1000,
      maxDelay: 10000,
    };
  }

  /**
   * Sort leaks by priority criteria
   */
  private sortLeaks(leaks: RevenueLeak[], prioritizeBy: string): RevenueLeak[] {
    const sorted = [...leaks];
    
    switch (prioritizeBy) {
      case 'revenue':
        return sorted.sort((a, b) => b.potentialRevenue - a.potentialRevenue);
      case 'severity':
        const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return sorted.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));
      case 'age':
        return sorted.sort((a, b) => a.detectedAt.getTime() - b.detectedAt.getTime());
      default:
        return sorted;
    }
  }

  /**
   * Batch leaks for parallel processing
   */
  private batchLeaks(leaks: RevenueLeak[], batchSize: number): RevenueLeak[][] {
    const batches: RevenueLeak[][] = [];
    for (let i = 0; i < leaks.length; i += batchSize) {
      batches.push(leaks.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Calculate plan priority
   */
  private calculatePlanPriority(leaks: RevenueLeak[]): number {
    const totalRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    const criticalCount = leaks.filter(l => l.severity === 'critical').length;
    
    // Priority 1-100, higher = more urgent
    return Math.min(100, Math.round(
      (totalRevenue / 10000) * 30 +
      (criticalCount / leaks.length) * 40 +
      (leaks.length / 10) * 30
    ));
  }

  /**
   * Estimate plan duration
   */
  private estimateDuration(steps: OrchestrationStep[]): number {
    // Simple estimation based on step types
    return steps.reduce((total, step) => {
      switch (step.type) {
        case 'action': return total + 5000;
        case 'validation': return total + 2000;
        case 'parallel': return total + 3000;
        case 'wait': return total + (step.config.duration as number || 1000);
        default: return total + 1000;
      }
    }, 0);
  }

  /**
   * Execute with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Step timeout')), timeout);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutHandle!);
      return result;
    } catch (error) {
      clearTimeout(timeoutHandle!);
      throw error;
    }
  }

  /**
   * Simulate delay for testing
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all plans
   */
  getPlans(): OrchestrationPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * Get plan by ID
   */
  getPlan(planId: string): OrchestrationPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Cancel a plan
   */
  cancelPlan(planId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    if (plan.status === 'pending' || plan.status === 'executing') {
      plan.status = 'failed';
      plan.completedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get plans by status
   */
  getPlansByStatus(status: OrchestrationPlan['status']): OrchestrationPlan[] {
    return this.getPlans().filter(p => p.status === status);
  }

  /**
   * Register custom executor
   */
  registerExecutor(executor: StepExecutor): void {
    this.executors.set(executor.type, executor);
  }

  /**
   * Get orchestration statistics
   */
  getStats(): {
    totalPlans: number;
    pendingPlans: number;
    executingPlans: number;
    completedPlans: number;
    failedPlans: number;
    capacityUtilization: Record<string, number>;
  } {
    const plans = this.getPlans();
    
    return {
      totalPlans: plans.length,
      pendingPlans: plans.filter(p => p.status === 'pending').length,
      executingPlans: plans.filter(p => p.status === 'executing').length,
      completedPlans: plans.filter(p => p.status === 'completed').length,
      failedPlans: plans.filter(p => p.status === 'failed').length,
      capacityUtilization: {
        apiCalls: this.capacityPool.apiCalls.used / this.capacityPool.apiCalls.limit,
        concurrentTasks: this.capacityPool.concurrentTasks.used / this.capacityPool.concurrentTasks.limit,
        memory: this.capacityPool.memory.used / this.capacityPool.memory.limit,
      },
    };
  }
}

export default OrchestrationEngine;
