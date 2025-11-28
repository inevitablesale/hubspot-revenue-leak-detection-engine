/**
 * Pipeline Agent
 * Specialized agent for pipeline health analysis, stage optimization, and deal flow
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Pipeline Agent Types
// ============================================================

export interface PipelineAnalysis {
  id: string;
  timestamp: Date;
  pipelineId: string;
  health: PipelineHealth;
  stageMetrics: StageMetrics[];
  recommendations: PipelineRecommendation[];
  bottlenecks: PipelineBottleneck[];
  velocity: VelocityMetrics;
}

export interface PipelineHealth {
  overall: number;
  coverage: number;
  velocity: number;
  conversion: number;
  quality: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface StageMetrics {
  stageId: string;
  stageName: string;
  dealCount: number;
  totalValue: number;
  avgDaysInStage: number;
  conversionRate: number;
  dropOffRate: number;
  velocityScore: number;
}

export interface PipelineRecommendation {
  id: string;
  priority: number;
  type: 'velocity' | 'conversion' | 'coverage' | 'quality' | 'structure';
  action: string;
  description: string;
  expectedImpact: number;
  affectedStages: string[];
}

export interface PipelineBottleneck {
  id: string;
  stageId: string;
  stageName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'time' | 'conversion' | 'capacity' | 'quality';
  description: string;
  impact: number;
  suggestedFix: string;
}

export interface VelocityMetrics {
  avgCycleTime: number;
  medianCycleTime: number;
  winRate: number;
  avgDealSize: number;
  pipelineVelocity: number;
  trend: 'accelerating' | 'stable' | 'slowing';
}

export interface PipelineConfig {
  stageTimeThresholds: Record<string, number>;
  conversionThresholds: Record<string, number>;
  healthWeights: {
    coverage: number;
    velocity: number;
    conversion: number;
    quality: number;
  };
}

export interface PipelineStats {
  totalAnalyses: number;
  pipelinesMonitored: number;
  avgHealth: number;
  bottlenecksIdentified: number;
  recommendationsGenerated: number;
}

// ============================================================
// Pipeline Agent Implementation
// ============================================================

export class PipelineAgent {
  private analyses: Map<string, PipelineAnalysis> = new Map();
  private pipelineHealth: Map<string, PipelineHealth> = new Map();
  private config: PipelineConfig;
  private stats: PipelineStats;

  constructor(config?: Partial<PipelineConfig>) {
    this.config = {
      stageTimeThresholds: {
        discovery: 14,
        qualification: 21,
        proposal: 14,
        negotiation: 14,
        closing: 7,
      },
      conversionThresholds: {
        discovery: 0.7,
        qualification: 0.5,
        proposal: 0.6,
        negotiation: 0.7,
        closing: 0.8,
      },
      healthWeights: {
        coverage: 0.25,
        velocity: 0.25,
        conversion: 0.3,
        quality: 0.2,
      },
      ...config,
    };

    this.stats = {
      totalAnalyses: 0,
      pipelinesMonitored: 0,
      avgHealth: 0,
      bottlenecksIdentified: 0,
      recommendationsGenerated: 0,
    };
  }

  /**
   * Analyze pipeline health
   */
  analyzePipeline(
    pipelineId: string,
    deals: Array<{ id: string; stage: string; value: number; daysInStage: number; createdAt: Date; closedAt?: Date }>
  ): PipelineAnalysis {
    const stageMetrics = this.calculateStageMetrics(deals);
    const velocity = this.calculateVelocity(deals);
    const health = this.calculateHealth(stageMetrics, velocity, deals);
    const bottlenecks = this.identifyBottlenecks(stageMetrics);
    const recommendations = this.generateRecommendations(health, stageMetrics, bottlenecks);

    const analysis: PipelineAnalysis = {
      id: generateId(),
      timestamp: new Date(),
      pipelineId,
      health,
      stageMetrics,
      recommendations,
      bottlenecks,
      velocity,
    };

    this.analyses.set(analysis.id, analysis);
    this.pipelineHealth.set(pipelineId, health);
    this.updateStats(analysis);

    return analysis;
  }

  /**
   * Get pipeline health
   */
  getHealth(pipelineId: string): PipelineHealth | undefined {
    return this.pipelineHealth.get(pipelineId);
  }

  /**
   * Get critical bottlenecks across all pipelines
   */
  getCriticalBottlenecks(): PipelineBottleneck[] {
    const bottlenecks: PipelineBottleneck[] = [];

    for (const analysis of this.analyses.values()) {
      for (const bottleneck of analysis.bottlenecks) {
        if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
          bottlenecks.push(bottleneck);
        }
      }
    }

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(id: string): PipelineAnalysis | undefined {
    return this.analyses.get(id);
  }

  /**
   * Get statistics
   */
  getStats(): PipelineStats {
    return { ...this.stats };
  }

  // Private methods

  private calculateStageMetrics(
    deals: Array<{ id: string; stage: string; value: number; daysInStage: number }>
  ): StageMetrics[] {
    const stageMap = new Map<string, { deals: typeof deals; values: number[]; days: number[] }>();

    // Group deals by stage
    for (const deal of deals) {
      if (!stageMap.has(deal.stage)) {
        stageMap.set(deal.stage, { deals: [], values: [], days: [] });
      }
      const stageData = stageMap.get(deal.stage)!;
      stageData.deals.push(deal);
      stageData.values.push(deal.value);
      stageData.days.push(deal.daysInStage);
    }

    const stages = ['discovery', 'qualification', 'proposal', 'negotiation', 'closing'];
    const metrics: StageMetrics[] = [];

    let previousCount = deals.length;

    for (const stageName of stages) {
      const stageData = stageMap.get(stageName);
      const dealCount = stageData?.deals.length || 0;
      const totalValue = stageData?.values.reduce((a, b) => a + b, 0) || 0;
      const avgDays = stageData?.days.length
        ? stageData.days.reduce((a, b) => a + b, 0) / stageData.days.length
        : 0;

      const conversionRate = previousCount > 0 ? dealCount / previousCount : 0;
      const dropOffRate = 1 - conversionRate;

      const threshold = this.config.stageTimeThresholds[stageName] || 14;
      const velocityScore = avgDays <= threshold ? 100 : Math.max(0, 100 - (avgDays - threshold) * 5);

      metrics.push({
        stageId: stageName,
        stageName,
        dealCount,
        totalValue,
        avgDaysInStage: Math.round(avgDays),
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropOffRate: Math.round(dropOffRate * 100) / 100,
        velocityScore: Math.round(velocityScore),
      });

      previousCount = dealCount;
    }

    return metrics;
  }

  private calculateVelocity(
    deals: Array<{ id: string; value: number; createdAt: Date; closedAt?: Date }>
  ): VelocityMetrics {
    const closedDeals = deals.filter(d => d.closedAt);
    const wonDeals = closedDeals; // Simplified - assumes closed = won

    if (closedDeals.length === 0) {
      return {
        avgCycleTime: 0,
        medianCycleTime: 0,
        winRate: 0,
        avgDealSize: 0,
        pipelineVelocity: 0,
        trend: 'stable',
      };
    }

    const cycleTimes = closedDeals.map(d => {
      const created = new Date(d.createdAt);
      const closed = new Date(d.closedAt!);
      return (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    });

    const avgCycleTime = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
    const sortedCycleTimes = [...cycleTimes].sort((a, b) => a - b);
    const medianCycleTime = sortedCycleTimes[Math.floor(sortedCycleTimes.length / 2)];

    const winRate = wonDeals.length / deals.length;
    const avgDealSize = wonDeals.reduce((a, b) => a + b.value, 0) / wonDeals.length;

    // Pipeline velocity = # of opportunities × win rate × average deal size ÷ length of sales cycle
    const pipelineVelocity = (deals.length * winRate * avgDealSize) / (avgCycleTime || 1);

    return {
      avgCycleTime: Math.round(avgCycleTime),
      medianCycleTime: Math.round(medianCycleTime),
      winRate: Math.round(winRate * 100) / 100,
      avgDealSize: Math.round(avgDealSize),
      pipelineVelocity: Math.round(pipelineVelocity),
      trend: 'stable',
    };
  }

  private calculateHealth(
    stageMetrics: StageMetrics[],
    velocity: VelocityMetrics,
    deals: Array<{ value: number }>
  ): PipelineHealth {
    const weights = this.config.healthWeights;

    // Coverage: pipeline value vs target (assume target is 3x current value)
    const totalValue = deals.reduce((a, b) => a + b.value, 0);
    const coverageScore = Math.min(100, (totalValue / (totalValue * 3)) * 100 * 3);

    // Velocity: based on average velocity scores across stages
    const avgVelocityScore = stageMetrics.length > 0
      ? stageMetrics.reduce((a, b) => a + b.velocityScore, 0) / stageMetrics.length
      : 50;

    // Conversion: average conversion rate across stages
    const avgConversion = stageMetrics.length > 0
      ? stageMetrics.reduce((a, b) => a + b.conversionRate, 0) / stageMetrics.length * 100
      : 50;

    // Quality: based on win rate and deal size consistency
    const qualityScore = velocity.winRate * 100;

    const overall =
      coverageScore * weights.coverage +
      avgVelocityScore * weights.velocity +
      avgConversion * weights.conversion +
      qualityScore * weights.quality;

    return {
      overall: Math.round(overall),
      coverage: Math.round(coverageScore),
      velocity: Math.round(avgVelocityScore),
      conversion: Math.round(avgConversion),
      quality: Math.round(qualityScore),
      trend: 'stable',
    };
  }

  private identifyBottlenecks(stageMetrics: StageMetrics[]): PipelineBottleneck[] {
    const bottlenecks: PipelineBottleneck[] = [];

    for (const stage of stageMetrics) {
      const threshold = this.config.stageTimeThresholds[stage.stageId] || 14;
      const conversionThreshold = this.config.conversionThresholds[stage.stageId] || 0.5;

      // Time bottleneck
      if (stage.avgDaysInStage > threshold * 1.5) {
        bottlenecks.push({
          id: generateId(),
          stageId: stage.stageId,
          stageName: stage.stageName,
          severity: stage.avgDaysInStage > threshold * 2 ? 'critical' : 'high',
          type: 'time',
          description: `Deals spending ${stage.avgDaysInStage} days in ${stage.stageName} (threshold: ${threshold})`,
          impact: (stage.avgDaysInStage - threshold) * stage.totalValue / 100,
          suggestedFix: 'Review stage criteria and automate progression where possible',
        });
      }

      // Conversion bottleneck
      if (stage.conversionRate < conversionThreshold * 0.7) {
        bottlenecks.push({
          id: generateId(),
          stageId: stage.stageId,
          stageName: stage.stageName,
          severity: stage.conversionRate < conversionThreshold * 0.5 ? 'critical' : 'high',
          type: 'conversion',
          description: `Low conversion rate of ${(stage.conversionRate * 100).toFixed(1)}% in ${stage.stageName}`,
          impact: stage.totalValue * (conversionThreshold - stage.conversionRate),
          suggestedFix: 'Analyze drop-off reasons and implement targeted interventions',
        });
      }

      // Capacity bottleneck (too many deals)
      if (stage.dealCount > 50) {
        bottlenecks.push({
          id: generateId(),
          stageId: stage.stageId,
          stageName: stage.stageName,
          severity: stage.dealCount > 100 ? 'high' : 'medium',
          type: 'capacity',
          description: `${stage.dealCount} deals in ${stage.stageName} may indicate capacity issues`,
          impact: stage.totalValue * 0.1,
          suggestedFix: 'Consider adding resources or implementing deal scoring to prioritize',
        });
      }
    }

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  private generateRecommendations(
    health: PipelineHealth,
    stageMetrics: StageMetrics[],
    bottlenecks: PipelineBottleneck[]
  ): PipelineRecommendation[] {
    const recommendations: PipelineRecommendation[] = [];

    // Low overall health
    if (health.overall < 50) {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'structure',
        action: 'pipeline_review',
        description: 'Conduct comprehensive pipeline review to address multiple health issues',
        expectedImpact: 20,
        affectedStages: stageMetrics.map(s => s.stageId),
      });
    }

    // Low velocity
    if (health.velocity < 50) {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'velocity',
        action: 'streamline_process',
        description: 'Streamline sales process to reduce cycle time',
        expectedImpact: 15,
        affectedStages: stageMetrics.filter(s => s.velocityScore < 50).map(s => s.stageId),
      });
    }

    // Low conversion
    if (health.conversion < 50) {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'conversion',
        action: 'conversion_optimization',
        description: 'Implement conversion optimization tactics at underperforming stages',
        expectedImpact: 20,
        affectedStages: stageMetrics.filter(s => s.conversionRate < 0.5).map(s => s.stageId),
      });
    }

    // Low coverage
    if (health.coverage < 50) {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'coverage',
        action: 'pipeline_generation',
        description: 'Increase pipeline generation to improve coverage',
        expectedImpact: 25,
        affectedStages: ['discovery'],
      });
    }

    // Address critical bottlenecks
    for (const bottleneck of bottlenecks.filter(b => b.severity === 'critical')) {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: bottleneck.type === 'time' ? 'velocity' : bottleneck.type === 'conversion' ? 'conversion' : 'quality',
        action: 'fix_bottleneck',
        description: bottleneck.suggestedFix,
        expectedImpact: bottleneck.impact / 1000,
        affectedStages: [bottleneck.stageId],
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private updateStats(analysis: PipelineAnalysis): void {
    this.stats.totalAnalyses++;
    this.stats.pipelinesMonitored = this.pipelineHealth.size;
    this.stats.bottlenecksIdentified += analysis.bottlenecks.length;
    this.stats.recommendationsGenerated += analysis.recommendations.length;

    const healths = Array.from(this.pipelineHealth.values());
    this.stats.avgHealth = healths.length > 0
      ? Math.round(healths.reduce((a, b) => a + b.overall, 0) / healths.length)
      : 0;
  }
}

export default PipelineAgent;
