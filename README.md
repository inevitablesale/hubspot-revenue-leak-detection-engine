# HubSpot Revenue Leak Detection Engine

A self-operating RevOps platform that identifies and recovers hidden revenue leaks across the full customer lifecycle. **Now available as a fully integrated HubSpot Native App** with embedded UI Extensions, CRM cards, workflow actions, App Objects, and **Breeze Agent support** - requiring zero CLI interaction.

## 🎯 Key Features

| Category | Capabilities |
|----------|-------------|
| **Detection** | Underbilling, missed renewals, cross-sell gaps, CS handoff issues, lifecycle anomalies, billing gaps |
| **Intelligence** | Pattern recognition, anomaly detection, predictive analytics, root cause analysis |
| **Automation** | Recovery workflows, self-healing, capacity-aware orchestration, rule evolution |
| **Governance** | Financial controls, audit trails, compliance checks, approval workflows |
| **Integration** | HubSpot CRM, Outlook, QuickBooks, Stripe, Shopify, Gmail, Salesforce |
| **Compliance** | HIPAA mode, GDPR mode, SOC2, audit logging, data encryption |
| **AI/Breeze** | Breeze Agent Tools for AI-powered leak detection and recovery |

## 🚀 HubSpot Native App Architecture

This app is built as a **fully native HubSpot app** using the 2025.2 platform version, leveraging:

- **App Objects** - Native CRM storage for leak data (no external database needed)
- **App Events** - Timeline events for audit trails
- **UI Extensions** - React-based CRM cards, dashboard, and settings
- **Workflow Actions** - Custom actions with Breeze Agent support
- **Serverless Functions** - Backend logic running on HubSpot's infrastructure

### Platform Requirements

- HubSpot CLI v7.6+ (for 2025.2 platform)
- Node.js 20+ (required by 2025.2 platform)
- HubSpot Professional or Enterprise subscription

### Project Structure (2025.2 Platform)

```
hsproject.json                    # Project configuration (platformVersion: "2025.2")
src/app/
├── app-hsmeta.json              # App configuration (scopes, extensions, webhooks)
└── app-objects/
    ├── revenue-leak-object-hsmeta.json
    ├── leak-detection-config-object-hsmeta.json
    ├── detection-rule-object-hsmeta.json
    ├── escalation-rule-object-hsmeta.json
    └── portal-benchmark-object-hsmeta.json
hubspot/
├── events/                      # App timeline events
├── workflow-actions/            # Custom workflow actions
└── serverless/                  # Serverless functions
ui-extensions/
├── cards/                       # CRM card extensions
├── modals/                      # Settings panels
└── pages/                       # App pages
```

> **Note:** App Objects are in controlled beta. You must request approval from HubSpot to use app-defined objects.

## 🤖 Breeze Agent Integration

The app includes **Breeze Agent Tools** that enable AI-powered automation:

| Agent Tool | Type | Description |
|------------|------|-------------|
| **Run Leak Detection** | TAKE_ACTION | Scan records for revenue leaks |
| **Execute Recovery** | TAKE_ACTION | Auto-fix, create tasks, notify teams |
| **Check Leak Status** | FETCH_DATA | Get leak status and severity info |
| **Log Leak Event** | TAKE_ACTION | Add timeline entries for auditing |
| **Get AI Recommendation** | FETCH_DATA | Get AI-powered resolution suggestions |

> **Note:** Agent tools require a publicly accessible endpoint. The workflow actions are configured with `supportedClients: ["WORKFLOWS", "AGENTS"]` to enable both manual and AI-driven automation.

## 🚀 Advanced Features

### 1. Configurable Detection Rule Engine (No-Code)

Create custom detection rules without code through the Rule Engine API:

