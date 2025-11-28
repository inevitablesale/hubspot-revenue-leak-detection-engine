/**
 * Tests for industry templates
 */

import { 
  getIndustryTemplate, 
  getTemplateDescription, 
  getAvailableTemplates,
  IndustryType 
} from '../../src/integrations/templates';

describe('Industry Templates', () => {
  describe('getIndustryTemplate', () => {
    it('should return SaaS template', () => {
      const template = getIndustryTemplate('saas');
      
      expect(template).toBeDefined();
      expect(template.modules?.emailInactivity?.inactivityDays).toBe(14);
      expect(template.integrations?.stripe?.enabled).toBe(true);
      expect(template.thresholds?.criticalLeakValue).toBe(25000);
    });

    it('should return Agency template', () => {
      const template = getIndustryTemplate('agency');
      
      expect(template).toBeDefined();
      expect(template.integrations?.quickbooks?.enabled).toBe(true);
      expect(template.integrations?.outlook?.enabled).toBe(true);
    });

    it('should return Healthcare template with HIPAA settings', () => {
      const template = getIndustryTemplate('healthcare');
      
      expect(template).toBeDefined();
      expect(template.compliance?.mode).toBe('hipaa');
      expect(template.compliance?.encryptSensitiveFields).toBe(true);
      expect(template.compliance?.auditLogging).toBe(true);
      expect(template.modules?.csHandoff?.maxHandoffDelayDays).toBe(1);
    });

    it('should return Consulting template', () => {
      const template = getIndustryTemplate('consulting');
      
      expect(template).toBeDefined();
      expect(template.modules?.crossSell?.enabled).toBe(true);
      expect(template.integrations?.quickbooks?.enabled).toBe(true);
    });

    it('should return Retail template with Shopify', () => {
      const template = getIndustryTemplate('retail');
      
      expect(template).toBeDefined();
      expect(template.integrations?.shopify?.enabled).toBe(true);
      expect(template.integrations?.stripe?.enabled).toBe(true);
      expect(template.modules?.billingGap?.maxGapDays).toBe(7);
    });
  });

  describe('getTemplateDescription', () => {
    it('should return description for each template', () => {
      const templates: IndustryType[] = ['saas', 'agency', 'healthcare', 'consulting', 'retail'];
      
      for (const template of templates) {
        const description = getTemplateDescription(template);
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      }
    });

    it('should have unique descriptions', () => {
      const descriptions = new Set([
        getTemplateDescription('saas'),
        getTemplateDescription('agency'),
        getTemplateDescription('healthcare'),
        getTemplateDescription('consulting'),
        getTemplateDescription('retail'),
      ]);
      
      expect(descriptions.size).toBe(5);
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return all available templates', () => {
      const templates = getAvailableTemplates();
      
      expect(templates.length).toBe(5);
      expect(templates.map(t => t.type)).toContain('saas');
      expect(templates.map(t => t.type)).toContain('agency');
      expect(templates.map(t => t.type)).toContain('healthcare');
      expect(templates.map(t => t.type)).toContain('consulting');
      expect(templates.map(t => t.type)).toContain('retail');
    });

    it('should include descriptions for all templates', () => {
      const templates = getAvailableTemplates();
      
      for (const template of templates) {
        expect(template.description).toBeDefined();
        expect(template.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('SaaS template specifics', () => {
    it('should have shorter inactivity threshold', () => {
      const template = getIndustryTemplate('saas');
      
      // SaaS needs more frequent engagement monitoring
      expect(template.modules?.emailInactivity?.inactivityDays).toBeLessThan(30);
    });

    it('should have MRR-focused dashboard', () => {
      const template = getIndustryTemplate('saas');
      
      const dashboards = template.reporting?.dashboards || [];
      const mrrDashboard = dashboards.find(d => d.name.includes('MRR'));
      
      expect(mrrDashboard).toBeDefined();
    });

    it('should have subscription lifecycle stages', () => {
      const template = getIndustryTemplate('saas');
      
      expect(template.modules?.lifecycle?.requiredStages).toContain('trial');
      expect(template.modules?.lifecycle?.requiredStages).toContain('subscriber');
    });
  });

  describe('Healthcare template specifics', () => {
    it('should have patient-focused sensitive fields', () => {
      const template = getIndustryTemplate('healthcare');
      
      expect(template.compliance?.sensitiveFields).toContain('medical_record_number');
      expect(template.compliance?.sensitiveFields).toContain('diagnosis');
      expect(template.compliance?.sensitiveFields).toContain('patient_id');
    });

    it('should have 6-year data retention', () => {
      const template = getIndustryTemplate('healthcare');
      
      // HIPAA requires 6 years
      expect(template.compliance?.dataRetentionDays).toBe(2190);
    });

    it('should disable Gmail for HIPAA compliance', () => {
      const template = getIndustryTemplate('healthcare');
      
      expect(template.integrations?.gmail?.enabled).toBe(false);
    });

    it('should have urgent CS handoff', () => {
      const template = getIndustryTemplate('healthcare');
      
      // Patient care requires fast handoffs
      expect(template.modules?.csHandoff?.maxHandoffDelayDays).toBe(1);
    });
  });

  describe('Retail template specifics', () => {
    it('should have Shopify integration enabled', () => {
      const template = getIndustryTemplate('retail');
      
      expect(template.integrations?.shopify?.enabled).toBe(true);
      expect(template.integrations?.shopify?.syncAbandonedCarts).toBe(true);
    });

    it('should have fast billing cycles', () => {
      const template = getIndustryTemplate('retail');
      
      // Retail needs quick billing
      expect(template.modules?.billingGap?.maxGapDays).toBeLessThanOrEqual(7);
    });

    it('should have e-commerce lifecycle stages', () => {
      const template = getIndustryTemplate('retail');
      
      expect(template.modules?.lifecycle?.requiredStages).toContain('cart');
      expect(template.modules?.lifecycle?.requiredStages).toContain('checkout');
    });
  });
});
