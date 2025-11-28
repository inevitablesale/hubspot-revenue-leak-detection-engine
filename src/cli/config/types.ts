/**
 * Configuration Types for Revenue Leak Detection Engine
 */

export interface LeakEngineConfig {
  version: string;
  hubspot: HubSpotConfig;
  modules: ModulesConfig;
  integrations: IntegrationsConfig;
  dataQuality: DataQualityConfig;
  compliance: ComplianceConfig;
  thresholds: ThresholdsConfig;
  reporting: ReportingConfig;
}

export interface HubSpotConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri: string;
  pipeline?: string;
  portalId?: string;
  apiKey?: string;
}

export interface ModulesConfig {
  emailInactivity: ModuleConfig & {
    inactivityDays: number;
    minDealValue: number;
  };
  duplicateDeals: ModuleConfig & {
    matchFields: string[];
    similarityThreshold: number;
  };
  forecast: ModuleConfig & {
    forecastPeriodDays: number;
    confidenceLevel: number;
  };
  underbilling: ModuleConfig & {
    deviationThreshold: number;
    minValue: number;
  };
  missedRenewals: ModuleConfig & {
    alertDaysBefore: number;
    engagementThresholdDays: number;
  };
  crossSell: ModuleConfig & {
    minCustomerValue: number;
    inactivityDays: number;
  };
  csHandoff: ModuleConfig & {
    maxHandoffDelayDays: number;
    minDealValue: number;
  };
  lifecycle: ModuleConfig & {
    requiredStages: string[];
    allowedTransitions: Record<string, string[]>;
  };
  billingGap: ModuleConfig & {
    maxGapDays: number;
    tolerancePercent: number;
  };
}

