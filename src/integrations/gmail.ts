/**
 * Gmail Integration
 * Logs emails and syncs contacts with HubSpot
 */

import { GmailConfig } from '../cli/config/types';
import { Contact } from '../types';
import { BaseIntegration, IntegrationStatus, SyncResult } from './index';

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data?: string;
    };
    parts?: Array<{
      mimeType: string;
      body: {
        data?: string;
      };
    }>;
  };
}

export interface GmailContact {
  resourceName: string;
  etag: string;
  names?: Array<{
    displayName: string;
    givenName?: string;
    familyName?: string;
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
  }>;
}

export class GmailIntegration extends BaseIntegration {
  private config: GmailConfig;

  constructor(config: GmailConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to Gmail API
   */
  async connect(): Promise<boolean> {
    if (!this.config.enabled) {
      this.status.error = 'Integration is not enabled';
      return false;
    }

    try {
      // In a real implementation, this would use OAuth2 or service account
      // For service accounts, we need the JSON key file path and user to impersonate

      if (this.config.serviceAccountPath) {
        // Use service account authentication
        // const auth = new google.auth.GoogleAuth({
        //   keyFile: this.config.serviceAccountPath,
        //   scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
        //   clientOptions: {
        //     subject: this.config.impersonateUser,
        //   },
        // });
      }

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
   * Disconnect from Gmail API
   */
  async disconnect(): Promise<void> {
    this.status.connected = false;
  }

  /**
   * Sync emails and contacts
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
      result.errors.push('Not connected to Gmail');
      result.duration = Date.now() - startTime;
      return result;
    }

    try {
      if (this.config.logEmails) {
        const emailResult = await this.syncEmails();
        result.recordsCreated += emailResult.logged;
      }

      if (this.config.syncContacts) {
        const contactResult = await this.syncContacts();
        result.recordsCreated += contactResult.created;
        result.recordsUpdated += contactResult.updated;
        result.recordsSkipped += contactResult.skipped;
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
   * Sync emails to HubSpot
   */
  private async syncEmails(): Promise<{ logged: number }> {
    // In a real implementation:
    // 1. List recent emails from Gmail API
    // 2. Match email addresses to HubSpot contacts
    // 3. Log email activity in HubSpot timeline
    
    return { logged: 0 };
  }

  /**
   * Sync contacts from Gmail to HubSpot
   */
  private async syncContacts(): Promise<{ created: number; updated: number; skipped: number }> {
    // In a real implementation:
    // 1. List contacts from Google People API
    // 2. Map to HubSpot contacts
    // 3. Create/update via HubSpot API
    
    return { created: 0, updated: 0, skipped: 0 };
  }

  /**
   * Map Gmail contact to HubSpot contact
   */
  mapContactToHubSpot(contact: GmailContact): Partial<Contact> {
    const name = contact.names?.[0];
    const email = contact.emailAddresses?.[0];
    const phone = contact.phoneNumbers?.[0];
    const org = contact.organizations?.[0];

    return {
      id: '',
      properties: {
        firstname: name?.givenName,
        lastname: name?.familyName,
        email: email?.value,
        phone: phone?.value,
        company: org?.name,
        jobtitle: org?.title,
        google_contact_id: contact.resourceName,
      },
    };
  }

  /**
   * Parse Gmail message headers
   */
  parseMessageHeaders(message: GmailMessage): {
    from: string;
    to: string[];
    subject: string;
    date: string;
  } {
    const headers = message.payload.headers;
    
    const getHeader = (name: string): string => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header?.value || '';
    };

    return {
      from: getHeader('From'),
      to: getHeader('To').split(',').map(e => e.trim()),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
    };
  }

  /**
   * Extract email address from header
   */
  extractEmailAddress(headerValue: string): string | null {
    const match = headerValue.match(/<([^>]+)>/);
    if (match) {
      return match[1];
    }
    // If no angle brackets, assume the whole thing is an email
    if (headerValue.includes('@')) {
      return headerValue.trim();
    }
    return null;
  }

  /**
   * Create HubSpot email activity
   */
  createEmailActivity(message: GmailMessage, contactId: string): {
    associations: Array<{ to: { id: string }; types: Array<{ associationTypeId: number }> }>;
    properties: Record<string, string>;
  } {
    const headers = this.parseMessageHeaders(message);
    const fromEmail = this.extractEmailAddress(headers.from);

    return {
      associations: [
        {
          to: { id: contactId },
          types: [{ associationTypeId: 198 }], // Contact to email activity
        },
      ],
      properties: {
        hs_timestamp: new Date(parseInt(message.internalDate)).toISOString(),
        hs_email_subject: headers.subject,
        hs_email_text: message.snippet,
        hs_email_direction: 'INCOMING_EMAIL',
        hs_email_sender_email: fromEmail || '',
        gmail_message_id: message.id,
        gmail_thread_id: message.threadId,
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
      return this.status.connected;
    } catch {
      return false;
    }
  }

  /**
   * Get required OAuth scopes
   */
  static getRequiredScopes(): string[] {
    return [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/contacts.readonly',
    ];
  }
}
