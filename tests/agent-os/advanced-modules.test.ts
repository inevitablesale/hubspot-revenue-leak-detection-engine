/**
 * Tests for the new advanced Agent OS modules
 */

import { 
  KernelScheduler,
  AutonomousCyclesEngine,
  MultiAgentCooperation,
  EconomicCostModel,
  GovernanceConstitution,
  DriftDetectionEngine,
  ModelQualityIntrospection,
  PortalBaselinesEngine,
  AutonomyScoresEngine,
  OneClickHardening,
} from '../../src/agent-os';

describe('KernelScheduler', () => {
  let scheduler: KernelScheduler;

  beforeEach(() => {
    scheduler = new KernelScheduler();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const config = scheduler.getConfig();
      expect(config.policy).toBe('priority');
      expect(config.timeQuantum).toBe(100);
      expect(config.preemptionEnabled).toBe(true);
    });
  });

  describe('createProcess', () => {
    it('should create a process with default priority', () => {
      const process = scheduler.createProcess('Test Process');
      expect(process.name).toBe('Test Process');
      expect(process.priority).toBe('normal');
      expect(process.state).toBe('ready');
    });

    it('should create a process with custom priority', () => {
      const process = scheduler.createProcess('High Priority', { priority: 'high' });
      expect(process.priority).toBe('high');
    });
  });

  describe('schedule', () => {
    it('should schedule processes by priority', () => {
      scheduler.createProcess('Low', { priority: 'low' });
      scheduler.createProcess('High', { priority: 'high' });
      
      const decision = scheduler.schedule();
      expect(decision.selectedProcessId).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return scheduler statistics', () => {
      scheduler.createProcess('Test');
      const stats = scheduler.getStats();
      
      expect(stats.totalProcesses).toBe(1);
      expect(stats.readyProcesses).toBe(1);
    });
  });
});

describe('AutonomousCyclesEngine', () => {
  let engine: AutonomousCyclesEngine;

  beforeEach(() => {
    engine = new AutonomousCyclesEngine();
  });

  describe('initialization', () => {
    it('should initialize with default cycles', () => {
      const cycles = engine.getCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });
  });

  describe('createCycle', () => {
    it('should create a custom cycle', () => {
      const cycle = engine.createCycle({
        name: 'Custom Cycle',
        description: 'Test cycle',
        frequency: 'hourly',
        tasks: [],
        schedule: {
          cronExpression: '0 * * * *',
          timezone: 'UTC',
          windowStart: 0,
          windowEnd: 24,
          blackoutPeriods: [],
        },
      });

      expect(cycle.name).toBe('Custom Cycle');
      expect(cycle.frequency).toBe('hourly');
    });
  });

  describe('getStats', () => {
    it('should return cycle statistics', () => {
      const stats = engine.getStats();
      
      expect(stats.totalCycles).toBeGreaterThan(0);
      expect(stats).toHaveProperty('activeCycles');
      expect(stats).toHaveProperty('totalExecutions');
    });
  });
});

