/**
 * Webhook Routes
 * Handlers for HubSpot webhook events
 */

import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import RevenueLeakDetectionEngine from '../../engine';

const router = Router();

/**
 * Verify HubSpot webhook signature
 */
function verifyWebhookSignature(
  signature: string | undefined,
  body: string,
  clientSecret: string
): boolean {
  if (!signature || !clientSecret) return false;
  
  const hash = crypto
    .createHmac('sha256', clientSecret)
    .update(body)
    .digest('hex');
  
  return signature === hash;
}

/**
 * POST /webhooks/deal-created
 * Handle deal creation events
 */
router.post('/deal-created', async (req: Request, res: Response) => {
  try {
    const events = req.body;
    
    console.log('Deal created webhook received:', events.length, 'events');
    
    for (const event of events) {
      const dealId = event.objectId;
      const portalId = event.portalId;
      
      // Queue leak detection for new deal
      console.log(`Queuing leak detection for new deal ${dealId} in portal ${portalId}`);
      
      // In production, trigger async detection job
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Deal created webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /webhooks/deal-stage-changed
 * Handle deal stage change events
 */
router.post('/deal-stage-changed', async (req: Request, res: Response) => {
  try {
    const events = req.body;
    
    console.log('Deal stage change webhook received:', events.length, 'events');
    
    for (const event of events) {
      const dealId = event.objectId;
      const portalId = event.portalId;
      const propertyName = event.propertyName;
      const propertyValue = event.propertyValue;
      
      console.log(`Deal ${dealId} stage changed to ${propertyValue}`);
      
      // Check for stage-based triggers
      if (propertyValue === 'closedwon') {
        // Trigger CS handoff detection
        console.log(`Triggering CS handoff detection for won deal ${dealId}`);
      }
      
      if (propertyValue === 'closedlost') {
        // Log lost deal for analysis
        console.log(`Logging lost deal ${dealId} for root cause analysis`);
      }
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Deal stage change webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /webhooks/contact-created
 * Handle contact creation events
 */
router.post('/contact-created', async (req: Request, res: Response) => {
  try {
    const events = req.body;
    
    console.log('Contact created webhook received:', events.length, 'events');
    
    for (const event of events) {
      const contactId = event.objectId;
      const portalId = event.portalId;
      
      // Queue lifecycle validation for new contact
      console.log(`Queuing lifecycle validation for new contact ${contactId}`);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Contact created webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /webhooks/scheduled-scan
 * Handle scheduled scan trigger (from workflow or cron)
 */
router.post('/scheduled-scan', async (req: Request, res: Response) => {
  try {
    const { portalId, scanType = 'full' } = req.body;
    
    console.log(`Scheduled scan triggered for portal ${portalId}, type: ${scanType}`);
    
    // In production, trigger full detection scan
    const engine = new RevenueLeakDetectionEngine();
    
    // Queue async scan job
    const scanId = `scan-${Date.now()}`;
    
    res.status(200).json({
      received: true,
      scanId,
      status: 'queued',
      estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Scheduled scan webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /webhooks/integration-sync
 * Handle integration sync completion events
 */
router.post('/integration-sync', async (req: Request, res: Response) => {
  try {
    const { integration, status, recordsUpdated, portalId } = req.body;
    
    console.log(`Integration sync completed: ${integration}, status: ${status}, records: ${recordsUpdated}`);
    
    if (status === 'success') {
      // Trigger relevant detection modules based on integration
      switch (integration) {
        case 'stripe':
        case 'quickbooks':
          console.log('Triggering billing gap detection after financial sync');
          break;
        case 'salesforce':
          console.log('Triggering cross-sell detection after CRM sync');
          break;
      }
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Integration sync webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
