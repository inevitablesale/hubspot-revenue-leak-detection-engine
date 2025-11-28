/**
 * Autonomous Cycles Module
 * Enables the system to run itself without user triggers through scheduled cycles,
 * event-driven automation, and continuous monitoring
 */

import { generateId } from '../utils/helpers';
import { RevenueLeak, LeakDetectionResult } from '../types';

// ============================================================
// Autonomous Cycles Types
// ============================================================

export type CycleFrequency = 'continuous' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'on_demand';
export type CycleState = 'idle' | 'running' | 'paused' | 'stopped' | 'error';
export type TriggerType = 'schedule' | 'event' | 'threshold' | 'webhook' | 'manual';

export interface AutonomousCycle {
  id: string;
  name: string;
  description: string;
  frequency: CycleFrequency;
  state: CycleState;
  enabled: boolean;
  priority: number;
  tasks: CycleTask[];
  triggers: CycleTrigger[];
  schedule: CycleSchedule;
  lastRun?: CycleExecution;
  nextRunAt?: Date;
  metrics: CycleMetrics;
  config: CycleConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface CycleTask {
  id: string;
  name: string;
  type: 'detection' | 'analysis' | 'recovery' | 'reporting' | 'maintenance' | 'learning';
  order: number;
  enabled: boolean;
  dependencies: string[];
  config: Record<string, unknown>;
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface CycleTrigger {
  id: string;
  type: TriggerType;
  name: string;
  enabled: boolean;
  condition: TriggerCondition;
  cooldownMs: number;
  lastTriggeredAt?: Date;
}

export interface TriggerCondition {
  metric?: string;
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'change_percent';
  threshold?: number;
  eventType?: string;
  webhookPath?: string;
  cronExpression?: string;
}

export interface CycleSchedule {
  cronExpression: string;
  timezone: string;
  windowStart: number; // Hour (0-23)
  windowEnd: number; // Hour (0-23)
  blackoutPeriods: { start: Date; end: Date }[];
  maxConcurrentRuns: number;
}

export interface CycleExecution {
  id: string;
  cycleId: string;
  triggeredBy: TriggerType;
  triggerId?: string;
  state: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  tasksExecuted: TaskExecution[];
  results: CycleResults;
  error?: string;
}

export interface TaskExecution {
  taskId: string;
  taskName: string;
  state: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  retries: number;
  output?: unknown;
  error?: string;
}

export interface CycleResults {
  leaksDetected: number;
  leaksRecovered: number;
  revenueProtected: number;
  revenueRecovered: number;
  alertsGenerated: number;
  actionsExecuted: number;
  insightsGenerated: number;
}

export interface CycleMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgDuration: number;
  avgLeaksDetected: number;
  avgRevenueProtected: number;
  uptime: number;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
}

export interface CycleConfig {
  concurrencyLimit: number;
  errorThreshold: number;
  pauseOnErrorThreshold: boolean;
  notifyOnCompletion: boolean;
  notifyOnError: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  resourceLimits: {
    maxMemoryMb: number;
    maxCpuPercent: number;
    maxDurationMs: number;
  };
}

export interface EventSubscription {
  id: string;
  eventType: string;
  cycleId: string;
  handler: (event: SystemEvent) => Promise<void>;
  filter?: Record<string, unknown>;
  enabled: boolean;
}

export interface SystemEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface AutonomousCyclesConfig {
  enabled: boolean;
  maxConcurrentCycles: number;
  defaultCooldownMs: number;
  eventQueueSize: number;
  checkIntervalMs: number;
}

// ============================================================
// Autonomous Cycles Implementation
// ============================================================

export class AutonomousCyclesEngine {
  private cycles: Map<string, AutonomousCycle> = new Map();
  private executions: Map<string, CycleExecution> = new Map();
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventQueue: SystemEvent[] = [];
  private config: AutonomousCyclesConfig;
  private runningCycles: Set<string> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config?: Partial<AutonomousCyclesConfig>) {
    this.config = {
      enabled: true,
      maxConcurrentCycles: 3,
      defaultCooldownMs: 60000,
      eventQueueSize: 1000,
      checkIntervalMs: 10000,
      ...config,
    };

    this.initializeDefaultCycles();
  }

