/**
 * UI Extension Types
 * Shared types for HubSpot UI Extensions
 */

export interface LeakFlag {
  id: string;
  type: LeakType;
  severity: LeakSeverity;
  description: string;
  potentialRevenue: number;
  recoveryStatus: RecoveryStatus;
  urgencyScore: number;
  recommendation: string;
  detectedAt: Date;
  expiresAt?: Date;
}

export type LeakType =
  | 'underbilling'
  | 'missed_renewal'
  | 'untriggered_crosssell'
  | 'stalled_cs_handoff'
  | 'invalid_lifecycle_path'
  | 'billing_gap'
  | 'stale_pipeline'
  | 'missed_handoff'
  | 'data_quality';

export type LeakSeverity = 'low' | 'medium' | 'high' | 'critical';

export type RecoveryStatus = 'pending' | 'in_progress' | 'resolved' | 'dismissed';

export interface RecoveryAction {
  id: string;
  type: 'update_property' | 'create_task' | 'send_notification' | 'trigger_workflow' | 'manual_review';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  parameters?: Record<string, unknown>;
}

export interface AppConfig {
  hubspot: HubSpotConfig;
  modules: ModulesConfig;
  integrations: IntegrationsConfig;
  compliance: ComplianceConfig;
  automation: AutomationConfig;
}

export interface HubSpotConfig {
  portalId?: string;
  pipeline?: string;
  customObjectIds?: Record<string, string>;
}

export interface ModulesConfig {
  underbilling: ModuleSettings;
  missedRenewals: ModuleSettings;
  crossSell: ModuleSettings;
  csHandoff: ModuleSettings;
  lifecycle: ModuleSettings;
  billingGap: ModuleSettings;
}

export interface ModuleSettings {
  enabled: boolean;
  threshold?: number;
  alertDays?: number;
}

export interface IntegrationsConfig {
  stripe: IntegrationSettings;
  quickbooks: IntegrationSettings;
  outlook: IntegrationSettings;
  gmail: IntegrationSettings;
  shopify: IntegrationSettings;
  salesforce: IntegrationSettings;
}

export interface IntegrationSettings {
  enabled: boolean;
  connected: boolean;
  lastSync?: Date;
  syncStatus?: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}

export interface ComplianceConfig {
  mode: 'none' | 'hipaa' | 'gdpr' | 'soc2';
  auditLogging: boolean;
  dataRetentionDays: number;
  encryptSensitiveFields: boolean;
}

export interface AutomationConfig {
  scanFrequency: 'manual' | 'hourly' | 'daily' | 'weekly';
  autoRecover: boolean;
  notifyOnCritical: boolean;
  notifyChannels: ('email' | 'slack' | 'hubspot')[];
}

export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  modules: Partial<ModulesConfig>;
  integrations: Partial<IntegrationsConfig>;
  compliance?: Partial<ComplianceConfig>;
}

export interface DashboardMetrics {
  totalLeaks: number;
  totalPotentialRevenue: number;
  recoveryRate: number;
  resolvedCount: number;
  leaksByType: Record<LeakType, number>;
  leaksBySeverity: Record<LeakSeverity, number>;
  trendsOverTime: TrendData[];
  topAffectedPipelines: PipelineMetric[];
  autonomyScore: number;
}

export interface TrendData {
  date: string;
  leakCount: number;
  recoveredValue: number;
  newLeaks: number;
}

export interface PipelineMetric {
  pipelineId: string;
  pipelineName: string;
  leakCount: number;
  potentialRevenue: number;
}

export interface ScanResult {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  leaksFound: number;
  potentialRevenue: number;
  error?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  userId?: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
}
