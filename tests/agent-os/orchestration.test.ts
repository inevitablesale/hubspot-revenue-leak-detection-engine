/**
 * Tests for Orchestration Module
 */

import { OrchestrationEngine } from '../../src/agent-os/orchestration';
import { RevenueLeak } from '../../src/types';

describe('OrchestrationEngine', () => {
  let engine: OrchestrationEngine;

  beforeEach(() => {
    engine = new OrchestrationEngine();
  });

  const createMockLeak = (
    id: string,
    type: string,
    revenue: number
  ): RevenueLeak => ({
    id,
    type: type as RevenueLeak['type'],
    severity: revenue > 10000 ? 'critical' : revenue > 5000 ? 'high' : 'medium',
    description: `Test leak ${id}`,
    potentialRevenue: revenue,
    affectedEntity: { type: 'deal', id: `deal-${id}`, name: `Deal ${id}` },
    detectedAt: new Date(),
    suggestedActions: [
      { id: '1', type: 'update_property', title: 'Update', description: 'Test', priority: 'high' },
    ],
  });

  describe('createRecoveryPlan', () => {
    it('should create a recovery plan for leaks', () => {
      const leaks = [
        createMockLeak('1', 'underbilling', 15000),
        createMockLeak('2', 'billing_gap', 8000),
      ];

      const plan = engine.createRecoveryPlan(leaks);

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.status).toBe('pending');
      expect(plan.steps.length).toBeGreaterThan(0);
    });

    it('should prioritize by revenue when specified', () => {
      const leaks = [
        createMockLeak('1', 'underbilling', 5000),
        createMockLeak('2', 'billing_gap', 25000),
        createMockLeak('3', 'missed_renewal', 15000),
      ];

      const plan = engine.createRecoveryPlan(leaks, { prioritizeBy: 'revenue' });

      expect(plan).toBeDefined();
      expect(plan.description).toContain('prioritized by revenue');
    });

    it('should include validation steps when specified', () => {
      const leaks = [createMockLeak('1', 'underbilling', 10000)];

      const plan = engine.createRecoveryPlan(leaks, { includeValidation: true });

      const validationSteps = plan.steps.filter(s => s.type === 'validation');
      expect(validationSteps.length).toBeGreaterThan(0);
    });

    it('should calculate capacity requirements', () => {
      const leaks = [
        createMockLeak('1', 'underbilling', 10000),
        createMockLeak('2', 'billing_gap', 8000),
      ];

      const plan = engine.createRecoveryPlan(leaks);

      expect(plan.capacityRequirements).toBeDefined();
      expect(plan.capacityRequirements.length).toBeGreaterThan(0);
    });
  });

  describe('executePlan', () => {
    it('should execute a recovery plan', async () => {
      const leaks = [createMockLeak('1', 'billing_gap', 5000)];
      const plan = engine.createRecoveryPlan(leaks);

      const result = await engine.executePlan(plan.id);

      expect(result).toBeDefined();
      expect(result.planId).toBe(plan.id);
      expect(['completed', 'partial', 'failed']).toContain(result.status);
    });

    it('should throw for non-existent plan', async () => {
      await expect(engine.executePlan('non-existent'))
        .rejects.toThrow('Plan non-existent not found');
    });

    it('should track execution duration', async () => {
      const leaks = [createMockLeak('1', 'billing_gap', 5000)];
      const plan = engine.createRecoveryPlan(leaks);

      const result = await engine.executePlan(plan.id);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('hasCapacity', () => {
    it('should check capacity for requirements', () => {
      const hasCapacity = engine.hasCapacity([
        { resourceType: 'api_calls', amount: 10, priority: 'required' },
      ]);

      expect(typeof hasCapacity).toBe('boolean');
    });

    it('should return true when capacity is available', () => {
      const hasCapacity = engine.hasCapacity([
        { resourceType: 'api_calls', amount: 5, priority: 'required' },
        { resourceType: 'concurrent_tasks', amount: 2, priority: 'required' },
      ]);

      expect(hasCapacity).toBe(true);
    });
  });

  describe('getCapacityStatus', () => {
    it('should return current capacity status', () => {
      const status = engine.getCapacityStatus();

      expect(status.apiCalls).toBeDefined();
      expect(status.concurrentTasks).toBeDefined();
      expect(status.memory).toBeDefined();
    });
  });

  describe('getPlans', () => {
    it('should return all plans', () => {
      const leaks1 = [createMockLeak('1', 'billing_gap', 5000)];
      const leaks2 = [createMockLeak('2', 'underbilling', 8000)];

      engine.createRecoveryPlan(leaks1);
      engine.createRecoveryPlan(leaks2);

      const plans = engine.getPlans();

      expect(plans.length).toBe(2);
    });
  });

  describe('getPlan', () => {
    it('should retrieve a plan by ID', () => {
      const leaks = [createMockLeak('1', 'billing_gap', 5000)];
      const created = engine.createRecoveryPlan(leaks);

      const retrieved = engine.getPlan(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent plan', () => {
      const plan = engine.getPlan('non-existent');

      expect(plan).toBeUndefined();
    });
  });

  describe('cancelPlan', () => {
    it('should cancel a pending plan', () => {
      const leaks = [createMockLeak('1', 'billing_gap', 5000)];
      const plan = engine.createRecoveryPlan(leaks);

      const cancelled = engine.cancelPlan(plan.id);

      expect(cancelled).toBe(true);
      expect(engine.getPlan(plan.id)?.status).toBe('failed');
    });

    it('should return false for non-existent plan', () => {
      const cancelled = engine.cancelPlan('non-existent');

      expect(cancelled).toBe(false);
    });
  });

  describe('getPlansByStatus', () => {
    it('should filter plans by status', () => {
      const leaks = [createMockLeak('1', 'billing_gap', 5000)];
      engine.createRecoveryPlan(leaks);
      engine.createRecoveryPlan(leaks);

      const pendingPlans = engine.getPlansByStatus('pending');

      expect(pendingPlans.every(p => p.status === 'pending')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return orchestration statistics', () => {
      const stats = engine.getStats();

      expect(stats.totalPlans).toBeGreaterThanOrEqual(0);
      expect(stats.pendingPlans).toBeGreaterThanOrEqual(0);
      expect(stats.capacityUtilization).toBeDefined();
    });
  });
});
