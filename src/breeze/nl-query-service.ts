/**
 * Natural Language Query Service
 * Allows executives to ask questions about leak data in plain English
 */

import { RevenueLeak, LeakType, LeakSeverity, LeakDetectionResult } from '../types';
import { generateId } from '../utils/helpers';

export interface NLQueryRequest {
  query: string;
  context?: {
    portalId?: string;
    userId?: string;
    timeRange?: '7d' | '30d' | '90d' | '1y';
  };
}

export interface NLQueryResponse {
  id: string;
  query: string;
  answer: string;
  confidence: number;
  dataPoints: DataPoint[];
  suggestedFollowUps: string[];
  executedAt: Date;
}

export interface DataPoint {
  label: string;
  value: string | number;
  type: 'currency' | 'number' | 'percentage' | 'text' | 'date';
  context?: string;
}

export interface QueryPattern {
  id: string;
  pattern: RegExp;
  intent: QueryIntent;
  extractors: ParameterExtractor[];
}

export interface ParameterExtractor {
  name: string;
  pattern: RegExp;
  transform?: (match: string) => unknown;
}

export type QueryIntent = 
  | 'total_revenue_at_risk'
  | 'leak_count'
  | 'leak_by_type'
  | 'leak_by_severity'
  | 'recovery_rate'
  | 'trend_analysis'
  | 'top_leaks'
  | 'comparison'
  | 'recommendations'
  | 'summary'
  | 'unknown';

export interface QueryContext {
  leaks: RevenueLeak[];
  detectionResult?: LeakDetectionResult;
  historicalData?: {
    previousPeriodLeaks: RevenueLeak[];
    trends: TrendData[];
  };
}

export interface TrendData {
  date: Date;
  leakCount: number;
  potentialRevenue: number;
  resolvedCount: number;
}

export class NaturalLanguageQueryService {
  private patterns: QueryPattern[] = [];
  private queryHistory: NLQueryResponse[] = [];

  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize query patterns for intent recognition
   */
  private initializePatterns(): void {
    this.patterns = [
      {
        id: 'total-revenue-risk',
        pattern: /how much (arr|revenue|money|value) (is|are) (stuck|at risk|leaking|lost)/i,
        intent: 'total_revenue_at_risk',
        extractors: [
          {
            name: 'leakType',
            pattern: /renewal|crosssell|underbilling|handoff|billing/i
          },
          {
            name: 'timeRange',
            pattern: /(this|last) (week|month|quarter|year)/i
          }
        ]
      },
      {
        id: 'leak-count',
        pattern: /how many (leaks|issues|problems|risks)/i,
        intent: 'leak_count',
        extractors: [
          {
            name: 'leakType',
            pattern: /renewal|crosssell|underbilling|handoff|billing/i
          },
          {
            name: 'severity',
            pattern: /critical|high|medium|low/i
          }
        ]
      },
      {
        id: 'leak-by-type',
        pattern: /what (types|kinds|categories) of (leaks|issues)/i,
        intent: 'leak_by_type',
        extractors: []
      },
      {
        id: 'top-leaks',
        pattern: /(top|biggest|largest|highest|worst) (leaks|risks|issues)/i,
        intent: 'top_leaks',
        extractors: [
          {
            name: 'count',
            pattern: /\d+/,
            transform: (m) => parseInt(m, 10)
          }
        ]
      },
      {
        id: 'recovery-rate',
        pattern: /(recovery|resolution|fix) rate/i,
        intent: 'recovery_rate',
        extractors: []
      },
      {
        id: 'trend-analysis',
        pattern: /(trend|trending|going|improving|declining|changing)/i,
        intent: 'trend_analysis',
        extractors: [
          {
            name: 'timeRange',
            pattern: /(this|last) (week|month|quarter|year)/i
          }
        ]
      },
      {
        id: 'comparison',
        pattern: /compare|versus|vs|compared to|difference/i,
        intent: 'comparison',
        extractors: [
          {
            name: 'period1',
            pattern: /(this|last) (week|month|quarter|year)/i
          }
        ]
      },
      {
        id: 'summary',
        pattern: /(summary|overview|status|report|brief)/i,
        intent: 'summary',
        extractors: []
      },
      {
        id: 'recommendations',
        pattern: /(recommend|suggest|should|action|fix|resolve)/i,
        intent: 'recommendations',
        extractors: []
      }
    ];
  }

