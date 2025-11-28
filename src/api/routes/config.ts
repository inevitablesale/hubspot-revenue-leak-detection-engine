/**
 * Configuration API Routes
 * Endpoints for managing app configuration (replaces YAML config)
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from '@hubspot/api-client';

const router = Router();

// Configuration storage path (uses HubSpot custom object in production)
const CONFIG_FILE = path.join(process.cwd(), '.leak-engine-config.json');

interface AppConfig {
  hubspot: {
    portalId?: string;
    pipeline?: string;
    customObjectIds?: Record<string, string>;
  };
  modules: {
    underbilling: { enabled: boolean; threshold?: number };
    missedRenewals: { enabled: boolean; alertDays?: number };
    crossSell: { enabled: boolean };
    csHandoff: { enabled: boolean };
    lifecycle: { enabled: boolean };
    billingGap: { enabled: boolean };
  };
  integrations: {
    stripe: { enabled: boolean; connected: boolean; lastSync?: string };
    quickbooks: { enabled: boolean; connected: boolean; lastSync?: string };
    outlook: { enabled: boolean; connected: boolean; lastSync?: string };
    gmail: { enabled: boolean; connected: boolean; lastSync?: string };
    shopify: { enabled: boolean; connected: boolean; lastSync?: string };
    salesforce: { enabled: boolean; connected: boolean; lastSync?: string };
  };
  compliance: {
    mode: 'none' | 'hipaa' | 'gdpr' | 'soc2';
    auditLogging: boolean;
    dataRetentionDays: number;
    encryptSensitiveFields: boolean;
  };
  automation: {
    scanFrequency: 'manual' | 'hourly' | 'daily' | 'weekly';
    autoRecover: boolean;
    notifyOnCritical: boolean;
    notifyChannels: string[];
  };
}

const DEFAULT_CONFIG: AppConfig = {
  hubspot: {},
  modules: {
    underbilling: { enabled: true, threshold: 1000 },
    missedRenewals: { enabled: true, alertDays: 60 },
    crossSell: { enabled: true },
    csHandoff: { enabled: true },
    lifecycle: { enabled: true },
    billingGap: { enabled: true },
  },
  integrations: {
    stripe: { enabled: false, connected: false },
    quickbooks: { enabled: false, connected: false },
    outlook: { enabled: false, connected: false },
    gmail: { enabled: false, connected: false },
    shopify: { enabled: false, connected: false },
    salesforce: { enabled: false, connected: false },
  },
  compliance: {
    mode: 'none',
    auditLogging: true,
    dataRetentionDays: 365,
    encryptSensitiveFields: false,
  },
  automation: {
    scanFrequency: 'daily',
    autoRecover: false,
    notifyOnCritical: true,
    notifyChannels: ['email', 'hubspot'],
  },
};

/**
 * Load configuration from storage
 */
function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * Save configuration to storage
 */
function saveConfig(config: AppConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
    throw new Error('Failed to save configuration');
  }
}

/**
 * GET /config
 * Get current app configuration
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const config = loadConfig();
    res.json(config);
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

/**
 * PUT /config
 * Update app configuration
 */
router.put('/', (req: Request, res: Response) => {
  try {
    const newConfig = req.body as AppConfig;
    
    // Validate required fields
    if (!newConfig.modules || !newConfig.integrations || !newConfig.compliance || !newConfig.automation) {
      return res.status(400).json({ error: 'Invalid configuration structure' });
    }

    // Merge with existing config
    const currentConfig = loadConfig();
    const mergedConfig: AppConfig = {
      hubspot: { ...currentConfig.hubspot, ...newConfig.hubspot },
      modules: { ...currentConfig.modules, ...newConfig.modules },
      integrations: { ...currentConfig.integrations, ...newConfig.integrations },
      compliance: { ...currentConfig.compliance, ...newConfig.compliance },
      automation: { ...currentConfig.automation, ...newConfig.automation },
    };

    saveConfig(mergedConfig);
    res.json({ success: true, config: mergedConfig });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

/**
 * PATCH /config
 * Partially update app configuration
 */
router.patch('/', (req: Request, res: Response) => {
  try {
    const updates = req.body as Partial<AppConfig>;
    const currentConfig = loadConfig();

    const mergedConfig: AppConfig = {
      ...currentConfig,
      ...(updates.hubspot && { hubspot: { ...currentConfig.hubspot, ...updates.hubspot } }),
      ...(updates.modules && { modules: { ...currentConfig.modules, ...updates.modules } }),
      ...(updates.integrations && { integrations: { ...currentConfig.integrations, ...updates.integrations } }),
      ...(updates.compliance && { compliance: { ...currentConfig.compliance, ...updates.compliance } }),
      ...(updates.automation && { automation: { ...currentConfig.automation, ...updates.automation } }),
    };

    saveConfig(mergedConfig);
    res.json({ success: true, config: mergedConfig });
  } catch (error) {
    console.error('Patch config error:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

/**
 * POST /config/reset
 * Reset configuration to defaults
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    saveConfig(DEFAULT_CONFIG);
    res.json({ success: true, config: DEFAULT_CONFIG });
  } catch (error) {
    console.error('Reset config error:', error);
    res.status(500).json({ error: 'Failed to reset configuration' });
  }
});

/**
 * GET /config/validate
 * Validate current configuration
 */
router.get('/validate', (req: Request, res: Response) => {
  try {
    const config = loadConfig();
    const validationErrors: string[] = [];

    // Check for required integrations if certain modules are enabled
    if (config.modules.billingGap.enabled && !config.integrations.stripe.enabled && !config.integrations.quickbooks.enabled) {
      validationErrors.push('Billing gap detection requires Stripe or QuickBooks integration');
    }

    // Check compliance mode requirements
    if (config.compliance.mode === 'hipaa' && !config.compliance.encryptSensitiveFields) {
      validationErrors.push('HIPAA compliance requires encryption of sensitive fields');
    }

    if (config.compliance.mode === 'hipaa' && config.compliance.dataRetentionDays < 2190) {
      validationErrors.push('HIPAA compliance requires minimum 6-year data retention');
    }

    res.json({
      valid: validationErrors.length === 0,
      errors: validationErrors,
      config,
    });
  } catch (error) {
    console.error('Validate config error:', error);
    res.status(500).json({ error: 'Failed to validate configuration' });
  }
});

export default router;
