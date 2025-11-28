/**
 * Agent Credits Module
 * Manages agent credit allocation, rewards, and penalties
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Agent Credits Types
// ============================================================

export type CreditEventType = 'reward' | 'penalty' | 'allocation' | 'consumption' | 'transfer' | 'bonus';
export type CreditSource = 'performance' | 'task_completion' | 'efficiency' | 'quality' | 'collaboration' | 'system';

export interface AgentCreditAccount {
  id: string;
  agentId: string;
  agentName: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lifetimePenalties: number;
  creditScore: number;
  tier: CreditTier;
  status: 'active' | 'frozen' | 'limited';
  limits: CreditLimits;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditTier {
  name: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  level: number;
  multiplier: number;
  benefits: string[];
  requiredScore: number;
}

export interface CreditLimits {
  dailySpend: number;
  singleTransaction: number;
  creditLine: number;
  pendingMax: number;
}

export interface CreditEvent {
  id: string;
  accountId: string;
  type: CreditEventType;
  source: CreditSource;
  amount: number;
  description: string;
  metadata: CreditEventMetadata;
  timestamp: Date;
  processedAt?: Date;
  status: 'pending' | 'processed' | 'rejected';
}

export interface CreditEventMetadata {
  taskId?: string;
  actionId?: string;
  performance?: PerformanceMetrics;
  reason?: string;
  approvedBy?: string;
}

export interface PerformanceMetrics {
  accuracy: number;
  efficiency: number;
  quality: number;
  timeliness: number;
  collaboration: number;
}

export interface RewardRule {
  id: string;
  name: string;
  description: string;
  trigger: RewardTrigger;
  amount: number;
  amountType: 'fixed' | 'percentage' | 'formula';
  formula?: string;
  maxPayout?: number;
  cooldown?: number;
  enabled: boolean;
  appliedCount: number;
  lastApplied?: Date;
}

export interface RewardTrigger {
  type: 'task_complete' | 'threshold_reached' | 'milestone' | 'streak' | 'quality_score';
  condition: string;
  value?: number;
}

export interface PenaltyRule {
  id: string;
  name: string;
  description: string;
  trigger: PenaltyTrigger;
  amount: number;
  amountType: 'fixed' | 'percentage';
  maxPenalty?: number;
  enabled: boolean;
  appliedCount: number;
}

export interface PenaltyTrigger {
  type: 'error' | 'timeout' | 'violation' | 'quality_below' | 'resource_waste';
  condition: string;
  threshold?: number;
}

export interface CreditLeaderboard {
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  entries: LeaderboardEntry[];
  generatedAt: Date;
}

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  credits: number;
  tasksCompleted: number;
  efficiency: number;
  tier: string;
}

// ============================================================
// Agent Credits Implementation
// ============================================================

export class AgentCredits {
  private accounts: Map<string, AgentCreditAccount> = new Map();
  private events: Map<string, CreditEvent> = new Map();
  private rewardRules: Map<string, RewardRule> = new Map();
  private penaltyRules: Map<string, PenaltyRule> = new Map();
  private tiers: CreditTier[] = [];

  constructor() {
    this.initializeTiers();
    this.initializeRules();
  }

  /**
   * Initialize credit tiers
   */
  private initializeTiers(): void {
    this.tiers = [
      { name: 'bronze', level: 1, multiplier: 1.0, benefits: ['Basic access'], requiredScore: 0 },
      { name: 'silver', level: 2, multiplier: 1.1, benefits: ['Basic access', '10% bonus rewards'], requiredScore: 100 },
      { name: 'gold', level: 3, multiplier: 1.25, benefits: ['Priority access', '25% bonus rewards', 'Extended limits'], requiredScore: 500 },
      { name: 'platinum', level: 4, multiplier: 1.5, benefits: ['Priority access', '50% bonus rewards', 'High limits', 'Premium support'], requiredScore: 1000 },
      { name: 'diamond', level: 5, multiplier: 2.0, benefits: ['VIP access', '100% bonus rewards', 'Unlimited limits', 'Custom benefits'], requiredScore: 5000 },
    ];
  }

  /**
   * Initialize default reward and penalty rules
   */
  private initializeRules(): void {
    // Reward rules
    this.createRewardRule({
      name: 'Task Completion',
      description: 'Reward for completing tasks',
      trigger: { type: 'task_complete', condition: 'task.status === "completed"' },
      amount: 10,
      amountType: 'fixed',
    });

    this.createRewardRule({
      name: 'High Efficiency',
      description: 'Bonus for efficient task execution',
      trigger: { type: 'threshold_reached', condition: 'efficiency >= 0.9', value: 0.9 },
      amount: 25,
      amountType: 'percentage',
    });

    this.createRewardRule({
      name: 'Quality Excellence',
      description: 'Reward for high quality scores',
      trigger: { type: 'quality_score', condition: 'quality >= 0.95', value: 0.95 },
      amount: 50,
      amountType: 'fixed',
    });

    this.createRewardRule({
      name: 'Collaboration Bonus',
      description: 'Reward for successful collaboration',
      trigger: { type: 'milestone', condition: 'collaborations >= 10' },
      amount: 100,
      amountType: 'fixed',
      cooldown: 86400000, // 24 hours
    });

    // Penalty rules
    this.createPenaltyRule({
      name: 'Task Error',
      description: 'Penalty for task errors',
      trigger: { type: 'error', condition: 'error.severity >= "medium"' },
      amount: 5,
      amountType: 'fixed',
    });

    this.createPenaltyRule({
      name: 'Timeout Penalty',
      description: 'Penalty for task timeouts',
      trigger: { type: 'timeout', condition: 'task.timedOut === true' },
      amount: 10,
      amountType: 'fixed',
    });

    this.createPenaltyRule({
      name: 'Quality Below Standard',
      description: 'Penalty for poor quality',
      trigger: { type: 'quality_below', condition: 'quality < 0.5', threshold: 0.5 },
      amount: 15,
      amountType: 'percentage',
    });

    this.createPenaltyRule({
      name: 'Resource Waste',
      description: 'Penalty for wasting resources',
      trigger: { type: 'resource_waste', condition: 'resourceWaste > 0.3', threshold: 0.3 },
      amount: 20,
      amountType: 'fixed',
    });
  }

  /**
   * Create an agent credit account
   */
  createAccount(agentId: string, agentName: string, initialBalance?: number): AgentCreditAccount {
    const account: AgentCreditAccount = {
      id: generateId(),
      agentId,
      agentName,
      balance: initialBalance || 100, // Starting credits
      lifetimeEarned: initialBalance || 100,
      lifetimeSpent: 0,
      lifetimePenalties: 0,
      creditScore: 50, // Starting score
      tier: this.tiers[0],
      status: 'active',
      limits: {
        dailySpend: 500,
        singleTransaction: 100,
        creditLine: 0,
        pendingMax: 200,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.accounts.set(account.id, account);
    return account;
  }

  /**
   * Award credits to an agent
   */
  awardCredits(
    accountId: string,
    amount: number,
    source: CreditSource,
    description: string,
    metadata?: Partial<CreditEventMetadata>
  ): CreditEvent {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account '${accountId}' not found`);
    }

    // Apply tier multiplier
    const adjustedAmount = Math.round(amount * account.tier.multiplier);

    const event: CreditEvent = {
      id: generateId(),
      accountId,
      type: 'reward',
      source,
      amount: adjustedAmount,
      description,
      metadata: { ...metadata },
      timestamp: new Date(),
      status: 'processed',
      processedAt: new Date(),
    };

    // Update account
    account.balance += adjustedAmount;
    account.lifetimeEarned += adjustedAmount;
    account.updatedAt = new Date();

    // Update credit score
    this.updateCreditScore(account, 'positive', adjustedAmount);

    this.events.set(event.id, event);
    return event;
  }

  /**
   * Deduct credits from an agent (consumption)
   */
  consumeCredits(
    accountId: string,
    amount: number,
    description: string,
    metadata?: Partial<CreditEventMetadata>
  ): CreditEvent {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account '${accountId}' not found`);
    }

    // Check limits
    if (amount > account.limits.singleTransaction) {
      throw new Error(`Amount exceeds single transaction limit of ${account.limits.singleTransaction}`);
    }

    if (account.balance + account.limits.creditLine < amount) {
      throw new Error('Insufficient credits');
    }

    const event: CreditEvent = {
      id: generateId(),
      accountId,
      type: 'consumption',
      source: 'task_completion',
      amount,
      description,
      metadata: { ...metadata },
      timestamp: new Date(),
      status: 'processed',
      processedAt: new Date(),
    };

    // Update account
    account.balance -= amount;
    account.lifetimeSpent += amount;
    account.updatedAt = new Date();

    this.events.set(event.id, event);
    return event;
  }

  /**
   * Apply penalty to an agent
   */
  applyPenalty(
    accountId: string,
    amount: number,
    reason: string,
    metadata?: Partial<CreditEventMetadata>
  ): CreditEvent {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account '${accountId}' not found`);
    }

    const event: CreditEvent = {
      id: generateId(),
      accountId,
      type: 'penalty',
      source: 'quality',
      amount,
      description: `Penalty: ${reason}`,
      metadata: { ...metadata, reason },
      timestamp: new Date(),
      status: 'processed',
      processedAt: new Date(),
    };

    // Update account
    account.balance = Math.max(0, account.balance - amount);
    account.lifetimePenalties += amount;
    account.updatedAt = new Date();

    // Update credit score (negative impact)
    this.updateCreditScore(account, 'negative', amount);

    this.events.set(event.id, event);
    return event;
  }

  /**
   * Transfer credits between agents
   */
  transferCredits(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description: string
  ): CreditEvent {
    const fromAccount = this.accounts.get(fromAccountId);
    const toAccount = this.accounts.get(toAccountId);

    if (!fromAccount) throw new Error(`Source account '${fromAccountId}' not found`);
    if (!toAccount) throw new Error(`Target account '${toAccountId}' not found`);
    if (fromAccount.balance < amount) throw new Error('Insufficient credits for transfer');

    // Deduct from source
    fromAccount.balance -= amount;
    fromAccount.lifetimeSpent += amount;
    fromAccount.updatedAt = new Date();

    // Add to target
    toAccount.balance += amount;
    toAccount.lifetimeEarned += amount;
    toAccount.updatedAt = new Date();

    const event: CreditEvent = {
      id: generateId(),
      accountId: fromAccountId,
      type: 'transfer',
      source: 'collaboration',
      amount,
      description,
      metadata: { taskId: toAccountId },
      timestamp: new Date(),
      status: 'processed',
      processedAt: new Date(),
    };

    this.events.set(event.id, event);
    return event;
  }

  /**
   * Check and apply rewards based on performance
   */
  checkAndApplyRewards(accountId: string, performance: PerformanceMetrics): CreditEvent[] {
    const appliedRewards: CreditEvent[] = [];

    for (const [_, rule] of this.rewardRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.cooldown && rule.lastApplied) {
        const elapsed = Date.now() - rule.lastApplied.getTime();
        if (elapsed < rule.cooldown) continue;
      }

      // Evaluate trigger
      if (this.evaluateRewardTrigger(rule.trigger, performance)) {
        let amount = rule.amount;
        if (rule.amountType === 'percentage') {
          // Calculate based on recent earnings
          const account = this.accounts.get(accountId);
          const recentEarnings = this.getRecentEarnings(accountId, 7);
          amount = Math.round(recentEarnings * (rule.amount / 100));
        }

        if (rule.maxPayout && amount > rule.maxPayout) {
          amount = rule.maxPayout;
        }

        const event = this.awardCredits(accountId, amount, 'performance', rule.description, {
          performance,
        });

        appliedRewards.push(event);
        rule.appliedCount++;
        rule.lastApplied = new Date();
      }
    }

    return appliedRewards;
  }

  /**
   * Check and apply penalties based on issues
   */
  checkAndApplyPenalties(
    accountId: string,
    issue: { type: string; severity: string; details?: Record<string, unknown> }
  ): CreditEvent | null {
    for (const [_, rule] of this.penaltyRules) {
      if (!rule.enabled) continue;

      if (this.evaluatePenaltyTrigger(rule.trigger, issue)) {
        let amount = rule.amount;
        if (rule.amountType === 'percentage') {
          const account = this.accounts.get(accountId);
          if (account) {
            amount = Math.round(account.balance * (rule.amount / 100));
          }
        }

        if (rule.maxPenalty && amount > rule.maxPenalty) {
          amount = rule.maxPenalty;
        }

        const event = this.applyPenalty(accountId, amount, rule.description, {
          reason: `${issue.type}: ${issue.severity}`,
        });

        rule.appliedCount++;
        return event;
      }
    }

    return null;
  }

  /**
   * Create a reward rule
   */
  createRewardRule(params: Omit<RewardRule, 'id' | 'appliedCount' | 'lastApplied' | 'enabled'>): RewardRule {
    const rule: RewardRule = {
      id: generateId(),
      ...params,
      enabled: true,
      appliedCount: 0,
    };

    this.rewardRules.set(rule.id, rule);
    return rule;
  }

  /**
   * Create a penalty rule
   */
  createPenaltyRule(params: Omit<PenaltyRule, 'id' | 'appliedCount' | 'enabled'>): PenaltyRule {
    const rule: PenaltyRule = {
      id: generateId(),
      ...params,
      enabled: true,
      appliedCount: 0,
    };

    this.penaltyRules.set(rule.id, rule);
    return rule;
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(period: CreditLeaderboard['period']): CreditLeaderboard {
    const accounts = Array.from(this.accounts.values());
    
    // Filter and sort by period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 86400000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 86400000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 86400000);
        break;
      default:
        startDate = new Date(0);
    }

    const entries: LeaderboardEntry[] = accounts
      .map(account => {
        const periodEvents = Array.from(this.events.values())
          .filter(e => 
            e.accountId === account.id && 
            e.timestamp >= startDate &&
            e.type === 'reward'
          );

        return {
          rank: 0,
          agentId: account.agentId,
          agentName: account.agentName,
          credits: periodEvents.reduce((sum, e) => sum + e.amount, 0),
          tasksCompleted: periodEvents.length,
          efficiency: account.creditScore / 100,
          tier: account.tier.name,
        };
      })
      .sort((a, b) => b.credits - a.credits)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return {
      period,
      entries: entries.slice(0, 100),
      generatedAt: new Date(),
    };
  }

  /**
   * Get account by agent ID
   */
  getAccountByAgentId(agentId: string): AgentCreditAccount | undefined {
    return Array.from(this.accounts.values()).find(a => a.agentId === agentId);
  }

  /**
   * Get account by ID
   */
  getAccount(accountId: string): AgentCreditAccount | undefined {
    return this.accounts.get(accountId);
  }

  /**
   * Get all accounts
   */
  getAccounts(): AgentCreditAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Get events for account
   */
  getAccountEvents(accountId: string, limit?: number): CreditEvent[] {
    const events = Array.from(this.events.values())
      .filter(e => e.accountId === accountId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? events.slice(0, limit) : events;
  }

  /**
   * Get reward rules
   */
  getRewardRules(): RewardRule[] {
    return Array.from(this.rewardRules.values());
  }

  /**
   * Get penalty rules
   */
  getPenaltyRules(): PenaltyRule[] {
    return Array.from(this.penaltyRules.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalAccounts: number;
    totalCreditsInCirculation: number;
    totalRewardsIssued: number;
    totalPenaltiesApplied: number;
    avgCreditScore: number;
    tierDistribution: Record<string, number>;
    activeRewardRules: number;
    activePenaltyRules: number;
  } {
    const accounts = this.getAccounts();
    const events = Array.from(this.events.values());

    const tierDistribution: Record<string, number> = {};
    for (const account of accounts) {
      tierDistribution[account.tier.name] = (tierDistribution[account.tier.name] || 0) + 1;
    }

    return {
      totalAccounts: accounts.length,
      totalCreditsInCirculation: accounts.reduce((sum, a) => sum + a.balance, 0),
      totalRewardsIssued: events.filter(e => e.type === 'reward').reduce((sum, e) => sum + e.amount, 0),
      totalPenaltiesApplied: events.filter(e => e.type === 'penalty').reduce((sum, e) => sum + e.amount, 0),
      avgCreditScore: accounts.length > 0 
        ? accounts.reduce((sum, a) => sum + a.creditScore, 0) / accounts.length 
        : 0,
      tierDistribution,
      activeRewardRules: Array.from(this.rewardRules.values()).filter(r => r.enabled).length,
      activePenaltyRules: Array.from(this.penaltyRules.values()).filter(r => r.enabled).length,
    };
  }

  // Private helper methods

  private updateCreditScore(account: AgentCreditAccount, direction: 'positive' | 'negative', amount: number): void {
    const impact = Math.min(10, Math.max(1, amount / 10));
    
    if (direction === 'positive') {
      account.creditScore = Math.min(100, account.creditScore + impact);
    } else {
      account.creditScore = Math.max(0, account.creditScore - impact * 2); // Penalties have double impact
    }

    // Update tier based on score
    account.tier = this.getTierForScore(account.creditScore);
    this.updateLimitsForTier(account);
  }

  private getTierForScore(score: number): CreditTier {
    const sortedTiers = [...this.tiers].sort((a, b) => b.requiredScore - a.requiredScore);
    return sortedTiers.find(t => score >= t.requiredScore) || this.tiers[0];
  }

  private updateLimitsForTier(account: AgentCreditAccount): void {
    const baseLimits = { dailySpend: 500, singleTransaction: 100, creditLine: 0, pendingMax: 200 };
    
    account.limits = {
      dailySpend: baseLimits.dailySpend * account.tier.level,
      singleTransaction: baseLimits.singleTransaction * account.tier.level,
      creditLine: account.tier.level >= 4 ? 500 : 0,
      pendingMax: baseLimits.pendingMax * account.tier.level,
    };
  }

  private getRecentEarnings(accountId: string, days: number): number {
    const cutoff = new Date(Date.now() - days * 86400000);
    return Array.from(this.events.values())
      .filter(e => e.accountId === accountId && e.type === 'reward' && e.timestamp >= cutoff)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  private evaluateRewardTrigger(trigger: RewardTrigger, performance: PerformanceMetrics): boolean {
    switch (trigger.type) {
      case 'task_complete':
        return true; // Always applies on task completion
      case 'threshold_reached':
        return performance.efficiency >= (trigger.value || 0);
      case 'quality_score':
        return performance.quality >= (trigger.value || 0);
      case 'streak':
        return performance.timeliness >= (trigger.value || 0);
      case 'milestone':
        return performance.collaboration >= (trigger.value || 0);
      default:
        return false;
    }
  }

  private evaluatePenaltyTrigger(
    trigger: PenaltyTrigger,
    issue: { type: string; severity: string; details?: Record<string, unknown> }
  ): boolean {
    const severityLevel: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

    switch (trigger.type) {
      case 'error':
        return issue.type === 'error' && severityLevel[issue.severity] >= 2;
      case 'timeout':
        return issue.type === 'timeout';
      case 'violation':
        return issue.type === 'violation';
      case 'quality_below':
        const quality = issue.details?.quality as number | undefined;
        return quality !== undefined && quality < (trigger.threshold || 0.5);
      case 'resource_waste':
        const waste = issue.details?.resourceWaste as number | undefined;
        return waste !== undefined && waste > (trigger.threshold || 0.3);
      default:
        return false;
    }
  }
}

export default AgentCredits;
