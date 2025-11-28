/**
 * Integration Connectors
 * Prebuilt integrations for common business tools
 */

export { OutlookIntegration } from './outlook';
export { QuickBooksIntegration } from './quickbooks';
export { StripeIntegration } from './stripe';
export { ShopifyIntegration } from './shopify';
export { GmailIntegration } from './gmail';
export { SalesforceIntegration } from './salesforce';
export { DataQualityProcessor } from './data-quality';
export { getIndustryTemplate, getAvailableTemplates, getTemplateDescription } from './templates';

// Base types for integrations
export interface IntegrationStatus {
  connected: boolean;
  lastSync: Date | null;
  error: string | null;
  recordsSynced: number;
}

export interface SyncResult {
  success: boolean;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  duration: number;
}

export interface IntegrationConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export abstract class BaseIntegration {
  protected status: IntegrationStatus = {
    connected: false,
    lastSync: null,
    error: null,
    recordsSynced: 0,
  };

  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract sync(): Promise<SyncResult>;
  abstract getStatus(): IntegrationStatus;
  abstract testConnection(): Promise<boolean>;
}
