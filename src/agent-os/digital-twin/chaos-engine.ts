/**
 * Chaos Engine Module
 * Chaos engineering for testing system resilience and failure recovery
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Chaos Engine Types
// ============================================================

export interface ChaosExperiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  failureMode: FailureMode;
  target: ChaosTarget;
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'aborted';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface FailureMode {
  type: 'latency' | 'error' | 'timeout' | 'resource' | 'data' | 'dependency';
  intensity: 'low' | 'medium' | 'high';
  pattern: 'constant' | 'random' | 'burst' | 'gradual';
  parameters: Record<string, unknown>;
}

export interface ChaosTarget {
  component: string;
  scope: 'single' | 'partial' | 'full';
  selector?: string;
}

export interface ChaosResult {
  id: string;
  experimentId: string;
  timestamp: Date;
  resilienceScore: ResilienceScore;
  observations: ChaosObservation[];
  failures: ChaosFailure[];
  recoveryMetrics: RecoveryMetrics;
  passed: boolean;
}

export interface ResilienceScore {
  overall: number;
  availability: number;
  recovery: number;
  degradation: number;
  isolation: number;
}

export interface ChaosObservation {
  timestamp: Date;
  metric: string;
  value: number;
  expected: number;
  withinTolerance: boolean;
}

export interface ChaosFailure {
  id: string;
  type: string;
  component: string;
  impact: 'none' | 'minor' | 'major' | 'critical';
  description: string;
  cascaded: boolean;
}

export interface RecoveryMetrics {
  detectionTime: number;
  responseTime: number;
  recoveryTime: number;
  fullRecoveryTime: number;
  dataLoss: boolean;
  manualIntervention: boolean;
}

export interface ChaosConfig {
  safeMode: boolean;
  maxDuration: number;
  abortThreshold: number;
  monitoringInterval: number;
}

export interface ChaosStats {
  totalExperiments: number;
  passedExperiments: number;
  avgResilienceScore: number;
  lastExperiment: Date | null;
}

// ============================================================
// Chaos Engine Implementation
// ============================================================

export class ChaosEngine {
  private experiments: Map<string, ChaosExperiment> = new Map();
  private results: Map<string, ChaosResult> = new Map();
  private config: ChaosConfig;
  private stats: ChaosStats;

  constructor(config?: Partial<ChaosConfig>) {
    this.config = {
      safeMode: true,
      maxDuration: 300,
      abortThreshold: 0.3,
      monitoringInterval: 5,
      ...config,
    };

    this.stats = {
      totalExperiments: 0,
      passedExperiments: 0,
      avgResilienceScore: 0,
      lastExperiment: null,
    };
  }

  /**
   * Create a chaos experiment
   */
  createExperiment(
    name: string,
    description: string,
    hypothesis: string,
    failureMode: FailureMode,
    target: ChaosTarget,
    duration: number
  ): ChaosExperiment {
    const experiment: ChaosExperiment = {
      id: generateId(),
      name,
      description,
      hypothesis,
      failureMode,
      target,
      duration: Math.min(duration, this.config.maxDuration),
      status: 'pending',
      createdAt: new Date(),
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  /**
   * Run a chaos experiment simulation
   */
  runExperiment(experimentId: string): ChaosResult {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    experiment.status = 'running';
    experiment.startedAt = new Date();

    // Simulate chaos experiment
    const observations = this.simulateChaos(experiment);
    const failures = this.identifyFailures(experiment, observations);
    const recoveryMetrics = this.measureRecovery(experiment, failures);
    const resilienceScore = this.calculateResilienceScore(observations, failures, recoveryMetrics);
    const passed = resilienceScore.overall >= 70 && failures.every(f => f.impact !== 'critical');

    const result: ChaosResult = {
      id: generateId(),
      experimentId,
      timestamp: new Date(),
      resilienceScore,
      observations,
      failures,
      recoveryMetrics,
      passed,
    };

    this.results.set(result.id, result);
    experiment.status = 'completed';
    experiment.completedAt = new Date();

    this.updateStats(result);

    return result;
  }

  /**
   * Create standard chaos experiments
   */
  createStandardExperiments(): ChaosExperiment[] {
    const experiments: ChaosExperiment[] = [];

    // API latency injection
    experiments.push(this.createExperiment(
      'API Latency',
      'Test system behavior under API latency',
      'System should maintain functionality with degraded response times',
      {
        type: 'latency',
        intensity: 'medium',
        pattern: 'constant',
        parameters: { delayMs: 2000 },
      },
      { component: 'api', scope: 'partial' },
      60
    ));

    // Error injection
    experiments.push(this.createExperiment(
      'Error Injection',
      'Test error handling capabilities',
      'System should gracefully handle errors without cascading failures',
      {
        type: 'error',
        intensity: 'medium',
        pattern: 'random',
        parameters: { errorRate: 0.2 },
      },
      { component: 'api', scope: 'partial' },
      60
    ));

    // Timeout simulation
    experiments.push(this.createExperiment(
      'Timeout Simulation',
      'Test timeout handling',
      'System should handle timeouts and retry appropriately',
      {
        type: 'timeout',
        intensity: 'high',
        pattern: 'burst',
        parameters: { timeoutRate: 0.3 },
      },
      { component: 'external_service', scope: 'full' },
      30
    ));

    // Resource exhaustion
    experiments.push(this.createExperiment(
      'Resource Exhaustion',
      'Test behavior under resource constraints',
      'System should degrade gracefully under resource pressure',
      {
        type: 'resource',
        intensity: 'high',
        pattern: 'gradual',
        parameters: { cpuPressure: 0.9, memoryPressure: 0.85 },
      },
      { component: 'system', scope: 'full' },
      120
    ));

    // Data corruption simulation
    experiments.push(this.createExperiment(
      'Data Integrity',
      'Test data validation and integrity checks',
      'System should detect and handle corrupted data',
      {
        type: 'data',
        intensity: 'low',
        pattern: 'random',
        parameters: { corruptionRate: 0.05 },
      },
      { component: 'data_layer', scope: 'partial' },
      60
    ));

    // Dependency failure
    experiments.push(this.createExperiment(
      'Dependency Failure',
      'Test handling of dependency failures',
      'System should function with degraded dependencies',
      {
        type: 'dependency',
        intensity: 'high',
        pattern: 'constant',
        parameters: { failedDependencies: ['hubspot_api', 'cache'] },
      },
      { component: 'integrations', scope: 'partial' },
      90
    ));

    return experiments;
  }

  /**
   * Abort a running experiment
   */
  abortExperiment(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (experiment && experiment.status === 'running') {
      experiment.status = 'aborted';
      experiment.completedAt = new Date();
    }
  }

  /**
   * Get experiment by ID
   */
  getExperiment(id: string): ChaosExperiment | undefined {
    return this.experiments.get(id);
  }

  /**
   * Get result by ID
   */
  getResult(id: string): ChaosResult | undefined {
    return this.results.get(id);
  }

  /**
   * Get statistics
   */
  getStats(): ChaosStats {
    return { ...this.stats };
  }

  // Private methods

  private simulateChaos(experiment: ChaosExperiment): ChaosObservation[] {
    const observations: ChaosObservation[] = [];
    const steps = Math.ceil(experiment.duration / this.config.monitoringInterval);

    for (let i = 0; i < steps; i++) {
      const timestamp = new Date(Date.now() + i * this.config.monitoringInterval * 1000);

      // Simulate response time
      const baseResponseTime = 200;
      const chaos = this.calculateChaosEffect(experiment.failureMode, i / steps);
      const actualResponseTime = baseResponseTime * (1 + chaos.latencyFactor);

      observations.push({
        timestamp,
        metric: 'responseTime',
        value: actualResponseTime,
        expected: baseResponseTime * 1.5,
        withinTolerance: actualResponseTime < baseResponseTime * 2,
      });

      // Simulate error rate
      observations.push({
        timestamp,
        metric: 'errorRate',
        value: chaos.errorRate,
        expected: 0.01,
        withinTolerance: chaos.errorRate < 0.1,
      });

      // Simulate availability
      const availability = 1 - chaos.errorRate;
      observations.push({
        timestamp,
        metric: 'availability',
        value: availability,
        expected: 0.99,
        withinTolerance: availability > 0.95,
      });
    }

    return observations;
  }

  private calculateChaosEffect(
    failureMode: FailureMode,
    progress: number
  ): { latencyFactor: number; errorRate: number } {
    const intensityMultiplier = {
      low: 0.5,
      medium: 1,
      high: 2,
    }[failureMode.intensity];

    let latencyFactor = 0;
    let errorRate = 0;

    switch (failureMode.type) {
      case 'latency':
        latencyFactor = intensityMultiplier * 2;
        break;
      case 'error':
        errorRate = intensityMultiplier * 0.15;
        break;
      case 'timeout':
        latencyFactor = intensityMultiplier * 5;
        errorRate = intensityMultiplier * 0.1;
        break;
      case 'resource':
        latencyFactor = intensityMultiplier * 3;
        errorRate = intensityMultiplier * 0.05;
        break;
      case 'data':
        errorRate = intensityMultiplier * 0.03;
        break;
      case 'dependency':
        latencyFactor = intensityMultiplier * 4;
        errorRate = intensityMultiplier * 0.2;
        break;
    }

    // Apply pattern
    switch (failureMode.pattern) {
      case 'gradual':
        latencyFactor *= progress;
        errorRate *= progress;
        break;
      case 'burst':
        if (progress > 0.4 && progress < 0.6) {
          latencyFactor *= 2;
          errorRate *= 2;
        }
        break;
      case 'random':
        latencyFactor *= 0.5 + Math.random();
        errorRate *= 0.5 + Math.random();
        break;
    }

    return { latencyFactor, errorRate };
  }

  private identifyFailures(
    experiment: ChaosExperiment,
    observations: ChaosObservation[]
  ): ChaosFailure[] {
    const failures: ChaosFailure[] = [];

    // Check for tolerance violations
    const violations = observations.filter(o => !o.withinTolerance);
    
    if (violations.length > observations.length * 0.3) {
      failures.push({
        id: generateId(),
        type: 'tolerance_breach',
        component: experiment.target.component,
        impact: violations.length > observations.length * 0.5 ? 'major' : 'minor',
        description: `${violations.length} observations exceeded tolerance`,
        cascaded: false,
      });
    }

    // Check for specific failure patterns
    const highErrors = observations.filter(o => o.metric === 'errorRate' && o.value > 0.2);
    if (highErrors.length > 0) {
      failures.push({
        id: generateId(),
        type: 'high_error_rate',
        component: experiment.target.component,
        impact: highErrors.some(e => e.value > 0.5) ? 'critical' : 'major',
        description: `High error rates detected (max: ${Math.max(...highErrors.map(e => e.value))}%)`,
        cascaded: experiment.target.scope === 'full',
      });
    }

    const lowAvailability = observations.filter(o => o.metric === 'availability' && o.value < 0.9);
    if (lowAvailability.length > 0) {
      failures.push({
        id: generateId(),
        type: 'availability_degradation',
        component: experiment.target.component,
        impact: lowAvailability.some(a => a.value < 0.8) ? 'critical' : 'major',
        description: `Availability dropped below 90%`,
        cascaded: false,
      });
    }

    return failures;
  }

  private measureRecovery(
    experiment: ChaosExperiment,
    failures: ChaosFailure[]
  ): RecoveryMetrics {
    const hasFailures = failures.length > 0;
    const criticalFailures = failures.filter(f => f.impact === 'critical');

    // Simulate recovery times based on failure severity
    const baseTimes = {
      detection: 5,
      response: 10,
      recovery: 30,
      fullRecovery: 60,
    };

    const severityMultiplier = criticalFailures.length > 0 ? 3 : failures.length > 0 ? 1.5 : 1;

    return {
      detectionTime: hasFailures ? baseTimes.detection * severityMultiplier : 0,
      responseTime: hasFailures ? baseTimes.response * severityMultiplier : 0,
      recoveryTime: hasFailures ? baseTimes.recovery * severityMultiplier : 0,
      fullRecoveryTime: hasFailures ? baseTimes.fullRecovery * severityMultiplier : 0,
      dataLoss: criticalFailures.some(f => f.type === 'data_corruption'),
      manualIntervention: criticalFailures.length > 0,
    };
  }

  private calculateResilienceScore(
    observations: ChaosObservation[],
    failures: ChaosFailure[],
    recovery: RecoveryMetrics
  ): ResilienceScore {
    // Availability score based on observations
    const availabilityObs = observations.filter(o => o.metric === 'availability');
    const avgAvailability = availabilityObs.length > 0
      ? availabilityObs.reduce((sum, o) => sum + o.value, 0) / availabilityObs.length
      : 1;
    const availability = Math.round(avgAvailability * 100);

    // Recovery score based on recovery times
    const maxRecoveryTime = 120; // 2 minutes max acceptable
    const recoveryScore = Math.max(0, 100 - (recovery.recoveryTime / maxRecoveryTime) * 100);

    // Degradation score based on tolerance violations
    const withinTolerance = observations.filter(o => o.withinTolerance).length;
    const degradation = Math.round((withinTolerance / observations.length) * 100);

    // Isolation score based on cascading failures
    const cascadedFailures = failures.filter(f => f.cascaded);
    const isolation = cascadedFailures.length > 0 ? 50 : 100;

    // Overall score
    const overall = Math.round(
      (availability * 0.3) +
      (recoveryScore * 0.25) +
      (degradation * 0.25) +
      (isolation * 0.2)
    );

    return {
      overall,
      availability,
      recovery: Math.round(recoveryScore),
      degradation,
      isolation,
    };
  }

  private updateStats(result: ChaosResult): void {
    this.stats.totalExperiments++;
    if (result.passed) {
      this.stats.passedExperiments++;
    }
    this.stats.lastExperiment = result.timestamp;

    // Calculate average resilience score
    const allResults = Array.from(this.results.values());
    this.stats.avgResilienceScore = allResults.length > 0
      ? Math.round(allResults.reduce((sum, r) => sum + r.resilienceScore.overall, 0) / allResults.length)
      : 0;
  }
}

export default ChaosEngine;
