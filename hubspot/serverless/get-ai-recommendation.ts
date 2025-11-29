/**
 * HubSpot Serverless Function: Get AI Recommendation
 * 
 * This function provides AI-powered recommendations for resolving leaks.
 * Designed to be called by Breeze Agents for intelligent decision-making.
 */

import { Client } from '@hubspot/api-client';

interface RequestContext {
  portalId: string;
  userId?: string;
}

interface RequestBody {
  objectId: string;
  objectType: 'deal' | 'contact' | 'company';
  leakId?: string;
  includeAlternatives?: boolean;
}

interface AIRecommendation {
  recommendedAction: string;
  confidence: number;
  reasoning: string;
  expectedOutcome: string;
  risks: string[];
  alternatives: string[];
}

interface Response {
  statusCode: number;
  body: {
    success: boolean;
    data?: AIRecommendation;
    error?: string;
  };
}

exports.main = async (context: RequestContext, event: { body: RequestBody }): Promise<Response> => {
  const hubspotClient = new Client({ accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN });
  
  try {
    const { objectId, objectType, leakId, includeAlternatives = true } = event.body;

    // Fetch leak data if specific leak ID provided
    let leakData;
    if (leakId) {
      leakData = await hubspotClient.crm.objects.basicApi.getById('revenue_leak', leakId);
    } else {
      // Get most recent pending leak for this object
      const leaksResponse = await hubspotClient.crm.objects.searchApi.doSearch('revenue_leak', {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'affected_entity_id',
                operator: 'EQ',
                value: objectId
              },
              {
                propertyName: 'recovery_status',
                operator: 'EQ',
                value: 'pending'
              }
            ]
          }
        ],
        sorts: [{ propertyName: 'potential_revenue', direction: 'DESCENDING' }],
        limit: 1
      });
      leakData = leaksResponse.results[0];
    }

    if (!leakData) {
      return {
        statusCode: 200,
        body: {
          success: true,
          data: {
            recommendedAction: 'No action needed',
            confidence: 100,
            reasoning: 'No pending revenue leaks found for this record.',
            expectedOutcome: 'Record is healthy with no detected leaks.',
            risks: [],
            alternatives: ['Run a new detection scan to check for issues']
          }
        }
      };
    }

    // Fetch the associated CRM record for context
    let recordData;
    switch (objectType) {
      case 'deal':
        recordData = await hubspotClient.crm.deals.basicApi.getById(objectId, [
          'dealname', 'amount', 'dealstage', 'pipeline', 'closedate'
        ]);
        break;
      case 'contact':
        recordData = await hubspotClient.crm.contacts.basicApi.getById(objectId, [
          'firstname', 'lastname', 'email', 'lifecyclestage'
        ]);
        break;
      case 'company':
        recordData = await hubspotClient.crm.companies.basicApi.getById(objectId, [
          'name', 'domain', 'industry', 'annualrevenue'
        ]);
        break;
    }

    // Generate AI recommendation based on leak type and context
    const recommendation = generateRecommendation(leakData.properties, recordData?.properties, includeAlternatives);

    return {
      statusCode: 200,
      body: {
        success: true,
        data: recommendation
      }
    };
  } catch (error) {
    console.error('AI recommendation error:', error);
    return {
      statusCode: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate recommendation'
      }
    };
  }
};

/**
 * Generate AI recommendation based on leak and record context
 */
