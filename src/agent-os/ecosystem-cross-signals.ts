/**
 * Ecosystem Cross-Signals Module
 * Multi-system signal correlation and early warning detection
 */

import { RevenueLeak, LeakType } from '../types';
import { generateId } from '../utils/helpers';
import {
  CrossSignal,
  SignalSource,
  EcosystemAlert,
  CrossSignalsConfig,
} from './types';

export interface SignalEvent {
  id: string;
  system: string;
  metric: string;
  timestamp: Date;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  metadata?: Record<string, unknown>;
}

export interface SignalCorrelation {
  id: string;
  signal1: SignalEvent;
  signal2: SignalEvent;
  correlationCoefficient: number;
  timelag: number;
  relationship: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface EarlyWarning {
  id: string;
  type: 'leading_indicator' | 'anomaly_cluster' | 'trend_reversal' | 'threshold_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  signals: SignalEvent[];
  predictedImpact: {
    metric: string;
    expectedChange: number;
    timeframe: number;
    confidence: number;
  };
  recommendedActions: string[];
  createdAt: Date;
  expiresAt: Date;
}

export interface SystemMetrics {
  systemId: string;
  metrics: Array<{
    name: string;
    currentValue: number;
    historicalValues: Array<{ timestamp: Date; value: number }>;
  }>;
  lastUpdated: Date;
}

export class EcosystemCrossSignals {
  private signals: Map<string, SignalEvent[]> = new Map();
  private correlations: Map<string, SignalCorrelation> = new Map();
  private crossSignals: Map<string, CrossSignal> = new Map();
  private alerts: Map<string, EcosystemAlert> = new Map();
  private warnings: Map<string, EarlyWarning> = new Map();
  private config: CrossSignalsConfig;

  constructor(config?: Partial<CrossSignalsConfig>) {
    this.config = {
      enabled: true,
      correlationThreshold: 0.6,
      signalWindowHours: 168, // 7 days
      minSignalSources: 2,
      ...config,
    };

    this.initializeKnownSignals();
  }

  /**
   * Initialize known cross-signal patterns
   */
  private initializeKnownSignals(): void {
    // Support ticket surge → Churn risk
    this.crossSignals.set('support-churn', {
      id: 'support-churn',
      name: 'Support Surge to Churn Risk',
      sources: [
        { system: 'support', metric: 'ticket_volume', direction: 'increase', magnitude: 0.5 },
        { system: 'support', metric: 'avg_resolution_time', direction: 'increase', magnitude: 0.3 },
      ],
      signalType: 'leading',
      correlationStrength: 0.72,
      timelag: 30, // 30 days
      description: 'Increased support tickets often precede churn events',
      detectedAt: new Date(),
    });

    // Product usage decline → Renewal risk
    this.crossSignals.set('usage-renewal', {
      id: 'usage-renewal',
      name: 'Usage Decline to Renewal Risk',
      sources: [
        { system: 'product', metric: 'daily_active_users', direction: 'decrease', magnitude: 0.25 },
        { system: 'product', metric: 'feature_adoption', direction: 'decrease', magnitude: 0.2 },
      ],
      signalType: 'leading',
      correlationStrength: 0.68,
      timelag: 45,
      description: 'Declining product usage signals renewal risk',
      detectedAt: new Date(),
    });

    // Payment failures → Revenue leakage
    this.crossSignals.set('payment-leakage', {
      id: 'payment-leakage',
      name: 'Payment Issues to Revenue Leakage',
      sources: [
        { system: 'billing', metric: 'payment_failure_rate', direction: 'increase', magnitude: 0.1 },
        { system: 'billing', metric: 'dunning_emails_sent', direction: 'increase', magnitude: 0.3 },
      ],
      signalType: 'coincident',
      correlationStrength: 0.85,
      timelag: 7,
      description: 'Payment failures directly correlate with revenue leakage',
      detectedAt: new Date(),
    });

    // Marketing engagement → Sales pipeline
    this.crossSignals.set('marketing-pipeline', {
      id: 'marketing-pipeline',
      name: 'Marketing Engagement to Pipeline',
      sources: [
        { system: 'marketing', metric: 'email_open_rate', direction: 'increase', magnitude: 0.15 },
        { system: 'marketing', metric: 'content_downloads', direction: 'increase', magnitude: 0.3 },
      ],
      signalType: 'leading',
      correlationStrength: 0.55,
      timelag: 21,
      description: 'Marketing engagement signals future pipeline activity',
      detectedAt: new Date(),
    });

    // NPS decline → Multiple risks
    this.crossSignals.set('nps-risks', {
      id: 'nps-risks',
      name: 'NPS Decline Multi-Risk Indicator',
      sources: [
        { system: 'feedback', metric: 'nps_score', direction: 'decrease', magnitude: 0.15 },
        { system: 'feedback', metric: 'csat_score', direction: 'decrease', magnitude: 0.1 },
      ],
      signalType: 'leading',
      correlationStrength: 0.78,
      timelag: 60,
      description: 'NPS decline is a leading indicator for churn, support escalations, and revenue risk',
      detectedAt: new Date(),
    });

    // Invoice aging → Collections risk
    this.crossSignals.set('invoice-collections', {
      id: 'invoice-collections',
      name: 'Invoice Aging to Collections Risk',
      sources: [
        { system: 'billing', metric: 'avg_days_outstanding', direction: 'increase', magnitude: 0.2 },
        { system: 'billing', metric: 'overdue_invoice_count', direction: 'increase', magnitude: 0.25 },
      ],
      signalType: 'lagging',
      correlationStrength: 0.88,
      timelag: 14,
      description: 'Invoice aging indicates collection difficulties',
      detectedAt: new Date(),
    });
  }

