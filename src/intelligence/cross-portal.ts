/**
 * Cross-Portal Intelligence Service
 * Builds leak pattern benchmarks across multiple portals (anonymized)
 */

import { LeakType, LeakSeverity } from '../types';
import { generateId } from '../utils/helpers';

export interface PortalMetrics {
  portalId: string;
  industry: string;
  companySize: 'small' | 'medium' | 'large' | 'enterprise';
  metrics: BenchmarkMetrics;
  collectedAt: Date;
  isAnonymized: boolean;
}

export interface BenchmarkMetrics {
  leakRate: number; // Leaks per 100 records
  recoveryRate: number; // Percentage of resolved leaks
  avgResolutionTime: number; // Hours to resolve
  revenueAtRiskPercentage: number; // % of total revenue
  leakDistribution: Record<LeakType, number>;
  severityDistribution: Record<LeakSeverity, number>;
  preventionEffectiveness: number; // 0-100 score
  automationCoverage: number; // % of automated resolutions
}

export interface BenchmarkComparison {
  metricName: string;
  yourValue: number;
  industryAverage: number;
  industryMedian: number;
  percentile25: number;
  percentile75: number;
  yourPercentileRank: number;
  trend: 'improving' | 'stable' | 'declining';
  trendPercentage: number;
  insights: string[];
  recommendations: string[];
}

export interface IndustryBenchmark {
  industry: string;
  sampleSize: number;
  period: string;
  metrics: {
    leakRate: StatisticalSummary;
    recoveryRate: StatisticalSummary;
    avgResolutionTime: StatisticalSummary;
    revenueAtRiskPercentage: StatisticalSummary;
    preventionEffectiveness: StatisticalSummary;
    automationCoverage: StatisticalSummary;
  };
  topLeakTypes: Array<{ type: LeakType; percentage: number }>;
  lastUpdated: Date;
}

export interface StatisticalSummary {
  average: number;
  median: number;
  percentile25: number;
  percentile75: number;
  min: number;
  max: number;
  stdDev: number;
}

export interface BenchmarkReport {
  id: string;
  generatedAt: Date;
  industry: string;
  comparisons: BenchmarkComparison[];
  overallScore: number;
  overallRank: string;
  strengths: string[];
  weaknesses: string[];
  topRecommendations: string[];
}

export interface OptInConfig {
  enabled: boolean;
  shareMetrics: boolean;
  shareTrends: boolean;
  industry: string;
  companySize: string;
  consentDate?: Date;
  consentUserId?: string;
}

export class CrossPortalIntelligenceService {
  private industryBenchmarks: Map<string, IndustryBenchmark> = new Map();
  private portalMetricsCache: Map<string, PortalMetrics> = new Map();
  private optInConfig: OptInConfig = {
    enabled: false,
    shareMetrics: false,
    shareTrends: false,
    industry: 'all',
    companySize: 'medium'
  };

  constructor() {
    this.initializeDefaultBenchmarks();
  }

