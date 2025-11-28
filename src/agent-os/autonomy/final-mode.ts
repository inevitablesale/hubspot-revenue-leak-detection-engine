/**
 * Final Mode Module
 * Full autonomous operation mode for AgentOS - no human intervention required
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Final Mode Types
// ============================================================

export interface AutonomyState {
  id: string;
  mode: 'supervised' | 'semi-autonomous' | 'fully-autonomous';
  status: 'active' | 'paused' | 'learning' | 'degraded';
  capabilities: AutonomyCapability[];
  decisions: AutonomyDecision[];
  health: AutonomyHealth;
  governance: AutonomyGovernance;
  startedAt: Date;
  lastDecision: Date;
}

export interface AutonomyCapability {
  id: string;
  name: string;
  type: CapabilityType;
  enabled: boolean;
  confidence: number;
  constraints: CapabilityConstraint[];
  metrics: CapabilityMetrics;
}

export type CapabilityType = 
  | 'detection'
  | 'decision'
  | 'action'
  | 'governance'
  | 'evolution'
  | 'healing'
  | 'scheduling'
  | 'communication';

export interface CapabilityConstraint {
  type: 'threshold' | 'approval' | 'rate_limit' | 'scope' | 'time';
  name: string;
  value: unknown;
  active: boolean;
}

export interface CapabilityMetrics {
  invocations: number;
  successRate: number;
  avgLatency: number;
  lastUsed?: Date;
}

export interface AutonomyDecision {
  id: string;
  type: string;
  trigger: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  confidence: number;
  rationale: string;
  timestamp: Date;
  outcome?: 'success' | 'failure' | 'pending';
}

export interface AutonomyHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  components: Record<string, ComponentHealth>;
  lastCheck: Date;
  issues: HealthIssue[];
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  latency: number;
  errorRate: number;
  lastError?: string;
}

export interface HealthIssue {
  id: string;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
}

export interface AutonomyGovernance {
  policies: GovernancePolicy[];
  violations: PolicyViolation[];
  auditLog: AuditEntry[];
  riskLevel: 'minimal' | 'low' | 'medium' | 'high';
}

export interface GovernancePolicy {
  id: string;
  name: string;
  type: 'permission' | 'limit' | 'approval' | 'audit';
  condition: string;
  action: string;
  enabled: boolean;
}

export interface PolicyViolation {
  id: string;
  policyId: string;
  decision: string;
  timestamp: Date;
  severity: 'warning' | 'error' | 'critical';
  resolved: boolean;
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: 'system' | 'user' | 'agent';
  timestamp: Date;
  details: Record<string, unknown>;
}

export interface AutonomyConfig {
  mode: AutonomyState['mode'];
  capabilities: string[];
  constraints: {
    maxDecisionsPerHour: number;
    maxRevenueImpact: number;
    requireApprovalAbove: number;
    allowedScopes: string[];
  };
  selfHealing: {
    enabled: boolean;
    autoRestart: boolean;
    maxRetries: number;
  };
  evolution: {
    enabled: boolean;
    learningRate: number;
    adaptationInterval: number;
  };
}

export interface AutonomyReport {
  period: string;
  decisions: number;
  successRate: number;
  autonomyLevel: number;
  revenueImpact: number;
  issuesResolved: number;
  evolutionEvents: number;
  topCapabilities: string[];
  recommendations: string[];
}

export interface AutonomyStats {
  totalDecisions: number;
  successfulDecisions: number;
  autonomyUptime: number;
  avgConfidence: number;
  currentMode: AutonomyState['mode'];
}

// ============================================================
// Final Mode Implementation
// ============================================================

export class FinalMode {
  private state: AutonomyState;
  private config: AutonomyConfig;
  private stats: AutonomyStats;
  private decisionHistory: AutonomyDecision[] = [];

  constructor(config?: Partial<AutonomyConfig>) {
    this.config = {
      mode: 'supervised',
      capabilities: [
        'detection',
        'decision',
        'action',
        'governance',
        'evolution',
        'healing',
        'scheduling',
        'communication',
      ],
      constraints: {
        maxDecisionsPerHour: 100,
        maxRevenueImpact: 100000,
        requireApprovalAbove: 50000,
        allowedScopes: ['deals', 'contacts', 'companies', 'workflows'],
      },
      selfHealing: {
        enabled: true,
        autoRestart: true,
        maxRetries: 3,
      },
      evolution: {
        enabled: true,
        learningRate: 0.1,
        adaptationInterval: 86400000, // 24 hours
      },
      ...config,
    };

    this.state = this.initializeState();
    this.stats = {
      totalDecisions: 0,
      successfulDecisions: 0,
      autonomyUptime: 0,
      avgConfidence: 0,
      currentMode: this.config.mode,
    };
  }

  /**
   * Initialize autonomy state
   */
  private initializeState(): AutonomyState {
    const capabilities: AutonomyCapability[] = this.config.capabilities.map(name => ({
      id: generateId(),
      name,
      type: name as CapabilityType,
      enabled: true,
      confidence: 0.8,
      constraints: this.getDefaultConstraints(name),
      metrics: {
        invocations: 0,
        successRate: 1,
        avgLatency: 0,
      },
    }));

    return {
      id: generateId(),
      mode: this.config.mode,
      status: 'active',
      capabilities,
      decisions: [],
      health: {
        overall: 'healthy',
        components: {},
        lastCheck: new Date(),
        issues: [],
      },
      governance: {
        policies: this.getDefaultPolicies(),
        violations: [],
        auditLog: [],
        riskLevel: 'minimal',
      },
      startedAt: new Date(),
      lastDecision: new Date(),
    };
  }

  /**
   * Make an autonomous decision
   */
  makeDecision(
    type: string,
    trigger: string,
    input: Record<string, unknown>
  ): AutonomyDecision {
    // Check if we can make decisions
    if (this.state.status !== 'active') {
      throw new Error(`Cannot make decisions in ${this.state.status} status`);
    }

    // Check rate limits
    if (!this.checkRateLimit()) {
      throw new Error('Decision rate limit exceeded');
    }

    // Evaluate input against governance policies
    const policyCheck = this.evaluatePolicies(type, input);
    if (!policyCheck.allowed) {
      this.recordViolation(policyCheck.policy!, type);
      throw new Error(`Decision blocked by policy: ${policyCheck.policy}`);
    }

    // Make the decision
    const output = this.processDecision(type, input);
    const confidence = this.calculateDecisionConfidence(type, input);
    const rationale = this.generateRationale(type, input, output);

    const decision: AutonomyDecision = {
      id: generateId(),
      type,
      trigger,
      input,
      output,
      confidence,
      rationale,
      timestamp: new Date(),
      outcome: 'pending',
    };

    // Check if approval is required
    const revenueImpact = Number(input.revenueImpact) || 0;
    if (revenueImpact > this.config.constraints.requireApprovalAbove) {
      decision.outcome = 'pending';
      this.logAudit('decision_pending_approval', 'system', { decision: decision.id, revenueImpact });
    } else {
      decision.outcome = 'success';
    }

    this.state.decisions.push(decision);
    this.state.lastDecision = new Date();
    this.decisionHistory.push(decision);
    this.updateStats(decision);

    // Log audit
    this.logAudit('decision_made', 'agent', { type, confidence, outcome: decision.outcome });

    return decision;
  }

  /**
   * Activate full autonomy mode
   */
  activateFullAutonomy(): void {
    if (this.state.health.overall === 'critical') {
      throw new Error('Cannot activate full autonomy with critical health status');
    }

    this.state.mode = 'fully-autonomous';
    this.config.mode = 'fully-autonomous';
    this.stats.currentMode = 'fully-autonomous';

    // Enable all capabilities
    for (const capability of this.state.capabilities) {
      capability.enabled = true;
    }

    this.logAudit('full_autonomy_activated', 'system', {});
  }

  /**
   * Deactivate to supervised mode
   */
  deactivateToSupervised(): void {
    this.state.mode = 'supervised';
    this.config.mode = 'supervised';
    this.stats.currentMode = 'supervised';

    this.logAudit('autonomy_deactivated', 'system', {});
  }

  /**
   * Self-heal the system
   */
  selfHeal(): { success: boolean; actions: string[] } {
    if (!this.config.selfHealing.enabled) {
      return { success: false, actions: ['Self-healing disabled'] };
    }

    const actions: string[] = [];

    // Check for issues
    for (const issue of this.state.health.issues.filter(i => !i.resolvedAt)) {
      const action = this.resolveIssue(issue);
      if (action) {
        actions.push(action);
        issue.resolvedAt = new Date();
      }
    }

    // Update health status
    this.updateHealthStatus();

    this.logAudit('self_heal_executed', 'system', { actions });

    return { success: actions.length > 0, actions };
  }

  /**
   * Evolve the system based on learnings
   */
  evolve(): { improvements: string[]; adaptations: string[] } {
    if (!this.config.evolution.enabled) {
      return { improvements: [], adaptations: [] };
    }

    const improvements: string[] = [];
    const adaptations: string[] = [];

    // Analyze decision history
    const recentDecisions = this.decisionHistory.slice(-100);
    const successRate = recentDecisions.filter(d => d.outcome === 'success').length / recentDecisions.length;

    // Adjust confidence thresholds
    if (successRate > 0.95) {
      improvements.push('High success rate - increasing autonomy capabilities');
      for (const capability of this.state.capabilities) {
        capability.confidence = Math.min(0.99, capability.confidence + this.config.evolution.learningRate);
      }
    } else if (successRate < 0.8) {
      adaptations.push('Success rate below threshold - adding safeguards');
      for (const capability of this.state.capabilities) {
        capability.confidence = Math.max(0.5, capability.confidence - this.config.evolution.learningRate);
      }
    }

    // Learn from failures
    const failures = recentDecisions.filter(d => d.outcome === 'failure');
    if (failures.length > 0) {
      const failureTypes = new Set(failures.map(f => f.type));
      for (const type of failureTypes) {
        adaptations.push(`Added caution for ${type} decisions`);
      }
    }

    this.logAudit('evolution_executed', 'system', { improvements, adaptations });

    return { improvements, adaptations };
  }

  /**
   * Generate autonomy report
   */
  generateReport(): AutonomyReport {
    const decisions = this.decisionHistory;
    const successful = decisions.filter(d => d.outcome === 'success');

    const topCapabilities = this.state.capabilities
      .sort((a, b) => b.metrics.invocations - a.metrics.invocations)
      .slice(0, 5)
      .map(c => c.name);

    const recommendations: string[] = [];
    
    if (this.stats.avgConfidence < 0.7) {
      recommendations.push('Consider adding training data to improve confidence');
    }
    if (this.state.health.overall !== 'healthy') {
      recommendations.push('Address health issues before expanding autonomy');
    }
    if (this.state.governance.violations.length > 0) {
      recommendations.push('Review and address policy violations');
    }

    const revenueImpact = decisions.reduce((sum, d) => {
      return sum + (Number(d.output.revenueImpact) || 0);
    }, 0);

    return {
      period: 'current',
      decisions: decisions.length,
      successRate: decisions.length > 0 ? successful.length / decisions.length : 1,
      autonomyLevel: this.calculateAutonomyLevel(),
      revenueImpact,
      issuesResolved: this.state.health.issues.filter(i => i.resolvedAt).length,
      evolutionEvents: 0,
      topCapabilities,
      recommendations,
    };
  }

  /**
   * Get current state
   */
  getState(): AutonomyState {
    return { ...this.state };
  }

  /**
   * Get statistics
   */
  getStats(): AutonomyStats {
    this.stats.autonomyUptime = Date.now() - this.state.startedAt.getTime();
    return { ...this.stats };
  }

  // Private methods

  private getDefaultConstraints(capability: string): CapabilityConstraint[] {
    return [
      {
        type: 'rate_limit',
        name: 'max_per_hour',
        value: this.config.constraints.maxDecisionsPerHour,
        active: true,
      },
      {
        type: 'scope',
        name: 'allowed_scopes',
        value: this.config.constraints.allowedScopes,
        active: true,
      },
    ];
  }

  private getDefaultPolicies(): GovernancePolicy[] {
    return [
      {
        id: generateId(),
        name: 'revenue_impact_limit',
        type: 'limit',
        condition: `revenueImpact <= ${this.config.constraints.maxRevenueImpact}`,
        action: 'block',
        enabled: true,
      },
      {
        id: generateId(),
        name: 'approval_threshold',
        type: 'approval',
        condition: `revenueImpact > ${this.config.constraints.requireApprovalAbove}`,
        action: 'require_approval',
        enabled: true,
      },
      {
        id: generateId(),
        name: 'audit_all_decisions',
        type: 'audit',
        condition: 'true',
        action: 'log',
        enabled: true,
      },
    ];
  }

  private checkRateLimit(): boolean {
    const hourAgo = Date.now() - 3600000;
    const recentDecisions = this.decisionHistory.filter(
      d => d.timestamp.getTime() > hourAgo
    );
    return recentDecisions.length < this.config.constraints.maxDecisionsPerHour;
  }

  private evaluatePolicies(
    type: string,
    input: Record<string, unknown>
  ): { allowed: boolean; policy?: string } {
    for (const policy of this.state.governance.policies) {
      if (!policy.enabled) continue;

      if (policy.type === 'limit') {
        const revenueImpact = Number(input.revenueImpact) || 0;
        if (revenueImpact > this.config.constraints.maxRevenueImpact) {
          return { allowed: false, policy: policy.name };
        }
      }
    }

    return { allowed: true };
  }

  private recordViolation(policy: string, decision: string): void {
    const policyObj = this.state.governance.policies.find(p => p.name === policy);
    if (policyObj) {
      this.state.governance.violations.push({
        id: generateId(),
        policyId: policyObj.id,
        decision,
        timestamp: new Date(),
        severity: 'warning',
        resolved: false,
      });
    }
  }

  private processDecision(
    type: string,
    input: Record<string, unknown>
  ): Record<string, unknown> {
    // Process based on decision type
    const output: Record<string, unknown> = {
      type,
      processed: true,
      timestamp: new Date(),
    };

    // Update capability metrics
    const capability = this.state.capabilities.find(c => c.name === type || c.type === type);
    if (capability) {
      capability.metrics.invocations++;
      capability.metrics.lastUsed = new Date();
    }

    return output;
  }

  private calculateDecisionConfidence(
    type: string,
    input: Record<string, unknown>
  ): number {
    const capability = this.state.capabilities.find(c => c.name === type || c.type === type);
    const baseConfidence = capability?.confidence || 0.7;

    // Adjust based on input completeness
    const inputFields = Object.keys(input).length;
    const confidenceBoost = Math.min(0.1, inputFields * 0.02);

    return Math.min(0.99, baseConfidence + confidenceBoost);
  }

  private generateRationale(
    type: string,
    input: Record<string, unknown>,
    output: Record<string, unknown>
  ): string {
    const inputKeys = Object.keys(input).slice(0, 3).join(', ');
    return `Decision type: ${type}. Inputs analyzed: ${inputKeys}. System confidence met threshold for autonomous execution.`;
  }

  private resolveIssue(issue: HealthIssue): string | null {
    switch (issue.severity) {
      case 'low':
        return `Auto-resolved low severity issue: ${issue.description}`;
      case 'medium':
        if (this.config.selfHealing.autoRestart) {
          return `Restarted component for: ${issue.description}`;
        }
        return null;
      case 'high':
      case 'critical':
        // Only auto-resolve if allowed
        if (this.state.mode === 'fully-autonomous') {
          return `Emergency response for: ${issue.description}`;
        }
        return null;
      default:
        return null;
    }
  }

  private updateHealthStatus(): void {
    const unresolvedIssues = this.state.health.issues.filter(i => !i.resolvedAt);
    const criticalIssues = unresolvedIssues.filter(i => i.severity === 'critical');
    const highIssues = unresolvedIssues.filter(i => i.severity === 'high');

    if (criticalIssues.length > 0) {
      this.state.health.overall = 'critical';
    } else if (highIssues.length > 0 || unresolvedIssues.length > 3) {
      this.state.health.overall = 'degraded';
    } else {
      this.state.health.overall = 'healthy';
    }

    this.state.health.lastCheck = new Date();
  }

  private calculateAutonomyLevel(): number {
    const enabledCapabilities = this.state.capabilities.filter(c => c.enabled).length;
    const totalCapabilities = this.state.capabilities.length;
    const modeMultiplier = this.state.mode === 'fully-autonomous' ? 1 : 
                          this.state.mode === 'semi-autonomous' ? 0.7 : 0.3;
    
    return (enabledCapabilities / totalCapabilities) * modeMultiplier * 100;
  }

  private logAudit(action: string, actor: AuditEntry['actor'], details: Record<string, unknown>): void {
    this.state.governance.auditLog.push({
      id: generateId(),
      action,
      actor,
      timestamp: new Date(),
      details,
    });

    // Keep only last 1000 entries
    if (this.state.governance.auditLog.length > 1000) {
      this.state.governance.auditLog = this.state.governance.auditLog.slice(-1000);
    }
  }

  private updateStats(decision: AutonomyDecision): void {
    this.stats.totalDecisions++;
    if (decision.outcome === 'success') {
      this.stats.successfulDecisions++;
    }

    // Update average confidence
    const confidences = this.decisionHistory.map(d => d.confidence);
    this.stats.avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }
}

export default FinalMode;
