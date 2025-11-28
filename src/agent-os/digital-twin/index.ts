/**
 * Digital Twin Module
 * Full Portal Digital Twin for simulation, forecasting, and stress testing
 */

export { PortalTwin } from './portal-twin';
export { ScenarioTwin } from './scenario-twin';
export { StressTests } from './stress-tests';
export { ChaosEngine } from './chaos-engine';

// Re-export types
export type {
  PortalSnapshot,
  PortalMetrics,
  LifecycleGraph,
  DealDistribution,
  RevenueModel,
} from './portal-twin';

export type {
  Scenario,
  ScenarioResult,
  ScenarioComparison,
  WhatIfParameter,
} from './scenario-twin';

export type {
  StressTest,
  StressTestResult,
  LoadProfile,
  BreakingPoint,
} from './stress-tests';

export type {
  ChaosExperiment,
  ChaosResult,
  FailureMode,
  ResilienceScore,
} from './chaos-engine';
