/**
 * Escalation Rules API Routes
 * Auto-create tasks and escalation chains for unresolved leaks
 */

import { Router, Request, Response } from 'express';
import { EscalationEngine, EscalationRule } from '../../engine/escalation-engine';
import { RevenueLeak, LeakType, LeakSeverity } from '../../types';
import { generateId } from '../../utils/helpers';

const router = Router();
const escalationEngine = new EscalationEngine();

/**
 * GET /escalations
 * List all escalation rules
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { enabled } = req.query;
    let rules = escalationEngine.getRules();

    if (enabled === 'true') {
      rules = rules.filter(r => r.isEnabled);
    } else if (enabled === 'false') {
      rules = rules.filter(r => !r.isEnabled);
    }

    res.json({
      success: true,
      data: {
        rules: rules.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          leakTypeFilter: r.leakTypeFilter,
          minSeverity: r.minSeverity,
          triggerCondition: r.triggerCondition,
          daysThreshold: r.daysThreshold,
          escalationLevel: r.escalationLevel,
          escalationAction: r.escalationAction,
          isEnabled: r.isEnabled,
          priority: r.priority,
          triggerCount: r.triggerCount,
          lastTriggered: r.lastTriggered
        })),
        stats: escalationEngine.getStats()
      }
    });
  } catch (error) {
    console.error('List escalation rules error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list escalation rules'
    });
  }
});

/**
 * GET /escalations/:ruleId
 * Get a specific escalation rule
 */
router.get('/:ruleId', (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const rule = escalationEngine.getRule(ruleId);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: `Escalation rule not found: ${ruleId}`
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Get escalation rule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get escalation rule'
    });
  }
});

/**
 * POST /escalations
 * Create a new escalation rule
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      leakTypeFilter = 'all',
      minSeverity = 'medium',
      triggerCondition,
      daysThreshold,
      revenueThreshold,
      escalationLevel,
      escalationAction,
      escalationActionsConfig,
      escalateToUserId,
      escalateToTeam,
      workflowId,
      notificationMessage,
      priority = 10,
      nextEscalationRuleId
    } = req.body;

    if (!name || !triggerCondition || !escalationAction) {
      return res.status(400).json({
        success: false,
        error: 'Name, trigger condition, and escalation action are required'
      });
    }

    const newRule: EscalationRule = {
      id: generateId(),
      name,
      description: description || '',
      leakTypeFilter,
      minSeverity,
      triggerCondition,
      daysThreshold,
      revenueThreshold,
      escalationLevel: escalationLevel || 'level_1',
      escalationAction,
      escalationActionsConfig,
      escalateToUserId,
      escalateToTeam,
      workflowId,
      notificationMessage,
      isEnabled: true,
      priority,
      triggerCount: 0,
      nextEscalationRuleId,
      createdAt: new Date()
    };

    escalationEngine.addRule(newRule);

    res.status(201).json({
      success: true,
      data: newRule
    });
  } catch (error) {
    console.error('Create escalation rule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create escalation rule'
    });
  }
});

/**
 * PUT /escalations/:ruleId
 * Update an escalation rule
 */
router.put('/:ruleId', (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    const updatedRule = escalationEngine.updateRule(ruleId, updates);

    if (!updatedRule) {
      return res.status(404).json({
        success: false,
        error: `Escalation rule not found: ${ruleId}`
      });
    }

    res.json({
      success: true,
      data: updatedRule
    });
  } catch (error) {
    console.error('Update escalation rule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update escalation rule'
    });
  }
});

/**
 * DELETE /escalations/:ruleId
 * Delete an escalation rule
 */
