/**
 * CS Handoff Detection Module
 * Detects stalled customer success handoffs from sales
 */

import { Deal, Contact, RevenueLeak, RecoveryAction } from '../types';
import { generateId, daysBetween } from '../utils/helpers';

export interface CSHandoffConfig {
  maxHandoffDays: number; // Maximum days for handoff to complete
  requiredHandoffStages: string[]; // Deal stages that require CS handoff
  csOwnerProperty: string; // Property name for CS owner assignment
  minimumDealValue: number;
}

const DEFAULT_CONFIG: CSHandoffConfig = {
  maxHandoffDays: 7,
  requiredHandoffStages: ['closedwon', 'onboarding', 'implementation'],
  csOwnerProperty: 'cs_owner',
  minimumDealValue: 2500,
};

export interface HandoffData {
  deal: Deal;
  salesOwner?: string;
  csOwner?: string;
  closedDate?: Date;
  handoffDate?: Date;
  onboardingStartDate?: Date;
}

export class CSHandoffDetector {
  private config: CSHandoffConfig;

  constructor(config: Partial<CSHandoffConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze deals for stalled CS handoffs
   */
  analyzeDeals(handoffData: HandoffData[]): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];
    const today = new Date();

    for (const data of handoffData) {
      const dealValue = parseFloat(data.deal.properties.amount || '0');
      
      if (dealValue < this.config.minimumDealValue) {
        continue;
      }

      const dealStage = data.deal.properties.dealstage;
      
      // Check if deal is in a stage requiring handoff
      if (!dealStage || !this.config.requiredHandoffStages.includes(dealStage)) {
        continue;
      }

      // Check for missing CS owner on won deals
      if (dealStage === 'closedwon' && !data.csOwner) {
        const closedDate = data.closedDate || new Date(data.deal.properties.closedate || Date.now());
        const daysSinceClosed = daysBetween(closedDate, today);

        if (daysSinceClosed > this.config.maxHandoffDays) {
          leaks.push({
            id: generateId(),
            type: 'stalled_cs_handoff',
            severity: this.calculateSeverity(daysSinceClosed, dealValue),
            description: `Deal "${data.deal.properties.dealname}" closed ${daysSinceClosed} days ago with no CS owner assigned`,
            potentialRevenue: this.calculateChurnRisk(dealValue, daysSinceClosed),
            affectedEntity: {
              type: 'deal',
              id: data.deal.id,
              name: data.deal.properties.dealname,
            },
            detectedAt: new Date(),
            suggestedActions: this.generateMissingOwnerActions(data),
            metadata: {
              dealValue,
              daysSinceClosed,
              salesOwner: data.salesOwner,
              dealStage,
            },
          });
        }
      }

      // Check for delayed onboarding start
      if (data.handoffDate && !data.onboardingStartDate) {
        const daysSinceHandoff = daysBetween(data.handoffDate, today);

        if (daysSinceHandoff > this.config.maxHandoffDays) {
          leaks.push({
            id: generateId(),
            type: 'stalled_cs_handoff',
            severity: this.calculateSeverity(daysSinceHandoff, dealValue),
            description: `Deal "${data.deal.properties.dealname}" handed off ${daysSinceHandoff} days ago but onboarding hasn't started`,
            potentialRevenue: this.calculateChurnRisk(dealValue, daysSinceHandoff),
            affectedEntity: {
              type: 'deal',
              id: data.deal.id,
              name: data.deal.properties.dealname,
            },
            detectedAt: new Date(),
            suggestedActions: this.generateDelayedOnboardingActions(data),
            metadata: {
              dealValue,
              daysSinceHandoff,
              handoffDate: data.handoffDate.toISOString(),
              csOwner: data.csOwner,
            },
          });
        }
      }
    }