  /**
   * Initialize default industry benchmarks
   * In production, these would be fetched from a secure external service
   */
  private initializeDefaultBenchmarks(): void {
    // SaaS industry benchmarks
    this.industryBenchmarks.set('saas', {
      industry: 'saas',
      sampleSize: 500,
      period: '2024-Q4',
      metrics: {
        leakRate: { average: 3.2, median: 2.8, percentile25: 1.5, percentile75: 4.5, min: 0.2, max: 12.0, stdDev: 2.1 },
        recoveryRate: { average: 62, median: 65, percentile25: 45, percentile75: 78, min: 15, max: 95, stdDev: 18 },
        avgResolutionTime: { average: 72, median: 48, percentile25: 24, percentile75: 120, min: 2, max: 720, stdDev: 85 },
        revenueAtRiskPercentage: { average: 4.5, median: 3.8, percentile25: 2.0, percentile75: 6.5, min: 0.5, max: 15, stdDev: 3.2 },
        preventionEffectiveness: { average: 55, median: 58, percentile25: 35, percentile75: 72, min: 10, max: 92, stdDev: 20 },
        automationCoverage: { average: 35, median: 30, percentile25: 15, percentile75: 55, min: 0, max: 85, stdDev: 22 }
      },
      topLeakTypes: [
        { type: 'missed_renewal', percentage: 28 },
        { type: 'stalled_cs_handoff', percentage: 22 },
        { type: 'untriggered_crosssell', percentage: 18 },
        { type: 'billing_gap', percentage: 15 },
        { type: 'underbilling', percentage: 12 }
      ],
      lastUpdated: new Date()
    });

    // Agency industry benchmarks
    this.industryBenchmarks.set('agency', {
      industry: 'agency',
      sampleSize: 350,
      period: '2024-Q4',
      metrics: {
        leakRate: { average: 4.1, median: 3.5, percentile25: 2.0, percentile75: 5.5, min: 0.5, max: 15.0, stdDev: 2.8 },
        recoveryRate: { average: 55, median: 52, percentile25: 38, percentile75: 70, min: 12, max: 90, stdDev: 20 },
        avgResolutionTime: { average: 96, median: 72, percentile25: 36, percentile75: 168, min: 4, max: 960, stdDev: 110 },
        revenueAtRiskPercentage: { average: 5.8, median: 5.0, percentile25: 2.5, percentile75: 8.0, min: 0.8, max: 18, stdDev: 4.0 },
        preventionEffectiveness: { average: 48, median: 45, percentile25: 28, percentile75: 65, min: 8, max: 88, stdDev: 22 },
        automationCoverage: { average: 28, median: 22, percentile25: 10, percentile75: 42, min: 0, max: 75, stdDev: 20 }
      },
      topLeakTypes: [
        { type: 'stale_pipeline', percentage: 25 },
        { type: 'stalled_cs_handoff', percentage: 20 },
        { type: 'billing_gap', percentage: 18 },
        { type: 'underbilling', percentage: 17 },
        { type: 'data_quality', percentage: 12 }
      ],
      lastUpdated: new Date()
    });

    // Healthcare industry benchmarks
    this.industryBenchmarks.set('healthcare', {
      industry: 'healthcare',
      sampleSize: 200,
      period: '2024-Q4',
      metrics: {
        leakRate: { average: 2.5, median: 2.2, percentile25: 1.2, percentile75: 3.5, min: 0.3, max: 8.0, stdDev: 1.6 },
        recoveryRate: { average: 70, median: 72, percentile25: 55, percentile75: 85, min: 25, max: 98, stdDev: 15 },
        avgResolutionTime: { average: 48, median: 36, percentile25: 18, percentile75: 72, min: 2, max: 480, stdDev: 60 },
        revenueAtRiskPercentage: { average: 3.2, median: 2.8, percentile25: 1.5, percentile75: 4.5, min: 0.3, max: 10, stdDev: 2.2 },
        preventionEffectiveness: { average: 65, median: 68, percentile25: 48, percentile75: 80, min: 20, max: 95, stdDev: 18 },
        automationCoverage: { average: 42, median: 40, percentile25: 25, percentile75: 58, min: 5, max: 80, stdDev: 18 }
      },
      topLeakTypes: [
        { type: 'billing_gap', percentage: 30 },
        { type: 'missed_renewal', percentage: 22 },
        { type: 'data_quality', percentage: 18 },
        { type: 'invalid_lifecycle_path', percentage: 15 },
        { type: 'stalled_cs_handoff', percentage: 10 }
      ],
      lastUpdated: new Date()
    });

    // Consulting industry benchmarks
    this.industryBenchmarks.set('consulting', {
      industry: 'consulting',
      sampleSize: 280,
      period: '2024-Q4',
      metrics: {
        leakRate: { average: 3.8, median: 3.2, percentile25: 1.8, percentile75: 5.2, min: 0.4, max: 12.0, stdDev: 2.4 },
        recoveryRate: { average: 58, median: 55, percentile25: 40, percentile75: 72, min: 18, max: 92, stdDev: 19 },
        avgResolutionTime: { average: 84, median: 60, percentile25: 30, percentile75: 144, min: 3, max: 840, stdDev: 95 },
        revenueAtRiskPercentage: { average: 5.2, median: 4.5, percentile25: 2.2, percentile75: 7.2, min: 0.6, max: 14, stdDev: 3.5 },
        preventionEffectiveness: { average: 52, median: 50, percentile25: 32, percentile75: 68, min: 12, max: 90, stdDev: 21 },
        automationCoverage: { average: 32, median: 28, percentile25: 12, percentile75: 48, min: 0, max: 78, stdDev: 21 }
      },
      topLeakTypes: [
        { type: 'stale_pipeline', percentage: 26 },
        { type: 'untriggered_crosssell', percentage: 22 },
        { type: 'stalled_cs_handoff', percentage: 18 },
        { type: 'underbilling', percentage: 16 },
        { type: 'missed_renewal', percentage: 12 }
      ],
      lastUpdated: new Date()
    });

    // Retail industry benchmarks
    this.industryBenchmarks.set('retail', {
      industry: 'retail',
      sampleSize: 420,
      period: '2024-Q4',
      metrics: {
        leakRate: { average: 4.5, median: 4.0, percentile25: 2.2, percentile75: 6.2, min: 0.5, max: 18.0, stdDev: 3.0 },
        recoveryRate: { average: 50, median: 48, percentile25: 32, percentile75: 65, min: 10, max: 88, stdDev: 21 },
        avgResolutionTime: { average: 60, median: 48, percentile25: 24, percentile75: 96, min: 2, max: 600, stdDev: 72 },
        revenueAtRiskPercentage: { average: 6.2, median: 5.5, percentile25: 3.0, percentile75: 8.5, min: 0.8, max: 20, stdDev: 4.2 },
        preventionEffectiveness: { average: 45, median: 42, percentile25: 25, percentile75: 60, min: 8, max: 85, stdDev: 22 },
        automationCoverage: { average: 38, median: 35, percentile25: 18, percentile75: 55, min: 0, max: 82, stdDev: 22 }
      },
      topLeakTypes: [
        { type: 'billing_gap', percentage: 28 },
        { type: 'stale_pipeline', percentage: 22 },
        { type: 'underbilling', percentage: 18 },
        { type: 'data_quality', percentage: 16 },
        { type: 'missed_renewal', percentage: 10 }
      ],
      lastUpdated: new Date()
    });

    // All industries combined
    this.industryBenchmarks.set('all', {
      industry: 'all',
      sampleSize: 1750,
      period: '2024-Q4',
      metrics: {
        leakRate: { average: 3.6, median: 3.2, percentile25: 1.8, percentile75: 5.0, min: 0.2, max: 18.0, stdDev: 2.5 },
        recoveryRate: { average: 58, median: 56, percentile25: 40, percentile75: 75, min: 10, max: 98, stdDev: 19 },
        avgResolutionTime: { average: 72, median: 54, percentile25: 24, percentile75: 120, min: 2, max: 960, stdDev: 88 },
        revenueAtRiskPercentage: { average: 5.0, median: 4.2, percentile25: 2.2, percentile75: 7.0, min: 0.3, max: 20, stdDev: 3.5 },
        preventionEffectiveness: { average: 53, median: 52, percentile25: 32, percentile75: 70, min: 8, max: 95, stdDev: 21 },
        automationCoverage: { average: 35, median: 32, percentile25: 15, percentile75: 52, min: 0, max: 85, stdDev: 21 }
      },
      topLeakTypes: [
        { type: 'missed_renewal', percentage: 22 },
        { type: 'stalled_cs_handoff', percentage: 20 },
        { type: 'billing_gap', percentage: 18 },
        { type: 'stale_pipeline', percentage: 16 },
        { type: 'underbilling', percentage: 14 }
      ],
      lastUpdated: new Date()
    });
  }

