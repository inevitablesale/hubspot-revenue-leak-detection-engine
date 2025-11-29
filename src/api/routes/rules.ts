/**
 * Detection Rules API Routes
 * Configurable No-Code Detection Rule Engine
 */

import { Router, Request, Response } from 'express';
import { ConfigurableRuleEngine, DetectionRule, RuleCondition } from '../../engine/rule-engine';
import { Deal, Contact, Company, LeakType, LeakSeverity } from '../../types';
import { generateId } from '../../utils/helpers';

const router = Router();
const ruleEngine = new ConfigurableRuleEngine();

/**
 * GET /rules
 * List all detection rules
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { enabled, entityType, systemOnly } = req.query;
    let rules = ruleEngine.getRules();

    if (enabled === 'true') {
      rules = rules.filter(r => r.isEnabled);
    } else if (enabled === 'false') {
      rules = rules.filter(r => !r.isEnabled);
    }

    if (entityType) {
      rules = rules.filter(r => r.targetEntity === entityType);
    }

    if (systemOnly === 'true') {
      rules = rules.filter(r => r.isSystemRule);
    } else if (systemOnly === 'false') {
      rules = rules.filter(r => !r.isSystemRule);
    }

    res.json({
      success: true,
      data: {
        rules: rules.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          ruleType: r.ruleType,
          targetEntity: r.targetEntity,
          severity: r.severity,
          isEnabled: r.isEnabled,
          isSystemRule: r.isSystemRule,
          conditionCount: r.conditions.length,
          triggerCount: r.triggerCount,
          lastTriggered: r.lastTriggered
        })),
        stats: ruleEngine.getStats()
      }
    });
  } catch (error) {
    console.error('List rules error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list rules'
    });
  }
});

/**
 * GET /rules/:ruleId
 * Get a specific rule with full details
 */
router.get('/:ruleId', (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const rule = ruleEngine.getRule(ruleId);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: `Rule not found: ${ruleId}`
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Get rule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get rule'
    });
  }
});

/**
 * POST /rules
 * Create a new detection rule
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      ruleType,
      targetEntity,
      conditions,
      conditionLogic = 'all',
      severity = 'medium',
      suggestedAction,
      autoCreateTask = false,
      taskOwnerType,
      taskOwnerId,
      taskSubject,
      taskBody,
      taskDueDays,
      notifySlack = false,
      slackChannel,
      notifyTeams = false,
      teamsChannel
    } = req.body;

    // Validate rule
    const validation = ruleEngine.validateRule({
      name,
      targetEntity,
      conditions,
      severity,
      suggestedAction
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rule definition',
        details: validation.errors
      });
    }

    const newRule: DetectionRule = {
      id: generateId(),
      name,
      description: description || '',
      ruleType: ruleType || 'custom',
      targetEntity,
      conditions,
      conditionLogic,
      severity,
      suggestedAction: suggestedAction || '',
      isEnabled: true,
      isSystemRule: false,
      autoCreateTask,
      taskOwnerType,
      taskOwnerId,
      taskSubject,
      taskBody,
      taskDueDays,
      notifySlack,
      slackChannel,
      notifyTeams,
      teamsChannel,
      triggerCount: 0,
      createdAt: new Date(),
      createdBy: req.body.userId
    };

    ruleEngine.addRule(newRule);

    res.status(201).json({
      success: true,
      data: newRule,
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined
    });
  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create rule'
    });
  }
});

/**
 * PUT /rules/:ruleId
 * Update an existing rule
 */
router.put('/:ruleId', (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    const updatedRule = ruleEngine.updateRule(ruleId, updates);

    if (!updatedRule) {
      return res.status(404).json({
        success: false,
        error: `Rule not found: ${ruleId}`
      });
    }

    res.json({
      success: true,
      data: updatedRule
    });
  } catch (error) {
    console.error('Update rule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update rule'
    });
  }
});

/**
 * DELETE /rules/:ruleId
 * Delete a custom rule (system rules cannot be deleted)
 */
router.delete('/:ruleId', (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const rule = ruleEngine.getRule(ruleId);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: `Rule not found: ${ruleId}`
      });
    }

    if (rule.isSystemRule) {
      return res.status(403).json({
        success: false,
        error: 'System rules cannot be deleted'
      });
    }

    const deleted = ruleEngine.deleteRule(ruleId);

    res.json({
      success: deleted,
      message: deleted ? 'Rule deleted' : 'Failed to delete rule'
    });
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete rule'
    });
  }
});

