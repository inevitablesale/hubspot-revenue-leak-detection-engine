#!/usr/bin/env node
/**
 * CLI Entry Point for Revenue Leak Detection Engine
 * Provides interactive setup and configuration management
 */

import { InitCommand } from './commands/init';
import { ScanCommand } from './commands/scan';
import { ConfigCommand } from './commands/config';
import { DashboardCommand } from './commands/dashboard';
import { parseArgs } from './utils/args';
import { printHelp, printVersion, printBanner } from './utils/output';

const VERSION = '1.0.0';

interface CLIOptions {
  help?: boolean;
  version?: boolean;
  config?: string;
  verbose?: boolean;
  quiet?: boolean;
  // Module flags
  enableEmailLeak?: boolean;
  enableDuplicateDeals?: boolean;
  enableForecast?: boolean;
  enableOutlook?: boolean;
  enableQuickbooks?: boolean;
  enableStripe?: boolean;
  enableShopify?: boolean;
  enableGmail?: boolean;
  // Feature flags
  skipCleanup?: boolean;
  dedupe?: boolean;
  complianceMode?: 'hipaa' | 'gdpr' | 'none';
  // Industry template
  template?: 'saas' | 'agency' | 'healthcare' | 'consulting' | 'retail';
}

async function main(): Promise<void> {
  const { command, options, args } = parseArgs(process.argv.slice(2));
  
  const cliOptions: CLIOptions = {
    help: options['help'] === 'true' || options['h'] === 'true',
    version: options['version'] === 'true' || options['v'] === 'true',
    config: options['config'] || options['c'],
    verbose: options['verbose'] === 'true',
    quiet: options['quiet'] === 'true' || options['q'] === 'true',
    enableEmailLeak: options['enable-email-leak'] === 'true',
    enableDuplicateDeals: options['enable-duplicate-deals'] === 'true',
    enableForecast: options['enable-forecast'] === 'true',
    enableOutlook: options['outlook'] === 'true',
    enableQuickbooks: options['quickbooks'] === 'true',
    enableStripe: options['stripe'] === 'true',
    enableShopify: options['shopify'] === 'true',
    enableGmail: options['gmail'] === 'true',
    skipCleanup: options['skip-cleanup'] === 'true',
    dedupe: options['dedupe'] === 'true',
    complianceMode: options['compliance'] as CLIOptions['complianceMode'] || 'none',
    template: options['template'] as CLIOptions['template'],
  };

  if (cliOptions.version) {
    printVersion(VERSION);
    return;
  }

  if (cliOptions.help || (!command && args.length === 0)) {
    printHelp();
    return;
  }

  if (!cliOptions.quiet) {
    printBanner();
  }

  try {
    switch (command) {
      case 'init':
        await new InitCommand(cliOptions).execute(args);
        break;
      
      case 'scan':
        await new ScanCommand(cliOptions).execute(args);
        break;
      
      case 'config':
        await new ConfigCommand(cliOptions).execute(args);
        break;
      
      case 'dashboard':
        await new DashboardCommand(cliOptions).execute(args);
        break;
      
      default:
        if (command) {
          console.error(`Unknown command: ${command}`);
        }
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    if (cliOptions.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

// Export for programmatic use
export { InitCommand, ScanCommand, ConfigCommand, DashboardCommand };
export type { CLIOptions };

// Run CLI when executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
