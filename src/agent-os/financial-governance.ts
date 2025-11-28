/**
 * Financial Governance Module
 * Financial controls, audit trails, and reconciliation
 */

import { RevenueLeak, RecoveryAction } from '../types';
import { generateId } from '../utils/helpers';
import {
  FinancialControl,
  FinancialRule,
  AuditTrailEntry,
  FinancialReconciliation,
  ReconciliationItem,
  GovernanceConfig,
} from './types';

export interface ApprovalRequest {
  id: string;
  type: 'action' | 'threshold' | 'override';
  entityType: string;
  entityId: string;
  requestedBy: string;
  requestedAt: Date;
  amount?: number;
  action: string;
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

export interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  checkType: 'sox' | 'gdpr' | 'internal' | 'custom';
  passed: boolean;
  details: string[];
  checkedAt: Date;
}

export interface FinancialSummary {
  period: { start: Date; end: Date };
  totalLeakValue: number;
  totalRecovered: number;
  totalWrittenOff: number;
  recoveryRate: number;
  pendingApprovals: number;
  complianceScore: number;
}

export class FinancialGovernanceEngine {
  private controls: Map<string, FinancialControl> = new Map();
  private auditTrail: AuditTrailEntry[] = [];
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private reconciliations: Map<string, FinancialReconciliation> = new Map();
  private config: GovernanceConfig;

  constructor(config?: Partial<GovernanceConfig>) {
    this.config = {
      enabled: true,
      auditRetentionDays: 365,
      approvalThresholds: {
        low: 1000,
        medium: 10000,
        high: 50000,
        critical: 100000,
      },
      requireJustification: true,
      ...config,
    };

    this.initializeDefaultControls();
  }

  /**
   * Initialize default financial controls
   */
  private initializeDefaultControls(): void {
    // Amount-based approval control
    this.controls.set('amount-approval', {
      id: 'amount-approval',
      name: 'Amount-Based Approval',
      type: 'approval',
      scope: 'transaction',
      rules: [
        {
          id: 'rule-low',
          condition: 'amount < 1000',
          action: 'approve',
        },
        {
          id: 'rule-medium',
          condition: 'amount >= 1000 AND amount < 10000',
          action: 'approve',
          approvers: ['team_lead'],
        },
        {
          id: 'rule-high',
          condition: 'amount >= 10000 AND amount < 50000',
          action: 'escalate',
          approvers: ['manager'],
        },
        {
          id: 'rule-critical',
          condition: 'amount >= 50000',
          action: 'escalate',
          approvers: ['director', 'finance_lead'],
        },
      ],
      enabled: true,
    });

    // Segregation of duties control
    this.controls.set('segregation-of-duties', {
      id: 'segregation-of-duties',
      name: 'Segregation of Duties',
      type: 'segregation',
      scope: 'entity',
      rules: [
        {
          id: 'rule-no-self-approval',
          condition: 'requester != approver',
          action: 'reject',
        },
        {
          id: 'rule-creator-not-processor',
          condition: 'creator != processor',
          action: 'flag',
        },
      ],
      enabled: true,
    });

    // Transaction limit control
    this.controls.set('transaction-limits', {
      id: 'transaction-limits',
      name: 'Transaction Limits',
      type: 'limit',
      scope: 'account',
      rules: [
        {
          id: 'rule-daily-limit',
          condition: 'daily_total <= 100000',
          action: 'approve',
          threshold: 100000,
        },
        {
          id: 'rule-single-transaction',
          condition: 'amount <= 50000',
          action: 'approve',
          threshold: 50000,
        },
      ],
      enabled: true,
    });

    // Audit control
    this.controls.set('audit-trail', {
      id: 'audit-trail',
      name: 'Mandatory Audit Trail',
      type: 'audit',
      scope: 'global',
      rules: [
        {
          id: 'rule-all-changes',
          condition: 'action_type IN (create, update, delete, approve, reject)',
          action: 'require_documentation',
        },
      ],
      enabled: true,
    });

    // Reconciliation control
    this.controls.set('reconciliation', {
      id: 'reconciliation',
      name: 'Periodic Reconciliation',
      type: 'reconciliation',
      scope: 'global',
      rules: [
        {
          id: 'rule-variance-threshold',
          condition: 'variance_percent <= 1',
          action: 'approve',
          threshold: 1,
        },
        {
          id: 'rule-variance-flag',
          condition: 'variance_percent > 1 AND variance_percent <= 5',
          action: 'flag',
          threshold: 5,
        },
        {
          id: 'rule-variance-escalate',
          condition: 'variance_percent > 5',
          action: 'escalate',
          threshold: 5,
        },
      ],
      enabled: true,
    });
  }

