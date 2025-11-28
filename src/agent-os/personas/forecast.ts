/**
 * Forecast Agent
 * Specialized agent for revenue forecasting, prediction modeling, and accuracy tracking
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Forecast Agent Types
// ============================================================

export interface ForecastAnalysis {
  id: string;
  timestamp: Date;
  period: string;
  forecast: ForecastModel;
  scenarios: ForecastScenario[];
  accuracy: ForecastAccuracy;
  recommendations: ForecastRecommendation[];
}

export interface ForecastModel {
  id: string;
  name: string;
  type: 'weighted' | 'probabilistic' | 'ai' | 'historical';
  baseline: number;
  committed: number;
  bestCase: number;
  expected: number;
  worstCase: number;
  confidence: number;
  factors: ForecastFactor[];
}

export interface ForecastFactor {
  name: string;
  weight: number;
  value: number;
  impact: number;
  direction: 'positive' | 'negative' | 'neutral';
}

export interface ForecastScenario {
  id: string;
  name: string;
  description: string;
  probability: number;
  value: number;
  assumptions: string[];
  risks: string[];
}

export interface ForecastAccuracy {
  overall: number;
  byCategory: Record<string, number>;
  byRep: Record<string, number>;
  trend: 'improving' | 'stable' | 'declining';
  historicalAccuracy: HistoricalAccuracy[];
}

export interface HistoricalAccuracy {
  period: string;
  forecasted: number;
  actual: number;
  variance: number;
  accuracy: number;
}

export interface ForecastRecommendation {
  id: string;
  priority: number;
  type: 'coverage' | 'accuracy' | 'risk' | 'opportunity';
  action: string;
  description: string;
  expectedImpact: number;
}

export interface ForecastConfig {
  defaultModel: 'weighted' | 'probabilistic' | 'ai' | 'historical';
  stageWeights: Record<string, number>;
  confidenceFactors: {
    historicalAccuracy: number;
    dealAge: number;
    repPerformance: number;
  };
  scenarioCount: number;
}

export interface ForecastStats {
  totalForecasts: number;
  avgAccuracy: number;
  forecastsThisPeriod: number;
  accuracyTrend: number;
  scenariosGenerated: number;
}

// ============================================================
// Forecast Agent Implementation
// ============================================================

export class ForecastAgent {
  private forecasts: Map<string, ForecastAnalysis> = new Map();
  private historicalData: HistoricalAccuracy[] = [];
  private config: ForecastConfig;
  private stats: ForecastStats;

  constructor(config?: Partial<ForecastConfig>) {
    this.config = {
      defaultModel: 'weighted',
      stageWeights: {
        discovery: 0.1,
        qualification: 0.3,
        proposal: 0.5,
        negotiation: 0.7,
        closing: 0.9,
      },
      confidenceFactors: {
        historicalAccuracy: 0.4,
        dealAge: 0.3,
        repPerformance: 0.3,
      },
      scenarioCount: 3,
      ...config,
    };

    this.stats = {
      totalForecasts: 0,
      avgAccuracy: 0,
      forecastsThisPeriod: 0,
      accuracyTrend: 0,
      scenariosGenerated: 0,
    };
  }

  /**
   * Generate forecast for a period
   */
  generateForecast(
    period: string,
    deals: Array<{
      id: string;
      value: number;
      stage: string;
      probability: number;
      closeDate: Date;
      repId: string;
    }>,
    historicalActuals?: Array<{ period: string; value: number }>
  ): ForecastAnalysis {
    const model = this.buildForecastModel(deals);
    const scenarios = this.generateScenarios(model, deals);
    const accuracy = this.calculateAccuracy(historicalActuals);
    const recommendations = this.generateRecommendations(model, accuracy, deals);

    const analysis: ForecastAnalysis = {
      id: generateId(),
      timestamp: new Date(),
      period,
      forecast: model,
      scenarios,
      accuracy,
      recommendations,
    };

    this.forecasts.set(analysis.id, analysis);
    this.updateStats(analysis);

    return analysis;
  }

  /**
   * Record actual results for accuracy tracking
   */
  recordActual(period: string, forecasted: number, actual: number): void {
    const variance = actual - forecasted;
    const accuracy = forecasted > 0 ? Math.max(0, 100 - Math.abs(variance / forecasted) * 100) : 0;

    this.historicalData.push({
      period,
      forecasted,
      actual,
      variance,
      accuracy,
    });

    // Keep only last 12 periods
    if (this.historicalData.length > 12) {
      this.historicalData.shift();
    }
  }

  /**
   * Get forecast by ID
   */
  getForecast(id: string): ForecastAnalysis | undefined {
    return this.forecasts.get(id);
  }

  /**
   * Get historical accuracy
   */
  getHistoricalAccuracy(): HistoricalAccuracy[] {
    return [...this.historicalData];
  }

  /**
   * Get statistics
   */
  getStats(): ForecastStats {
    return { ...this.stats };
  }

  // Private methods

  private buildForecastModel(
    deals: Array<{
      id: string;
      value: number;
      stage: string;
      probability: number;
      closeDate: Date;
      repId: string;
    }>
  ): ForecastModel {
    const factors: ForecastFactor[] = [];

    // Calculate weighted pipeline
    let committed = 0;
    let bestCase = 0;
    let baseline = 0;

    for (const deal of deals) {
      const stageWeight = this.config.stageWeights[deal.stage] || 0.5;
      const weightedValue = deal.value * stageWeight * deal.probability;

      baseline += deal.value;
      
      if (stageWeight >= 0.7) {
        committed += deal.value * deal.probability;
      }
      bestCase += deal.value * Math.min(1, deal.probability + 0.2);

      factors.push({
        name: `deal_${deal.id}`,
        weight: stageWeight,
        value: deal.value,
        impact: weightedValue,
        direction: deal.probability > 0.5 ? 'positive' : 'neutral',
      });
    }

    const expected = deals.reduce((sum, d) => {
      const stageWeight = this.config.stageWeights[d.stage] || 0.5;
      return sum + d.value * stageWeight * d.probability;
    }, 0);

    const worstCase = committed * 0.8;

    // Calculate confidence based on deal distribution
    const avgProbability = deals.length > 0
      ? deals.reduce((sum, d) => sum + d.probability, 0) / deals.length
      : 0;
    const confidence = Math.min(0.95, avgProbability + 0.2);

    return {
      id: generateId(),
      name: 'Weighted Pipeline Forecast',
      type: this.config.defaultModel,
      baseline,
      committed,
      bestCase,
      expected: Math.round(expected),
      worstCase,
      confidence,
      factors,
    };
  }

  private generateScenarios(
    model: ForecastModel,
    deals: Array<{ value: number; probability: number }>
  ): ForecastScenario[] {
    return [
      {
        id: generateId(),
        name: 'Conservative',
        description: 'Only committed deals close as expected',
        probability: 0.3,
        value: model.committed,
        assumptions: [
          'Only deals in closing stage convert',
          'Historical conversion rates apply',
          'No new deals added',
        ],
        risks: [
          'Market conditions may deteriorate',
          'Key deals may slip to next period',
        ],
      },
      {
        id: generateId(),
        name: 'Expected',
        description: 'Deals close at weighted probabilities',
        probability: 0.5,
        value: model.expected,
        assumptions: [
          'Deals convert at historical rates',
          'Pipeline remains stable',
          'Rep performance matches history',
        ],
        risks: [
          'Individual deal outcomes may vary',
          'External factors may impact timing',
        ],
      },
      {
        id: generateId(),
        name: 'Optimistic',
        description: 'Better than expected performance across pipeline',
        probability: 0.2,
        value: model.bestCase,
        assumptions: [
          'All deals progress faster than expected',
          'Win rates improve by 20%',
          'New deals enter and close quickly',
        ],
        risks: [
          'Relies on optimal conditions',
          'May not account for competitive pressure',
        ],
      },
    ];
  }

  private calculateAccuracy(
    historicalActuals?: Array<{ period: string; value: number }>
  ): ForecastAccuracy {
    if (historicalActuals) {
      for (const actual of historicalActuals) {
        const existingForecast = this.historicalData.find(h => h.period === actual.period);
        if (existingForecast) {
          existingForecast.actual = actual.value;
          existingForecast.variance = actual.value - existingForecast.forecasted;
          existingForecast.accuracy = existingForecast.forecasted > 0
            ? Math.max(0, 100 - Math.abs(existingForecast.variance / existingForecast.forecasted) * 100)
            : 0;
        }
      }
    }

    const completedPeriods = this.historicalData.filter(h => h.actual > 0);
    const overall = completedPeriods.length > 0
      ? completedPeriods.reduce((sum, h) => sum + h.accuracy, 0) / completedPeriods.length
      : 85; // Default assumption

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (completedPeriods.length >= 3) {
      const recent = completedPeriods.slice(-3);
      const older = completedPeriods.slice(-6, -3);
      if (older.length > 0) {
        const recentAvg = recent.reduce((sum, h) => sum + h.accuracy, 0) / recent.length;
        const olderAvg = older.reduce((sum, h) => sum + h.accuracy, 0) / older.length;
        trend = recentAvg > olderAvg + 5 ? 'improving' : recentAvg < olderAvg - 5 ? 'declining' : 'stable';
      }
    }

    return {
      overall: Math.round(overall),
      byCategory: {},
      byRep: {},
      trend,
      historicalAccuracy: completedPeriods,
    };
  }

  private generateRecommendations(
    model: ForecastModel,
    accuracy: ForecastAccuracy,
    deals: Array<{ value: number; stage: string; probability: number }>
  ): ForecastRecommendation[] {
    const recommendations: ForecastRecommendation[] = [];

    // Low confidence
    if (model.confidence < 0.7) {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'accuracy',
        action: 'improve_deal_data',
        description: 'Improve deal data quality to increase forecast confidence',
        expectedImpact: 15,
      });
    }

    // Low accuracy trend
    if (accuracy.trend === 'declining') {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'accuracy',
        action: 'review_methodology',
        description: 'Review forecasting methodology as accuracy is declining',
        expectedImpact: 20,
      });
    }

    // Large gap between committed and expected
    const gap = model.expected - model.committed;
    if (gap > model.committed * 0.5) {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'risk',
        action: 'accelerate_pipeline',
        description: 'Large gap between committed and expected - accelerate deal progression',
        expectedImpact: gap * 0.3,
      });
    }

    // Coverage concerns
    const earlyStageDeals = deals.filter(d => 
      d.stage === 'discovery' || d.stage === 'qualification'
    );
    const earlyStageValue = earlyStageDeals.reduce((sum, d) => sum + d.value, 0);
    
    if (earlyStageValue < model.expected * 2) {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'coverage',
        action: 'increase_top_of_funnel',
        description: 'Insufficient early stage coverage for future periods',
        expectedImpact: 25,
      });
    }

    // Opportunities in high probability deals
    const highProbDeals = deals.filter(d => d.probability > 0.7);
    if (highProbDeals.length > 0) {
      recommendations.push({
        id: generateId(),
        priority: 3,
        type: 'opportunity',
        action: 'focus_high_probability',
        description: `${highProbDeals.length} high probability deals to prioritize for closing`,
        expectedImpact: highProbDeals.reduce((sum, d) => sum + d.value, 0) * 0.1,
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private updateStats(analysis: ForecastAnalysis): void {
    this.stats.totalForecasts++;
    this.stats.forecastsThisPeriod++;
    this.stats.scenariosGenerated += analysis.scenarios.length;

    // Update average accuracy
    const accuracies = Array.from(this.forecasts.values()).map(f => f.accuracy.overall);
    this.stats.avgAccuracy = accuracies.length > 0
      ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
      : 0;

    // Calculate accuracy trend
    if (this.historicalData.length >= 2) {
      const recent = this.historicalData.slice(-3).map(h => h.accuracy);
      const older = this.historicalData.slice(-6, -3).map(h => h.accuracy);
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        this.stats.accuracyTrend = recentAvg - olderAvg;
      }
    }
  }
}

export default ForecastAgent;
