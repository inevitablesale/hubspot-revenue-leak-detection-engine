/**
 * Portal Baselines Module
 * Provides multi-portal intelligence and benchmarking capabilities
 * for comparing performance across HubSpot portals
 */

import { generateId } from '../utils/helpers';
import { RevenueLeak, LeakType } from '../types';

// ============================================================
// Portal Baselines Types
// ============================================================

export type IndustryVertical = 
  | 'technology' 
  | 'healthcare' 
  | 'finance' 
  | 'manufacturing' 
  | 'retail' 
  | 'services' 
  | 'education'
  | 'other';

export type CompanySize = 'startup' | 'smb' | 'mid_market' | 'enterprise';

export interface PortalProfile {
  id: string;
  portalId: string;
  name: string;
  industry: IndustryVertical;
  companySize: CompanySize;
  mrr: number;
  employeeCount: number;
  customerCount: number;
  dealCount: number;
  region: string;
  timezone: string;
  features: PortalFeatures;
  metrics: PortalMetrics;
  baselines: Map<string, PortalBaseline>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortalFeatures {
  crmEnabled: boolean;
  marketingEnabled: boolean;
  salesEnabled: boolean;
  serviceEnabled: boolean;
  integrations: string[];
  customObjects: number;
  workflows: number;
}

export interface PortalMetrics {
  leaksDetected: number;
  leaksRecovered: number;
  revenueProtected: number;
  revenueRecovered: number;
  detectionAccuracy: number;
  recoveryRate: number;
  avgTimeToDetection: number;
  avgTimeToRecovery: number;
  dataQualityScore: number;
  processHealthScore: number;
  lastCalculatedAt: Date;
}

export interface PortalBaseline {
  id: string;
  metric: string;
  value: number;
  unit: string;
  percentile: number;
  industryAvg: number;
  sizeAvg: number;
  globalAvg: number;
  trend: 'improving' | 'stable' | 'declining';
  calculatedAt: Date;
}

export interface Benchmark {
  id: string;
  name: string;
  description: string;
  metric: string;
  unit: string;
  global: BenchmarkValue;
  byIndustry: Map<IndustryVertical, BenchmarkValue>;
  bySize: Map<CompanySize, BenchmarkValue>;
  calculatedAt: Date;
  sampleSize: number;
}

export interface BenchmarkValue {
  min: number;
  max: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
  p90: number;
  stdDev: number;
}

export interface PortalComparison {
  id: string;
  sourcePortalId: string;
  comparisonType: 'industry' | 'size' | 'global' | 'custom';
  metrics: ComparisonMetric[];
  overallScore: number;
  ranking: PortalRanking;
  insights: ComparisonInsight[];
  generatedAt: Date;
}

export interface ComparisonMetric {
  name: string;
  portalValue: number;
  benchmarkValue: number;
  percentile: number;
  gap: number;
  gapPercent: number;
  status: 'above_benchmark' | 'at_benchmark' | 'below_benchmark';
}

export interface PortalRanking {
  overall: number;
  byIndustry: number;
  bySize: number;
  totalPortals: number;
  percentile: number;
}

export interface ComparisonInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'threat';
  metric: string;
  title: string;
  description: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
}

export interface IntelligenceReport {
  id: string;
  portalId: string;
  period: { start: Date; end: Date };
  summary: IntelligenceSummary;
  performanceAnalysis: PerformanceAnalysis;
  benchmarkComparison: PortalComparison;
  recommendations: IntelligenceRecommendation[];
  forecasts: Forecast[];
  generatedAt: Date;
}

export interface IntelligenceSummary {
  overallHealth: number;
  trend: 'improving' | 'stable' | 'declining';
  topStrengths: string[];
  topWeaknesses: string[];
  keyMetrics: { name: string; value: number; change: number }[];
}

export interface PerformanceAnalysis {
  leakDetection: {
    accuracy: number;
    volume: number;
    trend: string;
  };
  recovery: {
    successRate: number;
    avgAmount: number;
    trend: string;
  };
  efficiency: {
    timeToDetection: number;
    timeToRecovery: number;
    automation: number;
  };
}

export interface IntelligenceRecommendation {
  id: string;
  priority: number;
  category: 'detection' | 'recovery' | 'process' | 'data' | 'integration';
  title: string;
  description: string;
  expectedImpact: number;
  effort: 'low' | 'medium' | 'high';
  benchmarkGap: number;
}

