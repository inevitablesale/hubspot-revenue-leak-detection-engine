/**
 * Meta-Intelligence Module
 * Higher-order insights about system performance and capabilities
 */

import { RevenueLeak, LeakType, LeakDetectionResult } from '../types';
import { generateId } from '../utils/helpers';
import {
  SystemInsight,
  MetaMetric,
  AgentPerformance,
  CapabilityAssessment,
  MetaIntelligenceConfig,
} from './types';

export interface SystemBenchmark {
  id: string;
  name: string;
  category: string;
  currentValue: number;
  industryAverage: number;
  topPerformer: number;
  percentile: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ImprovementOpportunity {
  id: string;
  area: string;
  currentState: string;
  targetState: string;
  estimatedImpact: {
    metric: string;
    improvement: number;
    timeframe: number;
  };
  effort: 'low' | 'medium' | 'high';
  priority: number;
  steps: string[];
}

export interface SystemDiagnostic {
  id: string;
  timestamp: Date;
  category: 'performance' | 'accuracy' | 'coverage' | 'efficiency' | 'reliability';
  status: 'healthy' | 'attention' | 'action_required';
  findings: string[];
  metrics: MetaMetric[];
  recommendations: string[];
}

export interface LearningProgress {
  capability: string;
  startDate: Date;
  currentAccuracy: number;
  targetAccuracy: number;
  progress: number;
  milestones: Array<{ date: Date; accuracy: number }>;
  estimatedTimeToTarget: number;
}

export class MetaIntelligenceEngine {
  private insights: Map<string, SystemInsight> = new Map();
  private performance: AgentPerformance[] = [];
  private capabilities: Map<string, CapabilityAssessment> = new Map();
  private benchmarks: Map<string, SystemBenchmark> = new Map();
  private opportunities: Map<string, ImprovementOpportunity> = new Map();
  private config: MetaIntelligenceConfig;

  constructor(config?: Partial<MetaIntelligenceConfig>) {
    this.config = {
      enabled: true,
      reportingIntervalHours: 24,
      benchmarkEnabled: true,
      improvementSuggestionsEnabled: true,
      ...config,
    };

    this.initializeCapabilities();
    this.initializeBenchmarks();
  }

  /**
   * Initialize capability assessments
   */
  private initializeCapabilities(): void {
    const defaultCapabilities = [
      {
        capability: 'Detection Accuracy',
        maturityLevel: 'defined' as const,
        score: 75,
        strengths: ['Low false positive rate', 'Good coverage of common leak types'],
        gaps: ['Limited anomaly detection', 'No predictive capabilities'],
        improvementPlan: ['Implement ML-based anomaly detection', 'Add predictive modeling'],
      },
      {
        capability: 'Recovery Automation',
        maturityLevel: 'developing' as const,
        score: 55,
        strengths: ['Basic workflow automation', 'Integration with HubSpot'],
        gaps: ['Manual intervention required frequently', 'Limited error handling'],
        improvementPlan: ['Increase automation coverage', 'Implement retry logic'],
      },
      {
        capability: 'Cross-System Integration',
        maturityLevel: 'initial' as const,
        score: 35,
        strengths: ['HubSpot integration stable'],
        gaps: ['Limited external integrations', 'No bidirectional sync'],
        improvementPlan: ['Add ERP integration', 'Implement real-time sync'],
      },
      {
        capability: 'Predictive Analytics',
        maturityLevel: 'initial' as const,
        score: 25,
        strengths: ['Basic trend analysis'],
        gaps: ['No ML models', 'Limited forecasting'],
        improvementPlan: ['Deploy time-series forecasting', 'Implement churn prediction'],
      },
      {
        capability: 'Self-Optimization',
        maturityLevel: 'developing' as const,
        score: 45,
        strengths: ['Rule-based optimization', 'Feedback collection'],
        gaps: ['No automated rule evolution', 'Limited learning from outcomes'],
        improvementPlan: ['Implement automated A/B testing', 'Add reinforcement learning'],
      },
    ];

    for (const cap of defaultCapabilities) {
      this.capabilities.set(cap.capability, cap);
    }
  }

