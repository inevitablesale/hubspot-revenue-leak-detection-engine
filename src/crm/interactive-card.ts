/**
 * Interactive CRM Card UI
 * Enhanced CRM cards with interactive elements, real-time updates, and rich visualizations
 */

import {
  RevenueLeak,
  CRMCardResponse,
  CRMCardSection,
  CRMCardAction,
  LeakSeverity,
  LeakType,
} from '../types';
import { LeakScore } from '../scoring/leak-scorer';
import { Bookmark } from '../workflows/bookmarks';
import { generateId, formatCurrency, truncate } from '../utils/helpers';

export interface InteractiveCardConfig {
  maxSections: number;
  maxActionsPerLeak: number;
  baseUrl: string;
  enableRealTimeUpdates: boolean;
  showScores: boolean;
  showBookmarks: boolean;
  showTrends: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface InteractiveCard extends CRMCardResponse {
  interactiveElements: InteractiveElement[];
  realTimeConfig?: RealTimeConfig;
  analytics?: CardAnalytics;
}

export interface InteractiveElement {
  id: string;
  type: 'button' | 'dropdown' | 'toggle' | 'slider' | 'chart' | 'progress' | 'badge';
  position: { section: number; index: number };
  config: Record<string, unknown>;
  actions: ElementAction[];
}

export interface ElementAction {
  trigger: 'click' | 'change' | 'hover';
  type: 'api_call' | 'modal' | 'navigate' | 'update_card' | 'notify';
  config: Record<string, unknown>;
}

export interface RealTimeConfig {
  enabled: boolean;
  refreshInterval: number;
  subscriptions: string[];
}

export interface CardAnalytics {
  viewCount: number;
  actionCount: number;
  lastViewed?: Date;
  popularActions: string[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  type: 'primary' | 'secondary' | 'danger';
  action: ElementAction;
  disabled?: boolean;
  tooltip?: string;
}

export interface CardWidget {
  id: string;
  type: 'score_gauge' | 'trend_chart' | 'priority_badge' | 'bookmark_indicator' | 'action_menu';
  config: Record<string, unknown>;
  data: unknown;
}

const DEFAULT_CONFIG: InteractiveCardConfig = {
  maxSections: 5,
  maxActionsPerLeak: 3,
  baseUrl: '/api/v1',
  enableRealTimeUpdates: true,
  showScores: true,
  showBookmarks: true,
  showTrends: true,
  theme: 'auto',
};

export class InteractiveCRMCardBuilder {
  private config: InteractiveCardConfig;

