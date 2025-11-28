# HubSpot Revenue Leak Detection Engine

A self-operating RevOps platform that identifies and recovers hidden revenue leaks across the full customer lifecycle. Combines HubSpot integration with an autonomous Agent OS to detect, prevent, and resolve revenue leaks including underbilling, missed renewals, dropped handoffs, and orphaned accounts.

## Key Capabilities

| Category | Capabilities |
|----------|-------------|
| **Detection** | Underbilling, missed renewals, cross-sell gaps, CS handoff issues, lifecycle anomalies, billing gaps |
| **Intelligence** | Pattern recognition, anomaly detection, predictive analytics, root cause analysis |
| **Automation** | Recovery workflows, self-healing, capacity-aware orchestration, rule evolution |
| **Governance** | Financial controls, audit trails, compliance checks, approval workflows |
| **Integration** | HubSpot CRM cards, timeline events, property updates, multi-system validation |

## Quick Start

```bash
npm install
cp .env.example .env  # Configure your HubSpot credentials
npm run dev
```

### Environment Configuration

```env
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
HUBSPOT_REDIRECT_URI=http://localhost:3000/oauth/callback
PORT=3000
```

## Usage

```typescript
import { RevOpsAgentOS } from './agent-os';

const agentOS = new RevOpsAgentOS({
  intelligence: { enabled: true },
  orchestration: { enabled: true },
  selfHealing: { enabled: true },
});

// Detect and recover revenue leaks
const results = await agentOS.processDetectionResults(leakResults);
await agentOS.executeRecovery(results.recoveryPlan.id);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      RevOps Agent OS                             │
├──────────────────┬──────────────────┬───────────────────────────┤
│   Intelligence   │  Orchestration   │      Self-Healing         │
│   Simulation     │  Rule Evolution  │   Financial Governance    │
│  Cross-Signals   │ Meta-Intelligence│  Multi-System Validation  │
├──────────────────┴──────────────────┴───────────────────────────┤
│  Self-Extension │ Economy │ Streaming │ Memory │ Personas       │
│  Digital Twin   │ Human Modeling │ Global Brain │ Plugins       │
├─────────────────────────────────────────────────────────────────┤
│              Core Detection Engine (6 detectors)                 │
├─────────────────────────────────────────────────────────────────┤
│     HubSpot Integration (OAuth, CRM Cards, Timeline, APIs)       │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── agent-os/           # Autonomous Agent Operating System
│   ├── intelligence.ts       # AI analysis & pattern recognition
│   ├── orchestration.ts      # Workflow coordination
│   ├── simulation.ts         # What-if scenario modeling
│   ├── self-healing.ts       # Auto-recovery mechanisms
│   ├── self-extension/       # Self-authoring capabilities
│   ├── economy/              # Multi-agent resource allocation
│   ├── streaming/            # Real-time event processing
│   ├── memory/               # Multi-tier memory (STM/MTM/LTM)
│   ├── personas/             # Specialized agent personas
│   ├── digital-twin/         # Portal simulation & chaos testing
│   ├── human-modeling/       # Behavioral prediction
│   ├── global-brain/         # Cross-portal intelligence
│   ├── plugins/              # Extension SDK
│   └── autonomy/             # Full autonomous mode
├── engine/             # Detection modules
├── breeze/             # Breeze Agent integration
├── scoring/            # Leak prioritization
├── prevention/         # Proactive leak prevention
├── reports/            # Revenue analytics
├── workflows/          # Automated workflows
├── crm/                # CRM cards & properties
├── graph/              # Leak relationship graph
├── auth/               # OAuth implementation
└── routes/             # API endpoints
```

## API Reference

### Detection
- `POST /api/v1/detect/full` - Run full detection scan
- `POST /api/v1/detect/deal/:dealId` - Detect leaks for specific deal
- `GET /api/v1/detect/types` - List detection types

### Actions  
- `POST /api/v1/actions/:actionId/execute` - Execute recovery action
- `POST /api/v1/actions/resolve-leak/:leakId` - Mark leak resolved

### CRM Cards
- `POST /api/v1/cards/deal` - Deal CRM card data
- `POST /api/v1/cards/contact` - Contact CRM card data
- `POST /api/v1/cards/company` - Company CRM card data

## HubSpot Setup

1. Create app in HubSpot developer account
2. Configure OAuth redirect URI
3. Request scopes: `crm.objects.deals.read/write`, `crm.objects.contacts.read/write`, `crm.objects.companies.read/write`, `timeline`
4. Add CRM card configuration
5. Create timeline event templates

## Development

```bash
npm run dev          # Development mode
npm run build        # Production build
npm test             # Run tests
npm run test:coverage # Coverage report
```

## License

ISC