  /**
   * Initialize benchmarks
   */
  private initializeBenchmarks(): void {
    const defaultBenchmarks = [
      {
        id: 'detection-rate',
        name: 'Leak Detection Rate',
        category: 'accuracy',
        currentValue: 78,
        industryAverage: 65,
        topPerformer: 92,
        percentile: 72,
        trend: 'improving' as const,
      },
      {
        id: 'recovery-rate',
        name: 'Recovery Success Rate',
        category: 'effectiveness',
        currentValue: 65,
        industryAverage: 55,
        topPerformer: 85,
        percentile: 68,
        trend: 'stable' as const,
      },
      {
        id: 'time-to-detect',
        name: 'Average Time to Detect (hours)',
        category: 'speed',
        currentValue: 12,
        industryAverage: 24,
        topPerformer: 4,
        percentile: 75,
        trend: 'improving' as const,
      },
      {
        id: 'false-positive-rate',
        name: 'False Positive Rate',
        category: 'accuracy',
        currentValue: 8,
        industryAverage: 15,
        topPerformer: 3,
        percentile: 78,
        trend: 'stable' as const,
      },
      {
        id: 'automation-level',
        name: 'Automation Level (%)',
        category: 'efficiency',
        currentValue: 45,
        industryAverage: 35,
        topPerformer: 80,
        percentile: 62,
        trend: 'improving' as const,
      },
    ];

    for (const benchmark of defaultBenchmarks) {
      this.benchmarks.set(benchmark.id, benchmark);
    }
  }

  /**
   * Analyze system performance and generate insights
   */
  analyzeSystem(
    leakResults: LeakDetectionResult,
    recoveryData?: {
      attempted: number;
      successful: number;
      revenue: number;
    }
  ): SystemInsight[] {
    const insights: SystemInsight[] = [];

    // Performance insight
    insights.push(this.generatePerformanceInsight(leakResults, recoveryData));

    // Accuracy insight
    insights.push(this.generateAccuracyInsight(leakResults));

    // Efficiency insight
    insights.push(this.generateEfficiencyInsight(leakResults));

    // Coverage insight
    insights.push(this.generateCoverageInsight(leakResults));

    // Health insight
    insights.push(this.generateHealthInsight());

    // Store insights
    for (const insight of insights) {
      this.insights.set(insight.id, insight);
    }

    return insights;
  }

