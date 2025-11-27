/**
 * CRM Card Routes
 * Endpoints for serving HubSpot CRM cards
 */

import { Router, Request, Response } from 'express';
import { Client } from '@hubspot/api-client';
import { CRMCardBuilder, buildDealCard, buildContactCard, buildCompanyCard } from '../crm/card-builder';
import RevenuLeakDetectionEngine from '../engine';
import { Deal, Contact, Company, RevenueLeak } from '../types';

const router = Router();

// In-memory cache for demo purposes (use Redis in production)
const leakCache = new Map<string, RevenueLeak[]>();

/**
 * Middleware to extract access token from card request
 */
const getAccessToken = (req: Request): string | null => {
  // HubSpot sends access token in different ways for CRM cards
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check body for card requests
  if (req.body && req.body.accessToken) {
    return req.body.accessToken;
  }
  
  return null;
};

/**
 * POST /cards/deal
 * CRM card endpoint for deals
 */
router.post('/deal', async (req: Request, res: Response) => {
  try {
    const { hs_object_id, associatedObjectId, associatedObjectType } = req.body;
    const dealId = hs_object_id || associatedObjectId;

    if (!dealId) {
      return res.json(new CRMCardBuilder().buildEmptyCard());
    }

    // Check cache first
    const cacheKey = `deal:${dealId}`;
    let leaks = leakCache.get(cacheKey);

    if (!leaks) {
      // Run detection (in production, this would be cached/precomputed)
      const engine = new RevenuLeakDetectionEngine();
      
      // Create mock deal for detection
      const mockDeal: Deal = {
        id: dealId,
        properties: {
          dealname: req.body.dealname,
          amount: req.body.amount,
          dealstage: req.body.dealstage,
          closedate: req.body.closedate,
          pipeline: req.body.pipeline,
        },
      };

      const result = await engine.detectLeaks({
        deals: [mockDeal],
        averageDealValues: new Map([['default', parseFloat(mockDeal.properties.amount || '0') * 1.2]]),
      });

      leaks = result.leaks;
      leakCache.set(cacheKey, leaks);
    }

    const card = buildDealCard(leaks, dealId);
    res.json(card);
  } catch (error) {
    console.error('Deal card error:', error);
    res.json(new CRMCardBuilder().buildEmptyCard());
  }
});

/**
 * POST /cards/contact
 * CRM card endpoint for contacts
 */
router.post('/contact', async (req: Request, res: Response) => {
  try {
    const { hs_object_id, associatedObjectId } = req.body;
    const contactId = hs_object_id || associatedObjectId;

    if (!contactId) {
      return res.json(new CRMCardBuilder().buildEmptyCard());
    }

    // Check cache first
    const cacheKey = `contact:${contactId}`;
    let leaks = leakCache.get(cacheKey);

    if (!leaks) {
      const engine = new RevenuLeakDetectionEngine();
      
      const mockContact: Contact = {
        id: contactId,
        properties: {
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          email: req.body.email,
          lifecyclestage: req.body.lifecyclestage,
        },
      };

      const result = await engine.detectLeaks({
        contacts: [mockContact],
      });

      leaks = result.leaks;
      leakCache.set(cacheKey, leaks);
    }

    const card = buildContactCard(leaks, contactId);
    res.json(card);
  } catch (error) {
    console.error('Contact card error:', error);
    res.json(new CRMCardBuilder().buildEmptyCard());
  }
});

/**
 * POST /cards/company
 * CRM card endpoint for companies
 */
router.post('/company', async (req: Request, res: Response) => {
  try {
    const { hs_object_id, associatedObjectId } = req.body;
    const companyId = hs_object_id || associatedObjectId;

    if (!companyId) {
      return res.json(new CRMCardBuilder().buildEmptyCard());
    }

    // Check cache first
    const cacheKey = `company:${companyId}`;
    let leaks = leakCache.get(cacheKey);

    if (!leaks) {
      const engine = new RevenuLeakDetectionEngine();
      
      const mockCompany: Company = {
        id: companyId,
        properties: {
          name: req.body.name,
          domain: req.body.domain,
          industry: req.body.industry,
          annualrevenue: req.body.annualrevenue,
        },
      };

      const result = await engine.detectLeaks({
        companies: [mockCompany],
      });

      leaks = result.leaks;
      leakCache.set(cacheKey, leaks);
    }

    const card = buildCompanyCard(leaks, companyId);
    res.json(card);
  } catch (error) {
    console.error('Company card error:', error);
    res.json(new CRMCardBuilder().buildEmptyCard());
  }
});

/**
 * DELETE /cards/cache
 * Clear the leak cache (admin endpoint)
 */
router.delete('/cache', (req: Request, res: Response) => {
  leakCache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

/**
 * DELETE /cards/cache/:entityType/:entityId
 * Clear cache for a specific entity
 */
router.delete('/cache/:entityType/:entityId', (req: Request, res: Response) => {
  const { entityType, entityId } = req.params;
  const cacheKey = `${entityType}:${entityId}`;
  
  const existed = leakCache.has(cacheKey);
  leakCache.delete(cacheKey);
  
  res.json({ 
    success: true, 
    message: existed ? 'Cache entry cleared' : 'No cache entry found',
  });
});

export default router;
