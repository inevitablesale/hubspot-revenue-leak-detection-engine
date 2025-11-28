/**
 * Main Revenue Leak Detection Engine
 * Orchestrates all detection modules and aggregates results
 */

import {
  Deal,
  Contact,
  Company,
  Contract,
  Invoice,
  Job,
  Placement,
  RevenueLeak,
  LeakDetectionResult,
  LeakType,
  LeakSeverity,
} from '../types';

import { UnderbillingDetector, UnderbillingConfig } from './underbilling';
import { MissedRenewalsDetector, MissedRenewalsConfig } from './missed-renewals';
import { CrossSellDetector, CrossSellConfig, CustomerProfile } from './crosssell';
import { CSHandoffDetector, CSHandoffConfig, HandoffData } from './cs-handoff';
import { LifecyclePathValidator, LifecycleConfig, LifecycleHistory } from './lifecycle-validator';
import { BillingGapDetector, BillingGapConfig, BillingData } from './billing-gap';
import { generateId } from '../utils/helpers';

export interface EngineConfig {
  underbilling?: Partial<UnderbillingConfig>;
  missedRenewals?: Partial<MissedRenewalsConfig>;
  crossSell?: Partial<CrossSellConfig>;
  csHandoff?: Partial<CSHandoffConfig>;
  lifecycle?: Partial<LifecycleConfig>;
  billingGap?: Partial<BillingGapConfig>;
}

export interface DetectionInput {
  deals?: Deal[];
  contacts?: Contact[];
  companies?: Company[];
  contracts?: Contract[];
  invoices?: Invoice[];
  jobs?: Job[];
  placements?: Placement[];
  // Enrichment data
  averageDealValues?: Map<string, number>;
  lastActivityDates?: Map<string, Date>;
  customerProfiles?: CustomerProfile[];
  handoffData?: HandoffData[];
  lifecycleHistories?: LifecycleHistory[];
  billingData?: BillingData[];
  dealStageHistories?: Map<string, Array<{ stage: string; timestamp: Date }>>;
  invoicesByDeal?: Map<string, Invoice[]>;
  dealAssociations?: Map<string, Deal[]>;
}

export class RevenueLeakDetectionEngine {
  private underbillingDetector: UnderbillingDetector;
  private missedRenewalsDetector: MissedRenewalsDetector;
  private crossSellDetector: CrossSellDetector;
  private csHandoffDetector: CSHandoffDetector;
  private lifecycleValidator: LifecyclePathValidator;
  private billingGapDetector: BillingGapDetector;

  constructor(config: EngineConfig = {}) {
    this.underbillingDetector = new UnderbillingDetector(config.underbilling);
    this.missedRenewalsDetector = new MissedRenewalsDetector(config.missedRenewals);
    this.crossSellDetector = new CrossSellDetector(config.crossSell);
    this.csHandoffDetector = new CSHandoffDetector(config.csHandoff);
    this.lifecycleValidator = new LifecyclePathValidator(config.lifecycle);
    this.billingGapDetector = new BillingGapDetector(config.billingGap);
  }

