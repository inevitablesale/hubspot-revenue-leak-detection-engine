/**
 * Data Quality Processor
 * Handles de-duplication, field mapping, and data validation
 */

import { DataQualityConfig, FieldMapping, ValidationRule } from '../cli/config/types';
import { Contact, Company, Deal } from '../types';

export interface DataQualityResult {
  processed: number;
  duplicatesFound: number;
  duplicatesMerged: number;
  validationErrors: ValidationError[];
  fieldsMapped: number;
}

export interface ValidationError {
  entity: string;
  entityId: string;
  field: string;
  rule: string;
  message: string;
}

export interface DuplicateGroup<T> {
  primary: T;
  duplicates: T[];
  matchField: string;
  matchValue: string;
}

export class DataQualityProcessor {
  private config: DataQualityConfig;

  constructor(config: DataQualityConfig) {
    this.config = config;
  }

  /**
   * Process contacts for data quality
   */
  processContacts(contacts: Contact[]): { 
    contacts: Contact[]; 
    result: DataQualityResult 
  } {
    const result: DataQualityResult = {
      processed: contacts.length,
      duplicatesFound: 0,
      duplicatesMerged: 0,
      validationErrors: [],
      fieldsMapped: 0,
    };

    // Find duplicates
    const duplicateGroups: DuplicateGroup<Contact>[] = [];

    if (this.config.mergeByEmail) {
      const emailGroups = this.groupByField(contacts, 'email');
      duplicateGroups.push(...this.findDuplicatesInGroups(emailGroups, 'email'));
    }

    result.duplicatesFound = duplicateGroups.reduce(
      (sum, g) => sum + g.duplicates.length, 
      0
    );

    // Merge duplicates if auto-merge is enabled
    let processedContacts = contacts;
    if (this.config.autoMergeDuplicates && duplicateGroups.length > 0) {
      const mergeResult = this.mergeContactDuplicates(contacts, duplicateGroups);
      processedContacts = mergeResult.contacts;
      result.duplicatesMerged = mergeResult.merged;
    }

    // Validate contacts
    for (const contact of processedContacts) {
      const errors = this.validateEntity(contact, 'contact');
      result.validationErrors.push(...errors);
    }

    // Apply field mappings
    processedContacts = processedContacts.map(contact => {
      const mapped = this.applyFieldMappings(contact, 'contact');
      if (Object.keys(mapped.properties).length > Object.keys(contact.properties).length) {
        result.fieldsMapped++;
      }
      return mapped;
    });

    return { contacts: processedContacts, result };
  }

  /**
   * Process companies for data quality
   */
  processCompanies(companies: Company[]): {
    companies: Company[];
    result: DataQualityResult;
  } {
    const result: DataQualityResult = {
      processed: companies.length,
      duplicatesFound: 0,
      duplicatesMerged: 0,
      validationErrors: [],
      fieldsMapped: 0,
    };

    // Find duplicates by domain
    const duplicateGroups: DuplicateGroup<Company>[] = [];

    if (this.config.mergeByDomain) {
      const domainGroups = this.groupByField(companies, 'domain');
      duplicateGroups.push(...this.findDuplicatesInGroups(domainGroups, 'domain'));
    }

    result.duplicatesFound = duplicateGroups.reduce(
      (sum, g) => sum + g.duplicates.length,
      0
    );

    // Merge duplicates if auto-merge is enabled
    let processedCompanies = companies;
    if (this.config.autoMergeDuplicates && duplicateGroups.length > 0) {
      const mergeResult = this.mergeCompanyDuplicates(companies, duplicateGroups);
      processedCompanies = mergeResult.companies;
      result.duplicatesMerged = mergeResult.merged;
    }

    // Validate companies
    for (const company of processedCompanies) {
      const errors = this.validateEntity(company, 'company');
      result.validationErrors.push(...errors);
    }

    // Apply field mappings
    processedCompanies = processedCompanies.map(company => {
      const mapped = this.applyFieldMappings(company, 'company');
      if (Object.keys(mapped.properties).length > Object.keys(company.properties).length) {
        result.fieldsMapped++;
      }
      return mapped;
    });

    return { companies: processedCompanies, result };
  }