export interface Forecast {
  metric: string;
  currentValue: number;
  projectedValues: { date: Date; value: number; confidence: number }[];
  trend: 'up' | 'down' | 'stable';
  seasonality?: string;
}

export interface PortalBaselinesConfig {
  enabled: boolean;
  anonymizeData: boolean;
  shareForBenchmarking: boolean;
  benchmarkRefreshInterval: number;
  minPortalsForBenchmark: number;
  forecastHorizonDays: number;
}

// ============================================================
// Portal Baselines Implementation
// ============================================================

export class PortalBaselinesEngine {
  private portals: Map<string, PortalProfile> = new Map();
  private benchmarks: Map<string, Benchmark> = new Map();
  private comparisons: Map<string, PortalComparison> = new Map();
  private reports: Map<string, IntelligenceReport> = new Map();
  private config: PortalBaselinesConfig;

  constructor(config?: Partial<PortalBaselinesConfig>) {
    this.config = {
      enabled: true,
      anonymizeData: true,
      shareForBenchmarking: true,
      benchmarkRefreshInterval: 86400000, // 24 hours
      minPortalsForBenchmark: 10,
      forecastHorizonDays: 90,
      ...config,
    };

    this.initializeDefaultBenchmarks();
  }

  /**
   * Initialize default benchmarks
   */
  private initializeDefaultBenchmarks(): void {
    // Leak detection rate benchmark
    this.addBenchmark({
      name: 'Leak Detection Rate',
      description: 'Average number of leaks detected per month',
      metric: 'leaks_detected_monthly',
      unit: 'leaks/month',
      global: this.generateBenchmarkValue(50, 200, 100),
      byIndustry: new Map([
        ['technology', this.generateBenchmarkValue(60, 250, 120)],
        ['healthcare', this.generateBenchmarkValue(40, 180, 90)],
        ['finance', this.generateBenchmarkValue(70, 300, 150)],
        ['manufacturing', this.generateBenchmarkValue(30, 150, 70)],
        ['retail', this.generateBenchmarkValue(80, 350, 180)],
        ['services', this.generateBenchmarkValue(50, 200, 100)],
        ['education', this.generateBenchmarkValue(20, 100, 50)],
        ['other', this.generateBenchmarkValue(40, 180, 90)],
      ]),
      bySize: new Map([
        ['startup', this.generateBenchmarkValue(10, 50, 25)],
        ['smb', this.generateBenchmarkValue(30, 120, 60)],
        ['mid_market', this.generateBenchmarkValue(80, 250, 140)],
        ['enterprise', this.generateBenchmarkValue(150, 500, 280)],
      ]),
      sampleSize: 500,
    });

    // Recovery rate benchmark
    this.addBenchmark({
      name: 'Recovery Success Rate',
      description: 'Percentage of detected leaks successfully recovered',
      metric: 'recovery_success_rate',
      unit: 'percent',
      global: this.generateBenchmarkValue(60, 95, 78),
      byIndustry: new Map([
        ['technology', this.generateBenchmarkValue(65, 95, 82)],
        ['healthcare', this.generateBenchmarkValue(55, 90, 72)],
        ['finance', this.generateBenchmarkValue(70, 98, 85)],
        ['manufacturing', this.generateBenchmarkValue(50, 85, 68)],
        ['retail', this.generateBenchmarkValue(60, 90, 75)],
        ['services', this.generateBenchmarkValue(65, 92, 78)],
        ['education', this.generateBenchmarkValue(55, 88, 70)],
        ['other', this.generateBenchmarkValue(55, 88, 72)],
      ]),
      bySize: new Map([
        ['startup', this.generateBenchmarkValue(50, 85, 68)],
        ['smb', this.generateBenchmarkValue(60, 90, 75)],
        ['mid_market', this.generateBenchmarkValue(70, 95, 82)],
        ['enterprise', this.generateBenchmarkValue(75, 98, 88)],
      ]),
      sampleSize: 500,
    });

    // Revenue protected benchmark
    this.addBenchmark({
      name: 'Revenue Protected',
      description: 'Total revenue protected through leak detection',
      metric: 'revenue_protected_monthly',
      unit: 'USD/month',
      global: this.generateBenchmarkValue(10000, 500000, 120000),
      byIndustry: new Map([
        ['technology', this.generateBenchmarkValue(20000, 800000, 200000)],
        ['healthcare', this.generateBenchmarkValue(15000, 400000, 100000)],
        ['finance', this.generateBenchmarkValue(50000, 2000000, 500000)],
        ['manufacturing', this.generateBenchmarkValue(10000, 300000, 80000)],
        ['retail', this.generateBenchmarkValue(25000, 600000, 150000)],
        ['services', this.generateBenchmarkValue(15000, 350000, 90000)],
        ['education', this.generateBenchmarkValue(5000, 100000, 30000)],
        ['other', this.generateBenchmarkValue(10000, 250000, 70000)],
      ]),
      bySize: new Map([
        ['startup', this.generateBenchmarkValue(5000, 50000, 20000)],
        ['smb', this.generateBenchmarkValue(20000, 150000, 60000)],
        ['mid_market', this.generateBenchmarkValue(80000, 400000, 180000)],
        ['enterprise', this.generateBenchmarkValue(200000, 2000000, 600000)],
      ]),
      sampleSize: 500,
    });

    // Time to detection benchmark
    this.addBenchmark({
      name: 'Time to Detection',
      description: 'Average time to detect a revenue leak',
      metric: 'avg_time_to_detection',
      unit: 'hours',
      global: this.generateBenchmarkValue(1, 48, 12),
      byIndustry: new Map([
        ['technology', this.generateBenchmarkValue(0.5, 24, 6)],
        ['healthcare', this.generateBenchmarkValue(2, 72, 18)],
        ['finance', this.generateBenchmarkValue(1, 36, 8)],
        ['manufacturing', this.generateBenchmarkValue(4, 96, 24)],
        ['retail', this.generateBenchmarkValue(1, 48, 12)],
        ['services', this.generateBenchmarkValue(2, 48, 14)],
        ['education', this.generateBenchmarkValue(4, 72, 20)],
        ['other', this.generateBenchmarkValue(2, 48, 14)],
      ]),
      bySize: new Map([
        ['startup', this.generateBenchmarkValue(0.5, 24, 8)],
        ['smb', this.generateBenchmarkValue(1, 36, 12)],
        ['mid_market', this.generateBenchmarkValue(2, 48, 16)],
        ['enterprise', this.generateBenchmarkValue(4, 72, 24)],
      ]),
      sampleSize: 500,
    });

    // Data quality score benchmark
    this.addBenchmark({
      name: 'Data Quality Score',
      description: 'Overall data quality score',
      metric: 'data_quality_score',
      unit: 'score (0-100)',
      global: this.generateBenchmarkValue(50, 98, 75),
      byIndustry: new Map([
        ['technology', this.generateBenchmarkValue(60, 98, 82)],
        ['healthcare', this.generateBenchmarkValue(55, 95, 78)],
        ['finance', this.generateBenchmarkValue(65, 99, 85)],
        ['manufacturing', this.generateBenchmarkValue(45, 90, 70)],
        ['retail', this.generateBenchmarkValue(50, 92, 72)],
        ['services', this.generateBenchmarkValue(55, 95, 75)],
        ['education', this.generateBenchmarkValue(50, 90, 70)],
        ['other', this.generateBenchmarkValue(50, 90, 72)],
      ]),
      bySize: new Map([
        ['startup', this.generateBenchmarkValue(40, 85, 65)],
        ['smb', this.generateBenchmarkValue(50, 90, 72)],
        ['mid_market', this.generateBenchmarkValue(60, 95, 78)],
        ['enterprise', this.generateBenchmarkValue(70, 99, 85)],
      ]),
      sampleSize: 500,
    });
  }

