/**
 * HubSpot Revenue Leak Detection Engine
 * Main application entry point - HubSpot Native App
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import existing routes
import oauthRoutes from './routes/oauth';
import detectionRoutes from './routes/detection';
import cardsRoutes from './routes/cards';
import actionsRoutes from './routes/actions';

// Import new API routes for UI Extensions
import configRoutes from './api/routes/config';
import dashboardRoutes from './api/routes/dashboard';
import leaksRoutes from './api/routes/leaks';
import exportRoutes from './api/routes/export';
import integrationsRoutes from './api/routes/integrations';
import webhooksRoutes from './api/routes/webhooks';
import workflowsRoutes from './api/routes/workflows';
import breezeRoutes from './api/routes/breeze';

// Import improvement opportunity routes
import rulesRoutes from './api/routes/rules';
import escalationsRoutes from './api/routes/escalations';
import nlQueryRoutes from './api/routes/nl-query';
import benchmarksRoutes from './api/routes/benchmarks';
import notificationsRoutes from './api/routes/notifications';

// Version constant - synchronized with package.json
const APP_VERSION = process.env.npm_package_version || require('../package.json').version;

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    hubspotNative: true,
    breezeEnabled: true,
  });
});

// API routes - Core
app.use('/oauth', oauthRoutes);
app.use('/api/v1/detect', detectionRoutes);
app.use('/api/v1/cards', cardsRoutes);
app.use('/api/v1/actions', actionsRoutes);

// API routes - UI Extensions
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/leaks', leaksRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/integrations', integrationsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/v1/workflows', workflowsRoutes);
app.use('/api/v1/breeze', breezeRoutes);

// API routes - Improvement Opportunities
app.use('/api/v1/rules', rulesRoutes);
app.use('/api/v1/escalations', escalationsRoutes);
app.use('/api/v1/nl-query', nlQueryRoutes);
app.use('/api/v1/benchmarks', benchmarksRoutes);
app.use('/api/v1/notifications', notificationsRoutes);

// API documentation endpoint
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    name: 'HubSpot Revenue Leak Detection Engine',
    version: APP_VERSION,
    description: 'HubSpot Native App for identifying hidden revenue leaks across the full customer lifecycle',
    appType: 'HubSpot Private App with UI Extensions and Breeze Agent Support',
    platformVersion: '2025.2',
    endpoints: {
      oauth: {
        'GET /oauth/authorize': 'Initiate OAuth flow',
        'GET /oauth/callback': 'OAuth callback handler',
        'POST /oauth/refresh': 'Refresh access token',
        'GET /oauth/token-info': 'Get token information',
      },
      detection: {
        'POST /api/v1/detect/full': 'Run full detection',
        'POST /api/v1/detect/deal/:dealId': 'Run detection for specific deal',
        'POST /api/v1/detect/contact/:contactId': 'Run detection for specific contact',
        'POST /api/v1/detect/run': 'Trigger detection scan',
        'GET /api/v1/detect/types': 'Get available detection types',
      },
      cards: {
        'POST /api/v1/cards/deal': 'CRM card for deals',
        'POST /api/v1/cards/contact': 'CRM card for contacts',
        'POST /api/v1/cards/company': 'CRM card for companies',
      },
      actions: {
        'POST /api/v1/actions/:actionId/execute': 'Execute recovery action',
        'POST /api/v1/actions/register': 'Register leak and actions',
        'GET /api/v1/actions/:actionId': 'Get action details',
        'POST /api/v1/actions/resolve-leak/:leakId': 'Mark leak as resolved',
      },
      config: {
        'GET /api/v1/config': 'Get app configuration',
        'PUT /api/v1/config': 'Update app configuration',
        'PATCH /api/v1/config': 'Partially update configuration',
        'POST /api/v1/config/reset': 'Reset to defaults',
        'GET /api/v1/config/validate': 'Validate configuration',
      },
      dashboard: {
        'GET /api/v1/dashboard/metrics': 'Get dashboard metrics',
        'GET /api/v1/dashboard/leaks': 'Get all active leaks',
        'GET /api/v1/dashboard/trends': 'Get leak trends',
        'GET /api/v1/dashboard/summary': 'Get executive summary',
      },
      leaks: {
        'GET /api/v1/leaks/:entityType/:entityId': 'Get leaks for entity',
        'POST /api/v1/leaks/register': 'Register leaks',
        'DELETE /api/v1/leaks/:entityType/:entityId': 'Clear cached leaks',
        'POST /api/v1/leaks/:leakId/dismiss': 'Dismiss a leak',
      },
      integrations: {
        'GET /api/v1/integrations': 'List all integrations',
        'GET /api/v1/integrations/:integration/status': 'Get integration status',
        'POST /api/v1/integrations/:integration/connect': 'Connect integration',
        'POST /api/v1/integrations/:integration/disconnect': 'Disconnect integration',
        'POST /api/v1/integrations/:integration/sync': 'Trigger sync',
      },
      workflows: {
        'POST /api/v1/workflows/run-detection': 'Run detection workflow action',
        'POST /api/v1/workflows/execute-recovery': 'Execute recovery workflow action',
        'POST /api/v1/workflows/log-event': 'Log leak event',
        'POST /api/v1/workflows/check-status': 'Check leak status',
        'GET /api/v1/workflows/actions': 'List available workflow actions',
      },
      breeze: {
        'POST /api/v1/breeze/recommend': 'Get AI recommendation for leak resolution',
        'POST /api/v1/breeze/execute': 'Execute Breeze action for a leak',
        'GET /api/v1/breeze/actions': 'List available Breeze actions',
        'GET /api/v1/breeze/actions/:leakType': 'Get recommended action for leak type',
      },
      export: {
        'GET /api/v1/export/leaks': 'Export leaks data',
        'GET /api/v1/export/dashboard': 'Export dashboard data',
        'GET /api/v1/export/audit': 'Export audit log',
      },
      webhooks: {
        'POST /api/webhooks/deal-created': 'Handle deal creation',
        'POST /api/webhooks/deal-stage-changed': 'Handle deal stage change',
        'POST /api/webhooks/contact-created': 'Handle contact creation',
        'POST /api/webhooks/scheduled-scan': 'Handle scheduled scan',
        'POST /api/webhooks/integration-sync': 'Handle integration sync',
      },
      rules: {
        'GET /api/v1/rules': 'List all detection rules',
        'GET /api/v1/rules/:ruleId': 'Get rule details',
        'POST /api/v1/rules': 'Create a custom detection rule',
        'PUT /api/v1/rules/:ruleId': 'Update a rule',
        'DELETE /api/v1/rules/:ruleId': 'Delete a custom rule',
        'POST /api/v1/rules/validate': 'Validate a rule definition',
        'POST /api/v1/rules/test': 'Test a rule against sample data',
        'POST /api/v1/rules/evaluate': 'Evaluate rules against entities',
        'GET /api/v1/rules/templates/list': 'Get rule templates',
      },
      escalations: {
        'GET /api/v1/escalations': 'List escalation rules',
        'GET /api/v1/escalations/:ruleId': 'Get escalation rule details',
        'POST /api/v1/escalations': 'Create escalation rule',
        'PUT /api/v1/escalations/:ruleId': 'Update escalation rule',
        'DELETE /api/v1/escalations/:ruleId': 'Delete escalation rule',
        'POST /api/v1/escalations/evaluate': 'Evaluate leaks for escalation',
        'GET /api/v1/escalations/chain/:leakType': 'Get escalation chain',
        'GET /api/v1/escalations/pending/list': 'Get pending escalations',
      },
      nlQuery: {
        'POST /api/v1/nl-query': 'Process natural language query',
        'GET /api/v1/nl-query/suggestions': 'Get suggested questions',
        'GET /api/v1/nl-query/history': 'Get query history',
        'POST /api/v1/nl-query/summarize': 'Generate executive summary',
        'POST /api/v1/nl-query/analyze': 'Analyze specific aspect',
      },
      benchmarks: {
        'GET /api/v1/benchmarks': 'Get available benchmarks',
        'GET /api/v1/benchmarks/:industry': 'Get industry benchmark',
        'POST /api/v1/benchmarks/compare': 'Compare portal to benchmarks',
        'GET /api/v1/benchmarks/opt-in/status': 'Get opt-in status',
        'POST /api/v1/benchmarks/opt-in/configure': 'Configure opt-in',
        'GET /api/v1/benchmarks/insights': 'Get benchmark insights',
      },
      notifications: {
        'GET /api/v1/notifications/config': 'Get notification config',
        'PUT /api/v1/notifications/config': 'Update notification config',
        'POST /api/v1/notifications/slack/configure': 'Configure Slack',
        'POST /api/v1/notifications/teams/configure': 'Configure Teams',
        'POST /api/v1/notifications/test/:platform': 'Test connection',
        'GET /api/v1/notifications/channels': 'List channels',
        'POST /api/v1/notifications/channels': 'Add channel',
        'POST /api/v1/notifications/send': 'Send notification',
        'POST /api/v1/notifications/send-batch': 'Send batch notification',
      },
    },
    leakTypes: [
      'underbilling',
      'missed_renewal',
      'untriggered_crosssell',
      'stalled_cs_handoff',
      'invalid_lifecycle_path',
      'billing_gap',
      'stale_pipeline',
      'missed_handoff',
      'data_quality',
    ],
    uiExtensions: {
      crmCards: ['Deal Leak Card', 'Contact Leak Card', 'Company Leak Card', 'Ticket Leak Card'],
      modals: ['Onboarding Wizard', 'Settings Panel'],
      pages: ['Dashboard Page (App Home)'],
      settings: ['Leak Detection Settings'],
    },
    hubspotNative: {
      appObjects: ['Revenue Leak', 'Leak Detection Config', 'Detection Rule', 'Escalation Rule', 'Portal Benchmark'],
      appEvents: ['Leak Detected', 'Leak Resolved', 'Scan Completed'],
      workflowActions: [
        'Run Leak Detection (Agent-enabled)',
        'Execute Recovery (Agent-enabled)',
        'Check Leak Status (Agent-enabled)',
        'Log Leak Event (Agent-enabled)',
        'Get AI Recommendation (Agent-enabled)'
      ],
      breezeAgentSupport: true,
    },
    improvementOpportunities: {
      configurableRuleEngine: 'Create custom detection rules without code',
      crossPortalIntelligence: 'Compare against industry benchmarks',
      naturalLanguageUI: 'Ask anything about leak data',
      slackTeamsIntegration: 'Send alerts with fix-action buttons',
      escalationChains: 'Auto-create tasks and escalate unresolved leaks',
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Revenue Leak Detection Engine running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📖 API docs: http://localhost:${PORT}/api/v1`);
    console.log(`🤖 Breeze Agent Tools enabled`);
  });
}

export default app;