  /**
   * Initialize default autonomous cycles
   */
  private initializeDefaultCycles(): void {
    // Continuous detection cycle
    this.createCycle({
      name: 'Continuous Detection',
      description: 'Continuously monitors for new revenue leaks',
      frequency: 'continuous',
      priority: 1,
      tasks: [
        {
          id: generateId(),
          name: 'Scan Deals',
          type: 'detection',
          order: 1,
          enabled: true,
          dependencies: [],
          config: { entityType: 'deal', limit: 100 },
          timeout: 30000,
          retryPolicy: { maxRetries: 3, backoffMs: 1000 },
        },
        {
          id: generateId(),
          name: 'Analyze Patterns',
          type: 'analysis',
          order: 2,
          enabled: true,
          dependencies: [],
          config: { analyzePatterns: true },
          timeout: 20000,
          retryPolicy: { maxRetries: 2, backoffMs: 500 },
        },
      ],
      schedule: {
        cronExpression: '*/5 * * * *', // Every 5 minutes
        timezone: 'UTC',
        windowStart: 0,
        windowEnd: 24,
        blackoutPeriods: [],
        maxConcurrentRuns: 1,
      },
    });

    // Daily health check cycle
    this.createCycle({
      name: 'Daily Health Check',
      description: 'Daily system health and integrity checks',
      frequency: 'daily',
      priority: 2,
      tasks: [
        {
          id: generateId(),
          name: 'Data Quality Check',
          type: 'maintenance',
          order: 1,
          enabled: true,
          dependencies: [],
          config: { checkDataQuality: true },
          timeout: 60000,
          retryPolicy: { maxRetries: 2, backoffMs: 2000 },
        },
        {
          id: generateId(),
          name: 'Generate Reports',
          type: 'reporting',
          order: 2,
          enabled: true,
          dependencies: [],
          config: { reportTypes: ['daily_summary', 'leak_trends'] },
          timeout: 45000,
          retryPolicy: { maxRetries: 2, backoffMs: 1500 },
        },
        {
          id: generateId(),
          name: 'Model Learning',
          type: 'learning',
          order: 3,
          enabled: true,
          dependencies: [],
          config: { updatePatterns: true, trainModels: true },
          timeout: 120000,
          retryPolicy: { maxRetries: 1, backoffMs: 5000 },
        },
      ],
      schedule: {
        cronExpression: '0 2 * * *', // 2 AM daily
        timezone: 'UTC',
        windowStart: 1,
        windowEnd: 6,
        blackoutPeriods: [],
        maxConcurrentRuns: 1,
      },
    });

    // Event-driven recovery cycle
    this.createCycle({
      name: 'Event-Driven Recovery',
      description: 'Automatically triggers recovery when critical leaks are detected',
      frequency: 'on_demand',
      priority: 1,
      tasks: [
        {
          id: generateId(),
          name: 'Prioritize Leaks',
          type: 'analysis',
          order: 1,
          enabled: true,
          dependencies: [],
          config: { severityFilter: ['critical', 'high'] },
          timeout: 15000,
          retryPolicy: { maxRetries: 2, backoffMs: 500 },
        },
        {
          id: generateId(),
          name: 'Execute Recovery',
          type: 'recovery',
          order: 2,
          enabled: true,
          dependencies: [],
          config: { autoApprove: false, maxActions: 10 },
          timeout: 60000,
          retryPolicy: { maxRetries: 3, backoffMs: 2000 },
        },
      ],
      schedule: {
        cronExpression: '',
        timezone: 'UTC',
        windowStart: 0,
        windowEnd: 24,
        blackoutPeriods: [],
        maxConcurrentRuns: 1,
      },
      triggers: [
        {
          id: generateId(),
          type: 'threshold',
          name: 'Critical Leak Threshold',
          enabled: true,
          condition: {
            metric: 'critical_leaks_count',
            operator: 'gte',
            threshold: 1,
          },
          cooldownMs: 300000, // 5 minute cooldown
        },
        {
          id: generateId(),
          type: 'event',
          name: 'Manual Trigger',
          enabled: true,
          condition: {
            eventType: 'manual_recovery_request',
          },
          cooldownMs: 0,
        },
      ],
    });

    // Weekly optimization cycle
    this.createCycle({
      name: 'Weekly Optimization',
      description: 'Weekly system optimization and rule evolution',
      frequency: 'weekly',
      priority: 3,
      tasks: [
        {
          id: generateId(),
          name: 'Analyze Performance',
          type: 'analysis',
          order: 1,
          enabled: true,
          dependencies: [],
          config: { metricsWindow: '7d' },
          timeout: 90000,
          retryPolicy: { maxRetries: 2, backoffMs: 3000 },
        },
        {
          id: generateId(),
          name: 'Evolve Rules',
          type: 'learning',
          order: 2,
          enabled: true,
          dependencies: [],
          config: { autoMutate: true, testNewRules: true },
          timeout: 180000,
          retryPolicy: { maxRetries: 1, backoffMs: 5000 },
        },
        {
          id: generateId(),
          name: 'Generate Weekly Report',
          type: 'reporting',
          order: 3,
          enabled: true,
          dependencies: [],
          config: { reportType: 'weekly_executive' },
          timeout: 60000,
          retryPolicy: { maxRetries: 2, backoffMs: 2000 },
        },
      ],
      schedule: {
        cronExpression: '0 3 * * 0', // 3 AM Sunday
        timezone: 'UTC',
        windowStart: 1,
        windowEnd: 8,
        blackoutPeriods: [],
        maxConcurrentRuns: 1,
      },
    });
  }

