/**
 * Drift Detection Module
 * Detects "RevOps rot" before damage occurs through continuous monitoring
 * of data quality, process health, and configuration drift
 */

import { generateId } from '../utils/helpers';
import { RevenueLeak, LeakType } from '../types';

// ============================================================
// Drift Detection Configuration Constants
// ============================================================

/** Variance factor for metric simulation (10% of baseline) */
const METRIC_VARIANCE_FACTOR = 0.1;

/** Multiplier for random drift range (symmetric around 0) */
const DRIFT_RANGE_MULTIPLIER = 2;

/** Threshold for direction change detection (1% of baseline) */
const DIRECTION_CHANGE_THRESHOLD = 0.01;

// ============================================================
// Drift Detection Types
// ============================================================

export type DriftCategory = 'data' | 'process' | 'config' | 'performance' | 'behavior' | 'compliance';
export type DriftSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type DriftStatus = 'active' | 'resolved' | 'acknowledged' | 'suppressed';

export interface DriftEvent {
  id: string;
  category: DriftCategory;
  severity: DriftSeverity;
  status: DriftStatus;
  title: string;
  description: string;
  source: string;
  baseline: DriftBaseline;
  current: DriftMeasurement;
  deviation: DriftDeviation;
  impact: DriftImpact;
  recommendations: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface DriftBaseline {
  id: string;
  name: string;
  metric: string;
  value: number;
  unit: string;
  tolerance: number; // Percentage
  calculatedAt: Date;
  sampleSize: number;
  confidence: number;
}

export interface DriftMeasurement {
  value: number;
  unit: string;
  measuredAt: Date;
  sampleSize: number;
}

export interface DriftDeviation {
  absolute: number;
  percentage: number;
  direction: 'up' | 'down' | 'change';
  significance: number; // Statistical significance
  trend: 'improving' | 'stable' | 'worsening';
}

export interface DriftImpact {
  revenueAtRisk: number;
  affectedEntities: number;
  affectedProcesses: string[];
  estimatedTimeToResolve: number; // hours
  cascadeRisk: number; // 0-100
}

export interface DriftMonitor {
  id: string;
  name: string;
  description: string;
  category: DriftCategory;
  enabled: boolean;
  metric: string;
  source: string;
  baseline: DriftBaseline;
  config: DriftMonitorConfig;
  lastCheck: Date;
  nextCheck: Date;
  alerts: DriftAlert[];
  history: DriftHistoryEntry[];
}

export interface DriftMonitorConfig {
  checkIntervalMs: number;
  warningThreshold: number; // Percentage deviation
  criticalThreshold: number;
  sampleSize: number;
  smoothingFactor: number;
  alertCooldownMs: number;
  autoRemediate: boolean;
}

export interface DriftAlert {
  id: string;
  monitorId: string;
  severity: DriftSeverity;
  message: string;
  value: number;
  threshold: number;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

export interface DriftHistoryEntry {
  timestamp: Date;
  value: number;
  baseline: number;
  deviation: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface DriftPattern {
  id: string;
  name: string;
  description: string;
  category: DriftCategory;
  indicators: DriftIndicator[];
  frequency: number;
  severity: DriftSeverity;
  rootCauses: string[];
  mitigations: string[];
  detectedCount: number;
  lastDetectedAt?: Date;
}

export interface DriftIndicator {
  metric: string;
  operator: 'increase' | 'decrease' | 'change' | 'threshold';
  value: number;
  weight: number;
}

export interface DriftReport {
  id: string;
  period: { start: Date; end: Date };
  summary: DriftSummary;
  events: DriftEvent[];
  trends: DriftTrend[];
  recommendations: DriftRecommendation[];
  healthScore: number;
  generatedAt: Date;
}

export interface DriftSummary {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  resolvedEvents: number;
  avgResolutionTime: number;
  topAffectedAreas: { category: DriftCategory; count: number }[];
  revenueImpact: number;
}

export interface DriftTrend {
  category: DriftCategory;
  metric: string;
  direction: 'improving' | 'stable' | 'worsening';
  changePercent: number;
  forecast: number[];
}

export interface DriftRecommendation {
  priority: number;
  category: DriftCategory;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  automatable: boolean;
}

export interface DriftDetectionConfig {
  enabled: boolean;
  monitoringInterval: number;
  retentionDays: number;
  alertingEnabled: boolean;
  autoRemediationEnabled: boolean;
  baselineRecalculationInterval: number;
}

// ============================================================
// Drift Detection Implementation
// ============================================================

export class DriftDetectionEngine {
  private monitors: Map<string, DriftMonitor> = new Map();
  private events: Map<string, DriftEvent> = new Map();
  private patterns: Map<string, DriftPattern> = new Map();
  private baselines: Map<string, DriftBaseline> = new Map();
  private config: DriftDetectionConfig;

