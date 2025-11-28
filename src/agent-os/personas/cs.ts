/**
 * CS (Customer Success) Agent
 * Specialized agent for customer health monitoring, churn prediction, and retention
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// CS Agent Types
// ============================================================

export interface CSAnalysis {
  id: string;
  timestamp: Date;
  customerId: string;
  healthScore: CustomerHealthScore;
  churnRisk: ChurnRisk;
  recommendations: CSRecommendation[];
  engagement: EngagementMetrics;
  sentiment: SentimentAnalysis;
}

export interface CustomerHealthScore {
  overall: number;
  components: {
    usage: number;
    engagement: number;
    satisfaction: number;
    support: number;
    renewal: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  lastCalculated: Date;
}

export interface ChurnRisk {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: ChurnFactor[];
  predictedDate?: Date;
  confidence: number;
}

export interface ChurnFactor {
  name: string;
  weight: number;
  value: number;
  impact: 'positive' | 'negative';
  description: string;
}

export interface CSRecommendation {
  id: string;
  priority: number;
  type: 'engagement' | 'support' | 'training' | 'upsell' | 'retention' | 'review' | 'renewal';
  action: string;
  description: string;
  expectedImpact: number;
  urgency: 'immediate' | 'soon' | 'planned';
}

export interface EngagementMetrics {
  loginFrequency: number;
  featureAdoption: number;
  lastActivity: Date;
  activeUsers: number;
  totalUsers: number;
  engagementScore: number;
}

export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  score: number;
  recentInteractions: SentimentInteraction[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface SentimentInteraction {
  date: Date;
  type: string;
  sentiment: number;
  notes?: string;
}

export interface CSConfig {
  healthThresholds: {
    healthy: number;
    warning: number;
    critical: number;
  };
  churnWeights: Record<string, number>;
  engagementWindow: number;
  autoAlert: boolean;
}

export interface CSStats {
  totalAnalyses: number;
  customersMonitored: number;
  avgHealthScore: number;
  atRiskCustomers: number;
  churnsPrevented: number;
}

// ============================================================
// CS Agent Implementation
// ============================================================

export class CSAgent {
  private analyses: Map<string, CSAnalysis> = new Map();
  private customerScores: Map<string, CustomerHealthScore> = new Map();
  private config: CSConfig;
  private stats: CSStats;

  constructor(config?: Partial<CSConfig>) {
    this.config = {
      healthThresholds: {
        healthy: 70,
        warning: 40,
        critical: 20,
      },
      churnWeights: {
        usage: 0.25,
        engagement: 0.2,
        satisfaction: 0.2,
        support: 0.15,
        renewal: 0.2,
      },
      engagementWindow: 30,
      autoAlert: true,
      ...config,
    };

    this.stats = {
      totalAnalyses: 0,
      customersMonitored: 0,
      avgHealthScore: 0,
      atRiskCustomers: 0,
      churnsPrevented: 0,
    };
  }

  /**
   * Analyze customer health
   */
  analyzeCustomer(customerId: string, customerData: Record<string, unknown>): CSAnalysis {
    const healthScore = this.calculateHealthScore(customerData);
    const engagement = this.calculateEngagement(customerData);
    const sentiment = this.analyzeSentiment(customerData);
    const churnRisk = this.assessChurnRisk(healthScore, engagement, sentiment);
    const recommendations = this.generateRecommendations(healthScore, churnRisk, engagement);

    const analysis: CSAnalysis = {
      id: generateId(),
      timestamp: new Date(),
      customerId,
      healthScore,
      churnRisk,
      recommendations,
      engagement,
      sentiment,
    };

    this.analyses.set(analysis.id, analysis);
    this.customerScores.set(customerId, healthScore);
    this.updateStats(analysis);

    return analysis;
  }

  /**
   * Get customer health score
   */
  getHealthScore(customerId: string): CustomerHealthScore | undefined {
    return this.customerScores.get(customerId);
  }

  /**
   * Get at-risk customers
   */
  getAtRiskCustomers(): Array<{ customerId: string; risk: ChurnRisk }> {
    const atRisk: Array<{ customerId: string; risk: ChurnRisk }> = [];

    for (const [analysisId, analysis] of this.analyses) {
      if (analysis.churnRisk.level === 'high' || analysis.churnRisk.level === 'critical') {
        atRisk.push({
          customerId: analysis.customerId,
          risk: analysis.churnRisk,
        });
      }
    }

    return atRisk.sort((a, b) => b.risk.score - a.risk.score);
  }

  /**
   * Record churn prevention
   */
  recordChurnPrevented(customerId: string): void {
    this.stats.churnsPrevented++;
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(id: string): CSAnalysis | undefined {
    return this.analyses.get(id);
  }

  /**
   * Get statistics
   */
  getStats(): CSStats {
    return { ...this.stats };
  }

  // Private methods

  private calculateHealthScore(customerData: Record<string, unknown>): CustomerHealthScore {
    const usage = this.normalizeScore(Number(customerData.usage_score) || 50);
    const engagement = this.normalizeScore(Number(customerData.engagement_score) || 50);
    const satisfaction = this.normalizeScore(Number(customerData.nps_score) || 50);
    const support = this.calculateSupportScore(customerData);
    const renewal = this.calculateRenewalScore(customerData);

    const weights = this.config.churnWeights;
    const overall = 
      usage * weights.usage +
      engagement * weights.engagement +
      satisfaction * weights.satisfaction +
      support * weights.support +
      renewal * weights.renewal;

    const previousScore = Number(customerData.previous_health_score) || overall;
    const trend: 'improving' | 'stable' | 'declining' = 
      overall > previousScore + 5 ? 'improving' :
      overall < previousScore - 5 ? 'declining' : 'stable';

    return {
      overall: Math.round(overall),
      components: {
        usage: Math.round(usage),
        engagement: Math.round(engagement),
        satisfaction: Math.round(satisfaction),
        support: Math.round(support),
        renewal: Math.round(renewal),
      },
      trend,
      lastCalculated: new Date(),
    };
  }

  private calculateEngagement(customerData: Record<string, unknown>): EngagementMetrics {
    const loginFrequency = Number(customerData.login_frequency) || 0;
    const featureAdoption = Number(customerData.feature_adoption) || 0;
    const lastActivity = customerData.last_activity ? new Date(String(customerData.last_activity)) : new Date();
    const activeUsers = Number(customerData.active_users) || 0;
    const totalUsers = Number(customerData.total_users) || 1;

    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    const activityScore = Math.max(0, 100 - daysSinceActivity * 3);
    const adoptionScore = featureAdoption * 100;
    const userRatio = (activeUsers / totalUsers) * 100;

    const engagementScore = (activityScore + adoptionScore + userRatio + loginFrequency) / 4;

    return {
      loginFrequency,
      featureAdoption,
      lastActivity,
      activeUsers,
      totalUsers,
      engagementScore: Math.round(engagementScore),
    };
  }

  private analyzeSentiment(customerData: Record<string, unknown>): SentimentAnalysis {
    const nps = Number(customerData.nps_score) || 0;
    const csat = Number(customerData.csat_score) || 0;
    const ticketSentiment = Number(customerData.ticket_sentiment) || 0;

    const score = (nps / 10 + csat / 5 + ticketSentiment) / 3;

    const overall: 'positive' | 'neutral' | 'negative' = 
      score > 0.3 ? 'positive' :
      score < -0.3 ? 'negative' : 'neutral';

    const previousSentiment = Number(customerData.previous_sentiment) || score;
    const trend: 'improving' | 'stable' | 'declining' = 
      score > previousSentiment + 0.1 ? 'improving' :
      score < previousSentiment - 0.1 ? 'declining' : 'stable';

    return {
      overall,
      score: Math.round(score * 100) / 100,
      recentInteractions: [],
      trend,
    };
  }

  private assessChurnRisk(
    healthScore: CustomerHealthScore,
    engagement: EngagementMetrics,
    sentiment: SentimentAnalysis
  ): ChurnRisk {
    const factors: ChurnFactor[] = [];
    let riskScore = 0;

    // Health score factor
    const healthFactor = 100 - healthScore.overall;
    factors.push({
      name: 'health_score',
      weight: 0.3,
      value: healthFactor,
      impact: healthScore.overall < 50 ? 'negative' : 'positive',
      description: `Health score is ${healthScore.overall}`,
    });
    riskScore += healthFactor * 0.3;

    // Engagement factor
    const engagementFactor = 100 - engagement.engagementScore;
    factors.push({
      name: 'engagement',
      weight: 0.25,
      value: engagementFactor,
      impact: engagement.engagementScore < 50 ? 'negative' : 'positive',
      description: `Engagement score is ${engagement.engagementScore}`,
    });
    riskScore += engagementFactor * 0.25;

    // Sentiment factor
    const sentimentFactor = sentiment.overall === 'negative' ? 80 : sentiment.overall === 'neutral' ? 40 : 10;
    factors.push({
      name: 'sentiment',
      weight: 0.2,
      value: sentimentFactor,
      impact: sentiment.overall === 'negative' ? 'negative' : 'positive',
      description: `Sentiment is ${sentiment.overall}`,
    });
    riskScore += sentimentFactor * 0.2;

    // Trend factor
    const trendFactor = 
      healthScore.trend === 'declining' ? 70 :
      healthScore.trend === 'stable' ? 30 : 10;
    factors.push({
      name: 'trend',
      weight: 0.25,
      value: trendFactor,
      impact: healthScore.trend === 'declining' ? 'negative' : 'positive',
      description: `Health trend is ${healthScore.trend}`,
    });
    riskScore += trendFactor * 0.25;

    const level: 'low' | 'medium' | 'high' | 'critical' =
      riskScore > 75 ? 'critical' :
      riskScore > 50 ? 'high' :
      riskScore > 25 ? 'medium' : 'low';

    return {
      score: Math.round(riskScore),
      level,
      factors,
      confidence: 0.85,
    };
  }

  private generateRecommendations(
    healthScore: CustomerHealthScore,
    churnRisk: ChurnRisk,
    engagement: EngagementMetrics
  ): CSRecommendation[] {
    const recommendations: CSRecommendation[] = [];

    // Critical churn risk
    if (churnRisk.level === 'critical') {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'retention',
        action: 'executive_outreach',
        description: 'Schedule executive-level outreach to understand concerns',
        expectedImpact: 30,
        urgency: 'immediate',
      });
    }

    // Low engagement
    if (engagement.engagementScore < 40) {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'engagement',
        action: 'engagement_campaign',
        description: 'Launch targeted engagement campaign to increase usage',
        expectedImpact: 20,
        urgency: 'soon',
      });
    }

    // Low feature adoption
    if (engagement.featureAdoption < 0.5) {
      recommendations.push({
        id: generateId(),
        priority: 3,
        type: 'training',
        action: 'training_session',
        description: 'Schedule training session for key features',
        expectedImpact: 15,
        urgency: 'planned',
      });
    }

    // Low satisfaction
    if (healthScore.components.satisfaction < 50) {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'support',
        action: 'satisfaction_review',
        description: 'Conduct satisfaction review call',
        expectedImpact: 20,
        urgency: 'soon',
      });
    }

    // Upcoming renewal with risk
    if (healthScore.components.renewal < 50 && churnRisk.level !== 'low') {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'renewal',
        action: 'early_renewal_discussion',
        description: 'Initiate early renewal discussions with value reinforcement',
        expectedImpact: 25,
        urgency: 'immediate',
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private calculateSupportScore(customerData: Record<string, unknown>): number {
    const openTickets = Number(customerData.open_tickets) || 0;
    const avgResolutionTime = Number(customerData.avg_resolution_time) || 24;
    const escalations = Number(customerData.escalations) || 0;

    let score = 100;
    score -= openTickets * 5;
    score -= Math.max(0, avgResolutionTime - 24) * 2;
    score -= escalations * 15;

    return Math.max(0, Math.min(100, score));
  }

  private calculateRenewalScore(customerData: Record<string, unknown>): number {
    const daysToRenewal = Number(customerData.days_to_renewal) || 365;
    const renewalHistory = Number(customerData.renewal_count) || 0;
    const contractValue = Number(customerData.contract_value) || 0;
    const growthRate = Number(customerData.growth_rate) || 0;

    let score = 50;

    // More renewals = higher score
    score += Math.min(renewalHistory * 10, 30);

    // Growth rate bonus
    score += growthRate * 10;

    // Upcoming renewal with no engagement = lower score
    if (daysToRenewal < 90) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private normalizeScore(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private updateStats(analysis: CSAnalysis): void {
    this.stats.totalAnalyses++;
    this.stats.customersMonitored = this.customerScores.size;

    // Update average health score
    const scores = Array.from(this.customerScores.values()).map(s => s.overall);
    this.stats.avgHealthScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Count at-risk customers
    this.stats.atRiskCustomers = Array.from(this.analyses.values())
      .filter(a => a.churnRisk.level === 'high' || a.churnRisk.level === 'critical')
      .length;
  }
}

export default CSAgent;
