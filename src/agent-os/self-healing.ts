/**
 * Self-Healing Module
 * Auto-recovery mechanisms and adaptive behavior
 */

import { RevenueLeak, LeakType } from '../types';
import { generateId } from '../utils/helpers';
import {
  HealthCheck,
  HealthMetric,
  HealthIssue,
  HealingStrategy,
  HealingStep,
  SelfHealingConfig,
} from './types';

export interface HealingResult {
  issueId: string;
  status: 'healed' | 'partial' | 'failed' | 'escalated';
  stepsCompleted: number;
  totalSteps: number;
  duration: number;
  rollbackPerformed: boolean;
  details: string[];
  completedAt: Date;
}

export interface DataQualityCheck {
  field: string;
  expectedType: string;
  validationRule: string;
  severity: 'warning' | 'error' | 'critical';
}

export interface ProcessHealthIndicator {
  processName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastSuccessfulRun?: Date;
  errorRate: number;
  avgDuration: number;
}

export class SelfHealingEngine {
  private healthChecks: Map<string, HealthCheck> = new Map();
  private strategies: Map<string, HealingStrategy> = new Map();
  private issues: Map<string, HealthIssue> = new Map();
  private config: SelfHealingConfig;
  private healingHistory: HealingResult[] = [];

  constructor(config?: Partial<SelfHealingConfig>) {
    this.config = {
      enabled: true,
      autoHealEnabled: true,
      healthCheckIntervalMs: 60000,
      maxAutoHealAttempts: 3,
      ...config,
    };

    this.initializeDefaultStrategies();
    this.initializeHealthChecks();
  }

  /**
   * Initialize default healing strategies
   */
  private initializeDefaultStrategies(): void {
    // Data quality healing
    this.strategies.set('data-quality-fix', {
      id: 'data-quality-fix',
      name: 'Data Quality Remediation',
      steps: [
        { order: 1, action: 'identify_invalid_records', config: {}, validationCheck: 'records_identified' },
        { order: 2, action: 'quarantine_invalid_data', config: {}, rollbackAction: 'restore_quarantined_data' },
        { order: 3, action: 'attempt_data_correction', config: {} },
        { order: 4, action: 'verify_correction', config: {}, validationCheck: 'data_valid' },
        { order: 5, action: 'release_quarantine', config: {} },
      ],
      successRate: 0.85,
      averageHealingTime: 5000,
      requiresApproval: false,
    });

    // Integration recovery
    this.strategies.set('integration-recovery', {
      id: 'integration-recovery',
      name: 'Integration Connection Recovery',
      steps: [
        { order: 1, action: 'check_connection_status', config: {} },
        { order: 2, action: 'attempt_reconnection', config: { maxAttempts: 3 } },
        { order: 3, action: 'refresh_credentials', config: {} },
        { order: 4, action: 'resync_data', config: { fullSync: false } },
        { order: 5, action: 'verify_connection', config: {}, validationCheck: 'connection_stable' },
      ],
      successRate: 0.78,
      averageHealingTime: 15000,
      requiresApproval: false,
    });

    // Process stall recovery
    this.strategies.set('process-recovery', {
      id: 'process-recovery',
      name: 'Process Stall Recovery',
      steps: [
        { order: 1, action: 'identify_stalled_processes', config: {} },
        { order: 2, action: 'save_process_state', config: {}, rollbackAction: 'restore_process_state' },
        { order: 3, action: 'terminate_stalled_process', config: {} },
        { order: 4, action: 'restart_process', config: {} },
        { order: 5, action: 'verify_process_running', config: {}, validationCheck: 'process_healthy' },
      ],
      successRate: 0.92,
      averageHealingTime: 8000,
      requiresApproval: false,
    });

    // Leak detection calibration
    this.strategies.set('detection-calibration', {
      id: 'detection-calibration',
      name: 'Detection Calibration',
      steps: [
        { order: 1, action: 'analyze_false_positive_rate', config: {} },
        { order: 2, action: 'adjust_thresholds', config: { adjustmentFactor: 0.1 }, rollbackAction: 'restore_thresholds' },
        { order: 3, action: 'retrain_patterns', config: {} },
        { order: 4, action: 'validate_detection_accuracy', config: {}, validationCheck: 'accuracy_improved' },
      ],
      successRate: 0.70,
      averageHealingTime: 30000,
      requiresApproval: true,
    });

    // Performance degradation fix
    this.strategies.set('performance-fix', {
      id: 'performance-fix',
      name: 'Performance Optimization',
      steps: [
        { order: 1, action: 'identify_bottlenecks', config: {} },
        { order: 2, action: 'clear_caches', config: {} },
        { order: 3, action: 'optimize_queries', config: {} },
        { order: 4, action: 'rebalance_load', config: {} },
        { order: 5, action: 'verify_performance', config: {}, validationCheck: 'performance_acceptable' },
      ],
      successRate: 0.88,
      averageHealingTime: 12000,
      requiresApproval: false,
    });
  }