  /**
   * Process deals for data quality
   */
  processDeals(deals: Deal[]): {
    deals: Deal[];
    result: DataQualityResult;
  } {
    const result: DataQualityResult = {
      processed: deals.length,
      duplicatesFound: 0,
      duplicatesMerged: 0,
      validationErrors: [],
      fieldsMapped: 0,
    };

    // Validate deals
    for (const deal of deals) {
      const errors = this.validateEntity(deal, 'deal');
      result.validationErrors.push(...errors);
    }

    // Apply field mappings
    const processedDeals = deals.map(deal => {
      const mapped = this.applyFieldMappings(deal, 'deal');
      if (Object.keys(mapped.properties).length > Object.keys(deal.properties).length) {
        result.fieldsMapped++;
      }
      return mapped;
    });

    return { deals: processedDeals, result };
  }

  /**
   * Group entities by a specific field
   */
  private groupByField<T extends { id: string; properties: Record<string, string | undefined> }>(
    entities: T[],
    field: string
  ): Map<string, T[]> {
    const groups = new Map<string, T[]>();

    for (const entity of entities) {
      const value = entity.properties[field]?.toLowerCase().trim();
      if (!value) continue;

      const existing = groups.get(value) || [];
      existing.push(entity);
      groups.set(value, existing);
    }

    return groups;
  }

  /**
   * Find duplicate groups
   */
  private findDuplicatesInGroups<T extends { id: string; properties: Record<string, string | undefined> }>(
    groups: Map<string, T[]>,
    field: string
  ): DuplicateGroup<T>[] {
    const duplicateGroups: DuplicateGroup<T>[] = [];

    for (const [value, entities] of groups) {
      if (entities.length > 1) {
        // Sort by ID to make primary deterministic (oldest first)
        const sorted = entities.sort((a, b) => a.id.localeCompare(b.id));
        duplicateGroups.push({
          primary: sorted[0],
          duplicates: sorted.slice(1),
          matchField: field,
          matchValue: value,
        });
      }
    }

    return duplicateGroups;
  }

  /**
   * Merge contact duplicates
   */
  private mergeContactDuplicates(
    contacts: Contact[],
    duplicateGroups: DuplicateGroup<Contact>[]
  ): { contacts: Contact[]; merged: number } {
    const idsToRemove = new Set<string>();
    let merged = 0;

    // Mark duplicates for removal and merge data into primary
    for (const group of duplicateGroups) {
      for (const duplicate of group.duplicates) {
        // Merge properties from duplicate into primary (keep primary values if both exist)
        for (const [key, value] of Object.entries(duplicate.properties)) {
          if (!group.primary.properties[key] && value) {
            group.primary.properties[key] = value;
          }
        }
        idsToRemove.add(duplicate.id);
        merged++;
      }
    }

    // Filter out removed duplicates
    const filteredContacts = contacts.filter(c => !idsToRemove.has(c.id));

    return { contacts: filteredContacts, merged };
  }

  /**
   * Merge company duplicates
   */
  private mergeCompanyDuplicates(
    companies: Company[],
    duplicateGroups: DuplicateGroup<Company>[]
  ): { companies: Company[]; merged: number } {
    const idsToRemove = new Set<string>();
    let merged = 0;

    for (const group of duplicateGroups) {
      for (const duplicate of group.duplicates) {
        for (const [key, value] of Object.entries(duplicate.properties)) {
          if (!group.primary.properties[key] && value) {
            group.primary.properties[key] = value;
          }
        }
        idsToRemove.add(duplicate.id);
        merged++;
      }
    }

    const filteredCompanies = companies.filter(c => !idsToRemove.has(c.id));

    return { companies: filteredCompanies, merged };
  }

  /**
   * Validate an entity against configured rules
   */
  private validateEntity(
    entity: { id: string; properties: Record<string, string | undefined> },
    entityType: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of this.config.validationRules) {
      const value = entity.properties[rule.field];
      const isValid = this.checkValidationRule(value, rule);

      if (!isValid) {
        errors.push({
          entity: entityType,
          entityId: entity.id,
          field: rule.field,
          rule: rule.rule,
          message: rule.message || `Validation failed: ${rule.rule}`,
        });
      }
    }

