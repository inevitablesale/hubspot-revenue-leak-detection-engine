/**
 * Lifecycle Path Validation Module
 * Detects invalid or skipped lifecycle stage transitions
 */

import { Contact, Deal, RevenueLeak, RecoveryAction } from '../types';
import { generateId } from '../utils/helpers';

export interface LifecycleConfig {
  validTransitions: Map<string, string[]>;
  requiredStagesForDealWon: string[];
  stageOrder: string[];
}

const DEFAULT_CONFIG: LifecycleConfig = {
  validTransitions: new Map([
    ['subscriber', ['lead', 'marketingqualifiedlead']],
    ['lead', ['marketingqualifiedlead', 'salesqualifiedlead', 'opportunity']],
    ['marketingqualifiedlead', ['salesqualifiedlead', 'opportunity', 'customer']],
    ['salesqualifiedlead', ['opportunity', 'customer']],
    ['opportunity', ['customer', 'evangelist']],
    ['customer', ['evangelist', 'other']],
  ]),
  requiredStagesForDealWon: ['lead', 'opportunity'],
  stageOrder: [
    'subscriber',
    'lead',
    'marketingqualifiedlead',
    'salesqualifiedlead',
    'opportunity',
    'customer',
    'evangelist',
  ],
};

export interface LifecycleHistory {
  contact: Contact;
  stageHistory: Array<{
    stage: string;
    timestamp: Date;
  }>;
  associatedDeals?: Deal[];
}

export class LifecyclePathValidator {
  private config: LifecycleConfig;

  constructor(config: Partial<LifecycleConfig> = {}) {
    this.config = { 
      ...DEFAULT_CONFIG, 
      ...config,
      validTransitions: config.validTransitions || DEFAULT_CONFIG.validTransitions,
    };
  }

