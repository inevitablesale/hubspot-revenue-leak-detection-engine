/**
 * Portal-Level Revenue Leakage Report
 * Comprehensive reporting and dashboards for revenue leak analysis
 */

import { RevenueLeak, LeakType, LeakSeverity, LeakDetectionResult } from '../types';
import { LeakScore } from '../scoring/leak-scorer';
import { generateId } from '../utils/helpers';

export interface ReportPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface LeakageReport {
  id: string;
  portalId: string;
  generatedAt: Date;
  period: ReportPeriod;
  summary: ReportSummary;
  byType: LeakTypeBreakdown[];
  byEntity: EntityBreakdown[];
  trends: TrendData;
  topLeaks: LeakDetail[];
  recommendations: ReportRecommendation[];
  healthScore: number;
}

export interface ReportSummary {
  totalLeaks: number;
  totalPotentialRevenue: number;
  resolvedLeaks: number;
  recoveredRevenue: number;
  recoveryRate: number;
  averageResolutionTime: number;
  newLeaksThisPeriod: number;
  deltaFromLastPeriod: number;
}

export interface LeakTypeBreakdown {
  type: LeakType;
  count: number;
  potentialRevenue: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  averageScore: number;
}

export interface EntityBreakdown {
  entityType: 'deal' | 'contact' | 'company' | 'contract';
  count: number;
  potentialRevenue: number;
  topEntities: Array<{
    id: string;
    name: string;
    leakCount: number;
    totalRevenue: number;
  }>;
}

export interface TrendData {
  weeklyTrend: TrendPoint[];
  monthlyTrend: TrendPoint[];
  byTypeTrend: Map<LeakType, TrendPoint[]>;
  projectedLoss: number;
  projectedRecovery: number;
}

export interface TrendPoint {
  date: Date;
  leakCount: number;
  revenue: number;
  resolved: number;
}

export interface LeakDetail {
  leak: RevenueLeak;
  score?: LeakScore;
  age: number;
  resolutionAttempts: number;
  assignee?: string;
}

export interface ReportRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'process' | 'training' | 'automation' | 'staffing';
  title: string;
  description: string;
  estimatedImpact: number;
  effort: 'low' | 'medium' | 'high';
}

export interface ReportOptions {
  portalId: string;
  period: ReportPeriod;
  includeResolved: boolean;
  groupBy?: 'type' | 'entity' | 'owner';
  format?: 'detailed' | 'summary' | 'executive';
}

export class RevenueLeakageReporter {
  private leakHistory: Map<string, RevenueLeak[]> = new Map();
  private resolvedLeaks: Map<string, { leak: RevenueLeak; resolvedAt: Date; recoveredAmount: number }[]> = new Map();

  /**
   * Generate comprehensive leakage report
   */
  generateReport(
    leaks: RevenueLeak[],
    scores: LeakScore[],
    options: ReportOptions
  ): LeakageReport {
    const scoreMap = new Map(scores.map(s => [s.leakId, s]));
    
    // Filter leaks by period
    const periodLeaks = leaks.filter(l => 
      l.detectedAt >= options.period.startDate && 
      l.detectedAt <= options.period.endDate
    );

    const summary = this.calculateSummary(periodLeaks, options);
    const byType = this.calculateTypeBreakdown(periodLeaks, scoreMap);
    const byEntity = this.calculateEntityBreakdown(periodLeaks);
    const trends = this.calculateTrends(leaks, options.period);
    const topLeaks = this.getTopLeaks(periodLeaks, scoreMap);
    const recommendations = this.generateRecommendations(periodLeaks, byType);
    const healthScore = this.calculateHealthScore(summary, byType);

    return {
      id: generateId(),
      portalId: options.portalId,
      generatedAt: new Date(),
      period: options.period,
      summary,
      byType,
      byEntity,
      trends,
      topLeaks,
      recommendations,
      healthScore,
    };
  }

