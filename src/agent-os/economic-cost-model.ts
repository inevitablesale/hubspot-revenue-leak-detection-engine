/**
 * Economic Cost Model Module
 * Provides relevance scoring, efficiency metrics, and intelligent load balancing
 * to optimize system resource usage and maximize ROI
 */

import { generateId } from '../utils/helpers';
import { RevenueLeak, LeakType } from '../types';

// ============================================================
// Economic Cost Model Types
// ============================================================

export type ResourceType = 'cpu' | 'memory' | 'api_calls' | 'network' | 'storage';
export type CostCategory = 'compute' | 'api' | 'storage' | 'labor' | 'opportunity';

export interface ResourceCost {
  resourceType: ResourceType;
  unitCost: number; // Cost per unit
  unit: string;
  currency: string;
}

export interface ActionCost {
  actionType: string;
  resources: ResourceConsumption[];
  baseCost: number;
  variableCost: number;
  estimatedDuration: number;
  successProbability: number;
}

export interface ResourceConsumption {
  resourceType: ResourceType;
  amount: number;
  duration: number; // seconds
}

export interface CostEstimate {
  id: string;
  actionType: string;
  entityId: string;
  directCosts: Record<CostCategory, number>;
  indirectCosts: Record<CostCategory, number>;
  totalCost: number;
  expectedReturn: number;
  roi: number;
  confidence: number;
  breakdown: CostBreakdown[];
  estimatedAt: Date;
}

export interface CostBreakdown {
  category: CostCategory;
  item: string;
  amount: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

export interface RelevanceScore {
  id: string;
  entityId: string;
  entityType: string;
  score: number; // 0-100
  factors: RelevanceFactor[];
  calculatedAt: Date;
  expiresAt: Date;
}

export interface RelevanceFactor {
  name: string;
  weight: number;
  score: number;
  reasoning: string;
}

export interface EfficiencyMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  trend: 'improving' | 'stable' | 'degrading';
  category: 'cost' | 'time' | 'quality' | 'throughput';
  calculatedAt: Date;
}

export interface LoadBalanceState {
  id: string;
  timestamp: Date;
  workers: WorkerLoad[];
  strategy: LoadBalanceStrategy;
  totalCapacity: number;
  usedCapacity: number;
  utilizationPercent: number;
  recommendations: LoadRecommendation[];
}

export interface WorkerLoad {
  id: string;
  name: string;
  capacity: number;
  currentLoad: number;
  utilizationPercent: number;
  pendingTasks: number;
  avgTaskDuration: number;
  health: 'healthy' | 'overloaded' | 'underutilized';
}

export type LoadBalanceStrategy = 
  | 'round_robin'
  | 'least_connections'
  | 'weighted'
  | 'cost_optimized'
  | 'latency_optimized';

export interface LoadRecommendation {
  type: 'scale_up' | 'scale_down' | 'rebalance' | 'optimize';
  reason: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
  estimatedSavings: number;
}

export interface BudgetAllocation {
  id: string;
  name: string;
  category: CostCategory;
  allocated: number;
  spent: number;
  remaining: number;
  periodStart: Date;
  periodEnd: Date;
  alerts: BudgetAlert[];
}

export interface BudgetAlert {
  id: string;
  type: 'warning' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  triggeredAt: Date;
}

export interface EconomicConfig {
  enabled: boolean;
  costOptimizationEnabled: boolean;
  loadBalancingEnabled: boolean;
  relevanceScoringEnabled: boolean;
  defaultCurrency: string;
  budgetPeriod: 'daily' | 'weekly' | 'monthly';
  alertThresholds: {
    budgetWarning: number;
    budgetCritical: number;
    loadWarning: number;
    loadCritical: number;
  };
}

// ============================================================
// Economic Cost Model Implementation
// ============================================================

export class EconomicCostModel {
  private resourceCosts: Map<ResourceType, ResourceCost> = new Map();
  private actionCosts: Map<string, ActionCost> = new Map();
  private costEstimates: Map<string, CostEstimate> = new Map();
  private relevanceScores: Map<string, RelevanceScore> = new Map();
  private efficiencyMetrics: Map<string, EfficiencyMetric> = new Map();
  private budgets: Map<string, BudgetAllocation> = new Map();
  private workers: Map<string, WorkerLoad> = new Map();
  private config: EconomicConfig;
  private loadBalanceStrategy: LoadBalanceStrategy = 'cost_optimized';

