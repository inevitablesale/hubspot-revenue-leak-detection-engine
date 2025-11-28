/**
 * Benchmark Index Module
 * Industry-wide benchmarking and performance ranking
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Benchmark Index Types
// ============================================================

export interface Benchmark {
  id: string;
  name: string;
  category: BenchmarkCategory;
  metric: string;
  value: number;
  percentile: number;
  industry: string;
  segment: string;
  period: string;
  sampleSize: number;
  updatedAt: Date;
}

export type BenchmarkCategory = 
  | 'sales_performance'
  | 'pipeline_health'
  | 'revenue_efficiency'
  | 'customer_success'
  | 'data_quality'
  | 'process_efficiency';

export interface PerformanceRank {
  entityId: string;
  entityName: string;
  category: BenchmarkCategory;
  rank: number;
  totalInCategory: number;
  percentile: number;
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  gaps: RankGap[];
}

export interface RankGap {
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  gap: number;
  priority: 'low' | 'medium' | 'high';
}

export interface IndustryBaseline {
  industry: string;
  segment: string;
  metrics: BaselineMetrics;
  percentiles: Record<string, PercentileDistribution>;
  lastUpdated: Date;
}

export interface BaselineMetrics {
  avgWinRate: number;
  avgDealSize: number;
  avgCycleTime: number;
  avgPipelineCoverage: number;
  avgLeakageRate: number;
  avgResponseTime: number;
}

export interface PercentileDistribution {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface BenchmarkConfig {
  updateFrequency: number;
  minSampleSize: number;
  categories: BenchmarkCategory[];
}

export interface BenchmarkStats {
  totalBenchmarks: number;
  industriesCovered: number;
  lastUpdate: Date | null;
  avgSampleSize: number;
}

// ============================================================
// Benchmark Index Implementation
// ============================================================

export class BenchmarkIndex {
  private benchmarks: Map<string, Benchmark> = new Map();
  private baselines: Map<string, IndustryBaseline> = new Map();
  private rankings: Map<string, PerformanceRank[]> = new Map();
  private config: BenchmarkConfig;
  private stats: BenchmarkStats;

  constructor(config?: Partial<BenchmarkConfig>) {
    this.config = {
      updateFrequency: 86400000, // 24 hours
      minSampleSize: 10,
      categories: [
        'sales_performance',
        'pipeline_health',
        'revenue_efficiency',
        'customer_success',
        'data_quality',
        'process_efficiency',
      ],
      ...config,
    };

    this.stats = {
      totalBenchmarks: 0,
      industriesCovered: 0,
      lastUpdate: null,
      avgSampleSize: 0,
    };

    // Initialize with default baselines
    this.initializeDefaultBaselines();
  }

  /**
   * Add or update a benchmark
   */
  addBenchmark(
    category: BenchmarkCategory,
    metric: string,
    value: number,
    industry: string,
    segment: string,
    sampleSize: number
  ): Benchmark {
    const key = `${category}-${metric}-${industry}-${segment}`;
    const existing = this.benchmarks.get(key);

    const benchmark: Benchmark = {
      id: existing?.id || generateId(),
      name: `${metric} for ${industry}/${segment}`,
      category,
      metric,
      value,
      percentile: 50, // Will be recalculated
      industry,
      segment,
      period: this.getCurrentPeriod(),
      sampleSize,
      updatedAt: new Date(),
    };

    this.benchmarks.set(key, benchmark);
    this.updateStats();

    // Update industry baseline
    this.updateBaseline(industry, segment, metric, value, sampleSize);

    return benchmark;
  }

  /**
   * Get benchmarks for a category
   */
  getBenchmarksByCategory(category: BenchmarkCategory): Benchmark[] {
    return Array.from(this.benchmarks.values())
      .filter(b => b.category === category);
  }

  /**
   * Get benchmark for specific metric
   */
  getBenchmark(
    metric: string,
    industry: string,
    segment?: string
  ): Benchmark | undefined {
    const seg = segment || 'all';
    
    for (const benchmark of this.benchmarks.values()) {
      if (benchmark.metric === metric && 
          benchmark.industry === industry &&
          benchmark.segment === seg) {
        return benchmark;
      }
    }

    return undefined;
  }

  /**
   * Calculate performance rank
   */
  calculateRank(
    entityId: string,
    entityName: string,
    category: BenchmarkCategory,
    metrics: Record<string, number>,
    industry: string,
    segment?: string
  ): PerformanceRank {
    const seg = segment || 'all';
    const baseline = this.baselines.get(`${industry}-${seg}`);
    
    // Calculate score based on metrics
    const gaps: RankGap[] = [];
    let totalScore = 0;
    let metricCount = 0;

    for (const [metric, value] of Object.entries(metrics)) {
      const benchmark = this.getBenchmark(metric, industry, seg);
      if (benchmark) {
        const score = this.calculateMetricScore(value, benchmark.value, metric);
        totalScore += score;
        metricCount++;

        const gap = benchmark.value - value;
        if (Math.abs(gap) > benchmark.value * 0.1) {
          gaps.push({
            metric,
            currentValue: value,
            benchmarkValue: benchmark.value,
            gap,
            priority: Math.abs(gap) > benchmark.value * 0.3 ? 'high' : 
                     Math.abs(gap) > benchmark.value * 0.2 ? 'medium' : 'low',
          });
        }
      }
    }

    const avgScore = metricCount > 0 ? totalScore / metricCount : 50;

    // Get or create rankings for this category
    let categoryRankings = this.rankings.get(category) || [];
    
    const rank: PerformanceRank = {
      entityId,
      entityName,
      category,
      rank: 0, // Will be calculated
      totalInCategory: categoryRankings.length + 1,
      percentile: avgScore,
      score: avgScore,
      trend: 'stable',
      gaps: gaps.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
    };

    // Calculate rank position
    const rankPosition = categoryRankings.filter(r => r.score > avgScore).length + 1;
    rank.rank = rankPosition;

    // Update rankings
    categoryRankings = categoryRankings.filter(r => r.entityId !== entityId);
    categoryRankings.push(rank);
    categoryRankings.sort((a, b) => b.score - a.score);
    
    // Update all ranks
    categoryRankings.forEach((r, idx) => {
      r.rank = idx + 1;
      r.totalInCategory = categoryRankings.length;
    });

    this.rankings.set(category, categoryRankings);

    return rank;
  }

  /**
   * Get industry baseline
   */
  getBaseline(industry: string, segment?: string): IndustryBaseline | undefined {
    const seg = segment || 'all';
    return this.baselines.get(`${industry}-${seg}`);
  }

  /**
   * Get top performers in a category
   */
  getTopPerformers(category: BenchmarkCategory, limit: number = 10): PerformanceRank[] {
    const rankings = this.rankings.get(category) || [];
    return rankings.slice(0, limit);
  }

  /**
   * Compare performance against benchmark
   */
  compareToBaseline(
    metrics: Record<string, number>,
    industry: string,
    segment?: string
  ): Record<string, { value: number; baseline: number; percentile: number; status: string }> {
    const seg = segment || 'all';
    const baseline = this.baselines.get(`${industry}-${seg}`);
    const result: Record<string, { value: number; baseline: number; percentile: number; status: string }> = {};

    if (!baseline) return result;

    for (const [metric, value] of Object.entries(metrics)) {
      const percentiles = baseline.percentiles[metric];
      if (percentiles) {
        let percentile = 50;
        let status = 'average';

        if (value >= percentiles.p90) {
          percentile = 90;
          status = 'excellent';
        } else if (value >= percentiles.p75) {
          percentile = 75;
          status = 'above_average';
        } else if (value >= percentiles.p50) {
          percentile = 50;
          status = 'average';
        } else if (value >= percentiles.p25) {
          percentile = 25;
          status = 'below_average';
        } else {
          percentile = 10;
          status = 'needs_improvement';
        }

        result[metric] = {
          value,
          baseline: percentiles.p50,
          percentile,
          status,
        };
      }
    }

    return result;
  }

  /**
   * Get statistics
   */
  getStats(): BenchmarkStats {
    return { ...this.stats };
  }

  // Private methods

  private initializeDefaultBaselines(): void {
    const defaultIndustries = ['saas', 'services', 'manufacturing', 'retail', 'healthcare'];
    const defaultSegments = ['smb', 'mid_market', 'enterprise', 'all'];

    for (const industry of defaultIndustries) {
      for (const segment of defaultSegments) {
        this.createBaseline(industry, segment);
      }
    }

    this.stats.industriesCovered = defaultIndustries.length;
  }

  private createBaseline(industry: string, segment: string): IndustryBaseline {
    // Default baseline values - in production, these would come from aggregated data
    const multiplier = segment === 'enterprise' ? 1.2 : segment === 'mid_market' ? 1.0 : 0.8;

    const baseline: IndustryBaseline = {
      industry,
      segment,
      metrics: {
        avgWinRate: 0.25 * multiplier,
        avgDealSize: 50000 * multiplier,
        avgCycleTime: 45 / multiplier,
        avgPipelineCoverage: 3.0,
        avgLeakageRate: 0.08,
        avgResponseTime: 24,
      },
      percentiles: {
        winRate: { p10: 0.1, p25: 0.18, p50: 0.25, p75: 0.35, p90: 0.45 },
        dealSize: { p10: 10000, p25: 25000, p50: 50000, p75: 100000, p90: 250000 },
        cycleTime: { p10: 20, p25: 30, p50: 45, p75: 60, p90: 90 },
        pipelineCoverage: { p10: 1.5, p25: 2.0, p50: 3.0, p75: 4.0, p90: 5.0 },
        leakageRate: { p10: 0.02, p25: 0.04, p50: 0.08, p75: 0.12, p90: 0.18 },
        responseTime: { p10: 4, p25: 12, p50: 24, p75: 48, p90: 72 },
      },
      lastUpdated: new Date(),
    };

    this.baselines.set(`${industry}-${segment}`, baseline);
    return baseline;
  }

  private updateBaseline(
    industry: string,
    segment: string,
    metric: string,
    value: number,
    sampleSize: number
  ): void {
    const key = `${industry}-${segment}`;
    let baseline = this.baselines.get(key);

    if (!baseline) {
      baseline = this.createBaseline(industry, segment);
    }

    // Update percentiles based on new data (simplified)
    const percentiles = baseline.percentiles[metric];
    if (percentiles && sampleSize >= this.config.minSampleSize) {
      // Adjust median towards new value
      percentiles.p50 = (percentiles.p50 * 0.9) + (value * 0.1);
      baseline.lastUpdated = new Date();
    }
  }

  private calculateMetricScore(
    value: number,
    benchmarkValue: number,
    metric: string
  ): number {
    // Metrics where lower is better
    const lowerIsBetter = ['cycleTime', 'leakageRate', 'responseTime'];
    
    if (lowerIsBetter.includes(metric)) {
      if (value <= benchmarkValue * 0.5) return 100;
      if (value <= benchmarkValue * 0.75) return 85;
      if (value <= benchmarkValue) return 70;
      if (value <= benchmarkValue * 1.25) return 50;
      if (value <= benchmarkValue * 1.5) return 30;
      return 10;
    }

    // Metrics where higher is better
    if (value >= benchmarkValue * 1.5) return 100;
    if (value >= benchmarkValue * 1.25) return 85;
    if (value >= benchmarkValue) return 70;
    if (value >= benchmarkValue * 0.75) return 50;
    if (value >= benchmarkValue * 0.5) return 30;
    return 10;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  }

  private updateStats(): void {
    this.stats.totalBenchmarks = this.benchmarks.size;
    this.stats.lastUpdate = new Date();

    const sampleSizes = Array.from(this.benchmarks.values()).map(b => b.sampleSize);
    this.stats.avgSampleSize = sampleSizes.length > 0
      ? Math.round(sampleSizes.reduce((a, b) => a + b, 0) / sampleSizes.length)
      : 0;
  }
}

export default BenchmarkIndex;