export interface ModuleConfig {
  enabled: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface IntegrationsConfig {
  outlook: OutlookConfig;
  quickbooks: QuickBooksConfig;
  stripe: StripeConfig;
  shopify: ShopifyConfig;
  gmail: GmailConfig;
  salesforce: SalesforceConfig;
}

export interface OutlookConfig {
  enabled: boolean;
  syncContacts: boolean;
  logEmails: boolean;
  syncCalendar: boolean;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  hybridMode: boolean;
}

export interface QuickBooksConfig {
  enabled: boolean;
  syncContacts: boolean;
  syncInvoices: boolean;
  syncPayments: boolean;
  companyId?: string;
  clientId?: string;
  clientSecret?: string;
  environment: 'sandbox' | 'production';
  fieldMappings: Record<string, string>;
}

export interface StripeConfig {
  enabled: boolean;
  syncPayments: boolean;
  syncSubscriptions: boolean;
  syncCustomers: boolean;
  apiKey?: string;
  webhookSecret?: string;
  attributeToDeals: boolean;
}

export interface ShopifyConfig {
  enabled: boolean;
  syncCustomers: boolean;
  syncProducts: boolean;
  syncOrders: boolean;
  syncAbandonedCarts: boolean;
  shopDomain?: string;
  accessToken?: string;
  addTrackingCode: boolean;
  fieldMappings: Record<string, string>;
}

export interface GmailConfig {
  enabled: boolean;
  logEmails: boolean;
  syncContacts: boolean;
  serviceAccountPath?: string;
  impersonateUser?: string;
}

export interface SalesforceConfig {
  enabled: boolean;
  syncContacts: boolean;
  syncDeals: boolean;
  syncCompanies: boolean;
  instanceUrl?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
}

export interface DataQualityConfig {
  autoMergeDuplicates: boolean;
  mergeByEmail: boolean;
  mergeByDomain: boolean;
  fieldMappings: FieldMapping[];
  validationRules: ValidationRule[];
}

export interface FieldMapping {
  source: string;
  sourceField: string;
  targetField: string;
  transformations?: string[];
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'email' | 'phone' | 'url' | 'date' | 'number' | 'regex';
  value?: string;
  message?: string;
}

export interface ComplianceConfig {
  mode: 'none' | 'hipaa' | 'gdpr';
  encryptSensitiveFields: boolean;
  sensitiveFields: string[];
  auditLogging: boolean;
  dataRetentionDays: number;
  consentRequired: boolean;
  cookieBannerEnabled: boolean;
  rightToErasure: boolean;
  dataPortability: boolean;
}

export interface ThresholdsConfig {
  criticalLeakValue: number;
  highLeakValue: number;
  mediumLeakValue: number;
  stalePipelineDays: number;
  urgentRecoveryDays: number;
}

export interface ReportingConfig {
  enabled: boolean;
  scheduledReports: boolean;
  reportFrequency: 'daily' | 'weekly' | 'monthly';
  emailRecipients: string[];
  dashboards: DashboardConfig[];
}

export interface DashboardConfig {
  name: string;
  type: 'revenue_leakage' | 'forecast' | 'roi' | 'compliance';
  metrics: string[];
  refreshIntervalMinutes: number;
}

/**
 * Default configuration
 */
export function getDefaultConfig(): LeakEngineConfig {
  return {
    version: '1.0.0',
    hubspot: {
      redirectUri: 'http://localhost:3000/oauth/callback',
    },
    modules: {
      emailInactivity: {
        enabled: true,
        inactivityDays: 30,
        minDealValue: 1000,
      },
      duplicateDeals: {
        enabled: true,
        matchFields: ['dealname', 'amount', 'company'],
        similarityThreshold: 0.85,
      },
      forecast: {
        enabled: true,
        forecastPeriodDays: 90,
        confidenceLevel: 0.95,
      },
      underbilling: {
        enabled: true,
        deviationThreshold: 0.2,
        minValue: 500,
      },
      missedRenewals: {
        enabled: true,
        alertDaysBefore: 60,
        engagementThresholdDays: 30,
      },
      crossSell: {
        enabled: true,
        minCustomerValue: 10000,
        inactivityDays: 90,
      },
      csHandoff: {
        enabled: true,
        maxHandoffDelayDays: 7,
        minDealValue: 5000,
      },
      lifecycle: {
        enabled: true,
        requiredStages: ['subscriber', 'lead', 'opportunity', 'customer'],
        allowedTransitions: {
          subscriber: ['lead'],
          lead: ['opportunity', 'subscriber'],
          opportunity: ['customer', 'lead'],
          customer: ['evangelist'],
        },
      },
      billingGap: {
        enabled: true,
        maxGapDays: 45,
        tolerancePercent: 5,
      },
    },
    integrations: {
      outlook: {
        enabled: false,
        syncContacts: true,
        logEmails: true,
        syncCalendar: false,
        hybridMode: false,
      },
      quickbooks: {
        enabled: false,
        syncContacts: true,
        syncInvoices: true,
        syncPayments: true,
        environment: 'production',
        fieldMappings: {},
      },
      stripe: {
        enabled: false,
        syncPayments: true,
        syncSubscriptions: true,
        syncCustomers: true,
        attributeToDeals: true,
      },
      shopify: {
        enabled: false,
        syncCustomers: true,
        syncProducts: true,
        syncOrders: true,
        syncAbandonedCarts: true,
        addTrackingCode: false,
        fieldMappings: {},
      },
      gmail: {
        enabled: false,
        logEmails: true,
        syncContacts: true,
      },
      salesforce: {
        enabled: false,
        syncContacts: true,
        syncDeals: true,
        syncCompanies: true,
      },
    },
    dataQuality: {
      autoMergeDuplicates: false,
      mergeByEmail: true,
      mergeByDomain: true,
      fieldMappings: [],
      validationRules: [],
    },
    compliance: {
      mode: 'none',
      encryptSensitiveFields: false,
      sensitiveFields: [],
      auditLogging: false,
      dataRetentionDays: 365,
      consentRequired: false,
      cookieBannerEnabled: false,
      rightToErasure: false,
      dataPortability: false,
    },
    thresholds: {
      criticalLeakValue: 50000,
      highLeakValue: 10000,
      mediumLeakValue: 1000,
      stalePipelineDays: 90,
      urgentRecoveryDays: 7,
    },
    reporting: {
      enabled: true,
      scheduledReports: false,
      reportFrequency: 'weekly',
      emailRecipients: [],
      dashboards: [
        {
          name: 'Revenue Leakage Report',
          type: 'revenue_leakage',
          metrics: ['total_leaks', 'potential_revenue', 'recovered_revenue', 'by_type'],
          refreshIntervalMinutes: 60,
        },
        {
          name: 'Deal Forecast',
          type: 'forecast',
          metrics: ['pipeline_value', 'expected_close', 'confidence'],
          refreshIntervalMinutes: 60,
        },
      ],
    },
  };
}

/**
 * Get HIPAA compliance config
 */
export function getHIPAAConfig(): Partial<ComplianceConfig> {
  return {
    mode: 'hipaa',
    encryptSensitiveFields: true,
    sensitiveFields: [
      'ssn', 'social_security_number',
      'date_of_birth', 'dob',
      'medical_record_number', 'mrn',
      'health_plan_number',
      'diagnosis', 'treatment',
      'patient_name', 'patient_id',
    ],
    auditLogging: true,
    dataRetentionDays: 2190, // 6 years for HIPAA
    consentRequired: true,
    rightToErasure: false, // HIPAA has specific retention requirements
    dataPortability: true,
  };
}

/**
 * Get GDPR compliance config
 */
export function getGDPRConfig(): Partial<ComplianceConfig> {
  return {
    mode: 'gdpr',
    encryptSensitiveFields: true,
    sensitiveFields: [
      'email', 'phone', 'address',
      'date_of_birth', 'dob',
      'ip_address',
      'national_id',
    ],
    auditLogging: true,
    dataRetentionDays: 365,
    consentRequired: true,
    cookieBannerEnabled: true,
    rightToErasure: true,
    dataPortability: true,
  };
}