  constructor(config: Partial<InteractiveCardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Build enhanced interactive CRM card
   */
  buildInteractiveCard(
    leaks: RevenueLeak[],
    entityId: string,
    entityType: string,
    options: {
      scores?: Map<string, LeakScore>;
      bookmarks?: Map<string, Bookmark>;
      trendData?: { direction: 'up' | 'down' | 'stable'; change: number };
    } = {}
  ): InteractiveCard {
    const sortedLeaks = this.sortLeaks(leaks);
    const displayLeaks = sortedLeaks.slice(0, this.config.maxSections);

    const sections: CRMCardSection[] = [];
    const interactiveElements: InteractiveElement[] = [];

    // Hero section with overall health score
    sections.push(this.buildHeroSection(leaks, options));
    
    // Add interactive score gauge
    if (this.config.showScores) {
      interactiveElements.push(this.createScoreGauge(leaks, options.scores));
    }

    // Quick actions bar
    sections.push(this.buildQuickActionsSection(leaks, entityId, entityType));
    
    // Individual leak cards
    for (let i = 0; i < displayLeaks.length; i++) {
      const leak = displayLeaks[i];
      const score = options.scores?.get(leak.id);
      const bookmark = options.bookmarks?.get(leak.id);
      
      sections.push(this.buildEnhancedLeakSection(leak, score, bookmark, i + 2));
      
      // Add interactive elements for this leak
      interactiveElements.push(...this.createLeakInteractiveElements(leak, score, i + 2));
    }

    // Trend section
    if (this.config.showTrends && options.trendData) {
      sections.push(this.buildTrendSection(options.trendData, leaks.length));
    }

    // Summary footer
    if (leaks.length > displayLeaks.length) {
      sections.push(this.buildFooterSection(leaks.length - displayLeaks.length, entityId, entityType));
    }

    return {
      results: sections,
      primaryAction: this.createPrimaryAction(entityId, entityType, leaks.length),
      secondaryActions: this.createSecondaryActions(entityId, entityType),
      interactiveElements,
      realTimeConfig: this.config.enableRealTimeUpdates ? {
        enabled: true,
        refreshInterval: 30000,
        subscriptions: [`leak_updates:${entityType}:${entityId}`],
      } : undefined,
      analytics: {
        viewCount: 0,
        actionCount: 0,
        popularActions: [],
      },
    };
  }

  /**
   * Build hero section with health indicator
   */
  private buildHeroSection(
    leaks: RevenueLeak[],
    options: { 
      scores?: Map<string, LeakScore>; 
      trendData?: { direction: 'up' | 'down' | 'stable'; change: number };
    }
  ): CRMCardSection {
    const totalRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    const criticalCount = leaks.filter(l => l.severity === 'critical').length;
    const avgScore = this.calculateAverageScore(leaks, options.scores);
    
    const healthStatus = this.getHealthStatus(criticalCount, leaks.length, avgScore);
    const trendIndicator = this.getTrendIndicator(options.trendData);

    return {
      id: 'hero-section',
      title: `Revenue Health ${trendIndicator}`,
      items: [
        {
          label: 'Status',
          dataType: 'STATUS',
          value: healthStatus.label,
        },
        {
          label: 'Leaks Detected',
          dataType: 'NUMERIC',
          value: leaks.length,
        },
        {
          label: 'Revenue at Risk',
          dataType: 'CURRENCY',
          value: totalRevenue,
        },
        {
          label: 'Avg Priority Score',
          dataType: 'NUMERIC',
          value: avgScore,
        },
      ],
    };
  }

  /**
   * Build quick actions section
   */
  private buildQuickActionsSection(
    leaks: RevenueLeak[],
    entityId: string,
    entityType: string
  ): CRMCardSection {
    const quickActions: QuickAction[] = [
      {
        id: 'fix-all',
        label: 'Fix All Leaks',
        icon: '🔧',
        type: 'primary',
        action: {
          trigger: 'click',
          type: 'api_call',
          config: {
            method: 'POST',
            url: `${this.config.baseUrl}/actions/fix-all`,
            body: { entityId, entityType },
          },
        },
        disabled: leaks.length === 0,
        tooltip: `Auto-fix ${leaks.length} detected leaks`,
      },
      {
        id: 'export',
        label: 'Export Report',
        icon: '📊',
        type: 'secondary',
        action: {
          trigger: 'click',
          type: 'api_call',
          config: {
            method: 'GET',
            url: `${this.config.baseUrl}/reports/export?entityId=${entityId}&entityType=${entityType}`,
          },
        },
      },
      {
        id: 'schedule',
        label: 'Schedule Review',
        icon: '📅',
        type: 'secondary',
        action: {
          trigger: 'click',
          type: 'modal',
          config: {
            modalId: 'schedule-review',
            props: { entityId, entityType },
          },
        },
      },
    ];

    return {
      id: 'quick-actions',
      title: 'Quick Actions',
      items: quickActions.map((qa, idx) => ({
        label: `${qa.icon} ${qa.label}`,
        dataType: 'STRING' as const,
        value: qa.tooltip || `Action ${idx + 1}`,
      })),
      linkUrl: `${this.config.baseUrl}/ui/actions?entityId=${entityId}&entityType=${entityType}`,
      linkLabel: 'Manage Actions',
    };
  }

  /**
   * Build enhanced leak section with score and bookmark indicators
   */
  private buildEnhancedLeakSection(
    leak: RevenueLeak,
    score?: LeakScore,
    bookmark?: Bookmark,
    sectionIndex: number = 0
  ): CRMCardSection {
    const severityEmoji = this.getSeverityEmoji(leak.severity);
    const typeLabel = this.getLeakTypeLabel(leak.type);
    const bookmarkIndicator = bookmark ? '🔖' : '';
    
    const items: Array<{ label: string; dataType: 'STRING' | 'NUMERIC' | 'CURRENCY' | 'DATE' | 'STATUS'; value: string | number }> = [
      {
        label: 'Type',
        dataType: 'STRING',
        value: `${severityEmoji} ${typeLabel}`,
      },
      {
        label: 'Revenue at Risk',
        dataType: 'CURRENCY',
        value: leak.potentialRevenue,
      },
    ];

    // Add score if available
    if (score) {
      items.push({
        label: 'Priority Score',
        dataType: 'NUMERIC',
        value: score.composite,
      });
      items.push({
        label: 'Recoverability',
        dataType: 'NUMERIC',
        value: score.recoverability,
      });
    }

    // Add description
    items.push({
      label: 'Issue',
      dataType: 'STRING',
      value: truncate(leak.description, 100),
    });

    // Add affected entity
    items.push({
      label: 'Affected',
      dataType: 'STRING',
      value: leak.affectedEntity.name || leak.affectedEntity.id,
    });

    return {
      id: `leak-${leak.id}`,
      title: `${bookmarkIndicator} Leak #${sectionIndex}: ${typeLabel}`,
      items,
      linkUrl: `${this.config.baseUrl}/ui/leak/${leak.id}`,
      linkLabel: 'View Details',
    };
  }

  /**
   * Build trend section
   */
  private buildTrendSection(
    trendData: { direction: 'up' | 'down' | 'stable'; change: number },
    currentCount: number
  ): CRMCardSection {
    const trendEmoji = trendData.direction === 'down' ? '📉' : 
                      trendData.direction === 'up' ? '📈' : '➡️';
    const trendLabel = trendData.direction === 'down' ? 'Improving' :
                      trendData.direction === 'up' ? 'Worsening' : 'Stable';

    return {
      id: 'trend-section',
      title: `${trendEmoji} Trend Analysis`,
      items: [
        {
          label: 'Overall Trend',
          dataType: 'STATUS',
          value: trendLabel,
        },
        {
          label: 'Change',
          dataType: 'NUMERIC',
          value: trendData.change,
        },
        {
          label: 'Current Leaks',
          dataType: 'NUMERIC',
          value: currentCount,
        },
      ],
    };
  }

  /**
   * Build footer section for remaining leaks
   */
  private buildFooterSection(
    remainingCount: number,
    entityId: string,
    entityType: string
  ): CRMCardSection {
    return {
      id: 'footer-section',
      title: 'More Leaks',
      items: [
        {
          label: 'Hidden',
          dataType: 'STRING',
          value: `${remainingCount} additional leak${remainingCount > 1 ? 's' : ''} not shown`,
        },
      ],
      linkUrl: `${this.config.baseUrl}/ui/all-leaks?entityId=${entityId}&entityType=${entityType}`,
      linkLabel: 'View All Leaks',
    };
  }

  /**
   * Build actions for a single leak
   */
  private buildLeakActions(leak: RevenueLeak): CRMCardAction[] {
    const actions: CRMCardAction[] = [];

    // Fix action
    actions.push({
      type: 'ACTION_HOOK',
      httpMethod: 'POST',
      uri: `${this.config.baseUrl}/actions/${leak.id}/fix`,
      label: '🔧 Fix Now',
    });

    // Bookmark action
    actions.push({
      type: 'ACTION_HOOK',
      httpMethod: 'POST',
      uri: `${this.config.baseUrl}/bookmarks`,
      label: '🔖 Bookmark',
    });

    // Dismiss action
    actions.push({
      type: 'ACTION_HOOK',
      httpMethod: 'POST',
      uri: `${this.config.baseUrl}/actions/${leak.id}/dismiss`,
      label: '❌ Dismiss',
    });

    // Details action
    actions.push({
      type: 'IFRAME',
      uri: `${this.config.baseUrl}/ui/leak/${leak.id}`,
      label: '📋 Details',
    });

    return actions.slice(0, this.config.maxActionsPerLeak);
  }

  /**
   * Create score gauge interactive element
   */
  private createScoreGauge(
    leaks: RevenueLeak[],
    scores?: Map<string, LeakScore>
  ): InteractiveElement {
    const avgScore = this.calculateAverageScore(leaks, scores);
    
    return {
      id: 'score-gauge',
      type: 'chart',
      position: { section: 0, index: 0 },
      config: {
        chartType: 'gauge',
        value: avgScore,
        max: 100,
        thresholds: [
          { value: 35, color: '#22c55e', label: 'Low' },
          { value: 65, color: '#eab308', label: 'Medium' },
          { value: 85, color: '#f97316', label: 'High' },
          { value: 100, color: '#ef4444', label: 'Critical' },
        ],
      },
      actions: [
        {
          trigger: 'click',
          type: 'modal',
          config: { modalId: 'score-details' },
        },
      ],
    };
  }

  /**
   * Create interactive elements for a leak
   */
  private createLeakInteractiveElements(
    leak: RevenueLeak,
    score: LeakScore | undefined,
    sectionIndex: number
  ): InteractiveElement[] {
    const elements: InteractiveElement[] = [];

    // Priority badge
    elements.push({
      id: `badge-${leak.id}`,
      type: 'badge',
      position: { section: sectionIndex, index: 0 },
      config: {
        text: leak.severity.toUpperCase(),
        color: this.getSeverityColor(leak.severity),
      },
      actions: [],
    });

    // Progress bar for recoverability
    if (score) {
      elements.push({
        id: `progress-${leak.id}`,
        type: 'progress',
        position: { section: sectionIndex, index: 1 },
        config: {
          value: score.recoverability,
          max: 100,
          label: 'Recoverability',
          color: score.recoverability >= 70 ? '#22c55e' : 
                 score.recoverability >= 40 ? '#eab308' : '#ef4444',
        },
        actions: [],
      });
    }

    // Quick action dropdown
    elements.push({
      id: `actions-${leak.id}`,
      type: 'dropdown',
      position: { section: sectionIndex, index: 2 },
      config: {
        label: 'Quick Actions',
        options: leak.suggestedActions.map(a => ({
          value: a.id,
          label: a.title,
        })),
      },
      actions: [
        {
          trigger: 'change',
          type: 'api_call',
          config: {
            method: 'POST',
            url: `${this.config.baseUrl}/actions/${leak.id}/execute`,
          },
        },
      ],
    });

    return elements;
  }

  /**
   * Create primary action button
   */
  private createPrimaryAction(
    entityId: string,
    entityType: string,
    leakCount: number
  ): CRMCardAction {
    return {
      type: 'IFRAME',
      uri: `${this.config.baseUrl}/ui/dashboard?entityId=${entityId}&entityType=${entityType}`,
      label: `🎯 Revenue Recovery Dashboard (${leakCount})`,
    };
  }

  /**
   * Create secondary action buttons
   */
  private createSecondaryActions(entityId: string, entityType: string): CRMCardAction[] {
    return [
      {
        type: 'IFRAME',
        uri: `${this.config.baseUrl}/ui/reports?entityId=${entityId}&entityType=${entityType}`,
        label: '📊 View Reports',
      },
      {
        type: 'IFRAME',
        uri: `${this.config.baseUrl}/ui/settings?entityId=${entityId}&entityType=${entityType}`,
        label: '⚙️ Settings',
      },
    ];
  }

  /**
   * Sort leaks by severity and revenue
   */
  private sortLeaks(leaks: RevenueLeak[]): RevenueLeak[] {
    const severityOrder: Record<LeakSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return [...leaks].sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.potentialRevenue - a.potentialRevenue;
    });
  }