  constructor(config?: Partial<EconomicConfig>) {
    this.config = {
      enabled: true,
      costOptimizationEnabled: true,
      loadBalancingEnabled: true,
      relevanceScoringEnabled: true,
      defaultCurrency: 'USD',
      budgetPeriod: 'monthly',
      alertThresholds: {
        budgetWarning: 80,
        budgetCritical: 95,
        loadWarning: 75,
        loadCritical: 90,
      },
      ...config,
    };

    this.initializeResourceCosts();
    this.initializeActionCosts();
    this.initializeWorkers();
    this.initializeEfficiencyMetrics();
  }

  /**
   * Initialize default resource costs
   */
  private initializeResourceCosts(): void {
    this.resourceCosts.set('cpu', {
      resourceType: 'cpu',
      unitCost: 0.05,
      unit: 'cpu-hour',
      currency: this.config.defaultCurrency,
    });

    this.resourceCosts.set('memory', {
      resourceType: 'memory',
      unitCost: 0.01,
      unit: 'gb-hour',
      currency: this.config.defaultCurrency,
    });

    this.resourceCosts.set('api_calls', {
      resourceType: 'api_calls',
      unitCost: 0.001,
      unit: 'request',
      currency: this.config.defaultCurrency,
    });

    this.resourceCosts.set('network', {
      resourceType: 'network',
      unitCost: 0.02,
      unit: 'gb',
      currency: this.config.defaultCurrency,
    });

    this.resourceCosts.set('storage', {
      resourceType: 'storage',
      unitCost: 0.03,
      unit: 'gb-month',
      currency: this.config.defaultCurrency,
    });
  }

  /**
   * Initialize default action costs
   */
  private initializeActionCosts(): void {
    this.actionCosts.set('leak_detection', {
      actionType: 'leak_detection',
      resources: [
        { resourceType: 'cpu', amount: 0.1, duration: 10 },
        { resourceType: 'api_calls', amount: 5, duration: 10 },
        { resourceType: 'memory', amount: 0.5, duration: 10 },
      ],
      baseCost: 0.01,
      variableCost: 0.005,
      estimatedDuration: 10,
      successProbability: 0.95,
    });

    this.actionCosts.set('leak_analysis', {
      actionType: 'leak_analysis',
      resources: [
        { resourceType: 'cpu', amount: 0.5, duration: 30 },
        { resourceType: 'memory', amount: 1, duration: 30 },
      ],
      baseCost: 0.05,
      variableCost: 0.01,
      estimatedDuration: 30,
      successProbability: 0.90,
    });

    this.actionCosts.set('leak_recovery', {
      actionType: 'leak_recovery',
      resources: [
        { resourceType: 'cpu', amount: 0.2, duration: 60 },
        { resourceType: 'api_calls', amount: 10, duration: 60 },
        { resourceType: 'memory', amount: 0.25, duration: 60 },
      ],
      baseCost: 0.10,
      variableCost: 0.02,
      estimatedDuration: 60,
      successProbability: 0.80,
    });

    this.actionCosts.set('report_generation', {
      actionType: 'report_generation',
      resources: [
        { resourceType: 'cpu', amount: 0.3, duration: 20 },
        { resourceType: 'memory', amount: 0.5, duration: 20 },
        { resourceType: 'storage', amount: 0.01, duration: 20 },
      ],
      baseCost: 0.02,
      variableCost: 0.005,
      estimatedDuration: 20,
      successProbability: 0.98,
    });
  }

  /**
   * Initialize default workers
   */
  private initializeWorkers(): void {
    for (let i = 1; i <= 3; i++) {
      const worker: WorkerLoad = {
        id: `worker-${i}`,
        name: `Worker ${i}`,
        capacity: 100,
        currentLoad: Math.random() * 50,
        utilizationPercent: 0,
        pendingTasks: Math.floor(Math.random() * 5),
        avgTaskDuration: 1000 + Math.random() * 2000,
        health: 'healthy',
      };
      worker.utilizationPercent = (worker.currentLoad / worker.capacity) * 100;
      this.workers.set(worker.id, worker);
    }
  }