  /**
   * Evaluate financial controls for an action
   */
  evaluateControls(
    action: string,
    entityType: string,
    entityId: string,
    amount: number,
    actorId: string
  ): {
    approved: boolean;
    requiresApproval: boolean;
    approvers: string[];
    controlsApplied: string[];
    flags: string[];
  } {
    const controlsApplied: string[] = [];
    const flags: string[] = [];
    let requiresApproval = false;
    let approvers: string[] = [];

    for (const control of this.controls.values()) {
      if (!control.enabled) continue;

      for (const rule of control.rules) {
        const applies = this.evaluateCondition(rule.condition, {
          amount,
          action,
          entityType,
          actorId,
        });

        if (applies) {
          controlsApplied.push(`${control.name}: ${rule.id}`);

          switch (rule.action) {
            case 'approve':
              break;
            case 'escalate':
              requiresApproval = true;
              approvers = [...approvers, ...(rule.approvers || [])];
              break;
            case 'reject':
              return {
                approved: false,
                requiresApproval: false,
                approvers: [],
                controlsApplied,
                flags: ['Rejected by control: ' + control.name],
              };
            case 'flag':
              flags.push(`Flagged by ${control.name}: ${rule.id}`);
              break;
            case 'require_documentation':
              if (this.config.requireJustification) {
                flags.push('Documentation required');
              }
              break;
          }
        }
      }
    }

    return {
      approved: !requiresApproval,
      requiresApproval,
      approvers: [...new Set(approvers)],
      controlsApplied,
      flags,
    };
  }

  /**
   * Evaluate a rule condition
   */
  private evaluateCondition(
    condition: string,
    context: Record<string, unknown>
  ): boolean {
    // Simple condition evaluation
    const amount = context['amount'] as number;

    if (condition.includes('amount')) {
      if (condition.includes('amount < 1000')) return amount < 1000;
      if (condition.includes('amount >= 1000 AND amount < 10000')) return amount >= 1000 && amount < 10000;
      if (condition.includes('amount >= 10000 AND amount < 50000')) return amount >= 10000 && amount < 50000;
      if (condition.includes('amount >= 50000')) return amount >= 50000;
      if (condition.includes('amount <= 50000')) return amount <= 50000;
    }

    // For other conditions, default to true
    return true;
  }

  /**
   * Create an approval request
   */
  createApprovalRequest(
    type: ApprovalRequest['type'],
    entityType: string,
    entityId: string,
    action: string,
    requestedBy: string,
    justification: string,
    amount?: number
  ): ApprovalRequest {
    const request: ApprovalRequest = {
      id: generateId(),
      type,
      entityType,
      entityId,
      requestedBy,
      requestedAt: new Date(),
      amount,
      action,
      justification,
      status: 'pending',
    };

    this.approvalRequests.set(request.id, request);

    // Log to audit trail
    this.logAuditEntry(
      requestedBy,
      'user',
      'create_approval_request',
      entityType,
      entityId,
      undefined,
      { requestId: request.id, action, amount },
      justification,
      undefined,
      ['amount-approval']
    );

    return request;
  }

  /**
   * Process an approval request
   */
  processApprovalRequest(
    requestId: string,
    reviewedBy: string,
    approved: boolean,
    notes?: string
  ): ApprovalRequest {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    // Check segregation of duties
    if (request.requestedBy === reviewedBy) {
      throw new Error('Self-approval not allowed (segregation of duties)');
    }

    request.status = approved ? 'approved' : 'rejected';
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date();
    request.reviewNotes = notes;

    // Log to audit trail
    this.logAuditEntry(
      reviewedBy,
      'user',
      approved ? 'approve_request' : 'reject_request',
      request.entityType,
      request.entityId,
      { status: 'pending' },
      { status: request.status },
      notes,
      undefined,
      ['segregation-of-duties', 'audit-trail']
    );

    return request;
  }