  /**
   * Calculate report summary
   */
  private calculateSummary(leaks: RevenueLeak[], options: ReportOptions): ReportSummary {
    const resolved = this.resolvedLeaks.get(options.portalId) || [];
    const periodResolved = resolved.filter(r => 
      r.resolvedAt >= options.period.startDate && 
      r.resolvedAt <= options.period.endDate
    );

    const totalRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    const recoveredRevenue = periodResolved.reduce((sum, r) => sum + r.recoveredAmount, 0);

    return {
      totalLeaks: leaks.length,
      totalPotentialRevenue: totalRevenue,
      resolvedLeaks: periodResolved.length,
      recoveredRevenue,
      recoveryRate: leaks.length > 0 ? (periodResolved.length / leaks.length) * 100 : 0,
      averageResolutionTime: this.calculateAverageResolutionTime(periodResolved),
      newLeaksThisPeriod: leaks.length,
      deltaFromLastPeriod: this.calculateDelta(options),
    };
  }

  /**
   * Calculate type breakdown
   */
  private calculateTypeBreakdown(leaks: RevenueLeak[], scoreMap: Map<string, LeakScore>): LeakTypeBreakdown[] {
    const types: LeakType[] = [
      'underbilling', 'missed_renewal', 'untriggered_crosssell',
      'stalled_cs_handoff', 'invalid_lifecycle_path', 'billing_gap'
    ];

    const totalRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    const breakdowns: LeakTypeBreakdown[] = [];

    for (const type of types) {
      const typeLeaks = leaks.filter(l => l.type === type);
      const typeRevenue = typeLeaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
      const scores = typeLeaks.map(l => scoreMap.get(l.id)?.composite || 50);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      breakdowns.push({
        type,
        count: typeLeaks.length,
        potentialRevenue: typeRevenue,
        percentage: totalRevenue > 0 ? (typeRevenue / totalRevenue) * 100 : 0,
        trend: this.calculateTypeTrend(type),
        averageScore: Math.round(avgScore),
      });
    }

    return breakdowns.sort((a, b) => b.potentialRevenue - a.potentialRevenue);
  }