  /**
   * Initialize default efficiency metrics
   */
  private initializeEfficiencyMetrics(): void {
    this.addEfficiencyMetric({
      name: 'Cost per Leak Detected',
      value: 0.05,
      unit: this.config.defaultCurrency,
      target: 0.03,
      category: 'cost',
    });

    this.addEfficiencyMetric({
      name: 'Cost per Dollar Recovered',
      value: 0.02,
      unit: this.config.defaultCurrency,
      target: 0.01,
      category: 'cost',
    });

    this.addEfficiencyMetric({
      name: 'Average Detection Time',
      value: 15,
      unit: 'seconds',
      target: 10,
      category: 'time',
    });

    this.addEfficiencyMetric({
      name: 'Recovery Success Rate',
      value: 85,
      unit: 'percent',
      target: 90,
      category: 'quality',
    });

    this.addEfficiencyMetric({
      name: 'Leaks Processed per Hour',
      value: 240,
      unit: 'leaks/hour',
      target: 300,
      category: 'throughput',
    });
  }

  /**
   * Estimate cost for an action
   */
  estimateCost(
    actionType: string,
    entityId: string,
    context: {
      entityValue?: number;
      complexity?: number;
      priority?: number;
    } = {}
  ): CostEstimate {
    const actionCost = this.actionCosts.get(actionType);
    if (!actionCost) {
      throw new Error(`Unknown action type: ${actionType}`);
    }

    const complexity = context.complexity || 1;
    const breakdown: CostBreakdown[] = [];
    let totalDirectCost = 0;

    // Calculate resource costs
    for (const consumption of actionCost.resources) {
      const resourceCost = this.resourceCosts.get(consumption.resourceType);
      if (resourceCost) {
        const adjustedAmount = consumption.amount * complexity;
        const cost = adjustedAmount * resourceCost.unitCost;
        
        breakdown.push({
          category: 'compute',
          item: resourceCost.resourceType,
          amount: adjustedAmount,
          unit: resourceCost.unit,
          costPerUnit: resourceCost.unitCost,
          totalCost: cost,
        });
        
        totalDirectCost += cost;
      }
    }

    // Add base and variable costs
    const variableCost = actionCost.variableCost * complexity;
    totalDirectCost += actionCost.baseCost + variableCost;

    // Calculate API costs separately
    const apiCost = this.calculateApiCost(actionCost.resources);
    
    // Calculate indirect costs (opportunity cost)
    const laborCost = (actionCost.estimatedDuration / 3600) * 50; // $50/hour labor rate
    const opportunityCost = context.entityValue ? context.entityValue * 0.001 : 0;

    const directCosts: Record<CostCategory, number> = {
      compute: totalDirectCost,
      api: apiCost,
      storage: 0,
      labor: 0,
      opportunity: 0,
    };

    const indirectCosts: Record<CostCategory, number> = {
      compute: 0,
      api: 0,
      storage: 0,
      labor: laborCost,
      opportunity: opportunityCost,
    };

    const totalCost = Object.values(directCosts).reduce((a, b) => a + b, 0) +
                      Object.values(indirectCosts).reduce((a, b) => a + b, 0);

    const expectedReturn = context.entityValue 
      ? context.entityValue * actionCost.successProbability 
      : totalCost * 10;

    const roi = expectedReturn > 0 ? ((expectedReturn - totalCost) / totalCost) * 100 : 0;

    const estimate: CostEstimate = {
      id: generateId(),
      actionType,
      entityId,
      directCosts,
      indirectCosts,
      totalCost,
      expectedReturn,
      roi,
      confidence: actionCost.successProbability,
      breakdown,
      estimatedAt: new Date(),
    };

    this.costEstimates.set(estimate.id, estimate);
    return estimate;
  }

  /**
   * Calculate API costs from resources
   */
  private calculateApiCost(resources: ResourceConsumption[]): number {
    const apiResource = resources.find(r => r.resourceType === 'api_calls');
    if (!apiResource) return 0;

    const apiCost = this.resourceCosts.get('api_calls');
    return apiResource.amount * (apiCost?.unitCost || 0.001);
  }

  /**
   * Calculate relevance score for a leak
   */
  calculateRelevanceScore(
    leak: RevenueLeak,
    context: {
      portalContext?: Record<string, unknown>;
      historicalData?: Record<string, number>;
    } = {}
  ): RelevanceScore {
    const factors: RelevanceFactor[] = [];

    // Revenue impact factor (weight: 30%)
    const revenueScore = Math.min(100, (leak.potentialRevenue / 10000) * 100);
    factors.push({
      name: 'Revenue Impact',
      weight: 0.30,
      score: revenueScore,
      reasoning: `Potential revenue: $${leak.potentialRevenue.toLocaleString()}`,
    });

    // Severity factor (weight: 25%)
    const severityScores: Record<string, number> = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
    };
    const severityScore = severityScores[leak.severity] || 50;
    factors.push({
      name: 'Severity',
      weight: 0.25,
      score: severityScore,
      reasoning: `Leak severity: ${leak.severity}`,
    });

