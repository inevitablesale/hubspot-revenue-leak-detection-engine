# HubSpot Revenue Leak Detection Engine

Installable HubSpot app + Breeze Agent that identifies hidden revenue leaks across the full lifecycle. Analyzes Deals, Jobs, Placements, Contracts, UTM sources, renewals, and invoices to detect underbilling, missed cross-sells, dropped handoffs, orphaned accounts, invalid stage transitions, delayed billing, and untriggered renewal opportunities.

## Features

### Revenue Leak Detection Types

1. **Underbilling Detection** - Identifies deals and contracts billing below expected values
2. **Missed Renewals** - Finds contracts approaching renewal without engagement
3. **Cross-Sell Opportunities** - Discovers untriggered cross-sell and expansion opportunities
4. **CS Handoff Issues** - Detects stalled customer success handoffs from sales
5. **Lifecycle Validation** - Validates lifecycle stage transitions and flags anomalies
6. **Billing Gaps** - Identifies gaps between service delivery and billing/collections

### Core Components

- **OAuth Integration** - Secure HubSpot OAuth2 flow with token management
- **Detection Engine** - Modular architecture with configurable detection rules
- **CRM Cards** - Display revenue leak information directly in HubSpot records
- **Timeline Events** - Log detection and recovery activities to contact/deal timelines
- **Property Updates** - Automatic property updates for leak tracking and resolution
- **Recovery Actions** - Suggested actions with execution capabilities

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
HUBSPOT_REDIRECT_URI=http://localhost:3000/oauth/callback
PORT=3000
NODE_ENV=development
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## API Endpoints

### OAuth

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/oauth/authorize` | GET | Initiate OAuth flow |
| `/oauth/callback` | GET | OAuth callback handler |
| `/oauth/refresh` | POST | Refresh access token |
| `/oauth/token-info` | GET | Get token information |

### Detection

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/detect/full` | POST | Run full detection across all entities |
| `/api/v1/detect/deal/:dealId` | POST | Run detection for specific deal |
| `/api/v1/detect/contact/:contactId` | POST | Run detection for specific contact |
| `/api/v1/detect/types` | GET | Get available detection types |

### CRM Cards

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/cards/deal` | POST | CRM card for deals |
| `/api/v1/cards/contact` | POST | CRM card for contacts |
| `/api/v1/cards/company` | POST | CRM card for companies |

### Actions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/actions/:actionId/execute` | POST | Execute recovery action |
| `/api/v1/actions/register` | POST | Register leak and actions |
| `/api/v1/actions/:actionId` | GET | Get action details |
| `/api/v1/actions/resolve-leak/:leakId` | POST | Mark leak as resolved |

## Project Structure

