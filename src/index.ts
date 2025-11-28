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
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
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

// API documentation endpoint
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    name: 'HubSpot Revenue Leak Detection Engine',
    version: '1.0.0',
    description: 'HubSpot Native App for identifying hidden revenue leaks across the full customer lifecycle',
    appType: 'HubSpot Private App with UI Extensions',
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
      pages: ['Dashboard Page'],
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
  });
}

export default app;