  /**
   * Process a natural language query
   */
  async processQuery(request: NLQueryRequest, context: QueryContext): Promise<NLQueryResponse> {
    const intent = this.identifyIntent(request.query);
    const parameters = this.extractParameters(request.query, intent);
    
    let answer: string;
    let dataPoints: DataPoint[] = [];
    let confidence = 0.8;

    switch (intent) {
      case 'total_revenue_at_risk':
        const result = this.calculateTotalRevenueAtRisk(context, parameters);
        answer = result.answer;
        dataPoints = result.dataPoints;
        break;

      case 'leak_count':
        const countResult = this.calculateLeakCount(context, parameters);
        answer = countResult.answer;
        dataPoints = countResult.dataPoints;
        break;

      case 'leak_by_type':
        const typeResult = this.analyzeLeaksByType(context);
        answer = typeResult.answer;
        dataPoints = typeResult.dataPoints;
        break;

      case 'top_leaks':
        const topResult = this.getTopLeaks(context, parameters.count as number || 5);
        answer = topResult.answer;
        dataPoints = topResult.dataPoints;
        break;

      case 'recovery_rate':
        const recoveryResult = this.calculateRecoveryRate(context);
        answer = recoveryResult.answer;
        dataPoints = recoveryResult.dataPoints;
        break;

      case 'trend_analysis':
        const trendResult = this.analyzeTrends(context, parameters);
        answer = trendResult.answer;
        dataPoints = trendResult.dataPoints;
        break;

      case 'summary':
        const summaryResult = this.generateSummary(context);
        answer = summaryResult.answer;
        dataPoints = summaryResult.dataPoints;
        break;

      case 'recommendations':
        const recResult = this.generateRecommendations(context);
        answer = recResult.answer;
        dataPoints = recResult.dataPoints;
        break;

      default:
        answer = this.generateDefaultResponse(request.query, context);
        confidence = 0.5;
    }

    const suggestedFollowUps = this.generateFollowUpQuestions(intent, context);

    const response: NLQueryResponse = {
      id: generateId(),
      query: request.query,
      answer,
      confidence,
      dataPoints,
      suggestedFollowUps,
      executedAt: new Date()
    };

    this.queryHistory.push(response);
    return response;
  }

  /**
   * Identify the intent of a query
   */
  private identifyIntent(query: string): QueryIntent {
    for (const pattern of this.patterns) {
      if (pattern.pattern.test(query)) {
        return pattern.intent;
      }
    }
    return 'unknown';
  }

  /**
   * Extract parameters from query
   */
  private extractParameters(query: string, intent: QueryIntent): Record<string, unknown> {
    const pattern = this.patterns.find(p => p.intent === intent);
    if (!pattern) return {};

    const params: Record<string, unknown> = {};
    for (const extractor of pattern.extractors) {
      const match = query.match(extractor.pattern);
      if (match) {
        params[extractor.name] = extractor.transform ? extractor.transform(match[0]) : match[0];
      }
    }
    return params;
  }

  /**
   * Calculate total revenue at risk
   */
  private calculateTotalRevenueAtRisk(
    context: QueryContext,
    params: Record<string, unknown>
  ): { answer: string; dataPoints: DataPoint[] } {
    let leaks = context.leaks;
    
    // Filter by leak type if specified
    if (params.leakType) {
      const leakTypeMap: Record<string, LeakType> = {
        'renewal': 'missed_renewal',
        'crosssell': 'untriggered_crosssell',
        'underbilling': 'underbilling',
        'handoff': 'stalled_cs_handoff',
        'billing': 'billing_gap'
      };
      const type = leakTypeMap[String(params.leakType).toLowerCase()];
      if (type) {
        leaks = leaks.filter(l => l.type === type);
      }
    }

    const totalRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    const formattedRevenue = this.formatCurrency(totalRevenue);
    const leakType = params.leakType ? ` in ${params.leakType} leaks` : '';
    const timeRange = params.timeRange ? ` ${params.timeRange}` : '';

    return {
      answer: `There is ${formattedRevenue} in revenue at risk${leakType}${timeRange}. ` +
              `This comes from ${leaks.length} active revenue leaks across your CRM.`,
      dataPoints: [
        { label: 'Total Revenue at Risk', value: totalRevenue, type: 'currency' },
        { label: 'Active Leaks', value: leaks.length, type: 'number' },
        { label: 'Average per Leak', value: leaks.length > 0 ? totalRevenue / leaks.length : 0, type: 'currency' }
      ]
    };
  }

