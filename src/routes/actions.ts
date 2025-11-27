/**
 * Actions API Routes
 * Endpoints for executing recovery actions
 */

import { Router, Request, Response } from 'express';
import { Client } from '@hubspot/api-client';
import { PropertyUpdater } from '../crm/property-updates';
import { TimelineEventManager, TimelineConfig } from '../timeline/events';
import { RevenueLeak, RecoveryAction } from '../types';
import { generateId } from '../utils/helpers';

const router = Router();

// In-memory storage for demo (use database in production)
const leakStore = new Map<string, RevenueLeak>();
const actionStore = new Map<string, { leak: RevenueLeak; action: RecoveryAction }>();

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
 * POST /actions/:actionId/execute
 * Execute a specific recovery action
 */
router.post('/:actionId/execute', async (req: Request, res: Response) => {
  try {
    const { actionId } = req.params;
    const accessToken = getAccessToken(req);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }

    const actionData = actionStore.get(actionId);
    if (!actionData) {
      return res.status(404).json({ error: 'Action not found' });
    }

    const { leak, action } = actionData;
    const hubspotClient = new Client({ accessToken });
    
    let result: { success: boolean; message: string; data?: unknown };

    switch (action.type) {
      case 'update_property':
        const propertyUpdater = new PropertyUpdater(accessToken);
        const updateResult = await propertyUpdater.updateProperties({
          objectType: (action.parameters?.objectType as 'deals' | 'contacts' | 'companies') || 'deals',
          objectId: (action.parameters?.objectId as string) || leak.affectedEntity.id,
          properties: action.parameters?.properties as Record<string, string | number | boolean> || {},
        });
        result = {
          success: updateResult.success,
          message: updateResult.success ? 'Properties updated successfully' : 'Failed to update properties',
          data: updateResult,
        };
        break;

      case 'create_task':
        const taskResponse = await hubspotClient.crm.objects.basicApi.create('tasks', {
          properties: {
            hs_task_subject: (action.parameters?.subject as string) || action.title,
            hs_task_body: action.description,
            hs_task_type: (action.parameters?.taskType as string) || 'TODO',
            hs_task_priority: action.priority.toUpperCase(),
            hs_timestamp: new Date().toISOString(),
          },
        });
        result = {
          success: true,
          message: 'Task created successfully',
          data: { taskId: taskResponse.id },
        };
        break;

      case 'send_notification':
        // In production, integrate with notification service (email, Slack, etc.)
        result = {
          success: true,
          message: 'Notification queued for delivery',
          data: { notificationId: generateId() },
        };
        break;

      case 'trigger_workflow':
        // In production, trigger HubSpot workflow via API
        result = {
          success: true,
          message: 'Workflow trigger queued',
          data: { 
            workflowType: action.parameters?.workflowType,
            entityId: leak.affectedEntity.id,
          },
        };
        break;

      case 'manual_review':
        // Log for manual review
        result = {
          success: true,
          message: 'Flagged for manual review',
          data: {
            reviewId: generateId(),
            leakId: leak.id,
            description: action.description,
          },
        };
        break;

      default:
        result = {
          success: false,
          message: `Unknown action type: ${action.type}`,
        };
    }

    // Log action execution
    console.log(`Action executed: ${actionId}`, { result, action, leak: leak.id });

    res.json(result);
  } catch (error) {
    console.error('Action execution error:', error);
    res.status(500).json({ error: 'Failed to execute action' });
  }
});

/**
 * POST /actions/register
 * Register a leak and its actions for later execution
 */
router.post('/register', (req: Request, res: Response) => {
  try {
    const { leak } = req.body as { leak: RevenueLeak };
    
    if (!leak || !leak.id) {
      return res.status(400).json({ error: 'Invalid leak data' });
    }

    // Store leak
    leakStore.set(leak.id, leak);

    // Store each action
    for (const action of leak.suggestedActions) {
      actionStore.set(action.id, { leak, action });
    }

    res.json({
      success: true,
      leakId: leak.id,
      actionIds: leak.suggestedActions.map(a => a.id),
    });
  } catch (error) {
    console.error('Action registration error:', error);
    res.status(500).json({ error: 'Failed to register actions' });
  }
});

/**
 * GET /actions/:actionId
 * Get action details
 */
router.get('/:actionId', (req: Request, res: Response) => {
  const { actionId } = req.params;
  const actionData = actionStore.get(actionId);
  
  if (!actionData) {
    return res.status(404).json({ error: 'Action not found' });
  }

  res.json({
    action: actionData.action,
    leak: {
      id: actionData.leak.id,
      type: actionData.leak.type,
      severity: actionData.leak.severity,
      description: actionData.leak.description,
      potentialRevenue: actionData.leak.potentialRevenue,
    },
  });
});

/**
 * POST /actions/resolve-leak/:leakId
 * Mark a leak as resolved
 */
router.post('/resolve-leak/:leakId', async (req: Request, res: Response) => {
  try {
    const { leakId } = req.params;
    const { resolution, resolvedBy } = req.body;
    const accessToken = getAccessToken(req);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }

    const leak = leakStore.get(leakId);
    if (!leak) {
      return res.status(404).json({ error: 'Leak not found' });
    }

    // Update properties to mark as resolved
    const propertyUpdater = new PropertyUpdater(accessToken);
    const result = await propertyUpdater.markLeakResolved(leak, resolution, resolvedBy);

    if (result.success) {
      // Remove from stores
      leakStore.delete(leakId);
      for (const action of leak.suggestedActions) {
        actionStore.delete(action.id);
      }
    }

    res.json({
      success: result.success,
      message: result.success ? 'Leak marked as resolved' : 'Failed to resolve leak',
      error: result.error,
    });
  } catch (error) {
    console.error('Resolve leak error:', error);
    res.status(500).json({ error: 'Failed to resolve leak' });
  }
});

/**
 * GET /actions/leak/:leakId/actions
 * Get all actions for a leak
 */
router.get('/leak/:leakId/actions', (req: Request, res: Response) => {
  const { leakId } = req.params;
  const leak = leakStore.get(leakId);
  
  if (!leak) {
    return res.status(404).json({ error: 'Leak not found' });
  }

  res.json({
    leakId,
    actions: leak.suggestedActions,
  });
});

export default router;
