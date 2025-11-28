/**
 * Industry Templates for Revenue Leak Detection Engine
 * Provides pre-configured settings for common SMB verticals
 */

import { LeakEngineConfig } from '../cli/config/types';

export type IndustryType = 'saas' | 'agency' | 'healthcare' | 'consulting' | 'retail';

/**
 * Get industry-specific template configuration
 */
export function getIndustryTemplate(industry: IndustryType): Partial<LeakEngineConfig> {
  switch (industry) {
    case 'saas':
      return getSaaSTemplate();
    case 'agency':
      return getAgencyTemplate();
    case 'healthcare':
      return getHealthcareTemplate();
    case 'consulting':
      return getConsultingTemplate();
    case 'retail':
      return getRetailTemplate();
    default:
      return {};
  }
}

/**
 * SaaS Template - Subscription metrics, churn detection, MRR tracking
 */
function getSaaSTemplate(): Partial<LeakEngineConfig> {
  return {
    modules: {
      emailInactivity: {
        enabled: true,
        inactivityDays: 14, // SaaS customers need more frequent engagement
        minDealValue: 500,
      },
      duplicateDeals: {
        enabled: true,
        matchFields: ['dealname', 'company', 'email'],
        similarityThreshold: 0.8,
      },
      forecast: {
        enabled: true,
        forecastPeriodDays: 90,
        confidenceLevel: 0.95,
      },
      underbilling: {
        enabled: true,
        deviationThreshold: 0.15,
        minValue: 100,
      },
      missedRenewals: {
        enabled: true,
        alertDaysBefore: 90, // SaaS needs longer lead time for renewals
        engagementThresholdDays: 14,
      },
      crossSell: {
        enabled: true,
        minCustomerValue: 5000,
        inactivityDays: 60,
      },
      csHandoff: {
        enabled: true,
        maxHandoffDelayDays: 3, // Faster handoff for SaaS
        minDealValue: 2000,
      },
      lifecycle: {
        enabled: true,
        requiredStages: ['trial', 'subscriber', 'customer', 'evangelist'],
        allowedTransitions: {
          trial: ['subscriber', 'churned'],
          subscriber: ['customer', 'churned'],
          customer: ['evangelist', 'churned'],
          evangelist: ['customer'],
          churned: ['trial'],
        },
      },
      billingGap: {
        enabled: true,
        maxGapDays: 35, // Monthly billing tolerance
        tolerancePercent: 3,
      },
    } as LeakEngineConfig['modules'],
    integrations: {
      outlook: { enabled: false, syncContacts: true, logEmails: true, syncCalendar: false, hybridMode: false },
      quickbooks: { enabled: false, syncContacts: true, syncInvoices: true, syncPayments: true, environment: 'production', fieldMappings: {} },
      stripe: {
        enabled: true, // Stripe is common for SaaS
        syncPayments: true,
        syncSubscriptions: true,
        syncCustomers: true,
        attributeToDeals: true,
      },
      shopify: { enabled: false, syncCustomers: false, syncProducts: false, syncOrders: false, syncAbandonedCarts: false, addTrackingCode: false, fieldMappings: {} },
      gmail: { enabled: true, logEmails: true, syncContacts: true },
      salesforce: { enabled: false, syncContacts: true, syncDeals: true, syncCompanies: true },
    } as LeakEngineConfig['integrations'],
    thresholds: {
      criticalLeakValue: 25000,
      highLeakValue: 5000,
      mediumLeakValue: 1000,
      stalePipelineDays: 60,
      urgentRecoveryDays: 7,
    },
    dataQuality: {
      autoMergeDuplicates: true,
      mergeByEmail: true,
      mergeByDomain: true,
      fieldMappings: [
        { source: 'stripe', sourceField: 'subscription_status', targetField: 'subscription_status', transformations: [] },
        { source: 'stripe', sourceField: 'mrr', targetField: 'mrr', transformations: ['currency'] },
        { source: 'stripe', sourceField: 'plan_name', targetField: 'product_tier', transformations: [] },
      ],
      validationRules: [
        { field: 'email', rule: 'email', message: 'Invalid email format' },
        { field: 'subscription_status', rule: 'required', message: 'Subscription status required' },
      ],
    },
    reporting: {
      enabled: true,
      scheduledReports: true,
      reportFrequency: 'weekly',
      emailRecipients: [],
      dashboards: [
        { name: 'MRR Dashboard', type: 'revenue_leakage', metrics: ['mrr', 'churn_rate', 'expansion_mrr', 'net_mrr'], refreshIntervalMinutes: 30 },
        { name: 'Subscription Health', type: 'forecast', metrics: ['active_subscriptions', 'trial_conversions', 'upgrades', 'downgrades'], refreshIntervalMinutes: 60 },
        { name: 'Churn Risk', type: 'roi', metrics: ['at_risk_revenue', 'engagement_score', 'nps'], refreshIntervalMinutes: 60 },
      ],
    },
  };
}

