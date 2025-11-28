/**
 * Tests for HubSpot OAuth
 */

import { HubSpotOAuth } from '../../src/auth/oauth';

describe('HubSpotOAuth', () => {
  let oauth: HubSpotOAuth;

  beforeEach(() => {
    oauth = new HubSpotOAuth(
      'test-client-id',
      'test-client-secret',
      'http://localhost:3000/oauth/callback'
    );
  });

  describe('generateAuthUrl', () => {
    it('should generate a valid authorization URL with state', () => {
      const { url, state } = oauth.generateAuthUrl();

      expect(url).toContain('https://app.hubspot.com/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('scope=');
      expect(url).toContain(`state=${state}`);
      expect(state).toHaveLength(32); // 16 bytes hex = 32 chars
    });

    it('should include required scopes', () => {
      const { url } = oauth.generateAuthUrl();
      const requiredScopes = HubSpotOAuth.getRequiredScopes();

      for (const scope of requiredScopes) {
        expect(url).toContain(encodeURIComponent(scope));
      }
    });

    it('should generate unique states', () => {
      const { state: state1 } = oauth.generateAuthUrl();
      const { state: state2 } = oauth.generateAuthUrl();

      expect(state1).not.toBe(state2);
    });
  });

  describe('validateState', () => {
    it('should validate a recently generated state', () => {
      const { state } = oauth.generateAuthUrl();
      
      const isValid = oauth.validateState(state);
      
      expect(isValid).toBe(true);
    });

    it('should invalidate a state after use', () => {
      const { state } = oauth.generateAuthUrl();
      
      // First validation should succeed
      expect(oauth.validateState(state)).toBe(true);
      
      // Second validation should fail (state removed)
      expect(oauth.validateState(state)).toBe(false);
    });

    it('should reject unknown states', () => {
      const isValid = oauth.validateState('unknown-state-12345678901234');
      
      expect(isValid).toBe(false);
    });
  });

  describe('getRequiredScopes', () => {
    it('should return array of scopes', () => {
      const scopes = HubSpotOAuth.getRequiredScopes();

      expect(Array.isArray(scopes)).toBe(true);
      expect(scopes.length).toBeGreaterThan(0);
      expect(scopes).toContain('crm.objects.deals.read');
      expect(scopes).toContain('crm.objects.contacts.read');
    });

    it('should return a copy of scopes', () => {
      const scopes1 = HubSpotOAuth.getRequiredScopes();
      const scopes2 = HubSpotOAuth.getRequiredScopes();

      // Should be equal but different arrays
      expect(scopes1).toEqual(scopes2);
      expect(scopes1).not.toBe(scopes2);
    });
  });
});
