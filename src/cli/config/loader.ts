/**
 * Configuration File Manager
 */

import * as fs from 'fs';
import * as path from 'path';
import { LeakEngineConfig, getDefaultConfig, getHIPAAConfig, getGDPRConfig } from './types';

const DEFAULT_CONFIG_FILENAME = 'leak-engine.config.yaml';

/**
 * Load configuration from file
 */
export function loadConfig(configPath?: string): LeakEngineConfig {
  const filePath = configPath || findConfigFile();
  
  if (!filePath || !fs.existsSync(filePath)) {
    return getDefaultConfig();
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  let parsed: Partial<LeakEngineConfig>;
  
  if (ext === '.json') {
    parsed = JSON.parse(content);
  } else if (ext === '.yaml' || ext === '.yml') {
    parsed = parseYAML(content);
  } else {
    throw new Error(`Unsupported config file format: ${ext}`);
  }

  return mergeConfig(getDefaultConfig(), parsed);
}

/**
 * Save configuration to file
 */
export function saveConfig(config: LeakEngineConfig, configPath?: string): void {
  const filePath = configPath || DEFAULT_CONFIG_FILENAME;
  const ext = path.extname(filePath).toLowerCase();

  let content: string;
  
  if (ext === '.json') {
    content = JSON.stringify(config, null, 2);
  } else {
    content = generateYAML(config);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Find configuration file in current directory or parent directories
 */
export function findConfigFile(): string | null {
  const configNames = [
    'leak-engine.config.yaml',
    'leak-engine.config.yml',
    'leak-engine.config.json',
    '.leak-engine.yaml',
    '.leak-engine.yml',
    '.leak-engine.json',
  ];

  let dir = process.cwd();
  const root = path.parse(dir).root;

  while (dir !== root) {
    for (const name of configNames) {
      const filePath = path.join(dir, name);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    dir = path.dirname(dir);
  }

  return null;
}

/**
 * Merge partial config with default config
 */
function mergeConfig(
  defaultConfig: LeakEngineConfig,
  partial: Partial<LeakEngineConfig>
): LeakEngineConfig {
  return {
    ...defaultConfig,
    ...partial,
    hubspot: { ...defaultConfig.hubspot, ...partial.hubspot },
    modules: { ...defaultConfig.modules, ...partial.modules },
    integrations: { ...defaultConfig.integrations, ...partial.integrations },
    dataQuality: { ...defaultConfig.dataQuality, ...partial.dataQuality },
    compliance: { ...defaultConfig.compliance, ...partial.compliance },
    thresholds: { ...defaultConfig.thresholds, ...partial.thresholds },
    reporting: { ...defaultConfig.reporting, ...partial.reporting },
  };
}

/**
 * Simple YAML parser (handles basic YAML structure)
 */
function parseYAML(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  const stack: { indent: number; obj: Record<string, unknown>; key: string }[] = [
    { indent: -1, obj: result, key: '' },
  ];

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Handle array items
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2);
      const parent = stack[stack.length - 1];
      const target = parent.obj[parent.key];
      if (Array.isArray(target)) {
        if (value.includes(':')) {
          const obj: Record<string, unknown> = {};
          const [k, v] = value.split(':').map(s => s.trim());
          obj[k] = parseValue(v);
          target.push(obj);
        } else {
          target.push(parseValue(value));
        }
      }
      continue;
    }

    // Parse key-value pair
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    // Pop stack until we find the right parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (value === '' || value === '|' || value === '>') {
      // Nested object or array
      const newObj: Record<string, unknown> | unknown[] = {};
      parent[key] = newObj;
      stack.push({ indent, obj: parent, key });
    } else if (value.startsWith('[') && value.endsWith(']')) {
      // Inline array
      const items = value.slice(1, -1).split(',').map(s => parseValue(s.trim()));
      parent[key] = items;
    } else {
      parent[key] = parseValue(value);
    }
  }

  return result;
}

/**
 * Parse a YAML value to its JavaScript type
 */
function parseValue(value: string): string | number | boolean | null {
  if (value === '' || value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Generate YAML from config object
 */
function generateYAML(obj: unknown, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  let result = '';

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        result += `${spaces}-\n`;
        result += generateYAML(item, indent + 1);
      } else {
        result += `${spaces}- ${formatYAMLValue(item)}\n`;
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result += `${spaces}${key}:\n`;
        result += generateYAML(value, indent + 1);
      } else if (Array.isArray(value)) {
        result += `${spaces}${key}:\n`;
        result += generateYAML(value, indent + 1);
      } else {
        result += `${spaces}${key}: ${formatYAMLValue(value)}\n`;
      }
    }
  }

  return result;
}

/**
 * Format a value for YAML output
 */
function formatYAMLValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (value.includes(':') || value.includes('#') || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}

/**
 * Apply compliance mode to config
 */
export function applyComplianceMode(
  config: LeakEngineConfig,
  mode: 'hipaa' | 'gdpr'
): LeakEngineConfig {
  const complianceConfig = mode === 'hipaa' ? getHIPAAConfig() : getGDPRConfig();
  return {
    ...config,
    compliance: {
      ...config.compliance,
      ...complianceConfig,
    },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: LeakEngineConfig): string[] {
  const errors: string[] = [];

  // Validate HubSpot config if any integrations are enabled
  const anyIntegrationEnabled = Object.values(config.integrations).some(i => i.enabled);
  if (anyIntegrationEnabled && !config.hubspot.clientId) {
    errors.push('HubSpot client ID is required when integrations are enabled');
  }

  // Validate compliance settings
  if (config.compliance.mode !== 'none') {
    if (!config.compliance.auditLogging) {
      errors.push(`Audit logging should be enabled for ${config.compliance.mode} compliance`);
    }
    if (config.compliance.sensitiveFields.length === 0) {
      errors.push('Sensitive fields should be defined for compliance mode');
    }
  }

  // Validate threshold values
  if (config.thresholds.criticalLeakValue <= config.thresholds.highLeakValue) {
    errors.push('Critical leak value should be greater than high leak value');
  }
  if (config.thresholds.highLeakValue <= config.thresholds.mediumLeakValue) {
    errors.push('High leak value should be greater than medium leak value');
  }

  return errors;
}
