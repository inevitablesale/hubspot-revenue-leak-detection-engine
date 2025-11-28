/**
 * Init Command - Interactive setup wizard
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { LeakEngineConfig, getDefaultConfig, getHIPAAConfig, getGDPRConfig } from '../config/types';
import { saveConfig, applyComplianceMode } from '../config/loader';
import { 
  printSuccess, 
  printInfo, 
  printSection, 
  printStep, 
  printTask,
  printWarning 
} from '../utils/output';
import { getIndustryTemplate } from '../../integrations/templates';

interface InitOptions {
  template?: 'saas' | 'agency' | 'healthcare' | 'consulting' | 'retail';
  complianceMode?: 'hipaa' | 'gdpr' | 'none';
  quiet?: boolean;
  config?: string;
}

export class InitCommand {
  private options: InitOptions;
  private rl: readline.Interface | null = null;

  constructor(options: InitOptions) {
    this.options = options;
  }

  async execute(args: string[]): Promise<void> {
    const outputPath = this.options.config || 'leak-engine.config.yaml';

    // Check if config already exists
    if (fs.existsSync(outputPath)) {
      if (!this.options.quiet) {
        printWarning(`Configuration file already exists at ${outputPath}`);
        const overwrite = await this.prompt('Do you want to overwrite it? (y/N): ');
        if (overwrite.toLowerCase() !== 'y') {
          printInfo('Initialization cancelled');
          return;
        }
      }
    }

    printSection('Revenue Leak Detection Engine - Setup Wizard');
    printStep(1, 5, 'Gathering configuration...');

    let config = getDefaultConfig();

    // Apply industry template if specified
    if (this.options.template) {
      printInfo(`Using ${this.options.template} industry template`);
      const template = getIndustryTemplate(this.options.template);
      config = this.mergeTemplate(config, template);
    } else if (!this.options.quiet) {
      // Interactive template selection
      config = await this.selectTemplate(config);
    }

    // Apply compliance mode
    if (this.options.complianceMode && this.options.complianceMode !== 'none') {
      printInfo(`Applying ${this.options.complianceMode.toUpperCase()} compliance settings`);
      config = applyComplianceMode(config, this.options.complianceMode);
    } else if (!this.options.quiet) {
      config = await this.selectCompliance(config);
    }

    // Gather HubSpot credentials
    if (!this.options.quiet) {
      config = await this.gatherHubSpotConfig(config);
    }

    // Select integrations
    if (!this.options.quiet) {
      config = await this.selectIntegrations(config);
    }

    // Save configuration
    printStep(4, 5, 'Saving configuration...');
    saveConfig(config, outputPath);
    printSuccess(`Configuration saved to ${outputPath}`);

    // Print next steps
    printStep(5, 5, 'Setup complete!');
    this.printNextSteps(config, outputPath);

    this.closeReadline();
  }

  private async selectTemplate(config: LeakEngineConfig): Promise<LeakEngineConfig> {
    printSection('Industry Template');
    console.log('Select an industry template to customize your configuration:');
    console.log('  1) SaaS - Subscription metrics, churn detection, MRR tracking');
    console.log('  2) Agency - Project billing, hourly rates, client management');
    console.log('  3) Healthcare - HIPAA compliance, patient data, referrals');
    console.log('  4) Consulting - Proposal stages, fixed-fee deals, utilization');
    console.log('  5) Retail - E-commerce, inventory, order management');
    console.log('  6) None - Start with default configuration');

    const choice = await this.prompt('Select template (1-6): ');
    const templates: Record<string, 'saas' | 'agency' | 'healthcare' | 'consulting' | 'retail' | null> = {
      '1': 'saas',
      '2': 'agency',
      '3': 'healthcare',
      '4': 'consulting',
      '5': 'retail',
      '6': null,
    };

    const templateType = templates[choice];
    if (templateType) {
      const template = getIndustryTemplate(templateType);
      return this.mergeTemplate(config, template);
    }

    return config;
  }

  private async selectCompliance(config: LeakEngineConfig): Promise<LeakEngineConfig> {
    printSection('Compliance Mode');
    console.log('Select compliance requirements:');
    console.log('  1) None - Standard data handling');
    console.log('  2) HIPAA - Healthcare data protection (US)');
    console.log('  3) GDPR - General Data Protection Regulation (EU)');

    const choice = await this.prompt('Select compliance mode (1-3): ');
    
    if (choice === '2') {
      return applyComplianceMode(config, 'hipaa');
    } else if (choice === '3') {
      return applyComplianceMode(config, 'gdpr');
    }

    return config;
  }

  private async gatherHubSpotConfig(config: LeakEngineConfig): Promise<LeakEngineConfig> {
    printSection('HubSpot Configuration');
    
    console.log('Enter your HubSpot credentials (leave blank to skip):');
    
    const clientId = await this.prompt('HubSpot Client ID: ');
    if (clientId) {
      config.hubspot.clientId = clientId;
    }

    const clientSecret = await this.prompt('HubSpot Client Secret: ');
    if (clientSecret) {
      config.hubspot.clientSecret = clientSecret;
    }

    const pipeline = await this.prompt('Default Pipeline Name (e.g., "Sales Pipeline"): ');
    if (pipeline) {
      config.hubspot.pipeline = pipeline;
    }

    const portalId = await this.prompt('HubSpot Portal ID (optional): ');
    if (portalId) {
      config.hubspot.portalId = portalId;
    }

    return config;
  }

  private async selectIntegrations(config: LeakEngineConfig): Promise<LeakEngineConfig> {
    printSection('Integrations');
    console.log('Select integrations to enable (enter comma-separated numbers):');
    console.log('  1) Outlook - Email logging and contact sync');
    console.log('  2) QuickBooks - Invoice and payment sync');
    console.log('  3) Stripe - Payment processing');
    console.log('  4) Shopify - E-commerce data');
    console.log('  5) Gmail - Email logging');
    console.log('  6) Salesforce - CRM data sync');
    console.log('  7) None');

    const choices = await this.prompt('Select integrations (e.g., 1,2,3): ');
    const selected = choices.split(',').map(c => c.trim());

    if (selected.includes('1')) config.integrations.outlook.enabled = true;
    if (selected.includes('2')) config.integrations.quickbooks.enabled = true;
    if (selected.includes('3')) config.integrations.stripe.enabled = true;
    if (selected.includes('4')) config.integrations.shopify.enabled = true;
    if (selected.includes('5')) config.integrations.gmail.enabled = true;
    if (selected.includes('6')) config.integrations.salesforce.enabled = true;

    return config;
  }

  private mergeTemplate(
    config: LeakEngineConfig, 
    template: Partial<LeakEngineConfig>
  ): LeakEngineConfig {
    return {
      ...config,
      ...template,
      hubspot: { ...config.hubspot, ...template.hubspot },
      modules: { ...config.modules, ...template.modules },
      integrations: { ...config.integrations, ...template.integrations },
      dataQuality: { ...config.dataQuality, ...template.dataQuality },
      compliance: { ...config.compliance, ...template.compliance },
      thresholds: { ...config.thresholds, ...template.thresholds },
      reporting: { ...config.reporting, ...template.reporting },
    };
  }

  private printNextSteps(config: LeakEngineConfig, configPath: string): void {
    printSection('Next Steps');
    
    printTask(true, 'Configuration file created');
    
    if (!config.hubspot.clientId) {
      printTask(false, 'Add HubSpot credentials to your configuration');
    } else {
      printTask(true, 'HubSpot credentials configured');
    }

    const enabledIntegrations = Object.entries(config.integrations)
      .filter(([_, v]) => v.enabled)
      .map(([k]) => k);

    if (enabledIntegrations.length > 0) {
      printTask(false, `Configure ${enabledIntegrations.join(', ')} integration credentials`);
    }

    console.log('\nCommands to get started:');
    console.log(`  $ leak-engine scan              # Run a leak detection scan`);
    console.log(`  $ leak-engine dashboard         # View ROI dashboard`);
    console.log(`  $ leak-engine config show       # View current configuration`);
    
    if (config.compliance.mode !== 'none') {
      console.log(`\n⚠️  ${config.compliance.mode.toUpperCase()} compliance mode is enabled.`);
      console.log('   Review sensitive field mappings before processing data.');
    }
  }

  private prompt(question: string): Promise<string> {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
    }

    return new Promise((resolve) => {
      this.rl!.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  private closeReadline(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}
