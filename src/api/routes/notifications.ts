/**
 * Notifications API Routes
 * Slack/Teams integrations and notification management
 */

import { Router, Request, Response } from 'express';
import { NotificationIntegrationService, NotificationChannel } from '../../integrations/notifications';
import { RevenueLeak, LeakSeverity } from '../../types';
import { generateId } from '../../utils/helpers';

const router = Router();
const notificationService = new NotificationIntegrationService();

/**
 * GET /notifications/config
 * Get notification configuration
 */
router.get('/config', (req: Request, res: Response) => {
  try {
    const config = notificationService.getConfig();

    res.json({
      success: true,
      data: {
        enabled: config.enabled,
        severityThreshold: config.severityThreshold,
        slack: config.slack ? {
          enabled: config.slack.enabled,
          defaultChannel: config.slack.defaultChannel,
          botName: config.slack.botName
        } : null,
        teams: config.teams ? {
          enabled: config.teams.enabled,
          defaultChannel: config.teams.defaultChannel
        } : null,
        channelCount: config.channels.length
      }
    });
  } catch (error) {
    console.error('Get notification config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get config'
    });
  }
});

/**
 * PUT /notifications/config
 * Update notification configuration
 */
router.put('/config', (req: Request, res: Response) => {
  try {
    const { enabled, severityThreshold } = req.body;

    notificationService.updateConfig({
      enabled,
      severityThreshold
    });

    res.json({
      success: true,
      message: 'Configuration updated'
    });
  } catch (error) {
    console.error('Update notification config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update config'
    });
  }
});

/**
 * POST /notifications/slack/configure
 * Configure Slack integration
 */
router.post('/slack/configure', (req: Request, res: Response) => {
  try {
    const { webhookUrl, defaultChannel, botName, iconEmoji, enabled = true } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Slack webhook URL is required'
      });
    }

    notificationService.configureSlack({
      webhookUrl,
      defaultChannel: defaultChannel || '#revenue-alerts',
      botName: botName || 'Revenue Leak Bot',
      iconEmoji: iconEmoji || ':money_with_wings:',
      enabled
    });

    res.json({
      success: true,
      message: 'Slack integration configured'
    });
  } catch (error) {
    console.error('Configure Slack error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to configure Slack'
    });
  }
});

/**
 * POST /notifications/teams/configure
 * Configure Microsoft Teams integration
 */
router.post('/teams/configure', (req: Request, res: Response) => {
  try {
    const { webhookUrl, defaultChannel, enabled = true } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Teams webhook URL is required'
      });
    }

    notificationService.configureTeams({
      webhookUrl,
      defaultChannel: defaultChannel || 'Revenue Alerts',
      enabled
    });

    res.json({
      success: true,
      message: 'Microsoft Teams integration configured'
    });
  } catch (error) {
    console.error('Configure Teams error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to configure Teams'
    });
  }
});

/**
 * POST /notifications/test/:platform
 * Test notification connection
 */
router.post('/test/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;

    if (platform !== 'slack' && platform !== 'teams') {
      return res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be "slack" or "teams"'
      });
    }

    const result = await notificationService.testConnection(platform);

    res.json({
      success: result.success,
      message: result.success 
        ? `${platform} connection test successful`
        : `${platform} connection test failed: ${result.error}`
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test connection'
    });
  }
});

/**
 * GET /notifications/channels
 * List all notification channels
 */
router.get('/channels', (req: Request, res: Response) => {
  try {
    const channels = notificationService.getChannels();

    res.json({
      success: true,
      data: channels.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        target: c.target,
        leakTypes: c.leakTypes,
        severities: c.severities,
        isDefault: c.isDefault
      }))
    });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get channels'
    });
  }
});

/**
 * POST /notifications/channels
 * Add a notification channel
 */
router.post('/channels', (req: Request, res: Response) => {
  try {
    const { name, type, target, leakTypes, severities, isDefault = false } = req.body;

    if (!name || !type || !target) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, and target are required'
      });
    }

    const channel: NotificationChannel = {
      id: generateId(),
      name,
      type,
      target,
      leakTypes,
      severities,
      isDefault
    };

    notificationService.addChannel(channel);

    res.status(201).json({
      success: true,
      data: channel
    });
  } catch (error) {
    console.error('Add channel error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add channel'
    });
  }
});

/**
 * DELETE /notifications/channels/:channelId
 * Remove a notification channel
 */
router.delete('/channels/:channelId', (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const removed = notificationService.removeChannel(channelId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    res.json({
      success: true,
      message: 'Channel removed'
    });
  } catch (error) {
    console.error('Remove channel error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove channel'
    });
  }
});

/**
 * POST /notifications/send
 * Send notification for a leak
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { leak } = req.body;

    if (!leak) {
      return res.status(400).json({
        success: false,
        error: 'Leak data is required'
      });
    }

    const messages = await notificationService.sendLeakNotification(leak as RevenueLeak);

    res.json({
      success: true,
      data: {
        notificationsSent: messages.length,
        messages: messages.map(m => ({
          id: m.id,
          channel: m.channel.name,
          deliveryStatus: m.deliveryStatus,
          sentAt: m.sentAt,
          error: m.error
        }))
      }
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification'
    });
  }
});

/**
 * POST /notifications/send-batch
 * Send batch notification for multiple leaks
 */
router.post('/send-batch', async (req: Request, res: Response) => {
  try {
    const { leaks, summary } = req.body;

    if (!leaks || !Array.isArray(leaks)) {
      return res.status(400).json({
        success: false,
        error: 'Leaks array is required'
      });
    }

    const messages = await notificationService.sendBatchNotification(
      leaks as RevenueLeak[],
      summary
    );

    res.json({
      success: true,
      data: {
        notificationsSent: messages.length,
        messages: messages.map(m => ({
          id: m.id,
          channel: m.channel.name,
          deliveryStatus: m.deliveryStatus,
          sentAt: m.sentAt,
          error: m.error
        }))
      }
    });
  } catch (error) {
    console.error('Send batch notification error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send batch notification'
    });
  }
});

/**
 * GET /notifications/history
 * Get notification history
 */
router.get('/history', (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    const history = notificationService.getMessageHistory(Number(limit));

    res.json({
      success: true,
      data: {
        messages: history.map(m => ({
          id: m.id,
          leakId: m.leakId,
          channel: m.channel.name,
          title: m.title,
          severity: m.severity,
          potentialRevenue: m.potentialRevenue,
          deliveryStatus: m.deliveryStatus,
          sentAt: m.sentAt,
          error: m.error
        }))
      }
    });
  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get history'
    });
  }
});

/**
 * GET /notifications/stats
 * Get notification statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = notificationService.getStats();

    res.json({
      success: true,
      data: {
        totalSent: stats.totalSent,
        failedCount: stats.failedCount,
        successRate: stats.totalSent > 0 
          ? `${Math.round((1 - stats.failedCount / (stats.totalSent + stats.failedCount)) * 100)}%`
          : 'N/A',
        byChannel: stats.byChannel,
        bySeverity: stats.bySeverity,
        lastSentAt: stats.lastSentAt
      }
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats'
    });
  }
});

export default router;
