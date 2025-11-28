/**
 * Personas Module
 * Mini-Expert Agents Inside AgentOS - Each with specialized knowledge and capabilities
 */

export { BillingAgent } from './billing';
export { CSAgent } from './cs';
export { PipelineAgent } from './pipeline';
export { ForecastAgent } from './forecast';
export { RenewalAgent } from './renewal';
export { RiskAgent } from './risk';
export { DataQualityAgent } from './data-quality';
export { AttributionAgent } from './attribution';
export { IntentAgent } from './intent';

// Re-export types
export type {
  BillingAnalysis,
  BillingAnomaly,
  BillingRecommendation,
  InvoiceValidation,
} from './billing';

export type {
  CSAnalysis,
  CustomerHealthScore,
  ChurnRisk,
  CSRecommendation,
} from './cs';

export type {
  PipelineAnalysis,
  PipelineHealth,
  StageMetrics,
  PipelineRecommendation,
} from './pipeline';

export type {
  ForecastAnalysis,
  ForecastModel,
  ForecastScenario,
  ForecastAccuracy,
} from './forecast';

export type {
  RenewalAnalysis,
  RenewalOpportunity,
  RenewalRisk,
  RenewalRecommendation,
} from './renewal';

export type {
  RiskAnalysis,
  RiskFactor,
  RiskMitigation,
  RiskScore,
} from './risk';

export type {
  DataQualityAnalysis,
  DataIssue,
  DataQualityScore,
  DataQualityRecommendation,
} from './data-quality';

export type {
  AttributionAnalysis,
  AttributionModel,
  TouchpointValue,
  AttributionRecommendation,
} from './attribution';

export type {
  IntentAnalysis,
  IntentSignal,
  BuyerIntent,
  IntentRecommendation,
} from './intent';