```bash
# Create a custom rule
POST /api/v1/rules
{
  "name": "High-Value Deal Without Activity",
  "targetEntity": "deal",
  "conditions": [
    { "field": "amount", "operator": "greater_than", "value": 50000 },
    { "field": "notes_last_updated", "operator": "days_since", "value": 14 }
  ],
  "severity": "high",
  "autoCreateTask": true,
  "notifySlack": true
}
```

**Features:**
- Visual rule builder UI (in App Settings)
- System rules with customizable thresholds
- Rule testing against sample data
- Import/export rules as JSON
- 12+ condition operators (equals, greater_than, days_since, is_empty, etc.)

### 2. Cross-Portal Intelligence Layer

Compare your leak metrics against industry benchmarks:

```bash
# Compare your metrics to industry averages
POST /api/v1/benchmarks/compare
{
  "industry": "saas",
  "metrics": {
    "leakRate": 3.5,
    "recoveryRate": 65,
    "avgResolutionTime": 48
  }
}
```

**Features:**
- Benchmarks for SaaS, Agency, Healthcare, Consulting, Retail industries
- Percentile rankings against peers
- Trend analysis (improving/stable/declining)
- Anonymous opt-in data sharing
- AI-generated insights and recommendations

### 3. Natural Language UI for Executives

Ask questions about your leak data in plain English:

```bash
# Ask anything about your leaks
POST /api/v1/nl-query
{
  "query": "How much ARR is stuck in renewal leaks this month?"
}

# Response:
{
  "answer": "There is $125,000 in revenue at risk in renewal leaks. This comes from 8 active revenue leaks...",
  "confidence": 85,
  "dataPoints": [...],
  "suggestedFollowUps": ["What are the top 5 biggest leaks?", ...]
}
```

**Example Questions:**
- "How much revenue is at risk?"
- "What types of leaks do we have?"
- "Give me an executive summary"
- "What should I prioritize first?"
- "How does this compare to last month?"

### 4. Slack/Teams Integration

Send leak alerts to relevant teams with fix-action buttons:

```bash
# Configure Slack
POST /api/v1/notifications/slack/configure
{
  "webhookUrl": "https://hooks.slack.com/services/...",
  "defaultChannel": "#revenue-alerts",
  "botName": "Revenue Leak Bot"
}

# Create a notification channel
POST /api/v1/notifications/channels
{
  "name": "Critical Alerts",
  "type": "slack",
  "target": "#critical-revenue",
  "severities": ["critical", "high"]
}
```

**Features:**
- Rich message formatting with severity indicators
- Action buttons (Resolve, Create Task, View Details, Dismiss)
- Channel-based routing by leak type and severity
- Batch notifications for multiple leaks
- Support for both Slack and Microsoft Teams

### 5. Auto-Create Tasks & Escalation Chains

Automatically create tasks and escalate unresolved leaks:

```bash
# Create an escalation rule
POST /api/v1/escalations
{
  "name": "Escalate Critical to Manager After 3 Days",
  "minSeverity": "critical",
  "triggerCondition": "days_unresolved",
  "daysThreshold": 3,
  "escalationLevel": "level_2",
  "escalationAction": "multiple",
  "escalationActionsConfig": [
    { "type": "create_task", "config": { "assignTo": "manager", "priority": "high" } },
    { "type": "slack_notify", "config": { "channel": "#management-alerts" } }
  ]
}
```

**Features:**
- Multi-level escalation chains (Team Lead → Manager → Director → Executive)
- Multiple trigger conditions (days unresolved, revenue threshold, task overdue)
- Automatic task creation with configurable owners
- Email, Slack, and Teams notifications
- Pending escalation visibility for proactive management

## 📦 HubSpot App Objects

The app stores all data natively in HubSpot using custom App Objects:

### Revenue Leak Object
Stores detected leaks with:
- Leak type, severity, and urgency score
- Potential revenue at risk
- Recovery status tracking
- Associations to Deals, Contacts, Companies

### Leak Detection Config Object
Stores app configuration:
- Industry template settings
- Module enable/disable flags
- Compliance mode settings
- Integration connection status

