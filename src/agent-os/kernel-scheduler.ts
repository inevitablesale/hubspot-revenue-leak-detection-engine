/**
 * Kernel Scheduler Module
 * Makes the Agent OS behave like a true operating system with process management,
 * priority queues, resource allocation, and preemptive scheduling
 */

import { generateId } from '../utils/helpers';

// ============================================================
// Kernel Scheduler Types
// ============================================================

export type ProcessPriority = 'realtime' | 'high' | 'normal' | 'low' | 'idle';
export type ProcessState = 'ready' | 'running' | 'blocked' | 'suspended' | 'terminated';
export type SchedulingPolicy = 'round_robin' | 'priority' | 'fair_share' | 'deadline';

export interface KernelProcess {
  id: string;
  name: string;
  priority: ProcessPriority;
  state: ProcessState;
  cpuBurst: number;
  memoryRequired: number;
  ioWaitTime: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  deadlineAt?: Date;
  parentProcessId?: string;
  childProcessIds: string[];
  context: ProcessContext;
  metrics: ProcessMetrics;
}

export interface ProcessContext {
  variables: Map<string, unknown>;
  stack: unknown[];
  programCounter: number;
  registers: Record<string, unknown>;
}

export interface ProcessMetrics {
  cpuTime: number;
  waitTime: number;
  turnaroundTime: number;
  responseTime: number;
  contextSwitches: number;
  pageFaults: number;
}

export interface SchedulerStats {
  totalProcesses: number;
  runningProcesses: number;
  readyProcesses: number;
  blockedProcesses: number;
  completedProcesses: number;
  avgWaitTime: number;
  avgTurnaroundTime: number;
  avgResponseTime: number;
  cpuUtilization: number;
  throughput: number;
  contextSwitchesPerSecond: number;
}

export interface ResourcePool {
  cpu: { total: number; available: number; allocated: Map<string, number> };
  memory: { total: number; available: number; allocated: Map<string, number> };
  io: { total: number; available: number; allocated: Map<string, number> };
  network: { total: number; available: number; allocated: Map<string, number> };
}

export interface SchedulerConfig {
  policy: SchedulingPolicy;
  timeQuantum: number; // ms
  agingFactor: number;
  preemptionEnabled: boolean;
  maxConcurrentProcesses: number;
  priorityBoostInterval: number; // ms
  deadlineMonitoringEnabled: boolean;
}

export interface TimeSlice {
  processId: string;
  startTime: number;
  endTime: number;
  preempted: boolean;
  cpuUsed: number;
}

export interface SchedulingDecision {
  selectedProcessId: string | null;
  reason: string;
  preemptedProcessId?: string;
  priorityAdjustments: Map<string, ProcessPriority>;
  timestamp: Date;
}

// ============================================================
// Kernel Scheduler Implementation
// ============================================================

export class KernelScheduler {
  private processes: Map<string, KernelProcess> = new Map();
  private readyQueue: Map<ProcessPriority, string[]> = new Map();
  private blockedQueue: string[] = [];
  private runningProcess: string | null = null;
  private config: SchedulerConfig;
  private resourcePool: ResourcePool;
  private schedulingHistory: SchedulingDecision[] = [];
  private timeSlices: TimeSlice[] = [];
  private startTime: Date;
  private lastScheduleTime: number = 0;
  private totalContextSwitches: number = 0;
  private completedProcessCount: number = 0;

  constructor(config?: Partial<SchedulerConfig>) {
    this.startTime = new Date();
    
    this.config = {
      policy: 'priority',
      timeQuantum: 100, // 100ms time slices
      agingFactor: 0.1,
      preemptionEnabled: true,
      maxConcurrentProcesses: 10,
      priorityBoostInterval: 5000, // 5 seconds
      deadlineMonitoringEnabled: true,
      ...config,
    };

    // Initialize ready queues for each priority level
    this.readyQueue.set('realtime', []);
    this.readyQueue.set('high', []);
    this.readyQueue.set('normal', []);
    this.readyQueue.set('low', []);
    this.readyQueue.set('idle', []);

    // Initialize resource pool
    this.resourcePool = {
      cpu: { total: 100, available: 100, allocated: new Map() },
      memory: { total: 1024, available: 1024, allocated: new Map() }, // MB
      io: { total: 100, available: 100, allocated: new Map() },
      network: { total: 100, available: 100, allocated: new Map() },
    };
  }

