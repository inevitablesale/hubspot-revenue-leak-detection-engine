/**
 * RevOps Agent OS Types
 * Core types for the intelligent agent operating system
 */

import { RevenueLeak, LeakType, LeakSeverity, RecoveryAction } from '../types';

// ============================================================
// Intelligence & Learning Types
// ============================================================

export interface IntelligenceInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'prediction' | 'recommendation' | 'correlation';
  confidence: number;
  title: string;
  description: string;
  evidence: Evidence[];
  impact: ImpactAssessment;
  generatedAt: Date;
  expiresAt?: Date;
}

export interface Evidence {
  source: string;
  dataPoint: string;
  value: unknown;
  weight: number;
}

export interface ImpactAssessment {
  revenueImpact: number;
  probabilityOfOccurrence: number;
  timeToImpact: number; // days
  affectedEntities: number;
}

export interface LearningFeedback {
  id: string;
  insightId: string;
  feedbackType: 'accurate' | 'inaccurate' | 'partially_accurate' | 'not_applicable';
  userComment?: string;
  actualOutcome?: string;
  providedBy: string;
  providedAt: Date;
}

export interface LearnedPattern {
  id: string;
  name: string;
  description: string;
  patternType: 'temporal' | 'behavioral' | 'structural' | 'causal';
  conditions: PatternCondition[];
  outcomes: PatternOutcome[];
  confidence: number;
  occurrences: number;
  lastSeen: Date;
  createdAt: Date;
}

export interface PatternCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: unknown;
  weight: number;
}

export interface PatternOutcome {
  outcome: string;
  probability: number;
  averageTimeToOutcome: number;
}

// ============================================================
// Orchestration & Workflow Types
// ============================================================

