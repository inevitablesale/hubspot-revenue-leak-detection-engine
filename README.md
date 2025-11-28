# HubSpot Revenue Leak Detection Engine

A self-operating RevOps platform that identifies and recovers hidden revenue leaks across the full customer lifecycle. **Now available as a fully integrated HubSpot Native App** with embedded UI Extensions, CRM cards, and workflow actions - requiring zero CLI interaction.

## 🎯 Key Features

| Category | Capabilities |
|----------|-------------|
| **Detection** | Underbilling, missed renewals, cross-sell gaps, CS handoff issues, lifecycle anomalies, billing gaps |
| **Intelligence** | Pattern recognition, anomaly detection, predictive analytics, root cause analysis |
| **Automation** | Recovery workflows, self-healing, capacity-aware orchestration, rule evolution |
| **Governance** | Financial controls, audit trails, compliance checks, approval workflows |
| **Integration** | HubSpot CRM, Outlook, QuickBooks, Stripe, Shopify, Gmail, Salesforce |
| **Compliance** | HIPAA mode, GDPR mode, SOC2, audit logging, data encryption |

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
   - Import the `app.json` configuration
   - Configure OAuth scopes and webhook endpoints
5. **Complete the In-App Setup Wizard** that appears after installation

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

### Dashboard Page

Access the full-width dashboard from HubSpot's app menu:
- 📈 Leak trends over time (stacked chart by type)
- 📊 Recovery rates by team or pipeline
- 🏆 Top unresolved leak types and impacted ARR
- 🎯 Portal autonomy score and governance coverage
- 📥 Export to HTML or CSV

### Settings Panel

Configure the app directly in HubSpot:
- Enable/disable detection modules
- Adjust thresholds and alert timing
- Manage integration connections
- Configure compliance settings
- Edit automation preferences
- Advanced JSON configuration mode

## 🔄 Workflow Actions

Use these custom workflow actions in HubSpot:

| Action | Description |
|--------|-------------|
| **Run Leak Detection** | Scan enrolled records for revenue leaks |
| **Execute Recovery** | Auto-fix, create tasks, notify team, or escalate |
| **Check Leak Status** | Branch based on leak presence and severity |
| **Log Leak Event** | Add timeline events for audit trails |
| **Update Leak Property** | Update custom leak detection properties |

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

# Workflows
POST /api/v1/workflows/run-detection      # Workflow action
POST /api/v1/workflows/execute-recovery   # Workflow action
GET  /api/v1/workflows/actions            # List workflow actions

# Export
GET  /api/v1/export/leaks?format=csv      # Export leaks
GET  /api/v1/export/dashboard?format=html # Export dashboard
GET  /api/v1/export/audit                 # Export audit log
```

## 🏗️ Project Structure

```
├── app.json                    # HubSpot app configuration
├── hsproject.json              # HubSpot project file
├── ui-extensions/              # React UI components
│   ├── cards/                  # CRM card components
│   │   ├── DealLeakCard.tsx
│   │   ├── ContactLeakCard.tsx
│   │   ├── CompanyLeakCard.tsx
│   │   └── TicketLeakCard.tsx
│   ├── modals/                 # Modal components
│   │   ├── OnboardingWizard.tsx
│   │   └── SettingsPanel.tsx
│   ├── pages/                  # App pages
│   │   └── DashboardPage.tsx
│   ├── utils/                  # Utilities
│   │   └── api-client.ts
│   └── types.ts               # UI type definitions
├── hubspot/                    # HubSpot-specific code
│   └── workflows/              # Workflow action definitions
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
│   │   └── workflows.ts      # Workflow action handlers
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

# Optional
PORT=3000
NODE_ENV=production
```

## 📜 License

ISC
