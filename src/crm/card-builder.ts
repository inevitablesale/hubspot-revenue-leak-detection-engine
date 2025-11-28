/**
 * CRM Card Module
 * Generates HubSpot CRM cards for displaying revenue leak information and recovery actions
 */

import {
  RevenueLeak,
  CRMCardResponse,
  CRMCardSection,
  CRMCardAction,
  LeakSeverity,
} from '../types';
import { formatCurrency, truncate } from '../utils/helpers';

export interface CRMCardConfig {
  maxSections: number;
  maxActionsPerLeak: number;
  baseUrl: string;
}

const DEFAULT_CONFIG: CRMCardConfig = {
  maxSections: 5,
  maxActionsPerLeak: 3,
  baseUrl: '/api/v1',
};

export class CRMCardBuilder {
  private config: CRMCardConfig;

  constructor(config: Partial<CRMCardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Build CRM card response for an entity's leaks
   */
  buildCard(leaks: RevenueLeak[], entityId: string, entityType: string): CRMCardResponse {
    // Sort leaks by severity and potential revenue
    const sortedLeaks = this.sortLeaks(leaks);
    const displayLeaks = sortedLeaks.slice(0, this.config.maxSections);

    const sections: CRMCardSection[] = [];

    // Summary section
    if (leaks.length > 0) {
      sections.push(this.buildSummarySection(leaks));
    }

    // Individual leak sections
    for (const leak of displayLeaks) {
      sections.push(this.buildLeakSection(leak));
    }

    // Build primary action
    const primaryAction = this.buildPrimaryAction(entityId, entityType);

    // Build secondary actions
    const secondaryActions = this.buildSecondaryActions(displayLeaks);

    return {
      results: sections,
      primaryAction,
      secondaryActions,
    };
  }

  /**
   * Build empty state card
   */
  buildEmptyCard(): CRMCardResponse {
    return {
      results: [
        {
          id: 'no-leaks',
          title: 'Revenue Health',
          items: [
            {
              label: 'Status',
              dataType: 'STATUS',
              value: 'Healthy',
            },
            {
              label: 'Message',
              dataType: 'STRING',
              value: 'No revenue leaks detected for this record',
            },
          ],
        },
      ],
    };
  }

  /**
   * Build summary section
   */
  private buildSummarySection(leaks: RevenueLeak[]): CRMCardSection {
    const totalPotentialRevenue = leaks.reduce((sum, leak) => sum + leak.potentialRevenue, 0);
    const criticalCount = leaks.filter(l => l.severity === 'critical').length;
    const highCount = leaks.filter(l => l.severity === 'high').length;

    return {
      id: 'summary',
      title: 'Revenue Leak Summary',
      items: [
        {
          label: 'Total Leaks Detected',
          dataType: 'NUMERIC',
          value: leaks.length,
        },
        {
          label: 'Potential Revenue at Risk',
          dataType: 'CURRENCY',
          value: totalPotentialRevenue,
        },
        {
          label: 'Critical Issues',
          dataType: 'NUMERIC',
          value: criticalCount,
        },
        {
          label: 'High Priority Issues',
          dataType: 'NUMERIC',
          value: highCount,
        },
      ],
      linkUrl: `${this.config.baseUrl}/dashboard`,
      linkLabel: 'View Full Report',
    };
  }

  /**
   * Build section for individual leak
   */
  private buildLeakSection(leak: RevenueLeak): CRMCardSection {
    return {
      id: leak.id,
      title: this.getLeakTypeLabel(leak.type),
      items: [
        {
          label: 'Severity',
          dataType: 'STATUS',
          value: this.formatSeverity(leak.severity),
        },
        {
          label: 'Issue',
          dataType: 'STRING',
          value: truncate(leak.description, 100),
        },
        {
          label: 'Potential Recovery',
          dataType: 'CURRENCY',
          value: leak.potentialRevenue,
        },
        {
          label: 'Detected',
          dataType: 'DATE',
          value: leak.detectedAt.toISOString(),
        },
      ],
      linkUrl: `${this.config.baseUrl}/leaks/${leak.id}`,
      linkLabel: 'View Details',
    };
  }

  /**
   * Build primary action button
   */
  private buildPrimaryAction(entityId: string, entityType: string): CRMCardAction {
    return {
      type: 'ACTION_HOOK',
      label: 'Run Leak Detection',
      uri: `${this.config.baseUrl}/detect`,
      httpMethod: 'POST',
      associatedObjectProperties: ['hs_object_id'],
      propertiesToSend: ['amount', 'dealstage', 'closedate', 'pipeline'],
    };
  }

  /**
   * Build secondary actions from leak recovery actions
   */
  private buildSecondaryActions(leaks: RevenueLeak[]): CRMCardAction[] {
    const actions: CRMCardAction[] = [];
    
    // Add action to view all leaks
    actions.push({
      type: 'IFRAME',
      label: 'View All Leaks',
      uri: `${this.config.baseUrl}/leaks`,
    });

    // Add quick actions for top priority leaks
    for (const leak of leaks.slice(0, 2)) {
      const topAction = leak.suggestedActions[0];
      if (topAction) {
        actions.push({
          type: 'ACTION_HOOK',
          label: truncate(topAction.title, 30),
          uri: `${this.config.baseUrl}/actions/${topAction.id}/execute`,
          httpMethod: 'POST',
        });
      }
    }

    return actions.slice(0, 5); // HubSpot limits secondary actions
  }

  /**
   * Sort leaks by priority (severity + potential revenue)
   */
  private sortLeaks(leaks: RevenueLeak[]): RevenueLeak[] {
    const severityWeight: Record<LeakSeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return [...leaks].sort((a, b) => {
      // First sort by severity
      const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Then by potential revenue
      return b.potentialRevenue - a.potentialRevenue;
    });
  }

  /**
   * Get human-readable leak type label
   */
  private getLeakTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      underbilling: 'Underbilling Detected',
      missed_renewal: 'Missed Renewal',
      untriggered_crosssell: 'Cross-Sell Opportunity',
      stalled_cs_handoff: 'CS Handoff Issue',
      invalid_lifecycle_path: 'Invalid Lifecycle',
      billing_gap: 'Billing Gap',
    };
    return labels[type] || type;
  }

  /**
   * Format severity for display
   */
  private formatSeverity(severity: LeakSeverity): string {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  }
}