  constructor(config?: Partial<DriftDetectionConfig>) {
    this.config = {
      enabled: true,
      monitoringInterval: 300000, // 5 minutes
      retentionDays: 90,
      alertingEnabled: true,
      autoRemediationEnabled: false,
      baselineRecalculationInterval: 604800000, // 7 days
      ...config,
    };

    this.initializeDefaultMonitors();
    this.initializeDefaultPatterns();
  }

  /**
   * Initialize default drift monitors
   */
  private initializeDefaultMonitors(): void {
    // Data quality monitors
    this.createMonitor({
      name: 'Data Completeness',
      description: 'Monitors completeness of required fields',
      category: 'data',
      metric: 'data_completeness_rate',
      source: 'crm',
      baseline: {
        name: 'Data Completeness Baseline',
        metric: 'data_completeness_rate',
        value: 95,
        unit: 'percent',
        tolerance: 5,
        sampleSize: 1000,
        confidence: 0.95,
      },
      config: {
        checkIntervalMs: 300000,
        warningThreshold: 5,
        criticalThreshold: 10,
        sampleSize: 100,
        smoothingFactor: 0.3,
        alertCooldownMs: 3600000,
        autoRemediate: false,
      },
    });

    this.createMonitor({
      name: 'Data Freshness',
      description: 'Monitors age of data in the system',
      category: 'data',
      metric: 'avg_data_age_hours',
      source: 'crm',
      baseline: {
        name: 'Data Freshness Baseline',
        metric: 'avg_data_age_hours',
        value: 24,
        unit: 'hours',
        tolerance: 50,
        sampleSize: 500,
        confidence: 0.90,
      },
      config: {
        checkIntervalMs: 600000,
        warningThreshold: 30,
        criticalThreshold: 100,
        sampleSize: 50,
        smoothingFactor: 0.2,
        alertCooldownMs: 7200000,
        autoRemediate: false,
      },
    });

    // Process monitors
    this.createMonitor({
      name: 'Detection Accuracy',
      description: 'Monitors leak detection accuracy',
      category: 'process',
      metric: 'detection_accuracy_rate',
      source: 'agent_os',
      baseline: {
        name: 'Detection Accuracy Baseline',
        metric: 'detection_accuracy_rate',
        value: 85,
        unit: 'percent',
        tolerance: 10,
        sampleSize: 200,
        confidence: 0.95,
      },
      config: {
        checkIntervalMs: 900000,
        warningThreshold: 10,
        criticalThreshold: 20,
        sampleSize: 50,
        smoothingFactor: 0.4,
        alertCooldownMs: 14400000,
        autoRemediate: true,
      },
    });

    this.createMonitor({
      name: 'Recovery Success Rate',
      description: 'Monitors success rate of recovery actions',
      category: 'process',
      metric: 'recovery_success_rate',
      source: 'agent_os',
      baseline: {
        name: 'Recovery Success Baseline',
        metric: 'recovery_success_rate',
        value: 80,
        unit: 'percent',
        tolerance: 15,
        sampleSize: 100,
        confidence: 0.90,
      },
      config: {
        checkIntervalMs: 1800000,
        warningThreshold: 15,
        criticalThreshold: 25,
        sampleSize: 30,
        smoothingFactor: 0.3,
        alertCooldownMs: 21600000,
        autoRemediate: false,
      },
    });

    // Performance monitors
    this.createMonitor({
      name: 'Processing Latency',
      description: 'Monitors average processing latency',
      category: 'performance',
      metric: 'avg_processing_latency_ms',
      source: 'system',
      baseline: {
        name: 'Latency Baseline',
        metric: 'avg_processing_latency_ms',
        value: 500,
        unit: 'milliseconds',
        tolerance: 50,
        sampleSize: 1000,
        confidence: 0.95,
      },
      config: {
        checkIntervalMs: 60000,
        warningThreshold: 30,
        criticalThreshold: 100,
        sampleSize: 100,
        smoothingFactor: 0.5,
        alertCooldownMs: 1800000,
        autoRemediate: false,
      },
    });

    // Behavior monitors
    this.createMonitor({
      name: 'User Engagement',
      description: 'Monitors user engagement with the system',
      category: 'behavior',
      metric: 'daily_active_users',
      source: 'analytics',
      baseline: {
        name: 'User Engagement Baseline',
        metric: 'daily_active_users',
        value: 100,
        unit: 'users',
        tolerance: 30,
        sampleSize: 30,
        confidence: 0.85,
      },
      config: {
        checkIntervalMs: 86400000, // Daily
        warningThreshold: 20,
        criticalThreshold: 40,
        sampleSize: 7,
        smoothingFactor: 0.2,
        alertCooldownMs: 86400000,
        autoRemediate: false,
      },
    });
  }