### Detection Rule Object
Stores custom detection rules:
- Rule name, description, and type
- Target entity (deal, contact, company)
- Conditions (JSON array)
- Task and notification settings
- Trigger statistics

### Escalation Rule Object
Stores escalation chain rules:
- Trigger conditions and thresholds
- Escalation levels (1-4)
- Action configurations
- Chain linking to next escalation

### Portal Benchmark Object
Stores benchmark comparisons:
- Industry and company size
- Metric values and percentiles
- Trend data
- Recommendations

## 📅 App Events (Timeline)

Timeline events are logged for:
- **Leak Detected** - When a new leak is found
- **Leak Resolved** - When a leak is fixed
- **Scan Completed** - After detection scans

## 🚀 HubSpot App Installation

### Install as Private App

1. **Download or clone this repository**
2. **Deploy to your hosting provider** (Heroku, AWS, Vercel, etc.)
3. **Configure environment variables:**
   ```env
   HUBSPOT_CLIENT_ID=your_client_id
   HUBSPOT_CLIENT_SECRET=your_client_secret
   HUBSPOT_REDIRECT_URI=https://your-app.com/oauth/callback
   ```
4. **Install in HubSpot:**
   - Go to HubSpot > Settings > Integrations > Private Apps
   - Click "Create a private app"
   - Import the `src/app/app-hsmeta.json` configuration
   - Configure OAuth scopes and webhook endpoints
5. **Complete the In-App Setup Wizard** that appears after installation

### Deploy with HubSpot CLI

```bash
# Install HubSpot CLI
npm install -g @hubspot/cli@latest

# Authenticate
hs auth

# Upload the app
hs project upload

# Deploy
hs project deploy
```

### In-App Onboarding Wizard

After installing the app, you'll be guided through:

1. ✅ **OAuth Status** - Verify your HubSpot connection
2. 📊 **Industry Template** - Choose from SaaS, Agency, Healthcare, Consulting, or Retail presets
3. 🔌 **Integrations** - Enable Stripe, QuickBooks, Outlook, Gmail, Shopify, Salesforce
4. 🔒 **Compliance** - Select HIPAA, GDPR, or SOC2 compliance mode
5. ⚙️ **Automation** - Configure scan frequency and notification preferences
6. ✨ **Review & Activate** - Summary and activation

## 📱 UI Extensions

### CRM Cards

The app installs leak detection cards on:
- **Deals** - View underbilling, missed renewals, billing gaps
- **Contacts** - View lifecycle issues, CS handoff problems
- **Companies** - View aggregate leak metrics across all deals
- **Tickets** - View related revenue issues

Each card displays:
- 🔍 Real-time leak flags with severity indicators
- 💰 Potential revenue at risk
- 🎯 Urgency scores and countdown timers
- 🔧 One-click fix actions
- 📝 Recommended next steps

### App Home Page (Dashboard)

Access the full-width dashboard from HubSpot's app menu:
- 📈 Leak trends over time (stacked chart by type)
- 📊 Recovery rates by team or pipeline
- 🏆 Top unresolved leak types and impacted ARR
- 🎯 Portal autonomy score and governance coverage
- 📥 Export to HTML or CSV

### App Settings Page

Configure the app directly in HubSpot:
- Enable/disable detection modules
- Adjust thresholds and alert timing
- Manage integration connections
- Configure compliance settings
- Edit automation preferences
- Advanced JSON configuration mode

## 🔄 Workflow Actions

Use these custom workflow actions in HubSpot (all support Breeze Agents):

| Action | Description | Agent-Enabled |
|--------|-------------|---------------|
| **Run Leak Detection** | Scan enrolled records for revenue leaks | ✅ |
| **Execute Recovery** | Auto-fix, create tasks, notify team, or escalate | ✅ |
| **Check Leak Status** | Branch based on leak presence and severity | ✅ |
| **Log Leak Event** | Add timeline events for audit trails | ✅ |
| **Get AI Recommendation** | Get AI-powered resolution suggestions | ✅ |