  /**
   * Calculate average score
   */
  private calculateAverageScore(leaks: RevenueLeak[], scores?: Map<string, LeakScore>): number {
    if (!scores || leaks.length === 0) return 50;
    
    let total = 0;
    let count = 0;
    
    for (const leak of leaks) {
      const score = scores.get(leak.id);
      if (score) {
        total += score.composite;
        count++;
      }
    }
    
    return count > 0 ? Math.round(total / count) : 50;
  }

  /**
   * Get health status based on metrics
   */
  private getHealthStatus(criticalCount: number, totalCount: number, avgScore: number): { label: string; color: string } {
    if (criticalCount > 0 || avgScore >= 80) {
      return { label: '🔴 Critical', color: '#ef4444' };
    }
    if (totalCount > 5 || avgScore >= 60) {
      return { label: '🟠 At Risk', color: '#f97316' };
    }
    if (totalCount > 2 || avgScore >= 40) {
      return { label: '🟡 Attention Needed', color: '#eab308' };
    }
    if (totalCount > 0) {
      return { label: '🟢 Manageable', color: '#22c55e' };
    }
    return { label: '✅ Healthy', color: '#10b981' };
  }

  /**
   * Get trend indicator emoji
   */
  private getTrendIndicator(trendData?: { direction: 'up' | 'down' | 'stable'; change: number }): string {
    if (!trendData) return '';
    if (trendData.direction === 'down') return '📉';
    if (trendData.direction === 'up') return '📈';
    return '➡️';
  }