  /**
   * Initialize default drift patterns
   */
  private initializeDefaultPatterns(): void {
    // Data quality degradation pattern
    this.addPattern({
      name: 'Data Quality Degradation',
      description: 'Pattern of declining data quality metrics',
      category: 'data',
      indicators: [
        { metric: 'data_completeness_rate', operator: 'decrease', value: 5, weight: 0.4 },
        { metric: 'data_accuracy_rate', operator: 'decrease', value: 3, weight: 0.3 },
        { metric: 'duplicate_rate', operator: 'increase', value: 2, weight: 0.3 },
      ],
      severity: 'high',
      rootCauses: [
        'Integration issues',
        'Manual data entry errors',
        'Sync failures',
        'Schema changes',
      ],
      mitigations: [
        'Review integration logs',
        'Implement data validation rules',
        'Add required field constraints',
        'Enable duplicate detection',
      ],
    });

    // Process bottleneck pattern
    this.addPattern({
      name: 'Process Bottleneck',
      description: 'Pattern indicating process slowdown or stalls',
      category: 'process',
      indicators: [
        { metric: 'avg_processing_latency_ms', operator: 'increase', value: 50, weight: 0.4 },
        { metric: 'queue_depth', operator: 'increase', value: 100, weight: 0.3 },
        { metric: 'error_rate', operator: 'increase', value: 2, weight: 0.3 },
      ],
      severity: 'high',
      rootCauses: [
        'Resource constraints',
        'External service degradation',
        'Inefficient algorithms',
        'Data volume increase',
      ],
      mitigations: [
        'Scale resources',
        'Optimize queries',
        'Implement caching',
        'Add circuit breakers',
      ],
    });

    // Configuration drift pattern
    this.addPattern({
      name: 'Configuration Drift',
      description: 'Pattern of configuration changes causing issues',
      category: 'config',
      indicators: [
        { metric: 'config_change_count', operator: 'increase', value: 5, weight: 0.4 },
        { metric: 'unexpected_behavior_count', operator: 'increase', value: 3, weight: 0.4 },
        { metric: 'rollback_count', operator: 'increase', value: 1, weight: 0.2 },
      ],
      severity: 'medium',
      rootCauses: [
        'Uncoordinated changes',
        'Missing change documentation',
        'Incomplete testing',
        'Environment differences',
      ],
      mitigations: [
        'Implement change management',
        'Use infrastructure as code',
        'Add configuration validation',
        'Enable change auditing',
      ],
    });

    // Revenue leakage acceleration pattern
    this.addPattern({
      name: 'Revenue Leakage Acceleration',
      description: 'Pattern indicating increasing revenue leakage rate',
      category: 'behavior',
      indicators: [
        { metric: 'leak_detection_rate', operator: 'increase', value: 20, weight: 0.4 },
        { metric: 'avg_leak_value', operator: 'increase', value: 15, weight: 0.3 },
        { metric: 'recovery_failure_rate', operator: 'increase', value: 10, weight: 0.3 },
      ],
      severity: 'critical',
      rootCauses: [
        'Process breakdowns',
        'Team changes',
        'Market conditions',
        'System issues',
      ],
      mitigations: [
        'Increase monitoring frequency',
        'Review detection rules',
        'Analyze root causes',
        'Implement preventive measures',
      ],
    });
  }

