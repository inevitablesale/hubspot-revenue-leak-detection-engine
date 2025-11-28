/**
 * Tests for Data Quality Processor
 */

import { DataQualityProcessor } from '../../src/integrations/data-quality';
import { Contact, Company, Deal } from '../../src/types';
import { DataQualityConfig } from '../../src/cli/config/types';

describe('DataQualityProcessor', () => {
  const createConfig = (overrides: Partial<DataQualityConfig> = {}): DataQualityConfig => ({
    autoMergeDuplicates: false,
    mergeByEmail: true,
    mergeByDomain: true,
    fieldMappings: [],
    validationRules: [],
    ...overrides,
  });

  const createContact = (id: string, props: Record<string, string> = {}): Contact => ({
    id,
    properties: {
      email: `test${id}@example.com`,
      firstname: `First${id}`,
      lastname: `Last${id}`,
      ...props,
    },
  });

  const createCompany = (id: string, props: Record<string, string> = {}): Company => ({
    id,
    properties: {
      name: `Company ${id}`,
      domain: `company${id}.com`,
      ...props,
    },
  });

  describe('processContacts', () => {
    it('should process contacts and return result', () => {
      const processor = new DataQualityProcessor(createConfig());
      const contacts = [
        createContact('1'),
        createContact('2'),
      ];

      const { contacts: processed, result } = processor.processContacts(contacts);

      expect(processed.length).toBe(2);
      expect(result.processed).toBe(2);
      expect(result.duplicatesFound).toBe(0);
    });

    it('should detect duplicate contacts by email', () => {
      const processor = new DataQualityProcessor(createConfig());
      const contacts = [
        createContact('1', { email: 'shared@example.com' }),
        createContact('2', { email: 'shared@example.com' }),
        createContact('3'),
      ];

      const { result } = processor.processContacts(contacts);

      expect(result.duplicatesFound).toBe(1);
    });

    it('should merge duplicates when auto-merge is enabled', () => {
      const processor = new DataQualityProcessor(createConfig({ autoMergeDuplicates: true }));
      const contacts = [
        createContact('1', { email: 'shared@example.com', phone: '111-111-1111' }),
        createContact('2', { email: 'shared@example.com', company: 'Acme' }),
      ];

      const { contacts: processed, result } = processor.processContacts(contacts);

      expect(processed.length).toBe(1);
      expect(result.duplicatesMerged).toBe(1);
      // Should merge properties from both
      expect(processed[0].properties.phone).toBe('111-111-1111');
      expect(processed[0].properties.company).toBe('Acme');
    });

    it('should not merge duplicates when auto-merge is disabled', () => {
      const processor = new DataQualityProcessor(createConfig({ autoMergeDuplicates: false }));
      const contacts = [
        createContact('1', { email: 'shared@example.com' }),
        createContact('2', { email: 'shared@example.com' }),
      ];

      const { contacts: processed, result } = processor.processContacts(contacts);

      expect(processed.length).toBe(2);
      expect(result.duplicatesMerged).toBe(0);
    });
  });

  describe('processCompanies', () => {
    it('should process companies and return result', () => {
      const processor = new DataQualityProcessor(createConfig());
      const companies = [
        createCompany('1'),
        createCompany('2'),
      ];

      const { companies: processed, result } = processor.processCompanies(companies);

      expect(processed.length).toBe(2);
      expect(result.processed).toBe(2);
    });

    it('should detect duplicate companies by domain', () => {
      const processor = new DataQualityProcessor(createConfig());
      const companies = [
        createCompany('1', { domain: 'acme.com' }),
        createCompany('2', { domain: 'acme.com' }),
      ];

      const { result } = processor.processCompanies(companies);

      expect(result.duplicatesFound).toBe(1);
    });
  });

  describe('validation', () => {
    it('should validate required fields', () => {
      const processor = new DataQualityProcessor(createConfig({
        validationRules: [
          { field: 'email', rule: 'required', message: 'Email is required' },
        ],
      }));
      const contacts = [
        createContact('1'),
        createContact('2', { email: '' }),
      ];

      const { result } = processor.processContacts(contacts);

      expect(result.validationErrors.length).toBe(1);
      expect(result.validationErrors[0].field).toBe('email');
      expect(result.validationErrors[0].entityId).toBe('2');
    });

    it('should validate email format', () => {
      const processor = new DataQualityProcessor(createConfig({
        validationRules: [
          { field: 'email', rule: 'email', message: 'Invalid email' },
        ],
      }));
      const contacts = [
        createContact('1', { email: 'valid@example.com' }),
        createContact('2', { email: 'invalid-email' }),
      ];

      const { result } = processor.processContacts(contacts);

      expect(result.validationErrors.length).toBe(1);
      expect(result.validationErrors[0].entityId).toBe('2');
    });

    it('should validate number format', () => {
      const processor = new DataQualityProcessor(createConfig({
        validationRules: [
          { field: 'amount', rule: 'number', message: 'Must be a number' },
        ],
      }));
      const deals: Deal[] = [
        { id: '1', properties: { amount: '1000' } },
        { id: '2', properties: { amount: 'not-a-number' } },
      ];

      const { result } = processor.processDeals(deals);

      expect(result.validationErrors.length).toBe(1);
      expect(result.validationErrors[0].entityId).toBe('2');
    });

    it('should validate URL format', () => {
      const processor = new DataQualityProcessor(createConfig({
        validationRules: [
          { field: 'website', rule: 'url', message: 'Invalid URL' },
        ],
      }));
      const companies = [
        createCompany('1', { website: 'https://example.com' }),
        createCompany('2', { website: 'not-a-url' }),
      ];

      const { result } = processor.processCompanies(companies);

      expect(result.validationErrors.length).toBe(1);
      expect(result.validationErrors[0].entityId).toBe('2');
    });
  });

  describe('field mappings', () => {
    it('should apply field mappings', () => {
      const processor = new DataQualityProcessor(createConfig({
        fieldMappings: [
          {
            source: 'external',
            sourceField: 'external_id',
            targetField: 'hubspot_external_id',
          },
        ],
      }));
      const contacts = [
        createContact('1', { external_id: 'ext-123' }),
      ];

      const { contacts: processed, result } = processor.processContacts(contacts);

      expect(processed[0].properties['hubspot_external_id']).toBe('ext-123');
      expect(result.fieldsMapped).toBe(1);
    });

    it('should apply transformations', () => {
      const processor = new DataQualityProcessor(createConfig({
        fieldMappings: [
          {
            source: 'external',
            sourceField: 'phone_raw',
            targetField: 'phone_clean',
            transformations: ['phone'],
          },
        ],
      }));
      const contacts = [
        createContact('1', { phone_raw: '(555) 123-4567' }),
      ];

      const { contacts: processed } = processor.processContacts(contacts);

      // Phone transformation removes non-numeric characters except +
      expect(processed[0].properties['phone_clean']).toBe('5551234567');
    });
  });

  describe('runFullCheck', () => {
    it('should process all entity types', () => {
      const processor = new DataQualityProcessor(createConfig());
      const data = {
        contacts: [createContact('1')],
        companies: [createCompany('1')],
        deals: [{ id: '1', properties: { dealname: 'Test' } }] as Deal[],
      };

      const results = processor.runFullCheck(data);

      expect(results.contacts).toBeDefined();
      expect(results.companies).toBeDefined();
      expect(results.deals).toBeDefined();
      expect(results.summary.totalProcessed).toBe(3);
    });

    it('should aggregate summary statistics', () => {
      const processor = new DataQualityProcessor(createConfig({
        autoMergeDuplicates: true,
      }));
      const data = {
        contacts: [
          createContact('1', { email: 'shared@example.com' }),
          createContact('2', { email: 'shared@example.com' }),
          createContact('3'),
        ],
      };

      const results = processor.runFullCheck(data);

      expect(results.summary.totalProcessed).toBe(3);
      expect(results.summary.totalDuplicates).toBe(1);
      expect(results.summary.totalMerged).toBe(1);
    });
  });
});