  /**
   * Create a new process
   */
  createProcess(
    name: string,
    options: {
      priority?: ProcessPriority;
      cpuBurst?: number;
      memoryRequired?: number;
      ioWaitTime?: number;
      deadline?: Date;
      parentProcessId?: string;
    } = {}
  ): KernelProcess {
    const process: KernelProcess = {
      id: generateId(),
      name,
      priority: options.priority || 'normal',
      state: 'ready',
      cpuBurst: options.cpuBurst || 100,
      memoryRequired: options.memoryRequired || 64,
      ioWaitTime: options.ioWaitTime || 0,
      createdAt: new Date(),
      deadlineAt: options.deadline,
      parentProcessId: options.parentProcessId,
      childProcessIds: [],
      context: {
        variables: new Map(),
        stack: [],
        programCounter: 0,
        registers: {},
      },
      metrics: {
        cpuTime: 0,
        waitTime: 0,
        turnaroundTime: 0,
        responseTime: 0,
        contextSwitches: 0,
        pageFaults: 0,
      },
    };

    // Link to parent process
    if (options.parentProcessId) {
      const parent = this.processes.get(options.parentProcessId);
      if (parent) {
        parent.childProcessIds.push(process.id);
      }
    }

    this.processes.set(process.id, process);
    this.addToReadyQueue(process);

    return process;
  }

  /**
   * Add process to ready queue
   */
  private addToReadyQueue(process: KernelProcess): void {
    const queue = this.readyQueue.get(process.priority);
    if (queue) {
      queue.push(process.id);
    }
    process.state = 'ready';
  }

  /**
   * Remove process from ready queue
   */
  private removeFromReadyQueue(processId: string): void {
    for (const [priority, queue] of this.readyQueue) {
      const index = queue.indexOf(processId);
      if (index !== -1) {
        queue.splice(index, 1);
        break;
      }
    }
  }

  /**
   * Schedule next process based on scheduling policy
   */
  schedule(): SchedulingDecision {
    const timestamp = new Date();
    const decision: SchedulingDecision = {
      selectedProcessId: null,
      reason: '',
      priorityAdjustments: new Map(),
      timestamp,
    };

    // Apply aging to prevent starvation
    this.applyAging(decision.priorityAdjustments);

    // Check deadline processes first
    if (this.config.deadlineMonitoringEnabled) {
      const deadlineProcess = this.getHighestPriorityDeadlineProcess();
      if (deadlineProcess) {
        decision.selectedProcessId = deadlineProcess.id;
        decision.reason = 'Deadline-based scheduling';
      }
    }

    // Select process based on policy
    if (!decision.selectedProcessId) {
      switch (this.config.policy) {
        case 'round_robin':
          decision.selectedProcessId = this.selectRoundRobin();
          decision.reason = 'Round-robin scheduling';
          break;
        case 'priority':
          decision.selectedProcessId = this.selectByPriority();
          decision.reason = 'Priority-based scheduling';
          break;
        case 'fair_share':
          decision.selectedProcessId = this.selectFairShare();
          decision.reason = 'Fair-share scheduling';
          break;
        case 'deadline':
          decision.selectedProcessId = this.selectByDeadline();
          decision.reason = 'Earliest deadline first';
          break;
      }
    }

    // Handle preemption if enabled
    if (this.config.preemptionEnabled && this.runningProcess && decision.selectedProcessId) {
      const running = this.processes.get(this.runningProcess);
      const selected = this.processes.get(decision.selectedProcessId);

      if (running && selected && this.shouldPreempt(running, selected)) {
        decision.preemptedProcessId = this.runningProcess;
        this.preemptProcess(this.runningProcess);
      }
    }

    // Context switch if needed
    if (decision.selectedProcessId && decision.selectedProcessId !== this.runningProcess) {
      this.performContextSwitch(decision.selectedProcessId);
    }

    this.schedulingHistory.push(decision);
    this.lastScheduleTime = Date.now();

    return decision;
  }

  /**
   * Select process using round-robin
   */
  private selectRoundRobin(): string | null {
    for (const priority of ['realtime', 'high', 'normal', 'low', 'idle'] as ProcessPriority[]) {
      const queue = this.readyQueue.get(priority);
      if (queue && queue.length > 0) {
        return queue[0];
      }
    }
    return null;
  }

