/**
 * OAuth2 Implementation for HubSpot Integration
 */

import axios from 'axios';
import crypto from 'crypto';
import { HubSpotTokens, OAuthState } from '../types';

const HUBSPOT_OAUTH_URL = 'https://app.hubspot.com/oauth/authorize';
const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';

// Required scopes for revenue leak detection
const REQUIRED_SCOPES = [
  'crm.objects.deals.read',
  'crm.objects.deals.write',
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.companies.read',
  'crm.objects.companies.write',
  'crm.schemas.deals.read',
  'crm.schemas.contacts.read',
  'crm.schemas.companies.read',
  'timeline',
];

// In-memory state storage (use Redis/DB in production)
const stateStore = new Map<string, OAuthState>();

export class HubSpotOAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  generateAuthUrl(): { url: string; state: string } {
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state for validation
    stateStore.set(state, {
      state,
      createdAt: Date.now(),
    });

    // Clean up old states (older than 10 minutes)
    this.cleanupOldStates();

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: REQUIRED_SCOPES.join(' '),
      state,
    });

    return {
      url: `${HUBSPOT_OAUTH_URL}?${params.toString()}`,
      state,
    };
  }

  /**
   * Validate OAuth state parameter
   */
  validateState(state: string): boolean {
    const storedState = stateStore.get(state);
    if (!storedState) {
      return false;
    }

    // State is only valid for 10 minutes
    const isValid = Date.now() - storedState.createdAt < 10 * 60 * 1000;
    
    // Remove used state
    stateStore.delete(state);
    
    return isValid;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<HubSpotTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
    });

    const response = await axios.post(HUBSPOT_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type,
    };
  }

  /**
   * Refresh expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<HubSpotTokens> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    const response = await axios.post(HUBSPOT_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type,
    };
  }

  /**
   * Get token info (validate token)
   */
  async getTokenInfo(accessToken: string): Promise<{ user: string; hub_id: number; scopes: string[] }> {
    const response = await axios.get(
      `https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`
    );

    return {
      user: response.data.user,
      hub_id: response.data.hub_id,
      scopes: response.data.scopes,
    };
  }

  /**
   * Clean up expired states
   */
  private cleanupOldStates(): void {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    for (const [key, value] of stateStore.entries()) {
      if (now - value.createdAt > tenMinutes) {
        stateStore.delete(key);
      }
    }
  }

  /**
   * Get required scopes
   */
  static getRequiredScopes(): string[] {
    return [...REQUIRED_SCOPES];
  }
}

export default HubSpotOAuth;