```
├── src/
│   ├── agent-os/       # RevOps Agent OS modules
│   │   ├── types.ts            # Agent OS type definitions
│   │   ├── intelligence.ts     # AI-powered analysis and learning
│   │   ├── orchestration.ts    # Capacity-aware workflow coordination
│   │   ├── simulation.ts       # What-if scenario modeling
│   │   ├── self-healing.ts     # Auto-recovery mechanisms
│   │   ├── multi-system-validation.ts  # Cross-system data validation
│   │   ├── financial-governance.ts     # Financial controls and audit
│   │   ├── ecosystem-cross-signals.ts  # Multi-system signal correlation
│   │   ├── meta-intelligence.ts        # Higher-order system insights
│   │   ├── rule-evolution.ts           # Adaptive rule management
│   │   └── index.ts            # Main Agent OS orchestrator
│   ├── auth/           # OAuth implementation
│   ├── breeze/         # Breeze Agent memory and fix actions
│   │   ├── agent-memory.ts
│   │   ├── fix-actions.ts
│   │   └── index.ts
│   ├── engine/         # Detection engine modules
│   │   ├── underbilling.ts
│   │   ├── missed-renewals.ts
│   │   ├── crosssell.ts
│   │   ├── cs-handoff.ts
│   │   ├── lifecycle-validator.ts
│   │   ├── billing-gap.ts
│   │   └── index.ts    # Main engine orchestrator
│   ├── graph/          # Leak Graph Engine
│   │   ├── leak-graph.ts
│   │   └── index.ts
│   ├── scoring/        # Scoring system
│   │   ├── leak-scorer.ts
│   │   └── index.ts
│   ├── prevention/     # Leak prevention rules
│   │   ├── prevention-rules.ts
│   │   └── index.ts
│   ├── reports/        # Revenue leakage reports
│   │   ├── leakage-report.ts
│   │   └── index.ts
│   ├── workflows/      # Breeze workflows & trend tracking
│   │   ├── breeze-workflows.ts
│   │   ├── trend-tracker.ts
│   │   ├── bookmarks.ts
│   │   └── index.ts
│   ├── crm/            # CRM card and property modules
│   │   ├── card-builder.ts
│   │   ├── interactive-card.ts
│   │   ├── property-updates.ts
│   │   └── index.ts
│   ├── timeline/       # Timeline events
│   ├── routes/         # API routes
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── index.ts        # Application entry point
├── tests/              # Test files
│   ├── agent-os/       # Agent OS tests
│   ├── engine/         # Detection engine tests
│   ├── breeze/         # Breeze Agent tests
│   └── ...
├── dist/               # Compiled output
└── package.json
```

## HubSpot App Setup

1. Create a new app in your HubSpot developer account
2. Configure OAuth redirect URI to match your `HUBSPOT_REDIRECT_URI`
3. Request the following scopes:
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.companies.read`
   - `crm.objects.companies.write`
   - `crm.schemas.deals.read`
   - `crm.schemas.contacts.read`
   - `crm.schemas.companies.read`
   - `timeline`

4. Add CRM card configuration pointing to your hosted endpoints
5. Create timeline event templates using the provided template definitions

## Usage Example

```typescript
import RevenuLeakDetectionEngine from 'hubspot-revenue-leak-detection-engine';

const engine = new RevenuLeakDetectionEngine({
  underbilling: {
    minimumDealValue: 1000,
    discountThreshold: 0.15,
  },
  missedRenewals: {
    renewalWindowDays: 90,
    inactivityThresholdDays: 30,
  },
});

const result = await engine.detectLeaks({
  deals,
  contacts,
  contracts,
  invoices,
  averageDealValues,
  lastActivityDates,
});

console.log(`Found ${result.summary.totalLeaks} revenue leaks`);
console.log(`Total potential revenue at risk: $${result.summary.totalPotentialRevenue}`);
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Advanced Features

### 1. Leak Graph Engine

Tracks relationships between revenue leaks and entities for root cause analysis and cascade detection.

```typescript
import { LeakGraphEngine } from './graph';

const graph = new LeakGraphEngine();
graph.buildFromLeaks(leaks);

const analysis = graph.analyze();
console.log('Root causes:', analysis.rootCauses);
console.log('Cascade risks:', analysis.cascadeRisks);
```

### 2. Breeze Agent Memory & Context

Stores conversation history and leak context for AI-powered interactions with the Breeze Agent.

```typescript
import { BreezeAgentMemory } from './breeze';

const memory = new BreezeAgentMemory();
const session = memory.createSession('portal-1', 'user-1');
memory.addLeakContext(session.id, leak);

const strategy = memory.getRecommendedStrategy('underbilling');
const summary = memory.generateContextSummary(session.id);
```

### 3. Enhanced Scoring (Severity, Impact, Recoverability)

Comprehensive scoring system for prioritizing leak resolution.

```typescript
import { LeakScorer } from './scoring';

const scorer = new LeakScorer();
const scores = scorer.batchScore(leaks);
const ranked = scorer.rankLeaks(scores);

const metrics = scorer.calculateAggregateMetrics(scores);
console.log('Average priority:', metrics.averageComposite);
```

### 4. Breeze-Native Fix Actions