/**
 * Agency Template - Project billing, hourly rates, client management
 */
function getAgencyTemplate(): Partial<LeakEngineConfig> {
  return {
    modules: {
      emailInactivity: {
        enabled: true,
        inactivityDays: 21,
        minDealValue: 2500,
      },
      duplicateDeals: {
        enabled: true,
        matchFields: ['dealname', 'company', 'project_code'],
        similarityThreshold: 0.85,
      },
      forecast: {
        enabled: true,
        forecastPeriodDays: 60,
        confidenceLevel: 0.9,
      },
      underbilling: {
        enabled: true,
        deviationThreshold: 0.1, // Agencies need tighter underbilling detection
        minValue: 1000,
      },
      missedRenewals: {
        enabled: true,
        alertDaysBefore: 45,
        engagementThresholdDays: 21,
      },
      crossSell: {
        enabled: true,
        minCustomerValue: 15000,
        inactivityDays: 45,
      },
      csHandoff: {
        enabled: true,
        maxHandoffDelayDays: 5,
        minDealValue: 5000,
      },
      lifecycle: {
        enabled: true,
        requiredStages: ['prospect', 'pitch', 'proposal', 'active_client', 'completed'],
        allowedTransitions: {
          prospect: ['pitch', 'lost'],
          pitch: ['proposal', 'lost'],
          proposal: ['active_client', 'lost'],
          active_client: ['completed', 'prospect'],
          completed: ['prospect'],
        },
      },
      billingGap: {
        enabled: true,
        maxGapDays: 60, // Project-based billing may have gaps
        tolerancePercent: 5,
      },
    } as LeakEngineConfig['modules'],
    integrations: {
      outlook: { enabled: true, syncContacts: true, logEmails: true, syncCalendar: true, hybridMode: false },
      quickbooks: {
        enabled: true, // Agencies commonly use QuickBooks
        syncContacts: true,
        syncInvoices: true,
        syncPayments: true,
        environment: 'production',
        fieldMappings: {
          'project_code': 'Class',
          'hourly_rate': 'Rate',
        },
      },
      stripe: { enabled: false, syncPayments: false, syncSubscriptions: false, syncCustomers: false, attributeToDeals: false },
      shopify: { enabled: false, syncCustomers: false, syncProducts: false, syncOrders: false, syncAbandonedCarts: false, addTrackingCode: false, fieldMappings: {} },
      gmail: { enabled: true, logEmails: true, syncContacts: true },
      salesforce: { enabled: false, syncContacts: true, syncDeals: true, syncCompanies: true },
    } as LeakEngineConfig['integrations'],
    thresholds: {
      criticalLeakValue: 50000,
      highLeakValue: 15000,
      mediumLeakValue: 5000,
      stalePipelineDays: 45,
      urgentRecoveryDays: 5,
    },
    dataQuality: {
      autoMergeDuplicates: true,
      mergeByEmail: true,
      mergeByDomain: true,
      fieldMappings: [
        { source: 'quickbooks', sourceField: 'ProjectRef', targetField: 'project_code', transformations: [] },
        { source: 'quickbooks', sourceField: 'TotalBilled', targetField: 'total_billed', transformations: ['currency'] },
        { source: 'outlook', sourceField: 'categories', targetField: 'project_type', transformations: [] },
      ],
      validationRules: [
        { field: 'project_code', rule: 'required', message: 'Project code required for billing' },
        { field: 'hourly_rate', rule: 'number', message: 'Hourly rate must be a number' },
      ],
    },
    reporting: {
      enabled: true,
      scheduledReports: true,
      reportFrequency: 'weekly',
      emailRecipients: [],
      dashboards: [
        { name: 'Project Revenue', type: 'revenue_leakage', metrics: ['billed_hours', 'unbilled_hours', 'realization_rate', 'by_project'], refreshIntervalMinutes: 60 },
        { name: 'Client Pipeline', type: 'forecast', metrics: ['pipeline_value', 'win_rate', 'avg_project_value'], refreshIntervalMinutes: 60 },
        { name: 'Utilization', type: 'roi', metrics: ['billable_utilization', 'capacity', 'efficiency'], refreshIntervalMinutes: 120 },
      ],
    },
  };
}

/**
 * Healthcare Template - HIPAA compliance, patient data, referrals
 */