  /**
   * Configure opt-in settings for benchmark sharing
   */
  configureOptIn(config: Partial<OptInConfig>): void {
    this.optInConfig = { ...this.optInConfig, ...config };
    if (config.enabled) {
      this.optInConfig.consentDate = new Date();
    }
  }

  /**
   * Get opt-in configuration
   */
  getOptInConfig(): OptInConfig {
    return { ...this.optInConfig };
  }

  /**
   * Submit portal metrics for benchmarking (anonymized)
   */
  submitPortalMetrics(metrics: PortalMetrics): void {
    if (!this.optInConfig.enabled || !this.optInConfig.shareMetrics) {
      throw new Error('Benchmark sharing is not enabled. Please opt-in first.');
    }

    // Anonymize the metrics
    const anonymized: PortalMetrics = {
      ...metrics,
      portalId: this.anonymizePortalId(metrics.portalId),
      isAnonymized: true
    };

    this.portalMetricsCache.set(anonymized.portalId, anonymized);
    
    // In production, this would send to secure external service
    console.log('Metrics submitted for benchmarking:', anonymized);
  }

  /**
   * Get benchmark comparison for a portal
   */
  generateBenchmarkReport(portalMetrics: BenchmarkMetrics, industry: string = 'all'): BenchmarkReport {
    const benchmark = this.industryBenchmarks.get(industry) || this.industryBenchmarks.get('all')!;
    const comparisons: BenchmarkComparison[] = [];

    // Compare each metric
    comparisons.push(this.compareMetric('Leak Rate', portalMetrics.leakRate, benchmark.metrics.leakRate, true));
    comparisons.push(this.compareMetric('Recovery Rate', portalMetrics.recoveryRate, benchmark.metrics.recoveryRate, false));
    comparisons.push(this.compareMetric('Average Resolution Time (hours)', portalMetrics.avgResolutionTime, benchmark.metrics.avgResolutionTime, true));
    comparisons.push(this.compareMetric('Revenue at Risk (%)', portalMetrics.revenueAtRiskPercentage, benchmark.metrics.revenueAtRiskPercentage, true));
    comparisons.push(this.compareMetric('Prevention Effectiveness', portalMetrics.preventionEffectiveness, benchmark.metrics.preventionEffectiveness, false));
    comparisons.push(this.compareMetric('Automation Coverage', portalMetrics.automationCoverage, benchmark.metrics.automationCoverage, false));

    // Calculate overall score
    const overallScore = this.calculateOverallScore(comparisons);
    const overallRank = this.getOverallRank(overallScore);

    // Identify strengths and weaknesses
    const strengths = comparisons
      .filter(c => c.yourPercentileRank >= 75)
      .map(c => `${c.metricName}: Top ${100 - c.yourPercentileRank}% in industry`);

    const weaknesses = comparisons
      .filter(c => c.yourPercentileRank <= 25)
      .map(c => `${c.metricName}: Bottom ${c.yourPercentileRank}% in industry`);

    // Generate top recommendations
    const topRecommendations = this.generateTopRecommendations(comparisons, benchmark);

    return {
      id: generateId(),
      generatedAt: new Date(),
      industry,
      comparisons,
      overallScore,
      overallRank,
      strengths,
      weaknesses,
      topRecommendations
    };
  }

