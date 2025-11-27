/**
 * Timeline Events Module
 * Creates and manages HubSpot timeline events for revenue leak activities
 */

import { Client } from '@hubspot/api-client';
import { RevenueLeak, TimelineEvent, RecoveryAction } from '../types';
import { generateId } from '../utils/helpers';

export interface TimelineConfig {
  appId: number;
  eventTemplateIds: {
    leakDetected: string;
    leakResolved: string;
    actionTaken: string;
    reminderSet: string;
  };
}

export class TimelineEventManager {
  private hubspotClient: Client;
  private config: TimelineConfig;

  constructor(accessToken: string, config: TimelineConfig) {
    this.hubspotClient = new Client({ accessToken });
    this.config = config;
  }

  /**
   * Create timeline event for detected leak
   */
  async createLeakDetectedEvent(
    leak: RevenueLeak,
    objectType: 'contacts' | 'companies' | 'deals',
    objectId: string
  ): Promise<void> {
    const event: TimelineEvent = {
      eventTemplateId: this.config.eventTemplateIds.leakDetected,
      objectId,
      tokens: {
        leakId: leak.id,
        leakType: this.formatLeakType(leak.type),
        severity: leak.severity.toUpperCase(),
        description: leak.description,
        potentialRevenue: leak.potentialRevenue.toFixed(2),
        detectedAt: leak.detectedAt.toISOString(),
        suggestedActionsCount: String(leak.suggestedActions.length),
      },
      extraData: {
        leak,
      },
    };

    await this.createTimelineEvent(objectType, event);
  }

  /**
   * Create timeline event for resolved leak
   */
  async createLeakResolvedEvent(
    leak: RevenueLeak,
    resolution: string,
    objectType: 'contacts' | 'companies' | 'deals',
    objectId: string
  ): Promise<void> {
    const event: TimelineEvent = {
      eventTemplateId: this.config.eventTemplateIds.leakResolved,
      objectId,
      tokens: {
        leakId: leak.id,
        leakType: this.formatLeakType(leak.type),
        resolution,
        recoveredRevenue: leak.potentialRevenue.toFixed(2),
        resolvedAt: new Date().toISOString(),
      },
    };

    await this.createTimelineEvent(objectType, event);
  }

  /**
   * Create timeline event for action taken
   */
  async createActionTakenEvent(
    leak: RevenueLeak,
    action: RecoveryAction,
    objectType: 'contacts' | 'companies' | 'deals',
    objectId: string
  ): Promise<void> {
    const event: TimelineEvent = {
      eventTemplateId: this.config.eventTemplateIds.actionTaken,
      objectId,
      tokens: {
        leakId: leak.id,
        actionId: action.id,
        actionType: action.type,
        actionTitle: action.title,
        actionDescription: action.description,
        priority: action.priority.toUpperCase(),
        executedAt: new Date().toISOString(),
      },
    };

    await this.createTimelineEvent(objectType, event);
  }

  /**
   * Create timeline event for reminder
   */
  async createReminderEvent(
    leak: RevenueLeak,
    reminderDate: Date,
    message: string,
    objectType: 'contacts' | 'companies' | 'deals',
    objectId: string
  ): Promise<void> {
    const event: TimelineEvent = {
      eventTemplateId: this.config.eventTemplateIds.reminderSet,
      objectId,
      tokens: {
        leakId: leak.id,
        reminderDate: reminderDate.toISOString(),
        message,
        createdAt: new Date().toISOString(),
      },
    };

    await this.createTimelineEvent(objectType, event);
  }

  /**
   * Create batch of timeline events for multiple leaks
   */
  async createBatchLeakEvents(
    leaks: RevenueLeak[],
    objectType: 'contacts' | 'companies' | 'deals'
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (const leak of leaks) {
      try {
        await this.createLeakDetectedEvent(leak, objectType, leak.affectedEntity.id);
        successful++;
      } catch (error) {
        console.error(`Failed to create event for leak ${leak.id}:`, error);
        failed++;
      }
    }

    return { successful, failed };
  }

  /**
   * Internal method to create timeline event via HubSpot API
   */
  private async createTimelineEvent(
    objectType: 'contacts' | 'companies' | 'deals',
    event: TimelineEvent
  ): Promise<void> {
    try {
      // HubSpot timeline events API
      await this.hubspotClient.apiRequest({
        method: 'POST',
        path: `/crm/v3/timeline/events`,
        body: {
          eventTemplateId: event.eventTemplateId,
          objectId: event.objectId,
          tokens: event.tokens,
          extraData: event.extraData,
        },
      });
    } catch (error) {
      console.error('Failed to create timeline event:', error);
      throw error;
    }
  }