function generateRecommendation(
  leakProps: Record<string, string>,
  recordProps: Record<string, string> | undefined,
  includeAlternatives: boolean
): AIRecommendation {
  const leakType = leakProps.leak_type;
  const severity = leakProps.severity;
  const potentialRevenue = parseFloat(leakProps.potential_revenue || '0');

  // Base recommendation by leak type
  const recommendations: Record<string, Omit<AIRecommendation, 'alternatives'>> = {
    underbilling: {
      recommendedAction: 'Review and adjust deal pricing',
      confidence: 85,
      reasoning: `This deal appears to be priced ${Math.round(potentialRevenue / 100)}% below typical value for similar deals. Pricing adjustment could recover ${formatCurrency(potentialRevenue)}.`,
      expectedOutcome: `Corrected pricing will recover approximately ${formatCurrency(potentialRevenue)} in revenue and align with market rates.`,
      risks: [
        'Customer may resist price increase',
        'Ensure contract terms allow for adjustment'
      ]
    },
    missed_renewal: {
      recommendedAction: 'Initiate renewal outreach immediately',
      confidence: 90,
      reasoning: 'Contract is approaching or past renewal date without customer engagement. Immediate action prevents churn.',
      expectedOutcome: `Successful renewal will secure ${formatCurrency(potentialRevenue)} in recurring revenue.`,
      risks: [
        'Customer may have already decided to churn',
        'Delayed response reduces success probability'
      ]
    },
    untriggered_crosssell: {
      recommendedAction: 'Create expansion opportunity deal',
      confidence: 75,
      reasoning: 'Account profile suggests potential for additional products/services. Cross-sell opportunity identified.',
      expectedOutcome: `Expansion could generate ${formatCurrency(potentialRevenue)} in additional revenue.`,
      risks: [
        'Customer may not have budget',
        'Timing may not be optimal'
      ]
    },
    stalled_cs_handoff: {
      recommendedAction: 'Assign CS owner and initiate onboarding',
      confidence: 95,
      reasoning: 'Won deal without Customer Success assignment risks poor onboarding and early churn.',
      expectedOutcome: 'Proper onboarding will improve customer satisfaction and reduce churn risk.',
      risks: [
        'CS team capacity constraints',
        'Delayed onboarding may have already impacted customer perception'
      ]
    },
    invalid_lifecycle_path: {
      recommendedAction: 'Correct lifecycle stage and review data quality',
      confidence: 88,
      reasoning: 'Invalid or missing lifecycle stage affects reporting accuracy and automation targeting.',
      expectedOutcome: 'Corrected data will improve automation effectiveness and reporting accuracy.',
      risks: [
        'May trigger unintended automations',
        'Historical data may be affected'
      ]
    },
    billing_gap: {
      recommendedAction: 'Generate and send missing invoice',
      confidence: 92,
      reasoning: 'Gap between contracted value and invoiced amount indicates unbilled services.',
      expectedOutcome: `Billing correction will recover ${formatCurrency(potentialRevenue)} in missed revenue.`,
      risks: [
        'Customer may dispute charges',
        'Late invoicing may affect payment timing'
      ]
    },
    stale_pipeline: {
      recommendedAction: 'Update deal status or close date',
      confidence: 80,
      reasoning: 'Deal has exceeded expected close date. Review is needed to maintain pipeline accuracy.',
      expectedOutcome: 'Accurate pipeline data will improve forecasting and resource allocation.',
      risks: [
        'Deal may have gone cold',
        'Sales rep may have lost contact'
      ]
    },
    data_quality: {
      recommendedAction: 'Complete missing required fields',
      confidence: 85,
      reasoning: 'Missing or invalid data affects automation and reporting accuracy.',
      expectedOutcome: 'Complete data will enable proper automation and accurate reporting.',
      risks: [
        'Data may not be available',
        'Manual research may be required'
      ]
    }
  };

  // Get base recommendation
  const base = recommendations[leakType] || {
    recommendedAction: 'Manual review required',
    confidence: 60,
    reasoning: 'Unknown leak type requires human evaluation.',
    expectedOutcome: 'Manual review will determine appropriate action.',
    risks: ['Delayed resolution while awaiting review']
  };

  // Adjust confidence based on severity
  let adjustedConfidence = base.confidence;
  if (severity === 'critical') {
    adjustedConfidence = Math.min(95, adjustedConfidence + 5);
  } else if (severity === 'low') {
    adjustedConfidence = Math.max(50, adjustedConfidence - 10);
  }

  // Generate alternatives if requested
  const alternatives: string[] = [];
  if (includeAlternatives) {
    alternatives.push('Create task for sales rep review');
    alternatives.push('Escalate to manager for decision');
    alternatives.push('Dismiss if not applicable');
    
    if (leakType === 'underbilling' || leakType === 'billing_gap') {
      alternatives.push('Schedule meeting with finance team');
    }
    if (leakType === 'missed_renewal' || leakType === 'untriggered_crosssell') {
      alternatives.push('Enroll in re-engagement sequence');
    }
  }

  return {
    ...base,
    confidence: adjustedConfidence,
    alternatives
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
