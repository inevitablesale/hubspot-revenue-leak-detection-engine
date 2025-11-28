/**
 * Renewal Agent
 * Specialized agent for renewal management, churn prevention, and expansion opportunities
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Renewal Agent Types
// ============================================================

export interface RenewalAnalysis {
  id: string;
  timestamp: Date;
  customerId: string;
  opportunity: RenewalOpportunity;
  risks: RenewalRisk[];
  recommendations: RenewalRecommendation[];
  timeline: RenewalTimeline;
}

export interface RenewalOpportunity {
  id: string;
  customerId: string;
  currentValue: number;
  renewalValue: number;
  expansionValue: number;
  probability: number;
  renewalDate: Date;
  daysToRenewal: number;
  status: 'upcoming' | 'in_progress' | 'at_risk' | 'secured' | 'churned';
}

export interface RenewalRisk {
  id: string;
  type: 'engagement' | 'satisfaction' | 'competitive' | 'budget' | 'champion' | 'value';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: string[];
  mitigation: string;
  impact: number;
}

export interface RenewalRecommendation {
  id: string;
  priority: number;
  type: 'retention' | 'expansion' | 'engagement' | 'value' | 'timing';
  action: string;
  description: string;
  expectedOutcome: number;
  dueDate?: Date;
}

export interface RenewalTimeline {
  renewalDate: Date;
  milestones: RenewalMilestone[];
  criticalPath: string[];
  nextAction: string;
  nextActionDate: Date;
}

export interface RenewalMilestone {
  id: string;
  name: string;
  dueDate: Date;
  status: 'pending' | 'completed' | 'overdue' | 'skipped';
  owner: string;
  notes?: string;
}

export interface RenewalConfig {
  leadTimeDays: number;
  engagementThreshold: number;
  expansionTargetPercent: number;
  riskWeights: Record<string, number>;
}

export interface RenewalStats {
  totalAnalyses: number;
  upcomingRenewals: number;
  atRiskValue: number;
  expansionPipeline: number;
  renewalRate: number;
}

// ============================================================
// Renewal Agent Implementation
// ============================================================

export class RenewalAgent {
  private analyses: Map<string, RenewalAnalysis> = new Map();
  private opportunities: Map<string, RenewalOpportunity> = new Map();
  private config: RenewalConfig;
  private stats: RenewalStats;

  constructor(config?: Partial<RenewalConfig>) {
    this.config = {
      leadTimeDays: 90,
      engagementThreshold: 50,
      expansionTargetPercent: 10,
      riskWeights: {
        engagement: 0.25,
        satisfaction: 0.25,
        competitive: 0.2,
        budget: 0.15,
        champion: 0.15,
      },
      ...config,
    };

    this.stats = {
      totalAnalyses: 0,
      upcomingRenewals: 0,
      atRiskValue: 0,
      expansionPipeline: 0,
      renewalRate: 0,
    };
  }

  /**
   * Analyze renewal opportunity
   */
  analyzeRenewal(
    customerId: string,
    customerData: Record<string, unknown>
  ): RenewalAnalysis {
    const opportunity = this.buildOpportunity(customerId, customerData);
    const risks = this.identifyRisks(customerData, opportunity);
    const timeline = this.buildTimeline(opportunity, customerData);
    const recommendations = this.generateRecommendations(opportunity, risks, timeline);

    const analysis: RenewalAnalysis = {
      id: generateId(),
      timestamp: new Date(),
      customerId,
      opportunity,
      risks,
      recommendations,
      timeline,
    };

    this.analyses.set(analysis.id, analysis);
    this.opportunities.set(customerId, opportunity);
    this.updateStats(analysis);

    return analysis;
  }

  /**
   * Get upcoming renewals
   */
  getUpcomingRenewals(daysAhead: number = 90): RenewalOpportunity[] {
    const upcoming: RenewalOpportunity[] = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    for (const opp of this.opportunities.values()) {
      if (opp.renewalDate <= cutoff && opp.status !== 'secured' && opp.status !== 'churned') {
        upcoming.push(opp);
      }
    }

    return upcoming.sort((a, b) => a.renewalDate.getTime() - b.renewalDate.getTime());
  }

  /**
   * Get at-risk renewals
   */
  getAtRiskRenewals(): RenewalOpportunity[] {
    return Array.from(this.opportunities.values())
      .filter(opp => opp.status === 'at_risk')
      .sort((a, b) => b.renewalValue - a.renewalValue);
  }

  /**
   * Update renewal status
   */
  updateStatus(customerId: string, status: RenewalOpportunity['status']): void {
    const opportunity = this.opportunities.get(customerId);
    if (opportunity) {
      opportunity.status = status;
      this.updateStats();
    }
  }

  /**
   * Get opportunity by customer
   */
  getOpportunity(customerId: string): RenewalOpportunity | undefined {
    return this.opportunities.get(customerId);
  }

  /**
   * Get statistics
   */
  getStats(): RenewalStats {
    return { ...this.stats };
  }

  // Private methods

  private buildOpportunity(
    customerId: string,
    customerData: Record<string, unknown>
  ): RenewalOpportunity {
    const currentValue = Number(customerData.contract_value) || 0;
    const renewalDate = customerData.renewal_date
      ? new Date(String(customerData.renewal_date))
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const daysToRenewal = Math.max(0, Math.ceil(
      (renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ));

    const healthScore = Number(customerData.health_score) || 50;
    const usageGrowth = Number(customerData.usage_growth) || 0;
    const expansion = Math.max(0, currentValue * (usageGrowth / 100));

    let probability = healthScore / 100;
    let status: RenewalOpportunity['status'] = 'upcoming';

    if (daysToRenewal <= 30 && probability >= 0.8) {
      status = 'in_progress';
    } else if (probability < 0.5) {
      status = 'at_risk';
      probability = Math.max(0.2, probability);
    }

    return {
      id: generateId(),
      customerId,
      currentValue,
      renewalValue: currentValue,
      expansionValue: expansion,
      probability,
      renewalDate,
      daysToRenewal,
      status,
    };
  }

  private identifyRisks(
    customerData: Record<string, unknown>,
    opportunity: RenewalOpportunity
  ): RenewalRisk[] {
    const risks: RenewalRisk[] = [];

    // Engagement risk
    const engagement = Number(customerData.engagement_score) || 50;
    if (engagement < this.config.engagementThreshold) {
      risks.push({
        id: generateId(),
        type: 'engagement',
        severity: engagement < 30 ? 'critical' : engagement < 40 ? 'high' : 'medium',
        description: 'Low engagement indicates potential churn risk',
        indicators: ['Decreased login frequency', 'Reduced feature usage', 'Inactive users'],
        mitigation: 'Launch re-engagement campaign and schedule success review',
        impact: opportunity.renewalValue * (1 - engagement / 100),
      });
    }

    // Satisfaction risk
    const nps = Number(customerData.nps_score) || 0;
    if (nps < 7) {
      risks.push({
        id: generateId(),
        type: 'satisfaction',
        severity: nps < 5 ? 'critical' : nps < 6 ? 'high' : 'medium',
        description: 'Low satisfaction score indicates unhappy customer',
        indicators: ['Low NPS', 'Negative feedback', 'Support escalations'],
        mitigation: 'Schedule executive business review to address concerns',
        impact: opportunity.renewalValue * 0.4,
      });
    }

    // Budget risk
    const budgetConcern = customerData.budget_concern as boolean;
    if (budgetConcern) {
      risks.push({
        id: generateId(),
        type: 'budget',
        severity: 'high',
        description: 'Customer has expressed budget concerns',
        indicators: ['Budget reduction discussions', 'Procurement delays', 'ROI questions'],
        mitigation: 'Prepare ROI analysis and flexible payment options',
        impact: opportunity.renewalValue * 0.3,
      });
    }

    // Champion risk
    const championLeft = customerData.champion_left as boolean;
    if (championLeft) {
      risks.push({
        id: generateId(),
        type: 'champion',
        severity: 'high',
        description: 'Key champion has left the organization',
        indicators: ['Contact changed roles', 'New decision maker', 'Re-evaluation requested'],
        mitigation: 'Identify and build relationship with new stakeholders',
        impact: opportunity.renewalValue * 0.25,
      });
    }

    // Competitive risk
    const competitorActivity = customerData.competitor_activity as boolean;
    if (competitorActivity) {
      risks.push({
        id: generateId(),
        type: 'competitive',
        severity: 'high',
        description: 'Competitor activity detected',
        indicators: ['Competitor mentioned', 'RFP/RFI received', 'Feature comparison requests'],
        mitigation: 'Prepare competitive battle card and schedule value demonstration',
        impact: opportunity.renewalValue * 0.5,
      });
    }

    // Value perception risk
    const valueScore = Number(customerData.value_score) || 70;
    if (valueScore < 60) {
      risks.push({
        id: generateId(),
        type: 'value',
        severity: valueScore < 40 ? 'critical' : 'medium',
        description: 'Customer may not perceive sufficient value',
        indicators: ['Low feature adoption', 'Unclear ROI', 'Underutilization'],
        mitigation: 'Conduct value assessment and present business impact report',
        impact: opportunity.renewalValue * 0.35,
      });
    }

    return risks.sort((a, b) => b.impact - a.impact);
  }

  private buildTimeline(
    opportunity: RenewalOpportunity,
    customerData: Record<string, unknown>
  ): RenewalTimeline {
    const renewalDate = opportunity.renewalDate;
    const milestones: RenewalMilestone[] = [];

    // Generate milestones based on days to renewal
    const daysOut = opportunity.daysToRenewal;

    if (daysOut > 90) {
      milestones.push({
        id: generateId(),
        name: 'Health Check',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'pending',
        owner: 'CSM',
      });
    }

    if (daysOut > 60) {
      milestones.push({
        id: generateId(),
        name: 'Renewal Discussion',
        dueDate: new Date(renewalDate.getTime() - 60 * 24 * 60 * 60 * 1000),
        status: daysOut <= 60 ? 'pending' : 'pending',
        owner: 'Account Manager',
      });
    }

    if (daysOut > 45) {
      milestones.push({
        id: generateId(),
        name: 'Proposal Delivery',
        dueDate: new Date(renewalDate.getTime() - 45 * 24 * 60 * 60 * 1000),
        status: 'pending',
        owner: 'Account Manager',
      });
    }

    if (daysOut > 30) {
      milestones.push({
        id: generateId(),
        name: 'Contract Review',
        dueDate: new Date(renewalDate.getTime() - 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
        owner: 'Legal',
      });
    }

    if (daysOut > 14) {
      milestones.push({
        id: generateId(),
        name: 'Final Negotiation',
        dueDate: new Date(renewalDate.getTime() - 14 * 24 * 60 * 60 * 1000),
        status: 'pending',
        owner: 'Account Manager',
      });
    }

    milestones.push({
      id: generateId(),
      name: 'Contract Signature',
      dueDate: new Date(renewalDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      status: 'pending',
      owner: 'Account Manager',
    });

    const nextMilestone = milestones.find(m => m.status === 'pending');

    return {
      renewalDate,
      milestones,
      criticalPath: milestones.map(m => m.name),
      nextAction: nextMilestone?.name || 'Monitor',
      nextActionDate: nextMilestone?.dueDate || renewalDate,
    };
  }

  private generateRecommendations(
    opportunity: RenewalOpportunity,
    risks: RenewalRisk[],
    timeline: RenewalTimeline
  ): RenewalRecommendation[] {
    const recommendations: RenewalRecommendation[] = [];

    // At-risk recommendations
    if (opportunity.status === 'at_risk') {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'retention',
        action: 'executive_engagement',
        description: 'Schedule executive engagement to address churn risk',
        expectedOutcome: opportunity.renewalValue * 0.3,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    // Risk-specific recommendations
    for (const risk of risks.filter(r => r.severity === 'critical' || r.severity === 'high')) {
      recommendations.push({
        id: generateId(),
        priority: risk.severity === 'critical' ? 1 : 2,
        type: 'retention',
        action: `mitigate_${risk.type}_risk`,
        description: risk.mitigation,
        expectedOutcome: risk.impact * 0.5,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
    }

    // Expansion opportunity
    if (opportunity.expansionValue > 0) {
      recommendations.push({
        id: generateId(),
        priority: 3,
        type: 'expansion',
        action: 'expansion_discussion',
        description: `Discuss expansion opportunity of ${opportunity.expansionValue.toFixed(0)}`,
        expectedOutcome: opportunity.expansionValue,
        dueDate: new Date(opportunity.renewalDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      });
    }

    // Timing-based recommendations
    if (opportunity.daysToRenewal <= 30 && opportunity.status === 'upcoming') {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'timing',
        action: 'accelerate_renewal',
        description: 'Renewal approaching - accelerate negotiation process',
        expectedOutcome: opportunity.renewalValue * 0.1,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    // Value demonstration
    if (opportunity.probability < 0.7) {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'value',
        action: 'value_demonstration',
        description: 'Present business impact and ROI report',
        expectedOutcome: opportunity.renewalValue * 0.15,
        dueDate: timeline.nextActionDate,
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private updateStats(analysis?: RenewalAnalysis): void {
    if (analysis) {
      this.stats.totalAnalyses++;
    }

    const opportunities = Array.from(this.opportunities.values());

    this.stats.upcomingRenewals = opportunities.filter(
      o => o.status !== 'secured' && o.status !== 'churned'
    ).length;

    this.stats.atRiskValue = opportunities
      .filter(o => o.status === 'at_risk')
      .reduce((sum, o) => sum + o.renewalValue, 0);

    this.stats.expansionPipeline = opportunities
      .reduce((sum, o) => sum + o.expansionValue, 0);

    const secured = opportunities.filter(o => o.status === 'secured').length;
    const churned = opportunities.filter(o => o.status === 'churned').length;
    const completed = secured + churned;
    this.stats.renewalRate = completed > 0 ? (secured / completed) * 100 : 0;
  }
}

export default RenewalAgent;