AI-powered recovery actions that integrate with HubSpot Breeze.

```typescript
import { BreezeFixActions } from './breeze';

const actions = new BreezeFixActions();
const recommendation = await actions.getAIRecommendation(context);
const result = await actions.executeAction('fix-underbilling', context);
```

### 5. Interactive CRM Card UI

Enhanced CRM cards with real-time updates, score gauges, and interactive elements.

```typescript
import { InteractiveCRMCardBuilder } from './crm';

const cardBuilder = new InteractiveCRMCardBuilder({
  enableRealTimeUpdates: true,
  showScores: true,
  showTrends: true,
});

const card = cardBuilder.buildInteractiveCard(leaks, entityId, entityType, {
  scores: scoresMap,
  bookmarks: bookmarksMap,
  trendData: { direction: 'down', change: -15 },
});
```

### 6. Trend Tracking (Weekly Job)

Track leak trends over time for predictive analysis.

```typescript
import { TrendTracker } from './workflows';

const tracker = new TrendTracker();
const analysis = tracker.analyzeTrends('portal-1', leaks);

console.log('Overall trend:', analysis.overallTrend);
console.log('Predictions:', analysis.predictions);
console.log('Alerts:', analysis.alerts);
```

### 7. Leak Bookmarking

Allow users to bookmark and organize leaks for follow-up.

```typescript
import { LeakBookmarkManager } from './workflows';

const bookmarks = new LeakBookmarkManager();
const bookmark = bookmarks.createBookmark(leak, userId, portalId, {
  tags: ['urgent', 'enterprise'],
  priority: 'high',
});

bookmarks.setReminder(bookmark.id, new Date('2024-12-01'));
const due = bookmarks.getDueReminders(userId);
```

### 8. Leak Prevention Rules

Proactive rules to prevent revenue leaks before they occur.

```typescript
import { LeakPreventionEngine } from './prevention';

const prevention = new LeakPreventionEngine();
const alerts = prevention.evaluateDeals(deals);

const summary = prevention.getSummary();
console.log('Active rules:', summary.activeRules);
console.log('Prevented leaks:', summary.preventedLeaks);
```

### 9. Portal-Level Revenue Leakage Report

Comprehensive reporting and dashboards for revenue leak analysis.

```typescript
import { RevenueLeakageReporter } from './reports';

const reporter = new RevenueLeakageReporter();
const report = reporter.generateReport(leaks, scores, {
  portalId: 'portal-1',
  period: { startDate, endDate, label: 'Q4 2024' },
  includeResolved: true,
});

console.log('Health Score:', report.healthScore);
console.log('Recommendations:', report.recommendations);
const html = reporter.exportReport(report, 'html');
```

### 10. "Recover All Leaks" Breeze Workflow

Batch process all detected leaks with appropriate recovery actions.

```typescript
import { BreezeWorkflowEngine } from './workflows';

const workflows = new BreezeWorkflowEngine();
const result = await workflows.executeRecoverAllLeaks(leaks, scores);

console.log('Processed:', result.processed);
console.log('Recovered revenue:', result.recoveredRevenue);
console.log('Success rate:', (result.succeeded / result.totalLeaks) * 100);
```

## License

ISC

---

# RevOps Agent OS

The RevOps Agent OS transforms the HubSpot Revenue Leak Detection Engine into an intelligent operating system for revenue operations. It provides advanced capabilities for intelligence, automation, orchestration, simulation, learning, explainability, self-healing, multi-system validation, financial governance, capacity-aware workflows, rule evolution, and ecosystem cross-signals.

## Agent OS Modules

### 1. Intelligence Engine

AI-powered analysis, learning, and pattern recognition for revenue leak detection.

