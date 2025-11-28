/**
 * Behavior Profiles Module
 * Models individual user behaviors for prediction and optimization
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Behavior Profile Types
// ============================================================

export interface BehaviorProfile {
  id: string;
  userId: string;
  userName: string;
  role: string;
  patterns: BehaviorPattern[];
  metrics: BehaviorMetrics;
  insights: BehaviorInsight[];
  strengths: string[];
  weaknesses: string[];
  updatedAt: Date;
}

export interface BehaviorPattern {
  id: string;
  type: 'activity' | 'timing' | 'communication' | 'deal_handling' | 'task_management';
  name: string;
  frequency: number;
  consistency: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  examples: string[];
}

export interface BehaviorMetrics {
  activityLevel: number;
  responseTime: number;
  taskCompletion: number;
  followUpRate: number;
  dealProgression: number;
  customerSatisfaction: number;
  collaborationScore: number;
  adaptability: number;
}

export interface BehaviorInsight {
  id: string;
  category: string;
  insight: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
  impact: number;
}

export interface BehaviorConfig {
  trackingWindow: number;
  minDataPoints: number;
  patternThreshold: number;
}

export interface BehaviorStats {
  profilesCreated: number;
  patternsIdentified: number;
  insightsGenerated: number;
  avgActivityLevel: number;
}

// ============================================================
// Behavior Profiles Implementation
// ============================================================

export class BehaviorProfiles {
  private profiles: Map<string, BehaviorProfile> = new Map();
  private config: BehaviorConfig;
  private stats: BehaviorStats;

  constructor(config?: Partial<BehaviorConfig>) {
    this.config = {
      trackingWindow: 30,
      minDataPoints: 10,
      patternThreshold: 0.7,
      ...config,
    };

    this.stats = {
      profilesCreated: 0,
      patternsIdentified: 0,
      insightsGenerated: 0,
      avgActivityLevel: 0,
    };
  }

  /**
   * Create or update a behavior profile
   */
  createProfile(
    userId: string,
    userName: string,
    role: string,
    activityData: Array<{
      type: string;
      timestamp: Date;
      metadata?: Record<string, unknown>;
    }>
  ): BehaviorProfile {
    const patterns = this.identifyPatterns(activityData);
    const metrics = this.calculateMetrics(activityData);
    const insights = this.generateInsights(patterns, metrics);
    const { strengths, weaknesses } = this.analyzeStrengthsWeaknesses(patterns, metrics);

    const profile: BehaviorProfile = {
      id: generateId(),
      userId,
      userName,
      role,
      patterns,
      metrics,
      insights,
      strengths,
      weaknesses,
      updatedAt: new Date(),
    };

    this.profiles.set(userId, profile);
    this.updateStats(profile);

    return profile;
  }

  /**
   * Get profile by user ID
   */
  getProfile(userId: string): BehaviorProfile | undefined {
    return this.profiles.get(userId);
  }

  /**
   * Compare profiles
   */
  compareProfiles(userIds: string[]): {
    comparison: Record<string, BehaviorMetrics>;
    topPerformer: string;
    recommendations: string[];
  } {
    const comparison: Record<string, BehaviorMetrics> = {};
    let topPerformer = '';
    let topScore = 0;

    for (const userId of userIds) {
      const profile = this.profiles.get(userId);
      if (profile) {
        comparison[profile.userName] = profile.metrics;
        const score = this.calculateOverallScore(profile.metrics);
        if (score > topScore) {
          topScore = score;
          topPerformer = profile.userName;
        }
      }
    }

    const recommendations = this.generateTeamRecommendations(userIds);

    return { comparison, topPerformer, recommendations };
  }

  /**
   * Get statistics
   */
  getStats(): BehaviorStats {
    return { ...this.stats };
  }

  // Private methods

  private identifyPatterns(
    activities: Array<{ type: string; timestamp: Date; metadata?: Record<string, unknown> }>
  ): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];
    const typeGroups = new Map<string, typeof activities>();

    // Group by type
    for (const activity of activities) {
      if (!typeGroups.has(activity.type)) {
        typeGroups.set(activity.type, []);
      }
      typeGroups.get(activity.type)!.push(activity);
    }

    // Analyze activity patterns
    const totalActivities = activities.length;
    for (const [type, typeActivities] of typeGroups) {
      const frequency = typeActivities.length / totalActivities;
      
      if (frequency > 0.1) {
        patterns.push({
          id: generateId(),
          type: 'activity',
          name: `${type} activity`,
          frequency,
          consistency: this.calculateConsistency(typeActivities),
          impact: 'neutral',
          description: `User frequently performs ${type} activities`,
          examples: [],
        });
      }
    }

    // Analyze timing patterns
    const hourlyDistribution = new Array(24).fill(0);
    for (const activity of activities) {
      const hour = new Date(activity.timestamp).getHours();
      hourlyDistribution[hour]++;
    }

    const peakHours = hourlyDistribution
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour);

    if (activities.length >= this.config.minDataPoints) {
      patterns.push({
        id: generateId(),
        type: 'timing',
        name: 'Peak activity hours',
        frequency: 1,
        consistency: 0.8,
        impact: 'positive',
        description: `Most active during hours: ${peakHours.join(', ')}`,
        examples: [],
      });
    }

    // Check for morning/afternoon preference
    const morningActivities = activities.filter(a => new Date(a.timestamp).getHours() < 12);
    const morningRatio = morningActivities.length / activities.length;
    
    if (morningRatio > 0.6) {
      patterns.push({
        id: generateId(),
        type: 'timing',
        name: 'Morning person',
        frequency: morningRatio,
        consistency: 0.7,
        impact: 'positive',
        description: 'Prefers working in the morning hours',
        examples: [],
      });
    } else if (morningRatio < 0.4) {
      patterns.push({
        id: generateId(),
        type: 'timing',
        name: 'Afternoon person',
        frequency: 1 - morningRatio,
        consistency: 0.7,
        impact: 'positive',
        description: 'Prefers working in the afternoon hours',
        examples: [],
      });
    }

    this.stats.patternsIdentified += patterns.length;
    return patterns;
  }

  private calculateConsistency(
    activities: Array<{ timestamp: Date }>
  ): number {
    if (activities.length < 2) return 0;

    const sorted = [...activities].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = new Date(sorted[i].timestamp).getTime() - new Date(sorted[i - 1].timestamp).getTime();
      gaps.push(gap);
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation - lower is more consistent
    const cv = avgGap > 0 ? stdDev / avgGap : 1;
    
    // Convert to consistency score (0-1)
    return Math.max(0, Math.min(1, 1 - cv));
  }

  private calculateMetrics(
    activities: Array<{ type: string; timestamp: Date; metadata?: Record<string, unknown> }>
  ): BehaviorMetrics {
    const totalDays = this.config.trackingWindow;
    const activeDays = new Set(
      activities.map(a => new Date(a.timestamp).toDateString())
    ).size;

    // Activity level
    const activityLevel = Math.min(100, (activities.length / totalDays) * 10);

    // Response time (from metadata if available)
    const responseTimes = activities
      .filter(a => a.metadata?.responseTime)
      .map(a => Number(a.metadata?.responseTime));
    const responseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 60;

    // Task completion
    const tasks = activities.filter(a => a.type === 'task_complete' || a.type === 'task');
    const completedTasks = activities.filter(a => a.metadata?.completed);
    const taskCompletion = tasks.length > 0 
      ? (completedTasks.length / tasks.length) * 100 
      : 80;

    // Follow-up rate
    const followUps = activities.filter(a => a.type === 'follow_up' || a.type === 'email_sent');
    const followUpRate = Math.min(100, (followUps.length / Math.max(activities.length, 1)) * 200);

    // Deal progression
    const dealActivities = activities.filter(a => 
      a.type.includes('deal') || a.type.includes('opportunity')
    );
    const dealProgression = Math.min(100, dealActivities.length * 5);

    // Customer satisfaction (from metadata if available)
    const csatScores = activities
      .filter(a => a.metadata?.csat)
      .map(a => Number(a.metadata?.csat));
    const customerSatisfaction = csatScores.length > 0
      ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length
      : 75;

    // Collaboration score
    const collaborations = activities.filter(a => 
      a.type.includes('share') || a.type.includes('collaborate') || a.type.includes('mention')
    );
    const collaborationScore = Math.min(100, collaborations.length * 10);

    // Adaptability (variety in activity types)
    const uniqueTypes = new Set(activities.map(a => a.type)).size;
    const adaptability = Math.min(100, uniqueTypes * 10);

    return {
      activityLevel: Math.round(activityLevel),
      responseTime,
      taskCompletion: Math.round(taskCompletion),
      followUpRate: Math.round(followUpRate),
      dealProgression: Math.round(dealProgression),
      customerSatisfaction: Math.round(customerSatisfaction),
      collaborationScore: Math.round(collaborationScore),
      adaptability: Math.round(adaptability),
    };
  }

  private generateInsights(
    patterns: BehaviorPattern[],
    metrics: BehaviorMetrics
  ): BehaviorInsight[] {
    const insights: BehaviorInsight[] = [];

    // Activity level insights
    if (metrics.activityLevel < 50) {
      insights.push({
        id: generateId(),
        category: 'activity',
        insight: 'Below average activity level',
        recommendation: 'Review workload distribution and potential blockers',
        priority: 'high',
        impact: 30,
      });
    } else if (metrics.activityLevel > 90) {
      insights.push({
        id: generateId(),
        category: 'activity',
        insight: 'Very high activity level',
        recommendation: 'Ensure quality is maintained; consider task delegation',
        priority: 'medium',
        impact: 15,
      });
    }

    // Response time insights
    if (metrics.responseTime > 120) {
      insights.push({
        id: generateId(),
        category: 'responsiveness',
        insight: 'Slow response times may impact customer satisfaction',
        recommendation: 'Implement response time goals and monitoring',
        priority: 'high',
        impact: 25,
      });
    }

    // Task completion insights
    if (metrics.taskCompletion < 70) {
      insights.push({
        id: generateId(),
        category: 'productivity',
        insight: 'Task completion rate below target',
        recommendation: 'Review task prioritization and time management',
        priority: 'high',
        impact: 20,
      });
    }

    // Follow-up insights
    if (metrics.followUpRate < 50) {
      insights.push({
        id: generateId(),
        category: 'engagement',
        insight: 'Low follow-up rate may impact deal progression',
        recommendation: 'Implement follow-up automation and reminders',
        priority: 'medium',
        impact: 20,
      });
    }

    // Collaboration insights
    if (metrics.collaborationScore < 30) {
      insights.push({
        id: generateId(),
        category: 'teamwork',
        insight: 'Limited collaboration with team members',
        recommendation: 'Encourage knowledge sharing and team communication',
        priority: 'low',
        impact: 10,
      });
    }

    // Pattern-based insights
    const timingPatterns = patterns.filter(p => p.type === 'timing');
    if (timingPatterns.some(p => p.name === 'Morning person')) {
      insights.push({
        id: generateId(),
        category: 'scheduling',
        insight: 'Peak productivity in morning hours',
        recommendation: 'Schedule important calls and tasks in the morning',
        priority: 'low',
        impact: 10,
      });
    }

    this.stats.insightsGenerated += insights.length;
    return insights;
  }

  private analyzeStrengthsWeaknesses(
    patterns: BehaviorPattern[],
    metrics: BehaviorMetrics
  ): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Analyze metrics
    if (metrics.activityLevel >= 70) strengths.push('High activity level');
    else if (metrics.activityLevel < 40) weaknesses.push('Low activity level');

    if (metrics.responseTime <= 30) strengths.push('Fast response time');
    else if (metrics.responseTime > 120) weaknesses.push('Slow response time');

    if (metrics.taskCompletion >= 90) strengths.push('Excellent task completion');
    else if (metrics.taskCompletion < 70) weaknesses.push('Task completion needs improvement');

    if (metrics.followUpRate >= 80) strengths.push('Strong follow-up discipline');
    else if (metrics.followUpRate < 40) weaknesses.push('Inconsistent follow-up');

    if (metrics.dealProgression >= 70) strengths.push('Effective deal progression');
    else if (metrics.dealProgression < 30) weaknesses.push('Deal progression challenges');

    if (metrics.customerSatisfaction >= 85) strengths.push('High customer satisfaction');
    else if (metrics.customerSatisfaction < 60) weaknesses.push('Customer satisfaction concerns');

    if (metrics.collaborationScore >= 60) strengths.push('Team player');
    else if (metrics.collaborationScore < 20) weaknesses.push('Limited team collaboration');

    if (metrics.adaptability >= 70) strengths.push('Highly adaptable');

    // Analyze patterns
    const positivePatterns = patterns.filter(p => p.impact === 'positive');
    for (const pattern of positivePatterns) {
      if (pattern.consistency > 0.8) {
        strengths.push(`Consistent ${pattern.name}`);
      }
    }

    return { strengths, weaknesses };
  }

  private calculateOverallScore(metrics: BehaviorMetrics): number {
    const weights = {
      activityLevel: 0.15,
      responseTime: 0.15,
      taskCompletion: 0.2,
      followUpRate: 0.15,
      dealProgression: 0.15,
      customerSatisfaction: 0.1,
      collaborationScore: 0.05,
      adaptability: 0.05,
    };

    // Normalize response time (lower is better)
    const normalizedResponseTime = Math.max(0, 100 - metrics.responseTime);

    return (
      metrics.activityLevel * weights.activityLevel +
      normalizedResponseTime * weights.responseTime +
      metrics.taskCompletion * weights.taskCompletion +
      metrics.followUpRate * weights.followUpRate +
      metrics.dealProgression * weights.dealProgression +
      metrics.customerSatisfaction * weights.customerSatisfaction +
      metrics.collaborationScore * weights.collaborationScore +
      metrics.adaptability * weights.adaptability
    );
  }

  private generateTeamRecommendations(userIds: string[]): string[] {
    const recommendations: string[] = [];
    const profiles = userIds.map(id => this.profiles.get(id)).filter(Boolean) as BehaviorProfile[];

    if (profiles.length === 0) return recommendations;

    // Analyze team metrics
    const avgMetrics = {
      activityLevel: profiles.reduce((sum, p) => sum + p.metrics.activityLevel, 0) / profiles.length,
      taskCompletion: profiles.reduce((sum, p) => sum + p.metrics.taskCompletion, 0) / profiles.length,
      collaborationScore: profiles.reduce((sum, p) => sum + p.metrics.collaborationScore, 0) / profiles.length,
    };

    if (avgMetrics.activityLevel < 60) {
      recommendations.push('Team activity levels are below average - consider workload review');
    }

    if (avgMetrics.taskCompletion < 75) {
      recommendations.push('Team task completion needs improvement - implement task management best practices');
    }

    if (avgMetrics.collaborationScore < 40) {
      recommendations.push('Increase team collaboration through regular syncs and knowledge sharing');
    }

    // Find complementary pairs
    const highPerformers = profiles.filter(p => this.calculateOverallScore(p.metrics) > 70);
    const needsSupport = profiles.filter(p => this.calculateOverallScore(p.metrics) < 50);

    if (highPerformers.length > 0 && needsSupport.length > 0) {
      recommendations.push('Consider pairing high performers with team members who need support');
    }

    return recommendations;
  }

  private updateStats(profile: BehaviorProfile): void {
    this.stats.profilesCreated = this.profiles.size;

    const allProfiles = Array.from(this.profiles.values());
    this.stats.avgActivityLevel = allProfiles.length > 0
      ? Math.round(allProfiles.reduce((sum, p) => sum + p.metrics.activityLevel, 0) / allProfiles.length)
      : 0;
  }
}

export default BehaviorProfiles;
