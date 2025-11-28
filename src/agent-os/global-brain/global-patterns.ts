/**
 * Global Patterns Module
 * Identifies and tracks patterns across the global install base
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Global Patterns Types
// ============================================================

export interface GlobalPattern {
  id: string;
  name: string;
  type: PatternType;
  description: string;
  frequency: number;
  impact: number;
  confidence: number;
  clusters: PatternCluster[];
  trends: PatternTrend[];
  predictions: PatternPrediction[];
  detectedAt: Date;
  lastSeen: Date;
}

export type PatternType = 
  | 'leak_pattern'
  | 'success_pattern'
  | 'risk_pattern'
  | 'behavioral_pattern'
  | 'market_pattern'
  | 'operational_pattern';

export interface PatternCluster {
  id: string;
  name: string;
  characteristics: Record<string, unknown>;
  memberCount: number;
  avgMetrics: Record<string, number>;
  representative: string;
}

export interface PatternTrend {
  period: string;
  frequency: number;
  impact: number;
  direction: 'increasing' | 'stable' | 'decreasing';
}

export interface PatternPrediction {
  id: string;
  prediction: string;
  probability: number;
  timeframe: string;
  confidence: number;
  factors: string[];
}

export interface PatternAnalysis {
  patterns: GlobalPattern[];
  emergingPatterns: GlobalPattern[];
  decliningPatterns: GlobalPattern[];
  recommendations: string[];
}

export interface PatternConfig {
  minOccurrences: number;
  confidenceThreshold: number;
  trendWindow: number;
  predictionHorizon: number;
}

export interface PatternStats {
  totalPatterns: number;
  activePatterns: number;
  emergingPatterns: number;
  avgConfidence: number;
}

// ============================================================
// Global Patterns Implementation
// ============================================================

export class GlobalPatterns {
  private patterns: Map<string, GlobalPattern> = new Map();
  private observations: Array<{ patternType: string; data: Record<string, unknown>; timestamp: Date }> = [];
  private config: PatternConfig;
  private stats: PatternStats;

  constructor(config?: Partial<PatternConfig>) {
    this.config = {
      minOccurrences: 5,
      confidenceThreshold: 0.7,
      trendWindow: 30,
      predictionHorizon: 90,
      ...config,
    };

    this.stats = {
      totalPatterns: 0,
      activePatterns: 0,
      emergingPatterns: 0,
      avgConfidence: 0,
    };

    // Initialize with common patterns
    this.initializeCommonPatterns();
  }

  /**
   * Record a pattern observation
   */
  recordObservation(
    patternType: PatternType,
    data: Record<string, unknown>
  ): void {
    this.observations.push({
      patternType,
      data,
      timestamp: new Date(),
    });

    // Analyze for new patterns
    this.analyzeObservations();
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): GlobalPattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Get patterns by type
   */
  getPatternsByType(type: PatternType): GlobalPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.type === type);
  }

  /**
   * Get top patterns
   */
  getTopPatterns(limit: number = 10): GlobalPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => (b.frequency * b.impact) - (a.frequency * a.impact))
      .slice(0, limit);
  }

  /**
   * Analyze patterns
   */
  analyzePatterns(): PatternAnalysis {
    const allPatterns = Array.from(this.patterns.values());
    
    // Identify emerging patterns (increasing trend)
    const emergingPatterns = allPatterns.filter(p => {
      const recentTrend = p.trends[p.trends.length - 1];
      return recentTrend?.direction === 'increasing';
    });

    // Identify declining patterns
    const decliningPatterns = allPatterns.filter(p => {
      const recentTrend = p.trends[p.trends.length - 1];
      return recentTrend?.direction === 'decreasing';
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(allPatterns, emergingPatterns);

    return {
      patterns: allPatterns,
      emergingPatterns,
      decliningPatterns,
      recommendations,
    };
  }

  /**
   * Predict pattern behavior
   */
  predictPattern(patternId: string): PatternPrediction | undefined {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return undefined;

    // Analyze trends to make prediction
    const trends = pattern.trends;
    if (trends.length < 2) return undefined;

    const recentTrends = trends.slice(-3);
    const avgChange = recentTrends.reduce((sum, t, i, arr) => {
      if (i === 0) return sum;
      return sum + (t.frequency - arr[i - 1].frequency);
    }, 0) / (recentTrends.length - 1);

    const direction = avgChange > 0.1 ? 'increase' : avgChange < -0.1 ? 'decrease' : 'stable';
    const probability = Math.min(0.9, 0.5 + Math.abs(avgChange));

    const prediction: PatternPrediction = {
      id: generateId(),
      prediction: `Pattern expected to ${direction} over next ${this.config.predictionHorizon} days`,
      probability,
      timeframe: `${this.config.predictionHorizon} days`,
      confidence: pattern.confidence * probability,
      factors: this.identifyPredictionFactors(pattern, recentTrends),
    };

    pattern.predictions.push(prediction);
    return prediction;
  }

  /**
   * Cluster patterns
   */
  clusterPatterns(): Map<string, GlobalPattern[]> {
    const clusters = new Map<string, GlobalPattern[]>();

    for (const pattern of this.patterns.values()) {
      const clusterKey = this.determineCluster(pattern);
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, []);
      }
      clusters.get(clusterKey)!.push(pattern);
    }

    return clusters;
  }

  /**
   * Get statistics
   */
  getStats(): PatternStats {
    return { ...this.stats };
  }

  // Private methods

  private initializeCommonPatterns(): void {
    const commonPatterns: Array<{
      name: string;
      type: PatternType;
      description: string;
    }> = [
      {
        name: 'Stale Deal Accumulation',
        type: 'leak_pattern',
        description: 'Deals remain in pipeline without activity for extended periods',
      },
      {
        name: 'Underbilling Pattern',
        type: 'leak_pattern',
        description: 'Consistent gap between contract value and billed amount',
      },
      {
        name: 'High Velocity Wins',
        type: 'success_pattern',
        description: 'Deals closing significantly faster than average',
      },
      {
        name: 'Churn Indicators',
        type: 'risk_pattern',
        description: 'Early warning signs of customer churn',
      },
      {
        name: 'Expansion Success',
        type: 'success_pattern',
        description: 'Successful upsell and expansion patterns',
      },
      {
        name: 'Data Decay',
        type: 'operational_pattern',
        description: 'Gradual degradation of data quality over time',
      },
      {
        name: 'Seasonal Fluctuation',
        type: 'market_pattern',
        description: 'Predictable seasonal variations in metrics',
      },
      {
        name: 'Rep Performance Variance',
        type: 'behavioral_pattern',
        description: 'Significant performance differences between team members',
      },
    ];

    for (const patternDef of commonPatterns) {
      const pattern: GlobalPattern = {
        id: generateId(),
        name: patternDef.name,
        type: patternDef.type,
        description: patternDef.description,
        frequency: 0.3 + Math.random() * 0.5,
        impact: 0.2 + Math.random() * 0.6,
        confidence: 0.8,
        clusters: [],
        trends: this.generateInitialTrends(),
        predictions: [],
        detectedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(),
      };

      this.patterns.set(pattern.id, pattern);
    }

    this.updateStats();
  }

  private generateInitialTrends(): PatternTrend[] {
    const trends: PatternTrend[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const period = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);
      const periodStr = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`;
      
      trends.push({
        period: periodStr,
        frequency: 0.2 + Math.random() * 0.4,
        impact: 0.1 + Math.random() * 0.3,
        direction: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)] as PatternTrend['direction'],
      });
    }

    return trends;
  }

  private analyzeObservations(): void {
    // Group recent observations by pattern type
    const recentCutoff = Date.now() - this.config.trendWindow * 24 * 60 * 60 * 1000;
    const recentObs = this.observations.filter(o => o.timestamp.getTime() > recentCutoff);

    const typeGroups = new Map<string, typeof recentObs>();
    for (const obs of recentObs) {
      if (!typeGroups.has(obs.patternType)) {
        typeGroups.set(obs.patternType, []);
      }
      typeGroups.get(obs.patternType)!.push(obs);
    }

    // Update existing patterns or create new ones
    for (const [type, observations] of typeGroups) {
      if (observations.length >= this.config.minOccurrences) {
        this.updateOrCreatePattern(type as PatternType, observations);
      }
    }

    this.updateStats();
  }

  private updateOrCreatePattern(
    type: PatternType,
    observations: Array<{ data: Record<string, unknown>; timestamp: Date }>
  ): void {
    // Find existing pattern or create new
    let pattern = Array.from(this.patterns.values())
      .find(p => p.type === type && this.matchesExisting(p, observations));

    if (pattern) {
      // Update existing
      pattern.frequency = Math.min(1, pattern.frequency + observations.length * 0.01);
      pattern.lastSeen = new Date();
      
      // Add trend point
      this.addTrendPoint(pattern);
    } else {
      // Create new pattern
      pattern = {
        id: generateId(),
        name: `New ${type} Pattern`,
        type,
        description: `Automatically detected ${type} pattern`,
        frequency: observations.length * 0.05,
        impact: 0.5,
        confidence: 0.6,
        clusters: [],
        trends: [],
        predictions: [],
        detectedAt: new Date(),
        lastSeen: new Date(),
      };

      this.patterns.set(pattern.id, pattern);
    }
  }

  private matchesExisting(
    pattern: GlobalPattern,
    observations: Array<{ data: Record<string, unknown> }>
  ): boolean {
    // Simple matching - in production, use more sophisticated clustering
    return pattern.type === observations[0]?.data?.type;
  }

  private addTrendPoint(pattern: GlobalPattern): void {
    const now = new Date();
    const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const existingTrend = pattern.trends.find(t => t.period === periodStr);
    
    if (existingTrend) {
      existingTrend.frequency = pattern.frequency;
      existingTrend.impact = pattern.impact;
    } else {
      const prevTrend = pattern.trends[pattern.trends.length - 1];
      const direction: PatternTrend['direction'] = 
        pattern.frequency > (prevTrend?.frequency || 0) + 0.1 ? 'increasing' :
        pattern.frequency < (prevTrend?.frequency || 0) - 0.1 ? 'decreasing' : 'stable';

      pattern.trends.push({
        period: periodStr,
        frequency: pattern.frequency,
        impact: pattern.impact,
        direction,
      });

      // Keep only recent trends
      if (pattern.trends.length > 12) {
        pattern.trends = pattern.trends.slice(-12);
      }
    }
  }

  private generateRecommendations(
    allPatterns: GlobalPattern[],
    emergingPatterns: GlobalPattern[]
  ): string[] {
    const recommendations: string[] = [];

    // High impact patterns
    const highImpact = allPatterns.filter(p => p.impact > 0.7);
    if (highImpact.length > 0) {
      recommendations.push(`Address ${highImpact.length} high-impact patterns affecting operations`);
    }

    // Emerging patterns
    if (emergingPatterns.length > 0) {
      recommendations.push(`Monitor ${emergingPatterns.length} emerging patterns closely`);
      for (const pattern of emergingPatterns.slice(0, 3)) {
        recommendations.push(`Prepare response strategy for: ${pattern.name}`);
      }
    }

    // Leak patterns
    const leakPatterns = allPatterns.filter(p => p.type === 'leak_pattern');
    if (leakPatterns.length > 0) {
      const totalImpact = leakPatterns.reduce((sum, p) => sum + p.impact, 0);
      recommendations.push(`${leakPatterns.length} leak patterns detected - implement safeguards`);
    }

    // Success patterns
    const successPatterns = allPatterns.filter(p => p.type === 'success_pattern');
    if (successPatterns.length > 0) {
      recommendations.push(`Replicate ${successPatterns.length} success patterns across organization`);
    }

    return recommendations;
  }

  private identifyPredictionFactors(
    pattern: GlobalPattern,
    recentTrends: PatternTrend[]
  ): string[] {
    const factors: string[] = [];

    // Trend direction
    const directions = recentTrends.map(t => t.direction);
    const mostCommon = this.mode(directions);
    factors.push(`Trend direction: ${mostCommon}`);

    // Frequency stability
    const frequencies = recentTrends.map(t => t.frequency);
    const variance = this.calculateVariance(frequencies);
    if (variance < 0.1) {
      factors.push('Stable frequency pattern');
    } else {
      factors.push('Variable frequency pattern');
    }

    // Historical confidence
    if (pattern.confidence > 0.8) {
      factors.push('High historical confidence');
    }

    return factors;
  }

  private determineCluster(pattern: GlobalPattern): string {
    // Simple clustering by type and impact level
    const impactLevel = pattern.impact > 0.7 ? 'high' : pattern.impact > 0.4 ? 'medium' : 'low';
    return `${pattern.type}-${impactLevel}`;
  }

  private mode<T>(arr: T[]): T {
    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    let maxCount = 0;
    let mode = arr[0];
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mode = item;
      }
    }
    return mode;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private updateStats(): void {
    const allPatterns = Array.from(this.patterns.values());
    
    this.stats.totalPatterns = allPatterns.length;
    this.stats.activePatterns = allPatterns.filter(p => 
      p.lastSeen.getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
    ).length;
    
    this.stats.emergingPatterns = allPatterns.filter(p => {
      const lastTrend = p.trends[p.trends.length - 1];
      return lastTrend?.direction === 'increasing';
    }).length;

    const confidences = allPatterns.map(p => p.confidence);
    this.stats.avgConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;
  }
}

export default GlobalPatterns;