```typescript
import { IntelligenceEngine } from './agent-os';

const intelligence = new IntelligenceEngine({
  learningRate: 0.1,
  minConfidenceThreshold: 0.6,
  patternDetectionEnabled: true,
  anomalyDetectionEnabled: true,
});

// Analyze leaks and generate insights
const insights = intelligence.analyzeLeaks(leaks);
console.log('Pattern insights:', insights.filter(i => i.type === 'pattern'));
console.log('Anomaly insights:', insights.filter(i => i.type === 'anomaly'));
console.log('Predictions:', insights.filter(i => i.type === 'prediction'));

// Record feedback for learning
intelligence.recordFeedback(insightId, 'accurate', userId, 'Good insight');

// Match leaks against learned patterns
const matches = intelligence.matchPatterns(leak);
```

### 2. Orchestration Engine

Capacity-aware workflow coordination and execution.

```typescript
import { OrchestrationEngine } from './agent-os';

const orchestration = new OrchestrationEngine({
  maxConcurrentPlans: 5,
  defaultTimeout: 300000,
  capacityLimits: { api_calls: 100, concurrent_tasks: 10, memory: 512 },
});

// Create a recovery plan
const plan = orchestration.createRecoveryPlan(leaks, {
  prioritizeBy: 'revenue',
  maxParallel: 3,
  includeValidation: true,
});

// Execute the plan
const result = await orchestration.executePlan(plan.id);
console.log('Steps completed:', result.stepsCompleted);
console.log('Status:', result.status);

// Check capacity
const capacity = orchestration.getCapacityStatus();
console.log('API calls remaining:', capacity.apiCalls.limit - capacity.apiCalls.used);
```

### 3. Simulation Engine

What-if scenario modeling and predictive analysis.

```typescript
import { SimulationEngine } from './agent-os';

const simulation = new SimulationEngine({
  defaultIterations: 1000,
  maxSimulationsPerDay: 50,
});

// Run a Monte Carlo simulation
const mcSimulation = simulation.createMonteCarloSimulation('Recovery Analysis', leaks, {
  iterations: 1000,
  confidenceLevel: 0.95,
});
const mcResult = await simulation.runSimulation(mcSimulation.id, leaks);
console.log('Expected recovery:', mcResult.outcomes[0].simulatedValue);
console.log('Confidence:', mcResult.confidence);

// Run a what-if simulation
const whatIfSimulation = simulation.createWhatIfSimulation('Rate Increase', leaks, {
  name: 'Rate Increase',
  description: 'What if we increase recovery rate by 10%?',
  parameters: [{ name: 'recovery_rate', change: 0.1 }],
});
const whatIfResult = await simulation.runSimulation(whatIfSimulation.id, leaks);

// Compare scenarios
const comparison = simulation.compareScenarios([mcSimulation.id, whatIfSimulation.id]);
console.log('Recommendation:', comparison.recommendation);
```

### 4. Self-Healing Engine

Auto-recovery mechanisms and adaptive behavior.

```typescript
import { SelfHealingEngine } from './agent-os';

const selfHealing = new SelfHealingEngine({
  autoHealEnabled: true,
  healthCheckIntervalMs: 60000,
  maxAutoHealAttempts: 3,
});

// Run health checks
const checks = await selfHealing.runHealthChecks();
console.log('Overall health:', selfHealing.getSystemHealth().overall);

// Get active issues
const issues = selfHealing.getActiveIssues();
for (const issue of issues) {
  if (issue.autoHealable) {
    const result = await selfHealing.heal(issue.id);
    console.log('Healing result:', result.status);
  }
}

// View healing statistics
const stats = selfHealing.getHealingStats();
console.log('Success rate:', stats.successRate);
```

### 5. Multi-System Validation

Cross-system data validation and reconciliation.

```typescript
import { MultiSystemValidator } from './agent-os';

const validator = new MultiSystemValidator({
  tolerancePercent: 1,
  strictMode: false,
});

// Register system connections
validator.registerConnection({
  id: 'hubspot',
  name: 'HubSpot CRM',
  type: 'crm',
  status: 'connected',
  lastSync: new Date(),
  config: {},
});

// Validate data across systems
const report = await validator.validateAcrossSystems([
  { systemId: 'hubspot', entityType: 'deal', data: hubspotDeals },
  { systemId: 'billing', entityType: 'invoice', data: billingInvoices },
]);

console.log('Discrepancies:', report.discrepancies.length);
console.log('Recommendations:', report.recommendations);
```

