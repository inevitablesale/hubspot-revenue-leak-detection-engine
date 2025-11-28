/**
 * Breeze Module Exports
 */

export { BreezeAgentMemory } from './agent-memory';
export type {
  ConversationMessage,
  LeakContext,
  ResolutionAttempt,
  AgentSession,
  AgentPreferences,
  AgentMemory,
  ShortTermMemory,
  LongTermMemory,
  LeakPattern,
  ResolutionStrategy,
  HistoricalMetrics,
  WorkingContext,
} from './agent-memory';

export { BreezeFixActions } from './fix-actions';
export type {
  BreezeAction,
  BreezeActionStep,
  BreezeActionResult,
  StepResult,
  AIRecommendation,
  BreezeContext,
  CustomerContext,
  SimilarResolution,
} from './fix-actions';
