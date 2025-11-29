/**
 * Tests for RevOps Agent OS
 */

import { RevOpsAgentOS } from '../../src/agent-os';
import { RevenueLeak, LeakDetectionResult } from '../../src/types';

describe('RevOpsAgentOS', () => {
  let agentOS: RevOpsAgentOS;

  beforeEach(() => {
    agentOS = new RevOpsAgentOS();
  });

  const createMockLeak = (id: string, type: string, revenue: number): RevenueLeak => ({
    id,
    type: type as RevenueLeak['type'],
    severity: revenue > 10000 ? 'critical' : revenue > 5000 ? 'high' : 'medium',
    description: `Test leak ${id}`,
    potentialRevenue: revenue,
    affectedEntity: { type: 'deal', id: `deal-${id}`, name: `Deal ${id}` },
    detectedAt: new Date(),
    suggestedActions: [],
  });

  const createMockDetectionResult = (leaks: RevenueLeak[]): LeakDetectionResult => ({
    leaks,
    summary: {
      totalLeaks: leaks.length,
      totalPotentialRevenue: leaks.reduce((sum, l) => sum + l.potentialRevenue, 0),
      byType: {
        underbilling: leaks.filter(l => l.type === 'underbilling').length,
        missed_renewal: leaks.filter(l => l.type === 'missed_renewal').length,
        untriggered_crosssell: leaks.filter(l => l.type === 'untriggered_crosssell').length,
        stalled_cs_handoff: leaks.filter(l => l.type === 'stalled_cs_handoff').length,
        invalid_lifecycle_path: leaks.filter(l => l.type === 'invalid_lifecycle_path').length,
        billing_gap: leaks.filter(l => l.type === 'billing_gap').length,
        stale_pipeline: leaks.filter(l => l.type === 'stale_pipeline').length,
        missed_handoff: leaks.filter(l => l.type === 'missed_handoff').length,
        data_quality: leaks.filter(l => l.type === 'data_quality').length,
      },
      bySeverity: {
        low: leaks.filter(l => l.severity === 'low').length,
        medium: leaks.filter(l => l.severity === 'medium').length,
        high: leaks.filter(l => l.severity === 'high').length,
        critical: leaks.filter(l => l.severity === 'critical').length,
      },
    },
    analyzedAt: new Date(),
  });

  describe('initialization', () => {
    it('should initialize all modules', () => {
      expect(agentOS.intelligence).toBeDefined();
      expect(agentOS.orchestration).toBeDefined();
      expect(agentOS.simulation).toBeDefined();
      expect(agentOS.selfHealing).toBeDefined();
      expect(agentOS.validation).toBeDefined();
      expect(agentOS.governance).toBeDefined();
      expect(agentOS.crossSignals).toBeDefined();
      expect(agentOS.metaIntelligence).toBeDefined();
      expect(agentOS.ruleEvolution).toBeDefined();
    });

    it('should return status with all modules enabled', () => {
      const status = agentOS.getStatus();
      
      expect(status.version).toBe('2.0.0');
      expect(status.initialized).toBe(true);
      expect(status.modules.intelligence).toBe(true);
      expect(status.modules.orchestration).toBe(true);
      expect(status.modules.simulation).toBe(true);
      expect(status.modules.selfHealing).toBe(true);
      expect(status.modules.validation).toBe(true);
      expect(status.modules.governance).toBe(true);
      expect(status.modules.crossSignals).toBe(true);
      expect(status.modules.metaIntelligence).toBe(true);
      expect(status.modules.ruleEvolution).toBe(true);
      // New advanced modules
      expect(status.modules.kernelScheduler).toBe(true);
      expect(status.modules.autonomousCycles).toBe(true);
      expect(status.modules.multiAgentCooperation).toBe(true);
      expect(status.modules.economicCostModel).toBe(true);
      expect(status.modules.governanceConstitution).toBe(true);
      expect(status.modules.driftDetection).toBe(true);
      expect(status.modules.modelQualityIntrospection).toBe(true);
      expect(status.modules.portalBaselines).toBe(true);
      expect(status.modules.autonomyScores).toBe(true);
      expect(status.modules.oneClickHardening).toBe(true);
    });

    it('should initialize with zero metrics', () => {
      const metrics = agentOS.getMetrics();
      
      expect(metrics.leaksDetected).toBe(0);
      expect(metrics.leaksRecovered).toBe(0);
      expect(metrics.insightsGenerated).toBe(0);
    });
  });

  describe('processDetectionResults', () => {
    it('should process detection results and generate insights', async () => {
      const leaks = [
        createMockLeak('1', 'underbilling', 15000),
        createMockLeak('2', 'missed_renewal', 25000),
        createMockLeak('3', 'billing_gap', 8000),
      ];
      const results = createMockDetectionResult(leaks);

      const output = await agentOS.processDetectionResults(results);

      expect(output.insights).toBeDefined();
      expect(output.recoveryPlan).toBeDefined();
      expect(output.ruleEvaluations).toBeDefined();
      expect(output.systemInsights).toBeDefined();
    });

    it('should update metrics after processing', async () => {
      const leaks = [
        createMockLeak('1', 'underbilling', 10000),
        createMockLeak('2', 'missed_renewal', 20000),
      ];
      const results = createMockDetectionResult(leaks);

      await agentOS.processDetectionResults(results);
      const metrics = agentOS.getMetrics();

      expect(metrics.leaksDetected).toBe(2);
      expect(metrics.revenueProtected).toBe(30000);
      expect(metrics.insightsGenerated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runSimulation', () => {
    it('should run Monte Carlo simulation', async () => {
      const leaks = [
        createMockLeak('1', 'underbilling', 10000),
        createMockLeak('2', 'billing_gap', 5000),
      ];

      const result = await agentOS.runSimulation('Test Simulation', leaks, 'monte_carlo');

      expect(result).toBeDefined();
      expect(result.outcomes).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should update metrics after simulation', async () => {
      const leaks = [createMockLeak('1', 'underbilling', 10000)];

      await agentOS.runSimulation('Test', leaks);
      const metrics = agentOS.getMetrics();

      expect(metrics.simulationsRun).toBe(1);
    });
  });

  describe('runHealthCheck', () => {
    it('should run health checks', async () => {
      const result = await agentOS.runHealthCheck();

      expect(result.checks).toBeDefined();
      expect(result.healingResults).toBeDefined();
      expect(Array.isArray(result.checks)).toBe(true);
    });
  });

  describe('ingestSignal', () => {
    it('should ingest a cross-system signal', () => {
      const signal = agentOS.ingestSignal('support', 'ticket_volume', 150, 100);

      expect(signal).toBeDefined();
      expect(signal.system).toBe('support');
      expect(signal.metric).toBe('ticket_volume');
      expect(signal.value).toBe(150);
      expect(signal.change).toBe(50);
    });
  });

  describe('generateDashboard', () => {
    it('should generate a comprehensive dashboard', () => {
      const dashboard = agentOS.generateDashboard();

      expect(dashboard.status).toBeDefined();
      expect(dashboard.metrics).toBeDefined();
      expect(dashboard.executiveSummary).toBeDefined();
      expect(dashboard.capabilities).toBeDefined();
      expect(dashboard.benchmarks).toBeDefined();
      expect(dashboard.activeAlerts).toBeDefined();
      expect(dashboard.pendingApprovals).toBeDefined();
      expect(dashboard.systemHealth).toBeDefined();
    });
  });

  describe('getModuleStats', () => {
    it('should return statistics from all modules', () => {
      const stats = agentOS.getModuleStats();

      expect(stats.intelligence).toBeDefined();
      expect(stats.orchestration).toBeDefined();
      expect(stats.simulation).toBeDefined();
      expect(stats.selfHealing).toBeDefined();
      expect(stats.validation).toBeDefined();
      expect(stats.governance).toBeDefined();
      expect(stats.crossSignals).toBeDefined();
      expect(stats.ruleEvolution).toBeDefined();
    });
  });
});
