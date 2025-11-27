/**
 * Tests for Billing Gap Detector
 */

import { BillingGapDetector, BillingData } from '../../src/engine/billing-gap';
import { Deal, Invoice, Contract } from '../../src/types';

describe('BillingGapDetector', () => {
  let detector: BillingGapDetector;

  beforeEach(() => {
    detector = new BillingGapDetector({
      maxBillingDelayDays: 30,
      minimumGapAmount: 500,
      invoiceFrequencyDays: 30,
    });
  });

  describe('analyzeDeals', () => {
    it('should detect deals with significant billing gaps', () => {
      const today = new Date();
      const closedDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago

      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Unbilled Deal',
            amount: '15000',
            dealstage: 'closedwon',
            closedate: closedDate.toISOString(),
          },
        },
      ];

      // Only $5000 invoiced out of $15000
      const invoicesByDeal = new Map<string, Invoice[]>([
        [
          'deal-1',
          [
            {
              id: 'inv-1',
              properties: {
                hs_invoice_number: 'INV-001',
                hs_amount_billed: '5000',
                hs_invoice_status: 'paid',
              },
            },
          ],
        ],
      ]);

      const leaks = detector.analyzeDeals(deals, invoicesByDeal);

      expect(leaks.length).toBe(1);
      expect(leaks[0].type).toBe('billing_gap');
      expect(leaks[0].potentialRevenue).toBe(10000); // $15k - $5k billed
    });

    it('should not flag deals with complete billing', () => {
      const today = new Date();
      const closedDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Fully Billed Deal',
            amount: '10000',
            dealstage: 'closedwon',
            closedate: closedDate.toISOString(),
          },
        },
      ];

      const invoicesByDeal = new Map<string, Invoice[]>([
        [
          'deal-1',
          [
            {
              id: 'inv-1',
              properties: {
                hs_invoice_number: 'INV-001',
                hs_amount_billed: '10000',
                hs_invoice_status: 'paid',
              },
            },
          ],
        ],
      ]);

      const leaks = detector.analyzeDeals(deals, invoicesByDeal);

      expect(leaks.length).toBe(0);
    });

    it('should not flag deals closed within acceptable billing window', () => {
      const today = new Date();
      const closedDate = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      const deals: Deal[] = [
        {
          id: 'deal-1',
          properties: {
            dealname: 'Recent Deal',
            amount: '20000',
            dealstage: 'closedwon',
            closedate: closedDate.toISOString(),
          },
        },
      ];

      const invoicesByDeal = new Map<string, Invoice[]>(); // No invoices yet

      const leaks = detector.analyzeDeals(deals, invoicesByDeal);

      expect(leaks.length).toBe(0);
    });
  });

  describe('analyzeInvoiceCollection', () => {
    it('should detect overdue invoices', () => {
      const today = new Date();
      const dueDate = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days overdue

      const invoices: Invoice[] = [
        {
          id: 'inv-1',
          properties: {
            hs_invoice_number: 'INV-001',
            hs_amount_billed: '8000',
            hs_invoice_status: 'open',
            hs_due_date: dueDate.toISOString(),
          },
        },
      ];

      const leaks = detector.analyzeInvoiceCollection(invoices);

      expect(leaks.length).toBe(1);
      expect(leaks[0].type).toBe('billing_gap');
      expect(leaks[0].severity).toBe('medium'); // 45 days overdue
    });

    it('should flag critical for severely overdue invoices', () => {
      const today = new Date();
      const dueDate = new Date(today.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days overdue

      const invoices: Invoice[] = [
        {
          id: 'inv-1',
          properties: {
            hs_invoice_number: 'INV-001',
            hs_amount_billed: '15000',
            hs_invoice_status: 'open',
            hs_due_date: dueDate.toISOString(),
          },
        },
      ];

      const leaks = detector.analyzeInvoiceCollection(invoices);

      expect(leaks.length).toBe(1);
      expect(leaks[0].severity).toBe('critical');
    });

    it('should not flag paid invoices', () => {
      const today = new Date();
      const dueDate = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000);

      const invoices: Invoice[] = [
        {
          id: 'inv-1',
          properties: {
            hs_invoice_number: 'INV-001',
            hs_amount_billed: '8000',
            hs_invoice_status: 'paid', // Already paid
            hs_due_date: dueDate.toISOString(),
          },
        },
      ];

      const leaks = detector.analyzeInvoiceCollection(invoices);

      expect(leaks.length).toBe(0);
    });
  });

  describe('analyzeBillingGaps', () => {
    it('should detect missing recurring invoices', () => {
      const today = new Date();
      const lastInvoiceDate = new Date(today.getTime() - 75 * 24 * 60 * 60 * 1000); // 75 days ago

      const billingData: BillingData[] = [
        {
          entity: {
            id: 'contract-1',
            properties: {
              contract_name: 'Monthly Contract',
              contract_value: '2000',
            },
          } as Contract,
          entityType: 'contract',
          invoices: [
            {
              id: 'inv-1',
              properties: {
                hs_invoice_number: 'INV-001',
                hs_amount_billed: '2000',
                hs_due_date: lastInvoiceDate.toISOString(),
              },
            },
          ],
          expectedBillingDates: [],
          deliveryDates: [],
        },
      ];

      const leaks = detector.analyzeBillingGaps(billingData);

      // Should detect that ~2 monthly invoices are missing
      const recurringLeak = leaks.find(l => l.description.includes('recurring invoice'));
      expect(recurringLeak).toBeDefined();
    });
  });
});