  /**
   * Select process by priority
   */
  private selectByPriority(): string | null {
    for (const priority of ['realtime', 'high', 'normal', 'low', 'idle'] as ProcessPriority[]) {
      const queue = this.readyQueue.get(priority);
      if (queue && queue.length > 0) {
        // Within same priority, use FCFS
        return queue[0];
      }
    }
    return null;
  }

  /**
   * Select process using fair-share scheduling
   */
  private selectFairShare(): string | null {
    // Select process with lowest CPU time used
    let selected: string | null = null;
    let lowestCpuTime = Infinity;

    for (const [id, process] of this.processes) {
      if (process.state === 'ready' && process.metrics.cpuTime < lowestCpuTime) {
        lowestCpuTime = process.metrics.cpuTime;
        selected = id;
      }
    }

    return selected;
  }

  /**
   * Select process by deadline (EDF - Earliest Deadline First)
   */
  private selectByDeadline(): string | null {
    let selected: string | null = null;
    let earliestDeadline = Infinity;

    for (const [id, process] of this.processes) {
      if (process.state === 'ready' && process.deadlineAt) {
        const deadline = process.deadlineAt.getTime();
        if (deadline < earliestDeadline) {
          earliestDeadline = deadline;
          selected = id;
        }
      }
    }

    // Fall back to priority if no deadline processes
    return selected || this.selectByPriority();
  }

  /**
   * Get highest priority deadline process
   */
  private getHighestPriorityDeadlineProcess(): KernelProcess | null {
    const now = Date.now();
    let urgentProcess: KernelProcess | null = null;
    let shortestTimeToDeadline = Infinity;

    for (const [id, process] of this.processes) {
      if (process.state === 'ready' && process.deadlineAt) {
        const timeToDeadline = process.deadlineAt.getTime() - now;
        if (timeToDeadline < process.cpuBurst * 2 && timeToDeadline < shortestTimeToDeadline) {
          shortestTimeToDeadline = timeToDeadline;
          urgentProcess = process;
        }
      }
    }

    return urgentProcess;
  }