  /**
   * Calculate leak count
   */
  private calculateLeakCount(
    context: QueryContext,
    params: Record<string, unknown>
  ): { answer: string; dataPoints: DataPoint[] } {
    let leaks = context.leaks;
    const filters: string[] = [];

    if (params.severity) {
      const severity = String(params.severity).toLowerCase() as LeakSeverity;
      leaks = leaks.filter(l => l.severity === severity);
      filters.push(`${severity} severity`);
    }

    if (params.leakType) {
      const leakTypeMap: Record<string, LeakType> = {
        'renewal': 'missed_renewal',
        'crosssell': 'untriggered_crosssell',
        'underbilling': 'underbilling',
        'handoff': 'stalled_cs_handoff',
        'billing': 'billing_gap'
      };
      const type = leakTypeMap[String(params.leakType).toLowerCase()];
      if (type) {
        leaks = leaks.filter(l => l.type === type);
        filters.push(`${params.leakType} type`);
      }
    }

    const filterText = filters.length > 0 ? ` with ${filters.join(' and ')}` : '';

    return {
      answer: `You have ${leaks.length} revenue leaks${filterText} currently active. ` +
              `Together they represent ${this.formatCurrency(leaks.reduce((s, l) => s + l.potentialRevenue, 0))} in potential revenue.`,
      dataPoints: [
        { label: 'Total Leaks', value: leaks.length, type: 'number' },
        { label: 'Revenue at Risk', value: leaks.reduce((s, l) => s + l.potentialRevenue, 0), type: 'currency' }
      ]
    };
  }

  /**
   * Analyze leaks by type
   */
  private analyzeLeaksByType(context: QueryContext): { answer: string; dataPoints: DataPoint[] } {
    const byType: Record<LeakType, { count: number; revenue: number }> = {} as Record<LeakType, { count: number; revenue: number }>;
    
    for (const leak of context.leaks) {
      if (!byType[leak.type]) {
        byType[leak.type] = { count: 0, revenue: 0 };
      }
      byType[leak.type].count++;
      byType[leak.type].revenue += leak.potentialRevenue;
    }

    const sorted = Object.entries(byType).sort((a, b) => b[1].revenue - a[1].revenue);
    const topType = sorted[0];
    
    const typeLabels: Record<string, string> = {
      underbilling: 'Underbilling',
      missed_renewal: 'Missed Renewals',
      untriggered_crosssell: 'Cross-sell Opportunities',
      stalled_cs_handoff: 'Stalled CS Handoffs',
      invalid_lifecycle_path: 'Lifecycle Issues',
      billing_gap: 'Billing Gaps',
      stale_pipeline: 'Stale Pipeline',
      data_quality: 'Data Quality'
    };

    const dataPoints: DataPoint[] = sorted.map(([type, data]) => ({
      label: typeLabels[type] || type,
      value: data.count,
      type: 'number' as const,
      context: this.formatCurrency(data.revenue)
    }));

    return {
      answer: `Your leaks break down across ${sorted.length} categories. ` +
              `${typeLabels[topType[0]] || topType[0]} is your biggest issue with ${topType[1].count} leaks ` +
              `totaling ${this.formatCurrency(topType[1].revenue)} at risk.`,
      dataPoints
    };
  }

