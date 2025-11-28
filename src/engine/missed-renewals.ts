/**
 * Missed Renewals Detection Module
 * Detects contracts and deals approaching renewal that lack engagement
 */

import { Contract, Deal, RevenueLeak, RecoveryAction } from '../types';
import { generateId, daysBetween } from '../utils/helpers';

export interface MissedRenewalsConfig {
  renewalWindowDays: number; // Days before renewal to start monitoring
  inactivityThresholdDays: number; // Days of inactivity to flag as risk
  minimumContractValue: number; // Minimum value to track
}

const DEFAULT_CONFIG: MissedRenewalsConfig = {
  renewalWindowDays: 90,
  inactivityThresholdDays: 30,
  minimumContractValue: 5000,
};

export class MissedRenewalsDetector {
  private config: MissedRenewalsConfig;

  constructor(config: Partial<MissedRenewalsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze contracts for missed renewal opportunities
   */
  analyzeContracts(contracts: Contract[], lastActivityDates: Map<string, Date>): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];
    const today = new Date();

    for (const contract of contracts) {
      const contractValue = parseFloat(contract.properties.contract_value || '0');
      
      if (contractValue < this.config.minimumContractValue) {
        continue;
      }

      const renewalDateStr = contract.properties.renewal_date;
      if (!renewalDateStr) {
        continue;
      }

      const renewalDate = new Date(renewalDateStr);
      const daysUntilRenewal = daysBetween(today, renewalDate);

      // Check if within renewal window
      if (daysUntilRenewal > 0 && daysUntilRenewal <= this.config.renewalWindowDays) {
        const lastActivity = lastActivityDates.get(contract.id);
        const daysSinceActivity = lastActivity 
          ? daysBetween(lastActivity, today)
          : this.config.inactivityThresholdDays + 1;

        // Flag if no recent activity
        if (daysSinceActivity > this.config.inactivityThresholdDays) {
          leaks.push({
            id: generateId(),
            type: 'missed_renewal',
            severity: this.calculateSeverity(daysUntilRenewal, contractValue),
            description: `Contract "${contract.properties.contract_name}" renews in ${daysUntilRenewal} days with no recent engagement`,
            potentialRevenue: contractValue,
            affectedEntity: {
              type: 'contract',
              id: contract.id,
              name: contract.properties.contract_name,
            },
            detectedAt: new Date(),
            suggestedActions: this.generateActions(contract, daysUntilRenewal),
            metadata: {
              renewalDate: renewalDateStr,
              daysUntilRenewal,
              daysSinceActivity,
              contractValue,
            },
          });
        }
      }

      // Check for already missed renewals (past renewal date)
      if (daysUntilRenewal < 0 && contract.properties.contract_status !== 'renewed') {
        leaks.push({
          id: generateId(),
          type: 'missed_renewal',
          severity: 'critical',
          description: `Contract "${contract.properties.contract_name}" renewal was missed ${Math.abs(daysUntilRenewal)} days ago`,
          potentialRevenue: contractValue,
          affectedEntity: {
            type: 'contract',
            id: contract.id,
            name: contract.properties.contract_name,
          },
          detectedAt: new Date(),
          suggestedActions: this.generateUrgentActions(contract),
          metadata: {
            renewalDate: renewalDateStr,
            daysOverdue: Math.abs(daysUntilRenewal),
            contractValue,
          },
        });
      }
    }

    return leaks;
  }

  /**
   * Analyze deals with recurring revenue for renewal risks
   */
  analyzeDeals(deals: Deal[]): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];
    const today = new Date();

    for (const deal of deals) {
      const closeDate = deal.properties.closedate;
      const dealStage = deal.properties.dealstage;
      const amount = parseFloat(deal.properties.amount || '0');

      if (!closeDate || !dealStage) {
        continue;
      }

      const closeDateObj = new Date(closeDate);
      const daysPastClose = daysBetween(closeDateObj, today);

      // Check for stale won deals that might need renewal follow-up
      if (dealStage === 'closedwon' && daysPastClose > 365 - this.config.renewalWindowDays) {
        leaks.push({
          id: generateId(),
          type: 'missed_renewal',
          severity: 'medium',
          description: `Deal "${deal.properties.dealname}" closed ${daysPastClose} days ago - check for renewal opportunity`,
          potentialRevenue: amount,
          affectedEntity: {
            type: 'deal',
            id: deal.id,
            name: deal.properties.dealname,
          },
          detectedAt: new Date(),
          suggestedActions: this.generateDealActions(deal),
          metadata: {
            closeDate,
            daysPastClose,
            amount,
          },
        });
      }
    }

    return leaks;
  }

  private calculateSeverity(daysUntilRenewal: number, value: number): 'low' | 'medium' | 'high' | 'critical' {
    if (daysUntilRenewal <= 14 || value >= 50000) return 'critical';
    if (daysUntilRenewal <= 30 || value >= 25000) return 'high';
    if (daysUntilRenewal <= 60 || value >= 10000) return 'medium';
    return 'low';
  }

  private generateActions(contract: Contract, daysUntilRenewal: number): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'create_task',
        title: 'Schedule Renewal Discussion',
        description: `Contact customer before ${contract.properties.renewal_date} to discuss renewal`,
        priority: daysUntilRenewal <= 30 ? 'high' : 'medium',
        parameters: {
          taskType: 'CALL',
          subject: `Renewal Discussion: ${contract.properties.contract_name}`,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      {
        id: generateId(),
        type: 'trigger_workflow',
        title: 'Trigger Renewal Sequence',
        description: 'Start automated renewal nurture sequence',
        priority: 'medium',
        parameters: {
          workflowType: 'renewal_nurture',
        },
      },
    ];
  }

  private generateUrgentActions(contract: Contract): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'create_task',
        title: 'Urgent: Recover Lapsed Contract',
        description: `Immediately contact customer to recover lapsed contract: ${contract.properties.contract_name}`,
        priority: 'high',
        parameters: {
          taskType: 'CALL',
          subject: `URGENT: Contract Recovery - ${contract.properties.contract_name}`,
          dueDate: new Date().toISOString(),
        },
      },
      {
        id: generateId(),
        type: 'send_notification',
        title: 'Alert Account Manager',
        description: 'Notify account manager about lapsed contract',
        priority: 'high',
      },
    ];
  }

  private generateDealActions(deal: Deal): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'create_task',
        title: 'Review for Renewal',
        description: `Check if deal "${deal.properties.dealname}" has active subscription requiring renewal`,
        priority: 'medium',
        parameters: {
          taskType: 'TODO',
          subject: `Renewal Check: ${deal.properties.dealname}`,
        },
      },
    ];
  }
}

export default MissedRenewalsDetector;
