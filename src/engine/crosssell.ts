/**
 * Cross-Sell Detection Module
 * Identifies untriggered cross-sell opportunities based on customer profile
 */

import { Deal, Contact, Company, RevenueLeak, RecoveryAction } from '../types';
import { generateId } from '../utils/helpers';

export interface CrossSellConfig {
  minimumCustomerValue: number;
  productsEligibleForCrossSell: Map<string, string[]>;
  daysSinceLastPurchase: number;
}

const DEFAULT_CONFIG: CrossSellConfig = {
  minimumCustomerValue: 5000,
  productsEligibleForCrossSell: new Map([
    ['basic', ['professional', 'enterprise']],
    ['professional', ['enterprise', 'add-ons']],
    ['starter', ['growth', 'scale']],
  ]),
  daysSinceLastPurchase: 90,
};

export interface CustomerProfile {
  contact: Contact;
  company?: Company;
  deals: Deal[];
  totalValue: number;
  products: string[];
  lastPurchaseDate?: Date;
}

export class CrossSellDetector {
  private config: CrossSellConfig;

  constructor(config: Partial<CrossSellConfig> = {}) {
    this.config = { 
      ...DEFAULT_CONFIG, 
      ...config,
      productsEligibleForCrossSell: config.productsEligibleForCrossSell || DEFAULT_CONFIG.productsEligibleForCrossSell,
    };
  }

