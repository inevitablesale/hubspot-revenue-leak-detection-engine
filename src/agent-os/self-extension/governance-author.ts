/**
 * Governance Author Module
 * Enables AgentOS to generate, validate, and deploy governance policies
 * for autonomous operation with safety guardrails
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Governance Author Types
// ============================================================

export type PolicyType = 'approval' | 'limit' | 'access' | 'audit' | 'safety' | 'compliance';
export type PolicyStatus = 'draft' | 'review' | 'active' | 'suspended' | 'deprecated';
export type PolicyScope = 'global' | 'portal' | 'user' | 'agent' | 'action';

export interface AuthoredPolicy {
  id: string;
  name: string;
  description: string;
  type: PolicyType;
  scope: PolicyScope;
  status: PolicyStatus;
  version: number;
  rules: PolicyRule[];
  exceptions: PolicyException[];
  enforcement: EnforcementConfig;
  metadata: PolicyMetadata;
  audit: PolicyAudit;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  condition: PolicyCondition;
  action: PolicyAction;
  priority: number;
  enabled: boolean;
}

export interface PolicyCondition {
  type: 'threshold' | 'pattern' | 'role' | 'time' | 'context' | 'composite';
  operator: 'and' | 'or' | 'not';
  criteria: ConditionCriterion[];
}

export interface ConditionCriterion {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'matches';
  value: unknown;
}

export interface PolicyAction {
  type: 'allow' | 'deny' | 'require_approval' | 'log' | 'alert' | 'escalate' | 'quarantine';
  config: Record<string, unknown>;
  message?: string;
}

export interface PolicyException {
  id: string;
  name: string;
  reason: string;
  conditions: PolicyCondition;
  grantedBy: string;
  validFrom: Date;
  validUntil?: Date;
  usageCount: number;
  maxUsage?: number;
}

export interface EnforcementConfig {
  mode: 'enforce' | 'audit' | 'warn';
  strictness: 'strict' | 'moderate' | 'lenient';
  fallbackAction: PolicyAction;
  cacheResults: boolean;
  cacheTtlMs: number;
}

export interface PolicyMetadata {
  author: 'agent' | 'user' | 'system';
  purpose: string;
  category: string;
  tags: string[];
  complianceFrameworks: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reviewFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

export interface PolicyAudit {
  evaluations: number;
  violations: number;
  exceptions: number;
  approvals: number;
  denials: number;
  lastEvaluatedAt?: Date;
  evaluationHistory: PolicyEvaluation[];
}

export interface PolicyEvaluation {
  id: string;
  policyId: string;
  ruleId?: string;
  timestamp: Date;
  actor: string;
  action: string;
  context: Record<string, unknown>;
  result: 'allowed' | 'denied' | 'pending_approval';
  reason?: string;
}

export interface GovernanceFramework {
  id: string;
  name: string;
  description: string;
  version: string;
  policies: string[];
  requirements: FrameworkRequirement[];
  complianceScore: number;
  lastAssessedAt?: Date;
}

export interface FrameworkRequirement {
  id: string;
  name: string;
  description: string;
  category: string;
  satisfiedBy: string[];
  status: 'met' | 'partial' | 'not_met';
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  type: PolicyType;
  defaultRules: PolicyRule[];
  placeholders: TemplatePlaceholder[];
  complianceFrameworks: string[];
}

export interface TemplatePlaceholder {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  defaultValue?: unknown;
}

export interface PolicySuggestion {
  id: string;
  basedOn: 'incident' | 'pattern' | 'compliance' | 'best_practice';
  suggestedPolicy: Partial<AuthoredPolicy>;
  rationale: string;
  confidence: number;
  evidence: string[];
  createdAt: Date;
}

// ============================================================
// Governance Author Implementation
// ============================================================

export class GovernanceAuthor {
  private policies: Map<string, AuthoredPolicy> = new Map();
  private templates: Map<string, PolicyTemplate> = new Map();
  private frameworks: Map<string, GovernanceFramework> = new Map();
  private suggestions: Map<string, PolicySuggestion> = new Map();
  private evaluationCache: Map<string, { result: PolicyEvaluation; expiresAt: Date }> = new Map();

  constructor() {
    this.initializeTemplates();
    this.initializeFrameworks();
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize policy templates
   */
  private initializeTemplates(): void {
    // High-value approval template
    this.templates.set('high-value-approval', {
      id: 'high-value-approval',
      name: 'High Value Action Approval',
      description: 'Requires approval for high-value operations',
      type: 'approval',
      defaultRules: [
        {
          id: 'hvr-1',
          name: 'High Value Threshold',
          description: 'Require approval for actions above threshold',
          condition: {
            type: 'threshold',
            operator: 'and',
            criteria: [
              { field: 'action.value', operator: 'gte', value: '{{threshold}}' },
            ],
          },
          action: {
            type: 'require_approval',
            config: { approvers: ['{{approverRole}}'], timeout: 86400000 },
            message: 'This action requires approval due to high value',
          },
          priority: 1,
          enabled: true,
        },
      ],
      placeholders: [
        { name: 'threshold', description: 'Value threshold requiring approval', type: 'number', required: true, defaultValue: 10000 },
        { name: 'approverRole', description: 'Role that can approve', type: 'string', required: true, defaultValue: 'manager' },
      ],
      complianceFrameworks: ['SOC2', 'SOX'],
    });

    // Rate limiting template
    this.templates.set('rate-limiting', {
      id: 'rate-limiting',
      name: 'Rate Limiting Policy',
      description: 'Limits the rate of actions per time period',
      type: 'limit',
      defaultRules: [
        {
          id: 'rl-1',
          name: 'API Rate Limit',
          description: 'Limit API calls per minute',
          condition: {
            type: 'threshold',
            operator: 'and',
            criteria: [
              { field: 'action.type', operator: 'eq', value: 'api_call' },
              { field: 'counter.minute', operator: 'gte', value: '{{maxPerMinute}}' },
            ],
          },
          action: {
            type: 'deny',
            config: { retryAfter: 60 },
            message: 'Rate limit exceeded. Please wait before retrying.',
          },
          priority: 1,
          enabled: true,
        },
      ],
      placeholders: [
        { name: 'maxPerMinute', description: 'Maximum calls per minute', type: 'number', required: true, defaultValue: 100 },
      ],
      complianceFrameworks: [],
    });

    // Access control template
    this.templates.set('access-control', {
      id: 'access-control',
      name: 'Role-Based Access Control',
      description: 'Controls access based on user roles',
      type: 'access',
      defaultRules: [
        {
          id: 'ac-1',
          name: 'Admin Access',
          description: 'Allow admins full access',
          condition: {
            type: 'role',
            operator: 'and',
            criteria: [
              { field: 'user.role', operator: 'in', value: '{{adminRoles}}' },
            ],
          },
          action: {
            type: 'allow',
            config: {},
          },
          priority: 1,
          enabled: true,
        },
        {
          id: 'ac-2',
          name: 'Default Deny',
          description: 'Deny access by default',
          condition: {
            type: 'pattern',
            operator: 'and',
            criteria: [
              { field: 'user.role', operator: 'not_in', value: '{{adminRoles}}' },
            ],
          },
          action: {
            type: 'deny',
            config: {},
            message: 'Access denied. Insufficient permissions.',
          },
          priority: 100,
          enabled: true,
        },
      ],
      placeholders: [
        { name: 'adminRoles', description: 'Roles with admin access', type: 'array', required: true, defaultValue: ['admin', 'super_admin'] },
      ],
      complianceFrameworks: ['SOC2', 'GDPR'],
    });

    // Audit logging template
    this.templates.set('audit-logging', {
      id: 'audit-logging',
      name: 'Comprehensive Audit Logging',
      description: 'Logs all sensitive operations for audit trail',
      type: 'audit',
      defaultRules: [
        {
          id: 'al-1',
          name: 'Log All Changes',
          description: 'Log all data modifications',
          condition: {
            type: 'pattern',
            operator: 'or',
            criteria: [
              { field: 'action.type', operator: 'in', value: ['create', 'update', 'delete'] },
            ],
          },
          action: {
            type: 'log',
            config: { logLevel: 'info', includeContext: true },
          },
          priority: 1,
          enabled: true,
        },
        {
          id: 'al-2',
          name: 'Log Security Events',
          description: 'Log all security-related events',
          condition: {
            type: 'pattern',
            operator: 'or',
            criteria: [
              { field: 'action.category', operator: 'eq', value: 'security' },
              { field: 'action.type', operator: 'in', value: ['login', 'logout', 'permission_change'] },
            ],
          },
          action: {
            type: 'log',
            config: { logLevel: 'warn', includeContext: true, alertOnFailure: true },
          },
          priority: 0,
          enabled: true,
        },
      ],
      placeholders: [],
      complianceFrameworks: ['SOC2', 'SOX', 'HIPAA', 'GDPR'],
    });
  }

  /**
   * Initialize compliance frameworks
   */
  private initializeFrameworks(): void {
    // SOC2 Framework
    this.frameworks.set('SOC2', {
      id: 'SOC2',
      name: 'SOC 2 Type II',
      description: 'Service Organization Control 2 compliance framework',
      version: '2017',
      policies: [],
      requirements: [
        { id: 'cc1', name: 'Control Environment', description: 'Management philosophy and operating style', category: 'Common Criteria', satisfiedBy: [], status: 'not_met' },
        { id: 'cc2', name: 'Communication and Information', description: 'Quality information for control', category: 'Common Criteria', satisfiedBy: [], status: 'not_met' },
        { id: 'cc3', name: 'Risk Assessment', description: 'Risk identification and analysis', category: 'Common Criteria', satisfiedBy: [], status: 'not_met' },
        { id: 'cc4', name: 'Monitoring Activities', description: 'Control monitoring and evaluation', category: 'Common Criteria', satisfiedBy: [], status: 'not_met' },
        { id: 'cc5', name: 'Control Activities', description: 'Security policies and procedures', category: 'Common Criteria', satisfiedBy: [], status: 'not_met' },
        { id: 'cc6', name: 'Logical and Physical Access', description: 'Access control mechanisms', category: 'Common Criteria', satisfiedBy: [], status: 'not_met' },
        { id: 'cc7', name: 'System Operations', description: 'System operational effectiveness', category: 'Common Criteria', satisfiedBy: [], status: 'not_met' },
        { id: 'cc8', name: 'Change Management', description: 'System change control', category: 'Common Criteria', satisfiedBy: [], status: 'not_met' },
        { id: 'cc9', name: 'Risk Mitigation', description: 'Risk mitigation through design', category: 'Common Criteria', satisfiedBy: [], status: 'not_met' },
      ],
      complianceScore: 0,
    });

    // GDPR Framework
    this.frameworks.set('GDPR', {
      id: 'GDPR',
      name: 'GDPR',
      description: 'General Data Protection Regulation',
      version: '2018',
      policies: [],
      requirements: [
        { id: 'gdpr1', name: 'Lawful Processing', description: 'Legal basis for processing data', category: 'Data Processing', satisfiedBy: [], status: 'not_met' },
        { id: 'gdpr2', name: 'Purpose Limitation', description: 'Data used only for specified purposes', category: 'Data Processing', satisfiedBy: [], status: 'not_met' },
        { id: 'gdpr3', name: 'Data Minimization', description: 'Collect only necessary data', category: 'Data Processing', satisfiedBy: [], status: 'not_met' },
        { id: 'gdpr4', name: 'Accuracy', description: 'Keep data accurate and up to date', category: 'Data Quality', satisfiedBy: [], status: 'not_met' },
        { id: 'gdpr5', name: 'Storage Limitation', description: 'Retain data only as needed', category: 'Data Retention', satisfiedBy: [], status: 'not_met' },
        { id: 'gdpr6', name: 'Security', description: 'Appropriate security measures', category: 'Security', satisfiedBy: [], status: 'not_met' },
        { id: 'gdpr7', name: 'Data Subject Rights', description: 'Enable data subject rights', category: 'Rights', satisfiedBy: [], status: 'not_met' },
      ],
      complianceScore: 0,
    });
  }

  /**
   * Initialize default policies
   */
  private initializeDefaultPolicies(): void {
    // Agent autonomy limits
    this.createPolicy({
      name: 'Agent Autonomy Limits',
      description: 'Limits autonomous agent actions to prevent uncontrolled behavior',
      type: 'safety',
      scope: 'agent',
      rules: [
        {
          id: generateId(),
          name: 'Max Auto-Actions',
          description: 'Limit autonomous actions per hour',
          condition: {
            type: 'threshold',
            operator: 'and',
            criteria: [
              { field: 'agent.autoActionsPerHour', operator: 'gte', value: 100 },
            ],
          },
          action: {
            type: 'deny',
            config: { pauseAgent: true },
            message: 'Agent autonomy limit reached. Manual review required.',
          },
          priority: 1,
          enabled: true,
        },
        {
          id: generateId(),
          name: 'Critical Action Approval',
          description: 'Require approval for critical autonomous actions',
          condition: {
            type: 'context',
            operator: 'and',
            criteria: [
              { field: 'action.criticality', operator: 'gte', value: 8 },
              { field: 'action.source', operator: 'eq', value: 'autonomous' },
            ],
          },
          action: {
            type: 'require_approval',
            config: { approvers: ['admin'], timeout: 3600000 },
            message: 'Critical autonomous action requires human approval',
          },
          priority: 0,
          enabled: true,
        },
      ],
      metadata: {
        category: 'safety',
        riskLevel: 'high',
        complianceFrameworks: [],
      },
    });

    // Revenue impact controls
    this.createPolicy({
      name: 'Revenue Impact Controls',
      description: 'Controls actions that impact revenue',
      type: 'approval',
      scope: 'action',
      rules: [
        {
          id: generateId(),
          name: 'High Revenue Impact',
          description: 'Require approval for high revenue impact actions',
          condition: {
            type: 'threshold',
            operator: 'and',
            criteria: [
              { field: 'action.revenueImpact', operator: 'gte', value: 50000 },
            ],
          },
          action: {
            type: 'require_approval',
            config: { approvers: ['finance', 'exec'], minApprovals: 2, timeout: 172800000 },
            message: 'This action has significant revenue impact and requires approval',
          },
          priority: 1,
          enabled: true,
        },
        {
          id: generateId(),
          name: 'Medium Revenue Impact',
          description: 'Alert on medium revenue impact actions',
          condition: {
            type: 'threshold',
            operator: 'and',
            criteria: [
              { field: 'action.revenueImpact', operator: 'gte', value: 10000 },
              { field: 'action.revenueImpact', operator: 'lt', value: 50000 },
            ],
          },
          action: {
            type: 'alert',
            config: { channel: 'finance', severity: 'warning' },
          },
          priority: 2,
          enabled: true,
        },
      ],
      metadata: {
        category: 'financial',
        riskLevel: 'high',
        complianceFrameworks: ['SOX'],
      },
    });

    // Data access controls
    this.createPolicy({
      name: 'Sensitive Data Access',
      description: 'Controls access to sensitive data',
      type: 'access',
      scope: 'global',
      rules: [
        {
          id: generateId(),
          name: 'PII Access Control',
          description: 'Restrict access to PII data',
          condition: {
            type: 'composite',
            operator: 'and',
            criteria: [
              { field: 'data.type', operator: 'in', value: ['pii', 'financial', 'health'] },
              { field: 'user.permissions', operator: 'not_in', value: ['pii_access'] },
            ],
          },
          action: {
            type: 'deny',
            config: {},
            message: 'Access to sensitive data denied. Request appropriate permissions.',
          },
          priority: 0,
          enabled: true,
        },
        {
          id: generateId(),
          name: 'Audit Data Access',
          description: 'Log all sensitive data access',
          condition: {
            type: 'pattern',
            operator: 'or',
            criteria: [
              { field: 'data.type', operator: 'in', value: ['pii', 'financial', 'health'] },
            ],
          },
          action: {
            type: 'log',
            config: { logLevel: 'info', includeActor: true, includeContext: true },
          },
          priority: 10,
          enabled: true,
        },
      ],
      metadata: {
        category: 'data_protection',
        riskLevel: 'critical',
        complianceFrameworks: ['GDPR', 'SOC2', 'HIPAA'],
      },
    });
  }

  /**
   * Create a new policy
   */
  createPolicy(params: {
    name: string;
    description: string;
    type: PolicyType;
    scope?: PolicyScope;
    rules: PolicyRule[];
    exceptions?: PolicyException[];
    enforcement?: Partial<EnforcementConfig>;
    metadata?: Partial<PolicyMetadata>;
  }): AuthoredPolicy {
    const policy: AuthoredPolicy = {
      id: generateId(),
      name: params.name,
      description: params.description,
      type: params.type,
      scope: params.scope || 'global',
      status: 'draft',
      version: 1,
      rules: params.rules,
      exceptions: params.exceptions || [],
      enforcement: {
        mode: 'audit',
        strictness: 'moderate',
        fallbackAction: { type: 'deny', config: {} },
        cacheResults: true,
        cacheTtlMs: 60000,
        ...params.enforcement,
      },
      metadata: {
        author: 'agent',
        purpose: params.description,
        category: 'general',
        tags: [],
        complianceFrameworks: [],
        riskLevel: 'medium',
        reviewFrequency: 'monthly',
        ...params.metadata,
      },
      audit: {
        evaluations: 0,
        violations: 0,
        exceptions: 0,
        approvals: 0,
        denials: 0,
        evaluationHistory: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(policy.id, policy);

    // Update framework compliance
    for (const framework of params.metadata?.complianceFrameworks || []) {
      this.updateFrameworkCompliance(framework, policy.id);
    }

    return policy;
  }

  /**
   * Create policy from template
   */
  createFromTemplate(templateId: string, params: Record<string, unknown>): AuthoredPolicy {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    // Clone and fill template rules
    const rules = JSON.parse(JSON.stringify(template.defaultRules)) as PolicyRule[];
    
    // Apply placeholder values
    for (const rule of rules) {
      this.applyPlaceholders(rule, params, template.placeholders);
    }

    return this.createPolicy({
      name: `${template.name} - ${new Date().toISOString().split('T')[0]}`,
      description: template.description,
      type: template.type,
      rules,
      metadata: {
        complianceFrameworks: template.complianceFrameworks,
      },
    });
  }

  /**
   * Generate policy from incidents
   */
  generatePolicyFromIncidents(incidents: Array<{
    type: string;
    severity: string;
    context: Record<string, unknown>;
    resolution?: string;
  }>): PolicySuggestion {
    // Analyze incidents to find patterns
    const patterns = this.analyzeIncidentPatterns(incidents);
    
    // Generate suggested policy
    const rules: PolicyRule[] = patterns.map((pattern, index) => ({
      id: generateId(),
      name: `Auto-Rule ${index + 1}: ${pattern.description}`,
      description: `Generated from ${pattern.occurrences} similar incidents`,
      condition: pattern.condition,
      action: this.suggestAction(pattern),
      priority: index + 1,
      enabled: true,
    }));

    const suggestion: PolicySuggestion = {
      id: generateId(),
      basedOn: 'incident',
      suggestedPolicy: {
        name: `Incident Response Policy - ${incidents.length} incidents analyzed`,
        description: 'Auto-generated policy based on incident analysis',
        type: 'safety',
        rules,
      },
      rationale: `Generated from analysis of ${incidents.length} incidents`,
      confidence: Math.min(0.9, 0.5 + incidents.length * 0.05),
      evidence: patterns.map(p => `Pattern: ${p.description} (${p.occurrences} occurrences)`),
      createdAt: new Date(),
    };

    this.suggestions.set(suggestion.id, suggestion);
    return suggestion;
  }

  /**
   * Evaluate an action against policies
   */
  evaluateAction(
    action: string,
    context: Record<string, unknown>,
    actor: string
  ): PolicyEvaluation {
    // Check cache first
    const cacheKey = `${action}:${JSON.stringify(context)}:${actor}`;
    const cached = this.evaluationCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.result;
    }

    const evaluation: PolicyEvaluation = {
      id: generateId(),
      policyId: '',
      timestamp: new Date(),
      actor,
      action,
      context,
      result: 'allowed',
    };

    // Get applicable policies
    const applicablePolicies = this.getApplicablePolicies(action, context);

    for (const policy of applicablePolicies) {
      // Check exceptions first
      const exception = this.checkExceptions(policy, action, context, actor);
      if (exception) {
        policy.audit.exceptions++;
        continue;
      }

      // Evaluate rules in priority order
      const sortedRules = [...policy.rules].sort((a, b) => a.priority - b.priority);
      
      for (const rule of sortedRules) {
        if (!rule.enabled) continue;

        const matches = this.evaluateCondition(rule.condition, { action, ...context, actor });
        
        if (matches) {
          evaluation.policyId = policy.id;
          evaluation.ruleId = rule.id;
          
          switch (rule.action.type) {
            case 'deny':
              evaluation.result = 'denied';
              evaluation.reason = rule.action.message || 'Access denied by policy';
              policy.audit.denials++;
              break;
            case 'require_approval':
              evaluation.result = 'pending_approval';
              evaluation.reason = rule.action.message || 'Approval required';
              policy.audit.approvals++;
              break;
            case 'alert':
            case 'log':
              // Continue evaluation but record
              break;
            case 'allow':
              evaluation.result = 'allowed';
              break;
          }

          policy.audit.evaluations++;
          policy.audit.lastEvaluatedAt = new Date();

          // For deny or require_approval, stop evaluation
          if (evaluation.result !== 'allowed') {
            policy.audit.violations++;
            break;
          }
        }
      }

      // Store in audit history
      policy.audit.evaluationHistory.push(evaluation);
      if (policy.audit.evaluationHistory.length > 1000) {
        policy.audit.evaluationHistory.shift();
      }

      // If denied, stop checking other policies
      if (evaluation.result === 'denied') break;
    }

    // Cache result
    const activePolicies = applicablePolicies.filter(p => p.status === 'active');
    if (activePolicies.length > 0) {
      const cacheTtl = Math.min(...activePolicies.map(p => p.enforcement.cacheTtlMs));
      this.evaluationCache.set(cacheKey, {
        result: evaluation,
        expiresAt: new Date(Date.now() + cacheTtl),
      });
    }

    return evaluation;
  }

  /**
   * Activate a policy
   */
  activatePolicy(policyId: string): AuthoredPolicy {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy '${policyId}' not found`);
    }

    policy.status = 'active';
    policy.enforcement.mode = 'enforce';
    policy.activatedAt = new Date();
    policy.updatedAt = new Date();

    return policy;
  }

  /**
   * Suspend a policy
   */
  suspendPolicy(policyId: string, reason: string): AuthoredPolicy {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy '${policyId}' not found`);
    }

    policy.status = 'suspended';
    policy.updatedAt = new Date();

    return policy;
  }

  /**
   * Add exception to policy
   */
  addException(policyId: string, exception: Omit<PolicyException, 'id' | 'usageCount'>): PolicyException {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy '${policyId}' not found`);
    }

    const policyException: PolicyException = {
      ...exception,
      id: generateId(),
      usageCount: 0,
    };

    policy.exceptions.push(policyException);
    policy.updatedAt = new Date();

    return policyException;
  }

  /**
   * Assess compliance against a framework
   */
  assessCompliance(frameworkId: string): GovernanceFramework {
    const framework = this.frameworks.get(frameworkId);
    if (!framework) {
      throw new Error(`Framework '${frameworkId}' not found`);
    }

    // Check which requirements are satisfied by active policies
    for (const requirement of framework.requirements) {
      requirement.satisfiedBy = [];
      
      for (const [policyId, policy] of this.policies) {
        if (policy.status !== 'active') continue;
        if (!policy.metadata.complianceFrameworks.includes(frameworkId)) continue;

        // Check if policy satisfies requirement
        if (this.policySatisfiesRequirement(policy, requirement)) {
          requirement.satisfiedBy.push(policyId);
        }
      }

      requirement.status = requirement.satisfiedBy.length === 0 ? 'not_met' :
                          requirement.satisfiedBy.length < 2 ? 'partial' : 'met';
    }

    // Calculate compliance score
    const metRequirements = framework.requirements.filter(r => r.status === 'met').length;
    const partialRequirements = framework.requirements.filter(r => r.status === 'partial').length;
    framework.complianceScore = (metRequirements + partialRequirements * 0.5) / framework.requirements.length;
    framework.lastAssessedAt = new Date();

    return framework;
  }

  /**
   * Apply a suggestion to create a policy
   */
  applySuggestion(suggestionId: string): AuthoredPolicy {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) {
      throw new Error(`Suggestion '${suggestionId}' not found`);
    }

    if (!suggestion.suggestedPolicy.name || !suggestion.suggestedPolicy.rules) {
      throw new Error('Suggestion does not have complete policy definition');
    }

    return this.createPolicy({
      name: suggestion.suggestedPolicy.name,
      description: suggestion.suggestedPolicy.description || '',
      type: suggestion.suggestedPolicy.type || 'safety',
      rules: suggestion.suggestedPolicy.rules,
      metadata: {
        ...suggestion.suggestedPolicy.metadata,
        author: 'agent',
      },
    });
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): AuthoredPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies
   */
  getPolicies(): AuthoredPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policies by type
   */
  getPoliciesByType(type: PolicyType): AuthoredPolicy[] {
    return this.getPolicies().filter(p => p.type === type);
  }

  /**
   * Get policies by status
   */
  getPoliciesByStatus(status: PolicyStatus): AuthoredPolicy[] {
    return this.getPolicies().filter(p => p.status === status);
  }

  /**
   * Get templates
   */
  getTemplates(): PolicyTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get frameworks
   */
  getFrameworks(): GovernanceFramework[] {
    return Array.from(this.frameworks.values());
  }

  /**
   * Get suggestions
   */
  getSuggestions(): PolicySuggestion[] {
    return Array.from(this.suggestions.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalPolicies: number;
    activePolicies: number;
    totalEvaluations: number;
    totalViolations: number;
    complianceScore: number;
    templatesAvailable: number;
    pendingSuggestions: number;
  } {
    const policies = this.getPolicies();
    const activePolicies = policies.filter(p => p.status === 'active');

    const totalEvaluations = policies.reduce((sum, p) => sum + p.audit.evaluations, 0);
    const totalViolations = policies.reduce((sum, p) => sum + p.audit.violations, 0);

    // Calculate average compliance across all frameworks
    const frameworks = this.getFrameworks();
    const avgCompliance = frameworks.length > 0
      ? frameworks.reduce((sum, f) => sum + f.complianceScore, 0) / frameworks.length
      : 0;

    return {
      totalPolicies: policies.length,
      activePolicies: activePolicies.length,
      totalEvaluations,
      totalViolations,
      complianceScore: avgCompliance,
      templatesAvailable: this.templates.size,
      pendingSuggestions: this.suggestions.size,
    };
  }

  // Private helper methods

  private applyPlaceholders(
    rule: PolicyRule,
    params: Record<string, unknown>,
    placeholders: TemplatePlaceholder[]
  ): void {
    const ruleStr = JSON.stringify(rule);
    let filledStr = ruleStr;

    for (const placeholder of placeholders) {
      const value = params[placeholder.name] ?? placeholder.defaultValue;
      const pattern = new RegExp(`"{{${placeholder.name}}}"`, 'g');
      filledStr = filledStr.replace(pattern, JSON.stringify(value));
    }

    const filledRule = JSON.parse(filledStr) as PolicyRule;
    Object.assign(rule, filledRule);
  }

  private getApplicablePolicies(action: string, context: Record<string, unknown>): AuthoredPolicy[] {
    return this.getPolicies().filter(policy => {
      if (policy.status !== 'active' && policy.enforcement.mode !== 'audit') return false;
      
      // Check scope
      switch (policy.scope) {
        case 'agent':
          return context.source === 'agent' || context.actor?.toString().includes('agent');
        case 'action':
          return true; // All actions checked
        case 'portal':
          return !!context.portalId;
        case 'user':
          return !!context.userId;
        default:
          return true;
      }
    });
  }

  private checkExceptions(
    policy: AuthoredPolicy,
    action: string,
    context: Record<string, unknown>,
    actor: string
  ): PolicyException | null {
    const now = new Date();

    for (const exception of policy.exceptions) {
      // Check validity period
      if (exception.validFrom > now) continue;
      if (exception.validUntil && exception.validUntil < now) continue;
      
      // Check usage limit
      if (exception.maxUsage && exception.usageCount >= exception.maxUsage) continue;

      // Check conditions
      if (this.evaluateCondition(exception.conditions, { action, ...context, actor })) {
        exception.usageCount++;
        return exception;
      }
    }

    return null;
  }

  private evaluateCondition(condition: PolicyCondition, context: Record<string, unknown>): boolean {
    const results: boolean[] = [];

    for (const criterion of condition.criteria) {
      const value = this.getNestedValue(context, criterion.field);
      const matches = this.evaluateCriterion(criterion, value);
      results.push(matches);
    }

    switch (condition.operator) {
      case 'and':
        return results.every(r => r);
      case 'or':
        return results.some(r => r);
      case 'not':
        return !results[0];
      default:
        return false;
    }
  }

  private evaluateCriterion(criterion: ConditionCriterion, value: unknown): boolean {
    const target = criterion.value;

    switch (criterion.operator) {
      case 'eq':
        return value === target;
      case 'ne':
        return value !== target;
      case 'gt':
        return typeof value === 'number' && typeof target === 'number' && value > target;
      case 'gte':
        return typeof value === 'number' && typeof target === 'number' && value >= target;
      case 'lt':
        return typeof value === 'number' && typeof target === 'number' && value < target;
      case 'lte':
        return typeof value === 'number' && typeof target === 'number' && value <= target;
      case 'in':
        return Array.isArray(target) && target.includes(value);
      case 'not_in':
        return Array.isArray(target) && !target.includes(value);
      case 'matches':
        return typeof value === 'string' && typeof target === 'string' && new RegExp(target).test(value);
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private updateFrameworkCompliance(frameworkId: string, policyId: string): void {
    const framework = this.frameworks.get(frameworkId);
    if (framework && !framework.policies.includes(policyId)) {
      framework.policies.push(policyId);
    }
  }

  private policySatisfiesRequirement(policy: AuthoredPolicy, requirement: FrameworkRequirement): boolean {
    // Simple heuristic - check if policy category matches requirement category
    const categoryMapping: Record<string, string[]> = {
      'access': ['Logical and Physical Access', 'Access Control', 'Data Subject Rights'],
      'audit': ['Control Environment', 'Monitoring Activities', 'Audit Logging'],
      'approval': ['Control Activities', 'Risk Mitigation'],
      'safety': ['System Operations', 'Security'],
      'compliance': ['Risk Assessment', 'Lawful Processing'],
      'limit': ['Control Activities'],
    };

    const matchingCategories = categoryMapping[policy.type] || [];
    return matchingCategories.some(cat => 
      requirement.name.includes(cat) || requirement.category.includes(cat)
    );
  }

  private analyzeIncidentPatterns(incidents: Array<{
    type: string;
    severity: string;
    context: Record<string, unknown>;
    resolution?: string;
  }>): Array<{
    description: string;
    occurrences: number;
    condition: PolicyCondition;
  }> {
    const patterns: Map<string, { count: number; contexts: Record<string, unknown>[] }> = new Map();

    for (const incident of incidents) {
      const key = `${incident.type}:${incident.severity}`;
      const existing = patterns.get(key) || { count: 0, contexts: [] };
      existing.count++;
      existing.contexts.push(incident.context);
      patterns.set(key, existing);
    }

    return Array.from(patterns.entries())
      .filter(([_, info]) => info.count >= 2)
      .map(([key, info]) => {
        const [type, severity] = key.split(':');
        return {
          description: `${type} incidents with ${severity} severity`,
          occurrences: info.count,
          condition: {
            type: 'pattern' as const,
            operator: 'and' as const,
            criteria: [
              { field: 'incident.type', operator: 'eq' as const, value: type },
            ],
          },
        };
      });
  }

  private suggestAction(pattern: { occurrences: number }): PolicyAction {
    if (pattern.occurrences >= 5) {
      return { type: 'deny', config: {}, message: 'Action blocked due to recurring incidents' };
    }
    if (pattern.occurrences >= 3) {
      return { type: 'require_approval', config: { approvers: ['admin'] }, message: 'Approval required due to incident history' };
    }
    return { type: 'alert', config: { severity: 'warning' } };
  }
}

export default GovernanceAuthor;