  /**
   * Create a drift monitor
   */
  createMonitor(options: {
    name: string;
    description: string;
    category: DriftCategory;
    metric: string;
    source: string;
    baseline: Omit<DriftBaseline, 'id' | 'calculatedAt'>;
    config: DriftMonitorConfig;
  }): DriftMonitor {
    const baseline: DriftBaseline = {
      ...options.baseline,
      id: generateId(),
      calculatedAt: new Date(),
    };

    const monitor: DriftMonitor = {
      id: generateId(),
      name: options.name,
      description: options.description,
      category: options.category,
      enabled: true,
      metric: options.metric,
      source: options.source,
      baseline,
      config: options.config,
      lastCheck: new Date(),
      nextCheck: new Date(Date.now() + options.config.checkIntervalMs),
      alerts: [],
      history: [],
    };

    this.monitors.set(monitor.id, monitor);
    this.baselines.set(baseline.id, baseline);

    return monitor;
  }

  /**
   * Add a drift pattern
   */
  addPattern(options: Omit<DriftPattern, 'id' | 'frequency' | 'detectedCount'>): DriftPattern {
    const pattern: DriftPattern = {
      ...options,
      id: generateId(),
      frequency: 0,
      detectedCount: 0,
    };

    this.patterns.set(pattern.id, pattern);
    return pattern;
  }

  /**
   * Run drift detection check
   */
  async checkDrift(monitorId?: string): Promise<DriftEvent[]> {
    const detectedEvents: DriftEvent[] = [];
    const monitorsToCheck = monitorId
      ? [this.monitors.get(monitorId)].filter(Boolean) as DriftMonitor[]
      : Array.from(this.monitors.values()).filter(m => m.enabled);

    for (const monitor of monitorsToCheck) {
      // Simulate metric measurement
      const measurement = this.measureMetric(monitor);
      
      // Calculate deviation
      const deviation = this.calculateDeviation(monitor.baseline, measurement);
      
      // Record history
      monitor.history.push({
        timestamp: new Date(),
        value: measurement.value,
        baseline: monitor.baseline.value,
        deviation: deviation.percentage,
        status: this.determineStatus(deviation.percentage, monitor.config),
      });

      // Trim history to last 100 entries
      if (monitor.history.length > 100) {
        monitor.history = monitor.history.slice(-100);
      }

      // Check for drift
      if (Math.abs(deviation.percentage) > monitor.config.warningThreshold) {
        const event = this.createDriftEvent(monitor, measurement, deviation);
        detectedEvents.push(event);

        // Create alert if threshold exceeded
        if (Math.abs(deviation.percentage) >= monitor.config.criticalThreshold) {
          this.createAlert(monitor, event);
        }
      }

      // Update monitor
      monitor.lastCheck = new Date();
      monitor.nextCheck = new Date(Date.now() + monitor.config.checkIntervalMs);
    }

    // Check for patterns
    await this.detectPatterns();

    return detectedEvents;
  }

  /**
   * Simulate metric measurement
   */
  private measureMetric(monitor: DriftMonitor): DriftMeasurement {
    // Simulate a measurement with some variance around baseline
    const variance = monitor.baseline.value * METRIC_VARIANCE_FACTOR;
    const randomDrift = (Math.random() - 0.5) * variance * DRIFT_RANGE_MULTIPLIER;
    
    return {
      value: monitor.baseline.value + randomDrift,
      unit: monitor.baseline.unit,
      measuredAt: new Date(),
      sampleSize: monitor.config.sampleSize,
    };
  }

  /**
   * Calculate deviation from baseline
   */
  private calculateDeviation(baseline: DriftBaseline, measurement: DriftMeasurement): DriftDeviation {
    const absolute = measurement.value - baseline.value;
    const percentage = (absolute / baseline.value) * 100;
    
    // Determine direction
    let direction: 'up' | 'down' | 'change';
    if (absolute > baseline.value * DIRECTION_CHANGE_THRESHOLD) direction = 'up';
    else if (absolute < -baseline.value * DIRECTION_CHANGE_THRESHOLD) direction = 'down';
    else direction = 'change';

    // Calculate significance (simplified)
    const significance = Math.min(1, Math.abs(percentage) / baseline.tolerance);

    return {
      absolute,
      percentage,
      direction,
      significance,
      trend: significance > 0.5 ? 'worsening' : 'stable',
    };
  }

