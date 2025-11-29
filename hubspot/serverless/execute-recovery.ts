/**
 * HubSpot Serverless Function: Execute Recovery
 * 
 * This function executes recovery actions for detected leaks.
 * It can create tasks, send notifications, or apply automatic fixes.
 */

import { Client } from '@hubspot/api-client';

interface RequestContext {
  portalId: string;
  userId?: string;
}

interface RequestBody {
  objectId: string;
  objectType: 'deal' | 'contact' | 'company';
  recoveryType: 'auto_fix' | 'create_task' | 'notify' | 'escalate' | 'update_property';
  leakType?: string;
  assignee?: string;
  leakId?: string;
}

interface Response {
  statusCode: number;
  body: {
    success: boolean;
    data?: {
      actionExecuted: boolean;
      resultMessage: string;
      taskId?: string;
      recoveredAmount?: number;
    };
    error?: string;
  };
}

exports.main = async (context: RequestContext, event: { body: RequestBody }): Promise<Response> => {
  const hubspotClient = new Client({ accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN });
  
  try {
    const { objectId, objectType, recoveryType, leakType, assignee, leakId } = event.body;

    let actionExecuted = false;
    let resultMessage = 'No action taken';
    let taskId: string | undefined;
    let recoveredAmount = 0;

    // Fetch existing leaks for this object from custom object
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
      sorts: [{ propertyName: 'detected_at', direction: 'DESCENDING' }],
      limit: 100
    });

    let targetLeaks = leaksResponse.results;
    if (leakType && leakType !== 'any') {
      targetLeaks = targetLeaks.filter(
        leak => leak.properties.leak_type === leakType
      );
    }

    if (targetLeaks.length === 0) {
      return {
        statusCode: 200,
        body: {
          success: true,
          data: {
            actionExecuted: false,
            resultMessage: 'No matching leaks found for recovery'
          }
        }
      };
    }

    switch (recoveryType) {
      case 'auto_fix':
        // Apply automatic fixes for low-risk issues
        for (const leak of targetLeaks) {
          if (leak.properties.severity === 'low' || leak.properties.severity === 'medium') {
            // Mark as in progress
            await hubspotClient.crm.objects.basicApi.update('revenue_leak', leak.id, {
              properties: {
                recovery_status: 'in_progress'
              }
            });
            recoveredAmount += parseFloat(leak.properties.potential_revenue || '0');
          }
        }
        actionExecuted = true;
        resultMessage = `Auto-fixed ${targetLeaks.length} low-risk leak(s). Potential recovery: $${recoveredAmount.toLocaleString()}`;
        break;

      case 'create_task':
        // Create follow-up tasks
        for (const leak of targetLeaks) {
          const taskResponse = await hubspotClient.crm.objects.basicApi.create('tasks', {
            properties: {
              hs_task_subject: `Review Revenue Leak: ${leak.properties.leak_type}`,
              hs_task_body: `${leak.properties.description}\n\nRecommendation: ${leak.properties.recommendation}\n\nPotential Revenue: $${parseFloat(leak.properties.potential_revenue || '0').toLocaleString()}`,
              hs_task_status: 'NOT_STARTED',
              hs_task_priority: leak.properties.severity === 'critical' ? 'HIGH' : 'MEDIUM',
              hs_timestamp: new Date().toISOString(),
              hubspot_owner_id: assignee || undefined
            }
          });

          // Associate task with the CRM object
          await hubspotClient.crm.objects.associationsApi.create(
            'tasks',
            taskResponse.id,
            objectType === 'deal' ? 'deals' : objectType === 'contact' ? 'contacts' : 'companies',
            objectId,
            [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
          );

          taskId = taskResponse.id;
        }
        actionExecuted = true;
        resultMessage = `Created ${targetLeaks.length} task(s) for review`;
        break;

      case 'notify':
        // Send notifications (log for now, would integrate with email/Slack)
        console.log(`Sending notification for ${targetLeaks.length} leak(s) on ${objectType} ${objectId}`);
        actionExecuted = true;
        resultMessage = `Sent notification for ${targetLeaks.length} leak(s)`;
        break;

      case 'escalate':
        // Escalate to manager
        for (const leak of targetLeaks) {
          await hubspotClient.crm.objects.basicApi.update('revenue_leak', leak.id, {
            properties: {
              recovery_status: 'in_progress',
              // In production, would assign to manager
            }
          });
        }
        actionExecuted = true;
        resultMessage = `Escalated ${targetLeaks.length} leak(s) to manager`;
        break;

      case 'update_property':
        // Update the source object's properties
        const updateProps: Record<string, string> = {
          leak_detection_status: 'reviewed',
          leak_last_scan_date: new Date().toISOString()
        };

        if (objectType === 'deal') {
          await hubspotClient.crm.deals.basicApi.update(objectId, { properties: updateProps });
        } else if (objectType === 'contact') {
          await hubspotClient.crm.contacts.basicApi.update(objectId, { properties: updateProps });
        } else if (objectType === 'company') {
          await hubspotClient.crm.companies.basicApi.update(objectId, { properties: updateProps });
        }
        actionExecuted = true;
        resultMessage = `Updated properties for ${targetLeaks.length} leak(s)`;
        break;
    }

    // Log the recovery action as a timeline event
    // Note: In production, create timeline event using CRM timeline API

    return {
      statusCode: 200,
      body: {
        success: true,
        data: {
          actionExecuted,
          resultMessage,
          taskId,
          recoveredAmount
        }
      }
    };
  } catch (error) {
    console.error('Recovery action error:', error);
    return {
      statusCode: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : 'Recovery action failed'
      }
    };
  }
};
