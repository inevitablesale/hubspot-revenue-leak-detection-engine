/**
 * QuickBooks Integration
 * Syncs contacts, invoices, and payments with HubSpot
 */

import { QuickBooksConfig } from '../cli/config/types';
import { Contact, Invoice, Deal } from '../types';
import { BaseIntegration, IntegrationStatus, SyncResult } from './index';

export interface QuickBooksCustomer {
  Id: string;
  DisplayName: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  CompanyName?: string;
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
}

export interface QuickBooksInvoice {
  Id: string;
  DocNumber: string;
  CustomerRef: { value: string; name: string };
  TotalAmt: number;
  Balance: number;
  DueDate: string;
  TxnDate: string;
  Line: Array<{
    Description?: string;
    Amount: number;
    DetailType: string;
    SalesItemLineDetail?: {
      ItemRef: { value: string; name: string };
      Qty: number;
      UnitPrice: number;
    };
  }>;
}

export interface QuickBooksPayment {
  Id: string;
  TotalAmt: number;
  CustomerRef: { value: string; name: string };
  TxnDate: string;
  Line: Array<{
    Amount: number;
    LinkedTxn: Array<{
      TxnId: string;
      TxnType: string;
    }>;
  }>;
}

export class QuickBooksIntegration extends BaseIntegration {
  private config: QuickBooksConfig;
  private accessToken: string | null = null;
  private realmId: string | null = null;

  constructor(config: QuickBooksConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to QuickBooks API
   */
  async connect(): Promise<boolean> {
    if (!this.config.enabled) {
      this.status.error = 'Integration is not enabled';
      return false;
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      this.status.error = 'Missing QuickBooks OAuth credentials';
      return false;
    }

    try {
      // In a real implementation, this would use OAuth2 to get tokens
      // const token = await this.getAccessToken();
      // this.accessToken = token.access_token;
      // this.realmId = token.realm_id;

      this.realmId = this.config.companyId || null;
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
   * Disconnect from QuickBooks API
   */
  async disconnect(): Promise<void> {
    this.accessToken = null;
    this.realmId = null;
    this.status.connected = false;
  }

  /**
   * Sync data between QuickBooks and HubSpot
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
      result.errors.push('Not connected to QuickBooks');
      result.duration = Date.now() - startTime;
      return result;
    }

    try {
      if (this.config.syncContacts) {
        const contactResult = await this.syncCustomers();
        result.recordsCreated += contactResult.created;
        result.recordsUpdated += contactResult.updated;
        result.recordsSkipped += contactResult.skipped;
      }

      if (this.config.syncInvoices) {
        const invoiceResult = await this.syncInvoices();
        result.recordsCreated += invoiceResult.created;
        result.recordsUpdated += invoiceResult.updated;
      }

      if (this.config.syncPayments) {
        const paymentResult = await this.syncPayments();
        result.recordsUpdated += paymentResult.updated;
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
   * Sync customers from QuickBooks to HubSpot contacts
   */
  private async syncCustomers(): Promise<{ created: number; updated: number; skipped: number }> {
    // In a real implementation:
    // 1. Query QuickBooks for customers
    // 2. Map to HubSpot contacts
    // 3. Create/update via HubSpot API
    
    return { created: 0, updated: 0, skipped: 0 };
  }

  /**
   * Sync invoices from QuickBooks to HubSpot
   */
  private async syncInvoices(): Promise<{ created: number; updated: number }> {
    // In a real implementation:
    // 1. Query QuickBooks for invoices
    // 2. Match to HubSpot deals/contacts
    // 3. Create HubSpot invoice objects or update deal properties
    // 4. Add to deal timeline
    
    return { created: 0, updated: 0 };
  }

  /**
   * Sync payments from QuickBooks to HubSpot
   */
  private async syncPayments(): Promise<{ updated: number }> {
    // In a real implementation:
    // 1. Query QuickBooks for recent payments
    // 2. Match to HubSpot invoices/deals
    // 3. Update payment status on deals
    // 4. Add payment event to timeline
    
    return { updated: 0 };
  }

  /**
   * Map QuickBooks customer to HubSpot contact
   */
  mapCustomerToContact(customer: QuickBooksCustomer): Partial<Contact> {
    return {
      id: '',
      properties: {
        firstname: customer.GivenName,
        lastname: customer.FamilyName,
        email: customer.PrimaryEmailAddr?.Address,
        phone: customer.PrimaryPhone?.FreeFormNumber,
        company: customer.CompanyName,
        address: customer.BillAddr?.Line1,
        city: customer.BillAddr?.City,
        state: customer.BillAddr?.CountrySubDivisionCode,
        zip: customer.BillAddr?.PostalCode,
        quickbooks_customer_id: customer.Id,
      },
    };
  }

  /**
   * Map QuickBooks invoice to HubSpot invoice
   */
  mapInvoiceToHubSpot(invoice: QuickBooksInvoice): Partial<Invoice> {
    return {
      id: '',
      properties: {
        hs_invoice_number: invoice.DocNumber,
        hs_amount_billed: String(invoice.TotalAmt),
        hs_due_date: invoice.DueDate,
        hs_invoice_status: invoice.Balance === 0 ? 'PAID' : 'OPEN',
        quickbooks_invoice_id: invoice.Id,
      },
    };
  }

  /**
   * Get deal timeline entry for payment
   */
  createPaymentTimelineEntry(payment: QuickBooksPayment): {
    eventTemplateId: string;
    tokens: Record<string, string>;
  } {
    return {
      eventTemplateId: 'qb_payment_received',
      tokens: {
        payment_amount: String(payment.TotalAmt),
        payment_date: payment.TxnDate,
        customer_name: payment.CustomerRef.name,
        quickbooks_payment_id: payment.Id,
      },
    };
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
      // Would make a test API call to QuickBooks
      return this.status.connected;
    } catch {
      return false;
    }
  }

  /**
   * Get API base URL based on environment
   */
  private getBaseUrl(): string {
    return this.config.environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com/v3'
      : 'https://quickbooks.api.intuit.com/v3';
  }

  /**
   * Get default field mappings
   */
  static getDefaultFieldMappings(): Record<string, string> {
    return {
      'DisplayName': 'dealname',
      'TotalAmt': 'amount',
      'DueDate': 'closedate',
      'Balance': 'hs_amount_due',
      'CustomerRef.name': 'company',
    };
  }
}
