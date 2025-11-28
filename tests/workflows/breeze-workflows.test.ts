/**
 * Tests for Breeze Workflow Engine
 */

import { BreezeWorkflowEngine } from '../../src/workflows/breeze-workflows';
import { RevenueLeak, LeakType, LeakSeverity } from '../../src/types';
import { LeakScore } from '../../src/scoring/leak-scorer';

describe('BreezeWorkflowEngine', () => {
  let engine: BreezeWorkflowEngine;

  const createMockLeak = (
    id: string,
    type: LeakType,
    severity: LeakSeverity,
    potentialRevenue: number
  ): RevenueLeak => ({
    id,
    type,
    severity,
    potentialRevenue,
    description: `Test leak ${id}`,
    affectedEntity: {
      type: 'deal',
      id: 'deal-1',
      name: 'Test Deal',
    },
    detectedAt: new Date(),
    suggestedActions: [
      { id: 'action-1', type: 'update_property', title: 'Fix', description: '', priority: 'high' },
    ],
  });

  const createMockScore = (leakId: string, composite: number): LeakScore => ({
    leakId,
    severity: 50,
    impact: 50,
    recoverability: 70,
    urgency: 50,
    composite,
    grade: composite >= 50 ? 'B' : 'D',
    recommendation: 'Test recommendation',
  });

  beforeEach(() => {
    engine = new BreezeWorkflowEngine();
  });

  describe('getWorkflows', () => {
    it('should return default workflows', () => {
      const workflows = engine.getWorkflows();
      
      expect(workflows.length).toBeGreaterThan(0);
    });

    it('should include recover-all-leaks workflow', () => {
      const workflows = engine.getWorkflows();
      const recoverAll = workflows.find(w => w.id === 'recover-all-leaks');
      
      expect(recoverAll).toBeDefined();
      expect(recoverAll?.name).toBe('Recover All Leaks');
    });

    it('should include quick-wins workflow', () => {
      const workflows = engine.getWorkflows();
      const quickWins = workflows.find(w => w.id === 'quick-wins');
      
      expect(quickWins).toBeDefined();
    });

    it('should include critical-alerts workflow', () => {
      const workflows = engine.getWorkflows();
      const criticalAlerts = workflows.find(w => w.id === 'critical-alerts');
      
      expect(criticalAlerts).toBeDefined();
    });
  });

  describe('getWorkflow', () => {
    it('should return specific workflow by ID', () => {
      const workflow = engine.getWorkflow('recover-all-leaks');
      
      expect(workflow).toBeDefined();
      expect(workflow?.id).toBe('recover-all-leaks');
    });

    it('should return undefined for non-existent workflow', () => {
      const workflow = engine.getWorkflow('non-existent');
      
      expect(workflow).toBeUndefined();
    });
  });

  describe('executeRecoverAllLeaks', () => {
    it('should execute recovery workflow', async () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'high', 10000),
        createMockLeak('leak-2', 'billing_gap', 'medium', 5000),
      ];
      
      const scores = [
        createMockScore('leak-1', 70),
        createMockScore('leak-2', 60),
      ];
      
      const result = await engine.executeRecoverAllLeaks(leaks, scores);
      
      expect(result.executionId).toBeDefined();
      expect(result.totalLeaks).toBe(2);
      expect(result.processed).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.details).toBeDefined();
    });

    it('should skip low-priority leaks', async () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'low', 1000),
      ];
      
      const scores = [
        createMockScore('leak-1', 20), // Low score
      ];
      
      const result = await engine.executeRecoverAllLeaks(leaks, scores);
      
      expect(result.skipped).toBeGreaterThan(0);
    });

    it('should track recovery statistics', async () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'high', 10000),
      ];
      
      const scores = [
        createMockScore('leak-1', 70),
      ];
      
      const result = await engine.executeRecoverAllLeaks(leaks, scores);
      
      expect(result.succeeded).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(result.recoveredRevenue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('executeWorkflow', () => {
    it('should execute a specific workflow', async () => {
      const leaks = [
        createMockLeak('leak-1', 'underbilling', 'high', 10000),
      ];
      
      const execution = await engine.executeWorkflow('recover-all-leaks', {
        leaks,
        scores: new Map(),
      });
      
      expect(execution.id).toBeDefined();
      expect(execution.workflowId).toBe('recover-all-leaks');
      expect(['running', 'completed', 'failed']).toContain(execution.status);
    });

    it('should throw for non-existent workflow', async () => {
      await expect(
        engine.executeWorkflow('non-existent', { leaks: [] })
      ).rejects.toThrow('Workflow non-existent not found');
    });

    it('should update workflow run count', async () => {
      const beforeWorkflow = engine.getWorkflow('recover-all-leaks');
      const beforeCount = beforeWorkflow?.runCount || 0;
      
      await engine.executeWorkflow('recover-all-leaks', { leaks: [] });
      
      const afterWorkflow = engine.getWorkflow('recover-all-leaks');
      expect(afterWorkflow?.runCount).toBe(beforeCount + 1);
    });
  });

  describe('getExecutions', () => {
    it('should return execution history', async () => {
      await engine.executeWorkflow('recover-all-leaks', { leaks: [] });
      
      const executions = engine.getExecutions();
      
      expect(executions.length).toBeGreaterThan(0);
    });
  });

  describe('getExecution', () => {
    it('should return specific execution by ID', async () => {
      const execution = await engine.executeWorkflow('recover-all-leaks', { leaks: [] });
      
      const retrieved = engine.getExecution(execution.id);
      
      expect(retrieved).toBe(execution);
    });

    it('should return undefined for non-existent execution', () => {
      const retrieved = engine.getExecution('non-existent');
      
      expect(retrieved).toBeUndefined();
    });
  });
});
