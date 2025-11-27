/**
 * Underbilling Detection Module
 * Detects cases where deals or contracts are billing less than expected
 */

import { Deal, Contract, Invoice, RevenueLeak, RecoveryAction } from '../types';
import { generateId } from '../utils/helpers';

export interface UnderbillingConfig {
  expectedMarginThreshold: number; // Expected profit margin (e.g., 0.20 for 20%)
  minimumDealValue: number; // Minimum deal value to analyze
  discountThreshold: number; // Maximum acceptable discount percentage
}

const DEFAULT_CONFIG: UnderbillingConfig = {
  expectedMarginThreshold: 0.20,
  minimumDealValue: 1000,
  discountThreshold: 0.15,
};

export class UnderbillingDetector {
  private config: UnderbillingConfig;

  constructor(config: Partial<UnderbillingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze deals for underbilling patterns
   */
  analyzeDeals(deals: Deal[], averageValues: Map<string, number>): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];

    for (const deal of deals) {
      const dealAmount = parseFloat(deal.properties.amount || '0');
      const pipeline = deal.properties.pipeline || 'default';
      const expectedAmount = averageValues.get(pipeline) || dealAmount;

      if (dealAmount < this.config.minimumDealValue) {
        continue;
      }

      // Check if deal is significantly below average
      const underbillingRatio = (expectedAmount - dealAmount) / expectedAmount;
      
      if (underbillingRatio > this.config.discountThreshold) {
        const potentialRevenue = expectedAmount - dealAmount;
        
        leaks.push({
          id: generateId(),
          type: 'underbilling',
          severity: this.calculateSeverity(underbillingRatio),
          description: `Deal "${deal.properties.dealname}" is ${Math.round(underbillingRatio * 100)}% below average pipeline value`,
          potentialRevenue,
          affectedEntity: {
            type: 'deal',
            id: deal.id,
            name: deal.properties.dealname,
          },
          detectedAt: new Date(),
          suggestedActions: this.generateActions(deal, potentialRevenue),
          metadata: {
            dealAmount,
            expectedAmount,
            underbillingRatio,
            pipeline,
          },
        });
      }
    }

    return leaks;
  }

  /**
   * Analyze contracts for underbilling
   */
  analyzeContracts(contracts: Contract[], invoices: Invoice[]): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];
    
    // Create invoice lookup by contract
    const invoicesByContract = new Map<string, Invoice[]>();
    
    for (const contract of contracts) {
      const contractValue = parseFloat(contract.properties.contract_value || '0');
      const contractInvoices = invoicesByContract.get(contract.id) || [];
      
      const totalInvoiced = contractInvoices.reduce((sum, inv) => {
        return sum + parseFloat(inv.properties.hs_amount_billed || '0');
      }, 0);

      const billingGap = contractValue - totalInvoiced;
      
      if (billingGap > this.config.minimumDealValue) {
        leaks.push({
          id: generateId(),
          type: 'underbilling',
          severity: this.calculateSeverity(billingGap / contractValue),
          description: `Contract "${contract.properties.contract_name}" has $${billingGap.toFixed(2)} in unbilled value`,
          potentialRevenue: billingGap,
          affectedEntity: {
            type: 'contract',
            id: contract.id,
            name: contract.properties.contract_name,
          },
          detectedAt: new Date(),
          suggestedActions: this.generateContractActions(contract, billingGap),
          metadata: {
            contractValue,
            totalInvoiced,
            billingGap,
          },
        });
      }
    }

    return leaks;
  }

  private calculateSeverity(ratio: number): 'low' | 'medium' | 'high' | 'critical' {
    if (ratio >= 0.5) return 'critical';
    if (ratio >= 0.35) return 'high';
    if (ratio >= 0.2) return 'medium';
    return 'low';
  }

  private generateActions(deal: Deal, potentialRevenue: number): RecoveryAction[] {
    const actions: RecoveryAction[] = [
      {
        id: generateId(),
        type: 'manual_review',
        title: 'Review Deal Pricing',
        description: `Review pricing strategy for deal "${deal.properties.dealname}" to recover $${potentialRevenue.toFixed(2)}`,
        priority: potentialRevenue > 10000 ? 'high' : 'medium',
      },
      {
        id: generateId(),
        type: 'create_task',
        title: 'Schedule Pricing Review Call',
        description: 'Schedule a call to discuss potential pricing adjustment or value-add services',
        priority: 'medium',
        parameters: {
          taskType: 'CALL',
          subject: `Pricing Review: ${deal.properties.dealname}`,
        },
      },
    ];

    return actions;
  }

  private generateContractActions(contract: Contract, billingGap: number): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'create_task',
        title: 'Generate Missing Invoice',
        description: `Create invoice for $${billingGap.toFixed(2)} unbilled contract value`,
        priority: 'high',
        parameters: {
          taskType: 'TODO',
          subject: `Invoice Gap: ${contract.properties.contract_name}`,
        },
      },
      {
        id: generateId(),
        type: 'send_notification',
        title: 'Notify Billing Team',
        description: 'Alert billing team about contract billing discrepancy',
        priority: 'high',
      },
    ];
  }
}

export default UnderbillingDetector;
