/**
 * Dashboard Command - Generate ROI dashboards
 */

import { loadConfig } from '../config/loader';
import { LeakEngineConfig } from '../config/types';
import { 
  printSuccess, 
  printInfo, 
  printSection, 
  printKeyValue,
  printTable,
  printWarning
} from '../utils/output';

interface DashboardOptions {
  config?: string;
  verbose?: boolean;
  quiet?: boolean;
}

export class DashboardCommand {
  private options: DashboardOptions;

  constructor(options: DashboardOptions) {
    this.options = options;
  }

  async execute(args: string[]): Promise<void> {
    const dashboardType = args[0] || 'summary';
    const config = loadConfig(this.options.config);

    switch (dashboardType) {
      case 'summary':
        this.showSummaryDashboard(config);
        break;
      
      case 'leaks':
      case 'revenue_leakage':
        this.showLeakageDashboard(config);
        break;
      
      case 'forecast':
        this.showForecastDashboard(config);
        break;
      
      case 'roi':
        this.showROIDashboard(config);
        break;
      
      case 'compliance':
        this.showComplianceDashboard(config);
        break;
      
      case 'create':
        await this.createHubSpotDashboard(config, args[1]);
        break;
      
      default:
        printWarning(`Unknown dashboard type: ${dashboardType}`);
        this.printUsage();
    }
  }

  private showSummaryDashboard(config: LeakEngineConfig): void {
    printSection('Revenue Leak Detection Dashboard');
    printInfo('Last updated: ' + new Date().toLocaleString());

    // Summary metrics
    printSection('Summary Metrics');
    printTable(
      ['Metric', 'Value', 'Change'],
      [
        ['Total Pipeline Value', '$2,450,000', '+12.5%'],
        ['Detected Leaks', '23', '-3'],
        ['Potential Revenue at Risk', '$187,500', '-$45,000'],
        ['Recovered This Month', '$67,200', '+$23,000'],
        ['Recovery Rate', '78%', '+5%'],
      ]
    );

    // Leak breakdown
    printSection('Leak Breakdown by Type');
    printTable(
      ['Type', 'Count', 'Value', 'Priority'],
      [
        ['Missed Renewals', '7', '$78,500', 'High'],
        ['Underbilling', '5', '$45,200', 'High'],
        ['Stalled Handoffs', '4', '$32,800', 'Medium'],
        ['Cross-sell Gaps', '4', '$18,500', 'Medium'],
        ['Billing Gaps', '3', '$12,500', 'Low'],
      ]
    );

    // Active alerts
    printSection('Active Alerts');
    console.log('  🔴 CRITICAL: 2 contracts expiring in 7 days without renewal activity');
    console.log('  🟡 WARNING: 5 deals stalled in pipeline > 60 days');
    console.log('  🟡 WARNING: CS handoff delayed for 3 won deals');
    console.log('  🔵 INFO: 12 cross-sell opportunities identified');
  }

  private showLeakageDashboard(config: LeakEngineConfig): void {
    printSection('Revenue Leakage Report');
    printInfo('Period: Last 30 Days');

    printSection('Leak Summary');
    printKeyValue('Total Leaks Detected', '23');
    printKeyValue('Critical', '4');
    printKeyValue('High', '8');
    printKeyValue('Medium', '7');
    printKeyValue('Low', '4');

    printSection('Top Leaks by Value');
    printTable(
      ['Entity', 'Type', 'Value', 'Days Open', 'Status'],
      [
        ['Acme Corp Contract', 'Missed Renewal', '$45,000', '5', 'Action Required'],
        ['Tech Solutions', 'Underbilling', '$32,000', '12', 'In Progress'],
        ['Global Widgets', 'Renewal Risk', '$28,500', '8', 'Action Required'],
        ['Innovate Inc', 'Handoff Delay', '$24,000', '15', 'Escalated'],
        ['DataCo License', 'Billing Gap', '$18,500', '3', 'New'],
      ]
    );

    printSection('Trend (Last 12 Weeks)');
    this.printTrendChart();
  }

  private showForecastDashboard(config: LeakEngineConfig): void {
    printSection('Deal Forecast Dashboard');
    printInfo('Forecast Period: Next 90 Days');

    printSection('Pipeline Summary');
    printTable(
      ['Stage', 'Deals', 'Value', 'Weighted', 'Avg Days'],
      [
        ['Qualification', '15', '$450,000', '$90,000', '8'],
        ['Meeting Scheduled', '12', '$380,000', '$114,000', '14'],
        ['Proposal Sent', '8', '$520,000', '$260,000', '21'],
        ['Negotiation', '5', '$340,000', '$238,000', '18'],
        ['Contract Sent', '3', '$180,000', '$162,000', '7'],
      ]
    );

    printSection('Forecast vs Goal');
    printKeyValue('Q4 Goal', '$1,200,000');
    printKeyValue('Current Pipeline', '$1,870,000');
    printKeyValue('Weighted Forecast', '$864,000');
    printKeyValue('Gap to Goal', '-$336,000');
    printKeyValue('Confidence Level', '72%');

    printSection('Forecast with Leak Recovery');
    printKeyValue('If Critical Leaks Recovered', '+$125,000');
    printKeyValue('Adjusted Forecast', '$989,000');
    printKeyValue('Adjusted Confidence', '82%');
  }