    return leaks;
  }

  /**
   * Analyze contacts for dropped handoffs
   */
  analyzeContacts(contacts: Contact[], dealAssociations: Map<string, Deal[]>): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];
    const today = new Date();

    for (const contact of contacts) {
      const lifecycleStage = contact.properties.lifecyclestage;
      
      // Check contacts stuck in "customer" stage without recent activity
      if (lifecycleStage === 'customer') {
        const associatedDeals = dealAssociations.get(contact.id) || [];
        const wonDeals = associatedDeals.filter(d => d.properties.dealstage === 'closedwon');
        
        if (wonDeals.length > 0) {
          const totalValue = wonDeals.reduce((sum, d) => sum + parseFloat(d.properties.amount || '0'), 0);
          const latestDeal = wonDeals.sort((a, b) => {
            const dateA = new Date(a.properties.closedate || 0);
            const dateB = new Date(b.properties.closedate || 0);
            return dateB.getTime() - dateA.getTime();
          })[0];

          const closedDate = new Date(latestDeal.properties.closedate || Date.now());
          const daysSinceClosed = daysBetween(closedDate, today);

          // Flag if new customer with no follow-up in extended period
          if (daysSinceClosed > this.config.maxHandoffDays * 3 && daysSinceClosed < 90) {
            leaks.push({
              id: generateId(),
              type: 'stalled_cs_handoff',
              severity: 'medium',
              description: `New customer "${contact.properties.firstname} ${contact.properties.lastname}" may have been dropped during handoff`,
              potentialRevenue: totalValue * 0.2, // 20% churn risk
              affectedEntity: {
                type: 'contact',
                id: contact.id,
                name: `${contact.properties.firstname} ${contact.properties.lastname}`,
              },
              detectedAt: new Date(),
              suggestedActions: this.generateContactActions(contact, latestDeal),
              metadata: {
                totalValue,
                daysSinceClosed,
                dealCount: wonDeals.length,
              },
            });
          }
        }
      }
    }

    return leaks;
  }

  private calculateSeverity(delayDays: number, value: number): 'low' | 'medium' | 'high' | 'critical' {
    if (delayDays > 21 || value >= 50000) return 'critical';
    if (delayDays > 14 || value >= 25000) return 'high';
    if (delayDays > 7 || value >= 10000) return 'medium';
    return 'low';
  }

  private calculateChurnRisk(dealValue: number, delayDays: number): number {
    // Churn risk increases with delay
    const riskMultiplier = Math.min(0.5, delayDays * 0.02); // Max 50% risk
    return dealValue * riskMultiplier;
  }

  private generateMissingOwnerActions(data: HandoffData): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'update_property',
        title: 'Assign CS Owner',
        description: 'Immediately assign a customer success manager to this account',
        priority: 'high',
        parameters: {
          property: this.config.csOwnerProperty,
          objectType: 'deals',
          objectId: data.deal.id,
        },
      },
      {
        id: generateId(),
        type: 'create_task',
        title: 'Emergency Onboarding Call',
        description: 'Schedule urgent onboarding call with customer',
        priority: 'high',
        parameters: {
          taskType: 'CALL',
          subject: `Urgent Onboarding: ${data.deal.properties.dealname}`,
          dueDate: new Date().toISOString(),
        },
      },
      {
        id: generateId(),
        type: 'send_notification',
        title: 'Alert CS Manager',
        description: 'Notify CS management about dropped handoff',
        priority: 'high',
      },
    ];
  }

  private generateDelayedOnboardingActions(data: HandoffData): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'create_task',
        title: 'Kickoff Onboarding',
        description: `Start onboarding process immediately for ${data.deal.properties.dealname}`,
        priority: 'high',
        parameters: {
          taskType: 'MEETING',
          subject: `Onboarding Kickoff: ${data.deal.properties.dealname}`,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      {
        id: generateId(),
        type: 'trigger_workflow',
        title: 'Start Onboarding Sequence',
        description: 'Trigger automated onboarding email sequence',
        priority: 'medium',
        parameters: {
          workflowType: 'onboarding_sequence',
        },
      },
    ];
  }

  private generateContactActions(contact: Contact, deal: Deal): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'create_task',
        title: 'Customer Check-In',
        description: `Reach out to verify customer satisfaction and onboarding completion`,
        priority: 'medium',
        parameters: {
          taskType: 'CALL',
          subject: `Check-In: ${contact.properties.firstname} ${contact.properties.lastname}`,
        },
      },
      {
        id: generateId(),
        type: 'manual_review',
        title: 'Review Onboarding Status',
        description: 'Verify if customer has been properly onboarded',
        priority: 'medium',
      },
    ];
  }
}

export default CSHandoffDetector;
