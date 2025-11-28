/**
 * Scenario Twin Module
 * What-if scenario simulation and comparison engine
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Scenario Twin Types
// ============================================================

export interface Scenario {
  id: string;
  name: string;
  description: string;
  baselineSnapshotId: string;
  parameters: WhatIfParameter[];
  status: 'draft' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface WhatIfParameter {
  id: string;
  name: string;
  type: 'percentage' | 'absolute' | 'multiplier';
  target: string;
  currentValue: number;
  newValue: number;
  description: string;
}

export interface ScenarioResult {
  id: string;
  scenarioId: string;
  timestamp: Date;
  baselineMetrics: ScenarioMetrics;
  projectedMetrics: ScenarioMetrics;
  impact: ScenarioImpact;
  confidence: number;
  recommendations: string[];
}

export interface ScenarioMetrics {
  revenue: number;
  dealCount: number;
  winRate: number;
  avgDealSize: number;
  cycleTime: number;
  pipelineValue: number;
  customerCount: number;
  churnRate: number;
}

export interface ScenarioImpact {
  revenueChange: number;
  revenueChangePercent: number;
  dealCountChange: number;
  winRateChange: number;
  cycleTimeChange: number;
  riskLevel: 'low' | 'medium' | 'high';
  paybackPeriod?: number;
  roi?: number;
}

export interface ScenarioComparison {
  scenarios: string[];
  winner: string;
  metrics: Record<string, Record<string, number>>;
  tradeoffs: string[];
  recommendation: string;
}

export interface ScenarioConfig {
  maxIterations: number;
  confidenceThreshold: number;
  parallelScenarios: number;
}

export interface ScenarioStats {
  totalScenarios: number;
  completedScenarios: number;
  avgConfidence: number;
  bestScenario: string | null;
}

// ============================================================
// Scenario Twin Implementation
// ============================================================

export class ScenarioTwin {
  private scenarios: Map<string, Scenario> = new Map();
  private results: Map<string, ScenarioResult> = new Map();
  private config: ScenarioConfig;
  private stats: ScenarioStats;

  constructor(config?: Partial<ScenarioConfig>) {
    this.config = {
      maxIterations: 1000,
      confidenceThreshold: 0.8,
      parallelScenarios: 5,
      ...config,
    };

    this.stats = {
      totalScenarios: 0,
      completedScenarios: 0,
      avgConfidence: 0,
      bestScenario: null,
    };
  }

  /**
   * Create a new scenario
   */
  createScenario(
    name: string,
    description: string,
    baselineSnapshotId: string,
    parameters: Omit<WhatIfParameter, 'id'>[]
  ): Scenario {
    const scenario: Scenario = {
      id: generateId(),
      name,
      description,
      baselineSnapshotId,
      parameters: parameters.map(p => ({ ...p, id: generateId() })),
      status: 'draft',
      createdAt: new Date(),
    };

    this.scenarios.set(scenario.id, scenario);
    this.stats.totalScenarios++;

    return scenario;
  }

  /**
   * Run a scenario simulation
   */
  runScenario(
    scenarioId: string,
    baselineMetrics: ScenarioMetrics
  ): ScenarioResult {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    scenario.status = 'running';

    // Apply parameters to baseline
    const projectedMetrics = this.applyParameters(baselineMetrics, scenario.parameters);

    // Calculate impact
    const impact = this.calculateImpact(baselineMetrics, projectedMetrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(impact, scenario.parameters);

    // Calculate confidence
    const confidence = this.calculateConfidence(scenario.parameters);

    const result: ScenarioResult = {
      id: generateId(),
      scenarioId,
      timestamp: new Date(),
      baselineMetrics,
      projectedMetrics,
      impact,
      confidence,
      recommendations,
    };

    this.results.set(result.id, result);
    scenario.status = 'completed';
    scenario.completedAt = new Date();

    this.updateStats(result);

    return result;
  }

  /**
   * Compare multiple scenarios
   */
  compareScenarios(scenarioIds: string[]): ScenarioComparison {
    const scenarioResults: ScenarioResult[] = [];

    for (const id of scenarioIds) {
      const resultEntries = Array.from(this.results.values())
        .filter(r => r.scenarioId === id);
      if (resultEntries.length > 0) {
        scenarioResults.push(resultEntries[resultEntries.length - 1]);
      }
    }

    if (scenarioResults.length === 0) {
      return {
        scenarios: scenarioIds,
        winner: '',
        metrics: {},
        tradeoffs: [],
        recommendation: 'No completed scenarios to compare',
      };
    }

    // Build metrics comparison
    const metrics: Record<string, Record<string, number>> = {};
    for (const result of scenarioResults) {
      const scenario = this.scenarios.get(result.scenarioId);
      const name = scenario?.name || result.scenarioId;
      metrics[name] = {
        revenue: result.projectedMetrics.revenue,
        revenueChange: result.impact.revenueChangePercent,
        winRate: result.projectedMetrics.winRate,
        cycleTime: result.projectedMetrics.cycleTime,
        risk: result.impact.riskLevel === 'high' ? 3 : result.impact.riskLevel === 'medium' ? 2 : 1,
        confidence: result.confidence,
      };
    }

    // Find winner (highest revenue change with acceptable risk)
    const validResults = scenarioResults.filter(r => 
      r.impact.riskLevel !== 'high' && r.confidence >= this.config.confidenceThreshold
    );

    const winner = validResults.length > 0
      ? validResults.sort((a, b) => b.impact.revenueChangePercent - a.impact.revenueChangePercent)[0]
      : scenarioResults[0];

    const winnerScenario = this.scenarios.get(winner.scenarioId);

    // Identify tradeoffs
    const tradeoffs: string[] = [];
    for (const result of scenarioResults) {
      if (result.impact.cycleTimeChange > 0) {
        tradeoffs.push(`${this.scenarios.get(result.scenarioId)?.name}: Longer cycle time`);
      }
      if (result.impact.winRateChange < 0) {
        tradeoffs.push(`${this.scenarios.get(result.scenarioId)?.name}: Lower win rate`);
      }
    }

    return {
      scenarios: scenarioIds,
      winner: winnerScenario?.name || winner.scenarioId,
      metrics,
      tradeoffs,
      recommendation: `Recommend "${winnerScenario?.name}" with ${(winner.impact.revenueChangePercent * 100).toFixed(1)}% revenue increase`,
    };
  }

  /**
   * Create common what-if scenarios
   */
  createCommonScenarios(baselineSnapshotId: string): Scenario[] {
    const scenarios: Scenario[] = [];

    // Price increase scenario
    scenarios.push(this.createScenario(
      'Price Increase 10%',
      'What if we increase prices by 10%?',
      baselineSnapshotId,
      [{
        name: 'Price Change',
        type: 'percentage',
        target: 'avgDealSize',
        currentValue: 0,
        newValue: 10,
        description: 'Increase average deal size by 10%',
      }]
    ));

    // Win rate improvement
    scenarios.push(this.createScenario(
      'Improve Win Rate',
      'What if we improve win rate by 5 percentage points?',
      baselineSnapshotId,
      [{
        name: 'Win Rate Improvement',
        type: 'absolute',
        target: 'winRate',
        currentValue: 0,
        newValue: 5,
        description: 'Increase win rate by 5 points',
      }]
    ));

    // Reduce cycle time
    scenarios.push(this.createScenario(
      'Faster Sales Cycle',
      'What if we reduce cycle time by 20%?',
      baselineSnapshotId,
      [{
        name: 'Cycle Time Reduction',
        type: 'percentage',
        target: 'cycleTime',
        currentValue: 0,
        newValue: -20,
        description: 'Reduce cycle time by 20%',
      }]
    ));

    // Pipeline expansion
    scenarios.push(this.createScenario(
      'Pipeline Expansion',
      'What if we increase pipeline by 30%?',
      baselineSnapshotId,
      [{
        name: 'Pipeline Growth',
        type: 'percentage',
        target: 'pipelineValue',
        currentValue: 0,
        newValue: 30,
        description: 'Increase pipeline value by 30%',
      }]
    ));

    return scenarios;
  }

  /**
   * Get scenario by ID
   */
  getScenario(id: string): Scenario | undefined {
    return this.scenarios.get(id);
  }

  /**
   * Get result by ID
   */
  getResult(id: string): ScenarioResult | undefined {
    return this.results.get(id);
  }

  /**
   * Get statistics
   */
  getStats(): ScenarioStats {
    return { ...this.stats };
  }

  // Private methods

  private applyParameters(
    baseline: ScenarioMetrics,
    parameters: WhatIfParameter[]
  ): ScenarioMetrics {
    const projected = { ...baseline };

    for (const param of parameters) {
      const target = param.target as keyof ScenarioMetrics;
      if (!(target in projected)) continue;

      const currentValue = projected[target] as number;

      switch (param.type) {
        case 'percentage':
          projected[target] = currentValue * (1 + param.newValue / 100) as never;
          break;
        case 'absolute':
          projected[target] = (currentValue + param.newValue) as never;
          break;
        case 'multiplier':
          projected[target] = (currentValue * param.newValue) as never;
          break;
      }
    }

    // Recalculate derived metrics
    projected.revenue = projected.dealCount * projected.avgDealSize * projected.winRate;

    return projected;
  }

  private calculateImpact(
    baseline: ScenarioMetrics,
    projected: ScenarioMetrics
  ): ScenarioImpact {
    const revenueChange = projected.revenue - baseline.revenue;
    const revenueChangePercent = baseline.revenue > 0 
      ? revenueChange / baseline.revenue 
      : 0;

    const dealCountChange = projected.dealCount - baseline.dealCount;
    const winRateChange = projected.winRate - baseline.winRate;
    const cycleTimeChange = projected.cycleTime - baseline.cycleTime;

    // Assess risk based on magnitude of changes
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (Math.abs(revenueChangePercent) > 0.3 || cycleTimeChange > 10) {
      riskLevel = 'high';
    } else if (Math.abs(revenueChangePercent) > 0.15 || cycleTimeChange > 5) {
      riskLevel = 'medium';
    }

    return {
      revenueChange,
      revenueChangePercent,
      dealCountChange,
      winRateChange,
      cycleTimeChange,
      riskLevel,
      paybackPeriod: revenueChange > 0 ? 12 / (revenueChangePercent * 12) : undefined,
      roi: revenueChange > 0 ? revenueChangePercent * 100 : undefined,
    };
  }

  private generateRecommendations(
    impact: ScenarioImpact,
    parameters: WhatIfParameter[]
  ): string[] {
    const recommendations: string[] = [];

    if (impact.revenueChangePercent > 0.1) {
      recommendations.push('Strong revenue potential - consider implementing');
    }

    if (impact.riskLevel === 'high') {
      recommendations.push('High risk - implement in phases with monitoring');
    }

    if (impact.cycleTimeChange > 0) {
      recommendations.push('Longer cycle time expected - plan for capacity');
    }

    if (impact.winRateChange < 0) {
      recommendations.push('Win rate may decrease - prepare mitigation strategies');
    }

    for (const param of parameters) {
      if (param.target === 'avgDealSize' && param.newValue > 10) {
        recommendations.push('Price increase requires value communication strategy');
      }
      if (param.target === 'pipelineValue' && param.newValue > 20) {
        recommendations.push('Pipeline growth requires lead generation investment');
      }
    }

    return recommendations;
  }

  private calculateConfidence(parameters: WhatIfParameter[]): number {
    let confidence = 0.9;

    // Reduce confidence for aggressive changes
    for (const param of parameters) {
      const magnitude = Math.abs(param.newValue);
      
      if (param.type === 'percentage' && magnitude > 20) {
        confidence *= 0.9;
      }
      if (param.type === 'percentage' && magnitude > 50) {
        confidence *= 0.8;
      }
    }

    // Multiple parameters reduce confidence
    if (parameters.length > 3) {
      confidence *= 0.85;
    }

    return Math.max(0.5, confidence);
  }

  private updateStats(result: ScenarioResult): void {
    this.stats.completedScenarios++;

    // Update average confidence
    const allResults = Array.from(this.results.values());
    this.stats.avgConfidence = allResults.length > 0
      ? allResults.reduce((sum, r) => sum + r.confidence, 0) / allResults.length
      : 0;

    // Find best scenario
    const bestResult = allResults
      .filter(r => r.confidence >= this.config.confidenceThreshold)
      .sort((a, b) => b.impact.revenueChangePercent - a.impact.revenueChangePercent)[0];

    if (bestResult) {
      const scenario = this.scenarios.get(bestResult.scenarioId);
      this.stats.bestScenario = scenario?.name || bestResult.scenarioId;
    }
  }
}

export default ScenarioTwin;
