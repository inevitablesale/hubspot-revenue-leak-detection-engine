/**
 * Autonomy Scores Module
 * Turns the Agent OS into a measurable platform by tracking and scoring
 * the system's autonomous capabilities and self-management abilities
 */

import { generateId } from '../utils/helpers';

// ============================================================
// Autonomy Scores Types
// ============================================================

export type AutonomyDimension = 
  | 'detection'
  | 'analysis' 
  | 'decision'
  | 'execution'
  | 'learning'
  | 'adaptation'
  | 'recovery'
  | 'monitoring';

export type MaturityLevel = 'manual' | 'assisted' | 'partial' | 'conditional' | 'high' | 'full';

export interface AutonomyScore {
  id: string;
  portalId: string;
  overallScore: number; // 0-100
  maturityLevel: MaturityLevel;
  dimensions: DimensionScore[];
  capabilities: CapabilityScore[];
  trends: AutonomyTrend[];
  benchmark: AutonomyBenchmark;
  calculatedAt: Date;
  validUntil: Date;
}

export interface DimensionScore {
  dimension: AutonomyDimension;
  score: number; // 0-100
  weight: number;
  maturityLevel: MaturityLevel;
  factors: AutonomyFactor[];
  recommendations: string[];
}

export interface AutonomyFactor {
  id: string;
  name: string;
  description: string;
  currentState: string;
  targetState: string;
  score: number;
  weight: number;
  automated: boolean;
  requiresHuman: boolean;
}

export interface CapabilityScore {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  automationLevel: number; // 0-100
  accuracy: number;
  reliability: number;
  efficiency: number;
  overallScore: number;
  lastEvaluated: Date;
}

export interface AutonomyTrend {
  dimension: AutonomyDimension;
  period: string;
  scores: { date: Date; score: number }[];
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
}

export interface AutonomyBenchmark {
  industryAvg: number;
  topPerformer: number;
  bottomPerformer: number;
  percentile: number;
  peerGroup: string;
}

export interface AutonomyGoal {
  id: string;
  portalId: string;
  dimension: AutonomyDimension;
  targetScore: number;
  currentScore: number;
  deadline: Date;
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
  milestones: GoalMilestone[];
  createdAt: Date;
}

export interface GoalMilestone {
  id: string;
  name: string;
  targetDate: Date;
  targetScore: number;
  achieved: boolean;
  achievedAt?: Date;
  actualScore?: number;
}

export interface AutonomyRoadmap {
  id: string;
  portalId: string;
  phases: RoadmapPhase[];
  currentPhase: number;
  estimatedCompletion: Date;
  totalInvestment: number;
  expectedROI: number;
  createdAt: Date;
}

