/**
 * Billing Gap Detection Module
 * Identifies gaps between service delivery and billing
 */

import { Deal, Invoice, Contract, Job, Placement, RevenueLeak, RecoveryAction } from '../types';
import { generateId, daysBetween } from '../utils/helpers';

export interface BillingGapConfig {
  maxBillingDelayDays: number; // Maximum acceptable days between service and billing
  minimumGapAmount: number; // Minimum gap amount to flag
  invoiceFrequencyDays: number; // Expected invoice frequency for recurring billing
}

const DEFAULT_CONFIG: BillingGapConfig = {
  maxBillingDelayDays: 30,
  minimumGapAmount: 500,
  invoiceFrequencyDays: 30,
};

export interface BillingData {
  entity: Deal | Contract | Job | Placement;
  entityType: 'deal' | 'contract' | 'job' | 'placement';
  invoices: Invoice[];
  expectedBillingDates: Date[];
  deliveryDates: Date[];
}

export class BillingGapDetector {
  private config: BillingGapConfig;

  constructor(config: Partial<BillingGapConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze billing data for gaps
   */
  analyzeBillingGaps(billingData: BillingData[]): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];

    for (const data of billingData) {
      // Check for unbilled deliveries
      const unbilledDeliveries = this.findUnbilledDeliveries(data);
      
      for (const unbilledDelivery of unbilledDeliveries) {
        const gapAmount = unbilledDelivery.expectedAmount;
        
        if (gapAmount >= this.config.minimumGapAmount) {
          leaks.push({
            id: generateId(),
            type: 'billing_gap',
            severity: this.calculateSeverity(gapAmount, unbilledDelivery.daysSinceDelivery),
            description: `${data.entityType} has unbilled delivery from ${unbilledDelivery.deliveryDate.toISOString().split('T')[0]}`,
            potentialRevenue: gapAmount,
            affectedEntity: {
              type: data.entityType,
              id: data.entity.id,
              name: this.getEntityName(data),
            },
            detectedAt: new Date(),
            suggestedActions: this.generateUnbilledActions(data, unbilledDelivery),
            metadata: {
              deliveryDate: unbilledDelivery.deliveryDate,
              daysSinceDelivery: unbilledDelivery.daysSinceDelivery,
              expectedAmount: gapAmount,
            },
          });
        }
      }

      // Check for missed recurring invoices
      const missedRecurring = this.findMissedRecurringInvoices(data);
      
      for (const missed of missedRecurring) {
        leaks.push({
          id: generateId(),
          type: 'billing_gap',
          severity: this.calculateSeverity(missed.expectedAmount, missed.daysOverdue),
          description: `Missing ${missed.count} recurring invoice(s) for ${data.entityType}`,
          potentialRevenue: missed.expectedAmount * missed.count,
          affectedEntity: {
            type: data.entityType,
            id: data.entity.id,
            name: this.getEntityName(data),
          },
          detectedAt: new Date(),
          suggestedActions: this.generateRecurringActions(data, missed),
          metadata: {
            missedCount: missed.count,
            lastInvoiceDate: missed.lastInvoiceDate,
            expectedAmount: missed.expectedAmount,
          },
        });
      }
    }