  /**
   * Determine status based on deviation
   */
  private determineStatus(percentage: number, config: DriftMonitorConfig): 'normal' | 'warning' | 'critical' {
    const absPercent = Math.abs(percentage);
    if (absPercent >= config.criticalThreshold) return 'critical';
    if (absPercent >= config.warningThreshold) return 'warning';
    return 'normal';
  }

  /**
   * Create drift event
   */
  private createDriftEvent(
    monitor: DriftMonitor,
    measurement: DriftMeasurement,
    deviation: DriftDeviation
  ): DriftEvent {
    const severity = this.determineSeverity(deviation.percentage, monitor.config);

    const event: DriftEvent = {
      id: generateId(),
      category: monitor.category,
      severity,
      status: 'active',
      title: `Drift detected in ${monitor.name}`,
      description: `${monitor.metric} has deviated ${deviation.percentage.toFixed(1)}% from baseline`,
      source: monitor.source,
      baseline: monitor.baseline,
      current: measurement,
      deviation,
      impact: this.assessImpact(monitor, deviation),
      recommendations: this.generateRecommendations(monitor, deviation),
      detectedAt: new Date(),
    };

    this.events.set(event.id, event);
    return event;
  }

  /**
   * Determine severity from deviation
   */
  private determineSeverity(percentage: number, config: DriftMonitorConfig): DriftSeverity {
    const absPercent = Math.abs(percentage);
    if (absPercent >= config.criticalThreshold * 2) return 'critical';
    if (absPercent >= config.criticalThreshold) return 'high';
    if (absPercent >= config.warningThreshold) return 'medium';
    if (absPercent >= config.warningThreshold * 0.5) return 'low';
    return 'info';
  }

  /**
   * Assess impact of drift
   */
  private assessImpact(monitor: DriftMonitor, deviation: DriftDeviation): DriftImpact {
    const baseImpact = Math.abs(deviation.percentage) * 100;

    return {
      revenueAtRisk: baseImpact * 10, // Simplified calculation
      affectedEntities: Math.floor(baseImpact / 10),
      affectedProcesses: [monitor.metric],
      estimatedTimeToResolve: Math.max(1, Math.floor(Math.abs(deviation.percentage) / 10)),
      cascadeRisk: Math.min(100, Math.abs(deviation.percentage) * 2),
    };
  }

  /**
   * Generate recommendations for drift
   */
  private generateRecommendations(monitor: DriftMonitor, deviation: DriftDeviation): string[] {
    const recommendations: string[] = [];

    if (deviation.direction === 'down') {
      recommendations.push(`Investigate decline in ${monitor.metric}`);
      recommendations.push('Review recent changes that may have caused degradation');
    } else if (deviation.direction === 'up') {
      recommendations.push(`Validate increase in ${monitor.metric} is expected`);
      recommendations.push('Check for data quality issues or anomalies');
    }

    recommendations.push('Review historical trend data');
    recommendations.push('Consider adjusting baseline if change is permanent');

    if (monitor.config.autoRemediate) {
      recommendations.push('Auto-remediation is enabled - monitor for automatic corrections');
    }

    return recommendations;
  }

  /**
   * Create alert for drift event
   */
  private createAlert(monitor: DriftMonitor, event: DriftEvent): DriftAlert {
    const alert: DriftAlert = {
      id: generateId(),
      monitorId: monitor.id,
      severity: event.severity,
      message: event.description,
      value: event.current.value,
      threshold: event.severity === 'critical' 
        ? monitor.config.criticalThreshold 
        : monitor.config.warningThreshold,
      triggeredAt: new Date(),
    };

    monitor.alerts.push(alert);
    return alert;
  }

  /**
   * Detect patterns in recent events
   */
  private async detectPatterns(): Promise<void> {
    const recentEvents = Array.from(this.events.values())
      .filter(e => Date.now() - e.detectedAt.getTime() < 86400000); // Last 24 hours

    for (const [patternId, pattern] of this.patterns) {
      let matchScore = 0;

      for (const indicator of pattern.indicators) {
        const matchingEvents = recentEvents.filter(e => 
          e.baseline.metric === indicator.metric &&
          this.matchesIndicator(e.deviation, indicator)
        );

        if (matchingEvents.length > 0) {
          matchScore += indicator.weight;
        }
      }

      if (matchScore >= 0.7) {
        pattern.detectedCount++;
        pattern.lastDetectedAt = new Date();
        pattern.frequency = pattern.detectedCount;
      }
    }
  }

