/**
 * Budget Ledger Module
 * Tracks and manages agent economic resources and budget allocation
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Budget Ledger Types
// ============================================================

export type TransactionType = 'credit' | 'debit' | 'transfer' | 'allocation' | 'refund';
export type AccountType = 'agent' | 'pool' | 'reserve' | 'operational';

export interface LedgerAccount {
  id: string;
  name: string;
  type: AccountType;
  ownerId: string;
  balance: number;
  creditLimit: number;
  currency: string;
  status: 'active' | 'suspended' | 'closed';
  metadata: AccountMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountMetadata {
  tags: string[];
  department?: string;
  costCenter?: string;
  budgetPeriod?: string;
}

export interface LedgerTransaction {
  id: string;
  type: TransactionType;
  fromAccountId?: string;
  toAccountId?: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  metadata: TransactionMetadata;
  timestamp: Date;
  completedAt?: Date;
}

export interface TransactionMetadata {
  actionId?: string;
  agentId?: string;
  correlationId?: string;
  tags: string[];
  approval?: {
    required: boolean;
    approvedBy?: string;
    approvedAt?: Date;
  };
}

export interface Budget {
  id: string;
  name: string;
  accountId: string;
  period: BudgetPeriod;
  amount: number;
  spent: number;
  remaining: number;
  alerts: BudgetAlert[];
  status: 'active' | 'exhausted' | 'expired';
  createdAt: Date;
}

export interface BudgetPeriod {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate: Date;
  endDate: Date;
}

export interface BudgetAlert {
  id: string;
  threshold: number; // Percentage 0-100
  triggered: boolean;
  triggeredAt?: Date;
  notified: boolean;
}

export interface AllocationRule {
  id: string;
  name: string;
  sourceAccountId: string;
  targetAccountId: string;
  type: 'percentage' | 'fixed' | 'remaining';
  value: number;
  frequency: 'realtime' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  lastApplied?: Date;
}

export interface LedgerReport {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  accounts: AccountSummary[];
  totalCredits: number;
  totalDebits: number;
  netChange: number;
  topCategories: CategorySummary[];
  generatedAt: Date;
}

export interface AccountSummary {
  accountId: string;
  accountName: string;
  openingBalance: number;
  closingBalance: number;
  credits: number;
  debits: number;
  transactionCount: number;
}

export interface CategorySummary {
  category: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

// ============================================================
// Budget Ledger Implementation
// ============================================================

export class BudgetLedger {
  private accounts: Map<string, LedgerAccount> = new Map();
  private transactions: Map<string, LedgerTransaction> = new Map();
  private budgets: Map<string, Budget> = new Map();
  private allocationRules: Map<string, AllocationRule> = new Map();

  constructor() {
    this.initializeDefaultAccounts();
  }

  /**
   * Initialize default accounts
   */
  private initializeDefaultAccounts(): void {
    // Main operational pool
    this.createAccount({
      name: 'Operational Pool',
      type: 'pool',
      ownerId: 'system',
      initialBalance: 1000000,
      creditLimit: 0,
    });

    // Reserve account
    this.createAccount({
      name: 'Reserve Fund',
      type: 'reserve',
      ownerId: 'system',
      initialBalance: 500000,
      creditLimit: 0,
    });
  }

  /**
   * Create a new ledger account
   */
  createAccount(params: {
    name: string;
    type: AccountType;
    ownerId: string;
    initialBalance?: number;
    creditLimit?: number;
    metadata?: Partial<AccountMetadata>;
  }): LedgerAccount {
    const account: LedgerAccount = {
      id: generateId(),
      name: params.name,
      type: params.type,
      ownerId: params.ownerId,
      balance: params.initialBalance || 0,
      creditLimit: params.creditLimit || 0,
      currency: 'credits',
      status: 'active',
      metadata: {
        tags: [],
        ...params.metadata,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.accounts.set(account.id, account);

    // Record initial balance as credit
    if (account.balance > 0) {
      this.recordTransaction({
        type: 'credit',
        toAccountId: account.id,
        amount: account.balance,
        description: 'Initial balance',
        category: 'initialization',
      });
    }

    return account;
  }

  /**
   * Record a transaction
   */
  recordTransaction(params: {
    type: TransactionType;
    fromAccountId?: string;
    toAccountId?: string;
    amount: number;
    description: string;
    category: string;
    metadata?: Partial<TransactionMetadata>;
    requireApproval?: boolean;
  }): LedgerTransaction {
    const transaction: LedgerTransaction = {
      id: generateId(),
      type: params.type,
      fromAccountId: params.fromAccountId,
      toAccountId: params.toAccountId,
      amount: params.amount,
      currency: 'credits',
      description: params.description,
      category: params.category,
      status: params.requireApproval ? 'pending' : 'completed',
      metadata: {
        tags: [],
        ...params.metadata,
        approval: params.requireApproval ? { required: true } : undefined,
      },
      timestamp: new Date(),
    };

    // Execute transaction if not requiring approval
    if (!params.requireApproval) {
      this.executeTransaction(transaction);
    }

    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  /**
   * Execute a transaction (apply to balances)
   */
  private executeTransaction(transaction: LedgerTransaction): void {
    if (transaction.type === 'debit' || transaction.type === 'transfer') {
      if (transaction.fromAccountId) {
        const fromAccount = this.accounts.get(transaction.fromAccountId);
        if (fromAccount) {
          const available = fromAccount.balance + fromAccount.creditLimit;
          if (available < transaction.amount) {
            transaction.status = 'failed';
            return;
          }
          fromAccount.balance -= transaction.amount;
          fromAccount.updatedAt = new Date();
        }
      }
    }

    if (transaction.type === 'credit' || transaction.type === 'transfer' || transaction.type === 'refund') {
      if (transaction.toAccountId) {
        const toAccount = this.accounts.get(transaction.toAccountId);
        if (toAccount) {
          toAccount.balance += transaction.amount;
          toAccount.updatedAt = new Date();
        }
      }
    }

    transaction.status = 'completed';
    transaction.completedAt = new Date();

    // Check budget alerts
    this.checkBudgetAlerts();
  }

  /**
   * Approve a pending transaction
   */
  approveTransaction(transactionId: string, approvedBy: string): LedgerTransaction {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction '${transactionId}' not found`);
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not pending approval');
    }

    transaction.metadata.approval = {
      required: true,
      approvedBy,
      approvedAt: new Date(),
    };

    this.executeTransaction(transaction);
    return transaction;
  }

  /**
   * Reverse a transaction
   */
  reverseTransaction(transactionId: string, reason: string): LedgerTransaction {
    const original = this.transactions.get(transactionId);
    if (!original) {
      throw new Error(`Transaction '${transactionId}' not found`);
    }

    if (original.status !== 'completed') {
      throw new Error('Can only reverse completed transactions');
    }

    // Create reversal
    const reversal = this.recordTransaction({
      type: 'refund',
      fromAccountId: original.toAccountId,
      toAccountId: original.fromAccountId,
      amount: original.amount,
      description: `Reversal of ${transactionId}: ${reason}`,
      category: 'reversal',
      metadata: {
        correlationId: transactionId,
      },
    });

    original.status = 'reversed';
    return reversal;
  }

  /**
   * Create a budget
   */
  createBudget(params: {
    name: string;
    accountId: string;
    amount: number;
    periodType: BudgetPeriod['type'];
    startDate?: Date;
    alertThresholds?: number[];
  }): Budget {
    const startDate = params.startDate || new Date();
    const endDate = this.calculatePeriodEnd(startDate, params.periodType);

    const budget: Budget = {
      id: generateId(),
      name: params.name,
      accountId: params.accountId,
      period: {
        type: params.periodType,
        startDate,
        endDate,
      },
      amount: params.amount,
      spent: 0,
      remaining: params.amount,
      alerts: (params.alertThresholds || [50, 75, 90, 100]).map(threshold => ({
        id: generateId(),
        threshold,
        triggered: false,
        notified: false,
      })),
      status: 'active',
      createdAt: new Date(),
    };

    this.budgets.set(budget.id, budget);
    return budget;
  }

  /**
   * Track spending against budget
   */
  trackSpending(accountId: string, amount: number): void {
    const budgets = Array.from(this.budgets.values())
      .filter(b => b.accountId === accountId && b.status === 'active');

    for (const budget of budgets) {
      budget.spent += amount;
      budget.remaining = budget.amount - budget.spent;

      if (budget.remaining <= 0) {
        budget.status = 'exhausted';
      }

      this.checkBudgetAlerts();
    }
  }

  /**
   * Check and trigger budget alerts
   */
  private checkBudgetAlerts(): void {
    for (const [_, budget] of this.budgets) {
      if (budget.status !== 'active') continue;

      const percentUsed = (budget.spent / budget.amount) * 100;

      for (const alert of budget.alerts) {
        if (!alert.triggered && percentUsed >= alert.threshold) {
          alert.triggered = true;
          alert.triggeredAt = new Date();
        }
      }
    }
  }

  /**
   * Create an allocation rule
   */
  createAllocationRule(params: {
    name: string;
    sourceAccountId: string;
    targetAccountId: string;
    type: AllocationRule['type'];
    value: number;
    frequency: AllocationRule['frequency'];
  }): AllocationRule {
    const rule: AllocationRule = {
      id: generateId(),
      ...params,
      enabled: true,
    };

    this.allocationRules.set(rule.id, rule);
    return rule;
  }

  /**
   * Apply allocation rules
   */
  applyAllocations(): LedgerTransaction[] {
    const transactions: LedgerTransaction[] = [];

    for (const [_, rule] of this.allocationRules) {
      if (!rule.enabled) continue;

      const sourceAccount = this.accounts.get(rule.sourceAccountId);
      if (!sourceAccount || sourceAccount.balance <= 0) continue;

      let amount: number;
      switch (rule.type) {
        case 'percentage':
          amount = sourceAccount.balance * (rule.value / 100);
          break;
        case 'fixed':
          amount = Math.min(rule.value, sourceAccount.balance);
          break;
        case 'remaining':
          amount = sourceAccount.balance;
          break;
        default:
          continue;
      }

      if (amount > 0) {
        const transaction = this.recordTransaction({
          type: 'transfer',
          fromAccountId: rule.sourceAccountId,
          toAccountId: rule.targetAccountId,
          amount,
          description: `Automatic allocation: ${rule.name}`,
          category: 'allocation',
        });

        transactions.push(transaction);
        rule.lastApplied = new Date();
      }
    }

    return transactions;
  }

  /**
   * Generate ledger report
   */
  generateReport(startDate: Date, endDate: Date): LedgerReport {
    const transactions = Array.from(this.transactions.values())
      .filter(t => t.timestamp >= startDate && t.timestamp <= endDate && t.status === 'completed');

    // Calculate account summaries
    const accountSummaries: AccountSummary[] = [];
    for (const [_, account] of this.accounts) {
      const accountTransactions = transactions.filter(
        t => t.fromAccountId === account.id || t.toAccountId === account.id
      );

      const credits = accountTransactions
        .filter(t => t.toAccountId === account.id)
        .reduce((sum, t) => sum + t.amount, 0);

      const debits = accountTransactions
        .filter(t => t.fromAccountId === account.id)
        .reduce((sum, t) => sum + t.amount, 0);

      accountSummaries.push({
        accountId: account.id,
        accountName: account.name,
        openingBalance: account.balance - credits + debits,
        closingBalance: account.balance,
        credits,
        debits,
        transactionCount: accountTransactions.length,
      });
    }

    // Calculate category summaries
    const categoryTotals: Map<string, { amount: number; count: number }> = new Map();
    for (const t of transactions) {
      const existing = categoryTotals.get(t.category) || { amount: 0, count: 0 };
      existing.amount += t.amount;
      existing.count++;
      categoryTotals.set(t.category, existing);
    }

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const categorySummaries: CategorySummary[] = Array.from(categoryTotals.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        transactionCount: data.count,
        percentage: (data.amount / totalAmount) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    const totalCredits = transactions
      .filter(t => t.type === 'credit' || (t.type === 'transfer' && t.toAccountId))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebits = transactions
      .filter(t => t.type === 'debit' || (t.type === 'transfer' && t.fromAccountId))
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      id: generateId(),
      periodStart: startDate,
      periodEnd: endDate,
      accounts: accountSummaries,
      totalCredits,
      totalDebits,
      netChange: totalCredits - totalDebits,
      topCategories: categorySummaries.slice(0, 10),
      generatedAt: new Date(),
    };
  }

  /**
   * Get account by ID
   */
  getAccount(accountId: string): LedgerAccount | undefined {
    return this.accounts.get(accountId);
  }

  /**
   * Get all accounts
   */
  getAccounts(): LedgerAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Get account balance
   */
  getBalance(accountId: string): number {
    const account = this.accounts.get(accountId);
    return account?.balance || 0;
  }

  /**
   * Get transactions for an account
   */
  getAccountTransactions(accountId: string, limit?: number): LedgerTransaction[] {
    const transactions = Array.from(this.transactions.values())
      .filter(t => t.fromAccountId === accountId || t.toAccountId === accountId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? transactions.slice(0, limit) : transactions;
  }

  /**
   * Get all budgets
   */
  getBudgets(): Budget[] {
    return Array.from(this.budgets.values());
  }

  /**
   * Get budget by ID
   */
  getBudget(budgetId: string): Budget | undefined {
    return this.budgets.get(budgetId);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalAccounts: number;
    activeAccounts: number;
    totalBalance: number;
    totalTransactions: number;
    pendingTransactions: number;
    activeBudgets: number;
    totalBudgetAmount: number;
    totalBudgetSpent: number;
  } {
    const accounts = this.getAccounts();
    const transactions = Array.from(this.transactions.values());
    const budgets = this.getBudgets();

    return {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter(a => a.status === 'active').length,
      totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
      totalTransactions: transactions.length,
      pendingTransactions: transactions.filter(t => t.status === 'pending').length,
      activeBudgets: budgets.filter(b => b.status === 'active').length,
      totalBudgetAmount: budgets.reduce((sum, b) => sum + b.amount, 0),
      totalBudgetSpent: budgets.reduce((sum, b) => sum + b.spent, 0),
    };
  }

  private calculatePeriodEnd(startDate: Date, periodType: BudgetPeriod['type']): Date {
    const end = new Date(startDate);
    switch (periodType) {
      case 'daily':
        end.setDate(end.getDate() + 1);
        break;
      case 'weekly':
        end.setDate(end.getDate() + 7);
        break;
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'quarterly':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        end.setMonth(end.getMonth() + 1);
    }
    return end;
  }
}

export default BudgetLedger;
