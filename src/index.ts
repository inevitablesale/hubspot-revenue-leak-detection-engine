/**
 * HubSpot Revenue Leak Detection Engine
 * Main application entry point
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import oauthRoutes from './routes/oauth';
import detectionRoutes from './routes/detection';
import cardsRoutes from './routes/cards';
import actionsRoutes from './routes/actions';

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

// API routes
app.use('/oauth', oauthRoutes);
app.use('/api/v1/detect', detectionRoutes);
app.use('/api/v1/cards', cardsRoutes);
app.use('/api/v1/actions', actionsRoutes);

// API documentation endpoint
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    name: 'HubSpot Revenue Leak Detection Engine',
    version: '1.0.0',
    description: 'Identifies hidden revenue leaks across the full customer lifecycle',
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
    },
    leakTypes: [
      'underbilling',
      'missed_renewal',
      'untriggered_crosssell',
      'stalled_cs_handoff',
      'invalid_lifecycle_path',
      'billing_gap',
    ],
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