function getHealthcareTemplate(): Partial<LeakEngineConfig> {
  return {
    modules: {
      emailInactivity: {
        enabled: true,
        inactivityDays: 60, // Healthcare has longer engagement cycles
        minDealValue: 5000,
      },
      duplicateDeals: {
        enabled: true,
        matchFields: ['patient_id', 'mrn', 'dealname'],
        similarityThreshold: 0.95, // Higher threshold for healthcare accuracy
      },
      forecast: {
        enabled: true,
        forecastPeriodDays: 180,
        confidenceLevel: 0.9,
      },
      underbilling: {
        enabled: true,
        deviationThreshold: 0.05, // Healthcare billing must be accurate
        minValue: 500,
      },
      missedRenewals: {
        enabled: true,
        alertDaysBefore: 120, // Healthcare contracts often annual
        engagementThresholdDays: 60,
      },
      crossSell: {
        enabled: false, // May not be appropriate for healthcare
        minCustomerValue: 25000,
        inactivityDays: 90,
      },
      csHandoff: {
        enabled: true,
        maxHandoffDelayDays: 1, // Critical for patient care
        minDealValue: 1000,
      },
      lifecycle: {
        enabled: true,
        requiredStages: ['referral', 'intake', 'treatment', 'follow_up', 'discharged'],
        allowedTransitions: {
          referral: ['intake'],
          intake: ['treatment', 'discharged'],
          treatment: ['follow_up', 'discharged'],
          follow_up: ['treatment', 'discharged'],
          discharged: ['referral'],
        },
      },
      billingGap: {
        enabled: true,
        maxGapDays: 90,
        tolerancePercent: 2,
      },
    } as LeakEngineConfig['modules'],
    integrations: {
      outlook: { enabled: true, syncContacts: false, logEmails: true, syncCalendar: true, hybridMode: true }, // On-prem may need hybrid
      quickbooks: { enabled: false, syncContacts: false, syncInvoices: false, syncPayments: false, environment: 'production', fieldMappings: {} },
      stripe: { enabled: false, syncPayments: false, syncSubscriptions: false, syncCustomers: false, attributeToDeals: false },
      shopify: { enabled: false, syncCustomers: false, syncProducts: false, syncOrders: false, syncAbandonedCarts: false, addTrackingCode: false, fieldMappings: {} },
      gmail: { enabled: false, logEmails: false, syncContacts: false }, // HIPAA concerns
      salesforce: { enabled: true, syncContacts: true, syncDeals: true, syncCompanies: true }, // Salesforce Health Cloud
    } as LeakEngineConfig['integrations'],
    compliance: {
      mode: 'hipaa',
      encryptSensitiveFields: true,
      sensitiveFields: [
        'ssn', 'social_security_number', 'date_of_birth', 'dob',
        'medical_record_number', 'mrn', 'health_plan_number',
        'diagnosis', 'treatment', 'medication',
        'patient_name', 'patient_id', 'insurance_id',
        'phone', 'address', 'email',
      ],
      auditLogging: true,
      dataRetentionDays: 2190, // 6 years for HIPAA
      consentRequired: true,
      cookieBannerEnabled: false,
      rightToErasure: false,
      dataPortability: true,
    },
    thresholds: {
      criticalLeakValue: 100000,
      highLeakValue: 25000,
      mediumLeakValue: 5000,
      stalePipelineDays: 90,
      urgentRecoveryDays: 1,
    },
    dataQuality: {
      autoMergeDuplicates: false, // Manual review for patient data
      mergeByEmail: false,
      mergeByDomain: false,
      fieldMappings: [
        { source: 'ehr', sourceField: 'MRN', targetField: 'mrn', transformations: ['encrypt'] },
        { source: 'ehr', sourceField: 'ReferralSource', targetField: 'referral_source', transformations: [] },
      ],
      validationRules: [
        { field: 'mrn', rule: 'required', message: 'Medical Record Number required' },
        { field: 'consent_obtained', rule: 'required', message: 'Patient consent must be documented' },
      ],
    },
    reporting: {
      enabled: true,
      scheduledReports: true,
      reportFrequency: 'daily',
      emailRecipients: [],
      dashboards: [
        { name: 'Patient Revenue', type: 'revenue_leakage', metrics: ['billed_services', 'unbilled_services', 'denials'], refreshIntervalMinutes: 60 },
        { name: 'Referral Pipeline', type: 'forecast', metrics: ['referrals_received', 'conversion_rate', 'avg_case_value'], refreshIntervalMinutes: 120 },
        { name: 'Compliance Status', type: 'compliance', metrics: ['audit_events', 'consent_rate', 'encryption_status'], refreshIntervalMinutes: 60 },
      ],
    },
  };
}