Example workflow triggers:
- Deal stage changes to "Closed Won" → Run CS handoff detection
- Contract created → Run billing gap detection
- 30 days before renewal → Run renewal risk detection

## 💡 Detection Modules

| Module | What It Detects |
|--------|-----------------|
| **Underbilling** | Deals priced significantly below pipeline averages |
| **Missed Renewals** | Contracts approaching renewal without engagement |
| **Cross-sell** | Expansion opportunities in existing accounts |
| **CS Handoff** | Won deals without proper customer success assignment |
| **Lifecycle** | Invalid or skipped lifecycle stage transitions |
| **Billing Gap** | Missing invoices, delayed billing, collection issues |
| **Stale Pipeline** | Deals stuck in stages for too long |
| **Data Quality** | Missing required fields, invalid data |

## 🔌 Integrations

### Supported Platforms

| Platform | Capabilities |
|----------|-------------|
| **Stripe** | Subscription tracking, payment sync, MRR calculation |
| **QuickBooks** | Invoice sync, payment tracking, customer matching |
| **Outlook** | Email logging, contact sync, calendar integration |
| **Gmail** | Email logging, contact sync, thread tracking |
| **Shopify** | Order sync, customer import, abandoned cart recovery |
| **Salesforce** | Contact sync, deal mirroring, activity logging |

### Connection Status

Each integration shows:
- ✅ Connected / ⚪ Not Connected
- Last sync timestamp
- Record count
- Error messages (if any)

## 🔒 Compliance Modes

### HIPAA Mode
- Automatic encryption of PHI fields
- 6-year data retention
- Comprehensive audit logging
- Consent tracking

### GDPR Mode
- Right to erasure support
- Data portability
- Consent management
- PII field encryption

### SOC2 Mode
- Enhanced audit trails
- Access controls
- Security monitoring
- Compliance reporting

## 📖 API Reference

### Core Endpoints

```
GET  /api/v1                              # API documentation
GET  /health                              # Health check

# Detection
POST /api/v1/detect/full                  # Run full detection
POST /api/v1/detect/run                   # Trigger detection scan
POST /api/v1/detect/deal/:dealId          # Detect for specific deal
POST /api/v1/detect/contact/:contactId    # Detect for specific contact
GET  /api/v1/detect/types                 # List detection types

# Leaks
GET  /api/v1/leaks/:entityType/:entityId  # Get leaks for entity
POST /api/v1/leaks/register               # Register leaks
POST /api/v1/leaks/:leakId/dismiss        # Dismiss a leak

# Actions
POST /api/v1/actions/:actionId/execute    # Execute recovery action
POST /api/v1/actions/resolve-leak/:leakId # Mark leak resolved

# Configuration
GET  /api/v1/config                       # Get app configuration
PUT  /api/v1/config                       # Update configuration
GET  /api/v1/config/validate              # Validate configuration

# Dashboard
GET  /api/v1/dashboard/metrics            # Get dashboard metrics
GET  /api/v1/dashboard/leaks              # Get all active leaks
GET  /api/v1/dashboard/trends             # Get leak trends

# Integrations
GET  /api/v1/integrations                 # List integrations
POST /api/v1/integrations/:id/connect     # Connect integration
POST /api/v1/integrations/:id/sync        # Trigger sync

# Workflows (Agent-enabled)
POST /api/v1/workflows/run-detection      # Workflow action
POST /api/v1/workflows/execute-recovery   # Workflow action
POST /api/v1/workflows/check-status       # Workflow action
POST /api/v1/workflows/log-event          # Workflow action
GET  /api/v1/workflows/actions            # List workflow actions

# Breeze AI
POST /api/v1/breeze/recommend             # Get AI recommendation
POST /api/v1/breeze/execute               # Execute Breeze action
GET  /api/v1/breeze/actions               # List Breeze actions
GET  /api/v1/breeze/actions/:leakType     # Get action for leak type

# Export
GET  /api/v1/export/leaks?format=csv      # Export leaks
GET  /api/v1/export/dashboard?format=html # Export dashboard
GET  /api/v1/export/audit                 # Export audit log
```