router.delete('/:ruleId', (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const deleted = escalationEngine.deleteRule(ruleId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Escalation rule not found: ${ruleId}`
      });
    }

    res.json({
      success: true,
      message: 'Escalation rule deleted'
    });
  } catch (error) {
    console.error('Delete escalation rule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete escalation rule'
    });
  }
});

/**
 * POST /escalations/:ruleId/toggle
 * Enable or disable an escalation rule
 */
router.post('/:ruleId/toggle', (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { enabled } = req.body;

    const rule = escalationEngine.getRule(ruleId);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: `Escalation rule not found: ${ruleId}`
      });
    }

    const updatedRule = escalationEngine.updateRule(ruleId, { isEnabled: enabled });

    res.json({
      success: true,
      data: {
        id: ruleId,
        isEnabled: updatedRule?.isEnabled
      }
    });
  } catch (error) {
    console.error('Toggle escalation rule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle escalation rule'
    });
  }
});

/**
 * POST /escalations/evaluate
 * Evaluate leaks for escalation
 */
router.post('/evaluate', (req: Request, res: Response) => {
  try {
    const { leaks } = req.body;

    if (!leaks || !Array.isArray(leaks)) {
      return res.status(400).json({
        success: false,
        error: 'Leaks array is required'
      });
    }

    const events = escalationEngine.evaluateLeaksForEscalation(leaks as RevenueLeak[]);

    res.json({
      success: true,
      data: {
        escalationsTriggered: events.length,
        events: events.map(e => ({
          id: e.id,
          leakId: e.leakId,
          ruleId: e.ruleId,
          ruleName: e.ruleName,
          escalationLevel: e.escalationLevel,
          actionsTaken: e.actionsTaken,
          triggeredAt: e.triggeredAt,
          notificationsSent: e.notificationsSent
        }))
      }
    });
  } catch (error) {
    console.error('Evaluate escalations error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to evaluate escalations'
    });
  }
});

/**
 * GET /escalations/pending
 * Get leaks approaching escalation thresholds
 */
router.get('/pending/list', (req: Request, res: Response) => {
  try {
    const { leaks } = req.query;

    // In production, would fetch leaks from HubSpot
    // For now, return mock data structure
    const mockLeaks: RevenueLeak[] = leaks ? JSON.parse(leaks as string) : [];
    const pendingEscalations = escalationEngine.getPendingEscalations(mockLeaks);

    res.json({
      success: true,
      data: {
        pending: pendingEscalations.map(p => ({
          leakId: p.leak.id,
          leakType: p.leak.type,
          leakSeverity: p.leak.severity,
          ruleName: p.rule.name,
          escalationLevel: p.rule.escalationLevel,
          daysUntilEscalation: p.daysUntilEscalation,
          estimatedEscalationDate: p.estimatedEscalationDate
        }))
      }
    });
  } catch (error) {
    console.error('Get pending escalations error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pending escalations'
    });
  }
});

/**
 * GET /escalations/chain/:leakType
 * Get the escalation chain for a leak type
 */
router.get('/chain/:leakType', (req: Request, res: Response) => {
  try {
    const { leakType } = req.params;
    const chain = escalationEngine.getEscalationChain(leakType as LeakType);

    res.json({
      success: true,
      data: {
        leakType,
        chain: chain.map((r, index) => ({
          step: index + 1,
          ruleId: r.id,
          ruleName: r.name,
          level: r.escalationLevel,
          triggerCondition: r.triggerCondition,
          daysThreshold: r.daysThreshold,
          action: r.escalationAction
        }))
      }
    });
  } catch (error) {
    console.error('Get escalation chain error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get escalation chain'
    });
  }
});

/**
 * GET /escalations/history/:leakId
 * Get escalation history for a specific leak
 */
router.get('/history/:leakId', (req: Request, res: Response) => {
  try {
    const { leakId } = req.params;
    const history = escalationEngine.getLeakEscalationHistory(leakId);

    res.json({
      success: true,
      data: {
        leakId,
        escalationCount: history.length,
        history: history.map(e => ({
          id: e.id,
          ruleId: e.ruleId,
          ruleName: e.ruleName,
          escalationLevel: e.escalationLevel,
          actionsTaken: e.actionsTaken,
          triggeredAt: e.triggeredAt,
          newOwnerId: e.newOwnerId,
          taskId: e.taskId
        }))
      }
    });
  } catch (error) {
    console.error('Get escalation history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get escalation history'
    });
  }
});

/**
 * POST /escalations/task
 * Manually create an escalation task
 */
router.post('/task', async (req: Request, res: Response) => {
  try {
    const { leakId, ruleId, leak } = req.body;

    if (!leak) {
      return res.status(400).json({
        success: false,
        error: 'Leak data is required'
      });
    }

    const rule = escalationEngine.getRule(ruleId);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: `Escalation rule not found: ${ruleId}`
      });
    }

    const taskResult = await escalationEngine.createEscalationTask(leak as RevenueLeak, rule);

    res.json({
      success: taskResult.success,
      data: taskResult.success ? {
        taskId: taskResult.taskId,
        assignedTo: taskResult.assignedTo,
        dueDate: taskResult.dueDate
      } : undefined,
      error: taskResult.error
    });
  } catch (error) {
    console.error('Create escalation task error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create escalation task'
    });
  }
});

/**
 * GET /escalations/stats
 * Get escalation statistics
 */
router.get('/stats/summary', (req: Request, res: Response) => {
  try {
    const stats = escalationEngine.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get escalation stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get escalation stats'
    });
  }
});

export default router;
