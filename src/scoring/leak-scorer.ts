/**
 * Enhanced Scoring System
 * Calculates severity, impact, and recoverability scores for leaks
 */

import { RevenueLeak, LeakType, LeakSeverity } from '../types';
import { generateId } from '../utils/helpers';

export interface LeakScore {
  leakId: string;
  severity: number;
  impact: number;
  recoverability: number;
  urgency: number;
  composite: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: string;
}

export interface ScoringWeights {
  severity: number;
  impact: number;
  recoverability: number;
  urgency: number;
}

export interface ScoringConfig {
  weights: ScoringWeights;
  revenueThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  ageDecayRate: number;
  industryMultipliers: Map<string, number>;
}

const DEFAULT_CONFIG: ScoringConfig = {
  weights: {
    severity: 0.3,
    impact: 0.3,
    recoverability: 0.25,
    urgency: 0.15,
  },
  revenueThresholds: {
    low: 5000,
    medium: 15000,
    high: 50000,
    critical: 100000,
  },
  ageDecayRate: 0.02, // 2% per day
  industryMultipliers: new Map([
    ['saas', 1.2],
    ['enterprise', 1.5],
    ['smb', 0.9],
    ['retail', 0.8],
  ]),
};

export interface LeakMetrics {
  dealValue?: number;
  customerLifetimeValue?: number;
  contractTerm?: number;
  daysSinceDetection?: number;
  previousResolutionAttempts?: number;
  relatedLeakCount?: number;
  customerTier?: 'enterprise' | 'mid-market' | 'smb';
  industry?: string;
}

export class LeakScorer {
  private config: ScoringConfig;

