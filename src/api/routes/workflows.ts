/**
 * Workflow Action API Routes
 * Handlers for HubSpot custom workflow actions
 * 
 * PRODUCTION NOTE: This implementation uses in-memory storage for demonstration.
 * In production, replace with persistent storage such as:
 * - PostgreSQL/MySQL database
 * - Redis for caching and session storage
 * - HubSpot custom objects for CRM-native storage
 */

import { Router, Request, Response } from 'express';
import RevenueLeakDetectionEngine from '../../engine';
import { RevenueLeak, LeakType, LeakSeverity } from '../../types';

const router = Router();

/**
 * In-memory leak storage for demonstration
 * Replace with database in production to persist data across restarts
 */
const leakStore = new Map<string, RevenueLeak[]>();

interface WorkflowActionRequest {
  callbackId: string;
  origin: {
    portalId: number;
    actionDefinitionId: number;
  };
  object: {
    objectId: number;
    objectType: string;
  };
  inputFields: Record<string, string | number | boolean>;
}

interface WorkflowActionResponse {
  outputFields: Record<string, string | number | boolean>;
}

/**
 * POST /workflows/run-detection
 * Run leak detection scan workflow action
 */
router.post('/run-detection', async (req: Request, res: Response) => {
  try {
    const request = req.body as WorkflowActionRequest;
    const { objectId, objectType } = request.object;
    const { scanType, module } = request.inputFields;

    console.log(`Running ${scanType} detection for ${objectType} ${objectId}`);

    const engine = new RevenueLeakDetectionEngine();
    
    // Create mock data based on object type
    const mockData: any = {};
    
    switch (objectType.toLowerCase()) {
      case 'deal':
        mockData.deals = [{
          id: objectId.toString(),
          properties: {
            dealname: 'Workflow Deal',
            amount: '50000',
            dealstage: 'closedwon',
          },
        }];
        mockData.averageDealValues = new Map([['default', 60000]]);
        break;
        
      case 'contact':
        mockData.contacts = [{
          id: objectId.toString(),
          properties: {
            firstname: 'Workflow',
            lastname: 'Contact',
            lifecyclestage: 'customer',
          },
        }];
        break;
        
      case 'company':
        mockData.companies = [{
          id: objectId.toString(),
          properties: {
            name: 'Workflow Company',
            annualrevenue: '1000000',
          },
        }];
        break;
    }

    let result;
    if (scanType === 'module' && module) {
      result = {
        leaks: await engine.detectByType(module as LeakType, mockData),
        summary: { totalLeaks: 0, totalPotentialRevenue: 0 },
        analyzedAt: new Date(),
      };
    } else {
      result = await engine.detectLeaks(mockData);
    }

    // Store results
    const cacheKey = `${objectType}:${objectId}`;
    leakStore.set(cacheKey, result.leaks);

    const hasCriticalLeak = result.leaks.some(l => l.severity === 'critical');
    const potentialRevenue = result.leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);

    const response: WorkflowActionResponse = {
      outputFields: {
        leaksFound: result.leaks.length,
        potentialRevenue,
        hasCriticalLeak,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Run detection workflow error:', error);
    res.status(500).json({ error: 'Workflow action failed' });
  }
});

/**
 * POST /workflows/execute-recovery
 * Execute recovery action workflow
 */
router.post('/execute-recovery', async (req: Request, res: Response) => {
  try {
    const request = req.body as WorkflowActionRequest;
    const { objectId, objectType } = request.object;
    const { recoveryType, leakType, assignee } = request.inputFields;

    console.log(`Executing ${recoveryType} recovery for ${objectType} ${objectId}`);

    const cacheKey = `${objectType}:${objectId}`;
    const leaks = leakStore.get(cacheKey) || [];
    
    // Filter leaks by type if specified
    const targetLeaks = leakType && leakType !== 'any'
      ? leaks.filter(l => l.type === leakType)
      : leaks;

    let actionExecuted = false;
    let resultMessage = 'No matching leaks found';

    if (targetLeaks.length > 0) {
      // Execute recovery based on type
      switch (recoveryType) {
        case 'auto_fix':
          resultMessage = `Auto-fixed ${targetLeaks.length} low-risk leak(s)`;
          actionExecuted = true;
          break;
          
        case 'create_task':
          resultMessage = `Created ${targetLeaks.length} task(s) for review`;
          actionExecuted = true;
          break;
          
        case 'notify':
          resultMessage = `Sent notification for ${targetLeaks.length} leak(s)`;
          actionExecuted = true;
          break;
          
        case 'escalate':
          resultMessage = `Escalated ${targetLeaks.length} leak(s) to manager`;
          actionExecuted = true;
          break;
          
        case 'update_property':
          resultMessage = `Updated properties for ${targetLeaks.length} leak(s)`;
          actionExecuted = true;
          break;
      }
    }

    const response: WorkflowActionResponse = {
      outputFields: {
        actionExecuted,
        resultMessage,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Execute recovery workflow error:', error);
    res.status(500).json({ error: 'Workflow action failed' });
  }
});

/**
 * POST /workflows/log-event
 * Log leak event to timeline workflow
 */
router.post('/log-event', async (req: Request, res: Response) => {
  try {
    const request = req.body as WorkflowActionRequest;
    const { objectId, objectType } = request.object;
    const { eventType, details } = request.inputFields;

    console.log(`Logging ${eventType} event for ${objectType} ${objectId}`);

    // In production, create timeline event via HubSpot API
    const eventLogged = true;

    const response: WorkflowActionResponse = {
      outputFields: {
        eventLogged,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Log event workflow error:', error);
    res.status(500).json({ error: 'Workflow action failed' });
  }
});

/**
 * POST /workflows/check-status
 * Check leak status workflow action
 */
router.post('/check-status', async (req: Request, res: Response) => {
  try {
    const request = req.body as WorkflowActionRequest;
    const { objectId, objectType } = request.object;
    const { severityThreshold = 'any' } = request.inputFields;

    const cacheKey = `${objectType}:${objectId}`;
    let leaks = leakStore.get(cacheKey) || [];

    // Filter by severity threshold
    if (severityThreshold !== 'any') {
      const severityOrder: LeakSeverity[] = ['low', 'medium', 'high', 'critical'];
      const thresholdIndex = severityOrder.indexOf(severityThreshold as LeakSeverity);
      
      if (thresholdIndex > 0) {
        leaks = leaks.filter(l => {
          const leakIndex = severityOrder.indexOf(l.severity);
          return leakIndex >= thresholdIndex;
        });
      }
    }

    const hasActiveLeaks = leaks.length > 0;
    const highestSeverity = leaks.length > 0
      ? leaks.reduce((max, l) => {
          const order: Record<LeakSeverity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
          return order[l.severity] > order[max] ? l.severity : max;
        }, 'low' as LeakSeverity)
      : 'none';
    const totalAtRisk = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);

    const response: WorkflowActionResponse = {
      outputFields: {
        hasActiveLeaks,
        leakCount: leaks.length,
        highestSeverity,
        totalAtRisk,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Check status workflow error:', error);
    res.status(500).json({ error: 'Workflow action failed' });
  }
});

/**
 * POST /workflows/update-property
 * Update leak property workflow action
 */
router.post('/update-property', async (req: Request, res: Response) => {
  try {
    const request = req.body as WorkflowActionRequest;
    const { objectId, objectType } = request.object;
    const { property, value } = request.inputFields;

    console.log(`Updating ${property} to ${value} for ${objectType} ${objectId}`);

    // In production, update property via HubSpot API
    const propertyUpdated = true;

    const response: WorkflowActionResponse = {
      outputFields: {
        propertyUpdated,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Update property workflow error:', error);
    res.status(500).json({ error: 'Workflow action failed' });
  }
});

/**
 * GET /workflows/actions
 * List available workflow actions
 */
router.get('/actions', (req: Request, res: Response) => {
  res.json({
    actions: [
      {
        id: 'run-detection',
        name: 'Run Leak Detection',
        description: 'Scan the enrolled record for revenue leaks',
      },
      {
        id: 'execute-recovery',
        name: 'Execute Recovery Action',
        description: 'Execute a recovery action for detected revenue leaks',
      },
      {
        id: 'log-event',
        name: 'Log Leak Event',
        description: 'Log a leak detection event to the record timeline',
      },
      {
        id: 'check-status',
        name: 'Check Leak Status',
        description: 'Check if the record has any active revenue leaks',
      },
      {
        id: 'update-property',
        name: 'Update Leak Property',
        description: 'Update a leak detection property on the record',
      },
    ],
  });
});

export default router;
