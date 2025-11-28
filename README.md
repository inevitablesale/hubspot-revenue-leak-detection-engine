# HubSpot Revenue Leak Detection Engine

A self-operating RevOps platform that identifies and recovers hidden revenue leaks across the full customer lifecycle. Combines HubSpot integration with an autonomous Agent OS to detect, prevent, and resolve revenue leaks including underbilling, missed renewals, dropped handoffs, and orphaned accounts.

## Key Capabilities

| Category | Capabilities |
|----------|-------------|
| **Detection** | Underbilling, missed renewals, cross-sell gaps, CS handoff issues, lifecycle anomalies, billing gaps |
| **Intelligence** | Pattern recognition, anomaly detection, predictive analytics, root cause analysis |
| **Automation** | Recovery workflows, self-healing, capacity-aware orchestration, rule evolution |
| **Governance** | Financial controls, audit trails, compliance checks, approval workflows |
| **Integration** | HubSpot CRM, Outlook, QuickBooks, Stripe, Shopify, Gmail, Salesforce |
| **Compliance** | HIPAA mode, GDPR mode, audit logging, data encryption |

## Quick Start

### Option 1: Interactive Setup Wizard

```bash
npm install
npx leak-engine init
```

The setup wizard will guide you through:
1. Selecting an industry template (SaaS, Agency, Healthcare, Consulting, Retail)
2. Configuring compliance mode (HIPAA/GDPR if needed)
3. Setting up HubSpot credentials
4. Enabling integrations

### Option 2: Using a Template

```bash
npm install
npx leak-engine init --template saas
# or
npx leak-engine init --template healthcare --compliance hipaa
```

### Option 3: Manual Configuration

```bash
npm install
cp examples/config.example.yaml leak-engine.config.yaml
# Edit the configuration file
npm run dev
```

## CLI Commands

```bash
# Initialize configuration
leak-engine init                        # Interactive setup
leak-engine init --template saas        # Use SaaS template
leak-engine init --compliance hipaa     # Enable HIPAA compliance

# Run leak detection
leak-engine scan                        # Full scan
leak-engine scan --enable-email-leak    # Enable specific modules
leak-engine scan --dedupe               # Run deduplication first
leak-engine scan --verbose              # Detailed output

# View/manage configuration
leak-engine config show                 # Show current config
leak-engine config get hubspot.pipeline # Get specific value
leak-engine config set modules.underbilling.enabled true
leak-engine config validate             # Validate configuration

# View dashboards
leak-engine dashboard                   # Summary dashboard
leak-engine dashboard leaks             # Leakage report
leak-engine dashboard forecast          # Deal forecast
leak-engine dashboard roi               # ROI analysis
leak-engine dashboard compliance        # Compliance status
```

## CLI Flags Reference

### Module Flags
```bash
--enable-email-leak       # Enable email inactivity detection
--enable-duplicate-deals  # Enable duplicate deal detection
--enable-forecast         # Enable forecast agent
```

### Integration Flags
```bash
--outlook                 # Enable Outlook integration
--quickbooks              # Enable QuickBooks integration
--stripe                  # Enable Stripe integration
--shopify                 # Enable Shopify integration
--gmail                   # Enable Gmail integration
```

### Feature Flags
```bash
--skip-cleanup            # Skip data cleanup phase
--dedupe                  # Run deduplication before analysis
--compliance hipaa        # Enable HIPAA compliance mode
--compliance gdpr         # Enable GDPR compliance mode
```

### Configuration
```bash
-c, --config <path>       # Path to configuration file
--verbose                 # Enable verbose output
-q, --quiet               # Suppress non-essential output
```

## Configuration File

The engine uses a YAML configuration file (`leak-engine.config.yaml`). See `examples/config.example.yaml` for a complete reference.

### Key Configuration Sections

```yaml
# HubSpot credentials
hubspot:
  clientId: your_client_id
  clientSecret: your_client_secret
  pipeline: "Sales Pipeline"

# Detection modules (enable/disable individually)
modules:
  emailInactivity:
    enabled: true
    inactivityDays: 30
  missedRenewals:
    enabled: true
    alertDaysBefore: 60

# Third-party integrations
integrations:
  stripe:
    enabled: true
    syncSubscriptions: true
  quickbooks:
    enabled: true
    syncInvoices: true

# Compliance settings
compliance:
  mode: hipaa  # or 'gdpr' or 'none'
  encryptSensitiveFields: true
  auditLogging: true
```

## Industry Templates

Pre-configured templates for common business types:

| Template | Description | Key Features |
|----------|-------------|--------------|
| **saas** | Subscription businesses | MRR tracking, churn detection, Stripe integration |
| **agency** | Service agencies | Project billing, QuickBooks integration, utilization |
| **healthcare** | Healthcare providers | HIPAA compliance, patient data protection |
| **consulting** | Consulting firms | Proposal stages, fixed-fee tracking |
| **retail** | E-commerce | Shopify integration, abandoned cart recovery |

```bash
# Use a template
leak-engine init --template saas
leak-engine init --template healthcare
```

## Integrations

### Outlook
Sync contacts and log emails from Microsoft Outlook/Exchange.

