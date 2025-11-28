/**
 * Tests for configuration types and loader
 */

import { 
  getDefaultConfig, 
  getHIPAAConfig, 
  getGDPRConfig,
  LeakEngineConfig 
} from '../../src/cli/config/types';
import { 
  validateConfig,
  applyComplianceMode
} from '../../src/cli/config/loader';

describe('Configuration Types', () => {
  describe('getDefaultConfig', () => {
    it('should return a valid default configuration', () => {
      const config = getDefaultConfig();
      
      expect(config.version).toBe('1.0.0');
      expect(config.hubspot).toBeDefined();
      expect(config.modules).toBeDefined();
      expect(config.integrations).toBeDefined();
      expect(config.compliance).toBeDefined();
      expect(config.thresholds).toBeDefined();
      expect(config.reporting).toBeDefined();
    });

    it('should have all modules configured', () => {
      const config = getDefaultConfig();
      
      expect(config.modules.emailInactivity).toBeDefined();
      expect(config.modules.duplicateDeals).toBeDefined();
      expect(config.modules.forecast).toBeDefined();
      expect(config.modules.underbilling).toBeDefined();
      expect(config.modules.missedRenewals).toBeDefined();
      expect(config.modules.crossSell).toBeDefined();
      expect(config.modules.csHandoff).toBeDefined();
      expect(config.modules.lifecycle).toBeDefined();
      expect(config.modules.billingGap).toBeDefined();
    });

    it('should have all integrations configured', () => {
      const config = getDefaultConfig();
      
      expect(config.integrations.outlook).toBeDefined();
      expect(config.integrations.quickbooks).toBeDefined();
      expect(config.integrations.stripe).toBeDefined();
      expect(config.integrations.shopify).toBeDefined();
      expect(config.integrations.gmail).toBeDefined();
      expect(config.integrations.salesforce).toBeDefined();
    });

    it('should have integrations disabled by default', () => {
      const config = getDefaultConfig();
      
      expect(config.integrations.outlook.enabled).toBe(false);
      expect(config.integrations.quickbooks.enabled).toBe(false);
      expect(config.integrations.stripe.enabled).toBe(false);
      expect(config.integrations.shopify.enabled).toBe(false);
      expect(config.integrations.gmail.enabled).toBe(false);
      expect(config.integrations.salesforce.enabled).toBe(false);
    });

    it('should have modules enabled by default', () => {
      const config = getDefaultConfig();
      
      expect(config.modules.emailInactivity.enabled).toBe(true);
      expect(config.modules.underbilling.enabled).toBe(true);
      expect(config.modules.missedRenewals.enabled).toBe(true);
    });
  });

  describe('getHIPAAConfig', () => {
    it('should return HIPAA compliance settings', () => {
      const hipaaConfig = getHIPAAConfig();
      
      expect(hipaaConfig.mode).toBe('hipaa');
      expect(hipaaConfig.encryptSensitiveFields).toBe(true);
      expect(hipaaConfig.auditLogging).toBe(true);
      expect(hipaaConfig.consentRequired).toBe(true);
      expect(hipaaConfig.dataRetentionDays).toBe(2190); // 6 years
    });

    it('should include healthcare-specific sensitive fields', () => {
      const hipaaConfig = getHIPAAConfig();
      
      expect(hipaaConfig.sensitiveFields).toContain('ssn');
      expect(hipaaConfig.sensitiveFields).toContain('medical_record_number');
      expect(hipaaConfig.sensitiveFields).toContain('diagnosis');
      expect(hipaaConfig.sensitiveFields).toContain('patient_id');
    });
  });

  describe('getGDPRConfig', () => {
    it('should return GDPR compliance settings', () => {
      const gdprConfig = getGDPRConfig();
      
      expect(gdprConfig.mode).toBe('gdpr');
      expect(gdprConfig.encryptSensitiveFields).toBe(true);
      expect(gdprConfig.auditLogging).toBe(true);
      expect(gdprConfig.cookieBannerEnabled).toBe(true);
      expect(gdprConfig.rightToErasure).toBe(true);
      expect(gdprConfig.dataPortability).toBe(true);
    });

    it('should include PII sensitive fields', () => {
      const gdprConfig = getGDPRConfig();
      
      expect(gdprConfig.sensitiveFields).toContain('email');
      expect(gdprConfig.sensitiveFields).toContain('phone');
      expect(gdprConfig.sensitiveFields).toContain('address');
      expect(gdprConfig.sensitiveFields).toContain('ip_address');
    });
  });
});

describe('Configuration Loader', () => {
  describe('applyComplianceMode', () => {
    it('should apply HIPAA settings to config', () => {
      const config = getDefaultConfig();
      const updatedConfig = applyComplianceMode(config, 'hipaa');
      
      expect(updatedConfig.compliance.mode).toBe('hipaa');
      expect(updatedConfig.compliance.encryptSensitiveFields).toBe(true);
      expect(updatedConfig.compliance.auditLogging).toBe(true);
    });

    it('should apply GDPR settings to config', () => {
      const config = getDefaultConfig();
      const updatedConfig = applyComplianceMode(config, 'gdpr');
      
      expect(updatedConfig.compliance.mode).toBe('gdpr');
      expect(updatedConfig.compliance.cookieBannerEnabled).toBe(true);
      expect(updatedConfig.compliance.rightToErasure).toBe(true);
    });

    it('should preserve other config sections', () => {
      const config = getDefaultConfig();
      config.hubspot.pipeline = 'Test Pipeline';
      
      const updatedConfig = applyComplianceMode(config, 'hipaa');
      
      expect(updatedConfig.hubspot.pipeline).toBe('Test Pipeline');
      expect(updatedConfig.modules).toEqual(config.modules);
    });
  });

  describe('validateConfig', () => {
    it('should return no errors for valid config', () => {
      const config = getDefaultConfig();
      config.hubspot.clientId = 'test-client-id';
      config.integrations.stripe.enabled = true;
      
      const errors = validateConfig(config);
      
      expect(errors).toEqual([]);
    });

    it('should warn about compliance settings', () => {
      const config = getDefaultConfig();
      config.compliance.mode = 'hipaa';
      config.compliance.auditLogging = false;
      config.compliance.sensitiveFields = [];  // Also empty sensitive fields
      
      const errors = validateConfig(config);
      
      // Should have warnings about audit logging or sensitive fields
      expect(errors.some(e => e.toLowerCase().includes('audit') || e.toLowerCase().includes('sensitive'))).toBe(true);
    });

    it('should validate threshold ordering', () => {
      const config = getDefaultConfig();
      config.thresholds.criticalLeakValue = 100;
      config.thresholds.highLeakValue = 200;
      
      const errors = validateConfig(config);
      
      expect(errors.some(e => e.includes('Critical leak value'))).toBe(true);
    });
  });
});