  /**
   * Compare a single metric to benchmark
   */
  private compareMetric(
    name: string,
    yourValue: number,
    benchmark: StatisticalSummary,
    lowerIsBetter: boolean
  ): BenchmarkComparison {
    const percentileRank = this.calculatePercentileRank(yourValue, benchmark, lowerIsBetter);
    const trend = this.determineTrend(yourValue, benchmark.average, lowerIsBetter);

    const insights: string[] = [];
    const recommendations: string[] = [];

    // Generate insights
    if (percentileRank >= 75) {
      insights.push(`You're in the top ${100 - percentileRank}% for ${name.toLowerCase()}`);
    } else if (percentileRank <= 25) {
      insights.push(`Your ${name.toLowerCase()} is below industry standards`);
      recommendations.push(`Focus on improving ${name.toLowerCase()} to reach industry median`);
    }

    if (yourValue < benchmark.percentile25 && !lowerIsBetter) {
      recommendations.push(`Target reaching ${benchmark.median} (industry median)`);
    } else if (yourValue > benchmark.percentile75 && lowerIsBetter) {
      recommendations.push(`Target reducing to ${benchmark.median} (industry median)`);
    }

    const trendPercentage = ((yourValue - benchmark.average) / benchmark.average) * 100;

    return {
      metricName: name,
      yourValue,
      industryAverage: benchmark.average,
      industryMedian: benchmark.median,
      percentile25: benchmark.percentile25,
      percentile75: benchmark.percentile75,
      yourPercentileRank: percentileRank,
      trend,
      trendPercentage,
      insights,
      recommendations
    };
  }

  /**
   * Calculate percentile rank
   */
  private calculatePercentileRank(value: number, benchmark: StatisticalSummary, lowerIsBetter: boolean): number {
    // Simple percentile estimation using quartiles
    if (lowerIsBetter) {
      if (value <= benchmark.percentile25) return 75 + (benchmark.percentile25 - value) / benchmark.percentile25 * 25;
      if (value <= benchmark.median) return 50 + (benchmark.median - value) / (benchmark.median - benchmark.percentile25) * 25;
      if (value <= benchmark.percentile75) return 25 + (benchmark.percentile75 - value) / (benchmark.percentile75 - benchmark.median) * 25;
      return Math.max(0, 25 - (value - benchmark.percentile75) / benchmark.percentile75 * 25);
    } else {
      if (value >= benchmark.percentile75) return 75 + (value - benchmark.percentile75) / benchmark.percentile75 * 25;
      if (value >= benchmark.median) return 50 + (value - benchmark.median) / (benchmark.percentile75 - benchmark.median) * 25;
      if (value >= benchmark.percentile25) return 25 + (value - benchmark.percentile25) / (benchmark.median - benchmark.percentile25) * 25;
      return Math.max(0, (value / benchmark.percentile25) * 25);
    }
  }