describe('MultiAgentCooperation', () => {
  let cooperation: MultiAgentCooperation;

  beforeEach(() => {
    cooperation = new MultiAgentCooperation('test-agent');
  });

  describe('initialization', () => {
    it('should initialize with local agent registered', () => {
      const agents = cooperation.getAgents();
      expect(agents.length).toBe(1);
      expect(agents[0].id).toBe('test-agent');
    });
  });

  describe('registerAgent', () => {
    it('should register a new agent', () => {
      const agent = cooperation.registerAgent({
        id: 'agent-2',
        name: 'Test Agent 2',
        role: 'detector',
        state: 'idle',
        capabilities: [],
        workload: 0,
        portalId: 'portal-1',
        appId: 'app-1',
        version: '1.0.0',
        lastHeartbeat: new Date(),
        config: {
          maxConcurrentTasks: 5,
          messageTimeout: 30000,
          heartbeatInterval: 10000,
          autoCollaborate: true,
          shareKnowledge: true,
        },
      });

      expect(agent.name).toBe('Test Agent 2');
      expect(cooperation.getAgents().length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return cooperation statistics', () => {
      const stats = cooperation.getStats();
      
      expect(stats.totalAgents).toBe(1);
      expect(stats).toHaveProperty('onlineAgents');
      expect(stats).toHaveProperty('knowledgeItems');
    });
  });
});

describe('EconomicCostModel', () => {
  let model: EconomicCostModel;

  beforeEach(() => {
    model = new EconomicCostModel();
  });

  describe('estimateCost', () => {
    it('should estimate cost for an action', () => {
      const estimate = model.estimateCost('leak_detection', 'entity-1');
      
      expect(estimate.actionType).toBe('leak_detection');
      expect(estimate.totalCost).toBeGreaterThan(0);
      expect(estimate.roi).toBeDefined();
    });

    it('should calculate higher costs for complex actions', () => {
      const simple = model.estimateCost('leak_detection', 'entity-1', { complexity: 1 });
      const complex = model.estimateCost('leak_detection', 'entity-2', { complexity: 3 });
      
      expect(complex.totalCost).toBeGreaterThan(simple.totalCost);
    });
  });

  describe('getLoadBalanceState', () => {
    it('should return load balance state', () => {
      const state = model.getLoadBalanceState();
      
      expect(state.workers.length).toBeGreaterThan(0);
      expect(state.utilizationPercent).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return economic statistics', () => {
      const stats = model.getStats();
      
      expect(stats).toHaveProperty('totalCostEstimates');
      expect(stats).toHaveProperty('avgWorkerUtilization');
    });
  });
});

describe('GovernanceConstitution', () => {
  let governance: GovernanceConstitution;

  beforeEach(() => {
    governance = new GovernanceConstitution();
  });

  describe('initialization', () => {
    it('should initialize with default policies', () => {
      const policies = governance.getPolicies();
      expect(policies.length).toBeGreaterThan(0);
    });

    it('should initialize with default guardrails', () => {
      const guardrails = governance.getGuardrails();
      expect(guardrails.length).toBeGreaterThan(0);
    });
  });

  describe('evaluateAction', () => {
    it('should evaluate an action against policies', () => {
      const result = governance.evaluateAction('test_action', { amount: 100 }, 'user-1');
      
      expect(result.allowed).toBe(true);
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('warnings');
    });

    it('should flag high-value operations', () => {
      const result = governance.evaluateAction('test_action', { amount: 100000 }, 'user-1');
      
      expect(result.requiresApproval || result.warnings.length > 0).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return governance statistics', () => {
      const stats = governance.getStats();
      
      expect(stats.totalPolicies).toBeGreaterThan(0);
      expect(stats.totalGuardrails).toBeGreaterThan(0);
    });
  });
});

describe('DriftDetectionEngine', () => {
  let detector: DriftDetectionEngine;

  beforeEach(() => {
    detector = new DriftDetectionEngine();
  });

  describe('initialization', () => {
    it('should initialize with default monitors', () => {
      const monitors = detector.getMonitors();
      expect(monitors.length).toBeGreaterThan(0);
    });

    it('should initialize with default patterns', () => {
      const patterns = detector.getPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('checkDrift', () => {
    it('should check for drift events', async () => {
      const events = await detector.checkDrift();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('should generate a drift report', () => {
      const report = detector.generateReport(7);
      
      expect(report.period.start).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.healthScore).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return drift statistics', () => {
      const stats = detector.getStats();
      
      expect(stats.totalMonitors).toBeGreaterThan(0);
      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('healthScore');
    });
  });
});

describe('ModelQualityIntrospection', () => {
  let introspection: ModelQualityIntrospection;

  beforeEach(() => {
    introspection = new ModelQualityIntrospection();
  });

  describe('initialization', () => {
    it('should initialize with default models', () => {
      const models = introspection.getModels();
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('predict', () => {
    it('should make predictions with a model', () => {
      const models = introspection.getModels();
      const prediction = introspection.predict(models[0].id, { test: 'input' });
      
      expect(prediction.output).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
    });
  });

  describe('runQualityCheck', () => {
    it('should run quality checks on a model', () => {
      const models = introspection.getModels();
      const check = introspection.runQualityCheck(models[0].id, 'accuracy');
      
      expect(check.score).toBeDefined();
      expect(check.status).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return quality statistics', () => {
      const stats = introspection.getStats();
      
      expect(stats.totalModels).toBeGreaterThan(0);
      expect(stats).toHaveProperty('avgAccuracy');
    });
  });
});

describe('PortalBaselinesEngine', () => {
  let engine: PortalBaselinesEngine;

  beforeEach(() => {
    engine = new PortalBaselinesEngine();
  });

  describe('initialization', () => {
    it('should initialize with default benchmarks', () => {
      const benchmarks = engine.getBenchmarks();
      expect(benchmarks.length).toBeGreaterThan(0);
    });
  });

  describe('registerPortal', () => {
    it('should register a portal profile', () => {
      const profile = engine.registerPortal({
        portalId: 'portal-123',
        name: 'Test Portal',
        industry: 'technology',
        companySize: 'mid_market',
        mrr: 50000,
        employeeCount: 100,
        customerCount: 500,
        dealCount: 1000,
      });

      expect(profile.portalId).toBe('portal-123');
      expect(profile.industry).toBe('technology');
    });
  });

  describe('comparePortal', () => {
    it('should compare a portal against benchmarks', () => {
      engine.registerPortal({
        portalId: 'portal-456',
        name: 'Test Portal',
        industry: 'technology',
        companySize: 'mid_market',
        mrr: 50000,
        employeeCount: 100,
        customerCount: 500,
        dealCount: 1000,
      });

      const comparison = engine.comparePortal('portal-456');
      
      expect(comparison.metrics.length).toBeGreaterThan(0);
      expect(comparison.overallScore).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return portal statistics', () => {
      const stats = engine.getStats();
      
      expect(stats.totalBenchmarks).toBeGreaterThan(0);
      expect(stats).toHaveProperty('totalPortals');
    });
  });
});

describe('AutonomyScoresEngine', () => {
  let engine: AutonomyScoresEngine;

  beforeEach(() => {
    engine = new AutonomyScoresEngine();
  });

  describe('calculateScore', () => {
    it('should calculate autonomy score for a portal', () => {
      const score = engine.calculateScore('portal-test', {
        detection: { automationLevel: 80, accuracy: 90, reliability: 85, efficiency: 75 },
        analysis: { automationLevel: 70, accuracy: 85, reliability: 80, efficiency: 70 },
        decision: { automationLevel: 60, accuracy: 80, reliability: 75, efficiency: 65 },
        execution: { automationLevel: 50, accuracy: 75, reliability: 70, efficiency: 60 },
        learning: { automationLevel: 40, accuracy: 70, reliability: 65, efficiency: 55 },
        adaptation: { automationLevel: 30, accuracy: 65, reliability: 60, efficiency: 50 },
        recovery: { automationLevel: 55, accuracy: 72, reliability: 68, efficiency: 62 },
        monitoring: { automationLevel: 75, accuracy: 88, reliability: 82, efficiency: 72 },
      });

      expect(score.overallScore).toBeGreaterThan(0);
      expect(score.dimensions.length).toBe(8);
      expect(score.maturityLevel).toBeDefined();
    });
  });

  describe('setGoal', () => {
    it('should set an autonomy goal', () => {
      engine.calculateScore('portal-goal', {
        detection: { automationLevel: 50 },
        analysis: { automationLevel: 50 },
        decision: { automationLevel: 50 },
        execution: { automationLevel: 50 },
        learning: { automationLevel: 50 },
        adaptation: { automationLevel: 50 },
        recovery: { automationLevel: 50 },
        monitoring: { automationLevel: 50 },
      });

      const goal = engine.setGoal('portal-goal', 'detection', 80, new Date(Date.now() + 90 * 86400000));
      
      expect(goal.targetScore).toBe(80);
      expect(goal.milestones.length).toBe(4);
    });
  });

  describe('getStats', () => {
    it('should return autonomy statistics', () => {
      const stats = engine.getStats();
      
      expect(stats).toHaveProperty('totalScores');
      expect(stats).toHaveProperty('totalGoals');
    });
  });
});

describe('OneClickHardening', () => {
  let hardening: OneClickHardening;

  beforeEach(() => {
    hardening = new OneClickHardening();
  });

  describe('initialization', () => {
    it('should initialize with default configurations', () => {
      const configs = hardening.getConfigurations();
      expect(configs.length).toBe(4); // basic, standard, enterprise, maximum
    });
  });

  describe('getStatus', () => {
    it('should return hardening status', () => {
      const status = hardening.getStatus();
      
      expect(status.profile).toBeDefined();
      expect(status.complianceScore).toBeDefined();
      expect(status.securityScore).toBeDefined();
    });
  });

  describe('applyProfile', () => {
    it('should apply a hardening profile', async () => {
      const result = await hardening.applyProfile('standard');
      
      expect(result.configuration).toBeDefined();
      expect(result.results).toBeDefined();
    });
  });

  describe('runAudit', () => {
    it('should run a security audit', () => {
      const audit = hardening.runAudit();
      
      expect(audit.overallScore).toBeDefined();
      expect(audit.findings).toBeDefined();
      expect(audit.recommendations).toBeDefined();
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate a compliance report', () => {
      const report = hardening.generateComplianceReport('soc2');
      
      expect(report.framework).toBe('soc2');
      expect(report.score).toBeDefined();
      expect(report.controls.length).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return hardening statistics', () => {
      const stats = hardening.getStats();
      
      expect(stats.profilesAvailable).toBe(4);
      expect(stats).toHaveProperty('totalSettings');
      expect(stats).toHaveProperty('overallSecurityScore');
    });
  });
});
