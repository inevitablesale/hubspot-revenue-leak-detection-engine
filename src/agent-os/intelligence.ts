/**
 * Intelligence Module
 * AI-powered analysis, learning, and pattern recognition
 */

import { RevenueLeak, LeakType, LeakSeverity } from '../types';
import { generateId } from '../utils/helpers';
import {
  IntelligenceInsight,
  Evidence,
  ImpactAssessment,
  LearningFeedback,
  LearnedPattern,
  PatternCondition,
  PatternOutcome,
  IntelligenceConfig,
} from './types';

export interface PatternMatch {
  patternId: string;
  confidence: number;
  matchedConditions: string[];
  predictedOutcome: PatternOutcome;
}

export interface AnomalyDetection {
  entityId: string;
  entityType: string;
  anomalyType: string;
  severity: number;
  expectedValue: number;
  actualValue: number;
  standardDeviations: number;
}

export interface PredictionResult {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeframe: number;
  confidence: number;
  factors: string[];
}

export class IntelligenceEngine {
  private patterns: Map<string, LearnedPattern> = new Map();
  private insights: Map<string, IntelligenceInsight> = new Map();
  private feedback: Map<string, LearningFeedback[]> = new Map();
  private config: IntelligenceConfig;

  constructor(config?: Partial<IntelligenceConfig>) {
    this.config = {
      enabled: true,
      learningRate: 0.1,
      minConfidenceThreshold: 0.6,
      patternDetectionEnabled: true,
      anomalyDetectionEnabled: true,
      ...config,
    };
    this.initializeDefaultPatterns();
  }

  /**
   * Initialize default learned patterns
   */
  private initializeDefaultPatterns(): void {
    // Seasonal renewal pattern
    this.patterns.set('seasonal-renewal-risk', {
      id: 'seasonal-renewal-risk',
      name: 'Seasonal Renewal Risk',
      description: 'Higher renewal risk during Q4 due to budget cycles',
      patternType: 'temporal',
      conditions: [
        { field: 'renewal_month', operator: 'in', value: [10, 11, 12], weight: 0.8 },
        { field: 'engagement_score', operator: 'less_than', value: 50, weight: 0.6 },
      ],
      outcomes: [
        { outcome: 'churn', probability: 0.35, averageTimeToOutcome: 45 },
        { outcome: 'downgrade', probability: 0.25, averageTimeToOutcome: 30 },
      ],
      confidence: 0.75,
      occurrences: 1000,
      lastSeen: new Date(),
      createdAt: new Date(),
    });

    // Cascade billing pattern
    this.patterns.set('billing-cascade', {
      id: 'billing-cascade',
      name: 'Billing Issue Cascade',
      description: 'Billing gaps often precede customer support escalations',
      patternType: 'causal',
      conditions: [
        { field: 'billing_gap_days', operator: 'greater_than', value: 30, weight: 0.9 },
        { field: 'invoice_count', operator: 'greater_than', value: 2, weight: 0.5 },
      ],
      outcomes: [
        { outcome: 'support_escalation', probability: 0.55, averageTimeToOutcome: 14 },
        { outcome: 'payment_delay', probability: 0.40, averageTimeToOutcome: 7 },
      ],
      confidence: 0.82,
      occurrences: 500,
      lastSeen: new Date(),
      createdAt: new Date(),
    });

    // Cross-sell timing pattern
    this.patterns.set('crosssell-timing', {
      id: 'crosssell-timing',
      name: 'Optimal Cross-sell Timing',
      description: 'Best cross-sell success 60-90 days after initial purchase',
      patternType: 'temporal',
      conditions: [
        { field: 'days_since_purchase', operator: 'between', value: [60, 90], weight: 0.85 },
        { field: 'product_usage_score', operator: 'greater_than', value: 70, weight: 0.7 },
      ],
      outcomes: [
        { outcome: 'crosssell_success', probability: 0.45, averageTimeToOutcome: 21 },
      ],
      confidence: 0.78,
      occurrences: 800,
      lastSeen: new Date(),
      createdAt: new Date(),
    });

    // CS handoff escalation pattern
    this.patterns.set('handoff-escalation', {
      id: 'handoff-escalation',
      name: 'Handoff Escalation Risk',
      description: 'Delayed CS handoffs lead to early churn indicators',
      patternType: 'behavioral',
      conditions: [
        { field: 'handoff_delay_days', operator: 'greater_than', value: 7, weight: 0.9 },
        { field: 'onboarding_started', operator: 'equals', value: false, weight: 0.8 },
      ],
      outcomes: [
        { outcome: 'early_churn_signal', probability: 0.42, averageTimeToOutcome: 60 },
        { outcome: 'satisfaction_decline', probability: 0.58, averageTimeToOutcome: 30 },
      ],
      confidence: 0.80,
      occurrences: 350,
      lastSeen: new Date(),
      createdAt: new Date(),
    });
  }

