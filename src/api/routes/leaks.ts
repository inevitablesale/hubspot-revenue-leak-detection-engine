/**
 * Leaks API Routes
 * Endpoints for managing leak data for UI extensions
 */

import { Router, Request, Response } from 'express';
import { RevenueLeak, LeakType, LeakSeverity } from '../../types';
import RevenueLeakDetectionEngine from '../../engine';

const router = Router();

// In-memory storage for demo (use database in production)
const leakStore = new Map<string, RevenueLeak[]>();

/**
 * Helper to generate urgency score
 */
function calculateUrgencyScore(leak: RevenueLeak): number {
  let score = 50;
  
  // Severity impact
  switch (leak.severity) {
    case 'critical': score += 40; break;
    case 'high': score += 25; break;
    case 'medium': score += 10; break;
    case 'low': score += 0; break;
  }
  
  // Revenue impact
  if (leak.potentialRevenue > 100000) score += 10;
  else if (leak.potentialRevenue > 50000) score += 5;
  
  return Math.min(100, score);
}

/**
 * Helper to generate recommendation
 */
function generateRecommendation(leak: RevenueLeak): string {
  const recommendations: Record<LeakType, string> = {
    underbilling: 'Review pricing and compare against contracted rates. Consider scheduling a pricing review meeting.',
    missed_renewal: 'Contact customer immediately to discuss renewal. Prepare renewal proposal with incentives.',
    untriggered_crosssell: 'Schedule discovery call to identify expansion opportunities. Prepare product demo.',
    stalled_cs_handoff: 'Assign CS owner and schedule kickoff meeting. Review onboarding checklist.',
    invalid_lifecycle_path: 'Review and correct lifecycle stage. Update associated workflows.',
    billing_gap: 'Reconcile billing records. Generate invoice for outstanding amount.',
    stale_pipeline: 'Review deal status and update or close. Schedule follow-up with stakeholder.',
    missed_handoff: 'Complete handoff documentation. Schedule transition meeting.',
    data_quality: 'Review and correct data entry. Update validation rules.',
  };
  
  return recommendations[leak.type] || 'Review and take appropriate action.';
}

/**
 * Transform RevenueLeak to LeakFlag format for UI
 */
function transformToLeakFlag(leak: RevenueLeak) {
  return {
    id: leak.id,
    type: leak.type,
    severity: leak.severity,
    description: leak.description,
    potentialRevenue: leak.potentialRevenue,
    recoveryStatus: 'pending' as const,
    urgencyScore: calculateUrgencyScore(leak),
    recommendation: generateRecommendation(leak),
    detectedAt: leak.detectedAt,
    expiresAt: leak.severity === 'critical' 
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days for critical
      : undefined,
  };
}

/**
 * GET /leaks/:entityType/:entityId
 * Get leaks for a specific entity
 */
router.get('/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const cacheKey = `${entityType}:${entityId}`;
    
    let leaks = leakStore.get(cacheKey);
    
    if (!leaks) {
      // Run detection for this entity
      const engine = new RevenueLeakDetectionEngine();
      
      // Create mock data based on entity type
      const mockData: any = {};
      
      switch (entityType) {
        case 'deal':
          mockData.deals = [{
            id: entityId,
            properties: {
              dealname: 'Sample Deal',
              amount: '50000',
              dealstage: 'closedwon',
              closedate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }];
          mockData.averageDealValues = new Map([['default', 60000]]);
          break;
          
        case 'contact':
          mockData.contacts = [{
            id: entityId,
            properties: {
              firstname: 'Sample',
              lastname: 'Contact',
              email: 'sample@example.com',
              lifecyclestage: 'customer',
            },
          }];
          break;
          
        case 'company':
          mockData.companies = [{
            id: entityId,
            properties: {
              name: 'Sample Company',
              domain: 'example.com',
              annualrevenue: '1000000',
            },
          }];
          break;
          
        case 'ticket':
          // Tickets would be analyzed for CS handoff issues
          mockData.contacts = [];
          break;
      }
      
      const result = await engine.detectLeaks(mockData);
      leaks = result.leaks;
      leakStore.set(cacheKey, leaks);
    }
    
    // Transform leaks to UI format
    const leakFlags = leaks.map(transformToLeakFlag);
    
    res.json({
      leaks: leakFlags,
      entityType,
      entityId,
      count: leakFlags.length,
      totalPotentialRevenue: leakFlags.reduce((sum, l) => sum + l.potentialRevenue, 0),
    });
  } catch (error) {
    console.error('Get leaks error:', error);
    res.status(500).json({ error: 'Failed to load leaks' });
  }
});

/**
 * POST /leaks/register
 * Register leaks from detection results
 */
router.post('/register', (req: Request, res: Response) => {
  try {
    const { entityType, entityId, leaks } = req.body as {
      entityType: string;
      entityId: string;
      leaks: RevenueLeak[];
    };
    
    if (!entityType || !entityId || !leaks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const cacheKey = `${entityType}:${entityId}`;
    leakStore.set(cacheKey, leaks);
    
    res.json({
      success: true,
      registered: leaks.length,
    });
  } catch (error) {
    console.error('Register leaks error:', error);
    res.status(500).json({ error: 'Failed to register leaks' });
  }
});

/**
 * DELETE /leaks/:entityType/:entityId
 * Clear cached leaks for an entity
 */
router.delete('/:entityType/:entityId', (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const cacheKey = `${entityType}:${entityId}`;
    
    const existed = leakStore.has(cacheKey);
    leakStore.delete(cacheKey);
    
    res.json({
      success: true,
      cleared: existed,
    });
  } catch (error) {
    console.error('Clear leaks error:', error);
    res.status(500).json({ error: 'Failed to clear leaks' });
  }
});

/**
 * POST /leaks/:leakId/dismiss
 * Dismiss a leak (mark as not actionable)
 */
router.post('/:leakId/dismiss', (req: Request, res: Response) => {
  try {
    const { leakId } = req.params;
    const { reason, dismissedBy } = req.body;
    
    // In production, update the leak status in storage
    
    res.json({
      success: true,
      leakId,
      status: 'dismissed',
      reason,
      dismissedBy,
      dismissedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dismiss leak error:', error);
    res.status(500).json({ error: 'Failed to dismiss leak' });
  }
});

export default router;