  /**
   * Generate performance insight
   */
  private generatePerformanceInsight(
    results: LeakDetectionResult,
    recoveryData?: {
      attempted: number;
      successful: number;
      revenue: number;
    }
  ): SystemInsight {
    const metrics: MetaMetric[] = [
      {
        name: 'Total Leaks Detected',
        value: results.summary.totalLeaks,
        unit: 'leaks',
        trend: 'stable',
      },
      {
        name: 'Potential Revenue at Risk',
        value: results.summary.totalPotentialRevenue,
        unit: 'USD',
        trend: 'stable',
      },
    ];

    if (recoveryData) {
      metrics.push(
        {
          name: 'Recovery Rate',
          value: recoveryData.attempted > 0 
            ? (recoveryData.successful / recoveryData.attempted) * 100 
            : 0,
          unit: '%',
          trend: 'improving',
        },
        {
          name: 'Revenue Recovered',
          value: recoveryData.revenue,
          unit: 'USD',
          trend: 'improving',
        }
      );
    }

    const recommendations: string[] = [];
    
    if (results.summary.bySeverity.critical > 0) {
      recommendations.push(`Address ${results.summary.bySeverity.critical} critical leaks immediately`);
    }

    if (results.summary.totalLeaks > 10) {
      recommendations.push('Consider implementing preventive measures to reduce leak volume');
    }

    return {
      id: generateId(),
      category: 'performance',
      title: 'System Performance Summary',
      description: `System detected ${results.summary.totalLeaks} leaks with $${results.summary.totalPotentialRevenue.toLocaleString()} at risk`,
      metrics,
      recommendations,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate accuracy insight
   */
  private generateAccuracyInsight(results: LeakDetectionResult): SystemInsight {
    const benchmark = this.benchmarks.get('false-positive-rate');
    const falsePositiveRate = benchmark?.currentValue || 8;

    const metrics: MetaMetric[] = [
      {
        name: 'Estimated Accuracy',
        value: 100 - falsePositiveRate,
        unit: '%',
        trend: 'stable',
        benchmark: 92,
      },
      {
        name: 'False Positive Rate',
        value: falsePositiveRate,
        unit: '%',
        trend: 'stable',
        benchmark: 8,
      },
      {
        name: 'Detection Coverage',
        value: 85,
        unit: '%',
        trend: 'improving',
        benchmark: 90,
      },
    ];

    const recommendations: string[] = [];
    
    if (falsePositiveRate > 10) {
      recommendations.push('Review detection thresholds to reduce false positives');
    }

    recommendations.push('Collect feedback on detected leaks to improve accuracy');

    return {
      id: generateId(),
      category: 'accuracy',
      title: 'Detection Accuracy Analysis',
      description: `Current detection accuracy is estimated at ${(100 - falsePositiveRate).toFixed(1)}%`,
      metrics,
      recommendations,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate efficiency insight
   */
  private generateEfficiencyInsight(results: LeakDetectionResult): SystemInsight {
    const timeToDetectBenchmark = this.benchmarks.get('time-to-detect');
    const automationBenchmark = this.benchmarks.get('automation-level');

    const metrics: MetaMetric[] = [
      {
        name: 'Avg Time to Detect',
        value: timeToDetectBenchmark?.currentValue || 12,
        unit: 'hours',
        trend: 'improving',
        benchmark: 4,
      },
      {
        name: 'Automation Level',
        value: automationBenchmark?.currentValue || 45,
        unit: '%',
        trend: 'improving',
        benchmark: 80,
      },
      {
        name: 'Processing Throughput',
        value: results.summary.totalLeaks > 0 ? results.summary.totalLeaks * 60 : 0,
        unit: 'leaks/hour',
        trend: 'stable',
      },
    ];

    const recommendations: string[] = [];
    
    if ((automationBenchmark?.currentValue || 45) < 50) {
      recommendations.push('Increase automation to reduce manual intervention');
    }

    recommendations.push('Optimize detection algorithms for faster processing');

    return {
      id: generateId(),
      category: 'efficiency',
      title: 'Operational Efficiency Analysis',
      description: `System operating at ${automationBenchmark?.currentValue || 45}% automation with ${timeToDetectBenchmark?.currentValue || 12}h average detection time`,
      metrics,
      recommendations,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate coverage insight
   */
  private generateCoverageInsight(results: LeakDetectionResult): SystemInsight {
    const leakTypes = Object.keys(results.summary.byType) as LeakType[];
    const coveredTypes = leakTypes.filter(t => results.summary.byType[t] > 0);

    const metrics: MetaMetric[] = [
      {
        name: 'Leak Types Covered',
        value: leakTypes.length,
        unit: 'types',
        trend: 'stable',
      },
      {
        name: 'Active Leak Types',
        value: coveredTypes.length,
        unit: 'types',
        trend: 'stable',
      },
      {
        name: 'Entity Type Coverage',
        value: 85,
        unit: '%',
        trend: 'stable',
        benchmark: 95,
      },
    ];

    const recommendations: string[] = [];
    
    const unusedTypes = leakTypes.filter(t => results.summary.byType[t] === 0);
    if (unusedTypes.length > 0) {
      recommendations.push(`Verify detection rules for: ${unusedTypes.join(', ')}`);
    }

    recommendations.push('Consider adding custom leak type definitions for your business');

    return {
      id: generateId(),
      category: 'coverage',
      title: 'Detection Coverage Analysis',
      description: `Monitoring ${leakTypes.length} leak types with ${coveredTypes.length} currently active`,
      metrics,
      recommendations,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate health insight
   */
  private generateHealthInsight(): SystemInsight {
    const capabilities = Array.from(this.capabilities.values());
    const avgScore = capabilities.reduce((sum, c) => sum + c.score, 0) / capabilities.length;

    const metrics: MetaMetric[] = [
      {
        name: 'Overall Capability Score',
        value: avgScore,
        unit: '/100',
        trend: 'improving',
      },
      {
        name: 'System Uptime',
        value: 99.5,
        unit: '%',
        trend: 'stable',
      },
      {
        name: 'API Response Time',
        value: 180,
        unit: 'ms',
        trend: 'stable',
        benchmark: 200,
      },
    ];

    const recommendations: string[] = [];
    
    const weakCapabilities = capabilities.filter(c => c.score < 50);
    if (weakCapabilities.length > 0) {
      recommendations.push(`Improve capabilities: ${weakCapabilities.map(c => c.capability).join(', ')}`);
    }

    return {
      id: generateId(),
      category: 'health',
      title: 'System Health Overview',
      description: `Overall capability score: ${avgScore.toFixed(0)}/100`,
      metrics,
      recommendations,
      generatedAt: new Date(),
    };
  }

  /**
   * Record agent performance
   */
  recordPerformance(
    period: { start: Date; end: Date },
    metrics: Partial<AgentPerformance>
  ): AgentPerformance {
    const perf: AgentPerformance = {
      id: generateId(),
      period,
      detectionAccuracy: metrics.detectionAccuracy || 0,
      falsePositiveRate: metrics.falsePositiveRate || 0,
      recoverySuccessRate: metrics.recoverySuccessRate || 0,
      averageTimeToDetection: metrics.averageTimeToDetection || 0,
      averageTimeToResolution: metrics.averageTimeToResolution || 0,
      totalValueProtected: metrics.totalValueProtected || 0,
      totalValueRecovered: metrics.totalValueRecovered || 0,
      userSatisfaction: metrics.userSatisfaction,
    };

    this.performance.push(perf);

    // Update benchmarks based on performance
    this.updateBenchmarksFromPerformance(perf);

    return perf;
  }

  /**
   * Update benchmarks from performance data
   */
  private updateBenchmarksFromPerformance(perf: AgentPerformance): void {
    const detectionRate = this.benchmarks.get('detection-rate');
    if (detectionRate) {
      detectionRate.currentValue = perf.detectionAccuracy;
      detectionRate.trend = perf.detectionAccuracy > detectionRate.currentValue ? 'improving' : 'stable';
    }

    const recoveryRate = this.benchmarks.get('recovery-rate');
    if (recoveryRate) {
      recoveryRate.currentValue = perf.recoverySuccessRate;
    }

    const falsePositiveRate = this.benchmarks.get('false-positive-rate');
    if (falsePositiveRate) {
      falsePositiveRate.currentValue = perf.falsePositiveRate;
    }
  }

  /**
   * Identify improvement opportunities
   */
  identifyOpportunities(): ImprovementOpportunity[] {
    const opportunities: ImprovementOpportunity[] = [];

    // Check capabilities for improvement areas
    for (const capability of this.capabilities.values()) {
      if (capability.score < 60) {
        opportunities.push({
          id: generateId(),
          area: capability.capability,
          currentState: `Score: ${capability.score}/100, Level: ${capability.maturityLevel}`,
          targetState: `Score: 80/100, Level: managed`,
          estimatedImpact: {
            metric: 'capability_score',
            improvement: 80 - capability.score,
            timeframe: 90,
          },
          effort: capability.score < 40 ? 'high' : 'medium',
          priority: 100 - capability.score,
          steps: capability.improvementPlan,
        });
      }
    }

    // Check benchmarks for improvement areas
    for (const benchmark of this.benchmarks.values()) {
      const gap = benchmark.topPerformer - benchmark.currentValue;
      if (gap > benchmark.topPerformer * 0.2) { // More than 20% gap to top performer
        opportunities.push({
          id: generateId(),
          area: benchmark.name,
          currentState: `${benchmark.currentValue} (${benchmark.percentile}th percentile)`,
          targetState: `${benchmark.topPerformer} (top performer)`,
          estimatedImpact: {
            metric: benchmark.category,
            improvement: gap,
            timeframe: 120,
          },
          effort: gap > benchmark.topPerformer * 0.4 ? 'high' : 'medium',
          priority: Math.round(gap / benchmark.topPerformer * 100),
          steps: this.generateImprovementSteps(benchmark),
        });
      }
    }

    // Sort by priority
    opportunities.sort((a, b) => b.priority - a.priority);

    // Store opportunities
    for (const opp of opportunities) {
      this.opportunities.set(opp.id, opp);
    }

    return opportunities;
  }

  /**
   * Generate improvement steps for a benchmark
   */
  private generateImprovementSteps(benchmark: SystemBenchmark): string[] {
    const steps: string[] = [];

    switch (benchmark.category) {
      case 'accuracy':
        steps.push('Analyze false positive patterns');
        steps.push('Refine detection thresholds');
        steps.push('Implement feedback-based learning');
        steps.push('Add validation checks');
        break;
      case 'effectiveness':
        steps.push('Review recovery workflows');
        steps.push('Increase automation coverage');
        steps.push('Add retry mechanisms');
        steps.push('Implement parallel processing');
        break;
      case 'speed':
        steps.push('Optimize detection algorithms');
        steps.push('Implement caching');
        steps.push('Enable real-time processing');
        steps.push('Reduce batch processing delays');
        break;
      case 'efficiency':
        steps.push('Automate manual tasks');
        steps.push('Streamline approval workflows');
        steps.push('Implement smart routing');
        steps.push('Add predictive prioritization');
        break;
      default:
        steps.push('Analyze current performance');
        steps.push('Identify bottlenecks');
        steps.push('Implement improvements');
        steps.push('Monitor results');
    }

    return steps;
  }

  /**
   * Run system diagnostic
   */
  runDiagnostic(): SystemDiagnostic {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let status: SystemDiagnostic['status'] = 'healthy';

    // Check capabilities
    const weakCapabilities = Array.from(this.capabilities.values())
      .filter(c => c.score < 50);
    
    if (weakCapabilities.length > 0) {
      status = 'attention';
      findings.push(`${weakCapabilities.length} capabilities below threshold`);
      recommendations.push('Focus on improving: ' + weakCapabilities.map(c => c.capability).join(', '));
    }

    // Check benchmarks
    const underperformingBenchmarks = Array.from(this.benchmarks.values())
      .filter(b => b.percentile < 50);
    
    if (underperformingBenchmarks.length > 0) {
      if (underperformingBenchmarks.length >= 3) {
        status = 'action_required';
      }
      findings.push(`${underperformingBenchmarks.length} benchmarks below industry average`);
    }

    // Check recent performance
    const recentPerf = this.performance[this.performance.length - 1];
    if (recentPerf) {
      if (recentPerf.falsePositiveRate > 15) {
        status = 'attention';
        findings.push('False positive rate above acceptable threshold');
        recommendations.push('Review and refine detection rules');
      }
      if (recentPerf.recoverySuccessRate < 50) {
        status = 'action_required';
        findings.push('Recovery success rate below 50%');
        recommendations.push('Investigate recovery workflow failures');
      }
    }

    const metrics: MetaMetric[] = [];
    for (const benchmark of this.benchmarks.values()) {
      // Map benchmark trend to MetaMetric trend type
      const metricTrend: 'improving' | 'stable' | 'degrading' = 
        benchmark.trend === 'declining' ? 'degrading' : benchmark.trend;
      
      metrics.push({
        name: benchmark.name,
        value: benchmark.currentValue,
        unit: benchmark.category,
        trend: metricTrend,
        benchmark: benchmark.industryAverage,
      });
    }

    return {
      id: generateId(),
      timestamp: new Date(),
      category: 'performance',
      status,
      findings,
      metrics,
      recommendations,
    };
  }

  /**
   * Get capability assessment
   */
  getCapabilities(): CapabilityAssessment[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Update capability assessment
   */
  updateCapability(
    capability: string,
    updates: Partial<CapabilityAssessment>
  ): void {
    const existing = this.capabilities.get(capability);
    if (existing) {
      Object.assign(existing, updates);
    }
  }

  /**
   * Get benchmarks
   */
  getBenchmarks(): SystemBenchmark[] {
    return Array.from(this.benchmarks.values());
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): AgentPerformance[] {
    return [...this.performance];
  }

  /**
   * Get all insights
   */
  getInsights(): SystemInsight[] {
    return Array.from(this.insights.values());
  }

  /**
   * Get improvement opportunities
   */
  getOpportunities(): ImprovementOpportunity[] {
    return Array.from(this.opportunities.values());
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary(): {
    overallScore: number;
    maturityLevel: string;
    keyStrengths: string[];
    keyGaps: string[];
    topPriorities: string[];
    performanceTrend: 'improving' | 'stable' | 'declining';
  } {
    const capabilities = this.getCapabilities();
    const benchmarks = this.getBenchmarks();

    const overallScore = capabilities.reduce((sum, c) => sum + c.score, 0) / capabilities.length;
    
    const maturityLevels = ['initial', 'developing', 'defined', 'managed', 'optimizing'];
    const avgMaturity = capabilities.reduce((sum, c) => 
      sum + maturityLevels.indexOf(c.maturityLevel), 0) / capabilities.length;
    const maturityLevel = maturityLevels[Math.floor(avgMaturity)];

    const keyStrengths = capabilities
      .filter(c => c.score >= 70)
      .flatMap(c => c.strengths)
      .slice(0, 3);

    const keyGaps = capabilities
      .filter(c => c.score < 50)
      .flatMap(c => c.gaps)
      .slice(0, 3);

    const topPriorities = this.getOpportunities()
      .slice(0, 3)
      .map(o => o.area);

    const improvingBenchmarks = benchmarks.filter(b => b.trend === 'improving').length;
    const decliningBenchmarks = benchmarks.filter(b => b.trend === 'declining').length;
    
    let performanceTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (improvingBenchmarks > decliningBenchmarks + 1) {
      performanceTrend = 'improving';
    } else if (decliningBenchmarks > improvingBenchmarks + 1) {
      performanceTrend = 'declining';
    }

    return {
      overallScore: Math.round(overallScore),
      maturityLevel,
      keyStrengths,
      keyGaps,
      topPriorities,
      performanceTrend,
    };
  }
}

export default MetaIntelligenceEngine;