### 6. Financial Governance

Financial controls, audit trails, and reconciliation.

```typescript
import { FinancialGovernanceEngine } from './agent-os';

const governance = new FinancialGovernanceEngine({
  auditRetentionDays: 365,
  approvalThresholds: { low: 1000, medium: 10000, high: 50000, critical: 100000 },
  requireJustification: true,
});

// Evaluate controls
const controls = governance.evaluateControls(
  'execute_recovery',
  'deal',
  dealId,
  amount,
  userId
);

if (controls.requiresApproval) {
  const request = governance.createApprovalRequest(
    'action',
    'deal',
    dealId,
    'execute_recovery',
    userId,
    'Recovering revenue leak',
    amount
  );
}

// Run compliance checks
const compliance = governance.runComplianceChecks(leaks);
console.log('SOX compliance:', compliance.find(c => c.checkType === 'sox')?.passed);

// Get audit trail
const audit = governance.getAuditTrail({ entityType: 'deal', entityId: dealId });
```

### 7. Ecosystem Cross-Signals

Multi-system signal correlation and early warning detection.

```typescript
import { EcosystemCrossSignals } from './agent-os';

const crossSignals = new EcosystemCrossSignals({
  correlationThreshold: 0.6,
  signalWindowHours: 168,
  minSignalSources: 2,
});

// Ingest signals from different systems
crossSignals.ingestSignal('support', 'ticket_volume', 150, 100);
crossSignals.ingestSignal('product', 'daily_active_users', 800, 1000);
crossSignals.ingestSignal('billing', 'payment_failure_rate', 0.08, 0.03);

// Get active alerts
const alerts = crossSignals.getActiveAlerts();
for (const alert of alerts) {
  console.log('Alert:', alert.title);
  console.log('Actions:', alert.recommendedActions);
}

// Get early warnings
const warnings = crossSignals.getEarlyWarnings();

// Correlate signals
const correlation = crossSignals.correlateSignals(
  'support', 'ticket_volume',
  'billing', 'churn_rate'
);
```

### 8. Meta-Intelligence

Higher-order insights about system performance and capabilities.

```typescript
import { MetaIntelligenceEngine } from './agent-os';

const metaIntelligence = new MetaIntelligenceEngine({
  reportingIntervalHours: 24,
  benchmarkEnabled: true,
  improvementSuggestionsEnabled: true,
});

// Analyze system performance
const insights = metaIntelligence.analyzeSystem(leakResults, {
  attempted: 100,
  successful: 75,
  revenue: 500000,
});

// Get capability assessment
const capabilities = metaIntelligence.getCapabilities();
console.log('Weak areas:', capabilities.filter(c => c.score < 50));

// Identify improvement opportunities
const opportunities = metaIntelligence.identifyOpportunities();
console.log('Top priorities:', opportunities.slice(0, 3));

// Generate executive summary
const summary = metaIntelligence.generateExecutiveSummary();
console.log('Overall score:', summary.overallScore);
console.log('Maturity level:', summary.maturityLevel);
console.log('Performance trend:', summary.performanceTrend);
```

### 9. Rule Evolution

Adaptive rule management and automated rule optimization.

```typescript
import { RuleEvolutionEngine } from './agent-os';

const ruleEvolution = new RuleEvolutionEngine({
  autoEvolveEnabled: true,
  mutationRate: 0.1,
  testingPeriodDays: 14,
  minSampleSize: 50,
});

// Get active rules
const rules = ruleEvolution.getActiveRules();

// Generate mutations for a rule
const mutations = ruleEvolution.generateMutations(ruleId);

// Apply a mutation and test
const candidate = ruleEvolution.applyMutation(mutations[0].id);
const test = ruleEvolution.startTest(ruleId, candidate.id);

// Complete test and promote if successful
ruleEvolution.recordTestResults(test.id, { accuracy: 0.85, precision: 0.82 });
const completedTest = ruleEvolution.completeTest(test.id);
if (completedTest.winner === 'candidate') {
  const newRule = ruleEvolution.promoteCandidate(candidate.id);
  console.log('Promoted rule:', newRule.id);
}

// Auto-evolve rules
const evolution = ruleEvolution.autoEvolve();
console.log('Evolved rules:', evolution.evolvedRules);
```