## 🏗️ Project Structure

```
├── app.json                    # HubSpot app configuration
├── hsproject.json              # HubSpot project file (platformVersion 2025.2)
├── ui-extensions/              # React UI components
│   ├── cards/                  # CRM card components
│   │   ├── DealLeakCard.tsx
│   │   ├── ContactLeakCard.tsx
│   │   ├── CompanyLeakCard.tsx
│   │   └── TicketLeakCard.tsx
│   ├── modals/                 # Modal components
│   │   ├── OnboardingWizard.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── settings-panel.json # App settings config
│   ├── pages/                  # App pages
│   │   ├── DashboardPage.tsx
│   │   └── dashboard-page.json # App home config
│   ├── utils/                  # Utilities
│   │   └── api-client.ts
│   └── types.ts               # UI type definitions
├── hubspot/                    # HubSpot-specific configurations
│   ├── objects/               # App Objects schemas
│   │   ├── revenue-leak.json
│   │   └── leak-detection-config.json
│   ├── events/                # App Events (timeline)
│   │   ├── leak-detected.json
│   │   ├── leak-resolved.json
│   │   └── scan-completed.json
│   ├── workflow-actions/      # Agent-enabled workflow actions
│   │   ├── run-leak-detection.json
│   │   ├── execute-recovery.json
│   │   ├── check-leak-status.json
│   │   ├── log-leak-event.json
│   │   └── get-ai-recommendation.json
│   ├── serverless/            # Serverless functions
│   │   ├── serverless.json
│   │   ├── run-detection.ts
│   │   ├── execute-recovery.ts
│   │   └── get-ai-recommendation.ts
│   └── workflows/             # Workflow action definitions
│       └── actions.ts
├── src/
│   ├── index.ts               # Main application entry
│   ├── api/routes/            # API endpoints
│   │   ├── config.ts          # Configuration API
│   │   ├── dashboard.ts       # Dashboard API
│   │   ├── leaks.ts          # Leaks API
│   │   ├── export.ts         # Export API
│   │   ├── integrations.ts   # Integrations API
│   │   ├── webhooks.ts       # Webhook handlers
│   │   ├── workflows.ts      # Workflow action handlers
│   │   └── breeze.ts         # Breeze AI API
│   ├── breeze/               # Breeze integration
│   │   ├── agent-memory.ts
│   │   ├── fix-actions.ts
│   │   └── index.ts
│   ├── engine/                # Detection modules
│   ├── integrations/          # Third-party integrations
│   ├── auth/                  # OAuth implementation
│   ├── crm/                   # CRM card helpers
│   ├── routes/                # Core routes
│   └── types/                 # Type definitions
└── tests/                     # Test suites
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Deploy to HubSpot
hs project upload
hs project deploy
```

## 📋 Legacy CLI Support

The CLI commands are still available for backward compatibility:

```bash
# Initialize configuration (creates config file)
npx leak-engine init

# Run leak detection scan
npx leak-engine scan

# View configuration
npx leak-engine config show

# View dashboard
npx leak-engine dashboard
```

**Note:** For the best experience, we recommend using the HubSpot embedded UI which provides the same functionality with a more user-friendly interface and zero terminal interaction required.

## 📄 Environment Configuration

```env
# Required for HubSpot App
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
HUBSPOT_REDIRECT_URI=https://your-app.com/oauth/callback

# For serverless functions
PRIVATE_APP_ACCESS_TOKEN=your_private_app_token

# Optional
PORT=3000
NODE_ENV=production
```

## 📜 License

ISC