  /**
   * Get top leaks by revenue
   */
  private getTopLeaks(context: QueryContext, count: number): { answer: string; dataPoints: DataPoint[] } {
    const sorted = [...context.leaks].sort((a, b) => b.potentialRevenue - a.potentialRevenue);
    const top = sorted.slice(0, count);

    const dataPoints: DataPoint[] = top.map((leak, idx) => ({
      label: `#${idx + 1}: ${leak.affectedEntity.name || leak.affectedEntity.id}`,
      value: leak.potentialRevenue,
      type: 'currency' as const,
      context: `${leak.type} - ${leak.severity} severity`
    }));

    const totalTopRevenue = top.reduce((s, l) => s + l.potentialRevenue, 0);
    const totalAllRevenue = context.leaks.reduce((s, l) => s + l.potentialRevenue, 0);
    const percentageOfTotal = totalAllRevenue > 0 
      ? Math.round(totalTopRevenue / totalAllRevenue * 100) 
      : 0;

    return {
      answer: `Here are the top ${top.length} revenue leaks by value. Together they represent ` +
              `${this.formatCurrency(totalTopRevenue)} or ${percentageOfTotal}% ` +
              `of your total revenue at risk.`,
      dataPoints
    };
  }

  /**
   * Calculate recovery rate
   */
  private calculateRecoveryRate(context: QueryContext): { answer: string; dataPoints: DataPoint[] } {
    const total = context.leaks.length;
    const resolved = context.leaks.filter(l => (l.metadata as Record<string, unknown>)?.resolved).length;
    const rate = total > 0 ? resolved / total : 0;

    return {
      answer: `Your current recovery rate is ${Math.round(rate * 100)}%. ` +
              `You've resolved ${resolved} out of ${total} detected leaks. ` +
              `${rate < 0.5 ? 'Consider enabling more automation to improve recovery.' : 'Great job on staying on top of issues!'}`,
      dataPoints: [
        { label: 'Recovery Rate', value: rate, type: 'percentage' },
        { label: 'Resolved Leaks', value: resolved, type: 'number' },
        { label: 'Total Leaks', value: total, type: 'number' }
      ]
    };
  }

  /**
   * Analyze trends
   */
  private analyzeTrends(
    context: QueryContext,
    params: Record<string, unknown>
  ): { answer: string; dataPoints: DataPoint[] } {
    if (!context.historicalData?.trends || context.historicalData.trends.length < 2) {
      return {
        answer: 'Not enough historical data to analyze trends. Please check back after running a few detection scans.',
        dataPoints: []
      };
    }

    const trends = context.historicalData.trends;
    const latest = trends[trends.length - 1];
    const previous = trends[0];
    
    const leakChange = latest.leakCount - previous.leakCount;
    const revenueChange = latest.potentialRevenue - previous.potentialRevenue;
    const direction = leakChange > 0 ? 'increasing' : leakChange < 0 ? 'decreasing' : 'stable';

    return {
      answer: `Revenue leaks are ${direction}. You went from ${previous.leakCount} leaks to ${latest.leakCount} leaks. ` +
              `Revenue at risk changed by ${this.formatCurrency(Math.abs(revenueChange))} ` +
              `(${revenueChange > 0 ? 'increase' : 'decrease'}).`,
      dataPoints: [
        { label: 'Current Leaks', value: latest.leakCount, type: 'number' },
        { label: 'Previous Leaks', value: previous.leakCount, type: 'number' },
        { label: 'Change', value: leakChange, type: 'number' },
        { label: 'Revenue Change', value: revenueChange, type: 'currency' }
      ]
    };
  }