  /**
   * Check if deviation matches indicator
   */
  private matchesIndicator(deviation: DriftDeviation, indicator: DriftIndicator): boolean {
    switch (indicator.operator) {
      case 'increase':
        return deviation.direction === 'up' && deviation.percentage >= indicator.value;
      case 'decrease':
        return deviation.direction === 'down' && Math.abs(deviation.percentage) >= indicator.value;
      case 'change':
        return Math.abs(deviation.percentage) >= indicator.value;
      case 'threshold':
        return Math.abs(deviation.percentage) >= indicator.value;
      default:
        return false;
    }
  }

  /**
   * Acknowledge a drift event
   */
  acknowledgeEvent(eventId: string, userId: string): boolean {
    const event = this.events.get(eventId);
    if (!event) return false;

    event.status = 'acknowledged';
    event.acknowledgedAt = new Date();
    event.acknowledgedBy = userId;

    return true;
  }

  /**
   * Resolve a drift event
   */
  resolveEvent(eventId: string): boolean {
    const event = this.events.get(eventId);
    if (!event) return false;

    event.status = 'resolved';
    event.resolvedAt = new Date();

    return true;
  }

  /**
   * Suppress a drift event
   */
  suppressEvent(eventId: string, duration?: number): boolean {
    const event = this.events.get(eventId);
    if (!event) return false;

    event.status = 'suppressed';
    return true;
  }

  /**
   * Update baseline for a monitor
   */
  updateBaseline(monitorId: string, newValue: number): boolean {
    const monitor = this.monitors.get(monitorId);
    if (!monitor) return false;

    monitor.baseline.value = newValue;
    monitor.baseline.calculatedAt = new Date();

    return true;
  }