/**
 * POST /rules/:ruleId/toggle
 * Enable or disable a rule
 */
router.post('/:ruleId/toggle', (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { enabled } = req.body;

    const rule = ruleEngine.getRule(ruleId);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: `Rule not found: ${ruleId}`
      });
    }

    const updatedRule = ruleEngine.updateRule(ruleId, { isEnabled: enabled });

    res.json({
      success: true,
      data: {
        id: ruleId,
        isEnabled: updatedRule?.isEnabled
      }
    });
  } catch (error) {
    console.error('Toggle rule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle rule'
    });
  }
});

/**
 * POST /rules/validate
 * Validate a rule definition without saving
 */
router.post('/validate', (req: Request, res: Response) => {
  try {
    const validation = ruleEngine.validateRule(req.body);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Validate rule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate rule'
    });
  }
});

/**
 * POST /rules/test
 * Test a rule against sample data
 */
router.post('/test', (req: Request, res: Response) => {
  try {
    const { rule, sampleData } = req.body;

    // Validate rule first
    const validation = ruleEngine.validateRule(rule);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rule definition',
        details: validation.errors
      });
    }

    // If no sample data provided, generate mock data
    const entities = sampleData || generateMockEntities(rule.targetEntity, 10);

    const testRule: DetectionRule = {
      id: 'test-rule',
      name: rule.name || 'Test Rule',
      description: rule.description || '',
      ruleType: rule.ruleType || 'custom',
      targetEntity: rule.targetEntity,
      conditions: rule.conditions,
      conditionLogic: rule.conditionLogic || 'all',
      severity: rule.severity || 'medium',
      suggestedAction: rule.suggestedAction || '',
      isEnabled: true,
      isSystemRule: false,
      autoCreateTask: false,
      notifySlack: false,
      notifyTeams: false,
      triggerCount: 0,
      createdAt: new Date()
    };

    const result = ruleEngine.testRule(testRule, entities);

    res.json({
      success: true,
      data: {
        sampleSize: result.sampleSize,
        matchCount: result.matchCount,
        matchRate: `${((result.matchCount / result.sampleSize) * 100).toFixed(1)}%`,
        matchedEntities: result.matchedEntities,
        estimatedLeaksPerDay: result.estimatedLeaksPerDay,
        executionTimeMs: result.executionTimeMs
      }
    });
  } catch (error) {
    console.error('Test rule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test rule'
    });
  }
});

/**
 * GET /rules/templates
 * Get available rule templates (system rules)
 */
router.get('/templates/list', (req: Request, res: Response) => {
  try {
    const templates = ruleEngine.getRuleTemplates();

    res.json({
      success: true,
      data: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        ruleType: t.ruleType,
        targetEntity: t.targetEntity,
        severity: t.severity,
        conditions: t.conditions.map(c => ({
          field: c.field,
          operator: c.operator,
          value: c.value
        }))
      }))
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get templates'
    });
  }
});

/**
 * POST /rules/templates/:templateId/create
 * Create a new rule from a template
 */
router.post('/templates/:templateId/create', (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const customizations = req.body;

    const newRule = ruleEngine.createRuleFromTemplate(templateId, customizations);

    if (!newRule) {
      return res.status(404).json({
        success: false,
        error: `Template not found: ${templateId}`
      });
    }

    res.status(201).json({
      success: true,
      data: newRule
    });
  } catch (error) {
    console.error('Create from template error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create from template'
    });
  }
});

/**
 * POST /rules/evaluate
 * Evaluate rules against provided entities
 */