## Complete RevOps Agent OS

The `RevOpsAgentOS` class brings all modules together into a unified operating system.

```typescript
import { RevOpsAgentOS } from './agent-os';

const agentOS = new RevOpsAgentOS({
  intelligence: { enabled: true, learningRate: 0.1 },
  orchestration: { enabled: true, maxConcurrentPlans: 5 },
  simulation: { enabled: true, defaultIterations: 1000 },
  selfHealing: { enabled: true, autoHealEnabled: true },
  validation: { enabled: true, tolerancePercent: 1 },
  governance: { enabled: true, auditRetentionDays: 365 },
  crossSignals: { enabled: true, correlationThreshold: 0.6 },
  metaIntelligence: { enabled: true, benchmarkEnabled: true },
  ruleEvolution: { enabled: true, autoEvolveEnabled: true },
});

// Process detection results
const output = await agentOS.processDetectionResults(leakResults);
console.log('Insights:', output.insights.length);
console.log('Recovery plan:', output.recoveryPlan.id);

// Execute recovery
const recovery = await agentOS.executeRecovery(output.recoveryPlan.id);
console.log('Recovery status:', recovery.result.status);

// Run health checks
const health = await agentOS.runHealthCheck();
console.log('System health:', health.checks);

// Generate dashboard
const dashboard = agentOS.generateDashboard();
console.log('Status:', dashboard.status);
console.log('Metrics:', dashboard.metrics);
console.log('Executive summary:', dashboard.executiveSummary);

// Get module statistics
const stats = agentOS.getModuleStats();
console.log('Module stats:', stats);
```

## Architecture

The RevOps Agent OS follows a modular architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                      RevOps Agent OS                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Intelligence │  │ Orchestration│  │  Simulation  │          │
│  │    Engine    │  │    Engine    │  │    Engine    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Self-Healing │  │Multi-System  │  │  Financial   │          │
│  │    Engine    │  │  Validator   │  │  Governance  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Ecosystem   │  │    Meta-     │  │    Rule      │          │
│  │Cross-Signals │  │ Intelligence │  │  Evolution   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                  Core Detection Engine                           │
├─────────────────────────────────────────────────────────────────┤
│                    HubSpot Integration                           │
└─────────────────────────────────────────────────────────────────┘
```

## Key Capabilities

| Capability | Module | Description |
|------------|--------|-------------|
| Intelligence | IntelligenceEngine | Pattern detection, anomaly detection, predictions |
| Automation | OrchestrationEngine | Automated workflow execution |
| Orchestration | OrchestrationEngine | Capacity-aware multi-step coordination |
| Simulation | SimulationEngine | What-if analysis, Monte Carlo, scenarios |
| Learning | IntelligenceEngine | Feedback-based improvement |
| Explainability | MetaIntelligenceEngine | Transparent AI reasoning |
| Self-Healing | SelfHealingEngine | Auto-recovery, health monitoring |
| Multi-System Validation | MultiSystemValidator | Cross-system data integrity |
| Financial Governance | FinancialGovernanceEngine | Audit trails, approvals, compliance |
| Capacity-Aware Workflows | OrchestrationEngine | Resource-aware execution |
| Rule Evolution | RuleEvolutionEngine | Adaptive rule optimization |
| Ecosystem Cross-Signals | EcosystemCrossSignals | Multi-system correlation |
| Meta-Intelligence | MetaIntelligenceEngine | System self-awareness |