  constructor(config: Partial<ScoringConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      weights: { ...DEFAULT_CONFIG.weights, ...config.weights },
      revenueThresholds: { ...DEFAULT_CONFIG.revenueThresholds, ...config.revenueThresholds },
    };
  }

  /**
   * Calculate comprehensive score for a leak
   */
  scoreLeaks(leak: RevenueLeak, metrics?: LeakMetrics): LeakScore {
    const severity = this.calculateSeverityScore(leak);
    const impact = this.calculateImpactScore(leak, metrics);
    const recoverability = this.calculateRecoverabilityScore(leak, metrics);
    const urgency = this.calculateUrgencyScore(leak, metrics);

    const composite = this.calculateCompositeScore(severity, impact, recoverability, urgency);
    const grade = this.calculateGrade(composite);
    const recommendation = this.generateRecommendation(leak, composite, { severity, impact, recoverability, urgency });

    return {
      leakId: leak.id,
      severity,
      impact,
      recoverability,
      urgency,
      composite,
      grade,
      recommendation,
    };
  }

  /**
   * Batch score multiple leaks
   */
  batchScore(leaks: RevenueLeak[], metricsMap?: Map<string, LeakMetrics>): LeakScore[] {
    return leaks.map(leak => {
      const metrics = metricsMap?.get(leak.id);
      return this.scoreLeaks(leak, metrics);
    });
  }

  /**
   * Calculate severity score (0-100)
   */
  private calculateSeverityScore(leak: RevenueLeak): number {
    const severityScores: Record<LeakSeverity, number> = {
      low: 25,
      medium: 50,
      high: 75,
      critical: 100,
    };

    let score = severityScores[leak.severity];

    // Revenue modifier
    const { revenueThresholds } = this.config;
    if (leak.potentialRevenue >= revenueThresholds.critical) {
      score = Math.min(100, score + 15);
    } else if (leak.potentialRevenue >= revenueThresholds.high) {
      score = Math.min(100, score + 10);
    } else if (leak.potentialRevenue >= revenueThresholds.medium) {
      score = Math.min(100, score + 5);
    }

    // Type modifier
    const typeModifiers: Record<LeakType, number> = {
      missed_renewal: 10,
      billing_gap: 8,
      underbilling: 6,
      stalled_cs_handoff: 4,
      untriggered_crosssell: 2,
      invalid_lifecycle_path: 0,
    };
    score += typeModifiers[leak.type] || 0;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate impact score (0-100)
   */
  private calculateImpactScore(leak: RevenueLeak, metrics?: LeakMetrics): number {
    let score = 0;

    // Base score from potential revenue
    const { revenueThresholds } = this.config;
    if (leak.potentialRevenue >= revenueThresholds.critical) {
      score = 90;
    } else if (leak.potentialRevenue >= revenueThresholds.high) {
      score = 70;
    } else if (leak.potentialRevenue >= revenueThresholds.medium) {
      score = 50;
    } else if (leak.potentialRevenue >= revenueThresholds.low) {
      score = 30;
    } else {
      score = 15;
    }

    // Customer value modifier
    if (metrics?.customerLifetimeValue) {
      const clvRatio = leak.potentialRevenue / metrics.customerLifetimeValue;
      if (clvRatio >= 0.5) {
        score += 15;
      } else if (clvRatio >= 0.25) {
        score += 10;
      } else if (clvRatio >= 0.1) {
        score += 5;
      }
    }

    // Customer tier modifier
    if (metrics?.customerTier) {
      const tierModifiers = {
        enterprise: 15,
        'mid-market': 10,
        smb: 5,
      };
      score += tierModifiers[metrics.customerTier] || 0;
    }

    // Related leaks modifier
    if (metrics?.relatedLeakCount && metrics.relatedLeakCount > 0) {
      score += Math.min(10, metrics.relatedLeakCount * 3);
    }

    // Industry modifier
    if (metrics?.industry) {
      const multiplier = this.config.industryMultipliers.get(metrics.industry.toLowerCase()) || 1;
      score = score * multiplier;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Calculate recoverability score (0-100)
   * Higher = easier to recover
   */
  private calculateRecoverabilityScore(leak: RevenueLeak, metrics?: LeakMetrics): number {
    let score = 50; // Base

    // Type-based recoverability
    const typeRecoverability: Record<LeakType, number> = {
      billing_gap: 90, // Usually just needs invoice
      underbilling: 80, // Price adjustment
      stalled_cs_handoff: 75, // Assign owner and act
      invalid_lifecycle_path: 70, // Data fix
      untriggered_crosssell: 50, // Needs sales effort
      missed_renewal: 40, // May have lost customer
    };
    score = typeRecoverability[leak.type] || score;

    // Previous attempts modifier (diminishing returns)
    if (metrics?.previousResolutionAttempts) {
      score -= metrics.previousResolutionAttempts * 15;
    }

    // Age modifier (harder to recover older leaks)
    if (metrics?.daysSinceDetection) {
      const decay = metrics.daysSinceDetection * this.config.ageDecayRate * 100;
      score -= Math.min(30, decay);
    }

    // Actions available modifier
    if (leak.suggestedActions.length >= 3) {
      score += 10;
    } else if (leak.suggestedActions.length >= 2) {
      score += 5;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Calculate urgency score (0-100)
   */
  private calculateUrgencyScore(leak: RevenueLeak, metrics?: LeakMetrics): number {
    let score = 50;

    // Severity-based urgency
    const severityUrgency: Record<LeakSeverity, number> = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
    };
    score = severityUrgency[leak.severity];

    // Time-sensitive types
    if (leak.type === 'missed_renewal') {
      score += 20;
    } else if (leak.type === 'stalled_cs_handoff') {
      score += 15;
    }

    // Age increases urgency
    if (metrics?.daysSinceDetection) {
      score += Math.min(20, metrics.daysSinceDetection * 0.5);
    }

    // Contract term modifier (shorter term = more urgent)
    if (metrics?.contractTerm && metrics.contractTerm <= 30) {
      score += 10;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Calculate composite score
   */
  private calculateCompositeScore(
    severity: number,
    impact: number,
    recoverability: number,
    urgency: number
  ): number {
    const { weights } = this.config;
    
    const weighted = 
      severity * weights.severity +
      impact * weights.impact +
      recoverability * weights.recoverability +
      urgency * weights.urgency;

    return Math.round(weighted);
  }

  /**
   * Calculate grade from composite score
   */
  private calculateGrade(composite: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (composite >= 80) return 'A';
    if (composite >= 65) return 'B';
    if (composite >= 50) return 'C';
    if (composite >= 35) return 'D';
    return 'F';
  }

  /**
   * Generate recommendation based on scores
   */
  private generateRecommendation(
    leak: RevenueLeak,
    composite: number,
    scores: { severity: number; impact: number; recoverability: number; urgency: number }
  ): string {
    if (composite >= 80) {
      return `CRITICAL: Immediate action required for ${leak.type}. High severity (${scores.severity}) with significant revenue impact ($${leak.potentialRevenue}).`;
    }
    
    if (composite >= 65) {
      if (scores.recoverability >= 70) {
        return `HIGH PRIORITY: Quick win opportunity. This ${leak.type} has high recoverability (${scores.recoverability}%) - take action within 24 hours.`;
      }
      return `HIGH PRIORITY: Address this ${leak.type} soon. Impact score of ${scores.impact} indicates significant revenue at risk.`;
    }
    
    if (composite >= 50) {
      return `MEDIUM PRIORITY: Schedule review for this ${leak.type}. Balance effort against $${leak.potentialRevenue} potential recovery.`;
    }
    
    if (composite >= 35) {
      return `LOW PRIORITY: Monitor this ${leak.type}. Consider batch resolution with similar issues.`;
    }
    
    return `MINIMAL: This ${leak.type} can be addressed during routine maintenance. Low urgency (${scores.urgency}).`;
  }

  /**
   * Rank leaks by score
   */
  rankLeaks(scores: LeakScore[], ascending: boolean = false): LeakScore[] {
    return [...scores].sort((a, b) => 
      ascending ? a.composite - b.composite : b.composite - a.composite
    );
  }

  /**
   * Get priority bucket distribution
   */
  getPriorityDistribution(scores: LeakScore[]): { critical: number; high: number; medium: number; low: number } {
    const distribution = { critical: 0, high: 0, medium: 0, low: 0 };
    
    for (const score of scores) {
      if (score.composite >= 80) distribution.critical++;
      else if (score.composite >= 65) distribution.high++;
      else if (score.composite >= 50) distribution.medium++;
      else distribution.low++;
    }
    
    return distribution;
  }

  /**
   * Calculate aggregate metrics
   */
  calculateAggregateMetrics(scores: LeakScore[]): {
    averageComposite: number;
    averageSeverity: number;
    averageImpact: number;
    averageRecoverability: number;
    gradeDistribution: Record<string, number>;
  } {
    if (scores.length === 0) {
      return {
        averageComposite: 0,
        averageSeverity: 0,
        averageImpact: 0,
        averageRecoverability: 0,
        gradeDistribution: {},
      };
    }

    const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    
    let totalComposite = 0;
    let totalSeverity = 0;
    let totalImpact = 0;
    let totalRecoverability = 0;

    for (const score of scores) {
      totalComposite += score.composite;
      totalSeverity += score.severity;
      totalImpact += score.impact;
      totalRecoverability += score.recoverability;
      gradeDistribution[score.grade]++;
    }

    return {
      averageComposite: Math.round(totalComposite / scores.length),
      averageSeverity: Math.round(totalSeverity / scores.length),
      averageImpact: Math.round(totalImpact / scores.length),
      averageRecoverability: Math.round(totalRecoverability / scores.length),
      gradeDistribution,
    };
  }
}

export default LeakScorer;
