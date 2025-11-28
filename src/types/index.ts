/**
 * Core types for the Revenue Leak Detection Engine
 */

export interface HubSpotTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface OAuthState {
  state: string;
  createdAt: number;
}

export interface Deal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    pipeline?: string;
    hs_object_id?: string;
    [key: string]: string | undefined;
  };
  createdAt?: string;
  updatedAt?: string;
  associations?: {
    contacts?: { results: Array<{ id: string }> };
    companies?: { results: Array<{ id: string }> };
  };
}

export interface Contact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    lifecyclestage?: string;
    hs_object_id?: string;
    [key: string]: string | undefined;
  };
}

export interface Company {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    industry?: string;
    annualrevenue?: string;
    hs_object_id?: string;
    [key: string]: string | undefined;
  };
}

export interface Invoice {
  id: string;
  properties: {
    hs_invoice_number?: string;
    hs_invoice_status?: string;
    hs_amount_billed?: string;
    hs_due_date?: string;
    hs_object_id?: string;
    [key: string]: string | undefined;
  };
}

export interface Job {
  id: string;
  properties: {
    job_name?: string;
    job_status?: string;
    job_value?: string;
    job_start_date?: string;
    job_end_date?: string;
    hs_object_id?: string;
    [key: string]: string | undefined;
  };
}

export interface Placement {
  id: string;
  properties: {
    placement_name?: string;
    placement_status?: string;
    placement_value?: string;
    placement_start_date?: string;
    placement_end_date?: string;
    hs_object_id?: string;
    [key: string]: string | undefined;
  };
}

export interface Contract {
  id: string;
  properties: {
    contract_name?: string;
    contract_status?: string;
    contract_value?: string;
    contract_start_date?: string;
    contract_end_date?: string;
    renewal_date?: string;
    hs_object_id?: string;
    [key: string]: string | undefined;
  };
}

export interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
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

export interface RevenueLeak {
  id: string;
  type: LeakType;
  severity: LeakSeverity;
  description: string;
  potentialRevenue: number;
  affectedEntity: {
    type: 'deal' | 'contact' | 'company' | 'invoice' | 'job' | 'placement' | 'contract';
    id: string;
    name?: string;
  };
  detectedAt: Date;
  suggestedActions: RecoveryAction[];
  metadata?: Record<string, unknown>;
}

export interface RecoveryAction {
  id: string;
  type: 'update_property' | 'create_task' | 'send_notification' | 'trigger_workflow' | 'manual_review';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  parameters?: Record<string, unknown>;
}

export interface LeakDetectionResult {
  leaks: RevenueLeak[];
  summary: {
    totalLeaks: number;
    totalPotentialRevenue: number;
    byType: Record<LeakType, number>;
    bySeverity: Record<LeakSeverity, number>;
  };
  analyzedAt: Date;
}

export interface TimelineEvent {
  eventTemplateId: string;
  objectId: string;
  tokens: Record<string, string>;
  extraData?: Record<string, unknown>;
}

export interface CRMCardAction {
  type: 'IFRAME' | 'ACTION_HOOK' | 'CONFIRMATION_ACTION_HOOK';
  label: string;
  uri?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  associatedObjectProperties?: string[];
  propertiesToSend?: string[];
}

export interface CRMCardSection {
  id: string;
  title: string;
  linkUrl?: string;
  linkLabel?: string;
  items: Array<{
    label: string;
    dataType: 'STRING' | 'NUMERIC' | 'CURRENCY' | 'DATE' | 'STATUS';
    value: string | number;
  }>;
}

export interface CRMCardResponse {
  results: CRMCardSection[];
  primaryAction?: CRMCardAction;
  secondaryActions?: CRMCardAction[];
}

export interface PropertyUpdate {
  objectType: 'deals' | 'contacts' | 'companies';
  objectId: string;
  properties: Record<string, string | number | boolean>;
}