  /**
   * Log an audit trail entry
   */
  logAuditEntry(
    actor: string,
    actorType: AuditTrailEntry['actorType'],
    action: string,
    entityType: string,
    entityId: string,
    previousState?: Record<string, unknown>,
    newState?: Record<string, unknown>,
    justification?: string,
    approvedBy?: string,
    controlsApplied: string[] = []
  ): AuditTrailEntry {
    const entry: AuditTrailEntry = {
      id: generateId(),
      timestamp: new Date(),
      actor,
      actorType,
      action,
      entityType,
      entityId,
      previousState,
      newState,
      justification,
      approvedBy,
      controlsApplied,
    };

    this.auditTrail.push(entry);

    // Enforce retention policy
    this.enforceAuditRetention();

    return entry;
  }

  /**
   * Enforce audit trail retention policy
   */
  private enforceAuditRetention(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.auditRetentionDays);

    this.auditTrail = this.auditTrail.filter(
      entry => entry.timestamp >= cutoffDate
    );
  }

  /**
   * Create a financial reconciliation
   */
  createReconciliation(
    name: string,
    period: { start: Date; end: Date },
    sourceTotal: number,
    targetTotal: number,
    items: Omit<ReconciliationItem, 'id'>[]
  ): FinancialReconciliation {
    const variance = sourceTotal - targetTotal;
    const variancePercent = targetTotal !== 0 
      ? (Math.abs(variance) / targetTotal) * 100 
      : (variance !== 0 ? 100 : 0);

    const reconciliationItems: ReconciliationItem[] = items.map(item => ({
      ...item,
      id: generateId(),
    }));

    const reconciliation: FinancialReconciliation = {
      id: generateId(),
      name,
      period,
      status: this.determineReconciliationStatus(variancePercent),
      sourceTotal,
      targetTotal,
      variance,
      variancePercent,
      items: reconciliationItems,
    };

    this.reconciliations.set(reconciliation.id, reconciliation);

    // Log to audit trail
    this.logAuditEntry(
      'system',
      'system',
      'create_reconciliation',
      'reconciliation',
      reconciliation.id,
      undefined,
      { 
        sourceTotal, 
        targetTotal, 
        variance, 
        variancePercent,
        itemCount: items.length,
      },
      undefined,
      undefined,
      ['reconciliation']
    );

    return reconciliation;
  }

  /**
   * Determine reconciliation status based on variance
   */
  private determineReconciliationStatus(
    variancePercent: number
  ): FinancialReconciliation['status'] {
    if (variancePercent <= 1) return 'completed';
    if (variancePercent <= 5) return 'in_progress';
    return 'requires_review';
  }

  /**
   * Complete a reconciliation
   */
  completeReconciliation(
    reconciliationId: string,
    adjustments?: Omit<ReconciliationItem, 'id'>[]
  ): FinancialReconciliation {
    const reconciliation = this.reconciliations.get(reconciliationId);
    if (!reconciliation) {
      throw new Error(`Reconciliation ${reconciliationId} not found`);
    }

    if (adjustments) {
      const newItems = adjustments.map(item => ({
        ...item,
        id: generateId(),
        status: 'adjusted' as const,
      }));
      reconciliation.items.push(...newItems);

      // Recalculate variance
      const adjustmentTotal = newItems.reduce((sum, item) => sum + item.difference, 0);
      reconciliation.variance += adjustmentTotal;
      reconciliation.variancePercent = reconciliation.targetTotal !== 0
        ? (Math.abs(reconciliation.variance) / reconciliation.targetTotal) * 100
        : 0;
    }

    reconciliation.status = 'completed';
    reconciliation.completedAt = new Date();

    // Log completion
    this.logAuditEntry(
      'system',
      'system',
      'complete_reconciliation',
      'reconciliation',
      reconciliationId,
      { status: 'in_progress' },
      { status: 'completed', variance: reconciliation.variance },
      undefined,
      undefined,
      ['reconciliation', 'audit-trail']
    );

    return reconciliation;
  }

  /**
   * Run compliance checks
   */
  runComplianceChecks(leaks: RevenueLeak[]): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];

    // SOX compliance check
    checks.push(this.checkSOXCompliance(leaks));

    // Data integrity check
    checks.push(this.checkDataIntegrity(leaks));

    // Approval workflow check
    checks.push(this.checkApprovalWorkflows());

    // Audit trail completeness check
    checks.push(this.checkAuditCompleteness());

    return checks;
  }

  /**
   * SOX compliance check
   */
  private checkSOXCompliance(leaks: RevenueLeak[]): ComplianceCheck {
    const details: string[] = [];
    let passed = true;

    // Check for proper controls on financial data
    const amountControl = this.controls.get('amount-approval');
    if (!amountControl?.enabled) {
      passed = false;
      details.push('Amount-based approval control is not enabled');
    } else {
      details.push('Amount-based approval control is active');
    }

    // Check segregation of duties
    const segregationControl = this.controls.get('segregation-of-duties');
    if (!segregationControl?.enabled) {
      passed = false;
      details.push('Segregation of duties control is not enabled');
    } else {
      details.push('Segregation of duties control is active');
    }

    // Check audit trail
    if (this.auditTrail.length === 0) {
      details.push('Warning: No audit trail entries found');
    } else {
      details.push(`Audit trail contains ${this.auditTrail.length} entries`);
    }

    // Check for high-value leaks without approval
    const highValueLeaks = leaks.filter(l => l.potentialRevenue >= 50000);
    if (highValueLeaks.length > 0) {
      details.push(`${highValueLeaks.length} high-value leaks require management review`);
    }

    return {
      id: generateId(),
      name: 'SOX Compliance',
      description: 'Sarbanes-Oxley Act compliance verification',
      checkType: 'sox',
      passed,
      details,
      checkedAt: new Date(),
    };
  }

  /**
   * Data integrity check
   */
  private checkDataIntegrity(leaks: RevenueLeak[]): ComplianceCheck {
    const details: string[] = [];
    let passed = true;

    // Check for duplicate leaks
    const leakIds = leaks.map(l => l.id);
    const uniqueIds = new Set(leakIds);
    if (leakIds.length !== uniqueIds.size) {
      passed = false;
      details.push('Duplicate leak IDs detected');
    } else {
      details.push('No duplicate leak IDs');
    }

    // Check for missing required fields
    const missingFields = leaks.filter(l => 
      !l.id || !l.type || l.potentialRevenue === undefined
    );
    if (missingFields.length > 0) {
      passed = false;
      details.push(`${missingFields.length} leaks missing required fields`);
    } else {
      details.push('All leaks have required fields');
    }

    // Check for negative revenue values
    const negativeRevenue = leaks.filter(l => l.potentialRevenue < 0);
    if (negativeRevenue.length > 0) {
      passed = false;
      details.push(`${negativeRevenue.length} leaks have negative revenue values`);
    } else {
      details.push('No negative revenue values');
    }

    return {
      id: generateId(),
      name: 'Data Integrity',
      description: 'Verification of data completeness and validity',
      checkType: 'internal',
      passed,
      details,
      checkedAt: new Date(),
    };
  }

  /**
   * Approval workflow check
   */
  private checkApprovalWorkflows(): ComplianceCheck {
    const details: string[] = [];
    let passed = true;

    const pendingRequests = Array.from(this.approvalRequests.values())
      .filter(r => r.status === 'pending');

    // Check for stale pending requests (>24 hours)
    const staleRequests = pendingRequests.filter(r => {
      const age = Date.now() - r.requestedAt.getTime();
      return age > 24 * 60 * 60 * 1000;
    });

    if (staleRequests.length > 0) {
      passed = false;
      details.push(`${staleRequests.length} approval requests pending >24 hours`);
    } else {
      details.push('No stale approval requests');
    }

    details.push(`Total pending approvals: ${pendingRequests.length}`);

    return {
      id: generateId(),
      name: 'Approval Workflows',
      description: 'Verification of approval process timeliness',
      checkType: 'internal',
      passed,
      details,
      checkedAt: new Date(),
    };
  }

  /**
   * Audit completeness check
   */
  private checkAuditCompleteness(): ComplianceCheck {
    const details: string[] = [];
    let passed = true;

    // Check audit trail is being maintained
    const auditControl = this.controls.get('audit-trail');
    if (!auditControl?.enabled) {
      passed = false;
      details.push('Audit trail control is not enabled');
    } else {
      details.push('Audit trail control is active');
    }

    // Check for gaps in audit trail
    const today = new Date();
    const recentEntries = this.auditTrail.filter(e => {
      const age = (today.getTime() - e.timestamp.getTime()) / (1000 * 60 * 60);
      return age <= 24;
    });

    details.push(`${recentEntries.length} audit entries in last 24 hours`);

    // Check for entries without justification
    const missingJustification = this.auditTrail.filter(e => 
      this.config.requireJustification && 
      ['approve_request', 'reject_request', 'update'].includes(e.action) && 
      !e.justification
    );

    if (missingJustification.length > 0) {
      details.push(`Warning: ${missingJustification.length} entries missing justification`);
    }

    return {
      id: generateId(),
      name: 'Audit Completeness',
      description: 'Verification of audit trail completeness',
      checkType: 'internal',
      passed,
      details,
      checkedAt: new Date(),
    };
  }

  /**
   * Generate financial summary
   */
  generateSummary(
    leaks: RevenueLeak[],
    period: { start: Date; end: Date }
  ): FinancialSummary {
    const totalLeakValue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    
    // Calculate recovered value from completed reconciliations
    const completedReconciliations = Array.from(this.reconciliations.values())
      .filter(r => 
        r.status === 'completed' &&
        r.period.start >= period.start &&
        r.period.end <= period.end
      );

    const totalRecovered = completedReconciliations.reduce(
      (sum, r) => sum + (r.sourceTotal - Math.abs(r.variance)), 
      0
    );

    const pendingApprovals = Array.from(this.approvalRequests.values())
      .filter(r => r.status === 'pending').length;

    // Calculate compliance score
    const checks = this.runComplianceChecks(leaks);
    const passedChecks = checks.filter(c => c.passed).length;
    const complianceScore = checks.length > 0 ? (passedChecks / checks.length) * 100 : 100;

    return {
      period,
      totalLeakValue,
      totalRecovered,
      totalWrittenOff: 0,
      recoveryRate: totalLeakValue > 0 ? (totalRecovered / totalLeakValue) * 100 : 0,
      pendingApprovals,
      complianceScore,
    };
  }

  /**
   * Get all controls
   */
  getControls(): FinancialControl[] {
    return Array.from(this.controls.values());
  }

  /**
   * Get audit trail
   */
  getAuditTrail(
    filters?: {
      entityType?: string;
      entityId?: string;
      actor?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): AuditTrailEntry[] {
    let entries = [...this.auditTrail];

    if (filters) {
      if (filters.entityType) {
        entries = entries.filter(e => e.entityType === filters.entityType);
      }
      if (filters.entityId) {
        entries = entries.filter(e => e.entityId === filters.entityId);
      }
      if (filters.actor) {
        entries = entries.filter(e => e.actor === filters.actor);
      }
      if (filters.action) {
        entries = entries.filter(e => e.action === filters.action);
      }
      if (filters.startDate) {
        entries = entries.filter(e => e.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        entries = entries.filter(e => e.timestamp <= filters.endDate!);
      }
    }

    return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get pending approval requests
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values())
      .filter(r => r.status === 'pending');
  }

  /**
   * Get reconciliations
   */
  getReconciliations(): FinancialReconciliation[] {
    return Array.from(this.reconciliations.values());
  }

  /**
   * Get governance statistics
   */
  getStats(): {
    totalControls: number;
    enabledControls: number;
    auditEntries: number;
    pendingApprovals: number;
    reconciliations: number;
    complianceIssues: number;
  } {
    const controls = this.getControls();
    const pendingApprovals = this.getPendingApprovals();

    return {
      totalControls: controls.length,
      enabledControls: controls.filter(c => c.enabled).length,
      auditEntries: this.auditTrail.length,
      pendingApprovals: pendingApprovals.length,
      reconciliations: this.reconciliations.size,
      complianceIssues: 0,
    };
  }
}

export default FinancialGovernanceEngine;