  /**
   * Run all detection modules and aggregate results
   */
  async detectLeaks(input: DetectionInput): Promise<LeakDetectionResult> {
    const allLeaks: RevenueLeak[] = [];

    // Run underbilling detection
    if (input.deals && input.averageDealValues) {
      const dealLeaks = this.underbillingDetector.analyzeDeals(
        input.deals,
        input.averageDealValues
      );
      allLeaks.push(...dealLeaks);
    }

    if (input.contracts && input.invoices) {
      const contractLeaks = this.underbillingDetector.analyzeContracts(
        input.contracts,
        input.invoices
      );
      allLeaks.push(...contractLeaks);
    }

    // Run missed renewals detection
    if (input.contracts && input.lastActivityDates) {
      const renewalLeaks = this.missedRenewalsDetector.analyzeContracts(
        input.contracts,
        input.lastActivityDates
      );
      allLeaks.push(...renewalLeaks);
    }

    if (input.deals) {
      const dealRenewalLeaks = this.missedRenewalsDetector.analyzeDeals(input.deals);
      allLeaks.push(...dealRenewalLeaks);
    }

    // Run cross-sell detection
    if (input.customerProfiles) {
      const crossSellLeaks = this.crossSellDetector.analyzeCustomers(input.customerProfiles);
      allLeaks.push(...crossSellLeaks);
    }

    if (input.deals) {
      const dealCrossSellLeaks = this.crossSellDetector.analyzeDeals(input.deals);
      allLeaks.push(...dealCrossSellLeaks);
    }

    // Run CS handoff detection
    if (input.handoffData) {
      const handoffLeaks = this.csHandoffDetector.analyzeDeals(input.handoffData);
      allLeaks.push(...handoffLeaks);
    }

    if (input.contacts && input.dealAssociations) {
      const contactHandoffLeaks = this.csHandoffDetector.analyzeContacts(
        input.contacts,
        input.dealAssociations
      );
      allLeaks.push(...contactHandoffLeaks);
    }

    // Run lifecycle validation
    if (input.lifecycleHistories) {
      const lifecycleLeaks = this.lifecycleValidator.validateContacts(input.lifecycleHistories);
      allLeaks.push(...lifecycleLeaks);
    }

    if (input.deals && input.dealStageHistories) {
      const dealLifecycleLeaks = this.lifecycleValidator.validateDeals(
        input.deals,
        input.dealStageHistories
      );
      allLeaks.push(...dealLifecycleLeaks);
    }

    // Run billing gap detection
    if (input.billingData) {
      const billingLeaks = this.billingGapDetector.analyzeBillingGaps(input.billingData);
      allLeaks.push(...billingLeaks);
    }

    if (input.invoices) {
      const collectionLeaks = this.billingGapDetector.analyzeInvoiceCollection(input.invoices);
      allLeaks.push(...collectionLeaks);
    }

    if (input.deals && input.invoicesByDeal) {
      const dealBillingLeaks = this.billingGapDetector.analyzeDeals(
        input.deals,
        input.invoicesByDeal
      );
      allLeaks.push(...dealBillingLeaks);
    }

    // Generate summary
    const summary = this.generateSummary(allLeaks);

    return {
      leaks: allLeaks,
      summary,
      analyzedAt: new Date(),
    };
  }

