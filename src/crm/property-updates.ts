/**
 * Property Updates Module
 * Manages HubSpot property updates for revenue leak recovery actions
 */

import { Client } from '@hubspot/api-client';
import { PropertyUpdate, RevenueLeak } from '../types';
import { retryWithBackoff } from '../utils/helpers';

export interface PropertyUpdateResult {
  success: boolean;
  objectId: string;
  objectType: string;
  updatedProperties: string[];
  error?: string;
}

export class PropertyUpdater {
  private hubspotClient: Client;

  constructor(accessToken: string) {
    this.hubspotClient = new Client({ accessToken });
  }

  /**
   * Update properties on a CRM object
   */
  async updateProperties(update: PropertyUpdate): Promise<PropertyUpdateResult> {
    try {
      const properties: Record<string, string> = {};
      
      // Convert all values to strings for HubSpot API
      for (const [key, value] of Object.entries(update.properties)) {
        properties[key] = String(value);
      }

      await retryWithBackoff(async () => {
        switch (update.objectType) {
          case 'deals':
            await this.hubspotClient.crm.deals.basicApi.update(update.objectId, {
              properties,
            });
            break;
          case 'contacts':
            await this.hubspotClient.crm.contacts.basicApi.update(update.objectId, {
              properties,
            });
            break;
          case 'companies':
            await this.hubspotClient.crm.companies.basicApi.update(update.objectId, {
              properties,
            });
            break;
          default:
            throw new Error(`Unsupported object type: ${update.objectType}`);
        }
      });

      return {
        success: true,
        objectId: update.objectId,
        objectType: update.objectType,
        updatedProperties: Object.keys(update.properties),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        objectId: update.objectId,
        objectType: update.objectType,
        updatedProperties: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Batch update properties for multiple objects
   */
  async batchUpdateProperties(updates: PropertyUpdate[]): Promise<PropertyUpdateResult[]> {
    const results: PropertyUpdateResult[] = [];

    // Group updates by object type for efficient batch processing
    const groupedUpdates = new Map<string, PropertyUpdate[]>();
    
    for (const update of updates) {
      const existing = groupedUpdates.get(update.objectType) || [];
      existing.push(update);
      groupedUpdates.set(update.objectType, existing);
    }

    // Process each group
    for (const [objectType, typeUpdates] of groupedUpdates.entries()) {
      const batchResults = await this.processBatch(objectType as 'deals' | 'contacts' | 'companies', typeUpdates);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Mark leak as resolved by updating properties
   */
  async markLeakResolved(
    leak: RevenueLeak,
    resolution: string,
    resolvedBy?: string
  ): Promise<PropertyUpdateResult> {
    const objectType = this.mapEntityTypeToObjectType(leak.affectedEntity.type);
    
    if (!objectType) {
      return {
        success: false,
        objectId: leak.affectedEntity.id,
        objectType: leak.affectedEntity.type,
        updatedProperties: [],
        error: `Cannot update properties for entity type: ${leak.affectedEntity.type}`,
      };
    }

    const properties: Record<string, string | number | boolean> = {
      revenue_leak_status: 'resolved',
      revenue_leak_resolution: resolution,
      revenue_leak_resolved_date: new Date().toISOString(),
    };

    if (resolvedBy) {
      properties.revenue_leak_resolved_by = resolvedBy;
    }

    return this.updateProperties({
      objectType,
      objectId: leak.affectedEntity.id,
      properties,
    });
  }

  /**
   * Flag entity with leak information
   */
  async flagWithLeakInfo(leak: RevenueLeak): Promise<PropertyUpdateResult> {
    const objectType = this.mapEntityTypeToObjectType(leak.affectedEntity.type);
    
    if (!objectType) {
      return {
        success: false,
        objectId: leak.affectedEntity.id,
        objectType: leak.affectedEntity.type,
        updatedProperties: [],
        error: `Cannot update properties for entity type: ${leak.affectedEntity.type}`,
      };
    }

    return this.updateProperties({
      objectType,
      objectId: leak.affectedEntity.id,
      properties: {
        revenue_leak_detected: true,
        revenue_leak_type: leak.type,
        revenue_leak_severity: leak.severity,
        revenue_leak_potential_value: leak.potentialRevenue,
        revenue_leak_detected_date: leak.detectedAt.toISOString(),
        revenue_leak_status: 'open',
      },
    });
  }

  /**
   * Process batch of updates for a specific object type
   */
  private async processBatch(
    objectType: 'deals' | 'contacts' | 'companies',
    updates: PropertyUpdate[]
  ): Promise<PropertyUpdateResult[]> {
    const results: PropertyUpdateResult[] = [];
    const batchSize = 100; // HubSpot batch limit

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      try {
        const inputs = batch.map(update => ({
          id: update.objectId,
          properties: Object.entries(update.properties).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>),
        }));

        await retryWithBackoff(async () => {
          switch (objectType) {
            case 'deals':
              await this.hubspotClient.crm.deals.batchApi.update({ inputs });
              break;
            case 'contacts':
              await this.hubspotClient.crm.contacts.batchApi.update({ inputs });
              break;
            case 'companies':
              await this.hubspotClient.crm.companies.batchApi.update({ inputs });
              break;
          }
        });

        // Mark all as successful
        for (const update of batch) {
          results.push({
            success: true,
            objectId: update.objectId,
            objectType: update.objectType,
            updatedProperties: Object.keys(update.properties),
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Mark all in batch as failed
        for (const update of batch) {
          results.push({
            success: false,
            objectId: update.objectId,
            objectType: update.objectType,
            updatedProperties: [],
            error: errorMessage,
          });
        }
      }
    }

    return results;
  }

  /**
   * Map entity type to HubSpot object type
   */
  private mapEntityTypeToObjectType(
    entityType: string
  ): 'deals' | 'contacts' | 'companies' | null {
    const typeMap: Record<string, 'deals' | 'contacts' | 'companies'> = {
      deal: 'deals',
      contact: 'contacts',
      company: 'companies',
    };
    return typeMap[entityType] || null;
  }
}

/**
 * Custom properties required for revenue leak tracking
 */
export const REQUIRED_PROPERTIES = [
  {
    name: 'revenue_leak_detected',
    label: 'Revenue Leak Detected',
    type: 'bool',
    fieldType: 'booleancheckbox',
    groupName: 'revenue_leaks',
    description: 'Indicates if a revenue leak has been detected for this record',
  },
  {
    name: 'revenue_leak_type',
    label: 'Revenue Leak Type',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'revenue_leaks',
    description: 'Type of revenue leak detected',
    options: [
      { label: 'Underbilling', value: 'underbilling' },
      { label: 'Missed Renewal', value: 'missed_renewal' },
      { label: 'Cross-Sell Opportunity', value: 'untriggered_crosssell' },
      { label: 'CS Handoff Issue', value: 'stalled_cs_handoff' },
      { label: 'Invalid Lifecycle', value: 'invalid_lifecycle_path' },
      { label: 'Billing Gap', value: 'billing_gap' },
    ],
  },
  {
    name: 'revenue_leak_severity',
    label: 'Revenue Leak Severity',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'revenue_leaks',
    description: 'Severity level of the revenue leak',
    options: [
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' },
      { label: 'Critical', value: 'critical' },
    ],
  },
  {
    name: 'revenue_leak_potential_value',
    label: 'Revenue Leak Potential Value',
    type: 'number',
    fieldType: 'number',
    groupName: 'revenue_leaks',
    description: 'Estimated potential revenue at risk',
  },
  {
    name: 'revenue_leak_detected_date',
    label: 'Revenue Leak Detected Date',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'revenue_leaks',
    description: 'When the revenue leak was detected',
  },
  {
    name: 'revenue_leak_status',
    label: 'Revenue Leak Status',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'revenue_leaks',
    description: 'Current status of the revenue leak',
    options: [
      { label: 'Open', value: 'open' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Resolved', value: 'resolved' },
      { label: 'Dismissed', value: 'dismissed' },
    ],
  },
  {
    name: 'revenue_leak_resolution',
    label: 'Revenue Leak Resolution',
    type: 'string',
    fieldType: 'text',
    groupName: 'revenue_leaks',
    description: 'How the revenue leak was resolved',
  },
  {
    name: 'revenue_leak_resolved_date',
    label: 'Revenue Leak Resolved Date',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'revenue_leaks',
    description: 'When the revenue leak was resolved',
  },
  {
    name: 'revenue_leak_resolved_by',
    label: 'Revenue Leak Resolved By',
    type: 'string',
    fieldType: 'text',
    groupName: 'revenue_leaks',
    description: 'Who resolved the revenue leak',
  },
];

export default PropertyUpdater;