  /**
   * Check if running process should be preempted
   */
  private shouldPreempt(running: KernelProcess, candidate: KernelProcess): boolean {
    const priorityOrder: Record<ProcessPriority, number> = {
      realtime: 5,
      high: 4,
      normal: 3,
      low: 2,
      idle: 1,
    };

    // Preempt if candidate has higher priority
    if (priorityOrder[candidate.priority] > priorityOrder[running.priority]) {
      return true;
    }

    // Preempt if candidate has imminent deadline
    if (candidate.deadlineAt && !running.deadlineAt) {
      const timeToDeadline = candidate.deadlineAt.getTime() - Date.now();
      if (timeToDeadline < candidate.cpuBurst * 1.5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Preempt currently running process
   */
  private preemptProcess(processId: string): void {
    const process = this.processes.get(processId);
    if (process) {
      this.saveProcessContext(process);
      this.addToReadyQueue(process);

      // Record time slice
      this.timeSlices.push({
        processId,
        startTime: this.lastScheduleTime,
        endTime: Date.now(),
        preempted: true,
        cpuUsed: Date.now() - this.lastScheduleTime,
      });
    }
    this.runningProcess = null;
  }

  /**
   * Perform context switch to new process
   */
  private performContextSwitch(processId: string): void {
    const process = this.processes.get(processId);
    if (!process) return;

    // Save context of current process if any
    if (this.runningProcess) {
      const currentProcess = this.processes.get(this.runningProcess);
      if (currentProcess) {
        this.saveProcessContext(currentProcess);
        this.addToReadyQueue(currentProcess);
      }
    }

    // Load context of new process
    this.removeFromReadyQueue(processId);
    this.runningProcess = processId;
    process.state = 'running';
    process.metrics.contextSwitches++;
    this.totalContextSwitches++;

    if (!process.startedAt) {
      process.startedAt = new Date();
      process.metrics.responseTime = process.startedAt.getTime() - process.createdAt.getTime();
    }

    // Allocate resources
    this.allocateResources(process);
  }

  /**
   * Save process context
   */
  private saveProcessContext(process: KernelProcess): void {
    // Context is already stored in process object
    // In a real implementation, this would save CPU registers, etc.
    process.context.programCounter++;
  }

  /**
   * Allocate resources to process
   */
  private allocateResources(process: KernelProcess): boolean {
    if (this.resourcePool.memory.available < process.memoryRequired) {
      return false;
    }

    const cpuAlloc = Math.min(20, this.resourcePool.cpu.available);
    this.resourcePool.cpu.available -= cpuAlloc;
    this.resourcePool.cpu.allocated.set(process.id, cpuAlloc);

    this.resourcePool.memory.available -= process.memoryRequired;
    this.resourcePool.memory.allocated.set(process.id, process.memoryRequired);

    return true;
  }

  /**
   * Release resources from process
   */
  private releaseResources(processId: string): void {
    const cpuAlloc = this.resourcePool.cpu.allocated.get(processId) || 0;
    this.resourcePool.cpu.available += cpuAlloc;
    this.resourcePool.cpu.allocated.delete(processId);

    const memAlloc = this.resourcePool.memory.allocated.get(processId) || 0;
    this.resourcePool.memory.available += memAlloc;
    this.resourcePool.memory.allocated.delete(processId);
  }

  /**
   * Apply aging to prevent starvation
   */
  private applyAging(adjustments: Map<string, ProcessPriority>): void {
    const now = Date.now();
    const agingThreshold = this.config.priorityBoostInterval;

    for (const [id, process] of this.processes) {
      if (process.state === 'ready') {
        const waitTime = now - process.createdAt.getTime();
        
        if (waitTime > agingThreshold && process.priority !== 'realtime') {
          const newPriority = this.boostPriority(process.priority);
          if (newPriority !== process.priority) {
            this.removeFromReadyQueue(id);
            process.priority = newPriority;
            this.addToReadyQueue(process);
            adjustments.set(id, newPriority);
          }
        }
      }
    }
  }

  /**
   * Boost process priority by one level
   */
  private boostPriority(current: ProcessPriority): ProcessPriority {
    switch (current) {
      case 'idle': return 'low';
      case 'low': return 'normal';
      case 'normal': return 'high';
      case 'high': return 'realtime';
      default: return current;
    }
  }

  /**
   * Execute current process for one time quantum
   */
  async executeQuantum(): Promise<{
    processId: string | null;
    completed: boolean;
    cpuUsed: number;
  }> {
    if (!this.runningProcess) {
      return { processId: null, completed: false, cpuUsed: 0 };
    }

    const process = this.processes.get(this.runningProcess);
    if (!process) {
      return { processId: null, completed: false, cpuUsed: 0 };
    }

    const cpuUsed = Math.min(this.config.timeQuantum, process.cpuBurst - process.metrics.cpuTime);
    
    // Simulate execution
    await this.simulateExecution(cpuUsed);
    
    process.metrics.cpuTime += cpuUsed;
    
    // Check if process is complete
    if (process.metrics.cpuTime >= process.cpuBurst) {
      this.terminateProcess(process.id);
      return { processId: process.id, completed: true, cpuUsed };
    }

    // Record time slice
    this.timeSlices.push({
      processId: process.id,
      startTime: this.lastScheduleTime,
      endTime: Date.now(),
      preempted: false,
      cpuUsed,
    });

    return { processId: process.id, completed: false, cpuUsed };
  }

  /**
   * Simulate execution delay
   */
  private simulateExecution(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.min(ms, 10)));
  }

  /**
   * Block a process (e.g., waiting for I/O)
   */
  blockProcess(processId: string, reason: string = 'I/O wait'): void {
    const process = this.processes.get(processId);
    if (!process) return;

    if (processId === this.runningProcess) {
      this.releaseResources(processId);
      this.runningProcess = null;
    } else {
      this.removeFromReadyQueue(processId);
    }

    process.state = 'blocked';
    this.blockedQueue.push(processId);
  }

  /**
   * Unblock a process
   */
  unblockProcess(processId: string): void {
    const process = this.processes.get(processId);
    if (!process || process.state !== 'blocked') return;

    const index = this.blockedQueue.indexOf(processId);
    if (index !== -1) {
      this.blockedQueue.splice(index, 1);
    }

    this.addToReadyQueue(process);
  }

  /**
   * Suspend a process
   */
  suspendProcess(processId: string): void {
    const process = this.processes.get(processId);
    if (!process) return;

    this.saveProcessContext(process);
    
    if (processId === this.runningProcess) {
      this.releaseResources(processId);
      this.runningProcess = null;
    } else {
      this.removeFromReadyQueue(processId);
    }

    process.state = 'suspended';
  }

  /**
   * Resume a suspended process
   */
  resumeProcess(processId: string): void {
    const process = this.processes.get(processId);
    if (!process || process.state !== 'suspended') return;

    this.addToReadyQueue(process);
  }

  /**
   * Terminate a process
   */
  terminateProcess(processId: string): void {
    const process = this.processes.get(processId);
    if (!process) return;

    process.state = 'terminated';
    process.completedAt = new Date();
    process.metrics.turnaroundTime = process.completedAt.getTime() - process.createdAt.getTime();

    // Release resources
    this.releaseResources(processId);

    // Remove from queues
    if (processId === this.runningProcess) {
      this.runningProcess = null;
    } else {
      this.removeFromReadyQueue(processId);
    }

    // Terminate child processes
    for (const childId of process.childProcessIds) {
      this.terminateProcess(childId);
    }

    this.completedProcessCount++;
  }

  /**
   * Get process by ID
   */
  getProcess(processId: string): KernelProcess | undefined {
    return this.processes.get(processId);
  }

  /**
   * Get all processes
   */
  getProcesses(): KernelProcess[] {
    return Array.from(this.processes.values());
  }

  /**
   * Get processes by state
   */
  getProcessesByState(state: ProcessState): KernelProcess[] {
    return this.getProcesses().filter(p => p.state === state);
  }

  /**
   * Get resource pool status
   */
  getResourcePool(): ResourcePool {
    return {
      cpu: { ...this.resourcePool.cpu, allocated: new Map(this.resourcePool.cpu.allocated) },
      memory: { ...this.resourcePool.memory, allocated: new Map(this.resourcePool.memory.allocated) },
      io: { ...this.resourcePool.io, allocated: new Map(this.resourcePool.io.allocated) },
      network: { ...this.resourcePool.network, allocated: new Map(this.resourcePool.network.allocated) },
    };
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    const processes = this.getProcesses();
    const completed = processes.filter(p => p.state === 'terminated');
    const running = processes.filter(p => p.state === 'running');
    const ready = processes.filter(p => p.state === 'ready');
    const blocked = processes.filter(p => p.state === 'blocked');

    const uptimeMs = Date.now() - this.startTime.getTime();
    const uptimeSeconds = uptimeMs / 1000;

    return {
      totalProcesses: processes.length,
      runningProcesses: running.length,
      readyProcesses: ready.length,
      blockedProcesses: blocked.length,
      completedProcesses: completed.length,
      avgWaitTime: this.calculateAverage(completed, p => p.metrics.waitTime),
      avgTurnaroundTime: this.calculateAverage(completed, p => p.metrics.turnaroundTime),
      avgResponseTime: this.calculateAverage(completed, p => p.metrics.responseTime),
      cpuUtilization: (this.resourcePool.cpu.total - this.resourcePool.cpu.available) / this.resourcePool.cpu.total,
      throughput: this.completedProcessCount / uptimeSeconds,
      contextSwitchesPerSecond: this.totalContextSwitches / uptimeSeconds,
    };
  }

  /**
   * Calculate average of metric
   */
  private calculateAverage(processes: KernelProcess[], metric: (p: KernelProcess) => number): number {
    if (processes.length === 0) return 0;
    const sum = processes.reduce((acc, p) => acc + metric(p), 0);
    return sum / processes.length;
  }

  /**
   * Get scheduling history
   */
  getSchedulingHistory(): SchedulingDecision[] {
    return [...this.schedulingHistory];
  }

  /**
   * Get time slices
   */
  getTimeSlices(): TimeSlice[] {
    return [...this.timeSlices];
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * Reset scheduler state
   */
  reset(): void {
    this.processes.clear();
    this.readyQueue.forEach(queue => queue.length = 0);
    this.blockedQueue = [];
    this.runningProcess = null;
    this.schedulingHistory = [];
    this.timeSlices = [];
    this.totalContextSwitches = 0;
    this.completedProcessCount = 0;
    this.startTime = new Date();

    // Reset resource pool
    this.resourcePool.cpu.available = this.resourcePool.cpu.total;
    this.resourcePool.cpu.allocated.clear();
    this.resourcePool.memory.available = this.resourcePool.memory.total;
    this.resourcePool.memory.allocated.clear();
  }
}

export default KernelScheduler;
