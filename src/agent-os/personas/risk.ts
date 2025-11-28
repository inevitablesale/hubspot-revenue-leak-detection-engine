/**
 * Risk Agent
 * Specialized agent for risk assessment, mitigation, and monitoring across revenue operations
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Risk Agent Types
// ============================================================

export interface RiskAnalysis {
  id: string;
  timestamp: Date;
  entityId: string;
  entityType: 'deal' | 'customer' | 'pipeline' | 'portfolio';
  overallScore: RiskScore;
  factors: RiskFactor[];
  mitigations: RiskMitigation[];
  history: RiskHistoryEntry[];
}

export interface RiskScore {
  value: number;
  level: 'minimal' | 'low' | 'medium' | 'high' | 'critical';
  trend: 'decreasing' | 'stable' | 'increasing';
  confidence: number;
}

export interface RiskFactor {
  id: string;
  name: string;
  category: 'financial' | 'operational' | 'relationship' | 'market' | 'compliance';
  weight: number;
  score: number;
  indicators: RiskIndicator[];
  description: string;
}

export interface RiskIndicator {
  name: string;
  value: number;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'worsening';
}

export interface RiskMitigation {
  id: string;
  riskFactorId: string;
  priority: number;
  action: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  expectedReduction: number;
  status: 'proposed' | 'in_progress' | 'completed' | 'rejected';
  dueDate?: Date;
}

export interface RiskHistoryEntry {
  timestamp: Date;
  score: number;
  level: RiskScore['level'];
  event?: string;
}

export interface RiskConfig {
  thresholds: {
    minimal: number;
    low: number;
    medium: number;
    high: number;
  };
  categoryWeights: Record<string, number>;
  alertOnLevel: RiskScore['level'];
}

export interface RiskStats {
  totalAssessments: number;
  avgRiskScore: number;
  criticalRisks: number;
  mitigationsProposed: number;
  mitigationsCompleted: number;
}

// ============================================================
// Risk Agent Implementation
// ============================================================

export class RiskAgent {
  private analyses: Map<string, RiskAnalysis> = new Map();
  private entityRisks: Map<string, RiskScore> = new Map();
  private config: RiskConfig;
  private stats: RiskStats;

  constructor(config?: Partial<RiskConfig>) {
    this.config = {
      thresholds: {
        minimal: 20,
        low: 40,
        medium: 60,
        high: 80,
      },
      categoryWeights: {
        financial: 0.3,
        operational: 0.2,
        relationship: 0.2,
        market: 0.15,
        compliance: 0.15,
      },
      alertOnLevel: 'high',
      ...config,
    };

    this.stats = {
      totalAssessments: 0,
      avgRiskScore: 0,
      criticalRisks: 0,
      mitigationsProposed: 0,
      mitigationsCompleted: 0,
    };
  }

  /**
   * Assess risk for an entity
   */
  assessRisk(
    entityId: string,
    entityType: RiskAnalysis['entityType'],
    entityData: Record<string, unknown>
  ): RiskAnalysis {
    const factors = this.identifyRiskFactors(entityType, entityData);
    const overallScore = this.calculateOverallScore(factors);
    const mitigations = this.proposeMitigations(factors, overallScore);
    const history = this.getHistory(entityId);

    // Add current assessment to history
    history.push({
      timestamp: new Date(),
      score: overallScore.value,
      level: overallScore.level,
    });

    // Update trend based on history
    overallScore.trend = this.calculateTrend(history);

    const analysis: RiskAnalysis = {
      id: generateId(),
      timestamp: new Date(),
      entityId,
      entityType,
      overallScore,
      factors,
      mitigations,
      history: history.slice(-10), // Keep last 10 entries
    };

    this.analyses.set(analysis.id, analysis);
    this.entityRisks.set(entityId, overallScore);
    this.updateStats(analysis);

    return analysis;
  }

  /**
   * Get high-risk entities
   */
  getHighRiskEntities(): Array<{ entityId: string; score: RiskScore }> {
    const highRisk: Array<{ entityId: string; score: RiskScore }> = [];

    for (const [entityId, score] of this.entityRisks) {
      if (score.level === 'high' || score.level === 'critical') {
        highRisk.push({ entityId, score });
      }
    }

    return highRisk.sort((a, b) => b.score.value - a.score.value);
  }

  /**
   * Update mitigation status
   */
  updateMitigationStatus(
    analysisId: string,
    mitigationId: string,
    status: RiskMitigation['status']
  ): void {
    const analysis = this.analyses.get(analysisId);
    if (analysis) {
      const mitigation = analysis.mitigations.find(m => m.id === mitigationId);
      if (mitigation) {
        mitigation.status = status;
        if (status === 'completed') {
          this.stats.mitigationsCompleted++;
        }
      }
    }
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(id: string): RiskAnalysis | undefined {
    return this.analyses.get(id);
  }

  /**
   * Get risk score for entity
   */
  getRiskScore(entityId: string): RiskScore | undefined {
    return this.entityRisks.get(entityId);
  }

  /**
   * Get statistics
   */
  getStats(): RiskStats {
    return { ...this.stats };
  }

  // Private methods

  private identifyRiskFactors(
    entityType: RiskAnalysis['entityType'],
    entityData: Record<string, unknown>
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Financial risk factors
    factors.push(this.assessFinancialRisk(entityData));

    // Operational risk factors
    factors.push(this.assessOperationalRisk(entityData));

    // Relationship risk factors
    factors.push(this.assessRelationshipRisk(entityData));

    // Market risk factors
    factors.push(this.assessMarketRisk(entityData));

    // Compliance risk factors
    factors.push(this.assessComplianceRisk(entityData));

    return factors;
  }

  private assessFinancialRisk(entityData: Record<string, unknown>): RiskFactor {
    const indicators: RiskIndicator[] = [];
    let totalScore = 0;
    let indicatorCount = 0;

    // Payment history
    const paymentScore = Number(entityData.payment_score) || 100;
    const paymentRisk = 100 - paymentScore;
    indicators.push({
      name: 'payment_history',
      value: paymentScore,
      threshold: 80,
      status: paymentScore >= 80 ? 'normal' : paymentScore >= 60 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += paymentRisk;
    indicatorCount++;

    // Revenue concentration
    const concentration = Number(entityData.revenue_concentration) || 0;
    indicators.push({
      name: 'revenue_concentration',
      value: concentration,
      threshold: 30,
      status: concentration <= 30 ? 'normal' : concentration <= 50 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += concentration;
    indicatorCount++;

    // Contract value volatility
    const volatility = Number(entityData.value_volatility) || 0;
    indicators.push({
      name: 'value_volatility',
      value: volatility,
      threshold: 20,
      status: volatility <= 20 ? 'normal' : volatility <= 40 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += volatility;
    indicatorCount++;

    const score = indicatorCount > 0 ? totalScore / indicatorCount : 0;

    return {
      id: generateId(),
      name: 'Financial Risk',
      category: 'financial',
      weight: this.config.categoryWeights.financial,
      score: Math.round(score),
      indicators,
      description: 'Risk related to payment, revenue concentration, and financial stability',
    };
  }

  private assessOperationalRisk(entityData: Record<string, unknown>): RiskFactor {
    const indicators: RiskIndicator[] = [];
    let totalScore = 0;
    let indicatorCount = 0;

    // Support ticket volume
    const tickets = Number(entityData.open_tickets) || 0;
    const ticketRisk = Math.min(100, tickets * 10);
    indicators.push({
      name: 'support_tickets',
      value: tickets,
      threshold: 5,
      status: tickets <= 5 ? 'normal' : tickets <= 10 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += ticketRisk;
    indicatorCount++;

    // Process completion rate
    const completionRate = Number(entityData.process_completion) || 100;
    const completionRisk = 100 - completionRate;
    indicators.push({
      name: 'process_completion',
      value: completionRate,
      threshold: 90,
      status: completionRate >= 90 ? 'normal' : completionRate >= 70 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += completionRisk;
    indicatorCount++;

    // Data quality score
    const dataQuality = Number(entityData.data_quality) || 80;
    const dataRisk = 100 - dataQuality;
    indicators.push({
      name: 'data_quality',
      value: dataQuality,
      threshold: 85,
      status: dataQuality >= 85 ? 'normal' : dataQuality >= 70 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += dataRisk;
    indicatorCount++;

    const score = indicatorCount > 0 ? totalScore / indicatorCount : 0;

    return {
      id: generateId(),
      name: 'Operational Risk',
      category: 'operational',
      weight: this.config.categoryWeights.operational,
      score: Math.round(score),
      indicators,
      description: 'Risk related to operations, support, and process execution',
    };
  }

  private assessRelationshipRisk(entityData: Record<string, unknown>): RiskFactor {
    const indicators: RiskIndicator[] = [];
    let totalScore = 0;
    let indicatorCount = 0;

    // Engagement score
    const engagement = Number(entityData.engagement_score) || 50;
    const engagementRisk = 100 - engagement;
    indicators.push({
      name: 'engagement',
      value: engagement,
      threshold: 60,
      status: engagement >= 60 ? 'normal' : engagement >= 40 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += engagementRisk;
    indicatorCount++;

    // NPS
    const nps = Number(entityData.nps_score) || 50;
    const npsRisk = Math.max(0, 100 - nps * 10);
    indicators.push({
      name: 'nps',
      value: nps,
      threshold: 7,
      status: nps >= 7 ? 'normal' : nps >= 5 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += npsRisk;
    indicatorCount++;

    // Champion stability
    const championStable = entityData.champion_stable as boolean;
    const championRisk = championStable ? 0 : 70;
    indicators.push({
      name: 'champion_stability',
      value: championStable ? 100 : 0,
      threshold: 100,
      status: championStable ? 'normal' : 'critical',
      trend: 'stable',
    });
    totalScore += championRisk;
    indicatorCount++;

    const score = indicatorCount > 0 ? totalScore / indicatorCount : 0;

    return {
      id: generateId(),
      name: 'Relationship Risk',
      category: 'relationship',
      weight: this.config.categoryWeights.relationship,
      score: Math.round(score),
      indicators,
      description: 'Risk related to customer relationship and engagement',
    };
  }

  private assessMarketRisk(entityData: Record<string, unknown>): RiskFactor {
    const indicators: RiskIndicator[] = [];
    let totalScore = 0;
    let indicatorCount = 0;

    // Competitive pressure
    const competitive = Number(entityData.competitive_pressure) || 30;
    indicators.push({
      name: 'competitive_pressure',
      value: competitive,
      threshold: 50,
      status: competitive <= 50 ? 'normal' : competitive <= 70 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += competitive;
    indicatorCount++;

    // Market volatility
    const marketVol = Number(entityData.market_volatility) || 20;
    indicators.push({
      name: 'market_volatility',
      value: marketVol,
      threshold: 30,
      status: marketVol <= 30 ? 'normal' : marketVol <= 50 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += marketVol;
    indicatorCount++;

    // Industry risk
    const industryRisk = Number(entityData.industry_risk) || 25;
    indicators.push({
      name: 'industry_risk',
      value: industryRisk,
      threshold: 40,
      status: industryRisk <= 40 ? 'normal' : industryRisk <= 60 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += industryRisk;
    indicatorCount++;

    const score = indicatorCount > 0 ? totalScore / indicatorCount : 0;

    return {
      id: generateId(),
      name: 'Market Risk',
      category: 'market',
      weight: this.config.categoryWeights.market,
      score: Math.round(score),
      indicators,
      description: 'Risk related to market conditions and competition',
    };
  }

  private assessComplianceRisk(entityData: Record<string, unknown>): RiskFactor {
    const indicators: RiskIndicator[] = [];
    let totalScore = 0;
    let indicatorCount = 0;

    // Contract compliance
    const contractCompliance = Number(entityData.contract_compliance) || 100;
    const contractRisk = 100 - contractCompliance;
    indicators.push({
      name: 'contract_compliance',
      value: contractCompliance,
      threshold: 95,
      status: contractCompliance >= 95 ? 'normal' : contractCompliance >= 80 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += contractRisk;
    indicatorCount++;

    // Data privacy compliance
    const privacyCompliance = Number(entityData.privacy_compliance) || 100;
    const privacyRisk = 100 - privacyCompliance;
    indicators.push({
      name: 'privacy_compliance',
      value: privacyCompliance,
      threshold: 100,
      status: privacyCompliance >= 100 ? 'normal' : privacyCompliance >= 90 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += privacyRisk;
    indicatorCount++;

    // Regulatory risk
    const regulatoryRisk = Number(entityData.regulatory_risk) || 10;
    indicators.push({
      name: 'regulatory_risk',
      value: regulatoryRisk,
      threshold: 20,
      status: regulatoryRisk <= 20 ? 'normal' : regulatoryRisk <= 40 ? 'warning' : 'critical',
      trend: 'stable',
    });
    totalScore += regulatoryRisk;
    indicatorCount++;

    const score = indicatorCount > 0 ? totalScore / indicatorCount : 0;

    return {
      id: generateId(),
      name: 'Compliance Risk',
      category: 'compliance',
      weight: this.config.categoryWeights.compliance,
      score: Math.round(score),
      indicators,
      description: 'Risk related to regulatory and contractual compliance',
    };
  }

  private calculateOverallScore(factors: RiskFactor[]): RiskScore {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    }

    const value = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    const thresholds = this.config.thresholds;

    let level: RiskScore['level'];
    if (value <= thresholds.minimal) {
      level = 'minimal';
    } else if (value <= thresholds.low) {
      level = 'low';
    } else if (value <= thresholds.medium) {
      level = 'medium';
    } else if (value <= thresholds.high) {
      level = 'high';
    } else {
      level = 'critical';
    }

    return {
      value,
      level,
      trend: 'stable',
      confidence: 0.85,
    };
  }

  private proposeMitigations(factors: RiskFactor[], overallScore: RiskScore): RiskMitigation[] {
    const mitigations: RiskMitigation[] = [];

    for (const factor of factors) {
      if (factor.score > 50) {
        const mitigation = this.createMitigation(factor);
        mitigations.push(mitigation);
        this.stats.mitigationsProposed++;
      }
    }

    return mitigations.sort((a, b) => a.priority - b.priority);
  }

  private createMitigation(factor: RiskFactor): RiskMitigation {
    const mitigationActions: Record<string, { action: string; description: string }> = {
      financial: {
        action: 'financial_review',
        description: 'Conduct financial review and implement payment monitoring',
      },
      operational: {
        action: 'process_improvement',
        description: 'Implement process improvements and automation',
      },
      relationship: {
        action: 'engagement_program',
        description: 'Launch customer engagement and success program',
      },
      market: {
        action: 'competitive_analysis',
        description: 'Conduct competitive analysis and differentiation strategy',
      },
      compliance: {
        action: 'compliance_audit',
        description: 'Perform compliance audit and implement controls',
      },
    };

    const actionInfo = mitigationActions[factor.category] || {
      action: 'general_review',
      description: 'Conduct general risk review',
    };

    return {
      id: generateId(),
      riskFactorId: factor.id,
      priority: factor.score > 70 ? 1 : factor.score > 50 ? 2 : 3,
      action: actionInfo.action,
      description: actionInfo.description,
      effort: factor.score > 70 ? 'high' : factor.score > 50 ? 'medium' : 'low',
      expectedReduction: Math.round(factor.score * 0.3),
      status: 'proposed',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    };
  }

  private getHistory(entityId: string): RiskHistoryEntry[] {
    const existingAnalyses = Array.from(this.analyses.values())
      .filter(a => a.entityId === entityId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return existingAnalyses.flatMap(a => a.history);
  }

  private calculateTrend(history: RiskHistoryEntry[]): RiskScore['trend'] {
    if (history.length < 2) return 'stable';

    const recent = history.slice(-3);
    const older = history.slice(-6, -3);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.score, 0) / older.length;

    if (recentAvg < olderAvg - 5) return 'decreasing';
    if (recentAvg > olderAvg + 5) return 'increasing';
    return 'stable';
  }

  private updateStats(analysis: RiskAnalysis): void {
    this.stats.totalAssessments++;

    const scores = Array.from(this.entityRisks.values());
    this.stats.avgRiskScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.value, 0) / scores.length)
      : 0;

    this.stats.criticalRisks = scores.filter(
      s => s.level === 'critical' || s.level === 'high'
    ).length;
  }
}

export default RiskAgent;