  /**
   * Determine trend direction
   */
  private determineTrend(yourValue: number, average: number, lowerIsBetter: boolean): 'improving' | 'stable' | 'declining' {
    const diff = ((yourValue - average) / average) * 100;
    
    if (Math.abs(diff) < 10) return 'stable';
    
    if (lowerIsBetter) {
      return diff < 0 ? 'improving' : 'declining';
    } else {
      return diff > 0 ? 'improving' : 'declining';
    }
  }

  /**
   * Calculate overall benchmark score
   */
  private calculateOverallScore(comparisons: BenchmarkComparison[]): number {
    const weights: Record<string, number> = {
      'Recovery Rate': 0.25,
      'Leak Rate': 0.20,
      'Revenue at Risk (%)': 0.20,
      'Prevention Effectiveness': 0.15,
      'Average Resolution Time (hours)': 0.10,
      'Automation Coverage': 0.10
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const comparison of comparisons) {
      const weight = weights[comparison.metricName] || 0.1;
      totalScore += comparison.yourPercentileRank * weight;
      totalWeight += weight;
    }

    return Math.round(totalScore / totalWeight);
  }

  /**
   * Get overall rank label
   */
  private getOverallRank(score: number): string {
    if (score >= 90) return 'Industry Leader';
    if (score >= 75) return 'Above Average';
    if (score >= 50) return 'Average';
    if (score >= 25) return 'Below Average';
    return 'Needs Improvement';
  }

  /**
   * Generate top recommendations
   */
  private generateTopRecommendations(comparisons: BenchmarkComparison[], benchmark: IndustryBenchmark): string[] {
    const recommendations: string[] = [];

    // Sort by improvement potential
    const sortedComparisons = [...comparisons].sort((a, b) => a.yourPercentileRank - b.yourPercentileRank);

    // Add recommendations for lowest performing metrics
    for (const comparison of sortedComparisons.slice(0, 3)) {
      if (comparison.yourPercentileRank < 50) {
        recommendations.push(...comparison.recommendations);
      }
    }

    // Add industry-specific recommendations based on top leak types
    const topLeakType = benchmark.topLeakTypes[0];
    if (topLeakType) {
      const leakTypeActions: Record<LeakType, string> = {
        missed_renewal: 'Implement automated renewal reminders 60 days before contract end',
        stalled_cs_handoff: 'Set up automatic CS owner assignment on deal close',
        untriggered_crosssell: 'Create expansion opportunity detection rules',
        billing_gap: 'Enable invoice-to-contract reconciliation',
        underbilling: 'Implement deal pricing validation against benchmarks',
        stale_pipeline: 'Set up pipeline health monitoring with auto-alerts',
        invalid_lifecycle_path: 'Enforce lifecycle stage progression rules',
        missed_handoff: 'Create handoff checklists and automation',
        data_quality: 'Implement required field validation'
      };

      if (leakTypeActions[topLeakType.type]) {
        recommendations.push(`Industry insight: ${leakTypeActions[topLeakType.type]}`);
      }
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Get industry benchmark
   */
  getIndustryBenchmark(industry: string): IndustryBenchmark | undefined {
    return this.industryBenchmarks.get(industry);
  }

  /**
   * Get all available industries
   */
  getAvailableIndustries(): string[] {
    return Array.from(this.industryBenchmarks.keys());
  }

  /**
   * Anonymize portal ID
   */
  private anonymizePortalId(portalId: string): string {
    // Simple hash-like anonymization
    let hash = 0;
    for (let i = 0; i < portalId.length; i++) {
      const char = portalId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `anon_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get benchmark statistics
   */
  getStats(): {
    availableIndustries: string[];
    totalSampleSize: number;
    lastUpdated: Date;
    optInStatus: boolean;
  } {
    let totalSampleSize = 0;
    let lastUpdated = new Date(0);

    for (const benchmark of this.industryBenchmarks.values()) {
      if (benchmark.industry !== 'all') {
        totalSampleSize += benchmark.sampleSize;
      }
      if (benchmark.lastUpdated > lastUpdated) {
        lastUpdated = benchmark.lastUpdated;
      }
    }

    return {
      availableIndustries: this.getAvailableIndustries(),
      totalSampleSize,
      lastUpdated,
      optInStatus: this.optInConfig.enabled
    };
  }
}

export default CrossPortalIntelligenceService;
