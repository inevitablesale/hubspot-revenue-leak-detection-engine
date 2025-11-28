/**
 * Detection API Routes
 * Endpoints for running revenue leak detection
 */

import { Router, Request, Response } from 'express';
import { Client } from '@hubspot/api-client';
import RevenueLeakDetectionEngine from '../engine';
import { Deal, Contact, Company, Contract, Invoice } from '../types';
import { CRMCardBuilder } from '../crm/card-builder';

const router = Router();

/**
 * Middleware to extract access token
 */
const getAccessToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

/**
 * POST /detect/full
 * Run full detection across all entities
 */
router.post('/full', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }

    const hubspotClient = new Client({ accessToken });
    const engine = new RevenueLeakDetectionEngine(req.body.config || {});

    // Fetch deals
    const dealsResponse = await hubspotClient.crm.deals.basicApi.getPage(100, undefined, [
      'dealname',
      'amount',
      'dealstage',
      'closedate',
      'pipeline',
    ]);
    const deals: Deal[] = dealsResponse.results.map(d => ({
      id: d.id,
      properties: d.properties as Deal['properties'],
      createdAt: d.createdAt?.toISOString(),
      updatedAt: d.updatedAt?.toISOString(),
    }));

    // Fetch contacts
    const contactsResponse = await hubspotClient.crm.contacts.basicApi.getPage(100, undefined, [
      'firstname',
      'lastname',
      'email',
      'lifecyclestage',
    ]);
    const contacts: Contact[] = contactsResponse.results.map(c => ({
      id: c.id,
      properties: c.properties as Contact['properties'],
    }));

    // Calculate average deal values by pipeline
    const averageDealValues = new Map<string, number>();
    const pipelineDeals = new Map<string, number[]>();
    
    for (const deal of deals) {
      const pipeline = deal.properties.pipeline || 'default';
      const amount = parseFloat(deal.properties.amount || '0');
      
      const existing = pipelineDeals.get(pipeline) || [];
      existing.push(amount);
      pipelineDeals.set(pipeline, existing);
    }
    
    for (const [pipeline, amounts] of pipelineDeals.entries()) {
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      averageDealValues.set(pipeline, avg);
    }

    // Run detection
    const result = await engine.detectLeaks({
      deals,
      contacts,
      averageDealValues,
    });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Full detection error:', error);
    res.status(500).json({ error: 'Failed to run detection' });
  }
});

/**
 * POST /detect/deal/:dealId
 * Run detection for a specific deal
 */
router.post('/deal/:dealId', async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const accessToken = getAccessToken(req);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }

    const hubspotClient = new Client({ accessToken });
    const engine = new RevenueLeakDetectionEngine(req.body.config || {});

    // Fetch the specific deal
    const dealResponse = await hubspotClient.crm.deals.basicApi.getById(dealId, [
      'dealname',
      'amount',
      'dealstage',
      'closedate',
      'pipeline',
    ]);
    
    const deal: Deal = {
      id: dealResponse.id,
      properties: dealResponse.properties as Deal['properties'],
    };

    // Run detection
    const result = await engine.detectLeaks({
      deals: [deal],
      averageDealValues: new Map([['default', parseFloat(deal.properties.amount || '0')]]),
    });

    // Filter leaks for this deal
    const dealLeaks = result.leaks.filter(
      leak => leak.affectedEntity.type === 'deal' && leak.affectedEntity.id === dealId
    );

    res.json({
      success: true,
      dealId,
      leaks: dealLeaks,
      summary: {
        totalLeaks: dealLeaks.length,
        totalPotentialRevenue: dealLeaks.reduce((sum, l) => sum + l.potentialRevenue, 0),
      },
    });
  } catch (error) {
    console.error('Deal detection error:', error);
    res.status(500).json({ error: 'Failed to run detection for deal' });
  }
});

/**
 * POST /detect/contact/:contactId
 * Run detection for a specific contact
 */
