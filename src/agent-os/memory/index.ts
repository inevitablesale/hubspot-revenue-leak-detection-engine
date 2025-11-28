/**
 * Memory Module
 * Neuroscience-Inspired Multi-Layer Memory Architecture for AgentOS
 */

export { ShortTermMemory } from './stm';
export { MidTermMemory } from './mtm';
export { LongTermMemory } from './ltm';
export { EpisodicMemory } from './episodic';

// Re-export types with aliases to avoid conflicts
export type {
  STMEntry,
  STMConfig,
  STMStats,
} from './stm';

export type {
  MTMConfig,
  MTMStats,
  PatternSignature,
} from './mtm';

export type {
  LTMEntry,
  LTMConfig,
  Strategy,
} from './ltm';

export type {
  Episode,
  EpisodeConfig,
} from './episodic';
