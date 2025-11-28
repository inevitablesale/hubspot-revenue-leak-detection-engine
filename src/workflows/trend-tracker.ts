/**
 * Trend Tracking Module
 * Weekly job for tracking leak trends and patterns
 */

import { RevenueLeak, LeakType, LeakSeverity } from '../types';
import { generateId, daysBetween } from '../utils/helpers';

export interface TrendSnapshot {
  id: string;
  timestamp: Date;
  period: 'daily' | 'weekly' | 'monthly';
  metrics: TrendMetrics;
  byType: Map<LeakType, TypeTrendMetrics>;
  bySeverity: Map<LeakSeverity, number>;
  topEntities: EntityTrend[];
}

export interface TrendMetrics {
  totalLeaks: number;
  totalRevenue: number;
  newLeaks: number;
  resolvedLeaks: number;
  averageAge: number;
  averageScore: number;
}

export interface TypeTrendMetrics {
  count: number;
  revenue: number;
  percentageChange: number;
  velocity: number; // Leaks per day
}

export interface EntityTrend {
  entityType: string;
  entityId: string;
  entityName?: string;
  leakCount: number;
  totalRevenue: number;
  trend: 'improving' | 'worsening' | 'stable';
}

export interface TrendAnalysis {
  currentSnapshot: TrendSnapshot;
  previousSnapshot?: TrendSnapshot;
  overallTrend: 'improving' | 'worsening' | 'stable';
  highlights: TrendHighlight[];
  predictions: TrendPrediction[];
  alerts: TrendAlert[];
}

export interface TrendHighlight {
  type: 'positive' | 'negative' | 'neutral';
  category: string;
  message: string;
  value: number;
  change: number;
}

export interface TrendPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  timeframe: string;
}

export interface TrendAlert {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metric: string;
  threshold: number;
  actualValue: number;
}

export interface TrendConfig {
  snapshotFrequency: 'daily' | 'weekly' | 'monthly';
  alertThresholds: {
    leakCountIncrease: number; // Percentage
    revenueIncrease: number; // Percentage
    velocityThreshold: number; // Leaks per day
  };
  retentionDays: number;
}

const DEFAULT_CONFIG: TrendConfig = {
  snapshotFrequency: 'weekly',
  alertThresholds: {
    leakCountIncrease: 20,
    revenueIncrease: 25,
    velocityThreshold: 5,
  },
  retentionDays: 90,
};

export class TrendTracker {
  private config: TrendConfig;
  private snapshots: TrendSnapshot[] = [];
  private leakHistory: Map<string, RevenueLeak[]> = new Map();