    return leaks;
  }

  /**
   * Analyze invoices for collection gaps
   */
  analyzeInvoiceCollection(invoices: Invoice[]): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];
    const today = new Date();

    for (const invoice of invoices) {
      const status = invoice.properties.hs_invoice_status;
      const dueDate = invoice.properties.hs_due_date;
      const amount = parseFloat(invoice.properties.hs_amount_billed || '0');

      if (!dueDate || status === 'paid') {
        continue;
      }

      const dueDateObj = new Date(dueDate);
      const daysOverdue = daysBetween(dueDateObj, today);

      // Flag overdue invoices
      if (daysOverdue > 0 && amount >= this.config.minimumGapAmount) {
        leaks.push({
          id: generateId(),
          type: 'billing_gap',
          severity: this.calculateCollectionSeverity(daysOverdue, amount),
          description: `Invoice ${invoice.properties.hs_invoice_number} is ${daysOverdue} days overdue`,
          potentialRevenue: amount,
          affectedEntity: {
            type: 'invoice',
            id: invoice.id,
            name: invoice.properties.hs_invoice_number,
          },
          detectedAt: new Date(),
          suggestedActions: this.generateCollectionActions(invoice, daysOverdue),
          metadata: {
            invoiceNumber: invoice.properties.hs_invoice_number,
            dueDate,
            daysOverdue,
            amount,
            status,
          },
        });
      }
    }

    return leaks;
  }

  /**
   * Analyze deals for missing invoices
   */
  analyzeDeals(deals: Deal[], invoicesByDeal: Map<string, Invoice[]>): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];

    for (const deal of deals) {
      if (deal.properties.dealstage !== 'closedwon') {
        continue;
      }

      const dealAmount = parseFloat(deal.properties.amount || '0');
      const dealInvoices = invoicesByDeal.get(deal.id) || [];
      
      const totalInvoiced = dealInvoices.reduce((sum, inv) => {
        return sum + parseFloat(inv.properties.hs_amount_billed || '0');
      }, 0);

      const billingGap = dealAmount - totalInvoiced;

      if (billingGap >= this.config.minimumGapAmount) {
        const closedDate = deal.properties.closedate ? new Date(deal.properties.closedate) : new Date();
        const daysSinceClosed = daysBetween(closedDate, new Date());

        if (daysSinceClosed > this.config.maxBillingDelayDays) {
          leaks.push({
            id: generateId(),
            type: 'billing_gap',
            severity: this.calculateSeverity(billingGap, daysSinceClosed),
            description: `Deal "${deal.properties.dealname}" has $${billingGap.toFixed(2)} unbilled`,
            potentialRevenue: billingGap,
            affectedEntity: {
              type: 'deal',
              id: deal.id,
              name: deal.properties.dealname,
            },
            detectedAt: new Date(),
            suggestedActions: this.generateDealBillingActions(deal, billingGap),
            metadata: {
              dealAmount,
              totalInvoiced,
              billingGap,
              daysSinceClosed,
              invoiceCount: dealInvoices.length,
            },
          });
        }
      }
    }

    return leaks;
  }

  private findUnbilledDeliveries(data: BillingData): Array<{ deliveryDate: Date; expectedAmount: number; daysSinceDelivery: number }> {
    const unbilled: Array<{ deliveryDate: Date; expectedAmount: number; daysSinceDelivery: number }> = [];
    const today = new Date();
    
    // Get invoiced dates for comparison
    const invoicedDates = new Set(
      data.invoices.map(inv => {
        const date = inv.properties.hs_due_date;
        return date ? new Date(date).toISOString().split('T')[0] : null;
      }).filter(Boolean)
    );

    for (const deliveryDate of data.deliveryDates) {
      const deliveryDateStr = deliveryDate.toISOString().split('T')[0];
      const daysSinceDelivery = daysBetween(deliveryDate, today);

      // Check if this delivery has been billed (within a 7-day window)
      let isBilled = false;
      for (const invoicedDate of invoicedDates) {
        const invoiceDateObj = new Date(invoicedDate as string);
        const daysDiff = Math.abs(daysBetween(deliveryDate, invoiceDateObj));
        if (daysDiff <= 7) {
          isBilled = true;
          break;
        }
      }

      if (!isBilled && daysSinceDelivery > this.config.maxBillingDelayDays) {
        unbilled.push({
          deliveryDate,
          expectedAmount: this.estimateDeliveryAmount(data),
          daysSinceDelivery,
        });
      }
    }

    return unbilled;
  }

  private findMissedRecurringInvoices(data: BillingData): Array<{ count: number; expectedAmount: number; lastInvoiceDate: Date | null; daysOverdue: number }> {
    const results: Array<{ count: number; expectedAmount: number; lastInvoiceDate: Date | null; daysOverdue: number }> = [];
    
    if (data.invoices.length === 0) {
      return results;
    }

    // Sort invoices by date
    const sortedInvoices = [...data.invoices].sort((a, b) => {
      const dateA = new Date(a.properties.hs_due_date || 0);
      const dateB = new Date(b.properties.hs_due_date || 0);
      return dateB.getTime() - dateA.getTime();
    });

    const lastInvoice = sortedInvoices[0];
    const lastInvoiceDate = lastInvoice.properties.hs_due_date 
      ? new Date(lastInvoice.properties.hs_due_date)
      : null;

    if (!lastInvoiceDate) {
      return results;
    }

    const today = new Date();
    const daysSinceLastInvoice = daysBetween(lastInvoiceDate, today);
    
    // Calculate how many invoices should have been generated
    const missedCount = Math.floor(daysSinceLastInvoice / this.config.invoiceFrequencyDays) - 1;

    if (missedCount > 0) {
      const avgAmount = data.invoices.reduce((sum, inv) => 
        sum + parseFloat(inv.properties.hs_amount_billed || '0'), 0
      ) / data.invoices.length;

      results.push({
        count: missedCount,
        expectedAmount: avgAmount,
        lastInvoiceDate,
        daysOverdue: daysSinceLastInvoice - this.config.invoiceFrequencyDays,
      });
    }

    return results;
  }

  private estimateDeliveryAmount(data: BillingData): number {
    // Estimate based on entity value
    const entityValue = this.getEntityValue(data);
    
    // If there are existing invoices, use average
    if (data.invoices.length > 0) {
      const avgInvoice = data.invoices.reduce((sum, inv) => 
        sum + parseFloat(inv.properties.hs_amount_billed || '0'), 0
      ) / data.invoices.length;
      return avgInvoice;
    }

    return entityValue;
  }

  private getEntityValue(data: BillingData): number {
    switch (data.entityType) {
      case 'deal':
        return parseFloat((data.entity as Deal).properties.amount || '0');
      case 'contract':
        return parseFloat((data.entity as Contract).properties.contract_value || '0');
      case 'job':
        return parseFloat((data.entity as Job).properties.job_value || '0');
      case 'placement':
        return parseFloat((data.entity as Placement).properties.placement_value || '0');
      default:
        return 0;
    }
  }

  private getEntityName(data: BillingData): string | undefined {
    switch (data.entityType) {
      case 'deal':
        return (data.entity as Deal).properties.dealname;
      case 'contract':
        return (data.entity as Contract).properties.contract_name;
      case 'job':
        return (data.entity as Job).properties.job_name;
      case 'placement':
        return (data.entity as Placement).properties.placement_name;
      default:
        return undefined;
    }
  }

  private calculateSeverity(amount: number, delayDays: number): 'low' | 'medium' | 'high' | 'critical' {
    if (amount >= 25000 || delayDays >= 90) return 'critical';
    if (amount >= 10000 || delayDays >= 60) return 'high';
    if (amount >= 5000 || delayDays >= 30) return 'medium';
    return 'low';
  }

  private calculateCollectionSeverity(daysOverdue: number, amount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (daysOverdue >= 90 || amount >= 50000) return 'critical';
    if (daysOverdue >= 60 || amount >= 25000) return 'high';
    if (daysOverdue >= 30 || amount >= 10000) return 'medium';
    return 'low';
  }

  private generateUnbilledActions(data: BillingData, unbilled: { deliveryDate: Date; expectedAmount: number }): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'create_task',
        title: 'Generate Invoice',
        description: `Create invoice for $${unbilled.expectedAmount.toFixed(2)} delivery on ${unbilled.deliveryDate.toISOString().split('T')[0]}`,
        priority: 'high',
        parameters: {
          taskType: 'TODO',
          subject: `Generate Invoice: ${this.getEntityName(data)}`,
        },
      },
      {
        id: generateId(),
        type: 'send_notification',
        title: 'Alert Billing Team',
        description: 'Notify billing team about unbilled delivery',
        priority: 'medium',
      },
    ];
  }

  private generateRecurringActions(data: BillingData, missed: { count: number; expectedAmount: number }): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'create_task',
        title: 'Generate Missing Invoices',
        description: `Create ${missed.count} missing recurring invoice(s) totaling $${(missed.expectedAmount * missed.count).toFixed(2)}`,
        priority: 'high',
        parameters: {
          taskType: 'TODO',
          subject: `Generate Missing Invoices: ${this.getEntityName(data)}`,
        },
      },
      {
        id: generateId(),
        type: 'manual_review',
        title: 'Review Billing Schedule',
        description: 'Verify recurring billing automation is functioning correctly',
        priority: 'medium',
      },
    ];
  }

  private generateCollectionActions(invoice: Invoice, daysOverdue: number): RecoveryAction[] {
    const actions: RecoveryAction[] = [
      {
        id: generateId(),
        type: 'create_task',
        title: 'Follow Up on Overdue Invoice',
        description: `Contact customer about invoice ${invoice.properties.hs_invoice_number} (${daysOverdue} days overdue)`,
        priority: daysOverdue >= 60 ? 'high' : 'medium',
        parameters: {
          taskType: 'CALL',
          subject: `Collections: Invoice ${invoice.properties.hs_invoice_number}`,
        },
      },
    ];

    if (daysOverdue >= 60) {
      actions.push({
        id: generateId(),
        type: 'send_notification',
        title: 'Escalate to Finance',
        description: 'Escalate significantly overdue invoice to finance team',
        priority: 'high',
      });
    }

    return actions;
  }

  private generateDealBillingActions(deal: Deal, billingGap: number): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'create_task',
        title: 'Review Deal Billing',
        description: `Investigate $${billingGap.toFixed(2)} billing gap for deal "${deal.properties.dealname}"`,
        priority: 'high',
        parameters: {
          taskType: 'TODO',
          subject: `Billing Gap: ${deal.properties.dealname}`,
        },
      },
      {
        id: generateId(),
        type: 'manual_review',
        title: 'Verify Delivery Status',
        description: 'Confirm services have been delivered and invoice should be created',
        priority: 'medium',
      },
    ];
  }
}

export default BillingGapDetector;