router.post('/contact/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const accessToken = getAccessToken(req);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }

    const hubspotClient = new Client({ accessToken });
    const engine = new RevenueLeakDetectionEngine(req.body.config || {});

    // Fetch the specific contact
    const contactResponse = await hubspotClient.crm.contacts.basicApi.getById(contactId, [
      'firstname',
      'lastname',
      'email',
      'lifecyclestage',
    ]);
    
    const contact: Contact = {
      id: contactResponse.id,
      properties: contactResponse.properties as Contact['properties'],
    };

    // Run detection
    const result = await engine.detectLeaks({
      contacts: [contact],
    });

    // Filter leaks for this contact
    const contactLeaks = result.leaks.filter(
      leak => leak.affectedEntity.type === 'contact' && leak.affectedEntity.id === contactId
    );

    res.json({
      success: true,
      contactId,
      leaks: contactLeaks,
      summary: {
        totalLeaks: contactLeaks.length,
        totalPotentialRevenue: contactLeaks.reduce((sum, l) => sum + l.potentialRevenue, 0),
      },
    });
  } catch (error) {
    console.error('Contact detection error:', error);
    res.status(500).json({ error: 'Failed to run detection for contact' });
  }
});

/**
 * GET /detect/types
 * Get available detection types
 */
router.get('/types', (req: Request, res: Response) => {
  res.json({
    types: [
      { id: 'underbilling', name: 'Underbilling Detection', description: 'Identifies deals billing below expected values' },
      { id: 'missed_renewal', name: 'Missed Renewals', description: 'Finds contracts approaching renewal without engagement' },
      { id: 'untriggered_crosssell', name: 'Cross-Sell Opportunities', description: 'Discovers untriggered cross-sell opportunities' },
      { id: 'stalled_cs_handoff', name: 'CS Handoff Issues', description: 'Detects stalled customer success handoffs' },
      { id: 'invalid_lifecycle_path', name: 'Lifecycle Validation', description: 'Validates lifecycle stage transitions' },
      { id: 'billing_gap', name: 'Billing Gaps', description: 'Identifies gaps in billing and collection' },
      { id: 'stale_pipeline', name: 'Stale Pipeline', description: 'Identifies deals stuck in pipeline' },
      { id: 'missed_handoff', name: 'Missed Handoff', description: 'Detects missed handoff opportunities' },
      { id: 'data_quality', name: 'Data Quality', description: 'Identifies data quality issues' },
    ],
  });
});

/**
 * POST /detect/run
 * Run detection scan (for UI Extensions)
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, fullScan } = req.body;
    const engine = new RevenueLeakDetectionEngine(req.body.config || {});

    // Create mock data based on request
    const mockData: any = {};

    if (fullScan) {
      // Full scan - return sample results
      mockData.deals = [
        {
          id: 'sample-1',
          properties: { dealname: 'Sample Deal', amount: '50000', dealstage: 'closedwon' },
        },
      ];
      mockData.averageDealValues = new Map([['default', 60000]]);
    } else if (entityType && entityId) {
      switch (entityType) {
        case 'deal':
          mockData.deals = [{
            id: entityId,
            properties: { dealname: 'Deal', amount: '50000', dealstage: 'closedwon' },
          }];
          mockData.averageDealValues = new Map([['default', 60000]]);
          break;
        case 'contact':
          mockData.contacts = [{
            id: entityId,
            properties: { firstname: 'Sample', lastname: 'Contact', lifecyclestage: 'customer' },
          }];
          break;
        case 'company':
          mockData.companies = [{
            id: entityId,
            properties: { name: 'Sample Company', annualrevenue: '1000000' },
          }];
          break;
      }
    }

    const result = await engine.detectLeaks(mockData);

    res.json({
      success: true,
      scanId: `scan-${Date.now()}`,
      status: 'completed',
      leaksFound: result.leaks.length,
      potentialRevenue: result.summary.totalPotentialRevenue,
      result,
    });
  } catch (error) {
    console.error('Run detection error:', error);
    res.status(500).json({ error: 'Failed to run detection scan' });
  }
});

export default router;