/**
 * Consulting Template - Proposal stages, fixed-fee deals, utilization
 */
function getConsultingTemplate(): Partial<LeakEngineConfig> {
  return {
    modules: {
      emailInactivity: {
        enabled: true,
        inactivityDays: 30,
        minDealValue: 10000,
      },
      duplicateDeals: {
        enabled: true,
        matchFields: ['dealname', 'company', 'engagement_type'],
        similarityThreshold: 0.85,
      },
      forecast: {
        enabled: true,
        forecastPeriodDays: 120,
        confidenceLevel: 0.85,
      },
      underbilling: {
        enabled: true,
        deviationThreshold: 0.1,
        minValue: 5000,
      },
      missedRenewals: {
        enabled: true,
        alertDaysBefore: 60,
        engagementThresholdDays: 30,
      },
      crossSell: {
        enabled: true,
        minCustomerValue: 50000,
        inactivityDays: 60,
      },
      csHandoff: {
        enabled: true,
        maxHandoffDelayDays: 3,
        minDealValue: 20000,
      },
      lifecycle: {
        enabled: true,
        requiredStages: ['discovery', 'proposal', 'negotiation', 'engagement', 'delivery', 'completed'],
        allowedTransitions: {
          discovery: ['proposal', 'lost'],
          proposal: ['negotiation', 'lost'],
          negotiation: ['engagement', 'lost'],
          engagement: ['delivery'],
          delivery: ['completed', 'engagement'],
          completed: ['discovery'],
        },
      },
      billingGap: {
        enabled: true,
        maxGapDays: 45,
        tolerancePercent: 5,
      },
    } as LeakEngineConfig['modules'],
    integrations: {
      outlook: { enabled: true, syncContacts: true, logEmails: true, syncCalendar: true, hybridMode: false },
      quickbooks: { enabled: true, syncContacts: true, syncInvoices: true, syncPayments: true, environment: 'production', fieldMappings: {} },
      stripe: { enabled: false, syncPayments: false, syncSubscriptions: false, syncCustomers: false, attributeToDeals: false },
      shopify: { enabled: false, syncCustomers: false, syncProducts: false, syncOrders: false, syncAbandonedCarts: false, addTrackingCode: false, fieldMappings: {} },
      gmail: { enabled: true, logEmails: true, syncContacts: true },
      salesforce: { enabled: false, syncContacts: true, syncDeals: true, syncCompanies: true },
    } as LeakEngineConfig['integrations'],
    thresholds: {
      criticalLeakValue: 100000,
      highLeakValue: 50000,
      mediumLeakValue: 10000,
      stalePipelineDays: 60,
      urgentRecoveryDays: 7,
    },
    dataQuality: {
      autoMergeDuplicates: true,
      mergeByEmail: true,
      mergeByDomain: true,
      fieldMappings: [
        { source: 'quickbooks', sourceField: 'EngagementType', targetField: 'engagement_type', transformations: [] },
        { source: 'quickbooks', sourceField: 'ContractValue', targetField: 'contract_value', transformations: ['currency'] },
      ],
      validationRules: [
        { field: 'engagement_type', rule: 'required', message: 'Engagement type required' },
        { field: 'sow_signed', rule: 'required', message: 'SOW signature status required' },
      ],
    },
    reporting: {
      enabled: true,
      scheduledReports: true,
      reportFrequency: 'weekly',
      emailRecipients: [],
      dashboards: [
        { name: 'Engagement Revenue', type: 'revenue_leakage', metrics: ['contracted_value', 'billed_value', 'remaining_value'], refreshIntervalMinutes: 60 },
        { name: 'Proposal Pipeline', type: 'forecast', metrics: ['proposals_out', 'win_rate', 'avg_deal_size'], refreshIntervalMinutes: 60 },
        { name: 'Consultant Utilization', type: 'roi', metrics: ['billable_hours', 'capacity', 'revenue_per_consultant'], refreshIntervalMinutes: 120 },
      ],
    },
  };
}

/**
 * Retail Template - E-commerce, inventory, order management
 */
