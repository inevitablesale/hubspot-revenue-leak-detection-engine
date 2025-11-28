/**
 * Global Brain Module
 * Inter-Portal Intelligence for cross-portal learning and benchmarking
 */

export { CrossPortalLearning } from './cross-portal-learning';
export { BenchmarkIndex } from './benchmark-index';
export { GlobalPatterns } from './global-patterns';

// Re-export types
export type {
  PortalIntelligence,
  LearningInsight,
  CrossPortalPattern,
  PortalDNA,
} from './cross-portal-learning';

export type {
  Benchmark,
  BenchmarkCategory,
  PerformanceRank,
  IndustryBaseline,
} from './benchmark-index';

export type {
  GlobalPattern,
  PatternCluster,
  PatternTrend,
  PatternPrediction,
} from './global-patterns';