    // Recency factor (weight: 20%)
    const daysSinceDetection = (Date.now() - leak.detectedAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 100 - daysSinceDetection * 5);
    factors.push({
      name: 'Recency',
      weight: 0.20,
      score: recencyScore,
      reasoning: `Detected ${Math.round(daysSinceDetection)} days ago`,
    });

    // Actionability factor (weight: 15%)
    const actionabilityScore = leak.suggestedActions.length > 0 ? 80 + leak.suggestedActions.length * 5 : 40;
    factors.push({
      name: 'Actionability',
      weight: 0.15,
      score: Math.min(100, actionabilityScore),
      reasoning: `${leak.suggestedActions.length} suggested actions available`,
    });

    // Pattern match factor (weight: 10%)
    const patternScore = context.historicalData?.patternMatches 
      ? Math.min(100, context.historicalData.patternMatches * 20)
      : 50;
    factors.push({
      name: 'Pattern Match',
      weight: 0.10,
      score: patternScore,
      reasoning: 'Based on historical pattern analysis',
    });

    // Calculate weighted score
    const totalScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);

    const relevanceScore: RelevanceScore = {
      id: generateId(),
      entityId: leak.id,
      entityType: 'leak',
      score: Math.round(totalScore * 10) / 10,
      factors,
      calculatedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000), // 1 hour expiry
    };

    this.relevanceScores.set(relevanceScore.id, relevanceScore);
    return relevanceScore;
  }

  /**
   * Add efficiency metric
   */
  addEfficiencyMetric(metric: Omit<EfficiencyMetric, 'id' | 'trend' | 'calculatedAt'>): EfficiencyMetric {
    const newMetric: EfficiencyMetric = {
      ...metric,
      id: generateId(),
      trend: 'stable',
      calculatedAt: new Date(),
    };

    this.efficiencyMetrics.set(newMetric.id, newMetric);
    return newMetric;
  }

  /**
   * Update efficiency metric
   */
  updateEfficiencyMetric(metricId: string, newValue: number): EfficiencyMetric | undefined {
    const metric = this.efficiencyMetrics.get(metricId);
    if (!metric) return undefined;

    const previousValue = metric.value;
    metric.value = newValue;
    metric.calculatedAt = new Date();

    // Determine trend
    if (metric.category === 'cost' || metric.category === 'time') {
      // Lower is better
      metric.trend = newValue < previousValue ? 'improving' : 
                     newValue > previousValue ? 'degrading' : 'stable';
    } else {
      // Higher is better
      metric.trend = newValue > previousValue ? 'improving' :
                     newValue < previousValue ? 'degrading' : 'stable';
    }

    return metric;
  }

  /**
   * Get load balance state
   */
  getLoadBalanceState(): LoadBalanceState {
    const workersList = Array.from(this.workers.values());
    const totalCapacity = workersList.reduce((sum, w) => sum + w.capacity, 0);
    const usedCapacity = workersList.reduce((sum, w) => sum + w.currentLoad, 0);

    // Update worker health
    for (const worker of workersList) {
      if (worker.utilizationPercent > this.config.alertThresholds.loadCritical) {
        worker.health = 'overloaded';
      } else if (worker.utilizationPercent < 20) {
        worker.health = 'underutilized';
      } else {
        worker.health = 'healthy';
      }
    }

    const recommendations = this.generateLoadRecommendations(workersList);

    return {
      id: generateId(),
      timestamp: new Date(),
      workers: workersList,
      strategy: this.loadBalanceStrategy,
      totalCapacity,
      usedCapacity,
      utilizationPercent: (usedCapacity / totalCapacity) * 100,
      recommendations,
    };
  }

  /**
   * Generate load recommendations
   */
  private generateLoadRecommendations(workers: WorkerLoad[]): LoadRecommendation[] {
    const recommendations: LoadRecommendation[] = [];
    const avgUtilization = workers.reduce((sum, w) => sum + w.utilizationPercent, 0) / workers.length;

    // Check for overloaded workers
    const overloaded = workers.filter(w => w.health === 'overloaded');
    if (overloaded.length > 0) {
      recommendations.push({
        type: 'scale_up',
        reason: `${overloaded.length} worker(s) are overloaded`,
        impact: 'Prevent performance degradation and task delays',
        priority: 'high',
        estimatedSavings: 0, // Actually may cost more but prevents losses
      });
    }

    // Check for underutilized workers
    const underutilized = workers.filter(w => w.health === 'underutilized');
    if (underutilized.length > 1) {
      const potentialSavings = underutilized.length * 10; // $10/worker/hour
      recommendations.push({
        type: 'scale_down',
        reason: `${underutilized.length} worker(s) are underutilized`,
        impact: 'Reduce operational costs',
        priority: 'medium',
        estimatedSavings: potentialSavings,
      });
    }

    // Check for unbalanced load
    const maxUtil = Math.max(...workers.map(w => w.utilizationPercent));
    const minUtil = Math.min(...workers.map(w => w.utilizationPercent));
    if (maxUtil - minUtil > 30) {
      recommendations.push({
        type: 'rebalance',
        reason: 'Load is unevenly distributed across workers',
        impact: 'Improve overall efficiency and response times',
        priority: 'medium',
        estimatedSavings: 5,
      });
    }

    // Optimization recommendation if overall utilization is suboptimal
    if (avgUtilization > 50 && avgUtilization < 70) {
      recommendations.push({
        type: 'optimize',
        reason: 'Current utilization is suboptimal',
        impact: 'Better resource allocation possible',
        priority: 'low',
        estimatedSavings: 2,
      });
    }

    return recommendations;
  }

  /**
   * Select worker for task using load balancing strategy
   */
  selectWorkerForTask(taskCost: number = 10): WorkerLoad | undefined {
    const workers = Array.from(this.workers.values()).filter(w => w.health !== 'overloaded');
    
    if (workers.length === 0) return undefined;

    switch (this.loadBalanceStrategy) {
      case 'round_robin':
        return workers[0];
      
      case 'least_connections':
        return workers.reduce((min, w) => w.pendingTasks < min.pendingTasks ? w : min);
      
      case 'weighted':
        // Prefer workers with more available capacity
        return workers.reduce((best, w) => {
          const score = (w.capacity - w.currentLoad) / w.capacity;
          const bestScore = (best.capacity - best.currentLoad) / best.capacity;
          return score > bestScore ? w : best;
        });
      
      case 'cost_optimized':
        // Prefer workers that will keep utilization optimal (60-80%)
        return workers.reduce((best, w) => {
          const targetUtil = 70;
          const wUtil = ((w.currentLoad + taskCost) / w.capacity) * 100;
          const bestUtil = ((best.currentLoad + taskCost) / best.capacity) * 100;
          return Math.abs(wUtil - targetUtil) < Math.abs(bestUtil - targetUtil) ? w : best;
        });
      
      case 'latency_optimized':
        // Prefer workers with lowest average task duration
        return workers.reduce((min, w) => w.avgTaskDuration < min.avgTaskDuration ? w : min);
      
      default:
        return workers[0];
    }
  }

  /**
   * Assign task to worker
   */
  assignTaskToWorker(workerId: string, taskCost: number): boolean {
    const worker = this.workers.get(workerId);
    if (!worker) return false;

    if (worker.currentLoad + taskCost > worker.capacity) return false;

    worker.currentLoad += taskCost;
    worker.pendingTasks++;
    worker.utilizationPercent = (worker.currentLoad / worker.capacity) * 100;

    return true;
  }

  /**
   * Complete task on worker
   */
  completeTaskOnWorker(workerId: string, taskCost: number, duration: number): boolean {
    const worker = this.workers.get(workerId);
    if (!worker) return false;

    worker.currentLoad = Math.max(0, worker.currentLoad - taskCost);
    worker.pendingTasks = Math.max(0, worker.pendingTasks - 1);
    worker.utilizationPercent = (worker.currentLoad / worker.capacity) * 100;

    // Update average task duration
    worker.avgTaskDuration = (worker.avgTaskDuration + duration) / 2;

    return true;
  }

  /**
   * Create budget allocation
   */
  createBudget(
    name: string,
    category: CostCategory,
    amount: number,
    periodDays: number = 30
  ): BudgetAllocation {
    const budget: BudgetAllocation = {
      id: generateId(),
      name,
      category,
      allocated: amount,
      spent: 0,
      remaining: amount,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
      alerts: [],
    };

    this.budgets.set(budget.id, budget);
    return budget;
  }

  /**
   * Record expense against budget
   */
  recordExpense(budgetId: string, amount: number): BudgetAllocation | undefined {
    const budget = this.budgets.get(budgetId);
    if (!budget) return undefined;

    budget.spent += amount;
    budget.remaining = budget.allocated - budget.spent;

    // Check for alerts
    const utilizationPercent = (budget.spent / budget.allocated) * 100;

    if (utilizationPercent >= this.config.alertThresholds.budgetCritical) {
      budget.alerts.push({
        id: generateId(),
        type: 'critical',
        message: `Budget ${budget.name} has exceeded ${this.config.alertThresholds.budgetCritical}% utilization`,
        threshold: this.config.alertThresholds.budgetCritical,
        currentValue: utilizationPercent,
        triggeredAt: new Date(),
      });
    } else if (utilizationPercent >= this.config.alertThresholds.budgetWarning) {
      const hasWarning = budget.alerts.some(a => a.type === 'warning');
      if (!hasWarning) {
        budget.alerts.push({
          id: generateId(),
          type: 'warning',
          message: `Budget ${budget.name} has exceeded ${this.config.alertThresholds.budgetWarning}% utilization`,
          threshold: this.config.alertThresholds.budgetWarning,
          currentValue: utilizationPercent,
          triggeredAt: new Date(),
        });
      }
    }

    return budget;
  }

  /**
   * Set load balancing strategy
   */
  setLoadBalanceStrategy(strategy: LoadBalanceStrategy): void {
    this.loadBalanceStrategy = strategy;
  }

  /**
   * Get cost estimate by ID
   */
  getCostEstimate(estimateId: string): CostEstimate | undefined {
    return this.costEstimates.get(estimateId);
  }

  /**
   * Get relevance score by ID
   */
  getRelevanceScore(scoreId: string): RelevanceScore | undefined {
    return this.relevanceScores.get(scoreId);
  }

  /**
   * Get all efficiency metrics
   */
  getEfficiencyMetrics(): EfficiencyMetric[] {
    return Array.from(this.efficiencyMetrics.values());
  }

  /**
   * Get budget by ID
   */
  getBudget(budgetId: string): BudgetAllocation | undefined {
    return this.budgets.get(budgetId);
  }

  /**
   * Get all budgets
   */
  getBudgets(): BudgetAllocation[] {
    return Array.from(this.budgets.values());
  }

  /**
   * Get economic summary statistics
   */
  getStats(): {
    totalCostEstimates: number;
    avgROI: number;
    totalRelevanceScores: number;
    avgRelevance: number;
    efficiencyMetrics: number;
    improvingMetrics: number;
    degradingMetrics: number;
    totalBudget: number;
    totalSpent: number;
    budgetUtilization: number;
    workerCount: number;
    avgWorkerUtilization: number;
  } {
    const estimates = Array.from(this.costEstimates.values());
    const scores = Array.from(this.relevanceScores.values());
    const metrics = Array.from(this.efficiencyMetrics.values());
    const budgetsList = Array.from(this.budgets.values());
    const workersList = Array.from(this.workers.values());

    return {
      totalCostEstimates: estimates.length,
      avgROI: estimates.length > 0 
        ? estimates.reduce((sum, e) => sum + e.roi, 0) / estimates.length 
        : 0,
      totalRelevanceScores: scores.length,
      avgRelevance: scores.length > 0 
        ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length 
        : 0,
      efficiencyMetrics: metrics.length,
      improvingMetrics: metrics.filter(m => m.trend === 'improving').length,
      degradingMetrics: metrics.filter(m => m.trend === 'degrading').length,
      totalBudget: budgetsList.reduce((sum, b) => sum + b.allocated, 0),
      totalSpent: budgetsList.reduce((sum, b) => sum + b.spent, 0),
      budgetUtilization: budgetsList.length > 0
        ? (budgetsList.reduce((sum, b) => sum + b.spent, 0) / 
           budgetsList.reduce((sum, b) => sum + b.allocated, 0)) * 100
        : 0,
      workerCount: workersList.length,
      avgWorkerUtilization: workersList.length > 0
        ? workersList.reduce((sum, w) => sum + w.utilizationPercent, 0) / workersList.length
        : 0,
    };
  }
}

export default EconomicCostModel;