  /**
   * Run specific detection module
   */
  async detectByType(
    type: LeakType,
    input: DetectionInput
  ): Promise<RevenueLeak[]> {
    switch (type) {
      case 'underbilling':
        const underbillingLeaks: RevenueLeak[] = [];
        if (input.deals && input.averageDealValues) {
          underbillingLeaks.push(
            ...this.underbillingDetector.analyzeDeals(input.deals, input.averageDealValues)
          );
        }
        if (input.contracts && input.invoices) {
          underbillingLeaks.push(
            ...this.underbillingDetector.analyzeContracts(input.contracts, input.invoices)
          );
        }
        return underbillingLeaks;

      case 'missed_renewal':
        const renewalLeaks: RevenueLeak[] = [];
        if (input.contracts && input.lastActivityDates) {
          renewalLeaks.push(
            ...this.missedRenewalsDetector.analyzeContracts(input.contracts, input.lastActivityDates)
          );
        }
        if (input.deals) {
          renewalLeaks.push(...this.missedRenewalsDetector.analyzeDeals(input.deals));
        }
        return renewalLeaks;

      case 'untriggered_crosssell':
        const crossSellLeaks: RevenueLeak[] = [];
        if (input.customerProfiles) {
          crossSellLeaks.push(
            ...this.crossSellDetector.analyzeCustomers(input.customerProfiles)
          );
        }
        if (input.deals) {
          crossSellLeaks.push(...this.crossSellDetector.analyzeDeals(input.deals));
        }
        return crossSellLeaks;

      case 'stalled_cs_handoff':
        const handoffLeaks: RevenueLeak[] = [];
        if (input.handoffData) {
          handoffLeaks.push(...this.csHandoffDetector.analyzeDeals(input.handoffData));
        }
        if (input.contacts && input.dealAssociations) {
          handoffLeaks.push(
            ...this.csHandoffDetector.analyzeContacts(input.contacts, input.dealAssociations)
          );
        }
        return handoffLeaks;

      case 'invalid_lifecycle_path':
        const lifecycleLeaks: RevenueLeak[] = [];
        if (input.lifecycleHistories) {
          lifecycleLeaks.push(
            ...this.lifecycleValidator.validateContacts(input.lifecycleHistories)
          );
        }
        if (input.deals && input.dealStageHistories) {
          lifecycleLeaks.push(
            ...this.lifecycleValidator.validateDeals(input.deals, input.dealStageHistories)
          );
        }
        return lifecycleLeaks;

      case 'billing_gap':
        const billingLeaks: RevenueLeak[] = [];
        if (input.billingData) {
          billingLeaks.push(...this.billingGapDetector.analyzeBillingGaps(input.billingData));
        }
        if (input.invoices) {
          billingLeaks.push(...this.billingGapDetector.analyzeInvoiceCollection(input.invoices));
        }
        if (input.deals && input.invoicesByDeal) {
          billingLeaks.push(...this.billingGapDetector.analyzeDeals(input.deals, input.invoicesByDeal));
        }
        return billingLeaks;

      default:
        return [];
    }
  }

  /**
   * Get leaks filtered by severity
   */
  filterBySeverity(leaks: RevenueLeak[], minSeverity: LeakSeverity): RevenueLeak[] {
    const severityOrder: LeakSeverity[] = ['low', 'medium', 'high', 'critical'];
    const minIndex = severityOrder.indexOf(minSeverity);
    
    return leaks.filter(leak => {
      const leakIndex = severityOrder.indexOf(leak.severity);
      return leakIndex >= minIndex;
    });
  }

  /**
   * Get leaks for a specific entity
   */
  getLeaksForEntity(
    leaks: RevenueLeak[],
    entityType: string,
    entityId: string
  ): RevenueLeak[] {
    return leaks.filter(
      leak => leak.affectedEntity.type === entityType && leak.affectedEntity.id === entityId
    );
  }

  /**
   * Sort leaks by potential revenue
   */
  sortByPotentialRevenue(leaks: RevenueLeak[], descending: boolean = true): RevenueLeak[] {
    return [...leaks].sort((a, b) => {
      const diff = a.potentialRevenue - b.potentialRevenue;
      return descending ? -diff : diff;
    });
  }

  /**
   * Generate detection summary
   */
  private generateSummary(leaks: RevenueLeak[]): LeakDetectionResult['summary'] {
    const byType: Record<LeakType, number> = {
      underbilling: 0,
      missed_renewal: 0,
      untriggered_crosssell: 0,
      stalled_cs_handoff: 0,
      invalid_lifecycle_path: 0,
      billing_gap: 0,
      stale_pipeline: 0,
      missed_handoff: 0,
      data_quality: 0,
    };

    const bySeverity: Record<LeakSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalPotentialRevenue = 0;

    for (const leak of leaks) {
      byType[leak.type]++;
      bySeverity[leak.severity]++;
      totalPotentialRevenue += leak.potentialRevenue;
    }

    return {
      totalLeaks: leaks.length,
      totalPotentialRevenue,
      byType,
      bySeverity,
    };
  }
}

// Export detection modules for individual use
export {
  UnderbillingDetector,
  MissedRenewalsDetector,
  CrossSellDetector,
  CSHandoffDetector,
  LifecyclePathValidator,
  BillingGapDetector,
};

export default RevenueLeakDetectionEngine;
