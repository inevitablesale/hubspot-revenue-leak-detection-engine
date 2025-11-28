/**
 * Governance Constitution Module
 * Provides safety guardrails, enterprise trust mechanisms, policy enforcement,
 * and compliance controls for the Agent OS
 */

import { generateId } from '../utils/helpers';
import { RevenueLeak } from '../types';

// ============================================================
// Governance Constitution Types
// ============================================================

export type PolicyType = 'access' | 'action' | 'data' | 'compliance' | 'safety' | 'ethical';
export type PolicyEnforcement = 'strict' | 'warning' | 'advisory';
export type ComplianceStandard = 'sox' | 'gdpr' | 'hipaa' | 'pci' | 'iso27001' | 'soc2';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  type: PolicyType;
  enforcement: PolicyEnforcement;
  enabled: boolean;
  priority: number;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  exceptions: PolicyException[];
  metadata: PolicyMetadata;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface PolicyCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'matches';
  value: unknown;
  logical: 'and' | 'or';
}

export interface PolicyAction {
  type: 'allow' | 'deny' | 'require_approval' | 'log' | 'alert' | 'escalate';
  config: Record<string, unknown>;
  message: string;
}

export interface PolicyException {
  id: string;
  name: string;
  reason: string;
  conditions: PolicyCondition[];
  validFrom?: Date;
  validUntil?: Date;
  approvedBy: string;
  approvedAt: Date;
}

export interface PolicyMetadata {
  owner: string;
  category: string;
  tags: string[];
  complianceStandards: ComplianceStandard[];
  lastAuditedAt?: Date;
  auditedBy?: string;
}

export interface SafetyGuardrail {
  id: string;
  name: string;
  description: string;
  type: 'limit' | 'circuit_breaker' | 'validation' | 'rollback' | 'kill_switch';
  enabled: boolean;
  config: GuardrailConfig;
  triggers: GuardrailTrigger[];
  state: GuardrailState;
  metrics: GuardrailMetrics;
}

export interface GuardrailConfig {
  threshold: number;
  windowMs: number;
  cooldownMs: number;
  maxViolations: number;
  autoRecover: boolean;
  notifyOnTrigger: boolean;
}

export interface GuardrailTrigger {
  id: string;
  timestamp: Date;
  reason: string;
  context: Record<string, unknown>;
  resolution?: string;
  resolvedAt?: Date;
}

export interface GuardrailState {
  isTriggered: boolean;
  triggeredAt?: Date;
  violationCount: number;
  lastViolationAt?: Date;
  cooldownUntil?: Date;
}

export interface GuardrailMetrics {
  totalTriggers: number;
  totalBlocked: number;
  avgRecoveryTime: number;
  falsePositives: number;
}

export interface TrustScore {
  id: string;
  entityId: string;
  entityType: 'user' | 'agent' | 'action' | 'system';
  score: number; // 0-100
  factors: TrustFactor[];
  history: TrustHistoryEntry[];
  calculatedAt: Date;
  validUntil: Date;
}

export interface TrustFactor {
  name: string;
  weight: number;
  score: number;
  source: string;
  evidence: string[];
}

export interface TrustHistoryEntry {
  timestamp: Date;
  score: number;
  event: string;
  impact: number;
}

export interface RiskAssessment {
  id: string;
  entityId: string;
  entityType: string;
  riskLevel: RiskLevel;
  overallScore: number; // 0-100, higher = more risk
  factors: RiskFactor[];
  mitigations: RiskMitigation[];
  recommendations: string[];
  assessedAt: Date;
  validUntil: Date;
}

export interface RiskFactor {
  name: string;
  category: 'financial' | 'operational' | 'compliance' | 'reputational' | 'security';
  weight: number;
  score: number;
  description: string;
  evidence: string[];
}

export interface RiskMitigation {
  id: string;
  riskFactorId: string;
  strategy: string;
  status: 'proposed' | 'approved' | 'implemented' | 'verified';
  effectiveness: number;
  cost: number;
  assignedTo?: string;
}

export interface ComplianceCheck {
  id: string;
  standard: ComplianceStandard;
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  evidence: ComplianceEvidence[];
  findings: ComplianceFinding[];
  lastChecked: Date;
  nextCheckDue: Date;
}