  /**
   * Create a new autonomous cycle
   */
  createCycle(options: {
    name: string;
    description: string;
    frequency: CycleFrequency;
    priority?: number;
    tasks: CycleTask[];
    schedule: Omit<CycleSchedule, 'maxConcurrentRuns'> & { maxConcurrentRuns?: number };
    triggers?: CycleTrigger[];
    config?: Partial<CycleConfig>;
  }): AutonomousCycle {
    const cycle: AutonomousCycle = {
      id: generateId(),
      name: options.name,
      description: options.description,
      frequency: options.frequency,
      state: 'idle',
      enabled: true,
      priority: options.priority || 5,
      tasks: options.tasks,
      triggers: options.triggers || [],
      schedule: {
        ...options.schedule,
        maxConcurrentRuns: options.schedule.maxConcurrentRuns || 1,
      },
      nextRunAt: this.calculateNextRun(options.schedule.cronExpression, options.frequency),
      metrics: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        avgDuration: 0,
        avgLeaksDetected: 0,
        avgRevenueProtected: 0,
        uptime: 0,
      },
      config: {
        concurrencyLimit: 5,
        errorThreshold: 3,
        pauseOnErrorThreshold: true,
        notifyOnCompletion: true,
        notifyOnError: true,
        logLevel: 'info',
        resourceLimits: {
          maxMemoryMb: 512,
          maxCpuPercent: 80,
          maxDurationMs: 3600000, // 1 hour
        },
        ...options.config,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.cycles.set(cycle.id, cycle);
    return cycle;
  }

  /**
   * Start the autonomous cycles engine
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.checkInterval = setInterval(() => {
      this.checkAndExecuteCycles();
      this.processEventQueue();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop the autonomous cycles engine
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check and execute due cycles
   */
  private async checkAndExecuteCycles(): Promise<void> {
    if (!this.config.enabled) return;

    const now = new Date();
    const dueCycles: AutonomousCycle[] = [];

    for (const [id, cycle] of this.cycles) {
      if (
        cycle.enabled &&
        cycle.state === 'idle' &&
        cycle.nextRunAt &&
        cycle.nextRunAt <= now &&
        this.runningCycles.size < this.config.maxConcurrentCycles
      ) {
        dueCycles.push(cycle);
      }
    }

    // Sort by priority (lower is higher priority)
    dueCycles.sort((a, b) => a.priority - b.priority);

    // Execute due cycles
    for (const cycle of dueCycles) {
      if (this.runningCycles.size >= this.config.maxConcurrentCycles) break;
      
      void this.executeCycle(cycle.id, 'schedule');
    }
  }

  /**
   * Process event queue
   */
  private async processEventQueue(): Promise<void> {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (!event) break;

      // Process event subscriptions
      for (const [id, subscription] of this.subscriptions) {
        if (subscription.enabled && subscription.eventType === event.type) {
          await subscription.handler(event);
        }
      }

      // Check cycle triggers
      for (const [cycleId, cycle] of this.cycles) {
        if (!cycle.enabled) continue;

        for (const trigger of cycle.triggers) {
          if (
            trigger.enabled &&
            trigger.type === 'event' &&
            trigger.condition.eventType === event.type
          ) {
            if (this.canTrigger(trigger)) {
              void this.executeCycle(cycleId, 'event', trigger.id);
            }
          }
        }
      }
    }
  }