  constructor(config: Partial<TrendConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record leaks for trend tracking
   */
  recordLeaks(portalId: string, leaks: RevenueLeak[]): void {
    const existing = this.leakHistory.get(portalId) || [];
    
    // Add new leaks
    for (const leak of leaks) {
      if (!existing.find(l => l.id === leak.id)) {
        existing.push(leak);
      }
    }
    
    this.leakHistory.set(portalId, existing);
  }

  /**
   * Create a trend snapshot
   */
  createSnapshot(portalId: string, leaks: RevenueLeak[], resolvedCount: number = 0): TrendSnapshot {
    const now = new Date();
    const byType = this.calculateTypeMetrics(leaks);
    const bySeverity = this.calculateSeverityBreakdown(leaks);
    const topEntities = this.calculateTopEntities(leaks);

    const snapshot: TrendSnapshot = {
      id: generateId(),
      timestamp: now,
      period: this.config.snapshotFrequency,
      metrics: {
        totalLeaks: leaks.length,
        totalRevenue: leaks.reduce((sum, l) => sum + l.potentialRevenue, 0),
        newLeaks: this.countNewLeaks(leaks, now),
        resolvedLeaks: resolvedCount,
        averageAge: this.calculateAverageAge(leaks),
        averageScore: 50, // Would come from scorer
      },
      byType,
      bySeverity,
      topEntities,
    };

    this.snapshots.push(snapshot);
    this.cleanupOldSnapshots();

    return snapshot;
  }

  /**
   * Analyze trends comparing current to previous period
   */
  analyzeTrends(portalId: string, leaks: RevenueLeak[]): TrendAnalysis {
    const currentSnapshot = this.createSnapshot(portalId, leaks);
    const previousSnapshot = this.getPreviousSnapshot();

    const overallTrend = this.determineOverallTrend(currentSnapshot, previousSnapshot);
    const highlights = this.generateHighlights(currentSnapshot, previousSnapshot);
    const predictions = this.generatePredictions(currentSnapshot);
    const alerts = this.checkAlertThresholds(currentSnapshot, previousSnapshot);

    return {
      currentSnapshot,
      previousSnapshot,
      overallTrend,
      highlights,
      predictions,
      alerts,
    };
  }

  /**
   * Calculate metrics by leak type
   */
  private calculateTypeMetrics(leaks: RevenueLeak[]): Map<LeakType, TypeTrendMetrics> {
    const types: LeakType[] = [
      'underbilling', 'missed_renewal', 'untriggered_crosssell',
      'stalled_cs_handoff', 'invalid_lifecycle_path', 'billing_gap'
    ];

    const metrics = new Map<LeakType, TypeTrendMetrics>();
    const previousSnapshot = this.getPreviousSnapshot();

    for (const type of types) {
      const typeLeaks = leaks.filter(l => l.type === type);
      const previousCount = previousSnapshot?.byType.get(type)?.count || 0;
      const count = typeLeaks.length;
      
      const percentageChange = previousCount > 0 
        ? ((count - previousCount) / previousCount) * 100 
        : count > 0 ? 100 : 0;

      metrics.set(type, {
        count,
        revenue: typeLeaks.reduce((sum, l) => sum + l.potentialRevenue, 0),
        percentageChange,
        velocity: this.calculateVelocity(typeLeaks),
      });
    }

    return metrics;
  }

  /**
   * Calculate severity breakdown
   */
  private calculateSeverityBreakdown(leaks: RevenueLeak[]): Map<LeakSeverity, number> {
    const breakdown = new Map<LeakSeverity, number>();
    const severities: LeakSeverity[] = ['low', 'medium', 'high', 'critical'];

    for (const severity of severities) {
      breakdown.set(severity, leaks.filter(l => l.severity === severity).length);
    }

    return breakdown;
  }

  /**
   * Calculate top entities with most leaks
   */
  private calculateTopEntities(leaks: RevenueLeak[]): EntityTrend[] {
    const entityMap = new Map<string, { 
      type: string; 
      name?: string; 
      leaks: RevenueLeak[] 
    }>();

    for (const leak of leaks) {
      const key = `${leak.affectedEntity.type}:${leak.affectedEntity.id}`;
      const existing = entityMap.get(key) || {
        type: leak.affectedEntity.type,
        name: leak.affectedEntity.name,
        leaks: [],
      };
      existing.leaks.push(leak);
      entityMap.set(key, existing);
    }

    return Array.from(entityMap.entries())
      .map(([key, data]) => ({
        entityType: data.type,
        entityId: key.split(':')[1],
        entityName: data.name,
        leakCount: data.leaks.length,
        totalRevenue: data.leaks.reduce((sum, l) => sum + l.potentialRevenue, 0),
        trend: 'stable' as const, // Would compare to previous
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);
  }

  /**
   * Count new leaks within the current period
   */
  private countNewLeaks(leaks: RevenueLeak[], now: Date): number {
    const periodDays = this.config.snapshotFrequency === 'daily' ? 1 
      : this.config.snapshotFrequency === 'weekly' ? 7 : 30;
    
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    return leaks.filter(l => l.detectedAt >= periodStart).length;
  }

  /**
   * Calculate average leak age in days
   */
  private calculateAverageAge(leaks: RevenueLeak[]): number {
    if (leaks.length === 0) return 0;
    
    const now = new Date();
    const totalAge = leaks.reduce((sum, l) => {
      return sum + daysBetween(l.detectedAt, now);
    }, 0);
    
    return Math.round(totalAge / leaks.length);
  }

  /**
   * Calculate leak velocity (leaks per day)
   */
  private calculateVelocity(leaks: RevenueLeak[]): number {
    if (leaks.length < 2) return 0;
    
    const sorted = [...leaks].sort((a, b) => 
      a.detectedAt.getTime() - b.detectedAt.getTime()
    );
    
    const firstDate = sorted[0].detectedAt;
    const lastDate = sorted[sorted.length - 1].detectedAt;
    const days = Math.max(1, daysBetween(firstDate, lastDate));
    
    return Math.round((leaks.length / days) * 10) / 10;
  }

  /**
   * Get the previous snapshot
   */
  private getPreviousSnapshot(): TrendSnapshot | undefined {
    if (this.snapshots.length < 2) return undefined;
    return this.snapshots[this.snapshots.length - 2];
  }

  /**
   * Determine overall trend direction
   */
  private determineOverallTrend(
    current: TrendSnapshot,
    previous?: TrendSnapshot
  ): 'improving' | 'worsening' | 'stable' {
    if (!previous) return 'stable';

    const leakChange = (current.metrics.totalLeaks - previous.metrics.totalLeaks) / 
      Math.max(1, previous.metrics.totalLeaks);
    const revenueChange = (current.metrics.totalRevenue - previous.metrics.totalRevenue) / 
      Math.max(1, previous.metrics.totalRevenue);

    const combinedChange = (leakChange + revenueChange) / 2;

    if (combinedChange <= -0.1) return 'improving';
    if (combinedChange >= 0.1) return 'worsening';
    return 'stable';
  }

  /**
   * Generate trend highlights
   */
  private generateHighlights(
    current: TrendSnapshot,
    previous?: TrendSnapshot
  ): TrendHighlight[] {
    const highlights: TrendHighlight[] = [];

    if (!previous) {
      highlights.push({
        type: 'neutral',
        category: 'overview',
        message: `First snapshot: ${current.metrics.totalLeaks} leaks detected`,
        value: current.metrics.totalLeaks,
        change: 0,
      });
      return highlights;
    }

    // Leak count change
    const leakChange = current.metrics.totalLeaks - previous.metrics.totalLeaks;
    const leakChangePercent = (leakChange / Math.max(1, previous.metrics.totalLeaks)) * 100;
    
    highlights.push({
      type: leakChange <= 0 ? 'positive' : 'negative',
      category: 'leaks',
      message: leakChange <= 0 
        ? `Leak count decreased by ${Math.abs(leakChange)}` 
        : `Leak count increased by ${leakChange}`,
      value: current.metrics.totalLeaks,
      change: leakChangePercent,
    });

    // Revenue change
    const revenueChange = current.metrics.totalRevenue - previous.metrics.totalRevenue;
    const revenueChangePercent = (revenueChange / Math.max(1, previous.metrics.totalRevenue)) * 100;
    
    highlights.push({
      type: revenueChange <= 0 ? 'positive' : 'negative',
      category: 'revenue',
      message: `Revenue at risk: $${current.metrics.totalRevenue.toLocaleString()}`,
      value: current.metrics.totalRevenue,
      change: revenueChangePercent,
    });

    // Resolution rate
    const resolutionRate = previous.metrics.totalLeaks > 0
      ? (current.metrics.resolvedLeaks / previous.metrics.totalLeaks) * 100
      : 0;
    
    if (resolutionRate > 0) {
      highlights.push({
        type: resolutionRate >= 50 ? 'positive' : 'neutral',
        category: 'resolution',
        message: `Resolved ${current.metrics.resolvedLeaks} leaks (${resolutionRate.toFixed(1)}% of previous)`,
        value: current.metrics.resolvedLeaks,
        change: resolutionRate,
      });
    }

    // Type-specific highlights
    for (const [type, metrics] of current.byType.entries()) {
      if (Math.abs(metrics.percentageChange) >= 20) {
        highlights.push({
          type: metrics.percentageChange <= 0 ? 'positive' : 'negative',
          category: type,
          message: `${type}: ${metrics.percentageChange > 0 ? '+' : ''}${metrics.percentageChange.toFixed(1)}%`,
          value: metrics.count,
          change: metrics.percentageChange,
        });
      }
    }

    return highlights;
  }

  /**
   * Generate predictions based on trends
   */
  private generatePredictions(current: TrendSnapshot): TrendPrediction[] {
    const predictions: TrendPrediction[] = [];

    // Predict total leaks in 4 weeks
    const weeklyVelocity = this.calculateOverallVelocity();
    const predictedLeaks = current.metrics.totalLeaks + (weeklyVelocity * 4);
    
    predictions.push({
      metric: 'totalLeaks',
      currentValue: current.metrics.totalLeaks,
      predictedValue: Math.round(predictedLeaks),
      confidence: 0.7,
      timeframe: '4 weeks',
    });

    // Predict revenue at risk
    const avgRevenuePerLeak = current.metrics.totalLeaks > 0
      ? current.metrics.totalRevenue / current.metrics.totalLeaks
      : 0;
    const predictedRevenue = predictedLeaks * avgRevenuePerLeak;
    
    predictions.push({
      metric: 'revenueAtRisk',
      currentValue: current.metrics.totalRevenue,
      predictedValue: Math.round(predictedRevenue),
      confidence: 0.6,
      timeframe: '4 weeks',
    });

    return predictions;
  }

  /**
   * Calculate overall velocity from history
   */
  private calculateOverallVelocity(): number {
    if (this.snapshots.length < 2) return 0;
    
    const recent = this.snapshots.slice(-4);
    const changes = [];
    
    for (let i = 1; i < recent.length; i++) {
      changes.push(recent[i].metrics.totalLeaks - recent[i - 1].metrics.totalLeaks);
    }
    
    return changes.length > 0 
      ? changes.reduce((a, b) => a + b, 0) / changes.length 
      : 0;
  }

  /**
   * Check alert thresholds
   */
  private checkAlertThresholds(
    current: TrendSnapshot,
    previous?: TrendSnapshot
  ): TrendAlert[] {
    const alerts: TrendAlert[] = [];
    const { alertThresholds } = this.config;

    if (!previous) return alerts;

    // Check leak count increase
    const leakIncrease = ((current.metrics.totalLeaks - previous.metrics.totalLeaks) / 
      Math.max(1, previous.metrics.totalLeaks)) * 100;
    
    if (leakIncrease >= alertThresholds.leakCountIncrease) {
      alerts.push({
        severity: leakIncrease >= alertThresholds.leakCountIncrease * 2 ? 'critical' : 'warning',
        title: 'Leak Count Spike',
        message: `Leak count increased by ${leakIncrease.toFixed(1)}% from last period`,
        metric: 'leakCount',
        threshold: alertThresholds.leakCountIncrease,
        actualValue: leakIncrease,
      });
    }

    // Check revenue increase
    const revenueIncrease = ((current.metrics.totalRevenue - previous.metrics.totalRevenue) / 
      Math.max(1, previous.metrics.totalRevenue)) * 100;
    
    if (revenueIncrease >= alertThresholds.revenueIncrease) {
      alerts.push({
        severity: revenueIncrease >= alertThresholds.revenueIncrease * 2 ? 'critical' : 'warning',
        title: 'Revenue Risk Spike',
        message: `Revenue at risk increased by ${revenueIncrease.toFixed(1)}%`,
        metric: 'revenueAtRisk',
        threshold: alertThresholds.revenueIncrease,
        actualValue: revenueIncrease,
      });
    }

    // Check high velocity types
    for (const [type, metrics] of current.byType.entries()) {
      if (metrics.velocity >= alertThresholds.velocityThreshold) {
        alerts.push({
          severity: 'warning',
          title: `High ${type} Velocity`,
          message: `${type} leaks occurring at ${metrics.velocity} per day`,
          metric: `${type}Velocity`,
          threshold: alertThresholds.velocityThreshold,
          actualValue: metrics.velocity,
        });
      }
    }

    return alerts;
  }

  /**
   * Cleanup old snapshots
   */
  private cleanupOldSnapshots(): void {
    const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    this.snapshots = this.snapshots.filter(s => s.timestamp >= cutoff);
  }

  /**
   * Get snapshot history
   */
  getSnapshots(): TrendSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Export trend data
   */
  exportTrends(): object {
    return {
      snapshots: this.snapshots.map(s => ({
        id: s.id,
        timestamp: s.timestamp,
        period: s.period,
        metrics: s.metrics,
        byType: Array.from(s.byType.entries()),
        bySeverity: Array.from(s.bySeverity.entries()),
      })),
    };
  }
}

export default TrendTracker;
