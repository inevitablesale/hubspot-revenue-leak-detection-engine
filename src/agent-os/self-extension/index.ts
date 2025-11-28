/**
 * Self-Extension Module
 * Enables AgentOS to self-author and self-extend its capabilities
 */

export { CodeAuthor } from './code-author';
export { RuleAuthor } from './rule-author';
export { WorkflowAuthor } from './workflow-author';
export { GovernanceAuthor } from './governance-author';

// Re-export types
export type {
  GeneratedCode,
  CodeTemplate,
  CodeType,
  CodeStatus,
  CapabilityGap,
  PRSubmission,
  ValidationResult,
} from './code-author';

export type {
  AuthoredRule,
  RuleCondition,
  RuleAction,
  RuleStatus,
  RuleMutation,
  RuleTestSuite,
  RuleSuggestion,
  PatternDiscovery,
} from './rule-author';

export type {
  AuthoredWorkflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowTrigger,
  WorkflowStatus,
  WorkflowTemplate,
  WorkflowExecution,
  WorkflowOptimization,
} from './workflow-author';

export type {
  AuthoredPolicy,
  PolicyRule,
  PolicyCondition,
  PolicyAction,
  PolicyStatus,
  PolicyTemplate,
  PolicyEvaluation,
  PolicySuggestion,
  GovernanceFramework,
} from './governance-author';
