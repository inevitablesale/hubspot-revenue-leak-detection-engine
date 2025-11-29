/**
 * Notification Integration Service
 * Sends leak alerts to Slack and Microsoft Teams with fix-action buttons
 */

import { RevenueLeak, LeakType, LeakSeverity } from '../types';
import { generateId } from '../utils/helpers';

export interface NotificationConfig {
  slack?: SlackConfig;
  teams?: TeamsConfig;
  enabled: boolean;
  severityThreshold: LeakSeverity;
  channels: NotificationChannel[];
}

export interface SlackConfig {
  webhookUrl: string;
  defaultChannel: string;
  botName?: string;
  iconEmoji?: string;
  enabled: boolean;
}

export interface TeamsConfig {
  webhookUrl: string;
  defaultChannel: string;
  enabled: boolean;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'slack' | 'teams' | 'email';
  target: string; // channel name, webhook URL, or email
  leakTypes?: LeakType[]; // Filter by leak types, or all if empty
  severities?: LeakSeverity[]; // Filter by severity, or all if empty
  isDefault: boolean;
}

export interface NotificationMessage {
  id: string;
  leakId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  severity: LeakSeverity;
  potentialRevenue: number;
  actionButtons: ActionButton[];
  sentAt?: Date;
  deliveryStatus: 'pending' | 'sent' | 'failed';
  error?: string;
}

export interface ActionButton {
  id: string;
  label: string;
  style: 'primary' | 'danger' | 'default';
  actionUrl: string;
  actionType: 'resolve' | 'dismiss' | 'create_task' | 'view_details' | 'escalate';
}

export interface SlackMessage {
  channel: string;
  username?: string;
  icon_emoji?: string;
  attachments: SlackAttachment[];
}

export interface SlackAttachment {
  fallback: string;
  color: string;
  pretext?: string;
  title: string;
  title_link?: string;
  text: string;
  fields: SlackField[];
  actions?: SlackAction[];
  footer?: string;
  ts?: number;
}

export interface SlackField {
  title: string;
  value: string;
  short: boolean;
}

export interface SlackAction {
  type: 'button';
  text: string;
  url?: string;
  style?: 'primary' | 'danger';
  name: string;
  value: string;
}

export interface TeamsCard {
  '@type': 'MessageCard';
  '@context': string;
  themeColor: string;
  summary: string;
  sections: TeamsSection[];
  potentialAction: TeamsAction[];
}

export interface TeamsSection {
  activityTitle: string;
  activitySubtitle?: string;
  activityImage?: string;
  facts: TeamsFact[];
  markdown: boolean;
}

export interface TeamsFact {
  name: string;
  value: string;
}

export interface TeamsAction {
  '@type': 'OpenUri' | 'ActionCard';
  name: string;
  targets?: Array<{ os: string; uri: string }>;
  actions?: TeamsInput[];
}

export interface TeamsInput {
  '@type': 'HttpPOST';
  name: string;
  target: string;
}

export interface NotificationStats {
  totalSent: number;
  byChannel: Record<string, number>;
  byLeakType: Record<string, number>;
  bySeverity: Record<string, number>;
  failedCount: number;
  lastSentAt?: Date;
}

export class NotificationIntegrationService {
  private config: NotificationConfig;
  private messageHistory: NotificationMessage[] = [];
  private appBaseUrl: string;

  constructor(config?: Partial<NotificationConfig>) {
    this.appBaseUrl = process.env.APP_BASE_URL || 'https://app.hubspot.com';
    this.config = {
      enabled: true,
      severityThreshold: 'medium',
      channels: [],
      ...config
    };
  }

  /**
   * Configure Slack integration
   */
  configureSlack(config: SlackConfig): void {
    this.config.slack = config;
  }

  /**
   * Configure Teams integration
   */
  configureTeams(config: TeamsConfig): void {
    this.config.teams = config;
  }

  /**
   * Add a notification channel
   */
  addChannel(channel: NotificationChannel): void {
    this.config.channels.push(channel);
  }