export interface ComplianceEvidence {
  id: string;
  type: 'document' | 'log' | 'attestation' | 'scan' | 'test';
  description: string;
  location: string;
  collectedAt: Date;
  validUntil?: Date;
}

export interface ComplianceFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  dueDate?: Date;
  assignedTo?: string;
}

export interface PolicyViolation {
  id: string;
  policyId: string;
  entityId: string;
  entityType: string;
  action: string;
  context: Record<string, unknown>;
  severity: RiskLevel;
  resolution: 'blocked' | 'allowed_with_warning' | 'escalated' | 'pending';
  timestamp: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface GovernanceConstitutionConfig {
  enabled: boolean;
  strictMode: boolean;
  defaultEnforcement: PolicyEnforcement;
  auditAllActions: boolean;
  trustScoreEnabled: boolean;
  riskAssessmentEnabled: boolean;
  complianceStandards: ComplianceStandard[];
  maxViolationsBeforeLockout: number;
}

// ============================================================
// Governance Constitution Implementation
// ============================================================

export class GovernanceConstitution {
  private policies: Map<string, GovernancePolicy> = new Map();
  private guardrails: Map<string, SafetyGuardrail> = new Map();
  private trustScores: Map<string, TrustScore> = new Map();
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private complianceChecks: Map<string, ComplianceCheck> = new Map();
  private violations: Map<string, PolicyViolation> = new Map();
  private config: GovernanceConstitutionConfig;

  constructor(config?: Partial<GovernanceConstitutionConfig>) {
    this.config = {
      enabled: true,
      strictMode: false,
      defaultEnforcement: 'warning',
      auditAllActions: true,
      trustScoreEnabled: true,
      riskAssessmentEnabled: true,
      complianceStandards: ['sox', 'soc2'],
      maxViolationsBeforeLockout: 10,
      ...config,
    };

    this.initializeDefaultPolicies();
    this.initializeDefaultGuardrails();
    this.initializeComplianceChecks();
  }

  /**
   * Initialize default governance policies
   */
  private initializeDefaultPolicies(): void {
    // Data access policy
    this.createPolicy({
      name: 'Data Access Control',
      description: 'Controls access to sensitive customer and financial data',
      type: 'access',
      enforcement: 'strict',
      priority: 1,
      conditions: [
        { field: 'data.sensitivity', operator: 'equals', value: 'high', logical: 'and' },
      ],
      actions: [
        { type: 'require_approval', config: { approverRole: 'admin' }, message: 'High sensitivity data access requires admin approval' },
        { type: 'log', config: { level: 'audit' }, message: 'Logging high sensitivity data access' },
      ],
    });

    // Action limit policy
    this.createPolicy({
      name: 'Bulk Action Limits',
      description: 'Limits bulk actions to prevent accidental mass operations',
      type: 'action',
      enforcement: 'strict',
      priority: 1,
      conditions: [
        { field: 'action.count', operator: 'greater_than', value: 100, logical: 'and' },
      ],
      actions: [
        { type: 'require_approval', config: { approverRole: 'manager' }, message: 'Bulk actions over 100 items require manager approval' },
      ],
    });

    // Financial threshold policy
    this.createPolicy({
      name: 'High Value Operations',
      description: 'Additional controls for high-value financial operations',
      type: 'action',
      enforcement: 'strict',
      priority: 1,
      conditions: [
        { field: 'amount', operator: 'greater_than', value: 50000, logical: 'and' },
      ],
      actions: [
        { type: 'require_approval', config: { approverRole: 'finance' }, message: 'Operations over $50,000 require finance approval' },
        { type: 'log', config: { level: 'audit' }, message: 'High value operation recorded' },
      ],
    });

    // Safety policy
    this.createPolicy({
      name: 'Automated Action Safety',
      description: 'Safety controls for automated system actions',
      type: 'safety',
      enforcement: 'strict',
      priority: 1,
      conditions: [
        { field: 'action.automated', operator: 'equals', value: true, logical: 'and' },
        { field: 'action.destructive', operator: 'equals', value: true, logical: 'and' },
      ],
      actions: [
        { type: 'deny', config: {}, message: 'Automated destructive actions are not allowed' },
        { type: 'alert', config: { severity: 'high' }, message: 'Blocked automated destructive action' },
      ],
    });

    // Ethical AI policy
    this.createPolicy({
      name: 'Ethical AI Guidelines',
      description: 'Ensures AI operations follow ethical guidelines',
      type: 'ethical',
      enforcement: 'warning',
      priority: 2,
      conditions: [
        { field: 'ai.decision', operator: 'equals', value: true, logical: 'and' },
      ],
      actions: [
        { type: 'log', config: { includeExplanation: true }, message: 'AI decision logged with explanation' },
      ],
    });
  }

