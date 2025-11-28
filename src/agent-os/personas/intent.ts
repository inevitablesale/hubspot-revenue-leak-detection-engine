/**
 * Intent Agent
 * Specialized agent for buyer intent detection, signal analysis, and engagement prediction
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Intent Agent Types
// ============================================================

export interface IntentAnalysis {
  id: string;
  timestamp: Date;
  entityId: string;
  entityType: 'contact' | 'company' | 'deal';
  overallIntent: BuyerIntent;
  signals: IntentSignal[];
  recommendations: IntentRecommendation[];
  engagement: EngagementPrediction;
}

export interface BuyerIntent {
  score: number;
  level: 'cold' | 'warm' | 'hot' | 'active';
  stage: 'awareness' | 'consideration' | 'decision' | 'purchase';
  trend: 'increasing' | 'stable' | 'decreasing';
  confidence: number;
  topics: string[];
}

export interface IntentSignal {
  id: string;
  type: 'behavioral' | 'engagement' | 'content' | 'search' | 'social' | 'competitive';
  source: string;
  strength: number;
  timestamp: Date;
  description: string;
  context?: Record<string, unknown>;
}

export interface IntentRecommendation {
  id: string;
  priority: number;
  type: 'outreach' | 'content' | 'nurture' | 'sales_ready' | 'timing';
  action: string;
  description: string;
  expectedOutcome: number;
  urgency: 'immediate' | 'soon' | 'planned';
}

export interface EngagementPrediction {
  nextAction: string;
  predictedTiming: Date;
  probability: number;
  suggestedChannel: string;
  suggestedContent: string;
}

export interface IntentConfig {
  signalWeights: Record<string, number>;
  thresholds: {
    cold: number;
    warm: number;
    hot: number;
    active: number;
  };
  decayDays: number;
  minSignals: number;
}

export interface IntentStats {
  totalAnalyses: number;
  activeIntents: number;
  avgIntentScore: number;
  signalsProcessed: number;
  conversionsFromIntent: number;
}

// ============================================================
// Intent Agent Implementation
// ============================================================

export class IntentAgent {
  private analyses: Map<string, IntentAnalysis> = new Map();
  private entityIntents: Map<string, BuyerIntent> = new Map();
  private config: IntentConfig;
  private stats: IntentStats;

  constructor(config?: Partial<IntentConfig>) {
    this.config = {
      signalWeights: {
        behavioral: 1.0,
        engagement: 0.9,
        content: 0.8,
        search: 0.85,
        social: 0.6,
        competitive: 0.95,
      },
      thresholds: {
        cold: 25,
        warm: 50,
        hot: 75,
        active: 90,
      },
      decayDays: 14,
      minSignals: 2,
      ...config,
    };

    this.stats = {
      totalAnalyses: 0,
      activeIntents: 0,
      avgIntentScore: 0,
      signalsProcessed: 0,
      conversionsFromIntent: 0,
    };
  }

  /**
   * Analyze intent for an entity
   */
  analyzeIntent(
    entityId: string,
    entityType: IntentAnalysis['entityType'],
    signals: Array<{
      type: IntentSignal['type'];
      source: string;
      strength: number;
      timestamp: Date;
      description: string;
      context?: Record<string, unknown>;
    }>
  ): IntentAnalysis {
    const processedSignals = this.processSignals(signals);
    const overallIntent = this.calculateIntent(processedSignals);
    const engagement = this.predictEngagement(overallIntent, processedSignals);
    const recommendations = this.generateRecommendations(overallIntent, processedSignals);

    const analysis: IntentAnalysis = {
      id: generateId(),
      timestamp: new Date(),
      entityId,
      entityType,
      overallIntent,
      signals: processedSignals,
      recommendations,
      engagement,
    };

    this.analyses.set(analysis.id, analysis);
    this.entityIntents.set(entityId, overallIntent);
    this.updateStats(analysis, signals.length);

    return analysis;
  }

  /**
   * Get high-intent entities
   */
  getHighIntentEntities(): Array<{ entityId: string; intent: BuyerIntent }> {
    const highIntent: Array<{ entityId: string; intent: BuyerIntent }> = [];

    for (const [entityId, intent] of this.entityIntents) {
      if (intent.level === 'hot' || intent.level === 'active') {
        highIntent.push({ entityId, intent });
      }
    }

    return highIntent.sort((a, b) => b.intent.score - a.intent.score);
  }

  /**
   * Add signal to entity
   */
  addSignal(
    entityId: string,
    signal: {
      type: IntentSignal['type'];
      source: string;
      strength: number;
      description: string;
      context?: Record<string, unknown>;
    }
  ): BuyerIntent {
    const existingIntent = this.entityIntents.get(entityId);
    
    const newSignal: IntentSignal = {
      id: generateId(),
      ...signal,
      timestamp: new Date(),
    };

    const signals = [newSignal];
    
    // If we have existing analysis, merge signals
    const existingAnalysis = Array.from(this.analyses.values())
      .find(a => a.entityId === entityId);
    
    if (existingAnalysis) {
      signals.push(...existingAnalysis.signals);
    }

    const processedSignals = this.processSignals(signals.map(s => ({
      type: s.type,
      source: s.source,
      strength: s.strength,
      timestamp: s.timestamp,
      description: s.description,
      context: s.context,
    })));

    const newIntent = this.calculateIntent(processedSignals);
    this.entityIntents.set(entityId, newIntent);
    this.stats.signalsProcessed++;

    return newIntent;
  }

  /**
   * Record conversion
   */
  recordConversion(entityId: string): void {
    const intent = this.entityIntents.get(entityId);
    if (intent && (intent.level === 'hot' || intent.level === 'active')) {
      this.stats.conversionsFromIntent++;
    }
  }

  /**
   * Get intent for entity
   */
  getIntent(entityId: string): BuyerIntent | undefined {
    return this.entityIntents.get(entityId);
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(id: string): IntentAnalysis | undefined {
    return this.analyses.get(id);
  }

  /**
   * Get statistics
   */
  getStats(): IntentStats {
    return { ...this.stats };
  }

  // Private methods

  private processSignals(
    signals: Array<{
      type: IntentSignal['type'];
      source: string;
      strength: number;
      timestamp: Date;
      description: string;
      context?: Record<string, unknown>;
    }>
  ): IntentSignal[] {
    const now = Date.now();
    
    return signals.map(signal => {
      // Apply time decay
      const daysSince = (now - new Date(signal.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      const decayFactor = Math.pow(0.5, daysSince / this.config.decayDays);
      
      // Apply type weight
      const typeWeight = this.config.signalWeights[signal.type] || 0.5;
      
      const adjustedStrength = signal.strength * decayFactor * typeWeight;

      return {
        id: generateId(),
        type: signal.type,
        source: signal.source,
        strength: Math.round(adjustedStrength * 100) / 100,
        timestamp: new Date(signal.timestamp),
        description: signal.description,
        context: signal.context,
      };
    }).filter(s => s.strength > 0.1); // Filter out decayed signals
  }

  private calculateIntent(signals: IntentSignal[]): BuyerIntent {
    if (signals.length < this.config.minSignals) {
      return {
        score: 0,
        level: 'cold',
        stage: 'awareness',
        trend: 'stable',
        confidence: 0.3,
        topics: [],
      };
    }

    // Calculate weighted score
    const totalStrength = signals.reduce((sum, s) => sum + s.strength, 0);
    const avgStrength = totalStrength / signals.length;
    
    // Boost for multiple signals
    const signalBonus = Math.min(signals.length / 10, 0.3);
    const score = Math.min(100, (avgStrength * 100) + (signalBonus * 100));

    // Determine level
    const thresholds = this.config.thresholds;
    let level: BuyerIntent['level'];
    if (score >= thresholds.active) {
      level = 'active';
    } else if (score >= thresholds.hot) {
      level = 'hot';
    } else if (score >= thresholds.warm) {
      level = 'warm';
    } else {
      level = 'cold';
    }

    // Determine stage based on signal types
    const stage = this.determineStage(signals);

    // Determine trend based on recent signals
    const trend = this.determineTrend(signals);

    // Extract topics from signals
    const topics = this.extractTopics(signals);

    // Calculate confidence based on signal count and consistency
    const confidence = Math.min(0.95, 0.5 + (signals.length / 20));

    return {
      score: Math.round(score),
      level,
      stage,
      trend,
      confidence,
      topics,
    };
  }

  private determineStage(signals: IntentSignal[]): BuyerIntent['stage'] {
    const typeScores: Record<BuyerIntent['stage'], number> = {
      awareness: 0,
      consideration: 0,
      decision: 0,
      purchase: 0,
    };

    for (const signal of signals) {
      // Map signal types to stages
      if (signal.type === 'content' || signal.type === 'social') {
        typeScores.awareness += signal.strength;
      }
      if (signal.type === 'search' || signal.type === 'competitive') {
        typeScores.consideration += signal.strength;
      }
      if (signal.type === 'engagement') {
        typeScores.decision += signal.strength;
      }
      if (signal.type === 'behavioral') {
        typeScores.purchase += signal.strength;
      }
    }

    // Return highest scoring stage
    let maxStage: BuyerIntent['stage'] = 'awareness';
    let maxScore = 0;

    for (const [stage, score] of Object.entries(typeScores)) {
      if (score > maxScore) {
        maxScore = score;
        maxStage = stage as BuyerIntent['stage'];
      }
    }

    return maxStage;
  }

  private determineTrend(signals: IntentSignal[]): BuyerIntent['trend'] {
    if (signals.length < 3) return 'stable';

    // Sort by timestamp
    const sorted = [...signals].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Compare recent vs older signals
    const mid = Math.floor(sorted.length / 2);
    const older = sorted.slice(0, mid);
    const recent = sorted.slice(mid);

    const olderAvg = older.reduce((sum, s) => sum + s.strength, 0) / older.length;
    const recentAvg = recent.reduce((sum, s) => sum + s.strength, 0) / recent.length;

    if (recentAvg > olderAvg * 1.2) return 'increasing';
    if (recentAvg < olderAvg * 0.8) return 'decreasing';
    return 'stable';
  }

  private extractTopics(signals: IntentSignal[]): string[] {
    const topics = new Set<string>();

    for (const signal of signals) {
      if (signal.context?.topic) {
        topics.add(String(signal.context.topic));
      }
      if (signal.context?.keyword) {
        topics.add(String(signal.context.keyword));
      }
      if (signal.context?.category) {
        topics.add(String(signal.context.category));
      }
    }

    return Array.from(topics).slice(0, 5);
  }

  private predictEngagement(
    intent: BuyerIntent,
    signals: IntentSignal[]
  ): EngagementPrediction {
    // Determine next action based on intent level
    let nextAction: string;
    let suggestedChannel: string;
    let suggestedContent: string;

    switch (intent.level) {
      case 'active':
        nextAction = 'Direct sales outreach';
        suggestedChannel = 'phone';
        suggestedContent = 'Proposal or demo';
        break;
      case 'hot':
        nextAction = 'Sales qualification call';
        suggestedChannel = 'email';
        suggestedContent = 'Case study or ROI calculator';
        break;
      case 'warm':
        nextAction = 'Nurture with targeted content';
        suggestedChannel = 'email';
        suggestedContent = 'Educational content';
        break;
      default:
        nextAction = 'Add to awareness campaign';
        suggestedChannel = 'ads';
        suggestedContent = 'Thought leadership';
    }

    // Predict timing based on engagement patterns
    const avgGapDays = this.calculateAvgSignalGap(signals);
    const predictedTiming = new Date(Date.now() + avgGapDays * 24 * 60 * 60 * 1000);

    return {
      nextAction,
      predictedTiming,
      probability: intent.confidence,
      suggestedChannel,
      suggestedContent,
    };
  }

  private calculateAvgSignalGap(signals: IntentSignal[]): number {
    if (signals.length < 2) return 7; // Default to 7 days

    const sorted = [...signals].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    let totalGap = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gap = (sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24);
      totalGap += gap;
    }

    return Math.max(1, Math.round(totalGap / (sorted.length - 1)));
  }

  private generateRecommendations(
    intent: BuyerIntent,
    signals: IntentSignal[]
  ): IntentRecommendation[] {
    const recommendations: IntentRecommendation[] = [];

    // Active intent - sales ready
    if (intent.level === 'active') {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'sales_ready',
        action: 'assign_to_sales',
        description: 'Assign to sales immediately - buyer is actively engaged',
        expectedOutcome: 80,
        urgency: 'immediate',
      });
    }

    // Hot intent - qualification
    if (intent.level === 'hot') {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'outreach',
        action: 'sales_outreach',
        description: 'Schedule sales qualification call',
        expectedOutcome: 60,
        urgency: 'immediate',
      });
    }

    // Warm intent - nurture
    if (intent.level === 'warm') {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'nurture',
        action: 'add_to_nurture',
        description: 'Add to targeted nurture sequence',
        expectedOutcome: 40,
        urgency: 'soon',
      });
    }

    // Increasing trend
    if (intent.trend === 'increasing') {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'timing',
        action: 'accelerate_engagement',
        description: 'Intent increasing - accelerate engagement before competitor',
        expectedOutcome: 25,
        urgency: 'soon',
      });
    }

    // Decreasing trend
    if (intent.trend === 'decreasing') {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'content',
        action: 're_engage',
        description: 'Intent declining - send re-engagement content',
        expectedOutcome: 20,
        urgency: 'soon',
      });
    }

    // Competitive signals
    const competitiveSignals = signals.filter(s => s.type === 'competitive');
    if (competitiveSignals.length > 0) {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'outreach',
        action: 'competitive_response',
        description: 'Competitive activity detected - immediate response needed',
        expectedOutcome: 50,
        urgency: 'immediate',
      });
    }

    // Content recommendations based on topics
    if (intent.topics.length > 0) {
      recommendations.push({
        id: generateId(),
        priority: 3,
        type: 'content',
        action: 'send_relevant_content',
        description: `Send content related to: ${intent.topics.slice(0, 3).join(', ')}`,
        expectedOutcome: 30,
        urgency: 'planned',
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private updateStats(analysis: IntentAnalysis, signalCount: number): void {
    this.stats.totalAnalyses++;
    this.stats.signalsProcessed += signalCount;

    // Count active intents
    this.stats.activeIntents = Array.from(this.entityIntents.values())
      .filter(i => i.level === 'hot' || i.level === 'active')
      .length;

    // Calculate average intent score
    const scores = Array.from(this.entityIntents.values()).map(i => i.score);
    this.stats.avgIntentScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  }
}

export default IntentAgent;