  /**
   * Ingest a signal event
   */
  ingestSignal(
    system: string,
    metric: string,
    value: number,
    previousValue: number,
    metadata?: Record<string, unknown>
  ): SignalEvent {
    const change = value - previousValue;
    const changePercent = previousValue !== 0 
      ? (change / Math.abs(previousValue)) * 100 
      : (value !== 0 ? 100 : 0);

    const signal: SignalEvent = {
      id: generateId(),
      system,
      metric,
      timestamp: new Date(),
      value,
      previousValue,
      change,
      changePercent,
      metadata,
    };

    // Store signal
    const key = `${system}:${metric}`;
    const existing = this.signals.get(key) || [];
    existing.push(signal);

    // Maintain window size
    const cutoff = new Date(Date.now() - this.config.signalWindowHours * 60 * 60 * 1000);
    const filtered = existing.filter(s => s.timestamp >= cutoff);
    this.signals.set(key, filtered);

    // Check for cross-signal patterns
    this.detectCrossSignals(signal);

    // Check for anomalies
    this.checkForAnomalies(signal, filtered);

    return signal;
  }

  /**
   * Detect cross-signal patterns
   */
  private detectCrossSignals(newSignal: SignalEvent): void {
    const key = `${newSignal.system}:${newSignal.metric}`;

    for (const crossSignal of this.crossSignals.values()) {
      // Check if this signal matches any source in the cross-signal
      const matchingSource = crossSignal.sources.find(
        s => s.system === newSignal.system && s.metric === newSignal.metric
      );

      if (!matchingSource) continue;

      // Check if the signal direction matches
      const signalDirection = newSignal.change > 0 ? 'increase' : 
                             newSignal.change < 0 ? 'decrease' : 'change';
      
      if (matchingSource.direction !== signalDirection && matchingSource.direction !== 'change') {
        continue;
      }

      // Check magnitude threshold
      const magnitudeThreshold = matchingSource.magnitude;
      const actualMagnitude = Math.abs(newSignal.changePercent) / 100;
      
      if (actualMagnitude < magnitudeThreshold) continue;

      // Check for other signals in the cross-signal pattern
      const otherSources = crossSignal.sources.filter(s => 
        !(s.system === newSignal.system && s.metric === newSignal.metric)
      );

      let matchingSignals = 0;
      for (const source of otherSources) {
        const sourceKey = `${source.system}:${source.metric}`;
        const sourceSignals = this.signals.get(sourceKey) || [];
        
        // Look for recent matching signals
        const recentSignals = sourceSignals.filter(s => {
          const age = (newSignal.timestamp.getTime() - s.timestamp.getTime()) / (1000 * 60 * 60);
          return age <= this.config.signalWindowHours;
        });

        const hasMatchingSignal = recentSignals.some(s => {
          const direction = s.change > 0 ? 'increase' : s.change < 0 ? 'decrease' : 'change';
          const magnitude = Math.abs(s.changePercent) / 100;
          return direction === source.direction && magnitude >= source.magnitude;
        });

        if (hasMatchingSignal) matchingSignals++;
      }

      // If enough sources match, generate alert
      const totalSources = crossSignal.sources.length;
      const matchRatio = (matchingSignals + 1) / totalSources; // +1 for the trigger signal

      if (matchRatio >= this.config.minSignalSources / totalSources) {
        this.generateCrossSignalAlert(crossSignal, newSignal);
      }
    }
  }

