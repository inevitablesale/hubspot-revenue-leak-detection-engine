/**
 * Human Modeling Module
 * Behavioral modeling and prediction for sales and customer success teams
 */

export { BehaviorProfiles } from './behavior-profiles';
export { RepArchetypes } from './rep-archetypes';
export { PredictionModel } from './prediction-model';

// Re-export types
export type {
  BehaviorProfile,
  BehaviorPattern,
  BehaviorMetrics,
  BehaviorInsight,
} from './behavior-profiles';

export type {
  Archetype,
  ArchetypeMatch,
  ArchetypeTraits,
  TeamComposition,
} from './rep-archetypes';

export type {
  Prediction,
  PredictionInput,
  PredictionFactor,
  ModelPerformance,
} from './prediction-model';
