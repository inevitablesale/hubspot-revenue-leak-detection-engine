/**
 * Tests for Self-Healing Module
 */

import { SelfHealingEngine } from '../../src/agent-os/self-healing';

describe('SelfHealingEngine', () => {
  let engine: SelfHealingEngine;

  beforeEach(() => {
    engine = new SelfHealingEngine();
  });

  describe('initialization', () => {
    it('should initialize with default health checks', () => {
      const checks = engine.getHealthChecks();
      
      expect(checks.length).toBeGreaterThan(0);
    });

    it('should have data quality check', () => {
      const check = engine.getHealthCheck('data-quality');
      
      expect(check).toBeDefined();
      expect(check?.type).toBe('data_quality');
    });

    it('should have process health check', () => {
      const check = engine.getHealthCheck('process-health');
      
      expect(check).toBeDefined();
      expect(check?.type).toBe('process_health');
    });
  });

  describe('runHealthChecks', () => {
    it('should run all health checks', async () => {
      const results = await engine.runHealthChecks();

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.lastCheck instanceof Date)).toBe(true);
    });

    it('should update lastCheck timestamp', async () => {
      const before = new Date();
      await engine.runHealthChecks();
      const check = engine.getHealthCheck('data-quality');

      expect(check?.lastCheck.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('runHealthCheck', () => {
    it('should run a specific health check', async () => {
      const result = await engine.runHealthCheck('data-quality');

      expect(result).toBeDefined();
      expect(result.id).toBe('data-quality');
      expect(result.metrics).toBeDefined();
    });

    it('should throw for non-existent check', async () => {
      await expect(engine.runHealthCheck('non-existent'))
        .rejects.toThrow('Health check non-existent not found');
    });
  });

  describe('getSystemHealth', () => {
    it('should return overall system health', () => {
      const health = engine.getSystemHealth();

      expect(health.overall).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.overall);
      expect(health.checks).toBeDefined();
      expect(health.activeIssues).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getActiveIssues', () => {
    it('should return active issues', () => {
      const issues = engine.getActiveIssues();

      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('escalateIssue', () => {
    it('should escalate an issue for manual intervention', async () => {
      await engine.runHealthChecks();
      const issues = engine.getIssues();

      if (issues.length > 0) {
        engine.escalateIssue(issues[0].id, 'Test escalation');
        const updated = engine.getIssues().find(i => i.id === issues[0].id);
        expect(updated?.status).toBe('escalated');
      }
    });
  });

  describe('getHealingStats', () => {
    it('should return healing statistics', () => {
      const stats = engine.getHealingStats();

      expect(stats.totalHealed).toBeGreaterThanOrEqual(0);
      expect(stats.totalFailed).toBeGreaterThanOrEqual(0);
      expect(typeof stats.successRate).toBe('number');
      expect(typeof stats.averageHealingTime).toBe('number');
    });
  });

  describe('getHealingHistory', () => {
    it('should return healing history', () => {
      const history = engine.getHealingHistory();

      expect(Array.isArray(history)).toBe(true);
    });
  });
});
