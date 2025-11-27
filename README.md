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
│   ├── engine/         # Detection engine modules
│   │   ├── underbilling.ts
│   │   ├── missed-renewals.ts
│   │   ├── crosssell.ts
│   │   ├── cs-handoff.ts
│   │   ├── lifecycle-validator.ts
│   │   ├── billing-gap.ts
│   │   └── index.ts    # Main engine orchestrator
│   ├── crm/            # CRM card and property modules
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

## License

ISC