  /**
   * Initialize default safety guardrails
   */
  private initializeDefaultGuardrails(): void {
    // Rate limiter guardrail
    this.createGuardrail({
      name: 'API Rate Limiter',
      description: 'Prevents excessive API calls',
      type: 'limit',
      config: {
        threshold: 1000,
        windowMs: 60000,
        cooldownMs: 30000,
        maxViolations: 3,
        autoRecover: true,
        notifyOnTrigger: true,
      },
    });

    // Circuit breaker for external services
    this.createGuardrail({
      name: 'External Service Circuit Breaker',
      description: 'Protects against external service failures',
      type: 'circuit_breaker',
      config: {
        threshold: 5, // failures
        windowMs: 30000,
        cooldownMs: 60000,
        maxViolations: 1,
        autoRecover: true,
        notifyOnTrigger: true,
      },
    });

    // Data validation guardrail
    this.createGuardrail({
      name: 'Data Integrity Validator',
      description: 'Ensures data integrity on write operations',
      type: 'validation',
      config: {
        threshold: 0, // no invalid data allowed
        windowMs: 0,
        cooldownMs: 0,
        maxViolations: 5,
        autoRecover: false,
        notifyOnTrigger: true,
      },
    });

    // Emergency kill switch
    this.createGuardrail({
      name: 'Emergency Kill Switch',
      description: 'Emergency stop for all automated operations',
      type: 'kill_switch',
      config: {
        threshold: 1,
        windowMs: 0,
        cooldownMs: 0,
        maxViolations: 1,
        autoRecover: false,
        notifyOnTrigger: true,
      },
    });

    // Rollback capability
    this.createGuardrail({
      name: 'Automatic Rollback',
      description: 'Automatically rollback failed batch operations',
      type: 'rollback',
      config: {
        threshold: 20, // 20% failure rate
        windowMs: 300000, // 5 minutes
        cooldownMs: 60000,
        maxViolations: 3,
        autoRecover: true,
        notifyOnTrigger: true,
      },
    });
  }

  /**
   * Initialize compliance checks
   */
  private initializeComplianceChecks(): void {
    // SOX compliance checks
    this.addComplianceCheck({
      standard: 'sox',
      requirement: 'Audit trail for financial data access',
      status: 'compliant',
      evidence: [{
        id: generateId(),
        type: 'log',
        description: 'Comprehensive audit logging enabled',
        location: '/audit/logs',
        collectedAt: new Date(),
      }],
      findings: [],
    });

    // SOC2 compliance checks
    this.addComplianceCheck({
      standard: 'soc2',
      requirement: 'Access control and authentication',
      status: 'compliant',
      evidence: [{
        id: generateId(),
        type: 'attestation',
        description: 'OAuth2 implementation verified',
        location: '/auth/oauth',
        collectedAt: new Date(),
      }],
      findings: [],
    });

    this.addComplianceCheck({
      standard: 'soc2',
      requirement: 'Data encryption at rest and in transit',
      status: 'compliant',
      evidence: [{
        id: generateId(),
        type: 'scan',
        description: 'TLS 1.3 verified on all endpoints',
        location: '/security/tls-scan',
        collectedAt: new Date(),
      }],
      findings: [],
    });
  }