export interface RoadmapPhase {
  id: string;
  name: string;
  order: number;
  description: string;
  targetMaturityLevel: MaturityLevel;
  initiatives: RoadmapInitiative[];
  duration: number; // days
  investment: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface RoadmapInitiative {
  id: string;
  name: string;
  description: string;
  dimension: AutonomyDimension;
  impact: number;
  effort: 'low' | 'medium' | 'high';
  automated: boolean;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

export interface AutonomyReport {
  id: string;
  portalId: string;
  period: { start: Date; end: Date };
  currentScore: AutonomyScore;
  previousScore?: AutonomyScore;
  improvement: number;
  highlights: string[];
  concerns: string[];
  recommendations: AutonomyRecommendation[];
  generatedAt: Date;
}

export interface AutonomyRecommendation {
  id: string;
  priority: number;
  dimension: AutonomyDimension;
  title: string;
  description: string;
  expectedImpact: number;
  effort: 'low' | 'medium' | 'high';
  automated: boolean;
  prerequisites: string[];
}

export interface AutonomyScoresConfig {
  enabled: boolean;
  recalculationInterval: number;
  goalTrackingEnabled: boolean;
  benchmarkingEnabled: boolean;
  reportingEnabled: boolean;
}

// ============================================================
// Autonomy Scores Implementation
// ============================================================

export class AutonomyScoresEngine {
  private scores: Map<string, AutonomyScore> = new Map();
  private goals: Map<string, AutonomyGoal> = new Map();
  private roadmaps: Map<string, AutonomyRoadmap> = new Map();
  private reports: Map<string, AutonomyReport> = new Map();
  private config: AutonomyScoresConfig;

  constructor(config?: Partial<AutonomyScoresConfig>) {
    this.config = {
      enabled: true,
      recalculationInterval: 86400000, // 24 hours
      goalTrackingEnabled: true,
      benchmarkingEnabled: true,
      reportingEnabled: true,
      ...config,
    };
  }

  /**
   * Calculate autonomy score for a portal
   */
  calculateScore(
    portalId: string,
    capabilities: {
      detection: Partial<CapabilityMetrics>;
      analysis: Partial<CapabilityMetrics>;
      decision: Partial<CapabilityMetrics>;
      execution: Partial<CapabilityMetrics>;
      learning: Partial<CapabilityMetrics>;
      adaptation: Partial<CapabilityMetrics>;
      recovery: Partial<CapabilityMetrics>;
      monitoring: Partial<CapabilityMetrics>;
    }
  ): AutonomyScore {
    const dimensions: DimensionScore[] = [];
    const dimensionWeights: Record<AutonomyDimension, number> = {
      detection: 0.15,
      analysis: 0.15,
      decision: 0.15,
      execution: 0.15,
      learning: 0.10,
      adaptation: 0.10,
      recovery: 0.10,
      monitoring: 0.10,
    };

    // Calculate each dimension score
    for (const [dimension, weight] of Object.entries(dimensionWeights) as [AutonomyDimension, number][]) {
      const metrics = capabilities[dimension] || {};
      const dimensionScore = this.calculateDimensionScore(dimension, metrics, weight);
      dimensions.push(dimensionScore);
    }

    // Calculate overall score
    const overallScore = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
    const maturityLevel = this.determineMaturityLevel(overallScore);

    // Calculate capability scores
    const capabilityScores = this.calculateCapabilityScores(capabilities);

    // Calculate trends (using historical data if available)
    const trends = this.calculateTrends(portalId, dimensions);

    // Get benchmark
    const benchmark = this.getBenchmarkValues(overallScore);

    const score: AutonomyScore = {
      id: generateId(),
      portalId,
      overallScore: Math.round(overallScore * 10) / 10,
      maturityLevel,
      dimensions,
      capabilities: capabilityScores,
      trends,
      benchmark,
      calculatedAt: new Date(),
      validUntil: new Date(Date.now() + this.config.recalculationInterval),
    };

    // Store score
    this.scores.set(`${portalId}-latest`, score);
    this.scores.set(score.id, score);

    return score;
  }

  /**
   * Calculate dimension score
   */
  private calculateDimensionScore(
    dimension: AutonomyDimension,
    metrics: Partial<CapabilityMetrics>,
    weight: number
  ): DimensionScore {
    const factors = this.getDimensionFactors(dimension, metrics);
    const score = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
    const maturityLevel = this.determineMaturityLevel(score);

    return {
      dimension,
      score: Math.round(score * 10) / 10,
      weight,
      maturityLevel,
      factors,
      recommendations: this.generateDimensionRecommendations(dimension, score, factors),
    };
  }

  /**
   * Get factors for a dimension
   */
  private getDimensionFactors(
    dimension: AutonomyDimension,
    metrics: Partial<CapabilityMetrics>
  ): AutonomyFactor[] {
    const baseFactors = this.getBaseFactors(dimension);
    
    return baseFactors.map(factor => ({
      ...factor,
      score: this.evaluateFactor(factor, metrics),
      automated: metrics.automationLevel ? metrics.automationLevel > 80 : false,
    }));
  }

  /**
   * Get base factors for each dimension
   */
  private getBaseFactors(dimension: AutonomyDimension): AutonomyFactor[] {
    const factorTemplates: Record<AutonomyDimension, Partial<AutonomyFactor>[]> = {
      detection: [
        { name: 'Automatic Scanning', description: 'Automated scan for revenue leaks', weight: 0.3, targetState: 'Continuous automated scanning' },
        { name: 'Pattern Recognition', description: 'AI-powered pattern detection', weight: 0.3, targetState: 'ML-based pattern recognition' },
        { name: 'Real-time Alerts', description: 'Instant notification on detection', weight: 0.2, targetState: 'Sub-minute alerting' },
        { name: 'Multi-source Detection', description: 'Detection across multiple data sources', weight: 0.2, targetState: 'Full data integration' },
      ],
      analysis: [
        { name: 'Root Cause Analysis', description: 'Automatic root cause identification', weight: 0.3, targetState: 'AI-driven RCA' },
        { name: 'Impact Assessment', description: 'Automated impact calculation', weight: 0.25, targetState: 'Real-time impact scoring' },
        { name: 'Correlation Analysis', description: 'Cross-entity correlation', weight: 0.25, targetState: 'Graph-based correlation' },
        { name: 'Trend Analysis', description: 'Historical trend identification', weight: 0.2, targetState: 'Predictive analytics' },
      ],
      decision: [
        { name: 'Prioritization', description: 'Automated leak prioritization', weight: 0.3, targetState: 'AI-driven prioritization' },
        { name: 'Action Selection', description: 'Automatic action recommendation', weight: 0.3, targetState: 'Autonomous action selection' },
        { name: 'Risk Assessment', description: 'Automated risk evaluation', weight: 0.2, targetState: 'Real-time risk scoring' },
        { name: 'Approval Workflows', description: 'Smart approval routing', weight: 0.2, targetState: 'Context-aware approvals' },
      ],
      execution: [
        { name: 'Automated Recovery', description: 'Automatic recovery execution', weight: 0.35, targetState: 'Full auto-recovery' },
        { name: 'Workflow Automation', description: 'End-to-end workflow automation', weight: 0.25, targetState: 'Orchestrated workflows' },
        { name: 'Error Handling', description: 'Automatic error recovery', weight: 0.2, targetState: 'Self-healing execution' },
        { name: 'Progress Tracking', description: 'Automated progress monitoring', weight: 0.2, targetState: 'Real-time tracking' },
      ],
      learning: [
        { name: 'Feedback Incorporation', description: 'Learning from user feedback', weight: 0.3, targetState: 'Continuous learning' },
        { name: 'Model Improvement', description: 'Self-improving models', weight: 0.3, targetState: 'Auto-ML optimization' },
        { name: 'Pattern Learning', description: 'New pattern discovery', weight: 0.2, targetState: 'Unsupervised learning' },
        { name: 'Knowledge Sharing', description: 'Cross-portal learning', weight: 0.2, targetState: 'Federated learning' },
      ],
      adaptation: [
        { name: 'Rule Evolution', description: 'Automatic rule adjustment', weight: 0.3, targetState: 'Self-evolving rules' },
        { name: 'Threshold Tuning', description: 'Dynamic threshold adjustment', weight: 0.25, targetState: 'Adaptive thresholds' },
        { name: 'Process Optimization', description: 'Continuous process improvement', weight: 0.25, targetState: 'Auto-optimization' },
        { name: 'Anomaly Adaptation', description: 'Adapting to new anomaly types', weight: 0.2, targetState: 'Dynamic anomaly detection' },
      ],
      recovery: [
        { name: 'Self-Healing', description: 'Automatic issue resolution', weight: 0.35, targetState: 'Full self-healing' },
        { name: 'Rollback Capability', description: 'Automatic rollback on failure', weight: 0.25, targetState: 'Instant rollback' },
        { name: 'Redundancy', description: 'Failover mechanisms', weight: 0.2, targetState: 'Active-active redundancy' },
        { name: 'State Recovery', description: 'State preservation and recovery', weight: 0.2, targetState: 'Checkpoint recovery' },
      ],
      monitoring: [
        { name: 'System Health', description: 'Continuous health monitoring', weight: 0.25, targetState: '24/7 automated monitoring' },
        { name: 'Performance Tracking', description: 'Automated performance analysis', weight: 0.25, targetState: 'Real-time dashboards' },
        { name: 'Alert Management', description: 'Intelligent alerting', weight: 0.25, targetState: 'AI-filtered alerts' },
        { name: 'Audit Logging', description: 'Comprehensive audit trails', weight: 0.25, targetState: 'Full audit automation' },
      ],
    };

    return factorTemplates[dimension].map((template, index) => ({
      id: generateId(),
      name: template.name || '',
      description: template.description || '',
      currentState: 'Evaluating',
      targetState: template.targetState || '',
      score: 0,
      weight: template.weight || 0.25,
      automated: false,
      requiresHuman: false,
    }));
  }

  /**
   * Evaluate a factor based on metrics
   */
  private evaluateFactor(factor: AutonomyFactor, metrics: Partial<CapabilityMetrics>): number {
    // Base score from automation level
    let score = (metrics.automationLevel || 50) * 0.4;
    
    // Add accuracy contribution
    score += (metrics.accuracy || 70) * 0.3;
    
    // Add reliability contribution
    score += (metrics.reliability || 75) * 0.2;
    
    // Add efficiency contribution
    score += (metrics.efficiency || 60) * 0.1;
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate capability scores
   */
  private calculateCapabilityScores(
    capabilities: Record<string, Partial<CapabilityMetrics>>
  ): CapabilityScore[] {
    const scores: CapabilityScore[] = [];

    for (const [category, metrics] of Object.entries(capabilities)) {
      const automationLevel = metrics.automationLevel || 50;
      const accuracy = metrics.accuracy || 70;
      const reliability = metrics.reliability || 75;
      const efficiency = metrics.efficiency || 60;

      scores.push({
        id: generateId(),
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Capability`,
        category,
        enabled: metrics.enabled !== false,
        automationLevel,
        accuracy,
        reliability,
        efficiency,
        overallScore: (automationLevel * 0.3 + accuracy * 0.3 + reliability * 0.2 + efficiency * 0.2),
        lastEvaluated: new Date(),
      });
    }

    return scores;
  }

  /**
   * Calculate trends from historical data
   */
  private calculateTrends(portalId: string, dimensions: DimensionScore[]): AutonomyTrend[] {
    return dimensions.map(d => ({
      dimension: d.dimension,
      period: '30d',
      scores: this.generateHistoricalScores(d.score),
      direction: d.score > 70 ? 'improving' : d.score > 50 ? 'stable' : 'declining',
      changePercent: Math.random() * 10 - 5,
    }));
  }

  /**
   * Generate historical scores for trend
   */
  private generateHistoricalScores(currentScore: number): { date: Date; score: number }[] {
    const scores: { date: Date; score: number }[] = [];
    
    for (let i = 30; i >= 0; i--) {
      const variance = Math.random() * 10 - 5;
      scores.push({
        date: new Date(Date.now() - i * 86400000),
        score: Math.max(0, Math.min(100, currentScore + variance - i * 0.1)),
      });
    }
    
    return scores;
  }

  /**
   * Get benchmark values
   */
  private getBenchmarkValues(overallScore: number): AutonomyBenchmark {
    return {
      industryAvg: 55 + Math.random() * 15,
      topPerformer: 90 + Math.random() * 10,
      bottomPerformer: 20 + Math.random() * 15,
      percentile: Math.min(100, Math.max(0, overallScore + Math.random() * 10 - 5)),
      peerGroup: 'Mid-Market Technology',
    };
  }

  /**
   * Determine maturity level from score
   */
  private determineMaturityLevel(score: number): MaturityLevel {
    if (score >= 90) return 'full';
    if (score >= 75) return 'high';
    if (score >= 60) return 'conditional';
    if (score >= 45) return 'partial';
    if (score >= 30) return 'assisted';
    return 'manual';
  }

  /**
   * Generate recommendations for a dimension
   */
  private generateDimensionRecommendations(
    dimension: AutonomyDimension,
    score: number,
    factors: AutonomyFactor[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Find lowest scoring factors
    const sortedFactors = [...factors].sort((a, b) => a.score - b.score);
    const lowScoring = sortedFactors.filter(f => f.score < 70);
    
    for (const factor of lowScoring.slice(0, 2)) {
      recommendations.push(`Improve ${factor.name}: ${factor.currentState} → ${factor.targetState}`);
    }
    
    if (score < 60) {
      recommendations.push(`Consider automation investments in ${dimension} capabilities`);
    }
    
    return recommendations;
  }

  /**
   * Set autonomy goal
   */
  setGoal(
    portalId: string,
    dimension: AutonomyDimension,
    targetScore: number,
    deadline: Date
  ): AutonomyGoal {
    const currentScore = this.getCurrentDimensionScore(portalId, dimension);
    
    const goal: AutonomyGoal = {
      id: generateId(),
      portalId,
      dimension,
      targetScore,
      currentScore,
      deadline,
      status: this.determineGoalStatus(currentScore, targetScore, deadline),
      milestones: this.generateMilestones(currentScore, targetScore, deadline),
      createdAt: new Date(),
    };

    this.goals.set(goal.id, goal);
    return goal;
  }

  /**
   * Get current dimension score
   */
  private getCurrentDimensionScore(portalId: string, dimension: AutonomyDimension): number {
    const score = this.scores.get(`${portalId}-latest`);
    if (!score) return 50;
    
    const dimensionScore = score.dimensions.find(d => d.dimension === dimension);
    return dimensionScore?.score || 50;
  }

  /**
   * Determine goal status
   */
  private determineGoalStatus(
    current: number,
    target: number,
    deadline: Date
  ): AutonomyGoal['status'] {
    if (current >= target) return 'achieved';
    
    const daysRemaining = (deadline.getTime() - Date.now()) / 86400000;
    const pointsNeeded = target - current;
    const dailyRateNeeded = pointsNeeded / daysRemaining;
    
    if (dailyRateNeeded < 0.5) return 'on_track';
    if (dailyRateNeeded < 1) return 'at_risk';
    return 'behind';
  }

  /**
   * Generate goal milestones
   */
  private generateMilestones(
    current: number,
    target: number,
    deadline: Date
  ): GoalMilestone[] {
    const milestones: GoalMilestone[] = [];
    const totalDays = (deadline.getTime() - Date.now()) / 86400000;
    const increment = (target - current) / 4;
    
    for (let i = 1; i <= 4; i++) {
      milestones.push({
        id: generateId(),
        name: `Milestone ${i}`,
        targetDate: new Date(Date.now() + (totalDays / 4) * i * 86400000),
        targetScore: current + increment * i,
        achieved: false,
      });
    }
    
    return milestones;
  }

  /**
   * Create autonomy roadmap
   */
  createRoadmap(
    portalId: string,
    targetMaturityLevel: MaturityLevel
  ): AutonomyRoadmap {
    const currentScore = this.scores.get(`${portalId}-latest`)?.overallScore || 50;
    const currentLevel = this.determineMaturityLevel(currentScore);
    
    const phases = this.generateRoadmapPhases(currentLevel, targetMaturityLevel);
    
    const roadmap: AutonomyRoadmap = {
      id: generateId(),
      portalId,
      phases,
      currentPhase: 0,
      estimatedCompletion: new Date(Date.now() + phases.reduce((sum, p) => sum + p.duration, 0) * 86400000),
      totalInvestment: phases.reduce((sum, p) => sum + p.investment, 0),
      expectedROI: this.calculateExpectedROI(currentLevel, targetMaturityLevel),
      createdAt: new Date(),
    };

    this.roadmaps.set(roadmap.id, roadmap);
    return roadmap;
  }

  /**
   * Generate roadmap phases
   */
  private generateRoadmapPhases(
    current: MaturityLevel,
    target: MaturityLevel
  ): RoadmapPhase[] {
    const levelOrder: MaturityLevel[] = ['manual', 'assisted', 'partial', 'conditional', 'high', 'full'];
    const currentIndex = levelOrder.indexOf(current);
    const targetIndex = levelOrder.indexOf(target);
    
    const phases: RoadmapPhase[] = [];
    
    for (let i = currentIndex + 1; i <= targetIndex; i++) {
      phases.push({
        id: generateId(),
        name: `Phase ${i - currentIndex}: Achieve ${levelOrder[i]} Autonomy`,
        order: i - currentIndex,
        description: `Upgrade from ${levelOrder[i - 1]} to ${levelOrder[i]} autonomy level`,
        targetMaturityLevel: levelOrder[i],
        initiatives: this.generatePhaseInitiatives(levelOrder[i]),
        duration: 30 + (i - currentIndex) * 15,
        investment: 10000 + (i - currentIndex) * 15000,
        status: 'pending',
      });
    }
    
    return phases;
  }

  /**
   * Generate initiatives for a phase
   */
  private generatePhaseInitiatives(level: MaturityLevel): RoadmapInitiative[] {
    const dimensions: AutonomyDimension[] = ['detection', 'analysis', 'decision', 'execution', 'learning', 'adaptation'];
    
    return dimensions.slice(0, 3).map(dimension => ({
      id: generateId(),
      name: `Enhance ${dimension} automation`,
      description: `Improve ${dimension} capabilities to reach ${level} autonomy`,
      dimension,
      impact: 10 + Math.random() * 20,
      effort: level === 'full' ? 'high' : level === 'high' ? 'medium' : 'low',
      automated: level !== 'manual' && level !== 'assisted',
      dependencies: [],
      status: 'pending',
    }));
  }

  /**
   * Calculate expected ROI
   */
  private calculateExpectedROI(current: MaturityLevel, target: MaturityLevel): number {
    const levelValues: Record<MaturityLevel, number> = {
      manual: 1,
      assisted: 1.5,
      partial: 2,
      conditional: 2.5,
      high: 3,
      full: 4,
    };
    
    return (levelValues[target] / levelValues[current]) * 100 - 100;
  }

  /**
   * Generate autonomy report
   */
  generateReport(portalId: string): AutonomyReport {
    const currentScore = this.scores.get(`${portalId}-latest`);
    
    if (!currentScore) {
      throw new Error(`No score found for portal ${portalId}`);
    }

    const recommendations = this.generateRecommendations(currentScore);
    
    const report: AutonomyReport = {
      id: generateId(),
      portalId,
      period: {
        start: new Date(Date.now() - 30 * 86400000),
        end: new Date(),
      },
      currentScore,
      improvement: Math.random() * 10 - 3,
      highlights: this.generateHighlights(currentScore),
      concerns: this.generateConcerns(currentScore),
      recommendations,
      generatedAt: new Date(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(score: AutonomyScore): AutonomyRecommendation[] {
    const recommendations: AutonomyRecommendation[] = [];
    let priority = 1;
    
    // Sort dimensions by score (lowest first)
    const sortedDimensions = [...score.dimensions].sort((a, b) => a.score - b.score);
    
    for (const dimension of sortedDimensions.slice(0, 3)) {
      recommendations.push({
        id: generateId(),
        priority: priority++,
        dimension: dimension.dimension,
        title: `Improve ${dimension.dimension} autonomy`,
        description: `Current score: ${dimension.score}. Target: ${Math.min(100, dimension.score + 20)}`,
        expectedImpact: 20 - dimension.score / 10,
        effort: dimension.score < 50 ? 'high' : 'medium',
        automated: dimension.score > 60,
        prerequisites: dimension.recommendations.slice(0, 2),
      });
    }
    
    return recommendations;
  }

  /**
   * Generate highlights
   */
  private generateHighlights(score: AutonomyScore): string[] {
    const highlights: string[] = [];
    
    const highScoring = score.dimensions.filter(d => d.score >= 70);
    for (const dim of highScoring.slice(0, 3)) {
      highlights.push(`Strong ${dim.dimension} autonomy (${dim.score}%)`);
    }
    
    if (score.benchmark.percentile > 70) {
      highlights.push(`Above ${score.benchmark.percentile}th percentile in peer group`);
    }
    
    return highlights;
  }

  /**
   * Generate concerns
   */
  private generateConcerns(score: AutonomyScore): string[] {
    const concerns: string[] = [];
    
    const lowScoring = score.dimensions.filter(d => d.score < 50);
    for (const dim of lowScoring.slice(0, 2)) {
      concerns.push(`${dim.dimension} autonomy needs improvement (${dim.score}%)`);
    }
    
    const declining = score.trends.filter(t => t.direction === 'declining');
    for (const trend of declining.slice(0, 2)) {
      concerns.push(`${trend.dimension} showing declining trend`);
    }
    
    return concerns;
  }

  /**
   * Get score by portal ID
   */
  getScore(portalId: string): AutonomyScore | undefined {
    return this.scores.get(`${portalId}-latest`);
  }

  /**
   * Get goal by ID
   */
  getGoal(goalId: string): AutonomyGoal | undefined {
    return this.goals.get(goalId);
  }

  /**
   * Get goals for portal
   */
  getPortalGoals(portalId: string): AutonomyGoal[] {
    return Array.from(this.goals.values()).filter(g => g.portalId === portalId);
  }

  /**
   * Get roadmap by ID
   */
  getRoadmap(roadmapId: string): AutonomyRoadmap | undefined {
    return this.roadmaps.get(roadmapId);
  }

  /**
   * Get report by ID
   */
  getReport(reportId: string): AutonomyReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalScores: number;
    avgOverallScore: number;
    totalGoals: number;
    goalsOnTrack: number;
    goalsAtRisk: number;
    totalRoadmaps: number;
    totalReports: number;
  } {
    const scores = Array.from(this.scores.values());
    const goals = Array.from(this.goals.values());

    return {
      totalScores: scores.length,
      avgOverallScore: scores.length > 0
        ? scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length
        : 0,
      totalGoals: goals.length,
      goalsOnTrack: goals.filter(g => g.status === 'on_track').length,
      goalsAtRisk: goals.filter(g => g.status === 'at_risk' || g.status === 'behind').length,
      totalRoadmaps: this.roadmaps.size,
      totalReports: this.reports.size,
    };
  }
}

// Helper interface for capability metrics
interface CapabilityMetrics {
  enabled: boolean;
  automationLevel: number;
  accuracy: number;
  reliability: number;
  efficiency: number;
}

export default AutonomyScoresEngine;