/**
 * Build CRM card for a specific deal
 */
export function buildDealCard(leaks: RevenueLeak[], dealId: string): CRMCardResponse {
  const builder = new CRMCardBuilder();
  const dealLeaks = leaks.filter(l => l.affectedEntity.type === 'deal' && l.affectedEntity.id === dealId);
  
  if (dealLeaks.length === 0) {
    return builder.buildEmptyCard();
  }
  
  return builder.buildCard(dealLeaks, dealId, 'deal');
}

/**
 * Build CRM card for a specific contact
 */
export function buildContactCard(leaks: RevenueLeak[], contactId: string): CRMCardResponse {
  const builder = new CRMCardBuilder();
  const contactLeaks = leaks.filter(
    l => l.affectedEntity.type === 'contact' && l.affectedEntity.id === contactId
  );
  
  if (contactLeaks.length === 0) {
    return builder.buildEmptyCard();
  }
  
  return builder.buildCard(contactLeaks, contactId, 'contact');
}

/**
 * Build CRM card for a specific company
 */
export function buildCompanyCard(leaks: RevenueLeak[], companyId: string): CRMCardResponse {
  const builder = new CRMCardBuilder();
  const companyLeaks = leaks.filter(
    l => l.affectedEntity.type === 'company' && l.affectedEntity.id === companyId
  );
  
  if (companyLeaks.length === 0) {
    return builder.buildEmptyCard();
  }
  
  return builder.buildCard(companyLeaks, companyId, 'company');
}

export default CRMCardBuilder;
