/**
 * Config Command - View and modify configuration
 */

import { loadConfig, saveConfig, validateConfig } from '../config/loader';
import { LeakEngineConfig } from '../config/types';
import { 
  printSuccess, 
  printInfo, 
  printSection, 
  printKeyValue,
  printWarning,
  printError
} from '../utils/output';

interface ConfigOptions {
  config?: string;
  verbose?: boolean;
  quiet?: boolean;
}

export class ConfigCommand {
  private options: ConfigOptions;

  constructor(options: ConfigOptions) {
    this.options = options;
  }

  async execute(args: string[]): Promise<void> {
    const subcommand = args[0] || 'show';
    const config = loadConfig(this.options.config);

    switch (subcommand) {
      case 'show':
        this.showConfig(config);
        break;
      
      case 'set':
        await this.setConfig(config, args.slice(1));
        break;
      
      case 'get':
        this.getConfig(config, args[1]);
        break;
      
      case 'validate':
        this.validateConfig(config);
        break;
      
      case 'reset':
        await this.resetConfig(args[1]);
        break;
      
      default:
        printError(`Unknown config subcommand: ${subcommand}`);
        this.printUsage();
    }
  }

  private showConfig(config: LeakEngineConfig): void {
    printSection('Current Configuration');

    printSection('HubSpot');
    printKeyValue('Client ID', config.hubspot.clientId ? '***configured***' : 'not set');
    printKeyValue('Pipeline', config.hubspot.pipeline || 'not set');
    printKeyValue('Portal ID', config.hubspot.portalId || 'not set');

    printSection('Modules');
    Object.entries(config.modules).forEach(([name, settings]) => {
      printKeyValue(name, settings.enabled ? 'enabled' : 'disabled');
    });

    printSection('Integrations');
    Object.entries(config.integrations).forEach(([name, settings]) => {
      printKeyValue(name, settings.enabled ? 'enabled' : 'disabled');
    });

    printSection('Compliance');
    printKeyValue('Mode', config.compliance.mode);
    printKeyValue('Audit Logging', config.compliance.auditLogging);
    printKeyValue('Encrypt Sensitive Fields', config.compliance.encryptSensitiveFields);

    printSection('Thresholds');
    printKeyValue('Critical Leak Value', `$${config.thresholds.criticalLeakValue.toLocaleString()}`);
    printKeyValue('High Leak Value', `$${config.thresholds.highLeakValue.toLocaleString()}`);
    printKeyValue('Medium Leak Value', `$${config.thresholds.mediumLeakValue.toLocaleString()}`);

    printSection('Reporting');
    printKeyValue('Enabled', config.reporting.enabled);
    printKeyValue('Frequency', config.reporting.reportFrequency);
    printKeyValue('Dashboards', config.reporting.dashboards.length);
  }

  private async setConfig(config: LeakEngineConfig, args: string[]): Promise<void> {
    if (args.length < 2) {
      printError('Usage: leak-engine config set <path> <value>');
      return;
    }

    const [path, ...valueParts] = args;
    const value = valueParts.join(' ');

    try {
      this.setNestedValue(config as unknown as Record<string, unknown>, path, this.parseValue(value));
      saveConfig(config, this.options.config);
      printSuccess(`Set ${path} = ${value}`);
    } catch (error) {
      printError(`Failed to set config: ${(error as Error).message}`);
    }
  }

  private getConfig(config: LeakEngineConfig, path?: string): void {
    if (!path) {
      printError('Usage: leak-engine config get <path>');
      return;
    }

    try {
      const value = this.getNestedValue(config as unknown as Record<string, unknown>, path);
      if (typeof value === 'object') {
        console.log(JSON.stringify(value, null, 2));
      } else {
        console.log(value);
      }
    } catch (error) {
      printError(`Config path not found: ${path}`);
    }
  }

  private validateConfig(config: LeakEngineConfig): void {
    printSection('Configuration Validation');
    
    const errors = validateConfig(config);
    
    if (errors.length === 0) {
      printSuccess('Configuration is valid');
    } else {
      printWarning(`Found ${errors.length} issue(s):`);
      errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
  }

  private async resetConfig(section?: string): Promise<void> {
    const { getDefaultConfig } = await import('../config/types');
    const defaultConfig = getDefaultConfig();

    if (section) {
      const config = loadConfig(this.options.config);
      const sectionKey = section as keyof LeakEngineConfig;
      
      if (sectionKey in defaultConfig) {
        (config as unknown as Record<string, unknown>)[sectionKey] = 
          (defaultConfig as unknown as Record<string, unknown>)[sectionKey];
        saveConfig(config, this.options.config);
        printSuccess(`Reset ${section} to defaults`);
      } else {
        printError(`Unknown section: ${section}`);
      }
    } else {
      saveConfig(defaultConfig, this.options.config);
      printSuccess('Reset all configuration to defaults');
    }
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;

    // Prevent prototype pollution
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (dangerousKeys.includes(part)) {
        throw new Error(`Invalid path: cannot access ${part}`);
      }
      if (!(part in current) || !Object.prototype.hasOwnProperty.call(current, part)) {
        throw new Error(`Path not found: ${parts.slice(0, i + 1).join('.')}`);
      }
      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1];
    if (dangerousKeys.includes(lastPart)) {
      throw new Error(`Invalid path: cannot access ${lastPart}`);
    }
    if (!(lastPart in current) || !Object.prototype.hasOwnProperty.call(current, lastPart)) {
      throw new Error(`Property not found: ${path}`);
    }
    current[lastPart] = value;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    // Prevent prototype pollution
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

    for (const part of parts) {
      if (dangerousKeys.includes(part)) {
        throw new Error(`Invalid path: cannot access ${part}`);
      }
      if (current === null || current === undefined || typeof current !== 'object') {
        throw new Error(`Path not found: ${path}`);
      }
      if (!Object.prototype.hasOwnProperty.call(current, part)) {
        throw new Error(`Path not found: ${path}`);
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private parseValue(value: string): string | number | boolean {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
    return value;
  }

  private printUsage(): void {
    console.log('\nUsage: leak-engine config <subcommand> [args]');
    console.log('\nSubcommands:');
    console.log('  show                     Show current configuration');
    console.log('  get <path>               Get a specific config value');
    console.log('  set <path> <value>       Set a config value');
    console.log('  validate                 Validate configuration');
    console.log('  reset [section]          Reset configuration to defaults');
    console.log('\nExamples:');
    console.log('  leak-engine config show');
    console.log('  leak-engine config get hubspot.pipeline');
    console.log('  leak-engine config set hubspot.pipeline "Sales Pipeline"');
    console.log('  leak-engine config set modules.underbilling.enabled true');
    console.log('  leak-engine config validate');
    console.log('  leak-engine config reset modules');
  }
}