  /**
   * Calculate entity breakdown
   */
  private calculateEntityBreakdown(leaks: RevenueLeak[]): EntityBreakdown[] {
    const entityTypes = ['deal', 'contact', 'company', 'contract'] as const;
    const breakdowns: EntityBreakdown[] = [];

    for (const entityType of entityTypes) {
      const entityLeaks = leaks.filter(l => l.affectedEntity.type === entityType);
      
      // Group by entity ID
      const byEntity = new Map<string, { name?: string; leaks: RevenueLeak[] }>();
      for (const leak of entityLeaks) {
        const key = leak.affectedEntity.id;
        const existing = byEntity.get(key) || { name: leak.affectedEntity.name, leaks: [] };
        existing.leaks.push(leak);
        byEntity.set(key, existing);
      }

      const topEntities = Array.from(byEntity.entries())
        .map(([id, data]) => ({
          id,
          name: data.name || id,
          leakCount: data.leaks.length,
          totalRevenue: data.leaks.reduce((sum, l) => sum + l.potentialRevenue, 0),
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      breakdowns.push({
        entityType,
        count: entityLeaks.length,
        potentialRevenue: entityLeaks.reduce((sum, l) => sum + l.potentialRevenue, 0),
        topEntities,
      });
    }

    return breakdowns;
  }

  /**
   * Calculate trend data
   */
  private calculateTrends(allLeaks: RevenueLeak[], period: ReportPeriod): TrendData {
    const weeklyTrend = this.calculateWeeklyTrend(allLeaks, period);
    const monthlyTrend = this.calculateMonthlyTrend(allLeaks);
    const byTypeTrend = this.calculateByTypeTrend(allLeaks, period);

    // Project future losses based on trend
    const lastWeekRevenue = weeklyTrend.length > 0 ? weeklyTrend[weeklyTrend.length - 1].revenue : 0;
    const projectedLoss = lastWeekRevenue * 4; // Project 4 weeks

    return {
      weeklyTrend,
      monthlyTrend,
      byTypeTrend,
      projectedLoss,
      projectedRecovery: projectedLoss * 0.4, // Assume 40% recovery rate
    };
  }

  /**
   * Calculate weekly trend
   */
  private calculateWeeklyTrend(leaks: RevenueLeak[], period: ReportPeriod): TrendPoint[] {
    const points: TrendPoint[] = [];
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    
    let currentDate = new Date(period.startDate);
    while (currentDate <= period.endDate) {
      const weekEnd = new Date(currentDate.getTime() + weekMs);
      const weekLeaks = leaks.filter(l => 
        l.detectedAt >= currentDate && l.detectedAt < weekEnd
      );

      points.push({
        date: new Date(currentDate),
        leakCount: weekLeaks.length,
        revenue: weekLeaks.reduce((sum, l) => sum + l.potentialRevenue, 0),
        resolved: 0, // Would need resolution data
      });

      currentDate = weekEnd;
    }

    return points;
  }

  /**
   * Calculate monthly trend
   */
  private calculateMonthlyTrend(leaks: RevenueLeak[]): TrendPoint[] {
    const points: TrendPoint[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthLeaks = leaks.filter(l => 
        l.detectedAt >= monthStart && l.detectedAt <= monthEnd
      );

      points.push({
        date: monthStart,
        leakCount: monthLeaks.length,
        revenue: monthLeaks.reduce((sum, l) => sum + l.potentialRevenue, 0),
        resolved: 0,
      });
    }

    return points;
  }

  /**
   * Calculate trend by type
   */
  private calculateByTypeTrend(leaks: RevenueLeak[], period: ReportPeriod): Map<LeakType, TrendPoint[]> {
    const types: LeakType[] = [
      'underbilling', 'missed_renewal', 'untriggered_crosssell',
      'stalled_cs_handoff', 'invalid_lifecycle_path', 'billing_gap'
    ];

    const byTypeTrend = new Map<LeakType, TrendPoint[]>();

    for (const type of types) {
      const typeLeaks = leaks.filter(l => l.type === type);
      byTypeTrend.set(type, this.calculateWeeklyTrend(typeLeaks, period));
    }

    return byTypeTrend;
  }

  /**
   * Get top leaks by score
   */
  private getTopLeaks(leaks: RevenueLeak[], scoreMap: Map<string, LeakScore>): LeakDetail[] {
    return leaks
      .map(leak => ({
        leak,
        score: scoreMap.get(leak.id),
        age: Math.floor((Date.now() - leak.detectedAt.getTime()) / (1000 * 60 * 60 * 24)),
        resolutionAttempts: 0,
      }))
      .sort((a, b) => (b.score?.composite || 0) - (a.score?.composite || 0))
      .slice(0, 20);
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    leaks: RevenueLeak[], 
    typeBreakdown: LeakTypeBreakdown[]
  ): ReportRecommendation[] {
    const recommendations: ReportRecommendation[] = [];

    // Check for high underbilling
    const underbilling = typeBreakdown.find(t => t.type === 'underbilling');
    if (underbilling && underbilling.percentage > 25) {
      recommendations.push({
        id: generateId(),
        priority: 'high',
        category: 'process',
        title: 'Review Pricing Approval Process',
        description: `${Math.round(underbilling.percentage)}% of leaks are from underbilling. Consider implementing stricter discount approval workflows.`,
        estimatedImpact: underbilling.potentialRevenue * 0.5,
        effort: 'medium',
      });
    }

    // Check for CS handoff issues
    const handoff = typeBreakdown.find(t => t.type === 'stalled_cs_handoff');
    if (handoff && handoff.count > 5) {
      recommendations.push({
        id: generateId(),
        priority: 'high',
        category: 'automation',
        title: 'Automate CS Assignment',
        description: `${handoff.count} deals have stalled CS handoffs. Implement automatic CS owner assignment on deal close.`,
        estimatedImpact: handoff.potentialRevenue * 0.7,
        effort: 'low',
      });
    }

    // Check for renewal issues
    const renewals = typeBreakdown.find(t => t.type === 'missed_renewal');
    if (renewals && renewals.count > 3) {
      recommendations.push({
        id: generateId(),
        priority: 'high',
        category: 'process',
        title: 'Enhance Renewal Tracking',
        description: `${renewals.count} renewals at risk. Start renewal conversations 90 days before expiration.`,
        estimatedImpact: renewals.potentialRevenue * 0.6,
        effort: 'medium',
      });
    }

    // Check for cross-sell opportunities
    const crossSell = typeBreakdown.find(t => t.type === 'untriggered_crosssell');
    if (crossSell && crossSell.potentialRevenue > 50000) {
      recommendations.push({
        id: generateId(),
        priority: 'medium',
        category: 'training',
        title: 'Cross-Sell Training Program',
        description: `$${crossSell.potentialRevenue.toLocaleString()} in untapped cross-sell potential. Train account managers on expansion playbooks.`,
        estimatedImpact: crossSell.potentialRevenue * 0.3,
        effort: 'medium',
      });
    }

    // Check for billing gaps
    const billing = typeBreakdown.find(t => t.type === 'billing_gap');
    if (billing && billing.count > 5) {
      recommendations.push({
        id: generateId(),
        priority: 'high',
        category: 'automation',
        title: 'Billing Automation Review',
        description: `${billing.count} billing gaps detected. Review invoice generation automation and collection workflows.`,
        estimatedImpact: billing.potentialRevenue * 0.8,
        effort: 'medium',
      });
    }

    // General health recommendation
    if (leaks.length > 20) {
      recommendations.push({
        id: generateId(),
        priority: 'medium',
        category: 'staffing',
        title: 'Revenue Operations Review',
        description: `${leaks.length} active leaks indicate systemic issues. Consider dedicated RevOps resources.`,
        estimatedImpact: leaks.reduce((sum, l) => sum + l.potentialRevenue, 0) * 0.25,
        effort: 'high',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(summary: ReportSummary, typeBreakdown: LeakTypeBreakdown[]): number {
    let score = 100;

    // Deduct for total revenue at risk (max -30)
    const revenueRisk = Math.min(30, summary.totalPotentialRevenue / 10000);
    score -= revenueRisk;

    // Deduct for number of leaks (max -20)
    const leakCountPenalty = Math.min(20, summary.totalLeaks * 0.5);
    score -= leakCountPenalty;

    // Add for recovery rate (max +15)
    score += summary.recoveryRate * 0.15;

    // Deduct for critical leak types (max -20)
    const criticalTypes = typeBreakdown.filter(t => 
      t.type === 'missed_renewal' || t.type === 'billing_gap'
    );
    const criticalPenalty = Math.min(20, criticalTypes.reduce((sum, t) => sum + t.count, 0) * 2);
    score -= criticalPenalty;

    // Deduct for upward trends (max -10)
    const upwardTrends = typeBreakdown.filter(t => t.trend === 'up').length;
    score -= upwardTrends * 2;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate type trend
   */
  private calculateTypeTrend(type: LeakType): 'up' | 'down' | 'stable' {
    // Simplified - would need historical data
    return 'stable';
  }

  /**
   * Calculate average resolution time
   */
  private calculateAverageResolutionTime(resolved: Array<{ resolvedAt: Date }>): number {
    if (resolved.length === 0) return 0;
    // Simplified - would calculate actual resolution time
    return 5; // days
  }

  /**
   * Calculate delta from last period
   */
  private calculateDelta(options: ReportOptions): number {
    // Simplified - would compare with previous period
    return 0;
  }

  /**
   * Record a resolved leak
   */
  recordResolution(portalId: string, leak: RevenueLeak, recoveredAmount: number): void {
    const resolved = this.resolvedLeaks.get(portalId) || [];
    resolved.push({ leak, resolvedAt: new Date(), recoveredAmount });
    this.resolvedLeaks.set(portalId, resolved);
  }

  /**
   * Export report to various formats
   */
  exportReport(report: LeakageReport, format: 'json' | 'csv' | 'html'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'csv':
        return this.toCSV(report);
      case 'html':
        return this.toHTML(report);
      default:
        return JSON.stringify(report);
    }
  }

  /**
   * Convert report to CSV
   */
  private toCSV(report: LeakageReport): string {
    const lines: string[] = [
      'Metric,Value',
      `Total Leaks,${report.summary.totalLeaks}`,
      `Total Potential Revenue,${report.summary.totalPotentialRevenue}`,
      `Resolved Leaks,${report.summary.resolvedLeaks}`,
      `Recovered Revenue,${report.summary.recoveredRevenue}`,
      `Recovery Rate,${report.summary.recoveryRate}%`,
      `Health Score,${report.healthScore}`,
      '',
      'Leak Type,Count,Revenue,Percentage',
    ];

    for (const type of report.byType) {
      lines.push(`${type.type},${type.count},${type.potentialRevenue},${type.percentage.toFixed(1)}%`);
    }

    return lines.join('\n');
  }

  /**
   * Convert report to HTML
   */
  private toHTML(report: LeakageReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Revenue Leakage Report - ${report.period.label}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
    .card { background: #f5f5f5; padding: 20px; border-radius: 8px; }
    .card h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; }
    .card .value { font-size: 28px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    .health-score { font-size: 48px; font-weight: bold; text-align: center; }
    .health-good { color: #22c55e; }
    .health-warn { color: #eab308; }
    .health-bad { color: #ef4444; }
  </style>
</head>
<body>
  <h1>Revenue Leakage Report</h1>
  <p>Period: ${report.period.label} | Generated: ${report.generatedAt.toLocaleString()}</p>
  
  <div class="health-score ${report.healthScore >= 70 ? 'health-good' : report.healthScore >= 40 ? 'health-warn' : 'health-bad'}">
    Health Score: ${report.healthScore}/100
  </div>
  
  <div class="summary">
    <div class="card">
      <h3>Total Leaks</h3>
      <div class="value">${report.summary.totalLeaks}</div>
    </div>
    <div class="card">
      <h3>Potential Revenue</h3>
      <div class="value">$${report.summary.totalPotentialRevenue.toLocaleString()}</div>
    </div>
    <div class="card">
      <h3>Recovered</h3>
      <div class="value">$${report.summary.recoveredRevenue.toLocaleString()}</div>
    </div>
    <div class="card">
      <h3>Recovery Rate</h3>
      <div class="value">${report.summary.recoveryRate.toFixed(1)}%</div>
    </div>
  </div>
  
  <h2>Breakdown by Type</h2>
  <table>
    <thead>
      <tr><th>Type</th><th>Count</th><th>Revenue</th><th>% of Total</th><th>Trend</th></tr>
    </thead>
    <tbody>
      ${report.byType.map(t => `
        <tr>
          <td>${t.type}</td>
          <td>${t.count}</td>
          <td>$${t.potentialRevenue.toLocaleString()}</td>
          <td>${t.percentage.toFixed(1)}%</td>
          <td>${t.trend === 'up' ? '↑' : t.trend === 'down' ? '↓' : '→'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <h2>Recommendations</h2>
  <ul>
    ${report.recommendations.map(r => `
      <li><strong>[${r.priority.toUpperCase()}]</strong> ${r.title}: ${r.description}</li>
    `).join('')}
  </ul>
</body>
</html>
    `;
  }
}

export default RevenueLeakageReporter;