  /**
   * Initialize health checks
   */
  private initializeHealthChecks(): void {
    // Data quality check
    this.healthChecks.set('data-quality', {
      id: 'data-quality',
      name: 'Data Quality Check',
      type: 'data_quality',
      status: 'healthy',
      lastCheck: new Date(),
      nextCheck: new Date(Date.now() + this.config.healthCheckIntervalMs),
      metrics: [
        { name: 'completeness', value: 95, threshold: { warning: 90, critical: 80 }, trend: 'stable' },
        { name: 'accuracy', value: 98, threshold: { warning: 95, critical: 90 }, trend: 'stable' },
        { name: 'consistency', value: 92, threshold: { warning: 88, critical: 80 }, trend: 'stable' },
      ],
      issues: [],
    });

    // Process health check
    this.healthChecks.set('process-health', {
      id: 'process-health',
      name: 'Process Health Check',
      type: 'process_health',
      status: 'healthy',
      lastCheck: new Date(),
      nextCheck: new Date(Date.now() + this.config.healthCheckIntervalMs),
      metrics: [
        { name: 'error_rate', value: 0.02, threshold: { warning: 0.05, critical: 0.1 }, trend: 'improving' },
        { name: 'avg_execution_time', value: 1200, threshold: { warning: 2000, critical: 5000 }, trend: 'stable' },
        { name: 'queue_depth', value: 5, threshold: { warning: 20, critical: 50 }, trend: 'stable' },
      ],
      issues: [],
    });

    // Integration health check
    this.healthChecks.set('integration-status', {
      id: 'integration-status',
      name: 'Integration Status Check',
      type: 'integration_status',
      status: 'healthy',
      lastCheck: new Date(),
      nextCheck: new Date(Date.now() + this.config.healthCheckIntervalMs),
      metrics: [
        { name: 'connection_uptime', value: 99.5, threshold: { warning: 99, critical: 95 }, trend: 'stable' },
        { name: 'sync_lag_seconds', value: 30, threshold: { warning: 120, critical: 300 }, trend: 'stable' },
        { name: 'api_success_rate', value: 99.8, threshold: { warning: 99, critical: 98 }, trend: 'stable' },
      ],
      issues: [],
    });

    // Performance check
    this.healthChecks.set('performance', {
      id: 'performance',
      name: 'Performance Check',
      type: 'performance',
      status: 'healthy',
      lastCheck: new Date(),
      nextCheck: new Date(Date.now() + this.config.healthCheckIntervalMs),
      metrics: [
        { name: 'response_time_p95', value: 250, threshold: { warning: 500, critical: 1000 }, trend: 'stable' },
        { name: 'memory_utilization', value: 65, threshold: { warning: 80, critical: 90 }, trend: 'stable' },
        { name: 'cpu_utilization', value: 45, threshold: { warning: 70, critical: 85 }, trend: 'stable' },
      ],
      issues: [],
    });
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<HealthCheck[]> {
    const results: HealthCheck[] = [];

    for (const [id, check] of this.healthChecks) {
      const updatedCheck = await this.runHealthCheck(id);
      results.push(updatedCheck);
    }

    return results;
  }

  /**
   * Run a specific health check
   */
  async runHealthCheck(checkId: string): Promise<HealthCheck> {
    const check = this.healthChecks.get(checkId);
    if (!check) {
      throw new Error(`Health check ${checkId} not found`);
    }

    // Simulate metric updates with some variance
    check.metrics = check.metrics.map(metric => ({
      ...metric,
      value: this.simulateMetricValue(metric),
      trend: this.determineTrend(metric),
    }));

    // Evaluate health status
    check.status = this.evaluateHealthStatus(check.metrics);
    check.lastCheck = new Date();
    check.nextCheck = new Date(Date.now() + this.config.healthCheckIntervalMs);

    // Detect issues
    const newIssues = this.detectIssues(check);
    
    for (const issue of newIssues) {
      if (!check.issues.find(i => i.description === issue.description)) {
        check.issues.push(issue);
        this.issues.set(issue.id, issue);

        // Auto-heal if enabled
        if (this.config.autoHealEnabled && issue.autoHealable) {
          this.scheduleAutoHeal(issue);
        }
      }
    }

    // Remove resolved issues
    check.issues = check.issues.filter(issue => issue.status !== 'healed');

    return check;
  }

  /**
   * Simulate metric value changes
   */
  private simulateMetricValue(metric: HealthMetric): number {
    // Add small random variance for simulation
    const variance = metric.value * 0.05;
    return metric.value + (Math.random() - 0.5) * variance;
  }

  /**
   * Determine metric trend
   */
  private determineTrend(metric: HealthMetric): 'improving' | 'stable' | 'degrading' {
    // For metrics where lower is better
    const lowerIsBetter = ['error_rate', 'response_time_p95', 'sync_lag_seconds', 'queue_depth', 
                          'memory_utilization', 'cpu_utilization'];
    
    const isLowerBetter = lowerIsBetter.includes(metric.name);
    const distanceFromWarning = isLowerBetter
      ? metric.threshold.warning - metric.value
      : metric.value - metric.threshold.warning;

    if (distanceFromWarning > metric.threshold.warning * 0.2) {
      return 'improving';
    } else if (distanceFromWarning < metric.threshold.warning * 0.1) {
      return 'degrading';
    }
    return 'stable';
  }

  /**
   * Evaluate overall health status
   */
  private evaluateHealthStatus(metrics: HealthMetric[]): HealthCheck['status'] {
    const lowerIsBetter = ['error_rate', 'response_time_p95', 'sync_lag_seconds', 'queue_depth',
                          'memory_utilization', 'cpu_utilization'];

    let hasCritical = false;
    let hasWarning = false;

    for (const metric of metrics) {
      const isLowerBetter = lowerIsBetter.includes(metric.name);
      
      if (isLowerBetter) {
        if (metric.value >= metric.threshold.critical) hasCritical = true;
        else if (metric.value >= metric.threshold.warning) hasWarning = true;
      } else {
        if (metric.value <= metric.threshold.critical) hasCritical = true;
        else if (metric.value <= metric.threshold.warning) hasWarning = true;
      }
    }

    if (hasCritical) return 'unhealthy';
    if (hasWarning) return 'degraded';
    return 'healthy';
  }

  /**
   * Detect issues from health check
   */
  private detectIssues(check: HealthCheck): HealthIssue[] {
    const issues: HealthIssue[] = [];
    const lowerIsBetter = ['error_rate', 'response_time_p95', 'sync_lag_seconds', 'queue_depth',
                          'memory_utilization', 'cpu_utilization'];

    for (const metric of check.metrics) {
      const isLowerBetter = lowerIsBetter.includes(metric.name);
      let severity: HealthIssue['severity'] | null = null;

      if (isLowerBetter) {
        if (metric.value >= metric.threshold.critical) severity = 'critical';
        else if (metric.value >= metric.threshold.warning) severity = 'warning';
      } else {
        if (metric.value <= metric.threshold.critical) severity = 'critical';
        else if (metric.value <= metric.threshold.warning) severity = 'warning';
      }

      if (severity) {
        const strategy = this.selectHealingStrategy(check.type, metric.name);
        
        issues.push({
          id: generateId(),
          severity,
          description: `${metric.name} is ${severity}: ${metric.value} (threshold: ${isLowerBetter ? '<' : '>'}${severity === 'critical' ? metric.threshold.critical : metric.threshold.warning})`,
          detectedAt: new Date(),
          autoHealable: strategy !== undefined && !strategy.requiresApproval,
          healingStrategy: strategy,
          status: 'detected',
        });
      }
    }

    return issues;
  }

  /**
   * Select appropriate healing strategy
   */
  private selectHealingStrategy(checkType: string, metricName: string): HealingStrategy | undefined {
    switch (checkType) {
      case 'data_quality':
        return this.strategies.get('data-quality-fix');
      case 'integration_status':
        return this.strategies.get('integration-recovery');
      case 'process_health':
        if (metricName === 'queue_depth' || metricName === 'error_rate') {
          return this.strategies.get('process-recovery');
        }
        return this.strategies.get('performance-fix');
      case 'performance':
        return this.strategies.get('performance-fix');
      default:
        return undefined;
    }
  }

  /**
   * Schedule auto-healing for an issue
   */
  private async scheduleAutoHeal(issue: HealthIssue): Promise<void> {
    // Immediate execution for simulation
    await this.heal(issue.id);
  }

  /**
   * Attempt to heal an issue
   */
  async heal(issueId: string): Promise<HealingResult> {
    const issue = this.issues.get(issueId);
    if (!issue) {
      throw new Error(`Issue ${issueId} not found`);
    }

    if (!issue.healingStrategy) {
      return {
        issueId,
        status: 'escalated',
        stepsCompleted: 0,
        totalSteps: 0,
        duration: 0,
        rollbackPerformed: false,
        details: ['No healing strategy available'],
        completedAt: new Date(),
      };
    }

    const strategy = issue.healingStrategy;
    const startTime = Date.now();
    const details: string[] = [];
    let stepsCompleted = 0;
    let rollbackPerformed = false;

    issue.status = 'healing';

    try {
      for (const step of strategy.steps.sort((a, b) => a.order - b.order)) {
        details.push(`Executing: ${step.action}`);
        
        // Simulate step execution
        await this.executeHealingStep(step);
        stepsCompleted++;
        details.push(`Completed: ${step.action}`);

        // Validate if required
        if (step.validationCheck) {
          const valid = await this.validateStep(step.validationCheck);
          if (!valid) {
            details.push(`Validation failed: ${step.validationCheck}`);
            
            // Attempt rollback if available
            if (step.rollbackAction) {
              details.push(`Rolling back: ${step.rollbackAction}`);
              await this.executeRollback(step.rollbackAction);
              rollbackPerformed = true;
            }
            
            throw new Error(`Validation failed at step ${step.order}`);
          }
        }
      }

      issue.status = 'healed';
      
      const result: HealingResult = {
        issueId,
        status: 'healed',
        stepsCompleted,
        totalSteps: strategy.steps.length,
        duration: Date.now() - startTime,
        rollbackPerformed,
        details,
        completedAt: new Date(),
      };

      this.healingHistory.push(result);
      return result;

    } catch (error) {
      issue.status = stepsCompleted > 0 ? 'healing' : 'escalated';
      
      const result: HealingResult = {
        issueId,
        status: stepsCompleted > 0 ? 'partial' : 'failed',
        stepsCompleted,
        totalSteps: strategy.steps.length,
        duration: Date.now() - startTime,
        rollbackPerformed,
        details: [...details, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        completedAt: new Date(),
      };

      this.healingHistory.push(result);
      return result;
    }
  }

  /**
   * Execute a healing step
   */
  private async executeHealingStep(step: HealingStep): Promise<void> {
    // Simulate step execution with random success/failure
    await this.simulateDelay(100 + Math.random() * 200);
    
    // 95% success rate for individual steps
    if (Math.random() < 0.05) {
      throw new Error(`Step ${step.action} failed`);
    }
  }

  /**
   * Validate a step
   */
  private async validateStep(validationCheck: string): Promise<boolean> {
    await this.simulateDelay(50);
    // 90% validation success rate
    return Math.random() > 0.1;
  }

  /**
   * Execute rollback action
   */
  private async executeRollback(rollbackAction: string): Promise<void> {
    await this.simulateDelay(100);
  }

  /**
   * Simulate delay
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Escalate an issue for manual intervention
   */
  escalateIssue(issueId: string, reason: string): void {
    const issue = this.issues.get(issueId);
    if (issue) {
      issue.status = 'escalated';
      issue.autoHealable = false;
    }
  }

  /**
   * Get all health checks
   */
  getHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Get health check by ID
   */
  getHealthCheck(checkId: string): HealthCheck | undefined {
    return this.healthChecks.get(checkId);
  }

  /**
   * Get all issues
   */
  getIssues(): HealthIssue[] {
    return Array.from(this.issues.values());
  }

  /**
   * Get active issues
   */
  getActiveIssues(): HealthIssue[] {
    return this.getIssues().filter(i => i.status !== 'healed');
  }

  /**
   * Get healing history
   */
  getHealingHistory(): HealingResult[] {
    return [...this.healingHistory];
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheck[];
    activeIssues: number;
    healingInProgress: number;
    recentHealings: number;
  } {
    const checks = this.getHealthChecks();
    const activeIssues = this.getActiveIssues();
    const healingInProgress = activeIssues.filter(i => i.status === 'healing').length;
    const recentHealings = this.healingHistory.filter(h => 
      Date.now() - h.completedAt.getTime() < 3600000 // Last hour
    ).length;

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (checks.some(c => c.status === 'unhealthy')) {
      overall = 'unhealthy';
    } else if (checks.some(c => c.status === 'degraded')) {
      overall = 'degraded';
    }

    return {
      overall,
      checks,
      activeIssues: activeIssues.length,
      healingInProgress,
      recentHealings,
    };
  }

  /**
   * Get healing statistics
   */
  getHealingStats(): {
    totalHealed: number;
    totalFailed: number;
    successRate: number;
    averageHealingTime: number;
    byStrategy: Record<string, { attempts: number; successes: number }>;
  } {
    const healed = this.healingHistory.filter(h => h.status === 'healed').length;
    const failed = this.healingHistory.filter(h => h.status === 'failed').length;
    const total = this.healingHistory.length;

    const avgTime = total > 0
      ? this.healingHistory.reduce((sum, h) => sum + h.duration, 0) / total
      : 0;

    return {
      totalHealed: healed,
      totalFailed: failed,
      successRate: total > 0 ? healed / total : 0,
      averageHealingTime: avgTime,
      byStrategy: {},
    };
  }
}

export default SelfHealingEngine;