  /**
   * Analyze leaks and generate insights
   */
  analyzeLeaks(leaks: RevenueLeak[]): IntelligenceInsight[] {
    const insights: IntelligenceInsight[] = [];

    if (!this.config.enabled) return insights;

    // Pattern-based insights
    if (this.config.patternDetectionEnabled) {
      const patternInsights = this.detectPatterns(leaks);
      insights.push(...patternInsights);
    }

    // Anomaly-based insights
    if (this.config.anomalyDetectionEnabled) {
      const anomalyInsights = this.detectAnomalies(leaks);
      insights.push(...anomalyInsights);
    }

    // Correlation insights
    const correlationInsights = this.findCorrelations(leaks);
    insights.push(...correlationInsights);

    // Prediction insights
    const predictionInsights = this.generatePredictions(leaks);
    insights.push(...predictionInsights);

    // Store insights
    for (const insight of insights) {
      this.insights.set(insight.id, insight);
    }

    return insights;
  }

  /**
   * Detect patterns in leak data
   */
  private detectPatterns(leaks: RevenueLeak[]): IntelligenceInsight[] {
    const insights: IntelligenceInsight[] = [];

    // Group leaks by type
    const leaksByType = this.groupBy(leaks, 'type');

    for (const [type, typeLeaks] of Object.entries(leaksByType)) {
      // Check for concentration patterns
      if (typeLeaks.length >= 3) {
        const revenueSum = typeLeaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
        const avgRevenue = revenueSum / typeLeaks.length;

        if (avgRevenue > 10000) {
          insights.push({
            id: generateId(),
            type: 'pattern',
            confidence: 0.75 + (Math.min(typeLeaks.length, 10) * 0.02),
            title: `High-Value ${this.formatLeakType(type)} Concentration`,
            description: `Detected ${typeLeaks.length} ${type} leaks with average value of $${avgRevenue.toFixed(0)}. This pattern suggests systematic issues.`,
            evidence: [
              { source: 'leak_analysis', dataPoint: 'count', value: typeLeaks.length, weight: 0.4 },
              { source: 'leak_analysis', dataPoint: 'avg_revenue', value: avgRevenue, weight: 0.6 },
            ],
            impact: {
              revenueImpact: revenueSum,
              probabilityOfOccurrence: 0.85,
              timeToImpact: 30,
              affectedEntities: typeLeaks.length,
            },
            generatedAt: new Date(),
          });
        }
      }
    }

    // Check for temporal patterns
    const recentLeaks = leaks.filter(l => {
      const daysSinceDetection = (Date.now() - l.detectedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceDetection <= 7;
    });

    if (recentLeaks.length > leaks.length * 0.5 && leaks.length >= 5) {
      insights.push({
        id: generateId(),
        type: 'pattern',
        confidence: 0.82,
        title: 'Recent Leak Surge Detected',
        description: `${recentLeaks.length} of ${leaks.length} leaks (${((recentLeaks.length / leaks.length) * 100).toFixed(0)}%) were detected in the last 7 days. This indicates a potential emerging issue.`,
        evidence: [
          { source: 'temporal_analysis', dataPoint: 'recent_ratio', value: recentLeaks.length / leaks.length, weight: 0.8 },
        ],
        impact: {
          revenueImpact: recentLeaks.reduce((sum, l) => sum + l.potentialRevenue, 0),
          probabilityOfOccurrence: 0.9,
          timeToImpact: 14,
          affectedEntities: recentLeaks.length,
        },
        generatedAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Detect anomalies in leak data
   */
  private detectAnomalies(leaks: RevenueLeak[]): IntelligenceInsight[] {
    const insights: IntelligenceInsight[] = [];

    if (leaks.length < 5) return insights;

    // Calculate statistics for anomaly detection
    const revenues = leaks.map(l => l.potentialRevenue);
    const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const variance = revenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / revenues.length;
    const stdDev = Math.sqrt(variance);

    // Detect high-value outliers
    const outliers = leaks.filter(l => l.potentialRevenue > mean + 2 * stdDev);

    if (outliers.length > 0) {
      insights.push({
        id: generateId(),
        type: 'anomaly',
        confidence: 0.88,
        title: 'High-Value Leak Outliers Detected',
        description: `Found ${outliers.length} leak(s) with revenue significantly above average ($${mean.toFixed(0)} ± ${stdDev.toFixed(0)}). These require immediate attention.`,
        evidence: outliers.map(o => ({
          source: 'statistical_analysis',
          dataPoint: 'potential_revenue',
          value: o.potentialRevenue,
          weight: 0.9,
        })),
        impact: {
          revenueImpact: outliers.reduce((sum, l) => sum + l.potentialRevenue, 0),
          probabilityOfOccurrence: 0.95,
          timeToImpact: 7,
          affectedEntities: outliers.length,
        },
        generatedAt: new Date(),
      });
    }

    // Detect severity distribution anomalies
    const criticalCount = leaks.filter(l => l.severity === 'critical').length;
    const criticalRatio = criticalCount / leaks.length;

    if (criticalRatio > 0.3 && leaks.length >= 5) {
      insights.push({
        id: generateId(),
        type: 'anomaly',
        confidence: 0.85,
        title: 'Elevated Critical Leak Ratio',
        description: `${(criticalRatio * 100).toFixed(0)}% of leaks are critical severity, which is above the expected 15-20%. This suggests systemic issues requiring investigation.`,
        evidence: [
          { source: 'severity_analysis', dataPoint: 'critical_ratio', value: criticalRatio, weight: 0.9 },
        ],
        impact: {
          revenueImpact: leaks.filter(l => l.severity === 'critical').reduce((sum, l) => sum + l.potentialRevenue, 0),
          probabilityOfOccurrence: 0.9,
          timeToImpact: 14,
          affectedEntities: criticalCount,
        },
        generatedAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Find correlations between leaks
   */
  private findCorrelations(leaks: RevenueLeak[]): IntelligenceInsight[] {
    const insights: IntelligenceInsight[] = [];

    if (leaks.length < 3) return insights;

    // Check for entity-based correlations
    const entitiesByCompany = new Map<string, RevenueLeak[]>();
    
    for (const leak of leaks) {
      const companyId = leak.metadata?.companyId as string || leak.affectedEntity.id;
      const existing = entitiesByCompany.get(companyId) || [];
      existing.push(leak);
      entitiesByCompany.set(companyId, existing);
    }

    // Find companies with multiple leak types
    for (const [companyId, companyLeaks] of entitiesByCompany) {
      const uniqueTypes = new Set(companyLeaks.map(l => l.type));
      
      if (uniqueTypes.size >= 2 && companyLeaks.length >= 3) {
        const totalRevenue = companyLeaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
        
        insights.push({
          id: generateId(),
          type: 'correlation',
          confidence: 0.78,
          title: 'Multi-Type Leak Correlation Found',
          description: `Entity ${companyId} has ${uniqueTypes.size} different leak types (${Array.from(uniqueTypes).join(', ')}). These may be interconnected and require holistic remediation.`,
          evidence: companyLeaks.map(l => ({
            source: 'correlation_analysis',
            dataPoint: l.type,
            value: l.potentialRevenue,
            weight: 0.7,
          })),
          impact: {
            revenueImpact: totalRevenue,
            probabilityOfOccurrence: 0.8,
            timeToImpact: 21,
            affectedEntities: 1,
          },
          generatedAt: new Date(),
        });
      }
    }

    // Check for leak type co-occurrence
    const typePairs: Map<string, number> = new Map();
    const typeLeaks = this.groupBy(leaks, 'type');
    const types = Object.keys(typeLeaks);

    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const pair = `${types[i]}-${types[j]}`;
        const coOccurrence = Math.min(typeLeaks[types[i]].length, typeLeaks[types[j]].length);
        if (coOccurrence >= 2) {
          typePairs.set(pair, coOccurrence);
        }
      }
    }

    if (typePairs.size > 0) {
      const topPair = Array.from(typePairs.entries()).sort((a, b) => b[1] - a[1])[0];
      const [pairTypes, count] = topPair;
      
      insights.push({
        id: generateId(),
        type: 'correlation',
        confidence: 0.72,
        title: 'Leak Type Co-occurrence Pattern',
        description: `${pairTypes.split('-').map(t => this.formatLeakType(t)).join(' and ')} frequently occur together (${count}+ instances). Addressing one may help prevent the other.`,
        evidence: [
          { source: 'co_occurrence_analysis', dataPoint: 'pair_count', value: count, weight: 0.8 },
        ],
        impact: {
          revenueImpact: 0,
          probabilityOfOccurrence: 0.7,
          timeToImpact: 30,
          affectedEntities: count * 2,
        },
        generatedAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Generate predictions based on current data
   */
  private generatePredictions(leaks: RevenueLeak[]): IntelligenceInsight[] {
    const insights: IntelligenceInsight[] = [];

    if (leaks.length < 3) return insights;

    // Predict future leak volume
    const totalRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    const avgRevenuePerLeak = totalRevenue / leaks.length;
    
    // Simple trend-based prediction
    const recentLeaks = leaks.filter(l => {
      const daysSinceDetection = (Date.now() - l.detectedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceDetection <= 30;
    });

    const monthlyRate = recentLeaks.length;
    const predictedMonthlyRevenue = monthlyRate * avgRevenuePerLeak * 1.1; // 10% growth factor

    insights.push({
      id: generateId(),
      type: 'prediction',
      confidence: 0.68,
      title: 'Projected Revenue at Risk (30 Days)',
      description: `Based on current patterns, approximately $${predictedMonthlyRevenue.toFixed(0)} in revenue may be at risk over the next 30 days if current trends continue.`,
      evidence: [
        { source: 'trend_analysis', dataPoint: 'monthly_rate', value: monthlyRate, weight: 0.6 },
        { source: 'trend_analysis', dataPoint: 'avg_leak_value', value: avgRevenuePerLeak, weight: 0.4 },
      ],
      impact: {
        revenueImpact: predictedMonthlyRevenue,
        probabilityOfOccurrence: 0.68,
        timeToImpact: 30,
        affectedEntities: Math.ceil(monthlyRate * 1.1),
      },
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return insights;
  }

  /**
   * Record feedback for learning
   */
  recordFeedback(
    insightId: string,
    feedbackType: LearningFeedback['feedbackType'],
    userId: string,
    comment?: string,
    actualOutcome?: string
  ): LearningFeedback {
    const feedback: LearningFeedback = {
      id: generateId(),
      insightId,
      feedbackType,
      userComment: comment,
      actualOutcome,
      providedBy: userId,
      providedAt: new Date(),
    };

    const existing = this.feedback.get(insightId) || [];
    existing.push(feedback);
    this.feedback.set(insightId, existing);

    // Apply learning from feedback
    this.applyLearning(insightId, feedback);

    return feedback;
  }

  /**
   * Apply learning from feedback
   */
  private applyLearning(insightId: string, feedback: LearningFeedback): void {
    const insight = this.insights.get(insightId);
    if (!insight) return;

    // Adjust confidence based on feedback
    const adjustment = this.config.learningRate;
    
    switch (feedback.feedbackType) {
      case 'accurate':
        // Reinforce the pattern
        for (const pattern of this.patterns.values()) {
          if (this.patternMatchesInsight(pattern, insight)) {
            pattern.confidence = Math.min(0.99, pattern.confidence + adjustment);
            pattern.occurrences++;
          }
        }
        break;
      
      case 'inaccurate':
        // Reduce confidence in related patterns
        for (const pattern of this.patterns.values()) {
          if (this.patternMatchesInsight(pattern, insight)) {
            pattern.confidence = Math.max(0.1, pattern.confidence - adjustment * 2);
          }
        }
        break;
      
      case 'partially_accurate':
        // Minor adjustment
        for (const pattern of this.patterns.values()) {
          if (this.patternMatchesInsight(pattern, insight)) {
            pattern.confidence = Math.max(0.1, pattern.confidence - adjustment * 0.5);
          }
        }
        break;
    }
  }

  /**
   * Check if a pattern matches an insight
   */
  private patternMatchesInsight(pattern: LearnedPattern, insight: IntelligenceInsight): boolean {
    // Simple matching based on insight description containing pattern keywords
    const patternKeywords = pattern.name.toLowerCase().split(' ');
    const insightText = (insight.title + ' ' + insight.description).toLowerCase();
    
    return patternKeywords.some(keyword => insightText.includes(keyword));
  }

  /**
   * Match leaks against known patterns
   */
  matchPatterns(leak: RevenueLeak): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const pattern of this.patterns.values()) {
      const matchResult = this.evaluatePattern(pattern, leak);
      if (matchResult.confidence >= this.config.minConfidenceThreshold) {
        matches.push(matchResult);
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Evaluate a pattern against a leak
   */
  private evaluatePattern(pattern: LearnedPattern, leak: RevenueLeak): PatternMatch {
    const matchedConditions: string[] = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const condition of pattern.conditions) {
      totalWeight += condition.weight;
      
      // Simplified condition evaluation
      const leakValue = this.getLeakFieldValue(leak, condition.field);
      
      if (this.evaluateCondition(condition, leakValue)) {
        matchedConditions.push(condition.field);
        matchedWeight += condition.weight;
      }
    }

    const confidence = totalWeight > 0 ? 
      (matchedWeight / totalWeight) * pattern.confidence : 0;

    return {
      patternId: pattern.id,
      confidence,
      matchedConditions,
      predictedOutcome: pattern.outcomes[0] || { outcome: 'unknown', probability: 0, averageTimeToOutcome: 0 },
    };
  }

  /**
   * Get field value from leak
   */
  private getLeakFieldValue(leak: RevenueLeak, field: string): unknown {
    switch (field) {
      case 'type':
        return leak.type;
      case 'severity':
        return leak.severity;
      case 'potential_revenue':
        return leak.potentialRevenue;
      default:
        return leak.metadata?.[field];
    }
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: PatternCondition, value: unknown): boolean {
    if (value === undefined || value === null) return false;

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'between':
        const [min, max] = condition.value as number[];
        return Number(value) >= min && Number(value) <= max;
      case 'in':
        return (condition.value as unknown[]).includes(value);
      default:
        return false;
    }
  }

  /**
   * Get all learned patterns
   */
  getPatterns(): LearnedPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get pattern by ID
   */
  getPattern(patternId: string): LearnedPattern | undefined {
    return this.patterns.get(patternId);
  }

  /**
   * Add a new pattern
   */
  addPattern(pattern: LearnedPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Get all insights
   */
  getInsights(): IntelligenceInsight[] {
    return Array.from(this.insights.values());
  }

  /**
   * Get insights by type
   */
  getInsightsByType(type: IntelligenceInsight['type']): IntelligenceInsight[] {
    return this.getInsights().filter(i => i.type === type);
  }

  /**
   * Get feedback for an insight
   */
  getFeedback(insightId: string): LearningFeedback[] {
    return this.feedback.get(insightId) || [];
  }

  /**
   * Helper: Group by field
   */
  private groupBy<T>(items: T[], field: keyof T): Record<string, T[]> {
    return items.reduce((groups, item) => {
      const key = String(item[field]);
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Helper: Format leak type for display
   */
  private formatLeakType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): {
    totalPatterns: number;
    totalInsights: number;
    totalFeedback: number;
    averagePatternConfidence: number;
    feedbackDistribution: Record<string, number>;
  } {
    const patterns = this.getPatterns();
    const allFeedback = Array.from(this.feedback.values()).flat();
    
    const feedbackDistribution = allFeedback.reduce((dist, f) => {
      dist[f.feedbackType] = (dist[f.feedbackType] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return {
      totalPatterns: patterns.length,
      totalInsights: this.insights.size,
      totalFeedback: allFeedback.length,
      averagePatternConfidence: patterns.length > 0 ?
        patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length : 0,
      feedbackDistribution,
    };
  }
}

export default IntelligenceEngine;
