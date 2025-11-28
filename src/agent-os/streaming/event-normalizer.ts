/**
 * Event Normalizer Module
 * Transforms events from various sources into a unified format for processing
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Event Normalizer Types
// ============================================================

export type SourceSystem = 'hubspot' | 'billing' | 'ats' | 'finance' | 'email' | 'calendar' | 'intent' | 'document' | 'custom';

export interface RawEvent {
  id: string;
  source: SourceSystem;
  type: string;
  data: unknown;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface NormalizedEvent {
  id: string;
  originalId: string;
  source: SourceSystem;
  category: EventCategory;
  action: string;
  entityType: string;
  entityId: string;
  actor: ActorInfo;
  changes: EventChange[];
  context: EventContext;
  enrichments: EventEnrichment[];
  quality: EventQuality;
  timestamp: Date;
  normalizedAt: Date;
}

export type EventCategory = 
  | 'deal' | 'contact' | 'company' | 'lifecycle'
  | 'billing' | 'invoice' | 'payment'
  | 'placement' | 'job' | 'candidate'
  | 'communication' | 'meeting' | 'task'
  | 'intent' | 'engagement' | 'attribution'
  | 'system' | 'custom';

export interface ActorInfo {
  id?: string;
  type: 'user' | 'system' | 'integration' | 'unknown';
  name?: string;
  email?: string;
}

export interface EventChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: 'create' | 'update' | 'delete' | 'association';
}

export interface EventContext {
  portalId?: string;
  accountId?: string;
  workflowId?: string;
  campaignId?: string;
  pipelineId?: string;
  stageId?: string;
  correlationId?: string;
  tags: string[];
}

export interface EventEnrichment {
  type: string;
  source: string;
  data: unknown;
  confidence: number;
  addedAt: Date;
}

export interface EventQuality {
  score: number;
  completeness: number;
  accuracy: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  field: string;
  issue: 'missing' | 'invalid' | 'inconsistent' | 'outdated';
  severity: 'warning' | 'error';
  message: string;
}

export interface NormalizationSchema {
  id: string;
  source: SourceSystem;
  eventType: string;
  mappings: FieldMapping[];
  transformations: Transformation[];
  validations: Validation[];
  enrichers: string[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface Transformation {
  field: string;
  type: 'rename' | 'format' | 'calculate' | 'lookup' | 'split' | 'merge' | 'custom';
  config: Record<string, unknown>;
}

export interface Validation {
  field: string;
  rule: 'required' | 'type' | 'range' | 'pattern' | 'enum' | 'custom';
  config: Record<string, unknown>;
  severity: 'warning' | 'error';
}

export interface Enricher {
  id: string;
  name: string;
  type: 'lookup' | 'calculate' | 'external' | 'ml';
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface NormalizationResult {
  success: boolean;
  normalizedEvent?: NormalizedEvent;
  errors: string[];
  warnings: string[];
  processingTime: number;
}

// ============================================================
// Event Normalizer Implementation
// ============================================================

export class EventNormalizer {
  private schemas: Map<string, NormalizationSchema> = new Map();
  private enrichers: Map<string, Enricher> = new Map();
  private lookupTables: Map<string, Map<string, unknown>> = new Map();
  private normalizationHistory: NormalizationResult[] = [];

  constructor() {
    this.initializeSchemas();
    this.initializeEnrichers();
    this.initializeLookupTables();
  }

  /**
   * Initialize default schemas
   */
  private initializeSchemas(): void {
    // HubSpot Deal Events
    this.registerSchema({
      source: 'hubspot',
      eventType: 'deal.*',
      mappings: [
        { sourceField: 'objectId', targetField: 'entityId', required: true },
        { sourceField: 'objectType', targetField: 'entityType', required: true },
        { sourceField: 'eventType', targetField: 'action', required: true },
        { sourceField: 'portalId', targetField: 'context.portalId', required: false },
        { sourceField: 'userId', targetField: 'actor.id', required: false },
      ],
      transformations: [
        { field: 'entityType', type: 'lookup', config: { table: 'entityTypes', default: 'deal' } },
        { field: 'action', type: 'format', config: { lowercase: true, trim: true } },
      ],
      validations: [
        { field: 'entityId', rule: 'required', config: {}, severity: 'error' },
        { field: 'timestamp', rule: 'type', config: { type: 'date' }, severity: 'error' },
      ],
      enrichers: ['dealEnricher', 'actorEnricher'],
    });

    // HubSpot Contact Events
    this.registerSchema({
      source: 'hubspot',
      eventType: 'contact.*',
      mappings: [
        { sourceField: 'objectId', targetField: 'entityId', required: true },
        { sourceField: 'objectType', targetField: 'entityType', required: true },
        { sourceField: 'eventType', targetField: 'action', required: true },
      ],
      transformations: [],
      validations: [
        { field: 'entityId', rule: 'required', config: {}, severity: 'error' },
      ],
      enrichers: ['contactEnricher'],
    });

    // Billing Events
    this.registerSchema({
      source: 'billing',
      eventType: 'invoice.*',
      mappings: [
        { sourceField: 'invoiceId', targetField: 'entityId', required: true },
        { sourceField: 'type', targetField: 'action', required: true },
        { sourceField: 'amount', targetField: 'changes[0].newValue', required: false },
        { sourceField: 'customerId', targetField: 'context.accountId', required: false },
      ],
      transformations: [
        { field: 'entityType', type: 'custom', config: { value: 'invoice' } },
      ],
      validations: [
        { field: 'entityId', rule: 'required', config: {}, severity: 'error' },
        { field: 'changes[0].newValue', rule: 'type', config: { type: 'number' }, severity: 'warning' },
      ],
      enrichers: ['billingEnricher'],
    });

    // ATS Events
    this.registerSchema({
      source: 'ats',
      eventType: 'placement.*',
      mappings: [
        { sourceField: 'placementId', targetField: 'entityId', required: true },
        { sourceField: 'status', targetField: 'action', required: true },
        { sourceField: 'candidateId', targetField: 'context.candidateId', required: false },
        { sourceField: 'jobId', targetField: 'context.jobId', required: false },
      ],
      transformations: [
        { field: 'entityType', type: 'custom', config: { value: 'placement' } },
      ],
      validations: [],
      enrichers: ['atsEnricher'],
    });

    // Intent Events
    this.registerSchema({
      source: 'intent',
      eventType: 'signal.*',
      mappings: [
        { sourceField: 'signalId', targetField: 'entityId', required: true },
        { sourceField: 'signalType', targetField: 'action', required: true },
        { sourceField: 'accountId', targetField: 'context.accountId', required: false },
        { sourceField: 'score', targetField: 'changes[0].newValue', required: false },
      ],
      transformations: [
        { field: 'entityType', type: 'custom', config: { value: 'intent_signal' } },
      ],
      validations: [],
      enrichers: ['intentEnricher'],
    });
  }

  /**
   * Initialize enrichers
   */
  private initializeEnrichers(): void {
    this.enrichers.set('dealEnricher', {
      id: 'dealEnricher',
      name: 'Deal Enricher',
      type: 'lookup',
      config: { fields: ['dealName', 'amount', 'stage', 'pipeline'] },
      enabled: true,
    });

    this.enrichers.set('contactEnricher', {
      id: 'contactEnricher',
      name: 'Contact Enricher',
      type: 'lookup',
      config: { fields: ['email', 'company', 'lifecycle'] },
      enabled: true,
    });

    this.enrichers.set('actorEnricher', {
      id: 'actorEnricher',
      name: 'Actor Enricher',
      type: 'lookup',
      config: { fields: ['name', 'email', 'team'] },
      enabled: true,
    });

    this.enrichers.set('billingEnricher', {
      id: 'billingEnricher',
      name: 'Billing Enricher',
      type: 'calculate',
      config: { calculations: ['lineItems', 'taxes', 'discounts'] },
      enabled: true,
    });

    this.enrichers.set('atsEnricher', {
      id: 'atsEnricher',
      name: 'ATS Enricher',
      type: 'lookup',
      config: { fields: ['candidate', 'job', 'client'] },
      enabled: true,
    });

    this.enrichers.set('intentEnricher', {
      id: 'intentEnricher',
      name: 'Intent Enricher',
      type: 'ml',
      config: { model: 'intent_classification', threshold: 0.7 },
      enabled: true,
    });
  }

  /**
   * Initialize lookup tables
   */
  private initializeLookupTables(): void {
    // Entity types mapping
    this.lookupTables.set('entityTypes', new Map([
      ['DEAL', 'deal'],
      ['CONTACT', 'contact'],
      ['COMPANY', 'company'],
      ['TICKET', 'ticket'],
      ['deal', 'deal'],
      ['contact', 'contact'],
      ['company', 'company'],
    ]));

    // Event categories mapping
    this.lookupTables.set('eventCategories', new Map([
      ['deal', 'deal'],
      ['contact', 'contact'],
      ['company', 'company'],
      ['invoice', 'billing'],
      ['payment', 'billing'],
      ['placement', 'placement'],
      ['job', 'job'],
    ]));

    // Action mappings
    this.lookupTables.set('actions', new Map([
      ['create', 'created'],
      ['update', 'updated'],
      ['delete', 'deleted'],
      ['merge', 'merged'],
      ['associate', 'associated'],
    ]));
  }

  /**
   * Register a normalization schema
   */
  registerSchema(params: Omit<NormalizationSchema, 'id'>): NormalizationSchema {
    const schema: NormalizationSchema = {
      id: generateId(),
      ...params,
    };

    const key = `${params.source}:${params.eventType}`;
    this.schemas.set(key, schema);

    return schema;
  }

  /**
   * Normalize a raw event
   */
  normalize(rawEvent: RawEvent): NormalizationResult {
    const startTime = Date.now();
    const result: NormalizationResult = {
      success: false,
      errors: [],
      warnings: [],
      processingTime: 0,
    };

    try {
      // Find matching schema
      const schema = this.findMatchingSchema(rawEvent);
      if (!schema) {
        result.errors.push(`No schema found for event type: ${rawEvent.source}:${rawEvent.type}`);
        return this.finalizeResult(result, startTime);
      }

      // Apply mappings
      const mapped = this.applyMappings(rawEvent, schema);

      // Apply transformations
      const transformed = this.applyTransformations(mapped, schema);

      // Validate
      const validationIssues = this.validate(transformed, schema);
      result.warnings.push(...validationIssues.filter(i => i.severity === 'warning').map(i => i.message));
      const errors = validationIssues.filter(i => i.severity === 'error');
      if (errors.length > 0) {
        result.errors.push(...errors.map(i => i.message));
        return this.finalizeResult(result, startTime);
      }

      // Create normalized event
      const normalizedEvent = this.createNormalizedEvent(rawEvent, transformed, validationIssues);

      // Apply enrichments
      const enrichedEvent = this.applyEnrichments(normalizedEvent, schema);

      // Calculate quality score
      enrichedEvent.quality = this.calculateQuality(enrichedEvent, validationIssues);

      result.success = true;
      result.normalizedEvent = enrichedEvent;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error during normalization');
    }

    return this.finalizeResult(result, startTime);
  }

  /**
   * Normalize a batch of events
   */
  normalizeBatch(rawEvents: RawEvent[]): NormalizationResult[] {
    return rawEvents.map(event => this.normalize(event));
  }

  /**
   * Find matching schema for an event
   */
  private findMatchingSchema(event: RawEvent): NormalizationSchema | null {
    // Try exact match first
    const exactKey = `${event.source}:${event.type}`;
    if (this.schemas.has(exactKey)) {
      return this.schemas.get(exactKey)!;
    }

    // Try wildcard match
    for (const [key, schema] of this.schemas) {
      if (key.endsWith('.*')) {
        const prefix = key.slice(0, -2);
        if (`${event.source}:${event.type}`.startsWith(prefix)) {
          return schema;
        }
      }
    }

    return null;
  }

  /**
   * Apply field mappings
   */
  private applyMappings(event: RawEvent, schema: NormalizationSchema): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const data = event.data as Record<string, unknown>;

    for (const mapping of schema.mappings) {
      let value = this.getNestedValue(data, mapping.sourceField);

      if (value === undefined && mapping.required) {
        value = mapping.defaultValue;
      }

      if (value !== undefined) {
        this.setNestedValue(result, mapping.targetField, value);
      }
    }

    return result;
  }

  /**
   * Apply transformations
   */
  private applyTransformations(data: Record<string, unknown>, schema: NormalizationSchema): Record<string, unknown> {
    const result = { ...data };

    for (const transform of schema.transformations) {
      const currentValue = this.getNestedValue(result, transform.field);
      let newValue: unknown;

      switch (transform.type) {
        case 'rename':
          // Handled by mappings
          break;
        case 'format':
          newValue = this.formatValue(currentValue, transform.config);
          break;
        case 'calculate':
          newValue = this.calculateValue(currentValue, result, transform.config);
          break;
        case 'lookup':
          newValue = this.lookupValue(currentValue, transform.config);
          break;
        case 'split':
          newValue = this.splitValue(currentValue, transform.config);
          break;
        case 'merge':
          newValue = this.mergeValues(result, transform.config);
          break;
        case 'custom':
          newValue = transform.config.value;
          break;
      }

      if (newValue !== undefined) {
        this.setNestedValue(result, transform.field, newValue);
      }
    }

    return result;
  }

  /**
   * Validate normalized data
   */
  private validate(data: Record<string, unknown>, schema: NormalizationSchema): QualityIssue[] {
    const issues: QualityIssue[] = [];

    for (const validation of schema.validations) {
      const value = this.getNestedValue(data, validation.field);

      switch (validation.rule) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            issues.push({
              field: validation.field,
              issue: 'missing',
              severity: validation.severity,
              message: `Required field '${validation.field}' is missing`,
            });
          }
          break;
        case 'type':
          if (value !== undefined && !this.checkType(value, validation.config.type as string)) {
            issues.push({
              field: validation.field,
              issue: 'invalid',
              severity: validation.severity,
              message: `Field '${validation.field}' has invalid type`,
            });
          }
          break;
        case 'range':
          if (typeof value === 'number') {
            const min = validation.config.min as number | undefined;
            const max = validation.config.max as number | undefined;
            if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
              issues.push({
                field: validation.field,
                issue: 'invalid',
                severity: validation.severity,
                message: `Field '${validation.field}' is out of range`,
              });
            }
          }
          break;
        case 'pattern':
          if (typeof value === 'string' && validation.config.pattern) {
            const regex = new RegExp(validation.config.pattern as string);
            if (!regex.test(value)) {
              issues.push({
                field: validation.field,
                issue: 'invalid',
                severity: validation.severity,
                message: `Field '${validation.field}' does not match pattern`,
              });
            }
          }
          break;
        case 'enum':
          if (validation.config.values && !((validation.config.values as unknown[]).includes(value))) {
            issues.push({
              field: validation.field,
              issue: 'invalid',
              severity: validation.severity,
              message: `Field '${validation.field}' is not an allowed value`,
            });
          }
          break;
      }
    }

    return issues;
  }

  /**
   * Create normalized event
   */
  private createNormalizedEvent(
    rawEvent: RawEvent,
    mapped: Record<string, unknown>,
    issues: QualityIssue[]
  ): NormalizedEvent {
    return {
      id: generateId(),
      originalId: rawEvent.id,
      source: rawEvent.source,
      category: this.determineCategory(rawEvent, mapped),
      action: (mapped.action as string) || 'unknown',
      entityType: (mapped.entityType as string) || 'unknown',
      entityId: (mapped.entityId as string) || rawEvent.id,
      actor: this.extractActor(mapped),
      changes: this.extractChanges(rawEvent.data as Record<string, unknown>),
      context: this.extractContext(mapped),
      enrichments: [],
      quality: {
        score: 0,
        completeness: 0,
        accuracy: 0,
        issues,
      },
      timestamp: rawEvent.timestamp,
      normalizedAt: new Date(),
    };
  }

  /**
   * Apply enrichments
   */
  private applyEnrichments(event: NormalizedEvent, schema: NormalizationSchema): NormalizedEvent {
    for (const enricherId of schema.enrichers) {
      const enricher = this.enrichers.get(enricherId);
      if (!enricher || !enricher.enabled) continue;

      try {
        const enrichment = this.executeEnricher(enricher, event);
        if (enrichment) {
          event.enrichments.push(enrichment);
        }
      } catch {
        // Skip failed enrichers
      }
    }

    return event;
  }

  /**
   * Execute an enricher
   */
  private executeEnricher(enricher: Enricher, event: NormalizedEvent): EventEnrichment | null {
    // Simulate enrichment
    const enrichmentData: Record<string, unknown> = {};

    switch (enricher.type) {
      case 'lookup':
        // Simulate lookup enrichment
        enrichmentData.lookedUp = true;
        break;
      case 'calculate':
        // Simulate calculation
        enrichmentData.calculated = true;
        break;
      case 'ml':
        // Simulate ML enrichment
        enrichmentData.prediction = 0.85;
        break;
    }

    return {
      type: enricher.type,
      source: enricher.name,
      data: enrichmentData,
      confidence: 0.9,
      addedAt: new Date(),
    };
  }

  /**
   * Calculate quality score
   */
  private calculateQuality(event: NormalizedEvent, issues: QualityIssue[]): EventQuality {
    // Calculate completeness
    const requiredFields = ['entityId', 'entityType', 'action', 'timestamp'];
    const presentFields = requiredFields.filter(f => {
      const value = (event as unknown as Record<string, unknown>)[f];
      return value !== undefined && value !== null && value !== '';
    });
    const completeness = presentFields.length / requiredFields.length;

    // Calculate accuracy based on issues
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const accuracy = Math.max(0, 1 - errorCount * 0.2 - warningCount * 0.05);

    // Overall score
    const score = (completeness * 0.4 + accuracy * 0.4 + (event.enrichments.length > 0 ? 0.2 : 0));

    return {
      score: Math.round(score * 100) / 100,
      completeness: Math.round(completeness * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      issues,
    };
  }

  /**
   * Get schemas
   */
  getSchemas(): NormalizationSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Get enrichers
   */
  getEnrichers(): Enricher[] {
    return Array.from(this.enrichers.values());
  }

  /**
   * Get normalization history
   */
  getHistory(limit?: number): NormalizationResult[] {
    return limit ? this.normalizationHistory.slice(-limit) : this.normalizationHistory;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalNormalized: number;
    successRate: number;
    avgProcessingTime: number;
    schemaCount: number;
    enricherCount: number;
    avgQualityScore: number;
  } {
    const history = this.normalizationHistory;
    const successful = history.filter(r => r.success);

    const avgQuality = successful.length > 0
      ? successful.reduce((sum, r) => sum + (r.normalizedEvent?.quality.score || 0), 0) / successful.length
      : 0;

    return {
      totalNormalized: history.length,
      successRate: history.length > 0 ? successful.length / history.length : 0,
      avgProcessingTime: history.length > 0
        ? history.reduce((sum, r) => sum + r.processingTime, 0) / history.length
        : 0,
      schemaCount: this.schemas.size,
      enricherCount: this.enrichers.size,
      avgQualityScore: avgQuality,
    };
  }

  // Private helper methods

  private finalizeResult(result: NormalizationResult, startTime: number): NormalizationResult {
    result.processingTime = Date.now() - startTime;
    this.normalizationHistory.push(result);
    if (this.normalizationHistory.length > 10000) {
      this.normalizationHistory.shift();
    }
    return result;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      
      // Handle array notation
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        current = (current as Record<string, unknown>)[arrayMatch[1]];
        if (Array.isArray(current)) {
          current = current[parseInt(arrayMatch[2])];
        } else {
          return undefined;
        }
      } else if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      // Handle array notation
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        if (!current[arrayMatch[1]]) {
          current[arrayMatch[1]] = [];
        }
        const arr = current[arrayMatch[1]] as unknown[];
        const index = parseInt(arrayMatch[2]);
        if (!arr[index]) {
          arr[index] = {};
        }
        current = arr[index] as Record<string, unknown>;
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
    }
    
    current[parts[parts.length - 1]] = value;
  }

  private formatValue(value: unknown, config: Record<string, unknown>): unknown {
    if (typeof value !== 'string') return value;
    
    let result = value;
    if (config.lowercase) result = result.toLowerCase();
    if (config.uppercase) result = result.toUpperCase();
    if (config.trim) result = result.trim();
    
    return result;
  }

  private calculateValue(
    currentValue: unknown, 
    data: Record<string, unknown>, 
    config: Record<string, unknown>
  ): unknown {
    // Simple calculation implementation
    if (config.expression) {
      // Parse and evaluate expression
      return currentValue;
    }
    return currentValue;
  }

  private lookupValue(value: unknown, config: Record<string, unknown>): unknown {
    const table = this.lookupTables.get(config.table as string);
    if (!table) return config.default;
    
    return table.get(String(value)) ?? config.default;
  }

  private splitValue(value: unknown, config: Record<string, unknown>): unknown {
    if (typeof value !== 'string') return value;
    return value.split(config.delimiter as string || ',');
  }

  private mergeValues(data: Record<string, unknown>, config: Record<string, unknown>): unknown {
    const fields = config.fields as string[] || [];
    const delimiter = config.delimiter as string || ' ';
    
    return fields.map(f => this.getNestedValue(data, f)).filter(Boolean).join(delimiter);
  }

  private checkType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number';
      case 'boolean': return typeof value === 'boolean';
      case 'date': return value instanceof Date || !isNaN(Date.parse(String(value)));
      case 'array': return Array.isArray(value);
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
      default: return true;
    }
  }

  private determineCategory(event: RawEvent, mapped: Record<string, unknown>): EventCategory {
    const entityType = (mapped.entityType as string || '').toLowerCase();
    const categoryTable = this.lookupTables.get('eventCategories');
    
    if (categoryTable) {
      const category = categoryTable.get(entityType);
      if (category) return category as EventCategory;
    }
    
    // Default mapping based on source
    const sourceCategories: Record<SourceSystem, EventCategory> = {
      hubspot: 'deal',
      billing: 'billing',
      ats: 'placement',
      finance: 'billing',
      email: 'communication',
      calendar: 'meeting',
      intent: 'intent',
      document: 'custom',
      custom: 'custom',
    };
    
    return sourceCategories[event.source] || 'custom';
  }

  private extractActor(mapped: Record<string, unknown>): ActorInfo {
    const actor = mapped.actor as Record<string, unknown> || {};
    
    return {
      id: actor.id as string,
      type: (actor.type as ActorInfo['type']) || 'unknown',
      name: actor.name as string,
      email: actor.email as string,
    };
  }

  private extractChanges(data: Record<string, unknown>): EventChange[] {
    const changes: EventChange[] = [];
    
    // Look for common change patterns
    if (data.changes && Array.isArray(data.changes)) {
      for (const change of data.changes) {
        const c = change as Record<string, unknown>;
        changes.push({
          field: c.field as string || 'unknown',
          oldValue: c.oldValue,
          newValue: c.newValue,
          changeType: (c.changeType as EventChange['changeType']) || 'update',
        });
      }
    }
    
    if (data.previousProperties && data.properties) {
      const prev = data.previousProperties as Record<string, unknown>;
      const curr = data.properties as Record<string, unknown>;
      
      for (const [key, newVal] of Object.entries(curr)) {
        if (prev[key] !== newVal) {
          changes.push({
            field: key,
            oldValue: prev[key],
            newValue: newVal,
            changeType: 'update',
          });
        }
      }
    }
    
    return changes;
  }

  private extractContext(mapped: Record<string, unknown>): EventContext {
    const context = mapped.context as Record<string, unknown> || {};
    
    return {
      portalId: context.portalId as string,
      accountId: context.accountId as string,
      workflowId: context.workflowId as string,
      campaignId: context.campaignId as string,
      pipelineId: context.pipelineId as string,
      stageId: context.stageId as string,
      correlationId: context.correlationId as string,
      tags: (context.tags as string[]) || [],
    };
  }
}

export default EventNormalizer;