export interface OrchestrationPlan {
  id: string;
  name: string;
  description: string;
  priority: number;
  status: 'pending' | 'executing' | 'paused' | 'completed' | 'failed';
  steps: OrchestrationStep[];
  dependencies: PlanDependency[];
  capacityRequirements: CapacityRequirement[];
  estimatedDuration: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface OrchestrationStep {
  id: string;
  name: string;
  type: 'action' | 'validation' | 'decision' | 'wait' | 'parallel' | 'loop';
  config: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  dependencies: string[];
  timeout: number;
  retryPolicy?: RetryPolicy;
  output?: unknown;
}

export interface PlanDependency {
  planId: string;
  type: 'must_complete' | 'must_not_conflict' | 'requires_output';
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface CapacityRequirement {
  resourceType: 'api_calls' | 'memory' | 'concurrent_tasks' | 'external_service';
  amount: number;
  priority: 'required' | 'preferred' | 'optional';
}

// ============================================================
// Simulation Types
// ============================================================

export interface Simulation {
  id: string;
  name: string;
  description: string;
  type: 'what_if' | 'monte_carlo' | 'scenario_planning' | 'sensitivity';
  status: 'draft' | 'running' | 'completed' | 'failed';
  parameters: SimulationParameter[];
  results?: SimulationResult;
  createdAt: Date;
  executedAt?: Date;
}

export interface SimulationParameter {
  name: string;
  description: string;
  type: 'number' | 'percentage' | 'boolean' | 'choice';
  currentValue: unknown;
  simulatedValue: unknown;
  range?: { min: number; max: number };
  choices?: unknown[];
}

export interface SimulationResult {
  id: string;
  simulationId: string;
  outcomes: SimulationOutcome[];
  confidence: number;
  executionTime: number;
  iterations?: number;
}

export interface SimulationOutcome {
  metric: string;
  baselineValue: number;
  simulatedValue: number;
  change: number;
  changePercent: number;
  confidence: number;
  distribution?: Distribution;
}

export interface Distribution {
  mean: number;
  median: number;
  standardDeviation: number;
  percentiles: Record<number, number>;
}

// ============================================================
// Self-Healing Types
// ============================================================

export interface HealthCheck {
  id: string;
  name: string;
  type: 'data_quality' | 'process_health' | 'integration_status' | 'performance';
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  nextCheck: Date;
  metrics: HealthMetric[];
  issues: HealthIssue[];
}

export interface HealthMetric {
  name: string;
  value: number;
  threshold: { warning: number; critical: number };
  trend: 'improving' | 'stable' | 'degrading';
}

export interface HealthIssue {
  id: string;
  severity: 'warning' | 'error' | 'critical';
  description: string;
  detectedAt: Date;
  autoHealable: boolean;
  healingStrategy?: HealingStrategy;
  status: 'detected' | 'healing' | 'healed' | 'escalated';
}

export interface HealingStrategy {
  id: string;
  name: string;
  steps: HealingStep[];
  successRate: number;
  averageHealingTime: number;
  requiresApproval: boolean;
}

export interface HealingStep {
  order: number;
  action: string;
  config: Record<string, unknown>;
  rollbackAction?: string;
  validationCheck?: string;
}

// ============================================================
// Multi-System Validation Types
// ============================================================

export interface SystemConnection {
  id: string;
  name: string;
  type: 'crm' | 'erp' | 'billing' | 'marketing' | 'support' | 'custom';
  status: 'connected' | 'disconnected' | 'error';
  lastSync: Date;
  config: Record<string, unknown>;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  systems: string[];
  fieldMappings: FieldMapping[];
  validationType: 'exact_match' | 'tolerance' | 'business_rule' | 'temporal';
  severity: 'info' | 'warning' | 'error';
  enabled: boolean;
}

export interface FieldMapping {
  sourceSystem: string;
  sourceField: string;
  targetSystem: string;
  targetField: string;
  transformFunction?: string;
  tolerance?: number;
}

export interface ValidationResult {
  id: string;
  ruleId: string;
  status: 'valid' | 'invalid' | 'warning' | 'skipped';
  executedAt: Date;
  discrepancies: Discrepancy[];
  metadata: Record<string, unknown>;
}

export interface Discrepancy {
  entityId: string;
  entityType: string;
  field: string;
  sourceSystem: string;
  sourceValue: unknown;
  targetSystem: string;
  targetValue: unknown;
  difference: unknown;
  suggestedResolution?: string;
}

// ============================================================
// Financial Governance Types
// ============================================================

export interface FinancialControl {
  id: string;
  name: string;
  type: 'approval' | 'limit' | 'segregation' | 'audit' | 'reconciliation';
  scope: 'transaction' | 'account' | 'entity' | 'global';
  rules: FinancialRule[];
  enabled: boolean;
  lastAudit?: Date;
}

export interface FinancialRule {
  id: string;
  condition: string;
  action: 'approve' | 'reject' | 'escalate' | 'flag' | 'require_documentation';
  threshold?: number;
  approvers?: string[];
}

export interface AuditTrailEntry {
  id: string;
  timestamp: Date;
  actor: string;
  actorType: 'user' | 'system' | 'agent';
  action: string;
  entityType: string;
  entityId: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  justification?: string;
  approvedBy?: string;
  controlsApplied: string[];
}

export interface FinancialReconciliation {
  id: string;
  name: string;
  period: { start: Date; end: Date };
  status: 'pending' | 'in_progress' | 'completed' | 'requires_review';
  sourceTotal: number;
  targetTotal: number;
  variance: number;
  variancePercent: number;
  items: ReconciliationItem[];
  completedAt?: Date;
}

export interface ReconciliationItem {
  id: string;
  description: string;
  sourceAmount: number;
  targetAmount: number;
  difference: number;
  status: 'matched' | 'unmatched' | 'adjusted' | 'excluded';
  notes?: string;
}

// ============================================================
// Ecosystem Cross-Signals Types
// ============================================================

export interface CrossSignal {
  id: string;
  name: string;
  sources: SignalSource[];
  signalType: 'leading' | 'lagging' | 'coincident';
  correlationStrength: number;
  timelag: number;
  description: string;
  detectedAt: Date;
}

export interface SignalSource {
  system: string;
  metric: string;
  direction: 'increase' | 'decrease' | 'change';
  magnitude: number;
}

export interface EcosystemAlert {
  id: string;
  signals: CrossSignal[];
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendedActions: string[];
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

// ============================================================
// Meta-Intelligence Types
// ============================================================

export interface SystemInsight {
  id: string;
  category: 'performance' | 'accuracy' | 'efficiency' | 'coverage' | 'health';
  title: string;
  description: string;
  metrics: MetaMetric[];
  recommendations: string[];
  generatedAt: Date;
}

export interface MetaMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'improving' | 'stable' | 'degrading';
  benchmark?: number;
}

export interface AgentPerformance {
  id: string;
  period: { start: Date; end: Date };
  detectionAccuracy: number;
  falsePositiveRate: number;
  recoverySuccessRate: number;
  averageTimeToDetection: number;
  averageTimeToResolution: number;
  totalValueProtected: number;
  totalValueRecovered: number;
  userSatisfaction?: number;
}

export interface CapabilityAssessment {
  capability: string;
  maturityLevel: 'initial' | 'developing' | 'defined' | 'managed' | 'optimizing';
  score: number;
  strengths: string[];
  gaps: string[];
  improvementPlan: string[];
}

// ============================================================
// Rule Evolution Types
// ============================================================

export interface EvolvableRule {
  id: string;
  name: string;
  description: string;
  version: number;
  leakType: LeakType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  performance: RulePerformance;
  status: 'active' | 'candidate' | 'deprecated' | 'testing';
  parentRuleId?: string;
  createdAt: Date;
  lastModified: Date;
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: unknown;
  confidence: number;
}

export interface RuleAction {
  type: string;
  config: Record<string, unknown>;
  priority: number;
}

export interface RulePerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  totalApplications: number;
  successfulApplications: number;
  averageImpact: number;
}

export interface RuleMutation {
  id: string;
  ruleId: string;
  mutationType: 'threshold_adjust' | 'condition_add' | 'condition_remove' | 'action_modify';
  changes: Record<string, unknown>;
  hypothesis: string;
  testResults?: RulePerformance;
  status: 'proposed' | 'testing' | 'accepted' | 'rejected';
  createdAt: Date;
}

// ============================================================
// Agent OS Core Types
// ============================================================

export interface AgentOSConfig {
  intelligence: IntelligenceConfig;
  orchestration: OrchestrationConfig;
  simulation: SimulationConfig;
  selfHealing: SelfHealingConfig;
  validation: ValidationConfig;
  governance: GovernanceConfig;
  crossSignals: CrossSignalsConfig;
  metaIntelligence: MetaIntelligenceConfig;
  ruleEvolution: RuleEvolutionConfig;
}

export interface IntelligenceConfig {
  enabled: boolean;
  learningRate: number;
  minConfidenceThreshold: number;
  patternDetectionEnabled: boolean;
  anomalyDetectionEnabled: boolean;
}

export interface OrchestrationConfig {
  enabled: boolean;
  maxConcurrentPlans: number;
  defaultTimeout: number;
  capacityLimits: Record<string, number>;
}

export interface SimulationConfig {
  enabled: boolean;
  defaultIterations: number;
  maxSimulationsPerDay: number;
  cacheResultsHours: number;
}

export interface SelfHealingConfig {
  enabled: boolean;
  autoHealEnabled: boolean;
  healthCheckIntervalMs: number;
  maxAutoHealAttempts: number;
}

export interface ValidationConfig {
  enabled: boolean;
  syncIntervalMs: number;
  tolerancePercent: number;
  strictMode: boolean;
}

export interface GovernanceConfig {
  enabled: boolean;
  auditRetentionDays: number;
  approvalThresholds: Record<string, number>;
  requireJustification: boolean;
}

export interface CrossSignalsConfig {
  enabled: boolean;
  correlationThreshold: number;
  signalWindowHours: number;
  minSignalSources: number;
}

export interface MetaIntelligenceConfig {
  enabled: boolean;
  reportingIntervalHours: number;
  benchmarkEnabled: boolean;
  improvementSuggestionsEnabled: boolean;
}

export interface RuleEvolutionConfig {
  enabled: boolean;
  autoEvolveEnabled: boolean;
  mutationRate: number;
  testingPeriodDays: number;
  minSampleSize: number;
}