  /**
   * Generate executive summary
   */
  private generateSummary(context: QueryContext): { answer: string; dataPoints: DataPoint[] } {
    const totalLeaks = context.leaks.length;
    const totalRevenue = context.leaks.reduce((s, l) => s + l.potentialRevenue, 0);
    const criticalCount = context.leaks.filter(l => l.severity === 'critical').length;
    const highCount = context.leaks.filter(l => l.severity === 'high').length;

    const topType = this.getMostCommonLeakType(context.leaks);

    return {
      answer: `Executive Summary: You have ${totalLeaks} active revenue leaks totaling ` +
              `${this.formatCurrency(totalRevenue)} at risk. ` +
              `${criticalCount} are critical and ${highCount} are high severity, requiring immediate attention. ` +
              `Your most common issue is ${topType.type} with ${topType.count} occurrences.`,
      dataPoints: [
        { label: 'Total Revenue at Risk', value: totalRevenue, type: 'currency' },
        { label: 'Active Leaks', value: totalLeaks, type: 'number' },
        { label: 'Critical Issues', value: criticalCount, type: 'number' },
        { label: 'High Priority', value: highCount, type: 'number' },
        { label: 'Top Issue Type', value: topType.type, type: 'text' }
      ]
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(context: QueryContext): { answer: string; dataPoints: DataPoint[] } {
    const recommendations: string[] = [];
    const leaks = context.leaks;

    // Analyze patterns
    const criticalCount = leaks.filter(l => l.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(`Address ${criticalCount} critical issues immediately`);
    }

    const renewalLeaks = leaks.filter(l => l.type === 'missed_renewal').length;
    if (renewalLeaks > 5) {
      recommendations.push('Implement automated renewal reminders - you have multiple renewal risks');
    }

    const handoffLeaks = leaks.filter(l => l.type === 'stalled_cs_handoff').length;
    if (handoffLeaks > 3) {
      recommendations.push('Review your sales-to-CS handoff process - multiple handoffs are stalled');
    }

    const highValueLeaks = leaks.filter(l => l.potentialRevenue > 50000).length;
    if (highValueLeaks > 0) {
      recommendations.push(`Prioritize ${highValueLeaks} high-value leaks (over $50,000 each)`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring - your leak prevention is working well');
    }

    return {
      answer: `Here are my recommendations:\n\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n\n')}`,
      dataPoints: recommendations.map((rec, idx) => ({
        label: `Recommendation ${idx + 1}`,
        value: rec,
        type: 'text' as const
      }))
    };
  }

  /**
   * Generate default response for unknown queries
   */
  private generateDefaultResponse(query: string, context: QueryContext): string {
    const totalRevenue = context.leaks.reduce((s, l) => s + l.potentialRevenue, 0);
    return `I'm not sure how to answer "${query}" specifically. ` +
           `Here's what I know: You have ${context.leaks.length} active leaks totaling ${this.formatCurrency(totalRevenue)} at risk. ` +
           `Try asking about revenue at risk, leak counts, trends, or recommendations.`;
  }

  /**
   * Generate follow-up questions based on context
   */
  private generateFollowUpQuestions(intent: QueryIntent, context: QueryContext): string[] {
    const suggestions: string[] = [];

    switch (intent) {
      case 'total_revenue_at_risk':
        suggestions.push('What are the top 5 biggest leaks?');
        suggestions.push('How does this compare to last month?');
        suggestions.push('Which leak type has the most revenue at risk?');
        break;
      case 'leak_count':
        suggestions.push('How much revenue is at risk?');
        suggestions.push('Show me only critical leaks');
        suggestions.push('What types of leaks do we have?');
        break;
      case 'summary':
        suggestions.push('What should I prioritize first?');
        suggestions.push('Are leaks trending up or down?');
        suggestions.push('What\'s our recovery rate?');
        break;
      default:
        suggestions.push('Give me an executive summary');
        suggestions.push('How much ARR is at risk?');
        suggestions.push('What do you recommend?');
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Get most common leak type
   */
  private getMostCommonLeakType(leaks: RevenueLeak[]): { type: string; count: number } {
    const counts: Record<string, number> = {};
    for (const leak of leaks) {
      counts[leak.type] = (counts[leak.type] || 0) + 1;
    }
    
    let maxType = '';
    let maxCount = 0;
    for (const [type, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxType = type;
        maxCount = count;
      }
    }
    
    const typeLabels: Record<string, string> = {
      underbilling: 'Underbilling',
      missed_renewal: 'Missed Renewals',
      untriggered_crosssell: 'Cross-sell Opportunities',
      stalled_cs_handoff: 'CS Handoff Issues',
      billing_gap: 'Billing Gaps'
    };
    
    return { type: typeLabels[maxType] || maxType, count: maxCount };
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Get query history
   */
  getQueryHistory(limit: number = 50): NLQueryResponse[] {
    return this.queryHistory.slice(-limit);
  }

  /**
   * Clear query history
   */
  clearHistory(): void {
    this.queryHistory = [];
  }
}

export default NaturalLanguageQueryService;
