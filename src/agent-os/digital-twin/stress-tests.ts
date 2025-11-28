/**
 * Stress Tests Module
 * Load and performance stress testing for the portal twin
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Stress Test Types
// ============================================================

export interface StressTest {
  id: string;
  name: string;
  description: string;
  type: 'volume' | 'rate' | 'duration' | 'spike' | 'endurance';
  loadProfile: LoadProfile;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface LoadProfile {
  startLoad: number;
  endLoad: number;
  rampUpTime: number;
  sustainTime: number;
  rampDownTime: number;
  pattern: 'linear' | 'exponential' | 'step' | 'sawtooth';
}

export interface StressTestResult {
  id: string;
  testId: string;
  timestamp: Date;
  metrics: StressMetrics;
  breakingPoints: BreakingPoint[];
  degradationPoints: DegradationPoint[];
  recommendations: string[];
  passed: boolean;
}

export interface StressMetrics {
  peakLoad: number;
  avgResponseTime: number;
  maxResponseTime: number;
  throughput: number;
  errorRate: number;
  resourceUtilization: ResourceUtilization;
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  apiCalls: number;
  bandwidth: number;
}

export interface BreakingPoint {
  id: string;
  load: number;
  metric: string;
  threshold: number;
  actualValue: number;
  description: string;
}

export interface DegradationPoint {
  load: number;
  metric: string;
  degradationPercent: number;
  description: string;
}

export interface StressTestConfig {
  maxConcurrency: number;
  timeout: number;
  thresholds: {
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
}

export interface StressTestStats {
  totalTests: number;
  passedTests: number;
  avgBreakingLoad: number;
  lastTest: Date | null;
}

// ============================================================
// Stress Tests Implementation
// ============================================================

export class StressTests {
  private tests: Map<string, StressTest> = new Map();
  private results: Map<string, StressTestResult> = new Map();
  private config: StressTestConfig;
  private stats: StressTestStats;

  constructor(config?: Partial<StressTestConfig>) {
    this.config = {
      maxConcurrency: 100,
      timeout: 30000,
      thresholds: {
        responseTime: 2000,
        errorRate: 0.05,
        throughput: 100,
      },
      ...config,
    };

    this.stats = {
      totalTests: 0,
      passedTests: 0,
      avgBreakingLoad: 0,
      lastTest: null,
    };
  }

  /**
   * Create a stress test
   */
  createTest(
    name: string,
    description: string,
    type: StressTest['type'],
    loadProfile: LoadProfile
  ): StressTest {
    const test: StressTest = {
      id: generateId(),
      name,
      description,
      type,
      loadProfile,
      status: 'pending',
      createdAt: new Date(),
    };

    this.tests.set(test.id, test);
    return test;
  }

  /**
   * Run a stress test simulation
   */
  runTest(testId: string): StressTestResult {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'running';
    test.startedAt = new Date();

    // Simulate stress test
    const metrics = this.simulateLoad(test.loadProfile);
    const breakingPoints = this.findBreakingPoints(metrics, test.loadProfile);
    const degradationPoints = this.findDegradationPoints(test.loadProfile);
    const recommendations = this.generateRecommendations(breakingPoints, metrics);
    const passed = breakingPoints.length === 0 && metrics.errorRate < this.config.thresholds.errorRate;

    const result: StressTestResult = {
      id: generateId(),
      testId,
      timestamp: new Date(),
      metrics,
      breakingPoints,
      degradationPoints,
      recommendations,
      passed,
    };

    this.results.set(result.id, result);
    test.status = 'completed';
    test.completedAt = new Date();

    this.updateStats(result, breakingPoints);

    return result;
  }

  /**
   * Create standard test suite
   */
  createStandardSuite(): StressTest[] {
    const tests: StressTest[] = [];

    // Volume test
    tests.push(this.createTest(
      'Volume Test',
      'Test system capacity with increasing data volume',
      'volume',
      {
        startLoad: 10,
        endLoad: 1000,
        rampUpTime: 60,
        sustainTime: 120,
        rampDownTime: 30,
        pattern: 'linear',
      }
    ));

    // Rate test
    tests.push(this.createTest(
      'Rate Test',
      'Test system throughput with increasing request rate',
      'rate',
      {
        startLoad: 10,
        endLoad: 500,
        rampUpTime: 30,
        sustainTime: 60,
        rampDownTime: 15,
        pattern: 'linear',
      }
    ));

    // Spike test
    tests.push(this.createTest(
      'Spike Test',
      'Test system response to sudden load spikes',
      'spike',
      {
        startLoad: 50,
        endLoad: 500,
        rampUpTime: 5,
        sustainTime: 30,
        rampDownTime: 5,
        pattern: 'step',
      }
    ));

    // Endurance test
    tests.push(this.createTest(
      'Endurance Test',
      'Test system stability under sustained load',
      'endurance',
      {
        startLoad: 100,
        endLoad: 100,
        rampUpTime: 10,
        sustainTime: 3600,
        rampDownTime: 10,
        pattern: 'linear',
      }
    ));

    return tests;
  }

  /**
   * Get test by ID
   */
  getTest(id: string): StressTest | undefined {
    return this.tests.get(id);
  }

  /**
   * Get result by ID
   */
  getResult(id: string): StressTestResult | undefined {
    return this.results.get(id);
  }

  /**
   * Get statistics
   */
  getStats(): StressTestStats {
    return { ...this.stats };
  }

  // Private methods

  private simulateLoad(profile: LoadProfile): StressMetrics {
    // Simulate metrics based on load profile
    const peakLoad = profile.endLoad;
    
    // Response time increases with load
    const baseResponseTime = 100;
    const avgResponseTime = baseResponseTime * (1 + peakLoad / 500);
    const maxResponseTime = avgResponseTime * 3;

    // Throughput approaches limit
    const maxThroughput = this.config.maxConcurrency * 10;
    const throughput = Math.min(peakLoad * 10, maxThroughput * 0.9);

    // Error rate increases at high load
    const loadRatio = peakLoad / this.config.maxConcurrency;
    const errorRate = loadRatio > 0.8 ? (loadRatio - 0.8) * 0.25 : 0;

    // Resource utilization
    const resourceUtilization: ResourceUtilization = {
      cpu: Math.min(loadRatio * 100, 100),
      memory: Math.min(loadRatio * 80, 95),
      apiCalls: peakLoad * 5,
      bandwidth: peakLoad * 100,
    };

    return {
      peakLoad,
      avgResponseTime: Math.round(avgResponseTime),
      maxResponseTime: Math.round(maxResponseTime),
      throughput: Math.round(throughput),
      errorRate: Math.round(errorRate * 100) / 100,
      resourceUtilization,
    };
  }

  private findBreakingPoints(
    metrics: StressMetrics,
    profile: LoadProfile
  ): BreakingPoint[] {
    const breakingPoints: BreakingPoint[] = [];

    // Response time breaking point
    if (metrics.avgResponseTime > this.config.thresholds.responseTime) {
      breakingPoints.push({
        id: generateId(),
        load: Math.round(profile.endLoad * 0.8),
        metric: 'responseTime',
        threshold: this.config.thresholds.responseTime,
        actualValue: metrics.avgResponseTime,
        description: `Response time exceeded ${this.config.thresholds.responseTime}ms threshold`,
      });
    }

    // Error rate breaking point
    if (metrics.errorRate > this.config.thresholds.errorRate) {
      breakingPoints.push({
        id: generateId(),
        load: Math.round(profile.endLoad * 0.75),
        metric: 'errorRate',
        threshold: this.config.thresholds.errorRate,
        actualValue: metrics.errorRate,
        description: `Error rate exceeded ${this.config.thresholds.errorRate * 100}% threshold`,
      });
    }

    // CPU saturation
    if (metrics.resourceUtilization.cpu > 90) {
      breakingPoints.push({
        id: generateId(),
        load: Math.round(profile.endLoad * 0.9),
        metric: 'cpu',
        threshold: 90,
        actualValue: metrics.resourceUtilization.cpu,
        description: 'CPU utilization exceeded 90%',
      });
    }

    // Memory saturation
    if (metrics.resourceUtilization.memory > 90) {
      breakingPoints.push({
        id: generateId(),
        load: Math.round(profile.endLoad * 0.85),
        metric: 'memory',
        threshold: 90,
        actualValue: metrics.resourceUtilization.memory,
        description: 'Memory utilization exceeded 90%',
      });
    }

    return breakingPoints;
  }

  private findDegradationPoints(profile: LoadProfile): DegradationPoint[] {
    const degradationPoints: DegradationPoint[] = [];

    // Response time starts degrading at 50% load
    degradationPoints.push({
      load: Math.round(profile.endLoad * 0.5),
      metric: 'responseTime',
      degradationPercent: 20,
      description: 'Response time begins increasing significantly',
    });

    // Throughput plateaus at 70% load
    degradationPoints.push({
      load: Math.round(profile.endLoad * 0.7),
      metric: 'throughput',
      degradationPercent: 10,
      description: 'Throughput growth slows',
    });

    // Error rate starts at 80% load
    degradationPoints.push({
      load: Math.round(profile.endLoad * 0.8),
      metric: 'errorRate',
      degradationPercent: 5,
      description: 'Errors begin occurring',
    });

    return degradationPoints;
  }

  private generateRecommendations(
    breakingPoints: BreakingPoint[],
    metrics: StressMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (breakingPoints.length === 0) {
      recommendations.push('System handles load well - consider testing with higher load');
    }

    for (const bp of breakingPoints) {
      switch (bp.metric) {
        case 'responseTime':
          recommendations.push('Optimize database queries and add caching');
          recommendations.push('Consider horizontal scaling for API layer');
          break;
        case 'errorRate':
          recommendations.push('Implement circuit breakers and retry logic');
          recommendations.push('Add request throttling/rate limiting');
          break;
        case 'cpu':
          recommendations.push('Optimize CPU-intensive operations');
          recommendations.push('Consider async processing for heavy tasks');
          break;
        case 'memory':
          recommendations.push('Review memory allocation and garbage collection');
          recommendations.push('Implement connection pooling');
          break;
      }
    }

    // General recommendations
    if (metrics.resourceUtilization.apiCalls > 10000) {
      recommendations.push('Consider batching API calls to reduce overhead');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private updateStats(result: StressTestResult, breakingPoints: BreakingPoint[]): void {
    this.stats.totalTests++;
    if (result.passed) {
      this.stats.passedTests++;
    }
    this.stats.lastTest = result.timestamp;

    // Calculate average breaking load
    if (breakingPoints.length > 0) {
      const allResults = Array.from(this.results.values());
      const allBreakingLoads = allResults
        .flatMap(r => r.breakingPoints)
        .map(bp => bp.load);
      
      this.stats.avgBreakingLoad = allBreakingLoads.length > 0
        ? Math.round(allBreakingLoads.reduce((a, b) => a + b, 0) / allBreakingLoads.length)
        : 0;
    }
  }
}

export default StressTests;