  /**
   * Validate lifecycle path for contacts
   */
  validateContacts(lifecycleHistories: LifecycleHistory[]): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];

    for (const history of lifecycleHistories) {
      // Check for skipped stages
      const skippedStages = this.findSkippedStages(history.stageHistory);
      
      if (skippedStages.length > 0) {
        const estimatedValue = this.estimateContactValue(history);
        
        leaks.push({
          id: generateId(),
          type: 'invalid_lifecycle_path',
          severity: this.calculateSeverity(skippedStages.length, estimatedValue),
          description: `Contact "${history.contact.properties.firstname} ${history.contact.properties.lastname}" skipped lifecycle stages: ${skippedStages.join(', ')}`,
          potentialRevenue: estimatedValue * 0.1, // Risk of incomplete data affecting conversion
          affectedEntity: {
            type: 'contact',
            id: history.contact.id,
            name: `${history.contact.properties.firstname} ${history.contact.properties.lastname}`,
          },
          detectedAt: new Date(),
          suggestedActions: this.generateSkippedStageActions(history, skippedStages),
          metadata: {
            skippedStages,
            currentStage: history.contact.properties.lifecyclestage,
            stageHistory: history.stageHistory,
          },
        });
      }

      // Check for invalid transitions
      const invalidTransitions = this.findInvalidTransitions(history.stageHistory);
      
      for (const transition of invalidTransitions) {
        leaks.push({
          id: generateId(),
          type: 'invalid_lifecycle_path',
          severity: 'medium',
          description: `Contact "${history.contact.properties.firstname} ${history.contact.properties.lastname}" had invalid transition from ${transition.from} to ${transition.to}`,
          potentialRevenue: 0,
          affectedEntity: {
            type: 'contact',
            id: history.contact.id,
            name: `${history.contact.properties.firstname} ${history.contact.properties.lastname}`,
          },
          detectedAt: new Date(),
          suggestedActions: this.generateTransitionActions(history, transition),
          metadata: {
            invalidTransition: transition,
            currentStage: history.contact.properties.lifecyclestage,
          },
        });
      }

      // Check for missing stages before deal won
      if (history.associatedDeals) {
        const wonDeals = history.associatedDeals.filter(d => d.properties.dealstage === 'closedwon');
        
        if (wonDeals.length > 0) {
          const missingRequiredStages = this.findMissingRequiredStages(history.stageHistory);
          
          if (missingRequiredStages.length > 0) {
            const totalDealValue = wonDeals.reduce((sum, d) => 
              sum + parseFloat(d.properties.amount || '0'), 0
            );

            leaks.push({
              id: generateId(),
              type: 'invalid_lifecycle_path',
              severity: 'high',
              description: `Contact "${history.contact.properties.firstname} ${history.contact.properties.lastname}" has won deals but never passed through: ${missingRequiredStages.join(', ')}`,
              potentialRevenue: totalDealValue * 0.05, // Risk of data quality issues
              affectedEntity: {
                type: 'contact',
                id: history.contact.id,
                name: `${history.contact.properties.firstname} ${history.contact.properties.lastname}`,
              },
              detectedAt: new Date(),
              suggestedActions: this.generateMissingStageActions(history, missingRequiredStages),
              metadata: {
                missingRequiredStages,
                wonDealsCount: wonDeals.length,
                totalDealValue,
              },
            });
          }
        }
      }
    }

    return leaks;
  }

  /**
   * Validate deal stage transitions
   */
  validateDeals(deals: Deal[], stageHistories: Map<string, Array<{ stage: string; timestamp: Date }>>): RevenueLeak[] {
    const leaks: RevenueLeak[] = [];

    for (const deal of deals) {
      const history = stageHistories.get(deal.id);
      
      if (!history || history.length < 2) {
        continue;
      }

      // Check for backward transitions (potential data issues)
      const backwardTransitions = this.findBackwardTransitions(history);
      
      for (const transition of backwardTransitions) {
        const dealValue = parseFloat(deal.properties.amount || '0');
        
        leaks.push({
          id: generateId(),
          type: 'invalid_lifecycle_path',
          severity: dealValue >= 10000 ? 'high' : 'medium',
          description: `Deal "${deal.properties.dealname}" moved backward from ${transition.from} to ${transition.to}`,
          potentialRevenue: dealValue * 0.1, // Risk assessment
          affectedEntity: {
            type: 'deal',
            id: deal.id,
            name: deal.properties.dealname,
          },
          detectedAt: new Date(),
          suggestedActions: this.generateDealTransitionActions(deal, transition),
          metadata: {
            backwardTransition: transition,
            dealValue,
            currentStage: deal.properties.dealstage,
          },
        });
      }
    }

    return leaks;
  }

  private findSkippedStages(history: Array<{ stage: string; timestamp: Date }>): string[] {
    const skipped: string[] = [];
    const visitedStages = new Set(history.map(h => h.stage));
    
    // Get the highest stage reached
    let maxStageIndex = -1;
    for (const h of history) {
      const index = this.config.stageOrder.indexOf(h.stage);
      if (index > maxStageIndex) {
        maxStageIndex = index;
      }
    }

    // Check which intermediate stages were skipped
    for (let i = 0; i < maxStageIndex; i++) {
      const stage = this.config.stageOrder[i];
      if (!visitedStages.has(stage)) {
        skipped.push(stage);
      }
    }

    return skipped;
  }

  private findInvalidTransitions(history: Array<{ stage: string; timestamp: Date }>): Array<{ from: string; to: string; timestamp: Date }> {
    const invalid: Array<{ from: string; to: string; timestamp: Date }> = [];
    
    // Sort by timestamp
    const sorted = [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 1; i < sorted.length; i++) {
      const from = sorted[i - 1].stage;
      const to = sorted[i].stage;
      
      const validNextStages = this.config.validTransitions.get(from) || [];
      
      // Skip if same stage or if transition is valid
      if (from === to || validNextStages.includes(to)) {
        continue;
      }

      // Check if it's a forward progression (even if skipping)
      const fromIndex = this.config.stageOrder.indexOf(from);
      const toIndex = this.config.stageOrder.indexOf(to);
      
      // Only flag as invalid if it's a backward transition or truly invalid
      if (toIndex < fromIndex && toIndex !== -1 && fromIndex !== -1) {
        invalid.push({ from, to, timestamp: sorted[i].timestamp });
      }
    }

    return invalid;
  }

  private findBackwardTransitions(history: Array<{ stage: string; timestamp: Date }>): Array<{ from: string; to: string }> {
    const backward: Array<{ from: string; to: string }> = [];
    const sorted = [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 1; i < sorted.length; i++) {
      const fromIndex = this.config.stageOrder.indexOf(sorted[i - 1].stage);
      const toIndex = this.config.stageOrder.indexOf(sorted[i].stage);
      
      if (fromIndex !== -1 && toIndex !== -1 && toIndex < fromIndex) {
        backward.push({
          from: sorted[i - 1].stage,
          to: sorted[i].stage,
        });
      }
    }

    return backward;
  }

  private findMissingRequiredStages(history: Array<{ stage: string; timestamp: Date }>): string[] {
    const visitedStages = new Set(history.map(h => h.stage));
    return this.config.requiredStagesForDealWon.filter(stage => !visitedStages.has(stage));
  }

  private estimateContactValue(history: LifecycleHistory): number {
    if (history.associatedDeals) {
      return history.associatedDeals.reduce((sum, d) => 
        sum + parseFloat(d.properties.amount || '0'), 0
      );
    }
    return 5000; // Default estimated value
  }

  private calculateSeverity(issueCount: number, value: number): 'low' | 'medium' | 'high' | 'critical' {
    if (issueCount >= 3 || value >= 50000) return 'critical';
    if (issueCount >= 2 || value >= 25000) return 'high';
    if (issueCount >= 1 || value >= 10000) return 'medium';
    return 'low';
  }

  private generateSkippedStageActions(history: LifecycleHistory, skippedStages: string[]): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'manual_review',
        title: 'Review Contact Journey',
        description: `Verify if skipped stages (${skippedStages.join(', ')}) were intentional`,
        priority: 'medium',
      },
      {
        id: generateId(),
        type: 'update_property',
        title: 'Backfill Stage Data',
        description: 'Update lifecycle stage history if data is missing',
        priority: 'low',
        parameters: {
          objectType: 'contacts',
          objectId: history.contact.id,
        },
      },
    ];
  }

  private generateTransitionActions(history: LifecycleHistory, transition: { from: string; to: string }): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'manual_review',
        title: 'Investigate Invalid Transition',
        description: `Review why contact moved from ${transition.from} to ${transition.to}`,
        priority: 'medium',
      },
    ];
  }

  private generateMissingStageActions(history: LifecycleHistory, missingStages: string[]): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'manual_review',
        title: 'Audit Sales Process',
        description: `Contact has won deals but never passed through required stages: ${missingStages.join(', ')}`,
        priority: 'high',
      },
      {
        id: generateId(),
        type: 'create_task',
        title: 'Review Workflow Configuration',
        description: 'Ensure lifecycle stage automation is correctly configured',
        priority: 'medium',
        parameters: {
          taskType: 'TODO',
          subject: 'Audit Lifecycle Automation',
        },
      },
    ];
  }

  private generateDealTransitionActions(deal: Deal, transition: { from: string; to: string }): RecoveryAction[] {
    return [
      {
        id: generateId(),
        type: 'manual_review',
        title: 'Review Deal Stage Change',
        description: `Investigate why deal moved backward from ${transition.from} to ${transition.to}`,
        priority: 'high',
      },
    ];
  }
}

export default LifecyclePathValidator;