```yaml
integrations:
  outlook:
    enabled: true
    syncContacts: true
    logEmails: true
    hybridMode: false  # Set to true for on-premise Exchange
```

### QuickBooks
Import invoices, payments, and customer data.

```yaml
integrations:
  quickbooks:
    enabled: true
    syncInvoices: true
    syncPayments: true
    environment: production  # or 'sandbox'
```

### Stripe
Track subscriptions, payments, and calculate MRR.

```yaml
integrations:
  stripe:
    enabled: true
    syncSubscriptions: true
    syncPayments: true
    attributeToDeals: true
```

### Shopify
Import customers, orders, and abandoned carts.

```yaml
integrations:
  shopify:
    enabled: true
    syncOrders: true
    syncAbandonedCarts: true
    addTrackingCode: true  # Auto-add HubSpot tracking to store
```

### Gmail
Log emails and sync contacts from Google Workspace.

```yaml
integrations:
  gmail:
    enabled: true
    logEmails: true
    syncContacts: true
```

### Salesforce
Bi-directional sync with Salesforce CRM.

```yaml
integrations:
  salesforce:
    enabled: true
    syncContacts: true
    syncDeals: true
```

## Data Quality

### De-duplication
The engine can automatically detect and merge duplicate records.

```yaml
dataQuality:
  autoMergeDuplicates: true
  mergeByEmail: true      # Merge contacts by email
  mergeByDomain: true     # Merge companies by domain
```

### Field Mapping
Map fields from external systems to HubSpot properties.

```yaml
dataQuality:
  fieldMappings:
    - source: stripe
      sourceField: subscription_status
      targetField: subscription_status
    - source: shopify
      sourceField: total_spent
      targetField: lifetime_value
      transformations:
        - currency
```

## Compliance Modes

### HIPAA Mode
For healthcare organizations handling protected health information.

```bash
leak-engine init --compliance hipaa
```

Features:
- Automatic encryption of sensitive fields (SSN, DOB, MRN)
- 6-year data retention (per HIPAA requirements)
- Comprehensive audit logging
- Consent tracking

### GDPR Mode
For organizations processing EU citizen data.

```bash
leak-engine init --compliance gdpr
```

Features:
- Cookie banner support
- Right to erasure compliance
- Data portability
- Consent management
- Automatic PII field encryption

## Dashboards

### Revenue Leakage Dashboard
```bash
leak-engine dashboard leaks
```
Shows:
- Total leaks detected
- Potential revenue at risk
- Breakdown by leak type
- Top priority leaks

### Forecast Dashboard
```bash
leak-engine dashboard forecast
```
Shows:
- Pipeline by stage
- Weighted forecast
- Gap to goal analysis
- Forecast with leak recovery overlay

### ROI Dashboard
```bash
leak-engine dashboard roi
```
Shows:
- Revenue protected/recovered
- Monthly performance
- Time savings
- Overall ROI calculation

## Environment Configuration

```env
# Required
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
HUBSPOT_REDIRECT_URI=http://localhost:3000/oauth/callback

# Optional
PORT=3000
NODE_ENV=development
```

## Programmatic Usage

```typescript
import { RevOpsAgentOS } from './agent-os';
import { RevenueLeakDetectionEngine } from './engine';

// Initialize the detection engine
const engine = new RevenueLeakDetectionEngine({
  underbilling: { minimumDealValue: 1000 },
  missedRenewals: { renewalWindowDays: 60 },
});

// Run detection
const results = await engine.detectLeaks({
  deals: myDeals,
  contracts: myContracts,
});

// Initialize the Agent OS for advanced features
const agentOS = new RevOpsAgentOS({
  intelligence: { enabled: true },
  orchestration: { enabled: true },
  selfHealing: { enabled: true },
});

// Process results and generate recovery plan
const output = await agentOS.processDetectionResults(results);
await agentOS.executeRecovery(output.recoveryPlan.id);
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
│            Integrations (Outlook, QuickBooks, Stripe, etc.)      │
├─────────────────────────────────────────────────────────────────┤
│     HubSpot Integration (OAuth, CRM Cards, Timeline, APIs)       │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── cli/                # CLI commands and utilities
│   ├── commands/       # init, scan, config, dashboard
│   ├── config/         # Configuration types and loader
│   └── utils/          # CLI helpers
├── integrations/       # Third-party connectors
│   ├── outlook.ts      # Outlook/Exchange integration
│   ├── quickbooks.ts   # QuickBooks integration
│   ├── stripe.ts       # Stripe integration
│   ├── shopify.ts      # Shopify integration
│   ├── gmail.ts        # Gmail integration
│   ├── salesforce.ts   # Salesforce integration
│   ├── data-quality.ts # De-duplication & validation
│   └── templates.ts    # Industry templates
├── agent-os/           # Autonomous Agent Operating System
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

examples/
├── config.example.yaml # Full configuration example
└── templates/          # Industry-specific templates
    ├── saas.yaml
    └── healthcare.yaml
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
npm run cli          # Run CLI in development
npm test             # Run tests
npm run test:coverage # Coverage report
```

## License

ISC