function getRetailTemplate(): Partial<LeakEngineConfig> {
  return {
    modules: {
      emailInactivity: {
        enabled: true,
        inactivityDays: 45,
        minDealValue: 100,
      },
      duplicateDeals: {
        enabled: true,
        matchFields: ['order_id', 'email', 'phone'],
        similarityThreshold: 0.9,
      },
      forecast: {
        enabled: true,
        forecastPeriodDays: 30,
        confidenceLevel: 0.9,
      },
      underbilling: {
        enabled: true,
        deviationThreshold: 0.05,
        minValue: 50,
      },
      missedRenewals: {
        enabled: false, // Less relevant for retail
        alertDaysBefore: 30,
        engagementThresholdDays: 14,
      },
      crossSell: {
        enabled: true,
        minCustomerValue: 500,
        inactivityDays: 30,
      },
      csHandoff: {
        enabled: true,
        maxHandoffDelayDays: 1,
        minDealValue: 200,
      },
      lifecycle: {
        enabled: true,
        requiredStages: ['browser', 'cart', 'checkout', 'purchased', 'repeat_customer'],
        allowedTransitions: {
          browser: ['cart', 'purchased'],
          cart: ['checkout', 'browser'],
          checkout: ['purchased', 'cart'],
          purchased: ['repeat_customer', 'browser'],
          repeat_customer: ['browser'],
        },
      },
      billingGap: {
        enabled: true,
        maxGapDays: 7, // Retail needs fast billing
        tolerancePercent: 1,
      },
    } as LeakEngineConfig['modules'],
    integrations: {
      outlook: { enabled: false, syncContacts: false, logEmails: false, syncCalendar: false, hybridMode: false },
      quickbooks: { enabled: true, syncContacts: true, syncInvoices: true, syncPayments: true, environment: 'production', fieldMappings: {} },
      stripe: { enabled: true, syncPayments: true, syncSubscriptions: false, syncCustomers: true, attributeToDeals: true },
      shopify: {
        enabled: true, // Shopify is primary for retail
        syncCustomers: true,
        syncProducts: true,
        syncOrders: true,
        syncAbandonedCarts: true,
        addTrackingCode: true,
        fieldMappings: {
          'sku': 'hs_sku',
          'variant_price': 'price',
          'order_number': 'order_id',
        },
      },
      gmail: { enabled: true, logEmails: true, syncContacts: false },
      salesforce: { enabled: false, syncContacts: false, syncDeals: false, syncCompanies: false },
    } as LeakEngineConfig['integrations'],
    thresholds: {
      criticalLeakValue: 10000,
      highLeakValue: 2500,
      mediumLeakValue: 500,
      stalePipelineDays: 14,
      urgentRecoveryDays: 1,
    },
    dataQuality: {
      autoMergeDuplicates: true,
      mergeByEmail: true,
      mergeByDomain: false,
      fieldMappings: [
        { source: 'shopify', sourceField: 'customer_id', targetField: 'shopify_customer_id', transformations: [] },
        { source: 'shopify', sourceField: 'total_spent', targetField: 'lifetime_value', transformations: ['currency'] },
        { source: 'shopify', sourceField: 'orders_count', targetField: 'order_count', transformations: [] },
      ],
      validationRules: [
        { field: 'email', rule: 'email', message: 'Valid email required' },
        { field: 'order_id', rule: 'required', message: 'Order ID required for transactions' },
      ],
    },
    reporting: {
      enabled: true,
      scheduledReports: true,
      reportFrequency: 'daily',
      emailRecipients: [],
      dashboards: [
        { name: 'Sales Dashboard', type: 'revenue_leakage', metrics: ['daily_sales', 'avg_order_value', 'abandoned_cart_value'], refreshIntervalMinutes: 15 },
        { name: 'Inventory Forecast', type: 'forecast', metrics: ['units_sold', 'inventory_levels', 'reorder_alerts'], refreshIntervalMinutes: 30 },
        { name: 'Customer LTV', type: 'roi', metrics: ['customer_acquisition_cost', 'lifetime_value', 'repeat_rate'], refreshIntervalMinutes: 60 },
      ],
    },
  };
}

/**
 * Get template description
 */
export function getTemplateDescription(industry: IndustryType): string {
  const descriptions: Record<IndustryType, string> = {
    saas: 'Optimized for subscription businesses with MRR tracking, churn detection, and Stripe integration',
    agency: 'Configured for project-based billing, hourly rates, and QuickBooks integration',
    healthcare: 'HIPAA-compliant setup with patient data protection and referral tracking',
    consulting: 'Designed for proposal stages, fixed-fee engagements, and utilization tracking',
    retail: 'E-commerce focused with Shopify integration, abandoned cart recovery, and fast billing cycles',
  };
  return descriptions[industry];
}

/**
 * Get all available templates
 */
export function getAvailableTemplates(): Array<{ type: IndustryType; description: string }> {
  const types: IndustryType[] = ['saas', 'agency', 'healthcare', 'consulting', 'retail'];
  return types.map(type => ({
    type,
    description: getTemplateDescription(type),
  }));
}
