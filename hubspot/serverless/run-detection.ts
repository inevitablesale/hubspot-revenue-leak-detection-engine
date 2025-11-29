/**
 * HubSpot Serverless Function: Run Leak Detection
 * 
 * This function runs leak detection scans on CRM records.
 * It's designed to be called from workflows, CRM cards, or Breeze agents.
 */

import { Client } from '@hubspot/api-client';

interface RequestContext {
  portalId: string;
  userId?: string;
}

interface RequestBody {
  objectId: string;
  objectType: 'deal' | 'contact' | 'company';
  scanType: 'full' | 'quick' | 'module';
  module?: string;
}

interface LeakResult {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  potentialRevenue: number;
  recommendation: string;
}

interface Response {
  statusCode: number;
  body: {
    success: boolean;
    data?: {
      leaksFound: number;
      potentialRevenue: number;
      hasCriticalLeak: boolean;
      leaks: LeakResult[];
    };
    error?: string;
  };
}

exports.main = async (context: RequestContext, event: { body: RequestBody }): Promise<Response> => {
  const hubspotClient = new Client({ accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN });
  
  try {
    const { objectId, objectType, scanType, module } = event.body;

    // Fetch the record from HubSpot
    let record;
    switch (objectType) {
      case 'deal':
        record = await hubspotClient.crm.deals.basicApi.getById(objectId, [
          'dealname', 'amount', 'dealstage', 'pipeline', 'closedate', 'hubspot_owner_id'
        ]);
        break;
      case 'contact':
        record = await hubspotClient.crm.contacts.basicApi.getById(objectId, [
          'firstname', 'lastname', 'email', 'lifecyclestage'
        ]);
        break;
      case 'company':
        record = await hubspotClient.crm.companies.basicApi.getById(objectId, [
          'name', 'domain', 'industry', 'annualrevenue'
        ]);
        break;
    }

    // Run detection logic (simplified for serverless)
    const leaks = await runDetection(record, objectType, scanType, module);

    const potentialRevenue = leaks.reduce((sum, leak) => sum + leak.potentialRevenue, 0);
    const hasCriticalLeak = leaks.some(leak => leak.severity === 'critical');

    // Store results in custom object if leaks found
    if (leaks.length > 0) {
      for (const leak of leaks) {
        await hubspotClient.crm.objects.basicApi.create('revenue_leak', {
          properties: {
            leak_name: `${leak.type} - ${objectType} ${objectId}`,
            leak_type: leak.type,
            severity: leak.severity,
            potential_revenue: leak.potentialRevenue.toString(),
            description: leak.description,
            recommendation: leak.recommendation,
            recovery_status: 'pending',
            affected_entity_type: objectType,
            affected_entity_id: objectId,
            detected_at: new Date().toISOString(),
            detection_source: 'automated'
          }
        });
      }
    }

    return {
      statusCode: 200,
      body: {
        success: true,
        data: {
          leaksFound: leaks.length,
          potentialRevenue,
          hasCriticalLeak,
          leaks
        }
      }
    };
  } catch (error) {
    console.error('Leak detection error:', error);
    return {
      statusCode: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : 'Detection failed'
      }
    };
  }
};

/**
 * Run leak detection on a record
 */
async function runDetection(
  record: any,
  objectType: string,
  scanType: string,
  module?: string
): Promise<LeakResult[]> {
  const leaks: LeakResult[] = [];
  const properties = record.properties;

  // Run relevant detection modules based on object type and scan settings
  if (objectType === 'deal') {
    // Underbilling detection
    if (scanType === 'full' || module === 'underbilling') {
      const amount = parseFloat(properties.amount || '0');
      // Simplified detection logic - in production, compare against averages
      if (amount > 0 && amount < 10000) {
        leaks.push({
          id: generateId(),
          type: 'underbilling',
          severity: amount < 5000 ? 'high' : 'medium',
          description: `Deal amount ${formatCurrency(amount)} may be below typical value`,
          potentialRevenue: Math.max(0, 15000 - amount),
          recommendation: 'Review pricing against similar deals in this pipeline'
        });
      }
    }

    // Stale pipeline detection
    if (scanType === 'full' || module === 'stale_pipeline') {
      const closeDate = properties.closedate ? new Date(properties.closedate) : null;
      const now = new Date();
      if (closeDate && closeDate < now && properties.dealstage !== 'closedwon' && properties.dealstage !== 'closedlost') {
        const daysPast = Math.floor((now.getTime() - closeDate.getTime()) / (1000 * 60 * 60 * 24));
        leaks.push({
          id: generateId(),
          type: 'stale_pipeline',
          severity: daysPast > 30 ? 'high' : 'medium',
          description: `Deal is ${daysPast} days past expected close date`,
          potentialRevenue: parseFloat(properties.amount || '0'),
          recommendation: 'Update close date or move deal to closed stage'
        });
      }
    }

    // CS Handoff detection
    if (scanType === 'full' || module === 'stalled_cs_handoff') {
      if (properties.dealstage === 'closedwon' && !properties.cs_owner) {
        leaks.push({
          id: generateId(),
          type: 'stalled_cs_handoff',
          severity: 'high',
          description: 'Won deal has no Customer Success owner assigned',
          potentialRevenue: parseFloat(properties.amount || '0') * 0.2, // 20% churn risk
          recommendation: 'Assign a Customer Success owner to begin onboarding'
        });
      }
    }
  }

  if (objectType === 'contact') {
    // Lifecycle validation
    if (scanType === 'full' || module === 'invalid_lifecycle_path') {
      const stage = properties.lifecyclestage;
      // Check for missing or invalid lifecycle stage
      if (!stage || stage === 'other') {
        leaks.push({
          id: generateId(),
          type: 'invalid_lifecycle_path',
          severity: 'medium',
          description: 'Contact has undefined or invalid lifecycle stage',
          potentialRevenue: 5000, // Estimated opportunity cost
          recommendation: 'Set appropriate lifecycle stage based on engagement'
        });
      }
    }
  }

  if (objectType === 'company') {
    // Cross-sell detection
    if (scanType === 'full' || module === 'untriggered_crosssell') {
      const revenue = parseFloat(properties.annualrevenue || '0');
      if (revenue > 100000) {
        // High-value company may have expansion potential
        leaks.push({
          id: generateId(),
          type: 'untriggered_crosssell',
          severity: 'medium',
          description: 'High-value company may have cross-sell potential',
          potentialRevenue: revenue * 0.1, // 10% expansion potential
          recommendation: 'Review for additional product/service opportunities'
        });
      }
    }
  }

  return leaks;
}

function generateId(): string {
  return `leak_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
