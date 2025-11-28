/**
 * Prediction Model Module
 * Predicts human behaviors and outcomes using behavioral data
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Prediction Model Types
// ============================================================

export interface Prediction {
  id: string;
  type: PredictionType;
  subject: string;
  subjectId: string;
  prediction: string;
  probability: number;
  confidence: number;
  factors: PredictionFactor[];
  timing: PredictionTiming;
  createdAt: Date;
  validUntil: Date;
}

export type PredictionType = 
  | 'deal_outcome'
  | 'task_completion'
  | 'response_time'
  | 'activity_level'
  | 'churn_risk'
  | 'quota_attainment'
  | 'follow_up_likelihood';

export interface PredictionInput {
  type: PredictionType;
  subjectId: string;
  historicalData: Record<string, unknown>[];
  contextData?: Record<string, unknown>;
}

export interface PredictionFactor {
  name: string;
  value: number;
  weight: number;
  direction: 'positive' | 'negative';
  explanation: string;
}

export interface PredictionTiming {
  expectedDate?: Date;
  confidence: number;
  range: {
    earliest: Date;
    latest: Date;
  };
}

export interface ModelPerformance {
  modelType: PredictionType;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  sampleSize: number;
  lastEvaluated: Date;
}

export interface PredictionConfig {
  minHistoricalData: number;
  confidenceThreshold: number;
  predictionWindow: number;
  modelWeights: Record<string, number>;
}

export interface PredictionStats {
  totalPredictions: number;
  avgAccuracy: number;
  correctPredictions: number;
  pendingVerification: number;
}

// ============================================================
// Prediction Model Implementation
// ============================================================

export class PredictionModel {
  private predictions: Map<string, Prediction> = new Map();
  private performance: Map<PredictionType, ModelPerformance> = new Map();
  private config: PredictionConfig;
  private stats: PredictionStats;

  constructor(config?: Partial<PredictionConfig>) {
    this.config = {
      minHistoricalData: 10,
      confidenceThreshold: 0.6,
      predictionWindow: 30,
      modelWeights: {
        historical_pattern: 0.4,
        recent_trend: 0.3,
        context: 0.2,
        baseline: 0.1,
      },
      ...config,
    };

    this.stats = {
      totalPredictions: 0,
      avgAccuracy: 0,
      correctPredictions: 0,
      pendingVerification: 0,
    };

    // Initialize model performance tracking
    const predictionTypes: PredictionType[] = [
      'deal_outcome',
      'task_completion',
      'response_time',
      'activity_level',
      'churn_risk',
      'quota_attainment',
      'follow_up_likelihood',
    ];

    for (const type of predictionTypes) {
      this.performance.set(type, {
        modelType: type,
        accuracy: 0.75, // Default baseline
        precision: 0.7,
        recall: 0.7,
        f1Score: 0.7,
        sampleSize: 0,
        lastEvaluated: new Date(),
      });
    }
  }

  /**
   * Make a prediction
   */
  predict(input: PredictionInput): Prediction {
    if (input.historicalData.length < this.config.minHistoricalData) {
      throw new Error(`Insufficient historical data. Need at least ${this.config.minHistoricalData} records.`);
    }

    const factors = this.calculateFactors(input);
    const probability = this.calculateProbability(factors);
    const confidence = this.calculateConfidence(factors, input.historicalData.length);
    const timing = this.predictTiming(input);
    const predictionText = this.generatePredictionText(input.type, probability);

    const prediction: Prediction = {
      id: generateId(),
      type: input.type,
      subject: this.getSubjectName(input.type),
      subjectId: input.subjectId,
      prediction: predictionText,
      probability,
      confidence,
      factors,
      timing,
      createdAt: new Date(),
      validUntil: new Date(Date.now() + this.config.predictionWindow * 24 * 60 * 60 * 1000),
    };

    this.predictions.set(prediction.id, prediction);
    this.stats.totalPredictions++;
    this.stats.pendingVerification++;

    return prediction;
  }

  /**
   * Verify a prediction outcome
   */
  verifyPrediction(predictionId: string, actualOutcome: boolean): void {
    const prediction = this.predictions.get(predictionId);
    if (!prediction) return;

    const predicted = prediction.probability >= 0.5;
    const correct = predicted === actualOutcome;

    if (correct) {
      this.stats.correctPredictions++;
    }
    this.stats.pendingVerification--;

    // Update model performance
    const perf = this.performance.get(prediction.type);
    if (perf) {
      perf.sampleSize++;
      perf.accuracy = (perf.accuracy * (perf.sampleSize - 1) + (correct ? 1 : 0)) / perf.sampleSize;
      perf.lastEvaluated = new Date();
    }

    // Update overall accuracy
    if (this.stats.totalPredictions > 0) {
      this.stats.avgAccuracy = this.stats.correctPredictions / 
        (this.stats.totalPredictions - this.stats.pendingVerification);
    }
  }

  /**
   * Get prediction by ID
   */
  getPrediction(id: string): Prediction | undefined {
    return this.predictions.get(id);
  }

  /**
   * Get predictions for a subject
   */
  getPredictionsForSubject(subjectId: string): Prediction[] {
    return Array.from(this.predictions.values())
      .filter(p => p.subjectId === subjectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get model performance
   */
  getModelPerformance(type?: PredictionType): ModelPerformance | ModelPerformance[] {
    if (type) {
      return this.performance.get(type)!;
    }
    return Array.from(this.performance.values());
  }

  /**
   * Get statistics
   */
  getStats(): PredictionStats {
    return { ...this.stats };
  }

  /**
   * Predict deal outcome
   */
  predictDealOutcome(
    dealId: string,
    historicalDeals: Array<{
      won: boolean;
      amount: number;
      cycleTime: number;
      stage: string;
      activities: number;
    }>,
    currentDeal: {
      amount: number;
      daysInPipeline: number;
      stage: string;
      activities: number;
    }
  ): Prediction {
    return this.predict({
      type: 'deal_outcome',
      subjectId: dealId,
      historicalData: historicalDeals.map(d => ({ ...d })),
      contextData: currentDeal,
    });
  }

  /**
   * Predict quota attainment
   */
  predictQuotaAttainment(
    userId: string,
    historicalQuotas: Array<{
      period: string;
      quota: number;
      achieved: number;
      attainment: number;
    }>,
    currentPipeline: number,
    currentQuota: number
  ): Prediction {
    return this.predict({
      type: 'quota_attainment',
      subjectId: userId,
      historicalData: historicalQuotas.map(q => ({ ...q })),
      contextData: { pipeline: currentPipeline, quota: currentQuota },
    });
  }

  // Private methods

  private calculateFactors(input: PredictionInput): PredictionFactor[] {
    const factors: PredictionFactor[] = [];

    switch (input.type) {
      case 'deal_outcome':
        factors.push(...this.calculateDealFactors(input));
        break;
      case 'quota_attainment':
        factors.push(...this.calculateQuotaFactors(input));
        break;
      case 'task_completion':
        factors.push(...this.calculateTaskFactors(input));
        break;
      case 'activity_level':
        factors.push(...this.calculateActivityFactors(input));
        break;
      default:
        factors.push(...this.calculateGenericFactors(input));
    }

    return factors;
  }

  private calculateDealFactors(input: PredictionInput): PredictionFactor[] {
    const factors: PredictionFactor[] = [];
    const historical = input.historicalData as Array<{
      won: boolean;
      amount: number;
      cycleTime: number;
      activities: number;
    }>;
    const context = input.contextData as {
      amount: number;
      daysInPipeline: number;
      activities: number;
    };

    // Win rate factor
    const wins = historical.filter(d => d.won).length;
    const winRate = historical.length > 0 ? wins / historical.length : 0.5;
    factors.push({
      name: 'historical_win_rate',
      value: winRate,
      weight: 0.3,
      direction: winRate >= 0.5 ? 'positive' : 'negative',
      explanation: `Historical win rate: ${(winRate * 100).toFixed(0)}%`,
    });

    // Deal size factor
    const avgDealSize = historical.reduce((sum, d) => sum + d.amount, 0) / historical.length;
    const sizeDiff = context.amount / avgDealSize;
    const sizeScore = sizeDiff > 2 ? 0.3 : sizeDiff > 1.5 ? 0.5 : sizeDiff > 0.5 ? 0.7 : 0.8;
    factors.push({
      name: 'deal_size',
      value: sizeScore,
      weight: 0.2,
      direction: sizeScore >= 0.6 ? 'positive' : 'negative',
      explanation: context.amount > avgDealSize 
        ? 'Deal larger than average - may take longer' 
        : 'Deal size within normal range',
    });

    // Activity factor
    const avgActivities = historical.reduce((sum, d) => sum + d.activities, 0) / historical.length;
    const activityScore = Math.min(1, context.activities / avgActivities);
    factors.push({
      name: 'activity_level',
      value: activityScore,
      weight: 0.25,
      direction: activityScore >= 0.7 ? 'positive' : 'negative',
      explanation: activityScore >= 0.7 
        ? 'Good activity level on this deal'
        : 'Activity level below average',
    });

    // Cycle time factor
    const avgCycle = historical.reduce((sum, d) => sum + d.cycleTime, 0) / historical.length;
    const cycleScore = context.daysInPipeline <= avgCycle ? 0.7 : 0.4;
    factors.push({
      name: 'cycle_time',
      value: cycleScore,
      weight: 0.25,
      direction: cycleScore >= 0.5 ? 'positive' : 'negative',
      explanation: context.daysInPipeline <= avgCycle
        ? 'Deal progressing at normal pace'
        : 'Deal taking longer than average',
    });

    return factors;
  }

  private calculateQuotaFactors(input: PredictionInput): PredictionFactor[] {
    const factors: PredictionFactor[] = [];
    const historical = input.historicalData as Array<{
      attainment: number;
    }>;
    const context = input.contextData as {
      pipeline: number;
      quota: number;
    };

    // Historical attainment
    const avgAttainment = historical.reduce((sum, q) => sum + q.attainment, 0) / historical.length;
    factors.push({
      name: 'historical_attainment',
      value: avgAttainment,
      weight: 0.4,
      direction: avgAttainment >= 1 ? 'positive' : 'negative',
      explanation: `Average attainment: ${(avgAttainment * 100).toFixed(0)}%`,
    });

    // Pipeline coverage
    const coverage = context.pipeline / context.quota;
    factors.push({
      name: 'pipeline_coverage',
      value: Math.min(1, coverage / 3), // 3x is ideal
      weight: 0.35,
      direction: coverage >= 3 ? 'positive' : coverage >= 2 ? 'positive' : 'negative',
      explanation: `Pipeline coverage: ${(coverage * 100).toFixed(0)}%`,
    });

    // Consistency
    const attainments = historical.map(q => q.attainment);
    const variance = this.calculateVariance(attainments);
    const consistencyScore = Math.max(0, 1 - variance);
    factors.push({
      name: 'consistency',
      value: consistencyScore,
      weight: 0.25,
      direction: consistencyScore >= 0.6 ? 'positive' : 'negative',
      explanation: consistencyScore >= 0.6
        ? 'Consistent performance history'
        : 'Variable performance history',
    });

    return factors;
  }

  private calculateTaskFactors(input: PredictionInput): PredictionFactor[] {
    const factors: PredictionFactor[] = [];
    const historical = input.historicalData as Array<{
      completed: boolean;
      onTime: boolean;
    }>;

    const completionRate = historical.filter(t => t.completed).length / historical.length;
    const onTimeRate = historical.filter(t => t.onTime).length / historical.length;

    factors.push({
      name: 'completion_rate',
      value: completionRate,
      weight: 0.5,
      direction: completionRate >= 0.8 ? 'positive' : 'negative',
      explanation: `Task completion rate: ${(completionRate * 100).toFixed(0)}%`,
    });

    factors.push({
      name: 'on_time_rate',
      value: onTimeRate,
      weight: 0.5,
      direction: onTimeRate >= 0.7 ? 'positive' : 'negative',
      explanation: `On-time rate: ${(onTimeRate * 100).toFixed(0)}%`,
    });

    return factors;
  }

  private calculateActivityFactors(input: PredictionInput): PredictionFactor[] {
    const factors: PredictionFactor[] = [];
    const historical = input.historicalData as Array<{
      date: Date;
      count: number;
    }>;

    const avgActivity = historical.reduce((sum, d) => sum + d.count, 0) / historical.length;
    const recentActivity = historical.slice(-7).reduce((sum, d) => sum + d.count, 0) / 7;

    factors.push({
      name: 'average_activity',
      value: Math.min(1, avgActivity / 50),
      weight: 0.4,
      direction: avgActivity >= 30 ? 'positive' : 'negative',
      explanation: `Average daily activities: ${avgActivity.toFixed(0)}`,
    });

    const trend = recentActivity / avgActivity;
    factors.push({
      name: 'recent_trend',
      value: Math.min(1, trend),
      weight: 0.6,
      direction: trend >= 0.9 ? 'positive' : 'negative',
      explanation: trend >= 0.9
        ? 'Activity level stable or increasing'
        : 'Activity level declining',
    });

    return factors;
  }

  private calculateGenericFactors(input: PredictionInput): PredictionFactor[] {
    // Generic factor calculation for other prediction types
    return [{
      name: 'baseline',
      value: 0.5,
      weight: 1.0,
      direction: 'positive',
      explanation: 'Using baseline prediction',
    }];
  }

  private calculateProbability(factors: PredictionFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      weightedSum += factor.value * factor.weight;
      totalWeight += factor.weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  private calculateConfidence(factors: PredictionFactor[], dataPoints: number): number {
    // Base confidence from data volume
    let confidence = Math.min(0.9, 0.5 + (dataPoints / 100));

    // Adjust based on factor agreement
    const positiveFactors = factors.filter(f => f.direction === 'positive');
    const agreement = positiveFactors.length / factors.length;
    
    if (agreement > 0.8 || agreement < 0.2) {
      confidence *= 1.1; // High agreement increases confidence
    } else if (agreement > 0.4 && agreement < 0.6) {
      confidence *= 0.9; // Mixed signals decrease confidence
    }

    return Math.min(0.95, Math.max(0.3, confidence));
  }

  private predictTiming(input: PredictionInput): PredictionTiming {
    const now = new Date();
    const avgDays = this.config.predictionWindow;

    return {
      expectedDate: new Date(now.getTime() + avgDays * 24 * 60 * 60 * 1000),
      confidence: 0.7,
      range: {
        earliest: new Date(now.getTime() + (avgDays * 0.5) * 24 * 60 * 60 * 1000),
        latest: new Date(now.getTime() + (avgDays * 1.5) * 24 * 60 * 60 * 1000),
      },
    };
  }

  private generatePredictionText(type: PredictionType, probability: number): string {
    const outcome = probability >= 0.5 ? 'likely' : 'unlikely';
    const confidence = probability >= 0.7 || probability <= 0.3 ? 'high' : 'moderate';

    const templates: Record<PredictionType, string> = {
      deal_outcome: `Deal is ${outcome} to close (${confidence} confidence)`,
      task_completion: `Task is ${outcome} to be completed on time`,
      response_time: `Response is ${outcome} to be within SLA`,
      activity_level: `Activity level is ${outcome} to meet targets`,
      churn_risk: `Customer is ${outcome} to churn`,
      quota_attainment: `Quota is ${outcome} to be achieved`,
      follow_up_likelihood: `Follow-up is ${outcome} to occur`,
    };

    return templates[type];
  }

  private getSubjectName(type: PredictionType): string {
    const names: Record<PredictionType, string> = {
      deal_outcome: 'Deal',
      task_completion: 'Task',
      response_time: 'Response',
      activity_level: 'Activity',
      churn_risk: 'Customer',
      quota_attainment: 'Quota',
      follow_up_likelihood: 'Follow-up',
    };
    return names[type];
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }
}

export default PredictionModel;