  /**
   * Generate a cross-signal alert
   */
  private generateCrossSignalAlert(crossSignal: CrossSignal, triggerSignal: SignalEvent): void {
    // Avoid duplicate alerts
    const existingAlert = Array.from(this.alerts.values()).find(a =>
      a.signals.some(s => s.id === crossSignal.id) &&
      Date.now() - a.createdAt.getTime() < 24 * 60 * 60 * 1000
    );

    if (existingAlert) return;

    const severity = this.determineSeverity(crossSignal);

    const alert: EcosystemAlert = {
      id: generateId(),
      signals: [crossSignal],
      severity,
      title: `Cross-Signal Alert: ${crossSignal.name}`,
      description: crossSignal.description,
      recommendedActions: this.getRecommendedActions(crossSignal),
      createdAt: new Date(),
    };

    this.alerts.set(alert.id, alert);
  }

  /**
   * Determine alert severity
   */
  private determineSeverity(crossSignal: CrossSignal): EcosystemAlert['severity'] {
    if (crossSignal.correlationStrength >= 0.8) return 'critical';
    if (crossSignal.correlationStrength >= 0.7) return 'warning';
    if (crossSignal.correlationStrength >= 0.6) return 'info';
    return 'info';
  }

  /**
   * Get recommended actions for a cross-signal
   */
  private getRecommendedActions(crossSignal: CrossSignal): string[] {
    const actions: string[] = [];

    switch (crossSignal.id) {
      case 'support-churn':
        actions.push('Review accounts with elevated support activity');
        actions.push('Proactively reach out to at-risk customers');
        actions.push('Analyze common issues for product improvements');
        break;
      case 'usage-renewal':
        actions.push('Identify accounts with declining usage');
        actions.push('Schedule customer success check-ins');
        actions.push('Prepare renewal incentive offers');
        break;
      case 'payment-leakage':
        actions.push('Review failed payments immediately');
        actions.push('Update payment methods proactively');
        actions.push('Consider alternative payment arrangements');
        break;
      case 'marketing-pipeline':
        actions.push('Nurture engaged leads with targeted content');
        actions.push('Alert sales team of high-intent prospects');
        actions.push('Schedule demo requests');
        break;
      case 'nps-risks':
        actions.push('Contact detractors immediately');
        actions.push('Investigate common concerns');
        actions.push('Implement service recovery initiatives');
        break;
      case 'invoice-collections':
        actions.push('Escalate collection efforts');
        actions.push('Review payment terms with customers');
        actions.push('Consider early payment incentives');
        break;
      default:
        actions.push('Review the signal sources');
        actions.push('Monitor for additional indicators');
    }

    return actions;
  }