  /**
   * Format leak type for display
   */
  private formatLeakType(type: string): string {
    const typeMap: Record<string, string> = {
      underbilling: 'Underbilling',
      missed_renewal: 'Missed Renewal',
      untriggered_crosssell: 'Cross-Sell Opportunity',
      stalled_cs_handoff: 'CS Handoff Issue',
      invalid_lifecycle_path: 'Invalid Lifecycle Path',
      billing_gap: 'Billing Gap',
    };
    return typeMap[type] || type;
  }
}

/**
 * Timeline event templates for app setup
 */
export const EVENT_TEMPLATES = {
  leakDetected: {
    name: 'Revenue Leak Detected',
    headerTemplate: '{{leakType}} - {{severity}}',
    detailTemplate: `
      <div>
        <strong>Description:</strong> {{description}}<br/>
        <strong>Potential Revenue:</strong> \${{potentialRevenue}}<br/>
        <strong>Suggested Actions:</strong> {{suggestedActionsCount}}<br/>
        <strong>Detected:</strong> {{detectedAt}}
      </div>
    `,
    tokens: [
      { name: 'leakId', label: 'Leak ID', type: 'string' },
      { name: 'leakType', label: 'Leak Type', type: 'string' },
      { name: 'severity', label: 'Severity', type: 'string' },
      { name: 'description', label: 'Description', type: 'string' },
      { name: 'potentialRevenue', label: 'Potential Revenue', type: 'string' },
      { name: 'detectedAt', label: 'Detected At', type: 'date' },
      { name: 'suggestedActionsCount', label: 'Actions Count', type: 'string' },
    ],
  },
  leakResolved: {
    name: 'Revenue Leak Resolved',
    headerTemplate: '{{leakType}} Resolved',
    detailTemplate: `
      <div>
        <strong>Resolution:</strong> {{resolution}}<br/>
        <strong>Recovered Revenue:</strong> \${{recoveredRevenue}}<br/>
        <strong>Resolved:</strong> {{resolvedAt}}
      </div>
    `,
    tokens: [
      { name: 'leakId', label: 'Leak ID', type: 'string' },
      { name: 'leakType', label: 'Leak Type', type: 'string' },
      { name: 'resolution', label: 'Resolution', type: 'string' },
      { name: 'recoveredRevenue', label: 'Recovered Revenue', type: 'string' },
      { name: 'resolvedAt', label: 'Resolved At', type: 'date' },
    ],
  },
  actionTaken: {
    name: 'Recovery Action Taken',
    headerTemplate: '{{actionTitle}}',
    detailTemplate: `
      <div>
        <strong>Action Type:</strong> {{actionType}}<br/>
        <strong>Description:</strong> {{actionDescription}}<br/>
        <strong>Priority:</strong> {{priority}}<br/>
        <strong>Executed:</strong> {{executedAt}}
      </div>
    `,
    tokens: [
      { name: 'leakId', label: 'Leak ID', type: 'string' },
      { name: 'actionId', label: 'Action ID', type: 'string' },
      { name: 'actionType', label: 'Action Type', type: 'string' },
      { name: 'actionTitle', label: 'Action Title', type: 'string' },
      { name: 'actionDescription', label: 'Description', type: 'string' },
      { name: 'priority', label: 'Priority', type: 'string' },
      { name: 'executedAt', label: 'Executed At', type: 'date' },
    ],
  },
  reminderSet: {
    name: 'Leak Reminder Set',
    headerTemplate: 'Reminder: {{message}}',
    detailTemplate: `
      <div>
        <strong>Reminder Date:</strong> {{reminderDate}}<br/>
        <strong>Message:</strong> {{message}}<br/>
        <strong>Created:</strong> {{createdAt}}
      </div>
    `,
    tokens: [
      { name: 'leakId', label: 'Leak ID', type: 'string' },
      { name: 'reminderDate', label: 'Reminder Date', type: 'date' },
      { name: 'message', label: 'Message', type: 'string' },
      { name: 'createdAt', label: 'Created At', type: 'date' },
    ],
  },
};

export default TimelineEventManager;
