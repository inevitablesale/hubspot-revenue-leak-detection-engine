/**
 * Shopify Integration
 * Syncs customers, products, orders, and abandoned carts with HubSpot
 */

import { ShopifyConfig } from '../cli/config/types';
import { Contact, Deal } from '../types';
import { BaseIntegration, IntegrationStatus, SyncResult } from './index';

export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  orders_count: number;
  total_spent: string;
  created_at: string;
  updated_at: string;
  default_address?: {
    address1: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  };
  tags: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  status: 'active' | 'archived' | 'draft';
  variants: Array<{
    id: number;
    product_id: number;
    title: string;
    price: string;
    sku: string;
    inventory_quantity: number;
  }>;
  images: Array<{
    id: number;
    src: string;
  }>;
}

export interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided';
  fulfillment_status: 'fulfilled' | 'partial' | 'unfulfilled' | null;
  customer: ShopifyCustomer;
  line_items: Array<{
    id: number;
    product_id: number;
    variant_id: number;
    title: string;
    quantity: number;
    price: string;
    sku: string;
  }>;
}

export interface ShopifyAbandonedCheckout {
  id: number;
  token: string;
  email: string;
  created_at: string;
  completed_at: string | null;
  abandoned_checkout_url: string;
  total_price: string;
  currency: string;
  customer: ShopifyCustomer | null;
  line_items: Array<{
    product_id: number;
    variant_id: number;
    title: string;
    quantity: number;
    price: string;
  }>;
}

export class ShopifyIntegration extends BaseIntegration {
  private config: ShopifyConfig;

