/**
 * Breeze AI Recommendation API Routes
 * Handlers for AI-powered leak analysis and recommendations
 */

import { Router, Request, Response } from 'express';
import { BreezeFixActions, BreezeContext } from '../../breeze';
import { RevenueLeak, LeakType } from '../../types';

const router = Router();
const breezeActions = new BreezeFixActions();

/**
 * POST /breeze/recommend
 * Get AI recommendation for resolving a leak
 */
router.post('/recommend', async (req: Request, res: Response) => {
  try {
    const { objectId, objectType, leakId, includeAlternatives = true } = req.body;

    // PRODUCTION TODO: Replace mock data with HubSpot API calls
    // - Fetch leak from custom object: hubspotClient.crm.objects.basicApi.getById('revenue_leak', leakId)
    // - Fetch customer history from associated contacts/companies
    // - Query similar resolutions from historical leak data
    const mockLeak: RevenueLeak = {
      id: leakId || `leak_${Date.now()}`,
      type: req.body.leakType || 'underbilling',
      severity: req.body.severity || 'medium',
      description: 'Detected revenue leak requiring analysis',
      potentialRevenue: req.body.potentialRevenue || 10000,
      affectedEntity: {
        type: objectType,
        id: objectId,
        name: `${objectType} ${objectId}`
      },
      detectedAt: new Date(),
      suggestedActions: []
    };

    const context: BreezeContext = {
      portalId: req.body.portalId || 'unknown',
      userId: req.body.userId || 'unknown',
      leak: mockLeak,
      customerHistory: {
        totalValue: 50000,
        relationship: 'established',
        recentInteractions: 3,
        satisfactionScore: 85,
        previousLeaks: 1
      }
    };

    const recommendation = await breezeActions.getAIRecommendation(context);

    res.json({
      success: true,
      data: {
        recommendedAction: recommendation.action,
        confidence: Math.round(recommendation.confidence * 100),
        reasoning: recommendation.reasoning,
        expectedOutcome: recommendation.expectedOutcome,
        risks: recommendation.risks.join('; '),
        alternatives: includeAlternatives ? recommendation.alternatives : []
      }
    });
  } catch (error) {
    console.error('Breeze recommendation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Recommendation failed'
    });
  }
});

/**
 * POST /breeze/execute
 * Execute a Breeze action for a leak
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { actionId, objectId, objectType, leakId, portalId, userId } = req.body;

    // Create context
    const mockLeak: RevenueLeak = {
      id: leakId || `leak_${Date.now()}`,
      type: req.body.leakType || 'underbilling',
      severity: req.body.severity || 'medium',
      description: 'Leak to be resolved',
      potentialRevenue: req.body.potentialRevenue || 10000,
      affectedEntity: {
        type: objectType,
        id: objectId,
        name: `${objectType} ${objectId}`
      },
      detectedAt: new Date(),
      suggestedActions: []
    };

    const context: BreezeContext = {
      portalId: portalId || 'unknown',
      userId: userId || 'unknown',
      leak: mockLeak
    };

    const result = await breezeActions.executeAction(actionId, context);

    res.json({
      success: result.status === 'success',
      data: {
        status: result.status,
        stepsCompleted: result.stepsCompleted,
        totalSteps: result.totalSteps,
        recoveredAmount: result.recoveredAmount,
        aiInsights: result.aiInsights,
        nextActions: result.nextActions,
        executionTime: result.executionTime,
        details: result.details
      }
    });
  } catch (error) {
    console.error('Breeze execute error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed'
    });
  }
});

/**
 * GET /breeze/actions
 * List available Breeze actions
 */
router.get('/actions', (req: Request, res: Response) => {
  const actions = breezeActions.getAllActions();

  res.json({
    success: true,
    data: actions.map(action => ({
      id: action.id,
      name: action.name,
      description: action.description,
      leakTypes: action.leakTypes,
      aiEnabled: action.aiEnabled,
      automationLevel: action.automationLevel,
      requiredPermissions: action.requiredPermissions,
      rollbackable: action.rollbackable,
      stepsCount: action.steps.length
    }))
  });
});

/**
 * GET /breeze/actions/:leakType
 * Get recommended action for a specific leak type
 */
router.get('/actions/:leakType', (req: Request, res: Response) => {
  const { leakType } = req.params;
  const action = breezeActions.getActionForLeakType(leakType as LeakType);

  if (!action) {
    return res.status(404).json({
      success: false,
      error: `No action found for leak type: ${leakType}`
    });
  }

  res.json({
    success: true,
    data: {
      id: action.id,
      name: action.name,
      description: action.description,
      leakTypes: action.leakTypes,
      aiEnabled: action.aiEnabled,
      automationLevel: action.automationLevel,
      steps: action.steps.map(s => ({
        id: s.id,
        order: s.order,
        name: s.name,
        type: s.type
      })),
      successCriteria: action.successCriteria,
      rollbackable: action.rollbackable
    }
  });
});

export default router;
