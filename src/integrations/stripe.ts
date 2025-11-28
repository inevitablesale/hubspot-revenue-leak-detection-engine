/**
 * Stripe Integration
 * Syncs payments, subscriptions, and customers with HubSpot
 */

import { StripeConfig } from '../cli/config/types';
import { Contact, Deal } from '../types';
import { BaseIntegration, IntegrationStatus, SyncResult } from './index';

export interface StripeCustomer {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  created: number;
  metadata: Record<string, string>;
  address?: {
    line1: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  };
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'trialing';
  current_period_start: number;
  current_period_end: number;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        product: string;
        unit_amount: number | null;
        currency: string;
        recurring: {
          interval: 'day' | 'week' | 'month' | 'year';
          interval_count: number;
        } | null;
      };
      quantity: number;
    }>;
  };
  metadata: Record<string, string>;
}

export interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  customer: string | null;
  created: number;
  status: 'succeeded' | 'pending' | 'failed';
  description: string | null;
  metadata: Record<string, string>;
  invoice: string | null;
}

export interface StripeInvoice {
  id: string;
  customer: string;
  subscription: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number;
  due_date: number | null;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  lines: {
    data: Array<{
      description: string | null;
      amount: number;
      quantity: number | null;
    }>;
  };
}

export class StripeIntegration extends BaseIntegration {
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to Stripe API
   */
  async connect(): Promise<boolean> {
    if (!this.config.enabled) {
      this.status.error = 'Integration is not enabled';
      return false;
    }

    if (!this.config.apiKey) {
      this.status.error = 'Missing Stripe API key';
      return false;
    }

    try {
      // In a real implementation, validate the API key
      // const stripe = new Stripe(this.config.apiKey);
      // await stripe.customers.list({ limit: 1 });

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
   * Disconnect from Stripe API
   */
  async disconnect(): Promise<void> {
    this.status.connected = false;
  }

  /**
   * Sync data between Stripe and HubSpot
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
      result.errors.push('Not connected to Stripe');
      result.duration = Date.now() - startTime;
      return result;
    }

    try {
      if (this.config.syncCustomers) {
        const customerResult = await this.syncCustomers();
        result.recordsCreated += customerResult.created;
        result.recordsUpdated += customerResult.updated;
        result.recordsSkipped += customerResult.skipped;
      }

      if (this.config.syncSubscriptions) {
        const subscriptionResult = await this.syncSubscriptions();
        result.recordsCreated += subscriptionResult.created;
        result.recordsUpdated += subscriptionResult.updated;
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
   * Sync customers from Stripe to HubSpot
   */
  private async syncCustomers(): Promise<{ created: number; updated: number; skipped: number }> {
    // In a real implementation:
    // 1. List customers from Stripe
    // 2. Map to HubSpot contacts
    // 3. Create/update via HubSpot API
    
    return { created: 0, updated: 0, skipped: 0 };
  }

  /**
   * Sync subscriptions from Stripe to HubSpot deals
   */
  private async syncSubscriptions(): Promise<{ created: number; updated: number }> {
    // In a real implementation:
    // 1. List active subscriptions from Stripe
    // 2. Match to HubSpot contacts
    // 3. Create/update deals with subscription data
    // 4. Calculate MRR and add to deal properties
    
    return { created: 0, updated: 0 };
  }

  /**
   * Sync payments from Stripe to HubSpot
   */
  private async syncPayments(): Promise<{ updated: number }> {
    // In a real implementation:
    // 1. List recent charges from Stripe
    // 2. Match to HubSpot deals
    // 3. Update payment status
    // 4. Add payment to deal timeline
    
    return { updated: 0 };
  }

  /**
   * Map Stripe customer to HubSpot contact
   */
  mapCustomerToContact(customer: StripeCustomer): Partial<Contact> {
    const nameParts = (customer.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      id: '',
      properties: {
        firstname: firstName,
        lastname: lastName,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        address: customer.address?.line1 || undefined,
        city: customer.address?.city || undefined,
        state: customer.address?.state || undefined,
        zip: customer.address?.postal_code || undefined,
        stripe_customer_id: customer.id,
      },
    };
  }

  /**
   * Map Stripe subscription to HubSpot deal
   */
  mapSubscriptionToDeal(subscription: StripeSubscription): Partial<Deal> {
    const mrr = this.calculateMRR(subscription);
    const arr = mrr * 12;

    return {
      id: '',
      properties: {
        dealname: `Subscription ${subscription.id}`,
        amount: String(arr),
        dealstage: this.mapSubscriptionStatus(subscription.status),
        closedate: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        mrr: String(mrr),
        arr: String(arr),
      },
    };
  }

  /**
   * Calculate Monthly Recurring Revenue for a subscription
   */
  calculateMRR(subscription: StripeSubscription): number {
    let mrr = 0;

    for (const item of subscription.items.data) {
      const unitAmount = (item.price.unit_amount || 0) / 100;
      const quantity = item.quantity;
      const interval = item.price.recurring?.interval;
      const intervalCount = item.price.recurring?.interval_count || 1;

      let monthlyAmount = unitAmount * quantity;

      switch (interval) {
        case 'day':
          monthlyAmount = monthlyAmount * 30 / intervalCount;
          break;
        case 'week':
          monthlyAmount = monthlyAmount * 4.33 / intervalCount;
          break;
        case 'month':
          monthlyAmount = monthlyAmount / intervalCount;
          break;
        case 'year':
          monthlyAmount = monthlyAmount / (12 * intervalCount);
          break;
      }

      mrr += monthlyAmount;
    }

    return Math.round(mrr * 100) / 100;
  }

  /**
   * Map Stripe subscription status to HubSpot deal stage
   */
  private mapSubscriptionStatus(status: StripeSubscription['status']): string {
    const statusMap: Record<StripeSubscription['status'], string> = {
      trialing: 'trial',
      active: 'closedwon',
      past_due: 'at_risk',
      unpaid: 'at_risk',
      canceled: 'closedlost',
      incomplete: 'pending',
    };

    return statusMap[status] || 'pending';
  }

  /**
   * Get deal timeline entry for payment
   */
  createPaymentTimelineEntry(charge: StripeCharge): {
    eventTemplateId: string;
    tokens: Record<string, string>;
  } {
    return {
      eventTemplateId: 'stripe_payment',
      tokens: {
        payment_amount: String(charge.amount / 100),
        payment_currency: charge.currency.toUpperCase(),
        payment_date: new Date(charge.created * 1000).toISOString(),
        payment_status: charge.status,
        stripe_charge_id: charge.id,
      },
    };
  }

  /**
   * Handle webhook event from Stripe
   */
  async handleWebhook(event: { type: string; data: { object: unknown } }): Promise<void> {
    switch (event.type) {
      case 'customer.created':
      case 'customer.updated':
        // Sync customer to HubSpot
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        // Sync subscription to HubSpot deal
        break;
      
      case 'invoice.paid':
      case 'invoice.payment_failed':
        // Update deal payment status
        break;
      
      case 'charge.succeeded':
        // Add payment to timeline
        break;
    }
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
}
