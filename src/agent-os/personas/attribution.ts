/**
 * Attribution Agent
 * Specialized agent for revenue attribution, marketing ROI, and touchpoint analysis
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Attribution Agent Types
// ============================================================

export interface AttributionAnalysis {
  id: string;
  timestamp: Date;
  dealId: string;
  model: AttributionModel;
  touchpoints: TouchpointValue[];
  recommendations: AttributionRecommendation[];
  accuracy: AttributionAccuracy;
}

export interface AttributionModel {
  id: string;
  name: string;
  type: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based' | 'data_driven';
  description: string;
  weights: Record<string, number>;
  confidence: number;
}

export interface TouchpointValue {
  id: string;
  type: string;
  channel: string;
  campaign?: string;
  timestamp: Date;
  position: number;
  rawValue: number;
  attributedValue: number;
  attributedRevenue: number;
  influence: number;
}

export interface AttributionRecommendation {
  id: string;
  priority: number;
  type: 'channel' | 'campaign' | 'timing' | 'model' | 'investment';
  action: string;
  description: string;
  expectedImpact: number;
  confidence: number;
}

export interface AttributionAccuracy {
  overall: number;
  byModel: Record<string, number>;
  variance: number;
  confidence: number;
}

export interface ChannelPerformance {
  channel: string;
  touchpoints: number;
  attributedRevenue: number;
  avgInfluence: number;
  costPerAcquisition: number;
  roi: number;
}

export interface AttributionConfig {
  defaultModel: AttributionModel['type'];
  positionWeights: {
    first: number;
    middle: number;
    last: number;
  };
  decayHalfLife: number;
  minTouchpoints: number;
}

export interface AttributionStats {
  totalAnalyses: number;
  touchpointsAttributed: number;
  totalAttributedRevenue: number;
  topChannel: string;
  avgTouchpointsPerDeal: number;
}

// ============================================================
// Attribution Agent Implementation
// ============================================================

export class AttributionAgent {
  private analyses: Map<string, AttributionAnalysis> = new Map();
  private channelPerformance: Map<string, ChannelPerformance> = new Map();
  private config: AttributionConfig;
  private stats: AttributionStats;

  constructor(config?: Partial<AttributionConfig>) {
    this.config = {
      defaultModel: 'position_based',
      positionWeights: {
        first: 0.4,
        middle: 0.2,
        last: 0.4,
      },
      decayHalfLife: 7,
      minTouchpoints: 1,
      ...config,
    };

    this.stats = {
      totalAnalyses: 0,
      touchpointsAttributed: 0,
      totalAttributedRevenue: 0,
      topChannel: '',
      avgTouchpointsPerDeal: 0,
    };
  }

  /**
   * Analyze attribution for a deal
   */
  analyzeAttribution(
    dealId: string,
    dealValue: number,
    touchpoints: Array<{
      id: string;
      type: string;
      channel: string;
      campaign?: string;
      timestamp: Date;
    }>,
    modelType?: AttributionModel['type']
  ): AttributionAnalysis {
    const model = this.buildModel(modelType || this.config.defaultModel);
    const attributedTouchpoints = this.calculateAttribution(touchpoints, dealValue, model);
    const recommendations = this.generateRecommendations(attributedTouchpoints, dealValue);
    const accuracy = this.calculateAccuracy(attributedTouchpoints, model);

    const analysis: AttributionAnalysis = {
      id: generateId(),
      timestamp: new Date(),
      dealId,
      model,
      touchpoints: attributedTouchpoints,
      recommendations,
      accuracy,
    };

    this.analyses.set(analysis.id, analysis);
    this.updateChannelPerformance(attributedTouchpoints);
    this.updateStats(analysis, touchpoints.length);

    return analysis;
  }

  /**
   * Compare attribution models
   */
  compareModels(
    dealId: string,
    dealValue: number,
    touchpoints: Array<{
      id: string;
      type: string;
      channel: string;
      campaign?: string;
      timestamp: Date;
    }>
  ): Map<string, TouchpointValue[]> {
    const models: AttributionModel['type'][] = [
      'first_touch',
      'last_touch',
      'linear',
      'time_decay',
      'position_based',
    ];

    const results = new Map<string, TouchpointValue[]>();

    for (const modelType of models) {
      const model = this.buildModel(modelType);
      const attributed = this.calculateAttribution(touchpoints, dealValue, model);
      results.set(modelType, attributed);
    }

    return results;
  }

  /**
   * Get channel performance
   */
  getChannelPerformance(): ChannelPerformance[] {
    return Array.from(this.channelPerformance.values())
      .sort((a, b) => b.attributedRevenue - a.attributedRevenue);
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(id: string): AttributionAnalysis | undefined {
    return this.analyses.get(id);
  }

  /**
   * Get statistics
   */
  getStats(): AttributionStats {
    return { ...this.stats };
  }

  // Private methods

  private buildModel(type: AttributionModel['type']): AttributionModel {
    const models: Record<AttributionModel['type'], Partial<AttributionModel>> = {
      first_touch: {
        name: 'First Touch',
        description: '100% credit to first interaction',
        weights: { first: 1, middle: 0, last: 0 },
        confidence: 0.6,
      },
      last_touch: {
        name: 'Last Touch',
        description: '100% credit to last interaction',
        weights: { first: 0, middle: 0, last: 1 },
        confidence: 0.6,
      },
      linear: {
        name: 'Linear',
        description: 'Equal credit to all touchpoints',
        weights: { first: 1, middle: 1, last: 1 },
        confidence: 0.7,
      },
      time_decay: {
        name: 'Time Decay',
        description: 'More credit to recent touchpoints',
        weights: { first: 0.1, middle: 0.3, last: 0.6 },
        confidence: 0.75,
      },
      position_based: {
        name: 'Position Based',
        description: '40/20/40 split between first, middle, and last',
        weights: this.config.positionWeights,
        confidence: 0.8,
      },
      data_driven: {
        name: 'Data Driven',
        description: 'ML-based attribution using historical patterns',
        weights: { first: 0.35, middle: 0.3, last: 0.35 },
        confidence: 0.85,
      },
    };

    const modelInfo = models[type];

    return {
      id: generateId(),
      type,
      name: modelInfo.name || type,
      description: modelInfo.description || '',
      weights: modelInfo.weights || {},
      confidence: modelInfo.confidence || 0.5,
    };
  }

  private calculateAttribution(
    touchpoints: Array<{
      id: string;
      type: string;
      channel: string;
      campaign?: string;
      timestamp: Date;
    }>,
    dealValue: number,
    model: AttributionModel
  ): TouchpointValue[] {
    if (touchpoints.length === 0) return [];

    // Sort by timestamp
    const sorted = [...touchpoints].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const attributed: TouchpointValue[] = [];
    const totalTouchpoints = sorted.length;

    for (let i = 0; i < sorted.length; i++) {
      const tp = sorted[i];
      const position = i;
      let weight: number;

      switch (model.type) {
        case 'first_touch':
          weight = i === 0 ? 1 : 0;
          break;

        case 'last_touch':
          weight = i === totalTouchpoints - 1 ? 1 : 0;
          break;

        case 'linear':
          weight = 1 / totalTouchpoints;
          break;

        case 'time_decay':
          // More recent = higher weight
          const daysFromEnd = (sorted[sorted.length - 1].timestamp.getTime() - new Date(tp.timestamp).getTime()) / (1000 * 60 * 60 * 24);
          weight = Math.pow(0.5, daysFromEnd / this.config.decayHalfLife);
          break;

        case 'position_based':
          if (i === 0) {
            weight = model.weights.first || 0.4;
          } else if (i === totalTouchpoints - 1) {
            weight = model.weights.last || 0.4;
          } else {
            weight = (model.weights.middle || 0.2) / Math.max(1, totalTouchpoints - 2);
          }
          break;

        case 'data_driven':
          // Simplified data-driven: use position + channel weights
          const positionWeight = this.getPositionWeight(i, totalTouchpoints);
          const channelWeight = this.getChannelWeight(tp.channel);
          weight = (positionWeight + channelWeight) / 2;
          break;

        default:
          weight = 1 / totalTouchpoints;
      }

      const attributedValue = weight;
      const attributedRevenue = dealValue * weight;

      attributed.push({
        id: tp.id,
        type: tp.type,
        channel: tp.channel,
        campaign: tp.campaign,
        timestamp: new Date(tp.timestamp),
        position,
        rawValue: 1,
        attributedValue: Math.round(attributedValue * 100) / 100,
        attributedRevenue: Math.round(attributedRevenue * 100) / 100,
        influence: Math.round(weight * 100),
      });
    }

    // Normalize if using time decay
    if (model.type === 'time_decay' || model.type === 'data_driven') {
      const totalWeight = attributed.reduce((sum, t) => sum + t.attributedValue, 0);
      if (totalWeight > 0) {
        for (const t of attributed) {
          t.attributedValue = t.attributedValue / totalWeight;
          t.attributedRevenue = dealValue * t.attributedValue;
          t.influence = Math.round(t.attributedValue * 100);
        }
      }
    }

    return attributed;
  }

  private getPositionWeight(position: number, total: number): number {
    if (total <= 1) return 1;
    if (position === 0) return 0.3;
    if (position === total - 1) return 0.4;
    return 0.3 / (total - 2);
  }

  private getChannelWeight(channel: string): number {
    const channelWeights: Record<string, number> = {
      direct: 0.9,
      organic_search: 0.7,
      paid_search: 0.8,
      email: 0.75,
      social: 0.5,
      referral: 0.8,
      display: 0.4,
      other: 0.5,
    };
    return channelWeights[channel.toLowerCase()] || 0.5;
  }

  private generateRecommendations(
    touchpoints: TouchpointValue[],
    dealValue: number
  ): AttributionRecommendation[] {
    const recommendations: AttributionRecommendation[] = [];

    if (touchpoints.length === 0) return recommendations;

    // Analyze channel distribution
    const channelRevenue = new Map<string, number>();
    for (const tp of touchpoints) {
      const current = channelRevenue.get(tp.channel) || 0;
      channelRevenue.set(tp.channel, current + tp.attributedRevenue);
    }

    // Find top and bottom channels
    const sorted = Array.from(channelRevenue.entries()).sort((a, b) => b[1] - a[1]);
    const topChannel = sorted[0];
    const bottomChannel = sorted[sorted.length - 1];

    if (topChannel) {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'investment',
        action: 'increase_top_channel',
        description: `Increase investment in ${topChannel[0]} - highest attributed revenue`,
        expectedImpact: topChannel[1] * 0.2,
        confidence: 0.75,
      });
    }

    if (bottomChannel && sorted.length > 2) {
      recommendations.push({
        id: generateId(),
        priority: 3,
        type: 'channel',
        action: 'evaluate_low_performer',
        description: `Evaluate ${bottomChannel[0]} channel performance - lowest attribution`,
        expectedImpact: bottomChannel[1] * 0.5,
        confidence: 0.6,
      });
    }

    // Multi-touch insights
    if (touchpoints.length > 5) {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'timing',
        action: 'optimize_journey',
        description: 'Long buyer journey detected - consider nurture optimization',
        expectedImpact: dealValue * 0.1,
        confidence: 0.7,
      });
    }

    if (touchpoints.length === 1) {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'channel',
        action: 'expand_touchpoints',
        description: 'Single touchpoint attribution - expand channel coverage',
        expectedImpact: dealValue * 0.15,
        confidence: 0.65,
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private calculateAccuracy(
    touchpoints: TouchpointValue[],
    model: AttributionModel
  ): AttributionAccuracy {
    // Calculate variance across touchpoints
    const values = touchpoints.map(t => t.attributedValue);
    const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const variance = values.length > 0
      ? values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
      : 0;

    return {
      overall: model.confidence * 100,
      byModel: {
        [model.type]: model.confidence * 100,
      },
      variance: Math.round(variance * 100) / 100,
      confidence: model.confidence,
    };
  }

  private updateChannelPerformance(touchpoints: TouchpointValue[]): void {
    for (const tp of touchpoints) {
      let perf = this.channelPerformance.get(tp.channel);
      
      if (!perf) {
        perf = {
          channel: tp.channel,
          touchpoints: 0,
          attributedRevenue: 0,
          avgInfluence: 0,
          costPerAcquisition: 0,
          roi: 0,
        };
        this.channelPerformance.set(tp.channel, perf);
      }

      perf.touchpoints++;
      perf.attributedRevenue += tp.attributedRevenue;
      perf.avgInfluence = (perf.avgInfluence * (perf.touchpoints - 1) + tp.influence) / perf.touchpoints;
    }
  }

  private updateStats(analysis: AttributionAnalysis, touchpointCount: number): void {
    this.stats.totalAnalyses++;
    this.stats.touchpointsAttributed += touchpointCount;
    this.stats.totalAttributedRevenue += analysis.touchpoints.reduce((sum, t) => sum + t.attributedRevenue, 0);

    // Update average touchpoints
    this.stats.avgTouchpointsPerDeal = Math.round(
      this.stats.touchpointsAttributed / this.stats.totalAnalyses * 10
    ) / 10;

    // Find top channel
    const channels = this.getChannelPerformance();
    if (channels.length > 0) {
      this.stats.topChannel = channels[0].channel;
    }
  }
}

export default AttributionAgent;
