/**
 * Portal Twin Module
 * Creates a complete digital replica of a HubSpot portal for simulation and analysis
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Portal Twin Types
// ============================================================

export interface PortalSnapshot {
  id: string;
  portalId: string;
  timestamp: Date;
  metrics: PortalMetrics;
  lifecycleGraph: LifecycleGraph;
  dealDistribution: DealDistribution;
  revenueModel: RevenueModel;
  attributionModel: AttributionSnapshot;
  userBehavior: UserBehaviorSnapshot;
  automationGraph: AutomationGraph;
}

export interface PortalMetrics {
  contacts: number;
  companies: number;
  deals: number;
  openDeals: number;
  closedWonDeals: number;
  closedLostDeals: number;
  totalRevenue: number;
  avgDealSize: number;
  winRate: number;
  cycleTime: number;
  pipelineValue: number;
  activeUsers: number;
}

export interface LifecycleGraph {
  stages: LifecycleStage[];
  transitions: LifecycleTransition[];
  bottlenecks: string[];
  avgTimeInStage: Record<string, number>;
}

export interface LifecycleStage {
  id: string;
  name: string;
  count: number;
  value: number;
  avgDaysInStage: number;
  conversionRate: number;
}

export interface LifecycleTransition {
  from: string;
  to: string;
  count: number;
  avgDays: number;
  probability: number;
}

export interface DealDistribution {
  byStage: Record<string, number>;
  byValue: ValueBucket[];
  byOwner: Record<string, number>;
  bySource: Record<string, number>;
  byAge: AgeBucket[];
}

export interface ValueBucket {
  min: number;
  max: number;
  count: number;
  totalValue: number;
}

export interface AgeBucket {
  label: string;
  minDays: number;
  maxDays: number;
  count: number;
}

export interface RevenueModel {
  monthly: MonthlyRevenue[];
  projections: RevenueProjection[];
  exposure: RevenueExposure;
  leakage: LeakageModel;
}

export interface MonthlyRevenue {
  month: string;
  actual: number;
  target: number;
  variance: number;
}

export interface RevenueProjection {
  period: string;
  conservative: number;
  expected: number;
  optimistic: number;
  confidence: number;
}

export interface RevenueExposure {
  atRisk: number;
  delayed: number;
  unbilled: number;
  disputed: number;
  total: number;
}

export interface LeakageModel {
  totalLeakage: number;
  byType: Record<string, number>;
  byStage: Record<string, number>;
  recoverable: number;
}

export interface AttributionSnapshot {
  modelType: string;
  channelPerformance: Record<string, number>;
  topCampaigns: string[];
  conversionPaths: number;
}

export interface UserBehaviorSnapshot {
  activeUsers: number;
  avgSessionsPerDay: number;
  topActions: string[];
  adoptionRate: number;
}

export interface AutomationGraph {
  workflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  topWorkflows: string[];
}

export interface PortalTwinConfig {
  snapshotInterval: number;
  retentionDays: number;
  includeHistory: boolean;
  compressionEnabled: boolean;
}

export interface PortalTwinStats {
  snapshotCount: number;
  lastSnapshot: Date | null;
  storageUsed: number;
  simulationsRun: number;
}

// ============================================================
// Portal Twin Implementation
// ============================================================

export class PortalTwin {
  private snapshots: Map<string, PortalSnapshot> = new Map();
  private currentSnapshot: PortalSnapshot | null = null;
  private config: PortalTwinConfig;
  private stats: PortalTwinStats;

  constructor(config?: Partial<PortalTwinConfig>) {
    this.config = {
      snapshotInterval: 86400000, // 24 hours
      retentionDays: 30,
      includeHistory: true,
      compressionEnabled: false,
      ...config,
    };

    this.stats = {
      snapshotCount: 0,
      lastSnapshot: null,
      storageUsed: 0,
      simulationsRun: 0,
    };
  }

  /**
   * Create a snapshot of the portal
   */
  createSnapshot(portalId: string, data: {
    contacts: Array<Record<string, unknown>>;
    companies: Array<Record<string, unknown>>;
    deals: Array<Record<string, unknown>>;
    users?: Array<Record<string, unknown>>;
    workflows?: Array<Record<string, unknown>>;
  }): PortalSnapshot {
    const metrics = this.calculateMetrics(data);
    const lifecycleGraph = this.buildLifecycleGraph(data.deals);
    const dealDistribution = this.calculateDealDistribution(data.deals);
    const revenueModel = this.buildRevenueModel(data.deals);
    const attributionModel = this.buildAttributionSnapshot(data.deals);
    const userBehavior = this.buildUserBehaviorSnapshot(data.users || []);
    const automationGraph = this.buildAutomationGraph(data.workflows || []);

    const snapshot: PortalSnapshot = {
      id: generateId(),
      portalId,
      timestamp: new Date(),
      metrics,
      lifecycleGraph,
      dealDistribution,
      revenueModel,
      attributionModel,
      userBehavior,
      automationGraph,
    };

    this.snapshots.set(snapshot.id, snapshot);
    this.currentSnapshot = snapshot;
    this.stats.snapshotCount++;
    this.stats.lastSnapshot = snapshot.timestamp;

    // Cleanup old snapshots
    this.cleanupOldSnapshots();

    return snapshot;
  }

  /**
   * Get current snapshot
   */
  getCurrentSnapshot(): PortalSnapshot | null {
    return this.currentSnapshot;
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(id: string): PortalSnapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(id1: string, id2: string): {
    metricsDelta: Record<string, number>;
    improvingMetrics: string[];
    decliningMetrics: string[];
    significantChanges: string[];
  } {
    const snap1 = this.snapshots.get(id1);
    const snap2 = this.snapshots.get(id2);

    if (!snap1 || !snap2) {
      return {
        metricsDelta: {},
        improvingMetrics: [],
        decliningMetrics: [],
        significantChanges: [],
      };
    }

    const metricsDelta: Record<string, number> = {};
    const improvingMetrics: string[] = [];
    const decliningMetrics: string[] = [];
    const significantChanges: string[] = [];

    // Compare metrics
    const m1 = snap1.metrics;
    const m2 = snap2.metrics;

    for (const key of Object.keys(m1) as (keyof PortalMetrics)[]) {
      const v1 = m1[key] as number;
      const v2 = m2[key] as number;
      const delta = v2 - v1;
      metricsDelta[key] = delta;

      // Determine if improving or declining based on metric type
      const positiveIsGood = ['contacts', 'companies', 'deals', 'closedWonDeals', 
        'totalRevenue', 'avgDealSize', 'winRate', 'pipelineValue', 'activeUsers'];
      const negativeIsGood = ['closedLostDeals', 'cycleTime'];

      if (positiveIsGood.includes(key)) {
        if (delta > 0) improvingMetrics.push(key);
        else if (delta < 0) decliningMetrics.push(key);
      } else if (negativeIsGood.includes(key)) {
        if (delta < 0) improvingMetrics.push(key);
        else if (delta > 0) decliningMetrics.push(key);
      }

      // Check for significant changes (>10%)
      if (v1 !== 0 && Math.abs(delta / v1) > 0.1) {
        significantChanges.push(`${key}: ${delta > 0 ? '+' : ''}${((delta / v1) * 100).toFixed(1)}%`);
      }
    }

    return {
      metricsDelta,
      improvingMetrics,
      decliningMetrics,
      significantChanges,
    };
  }

  /**
   * Get historical trend for a metric
   */
  getMetricTrend(metricName: keyof PortalMetrics): Array<{ timestamp: Date; value: number }> {
    const trend: Array<{ timestamp: Date; value: number }> = [];

    const sortedSnapshots = Array.from(this.snapshots.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const snapshot of sortedSnapshots) {
      trend.push({
        timestamp: snapshot.timestamp,
        value: snapshot.metrics[metricName] as number,
      });
    }

    return trend;
  }

  /**
   * Get statistics
   */
  getStats(): PortalTwinStats {
    return { ...this.stats };
  }

  // Private methods

  private calculateMetrics(data: {
    contacts: Array<Record<string, unknown>>;
    companies: Array<Record<string, unknown>>;
    deals: Array<Record<string, unknown>>;
    users?: Array<Record<string, unknown>>;
  }): PortalMetrics {
    const closedWon = data.deals.filter(d => d.stage === 'closedwon' || d.status === 'won');
    const closedLost = data.deals.filter(d => d.stage === 'closedlost' || d.status === 'lost');
    const openDeals = data.deals.filter(d => !['closedwon', 'closedlost'].includes(String(d.stage || '')));

    const totalRevenue = closedWon.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const avgDealSize = closedWon.length > 0 ? totalRevenue / closedWon.length : 0;
    const winRate = (closedWon.length + closedLost.length) > 0 
      ? closedWon.length / (closedWon.length + closedLost.length) 
      : 0;

    const cycleTime = closedWon.length > 0
      ? closedWon.reduce((sum, d) => {
          const created = new Date(String(d.created_at || d.createdate || Date.now()));
          const closed = new Date(String(d.closed_at || d.closedate || Date.now()));
          return sum + (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / closedWon.length
      : 0;

    const pipelineValue = openDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    return {
      contacts: data.contacts.length,
      companies: data.companies.length,
      deals: data.deals.length,
      openDeals: openDeals.length,
      closedWonDeals: closedWon.length,
      closedLostDeals: closedLost.length,
      totalRevenue,
      avgDealSize,
      winRate,
      cycleTime: Math.round(cycleTime),
      pipelineValue,
      activeUsers: data.users?.filter(u => u.active)?.length || 0,
    };
  }

  private buildLifecycleGraph(deals: Array<Record<string, unknown>>): LifecycleGraph {
    const stageMap = new Map<string, { count: number; value: number; days: number[] }>();
    const transitionMap = new Map<string, { count: number; days: number[] }>();

    // Process deals
    for (const deal of deals) {
      const stage = String(deal.stage || 'unknown');
      const value = Number(deal.amount) || 0;
      const daysInStage = Number(deal.days_in_stage) || 0;

      if (!stageMap.has(stage)) {
        stageMap.set(stage, { count: 0, value: 0, days: [] });
      }
      const stageData = stageMap.get(stage)!;
      stageData.count++;
      stageData.value += value;
      stageData.days.push(daysInStage);

      // Track transitions
      const prevStage = String(deal.previous_stage || '');
      if (prevStage) {
        const key = `${prevStage}->${stage}`;
        if (!transitionMap.has(key)) {
          transitionMap.set(key, { count: 0, days: [] });
        }
        const transData = transitionMap.get(key)!;
        transData.count++;
        transData.days.push(daysInStage);
      }
    }

    // Build stages array
    const stages: LifecycleStage[] = [];
    let prevCount = deals.length;

    for (const [name, data] of stageMap) {
      const avgDays = data.days.length > 0
        ? data.days.reduce((a, b) => a + b, 0) / data.days.length
        : 0;
      const conversionRate = prevCount > 0 ? data.count / prevCount : 0;

      stages.push({
        id: name,
        name,
        count: data.count,
        value: data.value,
        avgDaysInStage: Math.round(avgDays),
        conversionRate,
      });

      prevCount = data.count;
    }

    // Build transitions array
    const transitions: LifecycleTransition[] = [];
    for (const [key, data] of transitionMap) {
      const [from, to] = key.split('->');
      const avgDays = data.days.length > 0
        ? data.days.reduce((a, b) => a + b, 0) / data.days.length
        : 0;
      const fromStage = stageMap.get(from);
      const probability = fromStage ? data.count / fromStage.count : 0;

      transitions.push({
        from,
        to,
        count: data.count,
        avgDays: Math.round(avgDays),
        probability,
      });
    }

    // Identify bottlenecks
    const bottlenecks = stages
      .filter(s => s.avgDaysInStage > 14 || s.conversionRate < 0.5)
      .map(s => s.name);

    // Average time in each stage
    const avgTimeInStage: Record<string, number> = {};
    for (const stage of stages) {
      avgTimeInStage[stage.name] = stage.avgDaysInStage;
    }

    return {
      stages,
      transitions,
      bottlenecks,
      avgTimeInStage,
    };
  }

  private calculateDealDistribution(deals: Array<Record<string, unknown>>): DealDistribution {
    const byStage: Record<string, number> = {};
    const byOwner: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const deal of deals) {
      const stage = String(deal.stage || 'unknown');
      byStage[stage] = (byStage[stage] || 0) + 1;

      const owner = String(deal.owner || deal.hubspot_owner_id || 'unassigned');
      byOwner[owner] = (byOwner[owner] || 0) + 1;

      const source = String(deal.source || deal.deal_source || 'unknown');
      bySource[source] = (bySource[source] || 0) + 1;
    }

    // Value buckets
    const amounts = deals.map(d => Number(d.amount) || 0);
    const bucketRanges = [
      { min: 0, max: 1000 },
      { min: 1000, max: 5000 },
      { min: 5000, max: 10000 },
      { min: 10000, max: 50000 },
      { min: 50000, max: 100000 },
      { min: 100000, max: Infinity },
    ];

    const byValue: ValueBucket[] = bucketRanges.map(range => {
      const inRange = amounts.filter(a => a >= range.min && a < range.max);
      return {
        min: range.min,
        max: range.max === Infinity ? 999999 : range.max,
        count: inRange.length,
        totalValue: inRange.reduce((a, b) => a + b, 0),
      };
    });

    // Age buckets
    const now = Date.now();
    const ageRanges = [
      { label: '0-7 days', minDays: 0, maxDays: 7 },
      { label: '8-14 days', minDays: 8, maxDays: 14 },
      { label: '15-30 days', minDays: 15, maxDays: 30 },
      { label: '31-60 days', minDays: 31, maxDays: 60 },
      { label: '61-90 days', minDays: 61, maxDays: 90 },
      { label: '90+ days', minDays: 91, maxDays: Infinity },
    ];

    const byAge: AgeBucket[] = ageRanges.map(range => {
      const inRange = deals.filter(d => {
        const created = new Date(String(d.created_at || d.createdate || now));
        const days = (now - created.getTime()) / (1000 * 60 * 60 * 24);
        return days >= range.minDays && days <= range.maxDays;
      });
      return {
        label: range.label,
        minDays: range.minDays,
        maxDays: range.maxDays === Infinity ? 999 : range.maxDays,
        count: inRange.length,
      };
    });

    return {
      byStage,
      byValue,
      byOwner,
      bySource,
      byAge,
    };
  }

  private buildRevenueModel(deals: Array<Record<string, unknown>>): RevenueModel {
    const closedDeals = deals.filter(d => d.stage === 'closedwon' || d.status === 'won');
    const openDeals = deals.filter(d => !['closedwon', 'closedlost'].includes(String(d.stage || '')));

    // Monthly revenue
    const monthlyMap = new Map<string, { actual: number; target: number }>();
    for (const deal of closedDeals) {
      const closed = new Date(String(deal.closed_at || deal.closedate || new Date()));
      const month = `${closed.getFullYear()}-${String(closed.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { actual: 0, target: 0 });
      }
      monthlyMap.get(month)!.actual += Number(deal.amount) || 0;
    }

    const monthly: MonthlyRevenue[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        actual: data.actual,
        target: data.target || data.actual * 1.1,
        variance: data.actual - (data.target || data.actual * 1.1),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Projections
    const pipelineTotal = openDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const avgWinRate = closedDeals.length / Math.max(deals.length, 1);

    const projections: RevenueProjection[] = [
      {
        period: 'Q1',
        conservative: pipelineTotal * avgWinRate * 0.7,
        expected: pipelineTotal * avgWinRate,
        optimistic: pipelineTotal * avgWinRate * 1.3,
        confidence: 0.75,
      },
      {
        period: 'Q2',
        conservative: pipelineTotal * avgWinRate * 0.6,
        expected: pipelineTotal * avgWinRate * 0.9,
        optimistic: pipelineTotal * avgWinRate * 1.2,
        confidence: 0.6,
      },
    ];

    // Exposure
    const atRiskDeals = openDeals.filter(d => Number(d.probability) < 0.3);
    const delayedDeals = openDeals.filter(d => {
      const expected = new Date(String(d.expected_close || d.closedate || Date.now()));
      return expected < new Date();
    });

    const exposure: RevenueExposure = {
      atRisk: atRiskDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
      delayed: delayedDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
      unbilled: 0,
      disputed: 0,
      total: 0,
    };
    exposure.total = exposure.atRisk + exposure.delayed + exposure.unbilled + exposure.disputed;

    // Leakage model
    const leakage: LeakageModel = {
      totalLeakage: exposure.total * 0.1,
      byType: {
        underbilling: exposure.total * 0.03,
        missed_renewals: exposure.total * 0.04,
        stale_deals: exposure.total * 0.03,
      },
      byStage: {},
      recoverable: exposure.total * 0.07,
    };

    return {
      monthly,
      projections,
      exposure,
      leakage,
    };
  }

  private buildAttributionSnapshot(deals: Array<Record<string, unknown>>): AttributionSnapshot {
    const channelCounts: Record<string, number> = {};
    
    for (const deal of deals) {
      const source = String(deal.source || deal.original_source || 'direct');
      channelCounts[source] = (channelCounts[source] || 0) + 1;
    }

    return {
      modelType: 'position_based',
      channelPerformance: channelCounts,
      topCampaigns: [],
      conversionPaths: deals.length,
    };
  }

  private buildUserBehaviorSnapshot(users: Array<Record<string, unknown>>): UserBehaviorSnapshot {
    const activeUsers = users.filter(u => u.active).length;
    
    return {
      activeUsers,
      avgSessionsPerDay: 2.5,
      topActions: ['view_deal', 'update_contact', 'send_email'],
      adoptionRate: users.length > 0 ? activeUsers / users.length : 0,
    };
  }

  private buildAutomationGraph(workflows: Array<Record<string, unknown>>): AutomationGraph {
    const activeWorkflows = workflows.filter(w => w.enabled || w.active);
    
    return {
      workflows: workflows.length,
      activeWorkflows: activeWorkflows.length,
      totalExecutions: workflows.reduce((sum, w) => sum + (Number(w.executions) || 0), 0),
      successRate: 0.95,
      topWorkflows: workflows.slice(0, 5).map(w => String(w.name || w.id)),
    };
  }

  private cleanupOldSnapshots(): void {
    const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    
    for (const [id, snapshot] of this.snapshots) {
      if (snapshot.timestamp.getTime() < cutoff) {
        this.snapshots.delete(id);
      }
    }
  }
}

export default PortalTwin;