    return errors;
  }

  /**
   * Check a validation rule against a value
   */
  private checkValidationRule(value: string | undefined, rule: ValidationRule): boolean {
    switch (rule.rule) {
      case 'required':
        return value !== undefined && value !== null && value.trim() !== '';

      case 'email':
        if (!value) return true; // Only validate if present
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      case 'phone':
        if (!value) return true;
        return /^[+]?[(]?[0-9]{1,3}[)]?[-\s./0-9]*$/.test(value);

      case 'url':
        if (!value) return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }

      case 'date':
        if (!value) return true;
        return !isNaN(Date.parse(value));

      case 'number':
        if (!value) return true;
        return !isNaN(Number(value));

      case 'regex':
        if (!value || !rule.value) return true;
        return new RegExp(rule.value).test(value);

      default:
        return true;
    }
  }

  /**
   * Apply field mappings to an entity
   */
  private applyFieldMappings<T extends { id: string; properties: Record<string, string | undefined> }>(
    entity: T,
    entityType: string
  ): T {
    const mappedProperties = { ...entity.properties };

    for (const mapping of this.config.fieldMappings) {
      const sourceValue = entity.properties[mapping.sourceField];
      if (sourceValue !== undefined) {
        let value = sourceValue;

        // Apply transformations
        if (mapping.transformations) {
          for (const transform of mapping.transformations) {
            value = this.applyTransformation(value, transform);
          }
        }

        mappedProperties[mapping.targetField] = value;
      }
    }

    return {
      ...entity,
      properties: mappedProperties,
    };
  }

  /**
   * Apply a transformation to a value
   */
  private applyTransformation(value: string, transform: string): string {
    switch (transform) {
      case 'lowercase':
        return value.toLowerCase();

      case 'uppercase':
        return value.toUpperCase();

      case 'trim':
        return value.trim();

      case 'currency':
        // Format as currency (remove non-numeric, format)
        const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        return isNaN(numericValue) ? value : numericValue.toFixed(2);

      case 'phone':
        // Normalize phone number
        return value.replace(/[^0-9+]/g, '');

      case 'encrypt':
        // Placeholder for encryption (would need actual implementation)
        return `[ENCRYPTED:${value.substring(0, 3)}...]`;

      default:
        return value;
    }
  }

  /**
   * Run full data quality check
   */
  runFullCheck(data: {
    contacts?: Contact[];
    companies?: Company[];
    deals?: Deal[];
  }): {
    contacts?: { contacts: Contact[]; result: DataQualityResult };
    companies?: { companies: Company[]; result: DataQualityResult };
    deals?: { deals: Deal[]; result: DataQualityResult };
    summary: {
      totalProcessed: number;
      totalDuplicates: number;
      totalMerged: number;
      totalErrors: number;
    };
  } {
    const results: {
      contacts?: { contacts: Contact[]; result: DataQualityResult };
      companies?: { companies: Company[]; result: DataQualityResult };
      deals?: { deals: Deal[]; result: DataQualityResult };
      summary: {
        totalProcessed: number;
        totalDuplicates: number;
        totalMerged: number;
        totalErrors: number;
      };
    } = {
      summary: {
        totalProcessed: 0,
        totalDuplicates: 0,
        totalMerged: 0,
        totalErrors: 0,
      },
    };

    if (data.contacts) {
      results.contacts = this.processContacts(data.contacts);
      results.summary.totalProcessed += results.contacts.result.processed;
      results.summary.totalDuplicates += results.contacts.result.duplicatesFound;
      results.summary.totalMerged += results.contacts.result.duplicatesMerged;
      results.summary.totalErrors += results.contacts.result.validationErrors.length;
    }

    if (data.companies) {
      results.companies = this.processCompanies(data.companies);
      results.summary.totalProcessed += results.companies.result.processed;
      results.summary.totalDuplicates += results.companies.result.duplicatesFound;
      results.summary.totalMerged += results.companies.result.duplicatesMerged;
      results.summary.totalErrors += results.companies.result.validationErrors.length;
    }

    if (data.deals) {
      results.deals = this.processDeals(data.deals);
      results.summary.totalProcessed += results.deals.result.processed;
      results.summary.totalDuplicates += results.deals.result.duplicatesFound;
      results.summary.totalMerged += results.deals.result.duplicatesMerged;
      results.summary.totalErrors += results.deals.result.validationErrors.length;
    }

    return results;
  }
}