  /**
   * Get severity emoji
   */
  private getSeverityEmoji(severity: LeakSeverity): string {
    const emojis: Record<LeakSeverity, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };
    return emojis[severity];
  }

  /**
   * Get severity color
   */
  private getSeverityColor(severity: LeakSeverity): string {
    const colors: Record<LeakSeverity, string> = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e',
    };
    return colors[severity];
  }

  /**
   * Get leak type label
   */
  private getLeakTypeLabel(type: LeakType): string {
    const labels: Record<LeakType, string> = {
      underbilling: 'Underbilling',
      missed_renewal: 'Missed Renewal',
      untriggered_crosssell: 'Cross-Sell Opportunity',
      stalled_cs_handoff: 'Stalled CS Handoff',
      invalid_lifecycle_path: 'Invalid Lifecycle',
      billing_gap: 'Billing Gap',
    };
    return labels[type];
  }

  /**
   * Build empty state card
   */
  buildEmptyCard(entityId: string, entityType: string): InteractiveCard {
    return {
      results: [
        {
          id: 'empty-state',
          title: '✅ No Revenue Leaks Detected',
          items: [
            {
              label: 'Status',
              dataType: 'STATUS',
              value: 'All systems healthy',
            },
            {
              label: 'Last Checked',
              dataType: 'DATE',
              value: new Date().toISOString(),
            },
          ],
        },
      ],
      interactiveElements: [],
    };
  }
}

export default InteractiveCRMCardBuilder;