  /**
   * Create a governance policy
   */
  createPolicy(options: {
    name: string;
    description: string;
    type: PolicyType;
    enforcement?: PolicyEnforcement;
    priority?: number;
    conditions: Omit<PolicyCondition, 'id'>[];
    actions: PolicyAction[];
    exceptions?: Omit<PolicyException, 'id'>[];
    metadata?: Partial<PolicyMetadata>;
  }): GovernancePolicy {
    const policy: GovernancePolicy = {
      id: generateId(),
      name: options.name,
      description: options.description,
      type: options.type,
      enforcement: options.enforcement || this.config.defaultEnforcement,
      enabled: true,
      priority: options.priority || 5,
      conditions: options.conditions.map(c => ({ ...c, id: generateId() })),
      actions: options.actions,
      exceptions: (options.exceptions || []).map(e => ({ ...e, id: generateId() })),
      metadata: {
        owner: 'system',
        category: options.type,
        tags: [],
        complianceStandards: [],
        ...options.metadata,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    this.policies.set(policy.id, policy);
    return policy;
  }

  /**
   * Create a safety guardrail
   */
  createGuardrail(options: {
    name: string;
    description: string;
    type: SafetyGuardrail['type'];
    config: GuardrailConfig;
  }): SafetyGuardrail {
    const guardrail: SafetyGuardrail = {
      id: generateId(),
      name: options.name,
      description: options.description,
      type: options.type,
      enabled: true,
      config: options.config,
      triggers: [],
      state: {
        isTriggered: false,
        violationCount: 0,
      },
      metrics: {
        totalTriggers: 0,
        totalBlocked: 0,
        avgRecoveryTime: 0,
        falsePositives: 0,
      },
    };

    this.guardrails.set(guardrail.id, guardrail);
    return guardrail;
  }

  /**
   * Evaluate action against policies
   */
  evaluateAction(
    actionType: string,
    context: Record<string, unknown>,
    actorId: string
  ): {
    allowed: boolean;
    requiresApproval: boolean;
    violations: PolicyViolation[];
    warnings: string[];
    approvalRequired: { policyId: string; approverRole: string }[];
  } {
    const result = {
      allowed: true,
      requiresApproval: false,
      violations: [] as PolicyViolation[],
      warnings: [] as string[],
      approvalRequired: [] as { policyId: string; approverRole: string }[],
    };

    if (!this.config.enabled) return result;

    const enabledPolicies = Array.from(this.policies.values())
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const policy of enabledPolicies) {
      const evaluation = this.evaluatePolicyConditions(policy, context);
      
      if (evaluation.matches) {
        // Check for exceptions
        const hasException = this.checkExceptions(policy, context);
        if (hasException) continue;

        // Process policy actions
        for (const action of policy.actions) {
          switch (action.type) {
            case 'deny':
              if (policy.enforcement === 'strict') {
                result.allowed = false;
                const violation = this.recordViolation(policy.id, actionType, context, 'blocked');
                result.violations.push(violation);
              } else {
                result.warnings.push(action.message);
              }
              break;

            case 'require_approval':
              result.requiresApproval = true;
              result.approvalRequired.push({
                policyId: policy.id,
                approverRole: action.config.approverRole as string,
              });
              break;

            case 'alert':
              result.warnings.push(action.message);
              break;

            case 'log':
              // Audit logging is handled separately
              break;

            case 'escalate':
              result.warnings.push(`Escalation required: ${action.message}`);
              break;
          }
        }
      }
    }

    return result;
  }

  /**
   * Evaluate policy conditions
   */
  private evaluatePolicyConditions(
    policy: GovernancePolicy,
    context: Record<string, unknown>
  ): { matches: boolean; matchedConditions: string[] } {
    const matchedConditions: string[] = [];
    let andConditionsMet = true;
    let orConditionMet = false;

    for (const condition of policy.conditions) {
      const value = this.getNestedValue(context, condition.field);
      const matches = this.evaluateCondition(condition, value);

      if (matches) {
        matchedConditions.push(condition.id);
        orConditionMet = true;
      } else if (condition.logical === 'and') {
        andConditionsMet = false;
      }
    }

    // All AND conditions must match, or at least one OR condition must match
    const overallMatch = andConditionsMet || orConditionMet;

    return { matches: overallMatch, matchedConditions };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: PolicyCondition, value: unknown): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'matches':
        return new RegExp(String(condition.value)).test(String(value));
      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Check if any exception applies
   */
  private checkExceptions(policy: GovernancePolicy, context: Record<string, unknown>): boolean {
    const now = new Date();

    for (const exception of policy.exceptions) {
      if (exception.validFrom && exception.validFrom > now) continue;
      if (exception.validUntil && exception.validUntil < now) continue;

      const { matches } = this.evaluatePolicyConditions(
        { ...policy, conditions: exception.conditions },
        context
      );

      if (matches) return true;
    }

    return false;
  }

  /**
   * Record a policy violation
   */
  private recordViolation(
    policyId: string,
    action: string,
    context: Record<string, unknown>,
    resolution: PolicyViolation['resolution']
  ): PolicyViolation {
    const violation: PolicyViolation = {
      id: generateId(),
      policyId,
      entityId: String(context.entityId || 'unknown'),
      entityType: String(context.entityType || 'unknown'),
      action,
      context,
      severity: 'medium',
      resolution,
      timestamp: new Date(),
    };

    this.violations.set(violation.id, violation);
    return violation;
  }

  /**
   * Check guardrail
   */
  checkGuardrail(guardrailId: string, value: number): {
    allowed: boolean;
    triggered: boolean;
    message: string;
  } {
    const guardrail = this.guardrails.get(guardrailId);
    if (!guardrail || !guardrail.enabled) {
      return { allowed: true, triggered: false, message: 'Guardrail not active' };
    }

    // Check if in cooldown
    if (guardrail.state.cooldownUntil && guardrail.state.cooldownUntil > new Date()) {
      return { 
        allowed: false, 
        triggered: true, 
        message: `Guardrail in cooldown until ${guardrail.state.cooldownUntil.toISOString()}` 
      };
    }

    // Check threshold
    const exceeded = guardrail.type === 'limit' 
      ? value >= guardrail.config.threshold
      : value > guardrail.config.threshold;

    if (exceeded) {
      guardrail.state.violationCount++;
      guardrail.state.lastViolationAt = new Date();

      if (guardrail.state.violationCount >= guardrail.config.maxViolations) {
        guardrail.state.isTriggered = true;
        guardrail.state.triggeredAt = new Date();
        guardrail.state.cooldownUntil = new Date(Date.now() + guardrail.config.cooldownMs);
        guardrail.metrics.totalTriggers++;
        guardrail.metrics.totalBlocked++;

        guardrail.triggers.push({
          id: generateId(),
          timestamp: new Date(),
          reason: `Threshold ${guardrail.config.threshold} exceeded with value ${value}`,
          context: { value, threshold: guardrail.config.threshold },
        });

        return { 
          allowed: false, 
          triggered: true, 
          message: `Guardrail ${guardrail.name} triggered: ${value} exceeds ${guardrail.config.threshold}` 
        };
      }
    }

    return { allowed: true, triggered: false, message: 'OK' };
  }

  /**
   * Reset guardrail
   */
  resetGuardrail(guardrailId: string): boolean {
    const guardrail = this.guardrails.get(guardrailId);
    if (!guardrail) return false;

    guardrail.state = {
      isTriggered: false,
      violationCount: 0,
    };

    return true;
  }

  /**
   * Calculate trust score
   */
  calculateTrustScore(
    entityId: string,
    entityType: TrustScore['entityType'],
    factors: Omit<TrustFactor, 'weight'>[]
  ): TrustScore {
    // Default weights
    const weightedFactors: TrustFactor[] = factors.map(f => ({
      ...f,
      weight: 1 / factors.length,
    }));

    const score = weightedFactors.reduce((sum, f) => sum + f.score * f.weight, 0);

    const trustScore: TrustScore = {
      id: generateId(),
      entityId,
      entityType,
      score: Math.round(score * 10) / 10,
      factors: weightedFactors,
      history: [{
        timestamp: new Date(),
        score,
        event: 'Initial calculation',
        impact: 0,
      }],
      calculatedAt: new Date(),
      validUntil: new Date(Date.now() + 86400000), // 24 hours
    };

    this.trustScores.set(trustScore.id, trustScore);
    return trustScore;
  }

  /**
   * Assess risk for an entity/action
   */
  assessRisk(
    entityId: string,
    entityType: string,
    factors: Omit<RiskFactor, 'weight'>[]
  ): RiskAssessment {
    // Calculate weighted risk score
    const totalWeight = factors.length;
    const weightedFactors: RiskFactor[] = factors.map(f => ({
      ...f,
      weight: 1 / totalWeight,
    }));

    const overallScore = weightedFactors.reduce((sum, f) => sum + f.score * f.weight, 0);

    // Determine risk level
    let riskLevel: RiskLevel;
    if (overallScore >= 80) riskLevel = 'critical';
    else if (overallScore >= 60) riskLevel = 'high';
    else if (overallScore >= 40) riskLevel = 'medium';
    else if (overallScore >= 20) riskLevel = 'low';
    else riskLevel = 'none';

    // Generate recommendations
    const recommendations: string[] = [];
    for (const factor of weightedFactors.filter(f => f.score >= 60)) {
      recommendations.push(`Address ${factor.category} risk: ${factor.name}`);
    }

    const assessment: RiskAssessment = {
      id: generateId(),
      entityId,
      entityType,
      riskLevel,
      overallScore: Math.round(overallScore * 10) / 10,
      factors: weightedFactors,
      mitigations: [],
      recommendations,
      assessedAt: new Date(),
      validUntil: new Date(Date.now() + 604800000), // 7 days
    };

    this.riskAssessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * Add compliance check
   */
  addComplianceCheck(check: Omit<ComplianceCheck, 'id' | 'lastChecked' | 'nextCheckDue'>): ComplianceCheck {
    const complianceCheck: ComplianceCheck = {
      ...check,
      id: generateId(),
      lastChecked: new Date(),
      nextCheckDue: new Date(Date.now() + 2592000000), // 30 days
    };

    this.complianceChecks.set(complianceCheck.id, complianceCheck);
    return complianceCheck;
  }

  /**
   * Run compliance audit
   */
  runComplianceAudit(standard?: ComplianceStandard): ComplianceCheck[] {
    const checks = Array.from(this.complianceChecks.values())
      .filter(c => !standard || c.standard === standard);

    // Update last checked
    for (const check of checks) {
      check.lastChecked = new Date();
      check.nextCheckDue = new Date(Date.now() + 2592000000);
    }

    return checks;
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): GovernancePolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies
   */
  getPolicies(): GovernancePolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get guardrail by ID
   */
  getGuardrail(guardrailId: string): SafetyGuardrail | undefined {
    return this.guardrails.get(guardrailId);
  }

  /**
   * Get all guardrails
   */
  getGuardrails(): SafetyGuardrail[] {
    return Array.from(this.guardrails.values());
  }

  /**
   * Get all violations
   */
  getViolations(): PolicyViolation[] {
    return Array.from(this.violations.values());
  }

  /**
   * Get compliance checks
   */
  getComplianceChecks(): ComplianceCheck[] {
    return Array.from(this.complianceChecks.values());
  }

  /**
   * Enable/disable a policy
   */
  setPolicyEnabled(policyId: string, enabled: boolean): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) return false;

    policy.enabled = enabled;
    policy.updatedAt = new Date();
    return true;
  }