  /**
   * Analyze customer profiles for cross-sell opportunities
   */
  analyzeCustomers(profiles: CustomerProfile[]): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];

    for (const profile of profiles) {
      if (profile.totalValue < this.config.minimumCustomerValue) {
        continue;
      }

      const opportunities = this.findCrossSellOpportunities(profile);
      
      for (const opportunity of opportunities) {
        const estimatedValue = this.estimateCrossSellValue(profile, opportunity);
        
        leaks.push({
          id: generateId(),
          type: 'untriggered_crosssell',
          severity: this.calculateSeverity(estimatedValue, profile.totalValue),
          description: `Customer "${profile.company?.properties.name || profile.contact.properties.email}" is eligible for ${opportunity} but hasn't been contacted`,
          potentialRevenue: estimatedValue,
          affectedEntity: {
            type: profile.company ? 'company' : 'contact',
            id: profile.company?.id || profile.contact.id,
            name: profile.company?.properties.name || profile.contact.properties.email,
          },
          detectedAt: new Date(),
          suggestedActions: this.generateActions(profile, opportunity, estimatedValue),
          metadata: {
            currentProducts: profile.products,
            recommendedProduct: opportunity,
            totalCustomerValue: profile.totalValue,
            daysSinceLastPurchase: profile.lastPurchaseDate 
              ? Math.floor((Date.now() - profile.lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24))
              : null,
          },
        });
      }
    }

    return leaks;
  }

  /**
   * Analyze deals to find expansion opportunities
   */
  analyzeDeals(deals: Deal[]): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];
    
    // Group deals by company/contact
    const dealsByAssociation = new Map<string, Deal[]>();
    
    for (const deal of deals) {
      const companyId = deal.associations?.companies?.results[0]?.id;
      const contactId = deal.associations?.contacts?.results[0]?.id;
      const key = companyId || contactId || deal.id;
      
      const existing = dealsByAssociation.get(key) || [];
      existing.push(deal);
      dealsByAssociation.set(key, existing);
    }

    // Analyze each customer's deal history
    for (const [associationId, customerDeals] of dealsByAssociation.entries()) {
      const wonDeals = customerDeals.filter(d => d.properties.dealstage === 'closedwon');
      
      if (wonDeals.length === 0) {
        continue;
      }

      const totalValue = wonDeals.reduce((sum, d) => sum + parseFloat(d.properties.amount || '0'), 0);
      
      if (totalValue >= this.config.minimumCustomerValue) {
        // Check if there's been recent activity
        const latestDeal = wonDeals.sort((a, b) => {
          const dateA = new Date(a.properties.closedate || 0);
          const dateB = new Date(b.properties.closedate || 0);
          return dateB.getTime() - dateA.getTime();
        })[0];

        const daysSinceLastDeal = latestDeal.properties.closedate
          ? Math.floor((Date.now() - new Date(latestDeal.properties.closedate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        if (daysSinceLastDeal > this.config.daysSinceLastPurchase) {
          const estimatedExpansionValue = totalValue * 0.3; // Estimate 30% expansion potential
          
          leaks.push({
            id: generateId(),
            type: 'untriggered_crosssell',
            severity: this.calculateSeverity(estimatedExpansionValue, totalValue),
            description: `High-value customer (${wonDeals.length} deals, $${totalValue.toFixed(0)}) with no activity in ${daysSinceLastDeal} days`,
            potentialRevenue: estimatedExpansionValue,
            affectedEntity: {
              type: 'deal',
              id: latestDeal.id,
              name: latestDeal.properties.dealname,
            },
            detectedAt: new Date(),
            suggestedActions: this.generateExpansionActions(latestDeal, totalValue),
            metadata: {
              totalDeals: wonDeals.length,
              totalValue,
              daysSinceLastDeal,
              associationId,
            },
          });
        }
      }
    }

    return leaks;
  }

  private findCrossSellOpportunities(profile: CustomerProfile): string[] {
    const opportunities: string[] = [];
    
    for (const product of profile.products) {
      const eligibleProducts = this.config.productsEligibleForCrossSell.get(product.toLowerCase());
      
      if (eligibleProducts) {
        for (const eligible of eligibleProducts) {
          if (!profile.products.includes(eligible) && !opportunities.includes(eligible)) {
            opportunities.push(eligible);
          }
        }
      }
    }

    return opportunities;
  }

  private estimateCrossSellValue(profile: CustomerProfile, product: string): number {
    // Estimate based on current customer value and product tier
    const baseMultiplier = {
      'professional': 1.5,
      'enterprise': 2.5,
      'add-ons': 0.3,
      'growth': 1.2,
      'scale': 2.0,
    }[product.toLowerCase()] || 1.0;

    return profile.totalValue * baseMultiplier * 0.5; // Conservative 50% conversion estimate
  }

  private calculateSeverity(potentialValue: number, currentValue: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = potentialValue / currentValue;
    if (ratio >= 1.0 || potentialValue >= 50000) return 'critical';
    if (ratio >= 0.5 || potentialValue >= 25000) return 'high';
    if (ratio >= 0.25 || potentialValue >= 10000) return 'medium';
    return 'low';
  }

  private generateActions(profile: CustomerProfile, product: string, estimatedValue: number): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'create_task',
        title: `Cross-Sell Opportunity: ${product}`,
        description: `Contact customer about ${product} upgrade opportunity (Est. $${estimatedValue.toFixed(0)})`,
        priority: estimatedValue >= 25000 ? 'high' : 'medium',
        parameters: {
          taskType: 'CALL',
          subject: `Cross-Sell: ${product} for ${profile.company?.properties.name || profile.contact.properties.email}`,
        },
      },
      {
        id: generateId(),
        type: 'trigger_workflow',
        title: 'Start Cross-Sell Campaign',
        description: `Enroll customer in ${product} promotional campaign`,
        priority: 'medium',
        parameters: {
          workflowType: 'cross_sell_campaign',
          product,
        },
      },
    ];
  }

  private generateExpansionActions(deal: Deal, totalValue: number): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'create_task',
        title: 'Customer Health Check',
        description: `Schedule check-in with customer to identify expansion opportunities`,
        priority: totalValue >= 25000 ? 'high' : 'medium',
        parameters: {
          taskType: 'CALL',
          subject: `Customer Health Check: ${deal.properties.dealname}`,
        },
      },
      {
        id: generateId(),
        type: 'manual_review',
        title: 'Review Account for Expansion',
        description: 'Analyze customer usage and satisfaction for expansion opportunities',
        priority: 'medium',
      },
    ];
  }
}

export default CrossSellDetector;