router.post('/evaluate', (req: Request, res: Response) => {
  try {
    const { entityType, entities } = req.body;

    if (!entities || !Array.isArray(entities)) {
      return res.status(400).json({
        success: false,
        error: 'Entities array is required'
      });
    }

    let results;
    switch (entityType) {
      case 'deal':
        results = ruleEngine.evaluateDeals(entities as Deal[]);
        break;
      case 'contact':
        results = ruleEngine.evaluateContacts(entities as Contact[]);
        break;
      case 'company':
        results = ruleEngine.evaluateCompanies(entities as Company[]);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Invalid entity type: ${entityType}`
        });
    }

    const matchedResults = results.filter(r => r.matched);

    res.json({
      success: true,
      data: {
        totalEvaluated: entities.length,
        matchCount: matchedResults.length,
        results: matchedResults.map(r => ({
          ruleId: r.ruleId,
          ruleName: r.ruleName,
          entityId: r.entityId,
          entityName: r.entityName,
          matchedConditions: r.matchedConditions,
          leak: r.leak ? {
            id: r.leak.id,
            type: r.leak.type,
            severity: r.leak.severity,
            potentialRevenue: r.leak.potentialRevenue
          } : undefined
        }))
      }
    });
  } catch (error) {
    console.error('Evaluate rules error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to evaluate rules'
    });
  }
});

/**
 * POST /rules/export
 * Export custom rules to JSON
 */
router.post('/export', (req: Request, res: Response) => {
  try {
    const rulesJson = ruleEngine.exportRules();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=detection-rules.json');
    res.send(rulesJson);
  } catch (error) {
    console.error('Export rules error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export rules'
    });
  }
});

/**
 * POST /rules/import
 * Import rules from JSON
 */
router.post('/import', (req: Request, res: Response) => {
  try {
    const { rules } = req.body;
    
    if (!rules) {
      return res.status(400).json({
        success: false,
        error: 'Rules JSON is required'
      });
    }

    const json = typeof rules === 'string' ? rules : JSON.stringify(rules);
    const result = ruleEngine.importRules(json);

    res.json({
      success: true,
      data: {
        imported: result.imported,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error('Import rules error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import rules'
    });
  }
});

/**
 * GET /rules/operators
 * Get available condition operators
 */
router.get('/operators/list', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      operators: [
        { id: 'equals', label: 'Equals', description: 'Exact match' },
        { id: 'not_equals', label: 'Not Equals', description: 'Does not match' },
        { id: 'greater_than', label: 'Greater Than', description: 'Numeric comparison' },
        { id: 'less_than', label: 'Less Than', description: 'Numeric comparison' },
        { id: 'contains', label: 'Contains', description: 'String contains substring' },
        { id: 'not_contains', label: 'Does Not Contain', description: 'String does not contain' },
        { id: 'is_empty', label: 'Is Empty', description: 'Field is null, undefined, or empty string' },
        { id: 'is_not_empty', label: 'Is Not Empty', description: 'Field has a value' },
        { id: 'days_until', label: 'Days Until', description: 'Days until date field (for future dates)' },
        { id: 'days_since', label: 'Days Since', description: 'Days since date field (for past dates)' },
        { id: 'matches_regex', label: 'Matches Regex', description: 'Matches regular expression' },
        { id: 'in_list', label: 'In List', description: 'Value is in array of options' },
        { id: 'not_in_list', label: 'Not In List', description: 'Value is not in array of options' }
      ]
    }
  });
});

/**
 * Generate mock entities for testing
 */
function generateMockEntities(entityType: string, count: number): Array<Deal | Contact | Company> {
  const entities = [];
  
  for (let i = 0; i < count; i++) {
    switch (entityType) {
      case 'deal':
        entities.push({
          id: `deal_${i}`,
          properties: {
            dealname: `Test Deal ${i}`,
            amount: String(Math.floor(Math.random() * 100000)),
            dealstage: ['appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled', 'decisionmakerboughtin', 'closedwon', 'closedlost'][Math.floor(Math.random() * 6)],
            closedate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
            cs_owner: Math.random() > 0.3 ? `user_${Math.floor(Math.random() * 10)}` : undefined
          }
        } as Deal);
        break;
      case 'contact':
        entities.push({
          id: `contact_${i}`,
          properties: {
            firstname: `Test`,
            lastname: `Contact ${i}`,
            email: Math.random() > 0.2 ? `test${i}@example.com` : undefined,
            lifecyclestage: ['subscriber', 'lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer'][Math.floor(Math.random() * 6)]
          }
        } as Contact);
        break;
      case 'company':
        entities.push({
          id: `company_${i}`,
          properties: {
            name: `Test Company ${i}`,
            domain: `company${i}.com`,
            industry: ['Technology', 'Healthcare', 'Finance', 'Retail'][Math.floor(Math.random() * 4)],
            annualrevenue: String(Math.floor(Math.random() * 10000000))
          }
        } as Company);
        break;
    }
  }
  
  return entities;
}

export default router;