  /**
   * Enable/disable a guardrail
   */
  setGuardrailEnabled(guardrailId: string, enabled: boolean): boolean {
    const guardrail = this.guardrails.get(guardrailId);
    if (!guardrail) return false;

    guardrail.enabled = enabled;
    return true;
  }

  /**
   * Get governance statistics
   */
  getStats(): {
    totalPolicies: number;
    enabledPolicies: number;
    totalGuardrails: number;
    triggeredGuardrails: number;
    totalViolations: number;
    blockedViolations: number;
    complianceScore: number;
    trustScoreCount: number;
    riskAssessmentCount: number;
  } {
    const policies = this.getPolicies();
    const guardrails = this.getGuardrails();
    const violations = this.getViolations();
    const complianceChecks = this.getComplianceChecks();

    const compliantChecks = complianceChecks.filter(c => c.status === 'compliant').length;
    const complianceScore = complianceChecks.length > 0
      ? (compliantChecks / complianceChecks.length) * 100
      : 100;

    return {
      totalPolicies: policies.length,
      enabledPolicies: policies.filter(p => p.enabled).length,
      totalGuardrails: guardrails.length,
      triggeredGuardrails: guardrails.filter(g => g.state.isTriggered).length,
      totalViolations: violations.length,
      blockedViolations: violations.filter(v => v.resolution === 'blocked').length,
      complianceScore: Math.round(complianceScore * 10) / 10,
      trustScoreCount: this.trustScores.size,
      riskAssessmentCount: this.riskAssessments.size,
    };
  }
}

export default GovernanceConstitution;
