/**
 * Streaming Scheduler Module
 * Coordinates real-time event processing with time-based and event-driven scheduling
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Streaming Scheduler Types
// ============================================================

export type ScheduleType = 'interval' | 'cron' | 'event' | 'watermark' | 'adaptive';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface StreamTask {
  id: string;
  name: string;
  type: ScheduleType;
  handler: TaskHandler;
  schedule: TaskSchedule;
  status: TaskStatus;
  priority: number;
  config: TaskConfig;
  metrics: TaskMetrics;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
}

export type TaskHandler = (context: TaskContext) => Promise<TaskResult>;

export interface TaskSchedule {
  intervalMs?: number;
  cronExpression?: string;
  eventTrigger?: string;
  watermarkField?: string;
  adaptiveConfig?: AdaptiveConfig;
}

export interface AdaptiveConfig {
  minInterval: number;
  maxInterval: number;
  targetLatency: number;
  scaleFactor: number;
}

export interface TaskConfig {
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  concurrent: boolean;
  dependencies: string[];
  conditions: TaskCondition[];
}

export interface TaskCondition {
  type: 'time' | 'metric' | 'state' | 'custom';
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'in' | 'between';
  value: unknown;
}

export interface TaskContext {
  taskId: string;
  runId: string;
  timestamp: Date;
  state: TaskState;
  emit: (event: string, data: unknown) => void;
  checkpoint: () => void;
}

export interface TaskState {
  lastWatermark?: Date;
  lastCheckpoint?: Date;
  customState: Record<string, unknown>;
}

export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
  watermark?: Date;
  nextSchedule?: Date;
}

export interface TaskMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgDuration: number;
  avgLatency: number;
  lastDuration?: number;
}

export interface TaskRun {
  id: string;
  taskId: string;
  status: TaskStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  result?: TaskResult;
  error?: string;
}

export interface Watermark {
  taskId: string;
  value: Date;
  field: string;
  updatedAt: Date;
}

export interface SchedulerConfig {
  maxConcurrent: number;
  defaultTimeout: number;
  checkInterval: number;
  enableWatermarks: boolean;
  enableAdaptive: boolean;
}

export interface SchedulerMetrics {
  totalTasks: number;
  activeTasks: number;
  runningTasks: number;
  totalRuns: number;
  avgTaskLatency: number;
  throughput: number;
  watermarkLag: number;
}

// ============================================================
// Streaming Scheduler Implementation
// ============================================================

export class StreamingScheduler {
  private tasks: Map<string, StreamTask> = new Map();
  private taskRuns: Map<string, TaskRun[]> = new Map();
  private watermarks: Map<string, Watermark> = new Map();
  private taskState: Map<string, TaskState> = new Map();
  private runningTasks: Set<string> = new Set();
  private eventListeners: Map<string, string[]> = new Map();
  private config: SchedulerConfig;
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private startTime: Date = new Date();

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      maxConcurrent: 10,
      defaultTimeout: 60000,
      checkInterval: 100,
      enableWatermarks: true,
      enableAdaptive: true,
      ...config,
    };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = new Date();

    this.checkInterval = setInterval(() => {
      this.checkAndExecuteTasks();
    }, this.config.checkInterval);
  }

  /**
   * Stop the scheduler
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
   * Register a task
   */
  registerTask(params: {
    name: string;
    type: ScheduleType;
    handler: TaskHandler;
    schedule: TaskSchedule;
    priority?: number;
    config?: Partial<TaskConfig>;
  }): StreamTask {
    const task: StreamTask = {
      id: generateId(),
      name: params.name,
      type: params.type,
      handler: params.handler,
      schedule: params.schedule,
      status: 'pending',
      priority: params.priority || 0,
      config: {
        timeout: this.config.defaultTimeout,
        maxRetries: 3,
        retryDelay: 1000,
        concurrent: true,
        dependencies: [],
        conditions: [],
        ...params.config,
      },
      metrics: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        avgDuration: 0,
        avgLatency: 0,
      },
      createdAt: new Date(),
    };

    // Calculate initial next run
    task.nextRun = this.calculateNextRun(task);

    this.tasks.set(task.id, task);
    this.taskRuns.set(task.id, []);
    this.taskState.set(task.id, { customState: {} });

    // Register event listener if event-based
    if (task.type === 'event' && task.schedule.eventTrigger) {
      const listeners = this.eventListeners.get(task.schedule.eventTrigger) || [];
      listeners.push(task.id);
      this.eventListeners.set(task.schedule.eventTrigger, listeners);
    }

    return task;
  }

  /**
   * Unregister a task
   */
  unregisterTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Remove event listener
    if (task.type === 'event' && task.schedule.eventTrigger) {
      const listeners = this.eventListeners.get(task.schedule.eventTrigger) || [];
      const index = listeners.indexOf(taskId);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }

    this.tasks.delete(taskId);
    this.taskRuns.delete(taskId);
    this.taskState.delete(taskId);
    this.watermarks.delete(taskId);
    this.runningTasks.delete(taskId);

    return true;
  }

  /**
   * Trigger an event
   */
  triggerEvent(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event) || [];
    
    for (const taskId of listeners) {
      const task = this.tasks.get(taskId);
      if (task && task.status !== 'cancelled') {
        this.executeTask(task, data);
      }
    }
  }

  /**
   * Update watermark
   */
  updateWatermark(taskId: string, value: Date): void {
    const task = this.tasks.get(taskId);
    if (!task || !this.config.enableWatermarks) return;

    this.watermarks.set(taskId, {
      taskId,
      value,
      field: task.schedule.watermarkField || 'timestamp',
      updatedAt: new Date(),
    });

    const state = this.taskState.get(taskId);
    if (state) {
      state.lastWatermark = value;
    }
  }

  /**
   * Check and execute due tasks
   */
  private async checkAndExecuteTasks(): Promise<void> {
    if (!this.isRunning) return;
    if (this.runningTasks.size >= this.config.maxConcurrent) return;

    const now = new Date();
    const dueTasks: StreamTask[] = [];

    for (const [_, task] of this.tasks) {
      if (task.status === 'cancelled') continue;
      if (this.runningTasks.has(task.id) && !task.config.concurrent) continue;
      if (!this.checkDependencies(task)) continue;
      if (!this.checkConditions(task)) continue;

      // Check if task is due
      if (task.type === 'interval' || task.type === 'cron' || task.type === 'adaptive') {
        if (task.nextRun && task.nextRun <= now) {
          dueTasks.push(task);
        }
      }

      // Watermark-based tasks
      if (task.type === 'watermark' && this.config.enableWatermarks) {
        const watermark = this.watermarks.get(task.id);
        if (watermark) {
          const lag = now.getTime() - watermark.value.getTime();
          if (lag > (task.schedule.intervalMs || 1000)) {
            dueTasks.push(task);
          }
        }
      }
    }

    // Sort by priority
    dueTasks.sort((a, b) => b.priority - a.priority);

    // Execute due tasks
    for (const task of dueTasks) {
      if (this.runningTasks.size >= this.config.maxConcurrent) break;
      void this.executeTask(task);
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(task: StreamTask, eventData?: unknown): Promise<TaskRun> {
    const runId = generateId();
    const run: TaskRun = {
      id: runId,
      taskId: task.id,
      status: 'running',
      startedAt: new Date(),
    };

    const runs = this.taskRuns.get(task.id) || [];
    runs.push(run);
    if (runs.length > 100) runs.shift();
    this.taskRuns.set(task.id, runs);

    this.runningTasks.add(task.id);
    task.status = 'running';
    task.metrics.totalRuns++;

    const state = this.taskState.get(task.id) || { customState: {} };

    const context: TaskContext = {
      taskId: task.id,
      runId,
      timestamp: new Date(),
      state: {
        ...state,
        customState: { ...state.customState, eventData },
      },
      emit: (event, data) => this.triggerEvent(event, data),
      checkpoint: () => {
        state.lastCheckpoint = new Date();
        this.taskState.set(task.id, state);
      },
    };

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(
        task.handler(context),
        task.config.timeout
      );

      run.status = result.success ? 'completed' : 'failed';
      run.result = result;

      if (result.success) {
        task.metrics.successfulRuns++;
        
        // Update watermark if provided
        if (result.watermark && this.config.enableWatermarks) {
          this.updateWatermark(task.id, result.watermark);
        }

        // Adaptive scheduling
        if (task.type === 'adaptive' && this.config.enableAdaptive) {
          this.adaptSchedule(task, run);
        }
      } else {
        task.metrics.failedRuns++;
        run.error = result.error;

        // Retry logic
        if (task.metrics.failedRuns <= task.config.maxRetries) {
          setTimeout(() => {
            this.executeTask(task, eventData);
          }, task.config.retryDelay);
        }
      }

    } catch (error) {
      run.status = 'failed';
      run.error = error instanceof Error ? error.message : 'Unknown error';
      task.metrics.failedRuns++;
    } finally {
      run.completedAt = new Date();
      run.duration = run.completedAt.getTime() - run.startedAt.getTime();

      // Update metrics
      task.metrics.lastDuration = run.duration;
      task.metrics.avgDuration = task.metrics.avgDuration + 
        (run.duration - task.metrics.avgDuration) / task.metrics.totalRuns;

      const latency = run.startedAt.getTime() - (task.nextRun?.getTime() || run.startedAt.getTime());
      task.metrics.avgLatency = task.metrics.avgLatency + 
        (latency - task.metrics.avgLatency) / task.metrics.totalRuns;

      task.lastRun = new Date();
      task.nextRun = this.calculateNextRun(task);
      task.status = 'pending';

      this.runningTasks.delete(task.id);
    }

    return run;
  }

  /**
   * Execute with timeout
   */
  private executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Task timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(task: StreamTask): Date | undefined {
    const now = new Date();

    switch (task.type) {
      case 'interval':
        const interval = task.schedule.intervalMs || 60000;
        return new Date(now.getTime() + interval);

      case 'cron':
        // Simple cron parsing (for production, use a proper cron library)
        return this.parseSimpleCron(task.schedule.cronExpression || '*/5 * * * *');

      case 'adaptive':
        const adaptiveConfig = task.schedule.adaptiveConfig;
        if (!adaptiveConfig) return new Date(now.getTime() + 60000);
        
        // Use current interval or default to min
        const currentInterval = task.schedule.intervalMs || adaptiveConfig.minInterval;
        return new Date(now.getTime() + currentInterval);

      case 'event':
      case 'watermark':
        return undefined; // Event-driven, no scheduled time

      default:
        return new Date(now.getTime() + 60000);
    }
  }

  /**
   * Simple cron parsing (supports basic patterns)
   */
  private parseSimpleCron(expression: string): Date {
    const now = new Date();
    const parts = expression.split(' ');
    
    // Simple implementation: just return next minute for any cron
    const next = new Date(now.getTime());
    next.setSeconds(0);
    next.setMilliseconds(0);
    next.setMinutes(next.getMinutes() + 1);

    // If minutes part is */N, calculate based on interval
    if (parts[0]?.startsWith('*/')) {
      const interval = parseInt(parts[0].slice(2)) || 1;
      const currentMinute = now.getMinutes();
      const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval;
      next.setMinutes(nextMinute);
    }

    return next;
  }

  /**
   * Adapt schedule based on performance
   */
  private adaptSchedule(task: StreamTask, run: TaskRun): void {
    const config = task.schedule.adaptiveConfig;
    if (!config) return;

    const currentInterval = task.schedule.intervalMs || config.minInterval;
    const targetLatency = config.targetLatency;
    const actualLatency = run.duration || 0;

    let newInterval: number;
    if (actualLatency > targetLatency) {
      // Too slow, increase interval
      newInterval = Math.min(currentInterval * config.scaleFactor, config.maxInterval);
    } else if (actualLatency < targetLatency / 2) {
      // Fast enough, decrease interval
      newInterval = Math.max(currentInterval / config.scaleFactor, config.minInterval);
    } else {
      newInterval = currentInterval;
    }

    task.schedule.intervalMs = Math.round(newInterval);
  }

  /**
   * Check task dependencies
   */
  private checkDependencies(task: StreamTask): boolean {
    for (const depId of task.config.dependencies) {
      const depTask = this.tasks.get(depId);
      if (!depTask) continue;
      
      // Check if dependency has run successfully
      const runs = this.taskRuns.get(depId) || [];
      const lastSuccessful = runs.filter(r => r.status === 'completed').pop();
      
      if (!lastSuccessful) return false;
      
      // Check if dependency ran after this task's last run
      if (task.lastRun && lastSuccessful.completedAt && 
          lastSuccessful.completedAt < task.lastRun) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check task conditions
   */
  private checkConditions(task: StreamTask): boolean {
    const now = new Date();
    const state = this.taskState.get(task.id);

    for (const condition of task.config.conditions) {
      let value: unknown;

      switch (condition.type) {
        case 'time':
          if (condition.field === 'hour') value = now.getHours();
          else if (condition.field === 'minute') value = now.getMinutes();
          else if (condition.field === 'dayOfWeek') value = now.getDay();
          break;
        case 'metric':
          value = task.metrics[condition.field as keyof TaskMetrics];
          break;
        case 'state':
          value = state?.customState[condition.field];
          break;
      }

      if (!this.evaluateCondition(value, condition.operator, condition.value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    value: unknown, 
    operator: TaskCondition['operator'], 
    expected: unknown
  ): boolean {
    switch (operator) {
      case 'gt':
        return typeof value === 'number' && typeof expected === 'number' && value > expected;
      case 'lt':
        return typeof value === 'number' && typeof expected === 'number' && value < expected;
      case 'eq':
        return value === expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(value);
      case 'between':
        if (!Array.isArray(expected) || expected.length !== 2) return false;
        return typeof value === 'number' && value >= (expected[0] as number) && value <= (expected[1] as number);
      default:
        return true;
    }
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): StreamTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getTasks(): StreamTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task runs
   */
  getTaskRuns(taskId: string): TaskRun[] {
    return this.taskRuns.get(taskId) || [];
  }

  /**
   * Get watermarks
   */
  getWatermarks(): Watermark[] {
    return Array.from(this.watermarks.values());
  }

  /**
   * Get metrics
   */
  getMetrics(): SchedulerMetrics {
    const tasks = this.getTasks();
    const activeTasks = tasks.filter(t => t.status !== 'cancelled');
    const runningTasks = this.runningTasks.size;

    const totalRuns = tasks.reduce((sum, t) => sum + t.metrics.totalRuns, 0);
    const avgLatency = activeTasks.length > 0
      ? activeTasks.reduce((sum, t) => sum + t.metrics.avgLatency, 0) / activeTasks.length
      : 0;

    const uptime = Date.now() - this.startTime.getTime();
    const throughput = uptime > 0 ? totalRuns / (uptime / 1000) : 0;

    // Calculate watermark lag
    let maxLag = 0;
    const now = Date.now();
    for (const [_, wm] of this.watermarks) {
      const lag = now - wm.value.getTime();
      if (lag > maxLag) maxLag = lag;
    }

    return {
      totalTasks: tasks.length,
      activeTasks: activeTasks.length,
      runningTasks,
      totalRuns,
      avgTaskLatency: avgLatency,
      throughput,
      watermarkLag: maxLag,
    };
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalTasks: number;
    activeTasks: number;
    runningTasks: number;
    completedRuns: number;
    failedRuns: number;
    avgDuration: number;
    isRunning: boolean;
    uptime: number;
  } {
    const tasks = this.getTasks();
    const completedRuns = tasks.reduce((sum, t) => sum + t.metrics.successfulRuns, 0);
    const failedRuns = tasks.reduce((sum, t) => sum + t.metrics.failedRuns, 0);
    const avgDuration = tasks.length > 0
      ? tasks.reduce((sum, t) => sum + t.metrics.avgDuration, 0) / tasks.length
      : 0;

    return {
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.status !== 'cancelled').length,
      runningTasks: this.runningTasks.size,
      completedRuns,
      failedRuns,
      avgDuration,
      isRunning: this.isRunning,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }
}

export default StreamingScheduler;