  /**
   * Check for anomalies in signal history
   */
  private checkForAnomalies(signal: SignalEvent, history: SignalEvent[]): void {
    if (history.length < 5) return; // Need enough data

    // Calculate statistics
    const values = history.map(s => s.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Check for anomaly (>2 standard deviations)
    const zScore = stdDev > 0 ? Math.abs(signal.value - mean) / stdDev : 0;

    if (zScore > 2) {
      this.generateAnomalyWarning(signal, mean, stdDev, zScore);
    }
  }

  /**
   * Generate anomaly warning
   */
  private generateAnomalyWarning(
    signal: SignalEvent,
    mean: number,
    stdDev: number,
    zScore: number
  ): void {
    const warning: EarlyWarning = {
      id: generateId(),
      type: 'anomaly_cluster',
      severity: zScore > 3 ? 'high' : 'medium',
      title: `Anomaly Detected: ${signal.system} ${signal.metric}`,
      description: `${signal.metric} value of ${signal.value.toFixed(2)} is ${zScore.toFixed(1)} standard deviations from mean (${mean.toFixed(2)})`,
      signals: [signal],
      predictedImpact: {
        metric: 'revenue_at_risk',
        expectedChange: -5,
        timeframe: 30,
        confidence: 0.65,
      },
      recommendedActions: [
        'Investigate root cause of anomaly',
        'Check for data quality issues',
        'Review related metrics for correlated changes',
      ],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    this.warnings.set(warning.id, warning);
  }

  /**
   * Correlate signals from different systems
   */
  correlateSignals(
    system1: string,
    metric1: string,
    system2: string,
    metric2: string
  ): SignalCorrelation | null {
    const key1 = `${system1}:${metric1}`;
    const key2 = `${system2}:${metric2}`;

    const signals1 = this.signals.get(key1) || [];
    const signals2 = this.signals.get(key2) || [];

    if (signals1.length < 5 || signals2.length < 5) {
      return null; // Not enough data
    }

    // Calculate correlation
    const correlation = this.calculateCorrelation(signals1, signals2);

    if (Math.abs(correlation.coefficient) < this.config.correlationThreshold) {
      return null; // Correlation too weak
    }

    const signalCorrelation: SignalCorrelation = {
      id: generateId(),
      signal1: signals1[signals1.length - 1],
      signal2: signals2[signals2.length - 1],
      correlationCoefficient: correlation.coefficient,
      timelag: correlation.timelag,
      relationship: correlation.coefficient > 0 ? 'positive' : 'negative',
      confidence: Math.min(0.95, Math.abs(correlation.coefficient) + 0.1),
    };

    this.correlations.set(signalCorrelation.id, signalCorrelation);
    return signalCorrelation;
  }

  /**
   * Calculate correlation between two signal series
   */
  private calculateCorrelation(
    signals1: SignalEvent[],
    signals2: SignalEvent[]
  ): { coefficient: number; timelag: number } {
    // Simplified correlation calculation
    const values1 = signals1.slice(-10).map(s => s.value);
    const values2 = signals2.slice(-10).map(s => s.value);

    const n = Math.min(values1.length, values2.length);
    if (n < 3) return { coefficient: 0, timelag: 0 };

    // Calculate means
    const mean1 = values1.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const mean2 = values2.slice(0, n).reduce((a, b) => a + b, 0) / n;

    // Calculate correlation coefficient
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(denom1 * denom2);
    const coefficient = denominator > 0 ? numerator / denominator : 0;

    // Estimate timelag (simplified)
    const avgTimestamp1 = signals1.reduce((sum, s) => sum + s.timestamp.getTime(), 0) / signals1.length;
    const avgTimestamp2 = signals2.reduce((sum, s) => sum + s.timestamp.getTime(), 0) / signals2.length;
    const timelag = Math.abs(avgTimestamp1 - avgTimestamp2) / (1000 * 60 * 60 * 24); // days

    return { coefficient, timelag };
  }

  /**
   * Generate ecosystem summary
   */
  generateSummary(): {
    signalCount: number;
    activeAlerts: number;
    activeWarnings: number;
    topCorrelations: SignalCorrelation[];
    systemsMonitored: string[];
    metricsTracked: number;
  } {
    const allSignals = Array.from(this.signals.values()).flat();
    const systems = [...new Set(allSignals.map(s => s.system))];
    const metricsTracked = this.signals.size;

    const activeAlerts = Array.from(this.alerts.values())
      .filter(a => !a.resolvedAt);

    const activeWarnings = Array.from(this.warnings.values())
      .filter(w => w.expiresAt > new Date());

    const topCorrelations = Array.from(this.correlations.values())
      .sort((a, b) => Math.abs(b.correlationCoefficient) - Math.abs(a.correlationCoefficient))
      .slice(0, 5);

    return {
      signalCount: allSignals.length,
      activeAlerts: activeAlerts.length,
      activeWarnings: activeWarnings.length,
      topCorrelations,
      systemsMonitored: systems,
      metricsTracked,
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): EcosystemAlert[] {
    return Array.from(this.alerts.values())
      .filter(a => !a.resolvedAt);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledgedAt = new Date();
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolvedAt = new Date();
    }
  }

  /**
   * Get early warnings
   */
  getEarlyWarnings(): EarlyWarning[] {
    return Array.from(this.warnings.values())
      .filter(w => w.expiresAt > new Date());
  }

  /**
   * Get known cross-signals
   */
  getCrossSignals(): CrossSignal[] {
    return Array.from(this.crossSignals.values());
  }

  /**
   * Add a custom cross-signal pattern
   */
  addCrossSignal(crossSignal: CrossSignal): void {
    this.crossSignals.set(crossSignal.id, crossSignal);
  }

  /**
   * Get signals for a specific system
   */
  getSignalsForSystem(system: string): SignalEvent[] {
    const allSignals: SignalEvent[] = [];
    
    for (const [key, signals] of this.signals) {
      if (key.startsWith(`${system}:`)) {
        allSignals.push(...signals);
      }
    }

    return allSignals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSignals: number;
    totalAlerts: number;
    totalWarnings: number;
    totalCorrelations: number;
    crossSignalPatterns: number;
    systemsCovered: number;
  } {
    const allSignals = Array.from(this.signals.values()).flat();
    const systems = [...new Set(allSignals.map(s => s.system))];

    return {
      totalSignals: allSignals.length,
      totalAlerts: this.alerts.size,
      totalWarnings: this.warnings.size,
      totalCorrelations: this.correlations.size,
      crossSignalPatterns: this.crossSignals.size,
      systemsCovered: systems.length,
    };
  }
}

export default EcosystemCrossSignals;