  constructor(config: ShopifyConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to Shopify API
   */
  async connect(): Promise<boolean> {
    if (!this.config.enabled) {
      this.status.error = 'Integration is not enabled';
      return false;
    }

    if (!this.config.shopDomain || !this.config.accessToken) {
      this.status.error = 'Missing Shopify credentials';
      return false;
    }

    try {
      // In a real implementation, validate credentials
      // const response = await this.makeRequest('/shop.json');

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
   * Disconnect from Shopify API
   */
  async disconnect(): Promise<void> {
    this.status.connected = false;
  }

  /**
   * Sync data between Shopify and HubSpot
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
      result.errors.push('Not connected to Shopify');
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

      if (this.config.syncProducts) {
        const productResult = await this.syncProducts();
        result.recordsCreated += productResult.created;
        result.recordsUpdated += productResult.updated;
      }

      if (this.config.syncOrders) {
        const orderResult = await this.syncOrders();
        result.recordsCreated += orderResult.created;
        result.recordsUpdated += orderResult.updated;
      }

      if (this.config.syncAbandonedCarts) {
        const cartResult = await this.syncAbandonedCarts();
        result.recordsCreated += cartResult.created;
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
   * Sync customers from Shopify to HubSpot
   */
  private async syncCustomers(): Promise<{ created: number; updated: number; skipped: number }> {
    // In a real implementation:
    // 1. List customers from Shopify
    // 2. Map to HubSpot contacts
    // 3. Create/update via HubSpot API
    
    return { created: 0, updated: 0, skipped: 0 };
  }

  /**
   * Sync products from Shopify to HubSpot
   */
  private async syncProducts(): Promise<{ created: number; updated: number }> {
    // In a real implementation:
    // 1. List products from Shopify
    // 2. Map to HubSpot products
    // 3. Create/update via HubSpot API
    
    return { created: 0, updated: 0 };
  }

  /**
   * Sync orders from Shopify to HubSpot deals
   */
  private async syncOrders(): Promise<{ created: number; updated: number }> {
    // In a real implementation:
    // 1. List orders from Shopify
    // 2. Match to HubSpot contacts
    // 3. Create deals for orders
    // 4. Add order items as line items
    
    return { created: 0, updated: 0 };
  }

  /**
   * Sync abandoned carts to HubSpot
   */
  private async syncAbandonedCarts(): Promise<{ created: number }> {
    // In a real implementation:
    // 1. List abandoned checkouts from Shopify
    // 2. Match to HubSpot contacts
    // 3. Create deals or update contact properties
    // 4. Trigger abandoned cart workflow
    
    return { created: 0 };
  }

  /**
   * Map Shopify customer to HubSpot contact
   */
  mapCustomerToContact(customer: ShopifyCustomer): Partial<Contact> {
    return {
      id: '',
      properties: {
        firstname: customer.first_name,
        lastname: customer.last_name,
        email: customer.email,
        phone: customer.phone || undefined,
        address: customer.default_address?.address1,
        city: customer.default_address?.city,
        state: customer.default_address?.province,
        zip: customer.default_address?.zip,
        shopify_customer_id: String(customer.id),
        total_orders: String(customer.orders_count),
        lifetime_value: customer.total_spent,
        shopify_tags: customer.tags,
      },
    };
  }

  /**
   * Map Shopify order to HubSpot deal
   */
  mapOrderToDeal(order: ShopifyOrder): Partial<Deal> {
    return {
      id: '',
      properties: {
        dealname: `Order #${order.order_number}`,
        amount: order.total_price,
        dealstage: this.mapOrderStatus(order.financial_status),
        closedate: order.created_at,
        shopify_order_id: String(order.id),
        order_number: String(order.order_number),
        fulfillment_status: order.fulfillment_status || 'unfulfilled',
        order_currency: order.currency,
        line_item_count: String(order.line_items.length),
      },
    };
  }

  /**
   * Map Shopify order status to HubSpot deal stage
   */
  private mapOrderStatus(status: ShopifyOrder['financial_status']): string {
    const statusMap: Record<ShopifyOrder['financial_status'], string> = {
      pending: 'pending',
      authorized: 'pending',
      partially_paid: 'pending',
      paid: 'closedwon',
      partially_refunded: 'closedwon',
      refunded: 'closedlost',
      voided: 'closedlost',
    };

    return statusMap[status] || 'pending';
  }

  /**
   * Map abandoned checkout to HubSpot deal
   */
  mapAbandonedCartToDeal(checkout: ShopifyAbandonedCheckout): Partial<Deal> {
    return {
      id: '',
      properties: {
        dealname: `Abandoned Cart ${checkout.id}`,
        amount: checkout.total_price,
        dealstage: 'abandoned_cart',
        shopify_checkout_id: String(checkout.id),
        abandoned_checkout_url: checkout.abandoned_checkout_url,
        cart_created_at: checkout.created_at,
        cart_currency: checkout.currency,
      },
    };
  }

  /**
   * Generate HubSpot tracking code snippet
   */
  getTrackingCodeSnippet(hubspotId: string): string {
    return `
<!-- HubSpot Tracking Code for Shopify -->
<script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/${hubspotId}.js"></script>
<script>
  // Track Shopify events
  window.hsConversationsSettings = {
    loadImmediately: true
  };
</script>
    `.trim();
  }

  /**
   * Handle webhook event from Shopify
   */
  async handleWebhook(topic: string, data: unknown): Promise<void> {
    switch (topic) {
      case 'customers/create':
      case 'customers/update':
        // Sync customer to HubSpot
        break;
      
      case 'orders/create':
      case 'orders/updated':
        // Sync order to HubSpot deal
        break;
      
      case 'orders/paid':
        // Update deal status
        break;
      
      case 'orders/fulfilled':
        // Update fulfillment status
        break;
      
      case 'checkouts/create':
      case 'checkouts/update':
        // Track abandoned cart
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

  /**
   * Get default field mappings
   */
  static getDefaultFieldMappings(): Record<string, string> {
    return {
      'id': 'shopify_customer_id',
      'email': 'email',
      'first_name': 'firstname',
      'last_name': 'lastname',
      'total_spent': 'lifetime_value',
      'orders_count': 'total_orders',
      'variant.sku': 'hs_sku',
      'variant.price': 'price',
    };
  }
}
