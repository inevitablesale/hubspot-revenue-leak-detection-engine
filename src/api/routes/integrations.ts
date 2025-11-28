/**
 * Integrations API Routes
 * Endpoints for managing third-party integration connections
 */

import { Router, Request, Response } from 'express';

const router = Router();

interface IntegrationStatus {
  enabled: boolean;
  connected: boolean;
  lastSync?: string;
  syncStatus: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
  recordCount?: number;
  features: string[];
}

// In-memory integration status (use database in production)
const integrationStatus: Record<string, IntegrationStatus> = {
  stripe: {
    enabled: false,
    connected: false,
    syncStatus: 'idle',
    features: ['Subscription tracking', 'Payment sync', 'MRR calculation'],
  },
  quickbooks: {
    enabled: false,
    connected: false,
    syncStatus: 'idle',
    features: ['Invoice sync', 'Payment tracking', 'Customer matching'],
  },
  outlook: {
    enabled: false,
    connected: false,
    syncStatus: 'idle',
    features: ['Email logging', 'Contact sync', 'Calendar integration'],
  },
  gmail: {
    enabled: false,
    connected: false,
    syncStatus: 'idle',
    features: ['Email logging', 'Contact sync', 'Thread tracking'],
  },
  shopify: {
    enabled: false,
    connected: false,
    syncStatus: 'idle',
    features: ['Order sync', 'Customer import', 'Abandoned cart recovery'],
  },
  salesforce: {
    enabled: false,
    connected: false,
    syncStatus: 'idle',
    features: ['Contact sync', 'Deal mirroring', 'Activity logging'],
  },
};

/**
 * GET /integrations
 * List all integrations and their status
 */
router.get('/', (req: Request, res: Response) => {
  try {
    res.json(integrationStatus);
  } catch (error) {
    console.error('List integrations error:', error);
    res.status(500).json({ error: 'Failed to list integrations' });
  }
});

/**
 * GET /integrations/:integration/status
 * Get status of a specific integration
 */
router.get('/:integration/status', (req: Request, res: Response) => {
  try {
    const { integration } = req.params;
    
    if (!integrationStatus[integration]) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    res.json(integrationStatus[integration]);
  } catch (error) {
    console.error('Get integration status error:', error);
    res.status(500).json({ error: 'Failed to get integration status' });
  }
});

/**
 * POST /integrations/:integration/connect
 * Initiate connection to an integration
 */
router.post('/:integration/connect', async (req: Request, res: Response) => {
  try {
    const { integration } = req.params;
    const credentials = req.body;
    
    if (!integrationStatus[integration]) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    // In production, validate credentials and establish connection
    console.log(`Connecting to ${integration}...`);
    
    // Simulate connection process
    integrationStatus[integration] = {
      ...integrationStatus[integration],
      enabled: true,
      connected: true,
      lastSync: new Date().toISOString(),
      syncStatus: 'idle',
    };
    
    res.json({
      success: true,
      integration,
      status: integrationStatus[integration],
    });
  } catch (error) {
    console.error('Connect integration error:', error);
    res.status(500).json({ error: 'Failed to connect integration' });
  }
});

/**
 * POST /integrations/:integration/disconnect
 * Disconnect an integration
 */
router.post('/:integration/disconnect', (req: Request, res: Response) => {
  try {
    const { integration } = req.params;
    
    if (!integrationStatus[integration]) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    integrationStatus[integration] = {
      ...integrationStatus[integration],
      connected: false,
      lastSync: undefined,
      syncStatus: 'idle',
    };
    
    res.json({
      success: true,
      integration,
      status: integrationStatus[integration],
    });
  } catch (error) {
    console.error('Disconnect integration error:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

/**
 * POST /integrations/:integration/sync
 * Trigger a sync for an integration
 */
router.post('/:integration/sync', async (req: Request, res: Response) => {
  try {
    const { integration } = req.params;
    const { fullSync = false } = req.body;
    
    if (!integrationStatus[integration]) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    if (!integrationStatus[integration].connected) {
      return res.status(400).json({ error: 'Integration not connected' });
    }
    
    // Update status to syncing
    integrationStatus[integration].syncStatus = 'syncing';
    
    // In production, trigger async sync job
    console.log(`Starting ${fullSync ? 'full' : 'incremental'} sync for ${integration}`);
    
    // Simulate sync completion
    setTimeout(() => {
      integrationStatus[integration] = {
        ...integrationStatus[integration],
        lastSync: new Date().toISOString(),
        syncStatus: 'idle',
        recordCount: Math.floor(Math.random() * 1000) + 100,
      };
    }, 2000);
    
    res.json({
      success: true,
      integration,
      syncId: `sync-${Date.now()}`,
      type: fullSync ? 'full' : 'incremental',
      status: 'started',
    });
  } catch (error) {
    console.error('Sync integration error:', error);
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

/**
 * GET /integrations/:integration/oauth/authorize
 * Get OAuth authorization URL for an integration
 */
router.get('/:integration/oauth/authorize', (req: Request, res: Response) => {
  try {
    const { integration } = req.params;
    const { redirectUri } = req.query;
    
    // In production, generate proper OAuth URLs for each integration
    const oauthUrls: Record<string, string> = {
      stripe: 'https://connect.stripe.com/oauth/authorize',
      quickbooks: 'https://appcenter.intuit.com/connect/oauth2',
      outlook: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      gmail: 'https://accounts.google.com/o/oauth2/v2/auth',
      shopify: 'https://{shop}.myshopify.com/admin/oauth/authorize',
      salesforce: 'https://login.salesforce.com/services/oauth2/authorize',
    };
    
    if (!oauthUrls[integration]) {
      return res.status(404).json({ error: 'Integration not found or does not support OAuth' });
    }
    
    // Generate state for CSRF protection
    const state = Buffer.from(JSON.stringify({
      integration,
      timestamp: Date.now(),
    })).toString('base64');
    
    res.json({
      authorizationUrl: oauthUrls[integration],
      state,
      integration,
    });
  } catch (error) {
    console.error('OAuth authorize error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * POST /integrations/:integration/oauth/callback
 * Handle OAuth callback for an integration
 */
router.post('/:integration/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { integration } = req.params;
    const { code, state } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }
    
    // In production, exchange code for tokens
    console.log(`Processing OAuth callback for ${integration}`);
    
    // Update integration status
    integrationStatus[integration] = {
      ...integrationStatus[integration],
      enabled: true,
      connected: true,
      lastSync: new Date().toISOString(),
      syncStatus: 'idle',
    };
    
    res.json({
      success: true,
      integration,
      status: integrationStatus[integration],
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Failed to complete OAuth flow' });
  }
});

export default router;