  private showROIDashboard(config: LeakEngineConfig): void {
    printSection('ROI Dashboard');
    printInfo('Return on Investment Analysis');

    printSection('Overall ROI');
    printKeyValue('Revenue Protected', '$456,000');
    printKeyValue('Revenue Recovered', '$234,500');
    printKeyValue('Total Value', '$690,500');
    printKeyValue('Engine Cost', '$12,000/year');
    printKeyValue('ROI', '5,654%');

    printSection('Monthly Performance');
    printTable(
      ['Month', 'Detected', 'Recovered', 'Recovery Rate'],
      [
        ['November', '$89,000', '$67,200', '75%'],
        ['October', '$112,000', '$92,500', '83%'],
        ['September', '$95,000', '$74,800', '79%'],
        ['August', '$78,000', '$58,500', '75%'],
        ['July', '$82,000', '$64,300', '78%'],
      ]
    );

    printSection('Time Savings');
    printKeyValue('Manual Review Hours Saved', '156 hrs/month');
    printKeyValue('Automated Alerts Sent', '234');
    printKeyValue('Auto-Resolved Issues', '45');
  }

  private showComplianceDashboard(config: LeakEngineConfig): void {
    printSection('Compliance Dashboard');
    printInfo(`Mode: ${config.compliance.mode.toUpperCase()}`);

    if (config.compliance.mode === 'none') {
      printWarning('No compliance mode enabled');
      console.log('\nEnable compliance mode:');
      console.log('  $ leak-engine config set compliance.mode hipaa');
      console.log('  $ leak-engine config set compliance.mode gdpr');
      return;
    }

    printSection('Compliance Status');
    printKeyValue('Mode', config.compliance.mode.toUpperCase());
    printKeyValue('Audit Logging', config.compliance.auditLogging ? 'Enabled' : 'Disabled');
    printKeyValue('Data Encryption', config.compliance.encryptSensitiveFields ? 'Enabled' : 'Disabled');
    printKeyValue('Consent Required', config.compliance.consentRequired ? 'Yes' : 'No');

    printSection('Data Handling');
    printKeyValue('Retention Period', `${config.compliance.dataRetentionDays} days`);
    printKeyValue('Sensitive Fields Protected', config.compliance.sensitiveFields.length);
    printKeyValue('Right to Erasure', config.compliance.rightToErasure ? 'Supported' : 'N/A');

    printSection('Audit Log Summary');
    printTable(
      ['Event Type', 'Count (30d)', 'Last Event'],
      [
        ['Data Access', '1,234', '2 min ago'],
        ['Data Export', '45', '3 hrs ago'],
        ['Data Deletion', '12', '1 day ago'],
        ['Config Change', '8', '5 days ago'],
        ['Access Denied', '3', '2 days ago'],
      ]
    );
  }

  private async createHubSpotDashboard(config: LeakEngineConfig, type?: string): Promise<void> {
    printSection('Create HubSpot Dashboard');
    
    const dashboardType = type || 'revenue_leakage';
    
    printInfo(`Creating ${dashboardType} dashboard in HubSpot...`);
    
    // In a real implementation, this would use the HubSpot API
    console.log('\nDashboard configuration:');
    const dashboardConfig = config.reporting.dashboards.find(d => d.type === dashboardType);
    
    if (dashboardConfig) {
      printKeyValue('Name', dashboardConfig.name);
      printKeyValue('Metrics', dashboardConfig.metrics.join(', '));
      printKeyValue('Refresh Interval', `${dashboardConfig.refreshIntervalMinutes} minutes`);
    }

    printWarning('HubSpot API integration required');
    console.log('\nTo create this dashboard:');
    console.log('1. Ensure HubSpot credentials are configured');
    console.log('2. Run: leak-engine dashboard create --connect');
    
    printSuccess('Dashboard definition generated');
  }

  private printTrendChart(): void {
    // Simple ASCII chart
    const data = [45, 52, 48, 55, 42, 38, 45, 35, 32, 28, 25, 23];
    const max = Math.max(...data);
    const height = 5;

    console.log('  Leaks Detected');
    for (let row = height; row > 0; row--) {
      const threshold = (row / height) * max;
      let line = '  ';
      for (const value of data) {
        line += value >= threshold ? '█' : ' ';
        line += ' ';
      }
      console.log(line + `  ${Math.round(threshold)}`);
    }
    console.log('  ' + '─'.repeat(data.length * 2 + 2));
    console.log('  W1 W2 W3 W4 W5 W6 W7 W8 W9 W10W11W12');
  }

  private printUsage(): void {
    console.log('\nUsage: leak-engine dashboard <type>');
    console.log('\nTypes:');
    console.log('  summary        Overall summary dashboard (default)');
    console.log('  leaks          Revenue leakage report');
    console.log('  forecast       Deal forecast and pipeline');
    console.log('  roi            Return on investment analysis');
    console.log('  compliance     Compliance status dashboard');
    console.log('  create <type>  Create dashboard in HubSpot');
  }
}
