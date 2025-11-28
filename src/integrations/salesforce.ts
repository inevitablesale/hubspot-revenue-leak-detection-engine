/**
 * Salesforce Integration
 * Syncs contacts, deals, and companies with HubSpot
 */

import { SalesforceConfig } from '../cli/config/types';
import { Contact, Deal, Company } from '../types';
import { BaseIntegration, IntegrationStatus, SyncResult } from './index';

export interface SalesforceContact {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  Title: string;
  AccountId: string;
  MailingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Website: string;
  Phone: string;
  Industry: string;
  AnnualRevenue: number;
  NumberOfEmployees: number;
  BillingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  Amount: number;
  StageName: string;
  CloseDate: string;
  AccountId: string;
  Probability: number;
  Type: string;
  Description: string;
}

export class SalesforceIntegration extends BaseIntegration {
  private config: SalesforceConfig;
  private accessToken: string | null = null;

  constructor(config: SalesforceConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to Salesforce API
   */
  async connect(): Promise<boolean> {
    if (!this.config.enabled) {
      this.status.error = 'Integration is not enabled';
      return false;
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      this.status.error = 'Missing Salesforce OAuth credentials';
      return false;
    }

    try {
      // In a real implementation, this would use OAuth2 to get access token
      // const response = await axios.post(`${this.config.instanceUrl}/services/oauth2/token`, {
      //   grant_type: 'password',
      //   client_id: this.config.clientId,
      //   client_secret: this.config.clientSecret,
      //   username: this.config.username,
      //   password: this.config.password,
      // });
      // this.accessToken = response.data.access_token;

      this.status.connected = true;
      this.status.error = null;
      return true;
    } catch (error) {
      this.status.error = (error as Error).message;
      this.status.connected = false;
      return false;
    }
  }

  /**
   * Disconnect from Salesforce API
   */
  async disconnect(): Promise<void> {
    this.accessToken = null;
    this.status.connected = false;
  }

  /**
   * Sync data between Salesforce and HubSpot
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0,
    };

    if (!this.status.connected) {
      result.errors.push('Not connected to Salesforce');
      result.duration = Date.now() - startTime;
      return result;
    }

    try {
      if (this.config.syncContacts) {
        const contactResult = await this.syncContacts();
        result.recordsCreated += contactResult.created;
        result.recordsUpdated += contactResult.updated;
        result.recordsSkipped += contactResult.skipped;
      }

      if (this.config.syncCompanies) {
        const companyResult = await this.syncAccounts();
        result.recordsCreated += companyResult.created;
        result.recordsUpdated += companyResult.updated;
      }

      if (this.config.syncDeals) {
        const dealResult = await this.syncOpportunities();
        result.recordsCreated += dealResult.created;
        result.recordsUpdated += dealResult.updated;
      }

      result.success = true;
      this.status.lastSync = new Date();
      this.status.recordsSynced += result.recordsCreated + result.recordsUpdated;
    } catch (error) {
      result.errors.push((error as Error).message);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Sync contacts from Salesforce to HubSpot
   */
  private async syncContacts(): Promise<{ created: number; updated: number; skipped: number }> {
    // In a real implementation:
    // 1. Query Salesforce for contacts
    // 2. Map to HubSpot contacts
    // 3. Create/update via HubSpot API
    // 4. Handle deduplication
    
    return { created: 0, updated: 0, skipped: 0 };
  }

  /**
   * Sync accounts from Salesforce to HubSpot companies
   */
  private async syncAccounts(): Promise<{ created: number; updated: number }> {
    // In a real implementation:
    // 1. Query Salesforce for accounts
    // 2. Map to HubSpot companies
    // 3. Create/update via HubSpot API
    
    return { created: 0, updated: 0 };
  }

  /**
   * Sync opportunities from Salesforce to HubSpot deals
   */
  private async syncOpportunities(): Promise<{ created: number; updated: number }> {
    // In a real implementation:
    // 1. Query Salesforce for opportunities
    // 2. Map to HubSpot deals
    // 3. Map Salesforce stages to HubSpot stages
    // 4. Create/update via HubSpot API
    
    return { created: 0, updated: 0 };
  }

  /**
   * Map Salesforce contact to HubSpot contact
   */
  mapContactToHubSpot(contact: SalesforceContact): Partial<Contact> {
    return {
      id: '',
      properties: {
        firstname: contact.FirstName,
        lastname: contact.LastName,
        email: contact.Email,
        phone: contact.Phone,
        jobtitle: contact.Title,
        address: contact.MailingAddress?.street,
        city: contact.MailingAddress?.city,
        state: contact.MailingAddress?.state,
        zip: contact.MailingAddress?.postalCode,
        salesforce_contact_id: contact.Id,
        salesforce_account_id: contact.AccountId,
      },
    };
  }

  /**
   * Map Salesforce account to HubSpot company
   */
  mapAccountToCompany(account: SalesforceAccount): Partial<Company> {
    // Extract domain from website
    let domain: string | undefined;
    if (account.Website) {
      try {
        const url = new URL(account.Website.startsWith('http') ? account.Website : `https://${account.Website}`);
        domain = url.hostname.replace(/^www\./, '');
      } catch {
        // Invalid URL, use as-is
        domain = account.Website;
      }
    }

    return {
      id: '',
      properties: {
        name: account.Name,
        domain: domain,
        phone: account.Phone,
        industry: account.Industry,
        annualrevenue: String(account.AnnualRevenue),
        numberofemployees: String(account.NumberOfEmployees),
        address: account.BillingAddress?.street,
        city: account.BillingAddress?.city,
        state: account.BillingAddress?.state,
        zip: account.BillingAddress?.postalCode,
        salesforce_account_id: account.Id,
      },
    };
  }

  /**
   * Map Salesforce opportunity to HubSpot deal
   */
  mapOpportunityToDeal(opportunity: SalesforceOpportunity): Partial<Deal> {
    return {
      id: '',
      properties: {
        dealname: opportunity.Name,
        amount: String(opportunity.Amount),
        dealstage: this.mapStageToHubSpot(opportunity.StageName),
        closedate: opportunity.CloseDate,
        hs_deal_stage_probability: String(opportunity.Probability / 100),
        description: opportunity.Description,
        salesforce_opportunity_id: opportunity.Id,
        salesforce_account_id: opportunity.AccountId,
        deal_type: opportunity.Type,
      },
    };
  }

  /**
   * Map Salesforce stage to HubSpot stage
   */
  private mapStageToHubSpot(sfStage: string): string {
    // Common Salesforce stage mappings
    const stageMap: Record<string, string> = {
      'Prospecting': 'appointmentscheduled',
      'Qualification': 'qualifiedtobuy',
      'Needs Analysis': 'presentationscheduled',
      'Value Proposition': 'presentationscheduled',
      'Id. Decision Makers': 'qualifiedtobuy',
      'Perception Analysis': 'decisionmakerboughtin',
      'Proposal/Price Quote': 'contractsent',
      'Negotiation/Review': 'contractsent',
      'Closed Won': 'closedwon',
      'Closed Lost': 'closedlost',
    };

    return stageMap[sfStage] || sfStage.toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Get SOQL query for contacts
   */
  getContactQuery(lastModified?: Date): string {
    let query = 'SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId, MailingAddress FROM Contact';
    if (lastModified) {
      query += ` WHERE LastModifiedDate > ${lastModified.toISOString()}`;
    }
    return query;
  }

  /**
   * Get SOQL query for accounts
   */
  getAccountQuery(lastModified?: Date): string {
    let query = 'SELECT Id, Name, Website, Phone, Industry, AnnualRevenue, NumberOfEmployees, BillingAddress FROM Account';
    if (lastModified) {
      query += ` WHERE LastModifiedDate > ${lastModified.toISOString()}`;
    }
    return query;
  }

  /**
   * Get SOQL query for opportunities
   */
  getOpportunityQuery(lastModified?: Date): string {
    let query = 'SELECT Id, Name, Amount, StageName, CloseDate, AccountId, Probability, Type, Description FROM Opportunity';
    if (lastModified) {
      query += ` WHERE LastModifiedDate > ${lastModified.toISOString()}`;
    }
    return query;
  }

  /**
   * Get integration status
   */
  getStatus(): IntegrationStatus {
    return { ...this.status };
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      return this.status.connected;
    } catch {
      return false;
    }
  }

  /**
   * Get deduplication rules
   */
  static getDeduplicationRules(): {
    contacts: string[];
    companies: string[];
    deals: string[];
  } {
    return {
      contacts: ['salesforce_contact_id', 'email'],
      companies: ['salesforce_account_id', 'domain'],
      deals: ['salesforce_opportunity_id', 'dealname'],
    };
  }
}