  /**
   * Generate drift report
   */
  generateReport(periodDays: number = 7): DriftReport {
    const periodStart = new Date(Date.now() - periodDays * 86400000);
    const periodEnd = new Date();

    const periodEvents = Array.from(this.events.values())
      .filter(e => e.detectedAt >= periodStart && e.detectedAt <= periodEnd);

    // Calculate summary
    const summary: DriftSummary = {
      totalEvents: periodEvents.length,
      criticalEvents: periodEvents.filter(e => e.severity === 'critical').length,
      highEvents: periodEvents.filter(e => e.severity === 'high').length,
      resolvedEvents: periodEvents.filter(e => e.status === 'resolved').length,
      avgResolutionTime: this.calculateAvgResolutionTime(periodEvents),
      topAffectedAreas: this.getTopAffectedAreas(periodEvents),
      revenueImpact: periodEvents.reduce((sum, e) => sum + e.impact.revenueAtRisk, 0),
    };

    // Calculate trends
    const trends = this.calculateTrends();

    // Generate recommendations
    const recommendations = this.generateReportRecommendations(periodEvents, trends);

    // Calculate health score
    const healthScore = this.calculateHealthScore(summary);

    return {
      id: generateId(),
      period: { start: periodStart, end: periodEnd },
      summary,
      events: periodEvents,
      trends,
      recommendations,
      healthScore,
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate average resolution time
   */
  private calculateAvgResolutionTime(events: DriftEvent[]): number {
    const resolvedEvents = events.filter(e => e.resolvedAt);
    if (resolvedEvents.length === 0) return 0;

    const totalTime = resolvedEvents.reduce((sum, e) => {
      return sum + (e.resolvedAt!.getTime() - e.detectedAt.getTime());
    }, 0);

    return totalTime / resolvedEvents.length / 3600000; // Convert to hours
  }

  /**
   * Get top affected areas
   */
  private getTopAffectedAreas(events: DriftEvent[]): { category: DriftCategory; count: number }[] {
    const counts = new Map<DriftCategory, number>();
    
    for (const event of events) {
      counts.set(event.category, (counts.get(event.category) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate trends
   */
  private calculateTrends(): DriftTrend[] {
    const trends: DriftTrend[] = [];

    for (const [monitorId, monitor] of this.monitors) {
      if (monitor.history.length < 2) continue;

      const recentHistory = monitor.history.slice(-10);
      const avgRecent = recentHistory.reduce((sum, h) => sum + h.deviation, 0) / recentHistory.length;
      const avgOlder = monitor.history.slice(-20, -10).reduce((sum, h) => sum + h.deviation, 0) / 10;

      let direction: 'improving' | 'stable' | 'worsening';
      const change = avgRecent - avgOlder;
      
      if (Math.abs(change) < 1) direction = 'stable';
      else if (change < 0) direction = 'improving';
      else direction = 'worsening';

      trends.push({
        category: monitor.category,
        metric: monitor.metric,
        direction,
        changePercent: change,
        forecast: [avgRecent, avgRecent * 1.1, avgRecent * 1.2], // Simple forecast
      });
    }

    return trends;
  }

  /**
   * Generate report recommendations
   */
  private generateReportRecommendations(
    events: DriftEvent[],
    trends: DriftTrend[]
  ): DriftRecommendation[] {
    const recommendations: DriftRecommendation[] = [];
    let priority = 1;

    // Add recommendations based on critical events
    const criticalCategories = new Set(
      events.filter(e => e.severity === 'critical').map(e => e.category)
    );

    for (const category of criticalCategories) {
      recommendations.push({
        priority: priority++,
        category,
        title: `Address critical ${category} drift`,
        description: `Multiple critical drift events detected in ${category} category`,
        impact: 'High revenue and operational impact',
        effort: 'high',
        automatable: false,
      });
    }

    // Add recommendations based on worsening trends
    for (const trend of trends.filter(t => t.direction === 'worsening')) {
      recommendations.push({
        priority: priority++,
        category: trend.category,
        title: `Investigate ${trend.metric} degradation`,
        description: `${trend.metric} is showing a worsening trend of ${trend.changePercent.toFixed(1)}%`,
        impact: 'Potential future issues if not addressed',
        effort: 'medium',
        automatable: trend.category !== 'behavior',
      });
    }

    return recommendations;
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(summary: DriftSummary): number {
    let score = 100;

    // Deduct for critical events
    score -= summary.criticalEvents * 10;
    
    // Deduct for high events
    score -= summary.highEvents * 5;

    // Deduct for unresolved events
    score -= (summary.totalEvents - summary.resolvedEvents) * 2;

    // Bonus for quick resolution
    if (summary.avgResolutionTime < 4) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get monitor by ID
   */
  getMonitor(monitorId: string): DriftMonitor | undefined {
    return this.monitors.get(monitorId);
  }

  /**
   * Get all monitors
   */
  getMonitors(): DriftMonitor[] {
    return Array.from(this.monitors.values());
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): DriftEvent | undefined {
    return this.events.get(eventId);
  }

  /**
   * Get all events
   */
  getEvents(): DriftEvent[] {
    return Array.from(this.events.values());
  }

  /**
   * Get active events
   */
  getActiveEvents(): DriftEvent[] {
    return this.getEvents().filter(e => e.status === 'active');
  }

  /**
   * Get all patterns
   */
  getPatterns(): DriftPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Enable/disable a monitor
   */
  setMonitorEnabled(monitorId: string, enabled: boolean): boolean {
    const monitor = this.monitors.get(monitorId);
    if (!monitor) return false;

    monitor.enabled = enabled;
    return true;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalMonitors: number;
    enabledMonitors: number;
    totalEvents: number;
    activeEvents: number;
    criticalEvents: number;
    totalPatterns: number;
    detectedPatterns: number;
    healthScore: number;
  } {
    const monitors = this.getMonitors();
    const events = this.getEvents();
    const patterns = this.getPatterns();

    return {
      totalMonitors: monitors.length,
      enabledMonitors: monitors.filter(m => m.enabled).length,
      totalEvents: events.length,
      activeEvents: events.filter(e => e.status === 'active').length,
      criticalEvents: events.filter(e => e.severity === 'critical').length,
      totalPatterns: patterns.length,
      detectedPatterns: patterns.filter(p => p.detectedCount > 0).length,
      healthScore: this.calculateHealthScore({
        totalEvents: events.length,
        criticalEvents: events.filter(e => e.severity === 'critical').length,
        highEvents: events.filter(e => e.severity === 'high').length,
        resolvedEvents: events.filter(e => e.status === 'resolved').length,
        avgResolutionTime: 0,
        topAffectedAreas: [],
        revenueImpact: 0,
      }),
    };
  }
}

export default DriftDetectionEngine;