  /**
   * Remove a notification channel
   */
  removeChannel(channelId: string): boolean {
    const index = this.config.channels.findIndex(c => c.id === channelId);
    if (index !== -1) {
      this.config.channels.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all configured channels
   */
  getChannels(): NotificationChannel[] {
    return this.config.channels;
  }

  /**
   * Send notification for a leak
   */
  async sendLeakNotification(leak: RevenueLeak): Promise<NotificationMessage[]> {
    if (!this.config.enabled) {
      return [];
    }

    // Check severity threshold
    const severityOrder: LeakSeverity[] = ['low', 'medium', 'high', 'critical'];
    if (severityOrder.indexOf(leak.severity) < severityOrder.indexOf(this.config.severityThreshold)) {
      return [];
    }

    const messages: NotificationMessage[] = [];
    const applicableChannels = this.getApplicableChannels(leak);

    for (const channel of applicableChannels) {
      const message = await this.sendToChannel(leak, channel);
      messages.push(message);
      this.messageHistory.push(message);
    }

    return messages;
  }

  /**
   * Send batch notifications for multiple leaks
   */
  async sendBatchNotification(leaks: RevenueLeak[], summary?: string): Promise<NotificationMessage[]> {
    if (!this.config.enabled || leaks.length === 0) {
      return [];
    }

    const messages: NotificationMessage[] = [];
    const defaultChannels = this.config.channels.filter(c => c.isDefault);

    for (const channel of defaultChannels) {
      const message = await this.sendBatchToChannel(leaks, channel, summary);
      messages.push(message);
      this.messageHistory.push(message);
    }

    return messages;
  }

  /**
   * Get channels applicable to a leak
   */
  private getApplicableChannels(leak: RevenueLeak): NotificationChannel[] {
    return this.config.channels.filter(channel => {
      // Check leak type filter
      if (channel.leakTypes && channel.leakTypes.length > 0) {
        if (!channel.leakTypes.includes(leak.type)) {
          return false;
        }
      }

      // Check severity filter
      if (channel.severities && channel.severities.length > 0) {
        if (!channel.severities.includes(leak.severity)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(leak: RevenueLeak, channel: NotificationChannel): Promise<NotificationMessage> {
    const message: NotificationMessage = {
      id: generateId(),
      leakId: leak.id,
      channel,
      title: this.generateTitle(leak),
      body: this.generateBody(leak),
      severity: leak.severity,
      potentialRevenue: leak.potentialRevenue,
      actionButtons: this.generateActionButtons(leak),
      deliveryStatus: 'pending'
    };

    try {
      if (channel.type === 'slack') {
        await this.sendSlackMessage(leak, channel);
      } else if (channel.type === 'teams') {
        await this.sendTeamsMessage(leak, channel);
      }
      
      message.deliveryStatus = 'sent';
      message.sentAt = new Date();
    } catch (error) {
      message.deliveryStatus = 'failed';
      message.error = (error as Error).message;
    }

    return message;
  }

  /**
   * Send batch notification to a channel
   */
  private async sendBatchToChannel(
    leaks: RevenueLeak[],
    channel: NotificationChannel,
    summary?: string
  ): Promise<NotificationMessage> {
    const totalRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    const criticalCount = leaks.filter(l => l.severity === 'critical').length;
    const highCount = leaks.filter(l => l.severity === 'high').length;

    const message: NotificationMessage = {
      id: generateId(),
      leakId: 'batch',
      channel,
      title: `🚨 ${leaks.length} Revenue Leaks Detected`,
      body: summary || `${leaks.length} leaks totaling ${this.formatCurrency(totalRevenue)} at risk`,
      severity: criticalCount > 0 ? 'critical' : highCount > 0 ? 'high' : 'medium',
      potentialRevenue: totalRevenue,
      actionButtons: [
        {
          id: generateId(),
          label: 'View Dashboard',
          style: 'primary',
          actionUrl: `${this.appBaseUrl}/leak-dashboard`,
          actionType: 'view_details'
        }
      ],
      deliveryStatus: 'pending'
    };

    try {
      if (channel.type === 'slack') {
        await this.sendSlackBatchMessage(leaks, channel, summary);
      } else if (channel.type === 'teams') {
        await this.sendTeamsBatchMessage(leaks, channel, summary);
      }
      
      message.deliveryStatus = 'sent';
      message.sentAt = new Date();
    } catch (error) {
      message.deliveryStatus = 'failed';
      message.error = (error as Error).message;
    }

    return message;
  }

  /**
   * Send Slack message for single leak
   */
  private async sendSlackMessage(leak: RevenueLeak, channel: NotificationChannel): Promise<void> {
    if (!this.config.slack?.enabled) return;

    const slackMessage: SlackMessage = {
      channel: channel.target || this.config.slack.defaultChannel,
      username: this.config.slack.botName || 'Revenue Leak Bot',
      icon_emoji: this.config.slack.iconEmoji || ':money_with_wings:',
      attachments: [{
        fallback: this.generateTitle(leak),
        color: this.getSeverityColor(leak.severity),
        title: this.generateTitle(leak),
        title_link: `${this.appBaseUrl}/leak/${leak.id}`,
        text: leak.description,
        fields: [
          { title: 'Severity', value: leak.severity.toUpperCase(), short: true },
          { title: 'Revenue at Risk', value: this.formatCurrency(leak.potentialRevenue), short: true },
          { title: 'Leak Type', value: this.formatLeakType(leak.type), short: true },
          { title: 'Entity', value: leak.affectedEntity.name || leak.affectedEntity.id, short: true }
        ],
        actions: [
          {
            type: 'button',
            text: '✅ Resolve',
            style: 'primary',
            name: 'resolve',
            value: leak.id,
            url: `${this.appBaseUrl}/api/v1/actions/resolve-leak/${leak.id}`
          },
          {
            type: 'button',
            text: '📋 Create Task',
            name: 'create_task',
            value: leak.id,
            url: `${this.appBaseUrl}/api/v1/actions/create-task/${leak.id}`
          },
          {
            type: 'button',
            text: '🔍 View Details',
            name: 'view',
            value: leak.id,
            url: `${this.appBaseUrl}/leak/${leak.id}`
          },
          {
            type: 'button',
            text: '❌ Dismiss',
            style: 'danger',
            name: 'dismiss',
            value: leak.id,
            url: `${this.appBaseUrl}/api/v1/leaks/${leak.id}/dismiss`
          }
        ],
        footer: 'Revenue Leak Detection Engine',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    // In production, this would make an actual HTTP request to Slack webhook
    await this.simulateWebhookCall('slack', slackMessage);
  }

  /**
   * Send Slack batch message
   */
  private async sendSlackBatchMessage(
    leaks: RevenueLeak[],
    channel: NotificationChannel,
    summary?: string
  ): Promise<void> {
    if (!this.config.slack?.enabled) return;

    const totalRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    const bySeverity = this.groupBySeverity(leaks);

    const fields: SlackField[] = [
      { title: 'Total Leaks', value: String(leaks.length), short: true },
      { title: 'Revenue at Risk', value: this.formatCurrency(totalRevenue), short: true }
    ];

    for (const [severity, count] of Object.entries(bySeverity)) {
      if (count > 0) {
        fields.push({ title: `${severity} Severity`, value: String(count), short: true });
      }
    }

    const slackMessage: SlackMessage = {
      channel: channel.target || this.config.slack.defaultChannel,
      username: this.config.slack.botName || 'Revenue Leak Bot',
      icon_emoji: this.config.slack.iconEmoji || ':money_with_wings:',
      attachments: [{
        fallback: `${leaks.length} revenue leaks detected`,
        color: this.getSeverityColor(bySeverity.critical > 0 ? 'critical' : 'high'),
        pretext: summary,
        title: `🚨 ${leaks.length} Revenue Leaks Detected`,
        title_link: `${this.appBaseUrl}/leak-dashboard`,
        text: `New revenue leaks have been detected that require attention.`,
        fields,
        actions: [
          {
            type: 'button',
            text: '📊 View Dashboard',
            style: 'primary',
            name: 'dashboard',
            value: 'dashboard',
            url: `${this.appBaseUrl}/leak-dashboard`
          },
          {
            type: 'button',
            text: '🔧 Fix All',
            name: 'fix_all',
            value: 'fix_all',
            url: `${this.appBaseUrl}/api/v1/actions/recover-all`
          }
        ],
        footer: 'Revenue Leak Detection Engine',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    await this.simulateWebhookCall('slack', slackMessage);
  }

  /**
   * Send Teams message for single leak
   */
  private async sendTeamsMessage(leak: RevenueLeak, channel: NotificationChannel): Promise<void> {
    if (!this.config.teams?.enabled) return;

    const teamsCard: TeamsCard = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: this.getSeverityColorHex(leak.severity),
      summary: this.generateTitle(leak),
      sections: [{
        activityTitle: this.generateTitle(leak),
        activitySubtitle: `${leak.affectedEntity.type}: ${leak.affectedEntity.name || leak.affectedEntity.id}`,
        facts: [
          { name: 'Severity', value: leak.severity.toUpperCase() },
          { name: 'Revenue at Risk', value: this.formatCurrency(leak.potentialRevenue) },
          { name: 'Leak Type', value: this.formatLeakType(leak.type) },
          { name: 'Description', value: leak.description }
        ],
        markdown: true
      }],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'View Details',
          targets: [{ os: 'default', uri: `${this.appBaseUrl}/leak/${leak.id}` }]
        },
        {
          '@type': 'OpenUri',
          name: 'Resolve Leak',
          targets: [{ os: 'default', uri: `${this.appBaseUrl}/api/v1/actions/resolve-leak/${leak.id}` }]
        },
        {
          '@type': 'OpenUri',
          name: 'Create Task',
          targets: [{ os: 'default', uri: `${this.appBaseUrl}/api/v1/actions/create-task/${leak.id}` }]
        }
      ]
    };

    await this.simulateWebhookCall('teams', teamsCard);
  }

  /**
   * Send Teams batch message
   */
  private async sendTeamsBatchMessage(
    leaks: RevenueLeak[],
    channel: NotificationChannel,
    summary?: string
  ): Promise<void> {
    if (!this.config.teams?.enabled) return;

    const totalRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    const bySeverity = this.groupBySeverity(leaks);

    const facts: TeamsFact[] = [
      { name: 'Total Leaks', value: String(leaks.length) },
      { name: 'Revenue at Risk', value: this.formatCurrency(totalRevenue) },
      { name: 'Critical', value: String(bySeverity.critical || 0) },
      { name: 'High', value: String(bySeverity.high || 0) },
      { name: 'Medium', value: String(bySeverity.medium || 0) }
    ];

    const teamsCard: TeamsCard = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: bySeverity.critical > 0 ? 'dc3545' : 'fd7e14',
      summary: summary || `${leaks.length} Revenue Leaks Detected`,
      sections: [{
        activityTitle: `🚨 ${leaks.length} Revenue Leaks Detected`,
        activitySubtitle: summary || 'New revenue leaks require attention',
        facts,
        markdown: true
      }],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'View Dashboard',
          targets: [{ os: 'default', uri: `${this.appBaseUrl}/leak-dashboard` }]
        },
        {
          '@type': 'OpenUri',
          name: 'Fix All Leaks',
          targets: [{ os: 'default', uri: `${this.appBaseUrl}/api/v1/actions/recover-all` }]
        }
      ]
    };

    await this.simulateWebhookCall('teams', teamsCard);
  }

  /**
   * Simulate webhook call (in production, would make actual HTTP request)
   */
  private async simulateWebhookCall(platform: 'slack' | 'teams', payload: unknown): Promise<void> {
    // In production, this would be:
    // const webhookUrl = platform === 'slack' ? this.config.slack?.webhookUrl : this.config.teams?.webhookUrl;
    // await axios.post(webhookUrl, payload);
    
    console.log(`[${platform.toUpperCase()}] Sending notification:`, JSON.stringify(payload, null, 2));
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Generate notification title
   */
  private generateTitle(leak: RevenueLeak): string {
    const emoji = this.getSeverityEmoji(leak.severity);
    return `${emoji} Revenue Leak: ${this.formatLeakType(leak.type)}`;
  }

  /**
   * Generate notification body
   */
  private generateBody(leak: RevenueLeak): string {
    return `${leak.description}\n\nPotential revenue at risk: ${this.formatCurrency(leak.potentialRevenue)}`;
  }

  /**
   * Generate action buttons for a leak
   */
  private generateActionButtons(leak: RevenueLeak): ActionButton[] {
    return [
      {
        id: generateId(),
        label: 'Resolve',
        style: 'primary',
        actionUrl: `${this.appBaseUrl}/api/v1/actions/resolve-leak/${leak.id}`,
        actionType: 'resolve'
      },
      {
        id: generateId(),
        label: 'Create Task',
        style: 'default',
        actionUrl: `${this.appBaseUrl}/api/v1/actions/create-task/${leak.id}`,
        actionType: 'create_task'
      },
      {
        id: generateId(),
        label: 'View Details',
        style: 'default',
        actionUrl: `${this.appBaseUrl}/leak/${leak.id}`,
        actionType: 'view_details'
      },
      {
        id: generateId(),
        label: 'Dismiss',
        style: 'danger',
        actionUrl: `${this.appBaseUrl}/api/v1/leaks/${leak.id}/dismiss`,
        actionType: 'dismiss'
      }
    ];
  }

  /**
   * Group leaks by severity
   */
  private groupBySeverity(leaks: RevenueLeak[]): Record<LeakSeverity, number> {
    const result: Record<LeakSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const leak of leaks) {
      result[leak.severity]++;
    }

    return result;
  }

  /**
   * Get color for severity (Slack format)
   */
  private getSeverityColor(severity: LeakSeverity): string {
    const colors: Record<LeakSeverity, string> = {
      critical: 'danger',
      high: 'warning',
      medium: '#ffc107',
      low: 'good'
    };
    return colors[severity];
  }

  /**
   * Get hex color for severity (Teams format)
   */
  private getSeverityColorHex(severity: LeakSeverity): string {
    const colors: Record<LeakSeverity, string> = {
      critical: 'dc3545',
      high: 'fd7e14',
      medium: 'ffc107',
      low: '28a745'
    };
    return colors[severity];
  }

  /**
   * Get emoji for severity
   */
  private getSeverityEmoji(severity: LeakSeverity): string {
    const emojis: Record<LeakSeverity, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return emojis[severity];
  }

  /**
   * Format leak type for display
   */
  private formatLeakType(type: LeakType): string {
    const labels: Record<LeakType, string> = {
      underbilling: 'Underbilling',
      missed_renewal: 'Missed Renewal',
      untriggered_crosssell: 'Cross-sell Opportunity',
      stalled_cs_handoff: 'Stalled CS Handoff',
      invalid_lifecycle_path: 'Lifecycle Issue',
      billing_gap: 'Billing Gap',
      stale_pipeline: 'Stale Pipeline',
      missed_handoff: 'Missed Handoff',
      data_quality: 'Data Quality'
    };
    return labels[type] || type;
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Get notification statistics
   */
  getStats(): NotificationStats {
    const byChannel: Record<string, number> = {};
    const byLeakType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let failedCount = 0;
    let lastSentAt: Date | undefined;

    for (const message of this.messageHistory) {
      // Count by channel
      byChannel[message.channel.name] = (byChannel[message.channel.name] || 0) + 1;
      
      // Count by severity
      bySeverity[message.severity] = (bySeverity[message.severity] || 0) + 1;
      
      // Track failures
      if (message.deliveryStatus === 'failed') {
        failedCount++;
      }
      
      // Track last sent
      if (message.sentAt && (!lastSentAt || message.sentAt > lastSentAt)) {
        lastSentAt = message.sentAt;
      }
    }

    return {
      totalSent: this.messageHistory.filter(m => m.deliveryStatus === 'sent').length,
      byChannel,
      byLeakType,
      bySeverity,
      failedCount,
      lastSentAt
    };
  }

  /**
   * Get message history
   */
  getMessageHistory(limit: number = 100): NotificationMessage[] {
    return this.messageHistory.slice(-limit);
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Get current configuration
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Test notification connection
   */
  async testConnection(platform: 'slack' | 'teams'): Promise<{ success: boolean; error?: string }> {
    try {
      const testPayload = platform === 'slack' 
        ? { text: '✅ Test message from Revenue Leak Detection Engine' }
        : { text: '✅ Test message from Revenue Leak Detection Engine' };
      
      await this.simulateWebhookCall(platform, testPayload);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

export default NotificationIntegrationService;