  /**
   * Execute a cycle
   */
  async executeCycle(
    cycleId: string,
    triggeredBy: TriggerType,
    triggerId?: string
  ): Promise<CycleExecution> {
    const cycle = this.cycles.get(cycleId);
    if (!cycle) {
      throw new Error(`Cycle ${cycleId} not found`);
    }

    if (cycle.state === 'running') {
      throw new Error(`Cycle ${cycleId} is already running`);
    }

    const execution: CycleExecution = {
      id: generateId(),
      cycleId,
      triggeredBy,
      triggerId,
      state: 'running',
      startedAt: new Date(),
      tasksExecuted: [],
      results: {
        leaksDetected: 0,
        leaksRecovered: 0,
        revenueProtected: 0,
        revenueRecovered: 0,
        alertsGenerated: 0,
        actionsExecuted: 0,
        insightsGenerated: 0,
      },
    };

    this.executions.set(execution.id, execution);
    this.runningCycles.add(cycleId);
    cycle.state = 'running';

    try {
      // Sort tasks by order
      const sortedTasks = [...cycle.tasks].sort((a, b) => a.order - b.order);

      // Execute tasks
      for (const task of sortedTasks) {
        if (!task.enabled) {
          execution.tasksExecuted.push({
            taskId: task.id,
            taskName: task.name,
            state: 'skipped',
            retries: 0,
          });
          continue;
        }

        // Check dependencies
        const dependenciesMet = task.dependencies.every(depId => {
          const depTask = execution.tasksExecuted.find(t => t.taskId === depId);
          return depTask && depTask.state === 'completed';
        });

        if (!dependenciesMet) {
          execution.tasksExecuted.push({
            taskId: task.id,
            taskName: task.name,
            state: 'skipped',
            retries: 0,
            error: 'Dependencies not met',
          });
          continue;
        }

        const taskExecution = await this.executeTask(task, cycle, execution);
        execution.tasksExecuted.push(taskExecution);

        // Update results based on task output
        if (taskExecution.output && typeof taskExecution.output === 'object') {
          const output = taskExecution.output as Record<string, number>;
          if (output.leaksDetected) execution.results.leaksDetected += output.leaksDetected;
          if (output.leaksRecovered) execution.results.leaksRecovered += output.leaksRecovered;
          if (output.revenueProtected) execution.results.revenueProtected += output.revenueProtected;
          if (output.revenueRecovered) execution.results.revenueRecovered += output.revenueRecovered;
        }
      }

      // Complete execution
      execution.state = 'completed';
      execution.completedAt = new Date();

      // Update cycle metrics
      this.updateCycleMetrics(cycle, execution);

    } catch (error) {
      execution.state = 'failed';
      execution.completedAt = new Date();
      execution.error = error instanceof Error ? error.message : 'Unknown error';

      cycle.metrics.failedRuns++;
      cycle.metrics.lastFailureAt = new Date();

      // Check error threshold
      if (cycle.config.pauseOnErrorThreshold) {
        const recentFailures = this.getRecentExecutions(cycleId, 5).filter(e => e.state === 'failed').length;
        if (recentFailures >= cycle.config.errorThreshold) {
          cycle.state = 'paused';
        }
      }
    } finally {
      this.runningCycles.delete(cycleId);
      if (cycle.state === 'running') {
        cycle.state = 'idle';
      }
      cycle.lastRun = execution;
      cycle.nextRunAt = this.calculateNextRun(cycle.schedule.cronExpression, cycle.frequency);
      cycle.updatedAt = new Date();
    }

    return execution;
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    task: CycleTask,
    cycle: AutonomousCycle,
    execution: CycleExecution
  ): Promise<TaskExecution> {
    const taskExecution: TaskExecution = {
      taskId: task.id,
      taskName: task.name,
      state: 'running',
      startedAt: new Date(),
      retries: 0,
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= task.retryPolicy.maxRetries; attempt++) {
      taskExecution.retries = attempt;

      try {
        // Simulate task execution based on type
        const output = await this.simulateTaskExecution(task);
        
        taskExecution.state = 'completed';
        taskExecution.completedAt = new Date();
        taskExecution.duration = taskExecution.completedAt.getTime() - taskExecution.startedAt!.getTime();
        taskExecution.output = output;
        
        return taskExecution;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < task.retryPolicy.maxRetries) {
          await this.delay(task.retryPolicy.backoffMs * Math.pow(2, attempt));
        }
      }
    }

