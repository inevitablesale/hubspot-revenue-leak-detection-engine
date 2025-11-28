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
