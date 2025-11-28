/**
 * Multi-System Validation Module
 * Cross-system data validation and reconciliation
 */

import { RevenueLeak } from '../types';
import { generateId } from '../utils/helpers';
import {
  SystemConnection,
  ValidationRule,
  FieldMapping,
  ValidationResult,
  Discrepancy,
  ValidationConfig,
} from './types';

export interface ValidationReport {
  id: string;
  generatedAt: Date;
  systems: string[];
  rulesEvaluated: number;
  totalValidations: number;
  passedValidations: number;
  failedValidations: number;
  discrepancies: Discrepancy[];
  recommendations: string[];
}

export interface SystemData {
  systemId: string;
  entityType: string;
  data: Record<string, unknown>[];
}

export interface ReconciliationResult {
  id: string;
  sourceSystem: string;
  targetSystem: string;
  entityType: string;
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  discrepancies: Discrepancy[];
  completedAt: Date;
}

export class MultiSystemValidator {
  private connections: Map<string, SystemConnection> = new Map();
  private rules: Map<string, ValidationRule> = new Map();
  private results: Map<string, ValidationResult> = new Map();
  private config: ValidationConfig;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      enabled: true,
      syncIntervalMs: 300000, // 5 minutes
      tolerancePercent: 1,
      strictMode: false,
      ...config,
    };

    this.initializeDefaultRules();
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Deal value consistency
    this.rules.set('deal-value-consistency', {
      id: 'deal-value-consistency',
      name: 'Deal Value Consistency',
      description: 'Ensure deal values match across CRM and billing systems',
      systems: ['hubspot', 'billing'],
      fieldMappings: [
        {
          sourceSystem: 'hubspot',
          sourceField: 'deal_amount',
          targetSystem: 'billing',
          targetField: 'contract_value',
          tolerance: 0.01, // 1% tolerance
        },
      ],
      validationType: 'tolerance',
      severity: 'error',
      enabled: true,
    });

    // Contact email consistency
    this.rules.set('contact-email-consistency', {
      id: 'contact-email-consistency',
      name: 'Contact Email Consistency',
      description: 'Ensure contact emails match across systems',
      systems: ['hubspot', 'marketing', 'support'],
      fieldMappings: [
        {
          sourceSystem: 'hubspot',
          sourceField: 'email',
          targetSystem: 'marketing',
          targetField: 'subscriber_email',
        },
        {
          sourceSystem: 'hubspot',
          sourceField: 'email',
          targetSystem: 'support',
          targetField: 'customer_email',
        },
      ],
      validationType: 'exact_match',
      severity: 'warning',
      enabled: true,
    });

    // Invoice-deal linkage
    this.rules.set('invoice-deal-linkage', {
      id: 'invoice-deal-linkage',
      name: 'Invoice-Deal Linkage',
      description: 'Validate invoices are properly linked to deals',
      systems: ['hubspot', 'billing'],
      fieldMappings: [
        {
          sourceSystem: 'hubspot',
          sourceField: 'deal_id',
          targetSystem: 'billing',
          targetField: 'reference_deal_id',
        },
      ],
      validationType: 'exact_match',
      severity: 'error',
      enabled: true,
    });

    // Customer lifecycle consistency
    this.rules.set('lifecycle-consistency', {
      id: 'lifecycle-consistency',
      name: 'Lifecycle Stage Consistency',
      description: 'Validate lifecycle stages are consistent across systems',
      systems: ['hubspot', 'marketing'],
      fieldMappings: [
        {
          sourceSystem: 'hubspot',
          sourceField: 'lifecyclestage',
          targetSystem: 'marketing',
          targetField: 'subscriber_status',
          transformFunction: 'lifecycle_to_subscriber_status',
        },
      ],
      validationType: 'business_rule',
      severity: 'warning',
      enabled: true,
    });

    // Revenue recognition timing
    this.rules.set('revenue-timing', {
      id: 'revenue-timing',
      name: 'Revenue Recognition Timing',
      description: 'Validate revenue recognition dates match deal close dates',
      systems: ['hubspot', 'erp'],
      fieldMappings: [
        {
          sourceSystem: 'hubspot',
          sourceField: 'closedate',
          targetSystem: 'erp',
          targetField: 'revenue_recognition_date',
          tolerance: 7, // 7 days tolerance
        },
      ],
      validationType: 'temporal',
      severity: 'warning',
      enabled: true,
    });

    // Company data consistency
    this.rules.set('company-data-consistency', {
      id: 'company-data-consistency',
      name: 'Company Data Consistency',
      description: 'Validate company data matches across systems',
      systems: ['hubspot', 'erp', 'billing'],
      fieldMappings: [
        {
          sourceSystem: 'hubspot',
          sourceField: 'company_name',
          targetSystem: 'erp',
          targetField: 'legal_entity_name',
        },
        {
          sourceSystem: 'hubspot',
          sourceField: 'domain',
          targetSystem: 'billing',
          targetField: 'billing_domain',
        },
      ],
      validationType: 'exact_match',
      severity: 'warning',
      enabled: true,
    });
  }

  /**
   * Register a system connection
   */
  registerConnection(connection: SystemConnection): void {
    this.connections.set(connection.id, connection);
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(
    connectionId: string,
    status: SystemConnection['status']
  ): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = status;
      if (status === 'connected') {
        connection.lastSync = new Date();
      }
    }
  }

  /**
   * Validate data across systems
   */
  async validateAcrossSystems(
    systemData: SystemData[],
    ruleIds?: string[]
  ): Promise<ValidationReport> {
    if (!this.config.enabled) {
      throw new Error('Multi-system validation is disabled');
    }

    const rulesToEvaluate = ruleIds
      ? ruleIds.map(id => this.rules.get(id)).filter((r): r is ValidationRule => r !== undefined)
      : Array.from(this.rules.values()).filter(r => r.enabled);

    const validationResults: ValidationResult[] = [];
    const allDiscrepancies: Discrepancy[] = [];

    for (const rule of rulesToEvaluate) {
      // Check if all required systems have data
      const hasAllSystems = rule.systems.every(sys =>
        systemData.some(d => d.systemId === sys)
      );

      if (!hasAllSystems) {
        validationResults.push({
          id: generateId(),
          ruleId: rule.id,
          status: 'skipped',
          executedAt: new Date(),
          discrepancies: [],
          metadata: { reason: 'Missing system data' },
        });
        continue;
      }

      // Evaluate rule
      const result = await this.evaluateRule(rule, systemData);
      validationResults.push(result);
      allDiscrepancies.push(...result.discrepancies);
    }

    const passedCount = validationResults.filter(r => r.status === 'valid').length;
    const failedCount = validationResults.filter(r => r.status === 'invalid').length;

    // Generate recommendations
    const recommendations = this.generateRecommendations(allDiscrepancies);

    return {
      id: generateId(),
      generatedAt: new Date(),
      systems: [...new Set(systemData.map(d => d.systemId))],
      rulesEvaluated: rulesToEvaluate.length,
      totalValidations: validationResults.length,
      passedValidations: passedCount,
      failedValidations: failedCount,
      discrepancies: allDiscrepancies,
      recommendations,
    };
  }

  /**
   * Evaluate a single validation rule
   */
  private async evaluateRule(
    rule: ValidationRule,
    systemData: SystemData[]
  ): Promise<ValidationResult> {
    const discrepancies: Discrepancy[] = [];

    for (const mapping of rule.fieldMappings) {
      const sourceData = systemData.find(d => d.systemId === mapping.sourceSystem);
      const targetData = systemData.find(d => d.systemId === mapping.targetSystem);

      if (!sourceData || !targetData) continue;

      // Compare records
      for (const sourceRecord of sourceData.data) {
        const sourceValue = this.getFieldValue(sourceRecord, mapping.sourceField);
        const matchingTarget = this.findMatchingRecord(
          sourceRecord,
          targetData.data,
          mapping
        );

        if (!matchingTarget) {
          discrepancies.push({
            entityId: String(sourceRecord['id'] || 'unknown'),
            entityType: sourceData.entityType,
            field: mapping.sourceField,
            sourceSystem: mapping.sourceSystem,
            sourceValue,
            targetSystem: mapping.targetSystem,
            targetValue: null,
            difference: 'Missing in target system',
            suggestedResolution: `Create record in ${mapping.targetSystem}`,
          });
          continue;
        }

        const targetValue = this.getFieldValue(matchingTarget, mapping.targetField);

        // Apply transformation if defined
        const transformedSource = mapping.transformFunction
          ? this.applyTransform(sourceValue, mapping.transformFunction)
          : sourceValue;

        // Compare values based on validation type
        const isValid = this.compareValues(
          transformedSource,
          targetValue,
          rule.validationType,
          mapping.tolerance
        );

        if (!isValid) {
          discrepancies.push({
            entityId: String(sourceRecord['id'] || 'unknown'),
            entityType: sourceData.entityType,
            field: mapping.sourceField,
            sourceSystem: mapping.sourceSystem,
            sourceValue: transformedSource,
            targetSystem: mapping.targetSystem,
            targetValue,
            difference: this.calculateDifference(transformedSource, targetValue),
            suggestedResolution: this.suggestResolution(
              mapping,
              transformedSource,
              targetValue
            ),
          });
        }
      }
    }

    const status = discrepancies.length === 0 ? 'valid' : 
                   discrepancies.some(d => d.difference === 'Missing in target system') ? 'invalid' : 'warning';

    const result: ValidationResult = {
      id: generateId(),
      ruleId: rule.id,
      status,
      executedAt: new Date(),
      discrepancies,
      metadata: { rule: rule.name },
    };

    this.results.set(result.id, result);
    return result;
  }

  /**
   * Get field value from record
   */
  private getFieldValue(record: Record<string, unknown>, field: string): unknown {
    // Support nested field access with dot notation
    const parts = field.split('.');
    let value: unknown = record;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Find matching record in target system
   */
  private findMatchingRecord(
    sourceRecord: Record<string, unknown>,
    targetData: Record<string, unknown>[],
    mapping: FieldMapping
  ): Record<string, unknown> | undefined {
    // Try to match by ID first
    const sourceId = sourceRecord['id'] || sourceRecord['hs_object_id'];
    
    return targetData.find(target => {
      const targetId = target['id'] || target['reference_id'] || target['external_id'];
      return targetId === sourceId;
    });
  }

  /**
   * Apply transformation function
   */
  private applyTransform(value: unknown, transformFunction: string): unknown {
    switch (transformFunction) {
      case 'lifecycle_to_subscriber_status':
        // Map HubSpot lifecycle stages to marketing subscriber status
        const lifecycleMap: Record<string, string> = {
          'subscriber': 'active',
          'lead': 'active',
          'marketingqualifiedlead': 'engaged',
          'salesqualifiedlead': 'qualified',
          'opportunity': 'opportunity',
          'customer': 'customer',
          'evangelist': 'customer',
          'other': 'other',
        };
        return lifecycleMap[String(value).toLowerCase()] || 'unknown';
      
      case 'normalize_email':
        return String(value).toLowerCase().trim();
      
      case 'currency_to_cents':
        return Math.round(Number(value) * 100);
      
      default:
        return value;
    }
  }

  /**
   * Compare values based on validation type
   */
  private compareValues(
    source: unknown,
    target: unknown,
    validationType: ValidationRule['validationType'],
    tolerance?: number
  ): boolean {
    if (source === null || source === undefined || target === null || target === undefined) {
      return source === target;
    }

    switch (validationType) {
      case 'exact_match':
        return String(source).toLowerCase() === String(target).toLowerCase();

      case 'tolerance':
        const sourceNum = Number(source);
        const targetNum = Number(target);
        if (isNaN(sourceNum) || isNaN(targetNum)) return false;
        
        const tolerancePercent = tolerance || this.config.tolerancePercent;
        const maxDiff = Math.abs(sourceNum) * (tolerancePercent / 100);
        return Math.abs(sourceNum - targetNum) <= maxDiff;

      case 'temporal':
        const sourceDate = new Date(String(source));
        const targetDate = new Date(String(target));
        if (isNaN(sourceDate.getTime()) || isNaN(targetDate.getTime())) return false;
        
        const daysDiff = Math.abs(sourceDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= (tolerance || 1);

      case 'business_rule':
        // Business rules are handled by transformation functions
        return source === target;

      default:
        return source === target;
    }
  }

  /**
   * Calculate difference between values
   */
  private calculateDifference(source: unknown, target: unknown): unknown {
    const sourceNum = Number(source);
    const targetNum = Number(target);

    if (!isNaN(sourceNum) && !isNaN(targetNum)) {
      const diff = sourceNum - targetNum;
      const percentDiff = targetNum !== 0 ? ((diff / targetNum) * 100).toFixed(2) : 'N/A';
      return `${diff} (${percentDiff}%)`;
    }

    return `"${source}" vs "${target}"`;
  }

  /**
   * Suggest resolution for discrepancy
   */
  private suggestResolution(
    mapping: FieldMapping,
    sourceValue: unknown,
    targetValue: unknown
  ): string {
    if (targetValue === null || targetValue === undefined) {
      return `Sync ${mapping.sourceField} from ${mapping.sourceSystem} to ${mapping.targetSystem}`;
    }

    // Determine which system is likely authoritative
    const authoritativeSystems = ['hubspot', 'erp'];
    const isSourceAuthoritative = authoritativeSystems.includes(mapping.sourceSystem);

    if (isSourceAuthoritative) {
      return `Update ${mapping.targetField} in ${mapping.targetSystem} to match ${mapping.sourceSystem}`;
    }

    return `Review and reconcile ${mapping.sourceField} between ${mapping.sourceSystem} and ${mapping.targetSystem}`;
  }

  /**
   * Generate recommendations from discrepancies
   */
  private generateRecommendations(discrepancies: Discrepancy[]): string[] {
    const recommendations: string[] = [];

    if (discrepancies.length === 0) {
      recommendations.push('All validations passed. Systems are in sync.');
      return recommendations;
    }

    // Group by system
    const bySystem = discrepancies.reduce((acc, d) => {
      const key = `${d.sourceSystem}-${d.targetSystem}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [systems, count] of Object.entries(bySystem)) {
      if (count >= 5) {
        recommendations.push(
          `High discrepancy count (${count}) between ${systems.replace('-', ' and ')}. Consider reviewing integration sync frequency.`
        );
      }
    }

    // Group by field
    const byField = discrepancies.reduce((acc, d) => {
      acc[d.field] = (acc[d.field] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [field, count] of Object.entries(byField)) {
      if (count >= 3) {
        recommendations.push(
          `Multiple discrepancies (${count}) in field "${field}". Consider implementing automated sync for this field.`
        );
      }
    }

    // General recommendations
    if (discrepancies.some(d => d.difference === 'Missing in target system')) {
      recommendations.push(
        'Some records are missing in target systems. Review data sync processes to ensure completeness.'
      );
    }

    return recommendations;
  }

  /**
   * Reconcile data between two systems
   */
  async reconcile(
    sourceSystem: string,
    targetSystem: string,
    sourceData: Record<string, unknown>[],
    targetData: Record<string, unknown>[],
    entityType: string
  ): Promise<ReconciliationResult> {
    const discrepancies: Discrepancy[] = [];
    let matchedCount = 0;

    // Create lookup map for target data
    const targetMap = new Map(
      targetData.map(t => [String(t['id'] || t['external_id']), t])
    );

    for (const source of sourceData) {
      const sourceId = String(source['id'] || source['hs_object_id']);
      const target = targetMap.get(sourceId);

      if (!target) {
        discrepancies.push({
          entityId: sourceId,
          entityType,
          field: 'record',
          sourceSystem,
          sourceValue: source,
          targetSystem,
          targetValue: null,
          difference: 'Missing in target',
        });
        continue;
      }

      // Compare all fields
      let hasDiscrepancy = false;
      for (const [key, sourceValue] of Object.entries(source)) {
        if (key === 'id' || key === 'hs_object_id') continue;
        
        const targetValue = target[key];
        if (String(sourceValue) !== String(targetValue)) {
          discrepancies.push({
            entityId: sourceId,
            entityType,
            field: key,
            sourceSystem,
            sourceValue,
            targetSystem,
            targetValue,
            difference: this.calculateDifference(sourceValue, targetValue),
          });
          hasDiscrepancy = true;
        }
      }

      if (!hasDiscrepancy) {
        matchedCount++;
      }
    }

    // Check for records in target but not in source
    for (const target of targetData) {
      const targetId = String(target['id'] || target['external_id']);
      const sourceId = sourceData.find(s => 
        String(s['id'] || s['hs_object_id']) === targetId
      );

      if (!sourceId) {
        discrepancies.push({
          entityId: targetId,
          entityType,
          field: 'record',
          sourceSystem: targetSystem,
          sourceValue: target,
          targetSystem: sourceSystem,
          targetValue: null,
          difference: 'Missing in source',
        });
      }
    }

    return {
      id: generateId(),
      sourceSystem,
      targetSystem,
      entityType,
      totalRecords: sourceData.length,
      matchedRecords: matchedCount,
      unmatchedRecords: sourceData.length - matchedCount,
      discrepancies,
      completedAt: new Date(),
    };
  }

  /**
   * Add a validation rule
   */
  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a validation rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Get all connections
   */
  getConnections(): SystemConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get all rules
   */
  getRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get validation results
   */
  getResults(): ValidationResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Get validation statistics
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    totalValidations: number;
    passRate: number;
    discrepancyCount: number;
    connectionStatus: Record<string, number>;
  } {
    const rules = this.getRules();
    const results = this.getResults();
    const connections = this.getConnections();

    const passedCount = results.filter(r => r.status === 'valid').length;
    const discrepancyCount = results.reduce((sum, r) => sum + r.discrepancies.length, 0);

    const connectionStatus = connections.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      totalValidations: results.length,
      passRate: results.length > 0 ? passedCount / results.length : 0,
      discrepancyCount,
      connectionStatus,
    };
  }
}

export default MultiSystemValidator;