    taskExecution.state = 'failed';
    taskExecution.completedAt = new Date();
    taskExecution.duration = taskExecution.completedAt.getTime() - taskExecution.startedAt!.getTime();
    taskExecution.error = lastError?.message || 'Unknown error';

    return taskExecution;
  }

  /**
   * Simulate task execution
   */
  private async simulateTaskExecution(task: CycleTask): Promise<Record<string, unknown>> {
    await this.delay(100 + Math.random() * 200);

    // Simulate different task types
    switch (task.type) {
      case 'detection':
        return {
          leaksDetected: Math.floor(Math.random() * 10),
          revenueProtected: Math.floor(Math.random() * 50000),
          entitiesScanned: 100,
        };
      case 'analysis':
        return {
          patternsFound: Math.floor(Math.random() * 5),
          insightsGenerated: Math.floor(Math.random() * 3),
          anomaliesDetected: Math.floor(Math.random() * 2),
        };
      case 'recovery':
        return {
          leaksRecovered: Math.floor(Math.random() * 5),
          revenueRecovered: Math.floor(Math.random() * 25000),
          actionsExecuted: Math.floor(Math.random() * 8),
        };
      case 'reporting':
        return {
          reportsGenerated: 1,
          recipientsNotified: Math.floor(Math.random() * 5) + 1,
        };
      case 'maintenance':
        return {
          checksPerformed: Math.floor(Math.random() * 10) + 5,
          issuesFound: Math.floor(Math.random() * 3),
          issuesFixed: Math.floor(Math.random() * 3),
        };
      case 'learning':
        return {
          modelsUpdated: Math.floor(Math.random() * 3) + 1,
          patternsLearned: Math.floor(Math.random() * 5),
          accuracyImprovement: Math.random() * 0.05,
        };
      default:
        return { completed: true };
    }
  }

  /**
   * Update cycle metrics after execution
   */
  private updateCycleMetrics(cycle: AutonomousCycle, execution: CycleExecution): void {
    cycle.metrics.totalRuns++;
    
    if (execution.state === 'completed') {
      cycle.metrics.successfulRuns++;
      cycle.metrics.lastSuccessAt = execution.completedAt;
    } else {
      cycle.metrics.failedRuns++;
      cycle.metrics.lastFailureAt = execution.completedAt;
    }

    // Update averages
    const duration = execution.completedAt
      ? execution.completedAt.getTime() - execution.startedAt.getTime()
      : 0;
    
    cycle.metrics.avgDuration = this.updateAverage(
      cycle.metrics.avgDuration,
      duration,
      cycle.metrics.totalRuns
    );

    cycle.metrics.avgLeaksDetected = this.updateAverage(
      cycle.metrics.avgLeaksDetected,
      execution.results.leaksDetected,
      cycle.metrics.totalRuns
    );

    cycle.metrics.avgRevenueProtected = this.updateAverage(
      cycle.metrics.avgRevenueProtected,
      execution.results.revenueProtected,
      cycle.metrics.totalRuns
    );
  }

  /**
   * Update running average
   */
  private updateAverage(currentAvg: number, newValue: number, n: number): number {
    return currentAvg + (newValue - currentAvg) / n;
  }

  /**
   * Calculate next run time based on frequency
   */
  private calculateNextRun(cronExpression: string, frequency: CycleFrequency): Date | undefined {
    const now = new Date();

    switch (frequency) {
      case 'continuous':
        return new Date(now.getTime() + 60000); // 1 minute
      case 'hourly':
        return new Date(now.getTime() + 3600000); // 1 hour
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(2, 0, 0, 0);
        return tomorrow;
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(3, 0, 0, 0);
        return nextWeek;
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(2, 0, 0, 0);
        return nextMonth;
      case 'on_demand':
        return undefined;
      default:
        return undefined;
    }
  }

  /**
   * Check if a trigger can fire (respecting cooldown)
   */
  private canTrigger(trigger: CycleTrigger): boolean {
    if (!trigger.lastTriggeredAt) return true;
    
    const elapsed = Date.now() - trigger.lastTriggeredAt.getTime();
    return elapsed >= trigger.cooldownMs;
  }

  /**
   * Emit an event to the event queue
   */
  emitEvent(type: string, source: string, data: Record<string, unknown> = {}): SystemEvent {
    const event: SystemEvent = {
      id: generateId(),
      type,
      source,
      timestamp: new Date(),
      data,
      metadata: {},
    };

    // Limit queue size
    if (this.eventQueue.length >= this.config.eventQueueSize) {
      this.eventQueue.shift();
    }

    this.eventQueue.push(event);
    return event;
  }

  /**
   * Subscribe to events
   */
  subscribe(
    eventType: string,
    handler: (event: SystemEvent) => Promise<void>,
    filter?: Record<string, unknown>
  ): EventSubscription {
    const subscription: EventSubscription = {
      id: generateId(),
      eventType,
      cycleId: '',
      handler,
      filter,
      enabled: true,
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  /**
   * Trigger a cycle manually
   */
  async triggerCycle(cycleId: string): Promise<CycleExecution> {
    return this.executeCycle(cycleId, 'manual');
  }

  /**
   * Pause a cycle
   */
  pauseCycle(cycleId: string): boolean {
    const cycle = this.cycles.get(cycleId);
    if (!cycle) return false;

    if (cycle.state === 'running') {
      // Can't pause running cycle, will pause after completion
      cycle.enabled = false;
      return true;
    }

    cycle.state = 'paused';
    cycle.updatedAt = new Date();
    return true;
  }

  /**
   * Resume a paused cycle
   */
  resumeCycle(cycleId: string): boolean {
    const cycle = this.cycles.get(cycleId);
    if (!cycle || cycle.state !== 'paused') return false;

    cycle.state = 'idle';
    cycle.enabled = true;
    cycle.updatedAt = new Date();
    return true;
  }

  /**
   * Enable/disable a cycle
   */
  setCycleEnabled(cycleId: string, enabled: boolean): boolean {
    const cycle = this.cycles.get(cycleId);
    if (!cycle) return false;

    cycle.enabled = enabled;
    cycle.updatedAt = new Date();
    return true;
  }

  /**
   * Get cycle by ID
   */
  getCycle(cycleId: string): AutonomousCycle | undefined {
    return this.cycles.get(cycleId);
  }

  /**
   * Get all cycles
   */
  getCycles(): AutonomousCycle[] {
    return Array.from(this.cycles.values());
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): CycleExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get recent executions for a cycle
   */
  getRecentExecutions(cycleId: string, limit: number = 10): CycleExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.cycleId === cycleId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    totalCycles: number;
    activeCycles: number;
    pausedCycles: number;
    runningCycles: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    queuedEvents: number;
    subscriptions: number;
  } {
    const cycles = this.getCycles();
    const executions = Array.from(this.executions.values());

    return {
      totalCycles: cycles.length,
      activeCycles: cycles.filter(c => c.enabled && c.state !== 'paused').length,
      pausedCycles: cycles.filter(c => c.state === 'paused').length,
      runningCycles: this.runningCycles.size,
      totalExecutions: executions.length,
      successfulExecutions: executions.filter(e => e.state === 'completed').length,
      failedExecutions: executions.filter(e => e.state === 'failed').length,
      queuedEvents: this.eventQueue.length,
      subscriptions: this.subscriptions.size,
    };
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AutonomousCyclesEngine;
