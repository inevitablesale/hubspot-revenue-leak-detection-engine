/**
 * OAuth Routes
 * Handles HubSpot OAuth flow endpoints
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { HubSpotOAuth } from '../auth/oauth';

const router = Router();

// Rate limiting for OAuth endpoints to prevent abuse
const oauthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 OAuth requests per window
  message: { error: 'Too many OAuth requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all OAuth routes
router.use(oauthRateLimiter);

// Initialize OAuth handler from environment
const getOAuthHandler = (): HubSpotOAuth => {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing OAuth configuration. Ensure HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET, and HUBSPOT_REDIRECT_URI are set.');
  }

  return new HubSpotOAuth(clientId, clientSecret, redirectUri);
};

/**
 * GET /oauth/authorize
 * Initiates OAuth flow by redirecting to HubSpot
 */
router.get('/authorize', (req: Request, res: Response) => {
  try {
    const oauth = getOAuthHandler();
    const { url, state } = oauth.generateAuthUrl();
    
    // Store state in session or cookie for validation
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000, // 10 minutes
    });
    
    res.redirect(url);
  } catch (error) {
    console.error('OAuth authorize error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

/**
 * GET /oauth/callback
 * Handles OAuth callback from HubSpot
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    if (!state || typeof state !== 'string') {
      return res.status(400).json({ error: 'Missing state parameter' });
    }

    const oauth = getOAuthHandler();
    
    // Validate state
    if (!oauth.validateState(state)) {
      return res.status(400).json({ error: 'Invalid or expired state parameter' });
    }

    // Exchange code for tokens
    const tokens = await oauth.exchangeCodeForTokens(code);
    
    // Get token info for validation
    const tokenInfo = await oauth.getTokenInfo(tokens.accessToken);
    
    // In production, store tokens securely (database, encrypted storage, etc.)
    // For demo, we'll just return them (NOT recommended for production)
    
    res.json({
      success: true,
      message: 'OAuth flow completed successfully',
      hubId: tokenInfo.hub_id,
      user: tokenInfo.user,
      scopes: tokenInfo.scopes,
      // In production, don't expose tokens in response
      // Store them securely and return a session identifier instead
      tokens: process.env.NODE_ENV === 'development' ? {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      } : undefined,
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Failed to complete OAuth flow' });
  }
});

/**
 * POST /oauth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }

    const oauth = getOAuthHandler();
    const tokens = await oauth.refreshAccessToken(refreshToken);
    
    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * GET /oauth/token-info
 * Get information about an access token
 */
router.get('/token-info', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const accessToken = authHeader.substring(7);
    const oauth = getOAuthHandler();
    const tokenInfo = await oauth.getTokenInfo(accessToken);
    
    res.json({
      success: true,
      ...tokenInfo,
    });
  } catch (error) {
    console.error('Token info error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