  /**
   * Generate benchmark value with distribution
   */
  private generateBenchmarkValue(min: number, max: number, mean: number): BenchmarkValue {
    const range = max - min;
    const stdDev = range / 4;

    return {
      min,
      max,
      mean,
      median: mean * (0.95 + Math.random() * 0.1),
      p25: min + range * 0.25,
      p75: min + range * 0.75,
      p90: min + range * 0.90,
      stdDev,
    };
  }

  /**
   * Register a portal profile
   */
  registerPortal(options: {
    portalId: string;
    name: string;
    industry: IndustryVertical;
    companySize: CompanySize;
    mrr: number;
    employeeCount: number;
    customerCount: number;
    dealCount: number;
    region?: string;
    timezone?: string;
    features?: Partial<PortalFeatures>;
  }): PortalProfile {
    const profile: PortalProfile = {
      id: generateId(),
      portalId: options.portalId,
      name: options.name,
      industry: options.industry,
      companySize: options.companySize,
      mrr: options.mrr,
      employeeCount: options.employeeCount,
      customerCount: options.customerCount,
      dealCount: options.dealCount,
      region: options.region || 'US',
      timezone: options.timezone || 'America/New_York',
      features: {
        crmEnabled: true,
        marketingEnabled: false,
        salesEnabled: true,
        serviceEnabled: false,
        integrations: [],
        customObjects: 0,
        workflows: 0,
        ...options.features,
      },
      metrics: {
        leaksDetected: 0,
        leaksRecovered: 0,
        revenueProtected: 0,
        revenueRecovered: 0,
        detectionAccuracy: 0.85,
        recoveryRate: 0.75,
        avgTimeToDetection: 12,
        avgTimeToRecovery: 48,
        dataQualityScore: 75,
        processHealthScore: 80,
        lastCalculatedAt: new Date(),
      },
      baselines: new Map(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.portals.set(profile.id, profile);
    this.calculateBaselines(profile.id);

    return profile;
  }

  /**
   * Update portal metrics
   */
  updatePortalMetrics(portalId: string, metrics: Partial<PortalMetrics>): boolean {
    const profile = this.getPortalByPortalId(portalId);
    if (!profile) return false;

    profile.metrics = {
      ...profile.metrics,
      ...metrics,
      lastCalculatedAt: new Date(),
    };
    profile.updatedAt = new Date();

    // Recalculate baselines
    this.calculateBaselines(profile.id);

    return true;
  }

  /**
   * Calculate baselines for a portal
   */
  calculateBaselines(profileId: string): void {
    const profile = this.portals.get(profileId);
    if (!profile) return;

    for (const [benchmarkId, benchmark] of this.benchmarks) {
      const portalValue = this.getMetricValue(profile, benchmark.metric);
      const industryBench = benchmark.byIndustry.get(profile.industry);
      const sizeBench = benchmark.bySize.get(profile.companySize);

      const baseline: PortalBaseline = {
        id: generateId(),
        metric: benchmark.metric,
        value: portalValue,
        unit: benchmark.unit,
        percentile: this.calculatePercentile(portalValue, benchmark.global),
        industryAvg: industryBench?.mean || benchmark.global.mean,
        sizeAvg: sizeBench?.mean || benchmark.global.mean,
        globalAvg: benchmark.global.mean,
        trend: this.determineTrend(profile, benchmark.metric),
        calculatedAt: new Date(),
      };

      profile.baselines.set(benchmark.metric, baseline);
    }
  }

  /**
   * Get metric value from portal profile
   */
  private getMetricValue(profile: PortalProfile, metric: string): number {
    switch (metric) {
      case 'leaks_detected_monthly':
        return profile.metrics.leaksDetected;
      case 'recovery_success_rate':
        return profile.metrics.recoveryRate * 100;
      case 'revenue_protected_monthly':
        return profile.metrics.revenueProtected;
      case 'avg_time_to_detection':
        return profile.metrics.avgTimeToDetection;
      case 'data_quality_score':
        return profile.metrics.dataQualityScore;
      default:
        return 0;
    }
  }

  /**
   * Calculate percentile of a value within benchmark
   */
  private calculatePercentile(value: number, benchmark: BenchmarkValue): number {
    if (value <= benchmark.min) return 0;
    if (value >= benchmark.max) return 100;

    // Approximate percentile using linear interpolation
    const normalizedValue = (value - benchmark.min) / (benchmark.max - benchmark.min);
    return Math.round(normalizedValue * 100);
  }

  /**
   * Determine trend for a metric
   */
  private determineTrend(profile: PortalProfile, metric: string): 'improving' | 'stable' | 'declining' {
    // Simplified trend determination based on random simulation
    const random = Math.random();
    if (random > 0.6) return 'improving';
    if (random > 0.3) return 'stable';
    return 'declining';
  }

  /**
   * Add a benchmark
   */
  addBenchmark(options: Omit<Benchmark, 'id' | 'calculatedAt'>): Benchmark {
    const benchmark: Benchmark = {
      ...options,
      id: generateId(),
      calculatedAt: new Date(),
    };

    this.benchmarks.set(benchmark.id, benchmark);
    return benchmark;
  }

  /**
   * Compare portal against benchmarks
   */
  comparePortal(
    portalId: string,
    comparisonType: PortalComparison['comparisonType'] = 'industry'
  ): PortalComparison {
    const profile = this.getPortalByPortalId(portalId);
    if (!profile) {
      throw new Error(`Portal ${portalId} not found`);
    }

    const metrics: ComparisonMetric[] = [];
    let totalScore = 0;

    for (const [benchmarkId, benchmark] of this.benchmarks) {
      const portalValue = this.getMetricValue(profile, benchmark.metric);
      let benchmarkValue: number;

      switch (comparisonType) {
        case 'industry':
          benchmarkValue = benchmark.byIndustry.get(profile.industry)?.mean || benchmark.global.mean;
          break;
        case 'size':
          benchmarkValue = benchmark.bySize.get(profile.companySize)?.mean || benchmark.global.mean;
          break;
        default:
          benchmarkValue = benchmark.global.mean;
      }

      const gap = portalValue - benchmarkValue;
      const gapPercent = (gap / benchmarkValue) * 100;
      const percentile = this.calculatePercentile(portalValue, benchmark.global);

      let status: ComparisonMetric['status'];
      if (gapPercent > 5) status = 'above_benchmark';
      else if (gapPercent < -5) status = 'below_benchmark';
      else status = 'at_benchmark';

      metrics.push({
        name: benchmark.name,
        portalValue,
        benchmarkValue,
        percentile,
        gap,
        gapPercent,
        status,
      });

      totalScore += percentile;
    }

    const overallScore = totalScore / metrics.length;
    const insights = this.generateComparisonInsights(metrics, profile);

    const comparison: PortalComparison = {
      id: generateId(),
      sourcePortalId: portalId,
      comparisonType,
      metrics,
      overallScore,
      ranking: {
        overall: this.calculateRanking(overallScore),
        byIndustry: this.calculateRanking(overallScore),
        bySize: this.calculateRanking(overallScore),
        totalPortals: this.portals.size + 500, // Include simulated portals
        percentile: overallScore,
      },
      insights,
      generatedAt: new Date(),
    };

    this.comparisons.set(comparison.id, comparison);
    return comparison;
  }

  /**
   * Calculate ranking from score
   */
  private calculateRanking(score: number): number {
    const totalPortals = this.portals.size + 500;
    return Math.max(1, Math.round((100 - score) / 100 * totalPortals));
  }

  /**
   * Generate comparison insights
   */
  private generateComparisonInsights(
    metrics: ComparisonMetric[],
    profile: PortalProfile
  ): ComparisonInsight[] {
    const insights: ComparisonInsight[] = [];

    // Identify strengths
    const strengths = metrics.filter(m => m.status === 'above_benchmark');
    for (const strength of strengths.slice(0, 2)) {
      insights.push({
        type: 'strength',
        metric: strength.name,
        title: `Strong ${strength.name}`,
        description: `Your ${strength.name} is ${strength.gapPercent.toFixed(1)}% above the benchmark`,
        recommendation: 'Continue current practices and share best practices across the organization',
        impact: strength.gapPercent > 20 ? 'high' : 'medium',
      });
    }

    // Identify weaknesses
    const weaknesses = metrics.filter(m => m.status === 'below_benchmark');
    for (const weakness of weaknesses.slice(0, 2)) {
      insights.push({
        type: 'weakness',
        metric: weakness.name,
        title: `Improvement Needed: ${weakness.name}`,
        description: `Your ${weakness.name} is ${Math.abs(weakness.gapPercent).toFixed(1)}% below the benchmark`,
        recommendation: `Focus on improving ${weakness.name} through process optimization and automation`,
        impact: Math.abs(weakness.gapPercent) > 20 ? 'high' : 'medium',
      });
    }

    // Identify opportunities
    if (profile.features.workflows < 10) {
      insights.push({
        type: 'opportunity',
        metric: 'automation',
        title: 'Automation Opportunity',
        description: 'Low workflow count suggests room for automation',
        recommendation: 'Implement automated workflows to improve detection and recovery efficiency',
        impact: 'high',
      });
    }

    // Identify threats
    const decliningMetrics = Array.from(profile.baselines.values())
      .filter(b => b.trend === 'declining');
    if (decliningMetrics.length > 0) {
      insights.push({
        type: 'threat',
        metric: decliningMetrics[0].metric,
        title: 'Declining Performance',
        description: `${decliningMetrics.length} metrics showing declining trend`,
        recommendation: 'Investigate root causes and implement corrective measures',
        impact: 'high',
      });
    }

    return insights;
  }

  /**
   * Generate intelligence report
   */
  generateReport(portalId: string, periodDays: number = 30): IntelligenceReport {
    const profile = this.getPortalByPortalId(portalId);
    if (!profile) {
      throw new Error(`Portal ${portalId} not found`);
    }

    const comparison = this.comparePortal(portalId);
    const periodStart = new Date(Date.now() - periodDays * 86400000);
    const periodEnd = new Date();

    // Generate summary
    const summary: IntelligenceSummary = {
      overallHealth: comparison.overallScore,
      trend: profile.metrics.recoveryRate > 0.75 ? 'improving' : 'stable',
      topStrengths: comparison.insights
        .filter(i => i.type === 'strength')
        .map(i => i.title),
      topWeaknesses: comparison.insights
        .filter(i => i.type === 'weakness')
        .map(i => i.title),
      keyMetrics: [
        { name: 'Leaks Detected', value: profile.metrics.leaksDetected, change: Math.random() * 20 - 10 },
        { name: 'Recovery Rate', value: profile.metrics.recoveryRate * 100, change: Math.random() * 10 - 5 },
        { name: 'Revenue Protected', value: profile.metrics.revenueProtected, change: Math.random() * 30 - 15 },
      ],
    };

    // Generate performance analysis
    const performanceAnalysis: PerformanceAnalysis = {
      leakDetection: {
        accuracy: profile.metrics.detectionAccuracy,
        volume: profile.metrics.leaksDetected,
        trend: 'stable',
      },
      recovery: {
        successRate: profile.metrics.recoveryRate,
        avgAmount: profile.metrics.revenueRecovered / Math.max(1, profile.metrics.leaksRecovered),
        trend: 'improving',
      },
      efficiency: {
        timeToDetection: profile.metrics.avgTimeToDetection,
        timeToRecovery: profile.metrics.avgTimeToRecovery,
        automation: profile.features.workflows / 10,
      },
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(profile, comparison);

    // Generate forecasts
    const forecasts = this.generateForecasts(profile);

    const report: IntelligenceReport = {
      id: generateId(),
      portalId,
      period: { start: periodStart, end: periodEnd },
      summary,
      performanceAnalysis,
      benchmarkComparison: comparison,
      recommendations,
      forecasts,
      generatedAt: new Date(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    profile: PortalProfile,
    comparison: PortalComparison
  ): IntelligenceRecommendation[] {
    const recommendations: IntelligenceRecommendation[] = [];
    let priority = 1;

    // Recommendations based on comparison
    const weaknesses = comparison.metrics.filter(m => m.status === 'below_benchmark');
    for (const weakness of weaknesses) {
      recommendations.push({
        id: generateId(),
        priority: priority++,
        category: this.mapMetricToCategory(weakness.name),
        title: `Improve ${weakness.name}`,
        description: `Currently ${Math.abs(weakness.gapPercent).toFixed(1)}% below benchmark`,
        expectedImpact: Math.abs(weakness.gap),
        effort: Math.abs(weakness.gapPercent) > 30 ? 'high' : 'medium',
        benchmarkGap: weakness.gapPercent,
      });
    }

    // Additional recommendations
    if (profile.features.integrations.length < 3) {
      recommendations.push({
        id: generateId(),
        priority: priority++,
        category: 'integration',
        title: 'Expand Integrations',
        description: 'Limited integrations may be causing data gaps',
        expectedImpact: profile.metrics.revenueProtected * 0.1,
        effort: 'medium',
        benchmarkGap: -20,
      });
    }

    return recommendations;
  }

  /**
   * Map metric to recommendation category
   */
  private mapMetricToCategory(metricName: string): IntelligenceRecommendation['category'] {
    if (metricName.includes('Detection')) return 'detection';
    if (metricName.includes('Recovery')) return 'recovery';
    if (metricName.includes('Data')) return 'data';
    if (metricName.includes('Time')) return 'process';
    return 'process';
  }

  /**
   * Generate forecasts
   */
  private generateForecasts(profile: PortalProfile): Forecast[] {
    const forecasts: Forecast[] = [];

    // Leak detection forecast
    forecasts.push({
      metric: 'leaks_detected_monthly',
      currentValue: profile.metrics.leaksDetected,
      projectedValues: this.generateProjectedValues(profile.metrics.leaksDetected, 'up'),
      trend: 'up',
    });

    // Revenue protected forecast
    forecasts.push({
      metric: 'revenue_protected_monthly',
      currentValue: profile.metrics.revenueProtected,
      projectedValues: this.generateProjectedValues(profile.metrics.revenueProtected, 'up'),
      trend: 'up',
    });

    // Recovery rate forecast
    forecasts.push({
      metric: 'recovery_success_rate',
      currentValue: profile.metrics.recoveryRate * 100,
      projectedValues: this.generateProjectedValues(profile.metrics.recoveryRate * 100, 'stable'),
      trend: 'stable',
    });

    return forecasts;
  }

  /**
   * Generate projected values
   */
  private generateProjectedValues(
    currentValue: number,
    trend: 'up' | 'down' | 'stable'
  ): { date: Date; value: number; confidence: number }[] {
    const projections: { date: Date; value: number; confidence: number }[] = [];
    const horizonDays = this.config.forecastHorizonDays;

    for (let i = 30; i <= horizonDays; i += 30) {
      const multiplier = trend === 'up' ? 1 + (i / 365) * 0.2 :
                        trend === 'down' ? 1 - (i / 365) * 0.1 : 1;
      const variance = currentValue * 0.1 * (i / 30);
      
      projections.push({
        date: new Date(Date.now() + i * 86400000),
        value: currentValue * multiplier + (Math.random() - 0.5) * variance,
        confidence: Math.max(0.5, 0.95 - i / horizonDays * 0.3),
      });
    }

    return projections;
  }

  /**
   * Get portal by internal ID
   */
  getPortal(id: string): PortalProfile | undefined {
    return this.portals.get(id);
  }

  /**
   * Get portal by HubSpot portal ID
   */
  getPortalByPortalId(portalId: string): PortalProfile | undefined {
    for (const profile of this.portals.values()) {
      if (profile.portalId === portalId) return profile;
    }
    return undefined;
  }

  /**
   * Get all portals
   */
  getPortals(): PortalProfile[] {
    return Array.from(this.portals.values());
  }

  /**
   * Get benchmark by ID
   */
  getBenchmark(id: string): Benchmark | undefined {
    return this.benchmarks.get(id);
  }

  /**
   * Get all benchmarks
   */
  getBenchmarks(): Benchmark[] {
    return Array.from(this.benchmarks.values());
  }

  /**
   * Get comparison by ID
   */
  getComparison(id: string): PortalComparison | undefined {
    return this.comparisons.get(id);
  }

  /**
   * Get report by ID
   */
  getReport(id: string): IntelligenceReport | undefined {
    return this.reports.get(id);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalPortals: number;
    totalBenchmarks: number;
    totalComparisons: number;
    totalReports: number;
    avgOverallScore: number;
    topIndustry: IndustryVertical | null;
    topCompanySize: CompanySize | null;
  } {
    const portals = this.getPortals();
    const comparisons = Array.from(this.comparisons.values());

    // Count by industry
    const industryCounts = new Map<IndustryVertical, number>();
    for (const portal of portals) {
      industryCounts.set(portal.industry, (industryCounts.get(portal.industry) || 0) + 1);
    }

    // Count by company size
    const sizeCounts = new Map<CompanySize, number>();
    for (const portal of portals) {
      sizeCounts.set(portal.companySize, (sizeCounts.get(portal.companySize) || 0) + 1);
    }

    let topIndustry: IndustryVertical | null = null;
    let maxIndustryCount = 0;
    for (const [industry, count] of industryCounts) {
      if (count > maxIndustryCount) {
        maxIndustryCount = count;
        topIndustry = industry;
      }
    }

    let topCompanySize: CompanySize | null = null;
    let maxSizeCount = 0;
    for (const [size, count] of sizeCounts) {
      if (count > maxSizeCount) {
        maxSizeCount = count;
        topCompanySize = size;
      }
    }

    return {
      totalPortals: portals.length,
      totalBenchmarks: this.benchmarks.size,
      totalComparisons: comparisons.length,
      totalReports: this.reports.size,
      avgOverallScore: comparisons.length > 0
        ? comparisons.reduce((sum, c) => sum + c.overallScore, 0) / comparisons.length
        : 0,
      topIndustry,
      topCompanySize,
    };
  }
}

export default PortalBaselinesEngine;
