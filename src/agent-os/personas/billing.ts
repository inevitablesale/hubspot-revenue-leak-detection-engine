/**
 * Billing Agent
 * Specialized agent for billing operations, invoice validation, and revenue recognition
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Billing Agent Types
// ============================================================

export interface BillingAnalysis {
  id: string;
  timestamp: Date;
  dealId: string;
  findings: BillingFinding[];
  anomalies: BillingAnomaly[];
  recommendations: BillingRecommendation[];
  confidence: number;
  revenueImpact: number;
}

export interface BillingFinding {
  id: string;
  type: 'underbilling' | 'overbilling' | 'timing_issue' | 'rate_mismatch' | 'missing_charge';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  amount: number;
  evidence: BillingEvidence[];
}

export interface BillingEvidence {
  source: string;
  field: string;
  expectedValue: unknown;
  actualValue: unknown;
  timestamp: Date;
}

export interface BillingAnomaly {
  id: string;
  type: string;
  pattern: string;
  deviation: number;
  frequency: number;
  affectedDeals: string[];
  estimatedImpact: number;
  detectedAt: Date;
}

export interface BillingRecommendation {
  id: string;
  priority: number;
  action: string;
  description: string;
  expectedRecovery: number;
  effort: 'low' | 'medium' | 'high';
  automatable: boolean;
}

export interface InvoiceValidation {
  id: string;
  invoiceId: string;
  dealId: string;
  status: 'valid' | 'invalid' | 'needs_review';
  checks: InvoiceCheck[];
  discrepancies: InvoiceDiscrepancy[];
  validatedAt: Date;
}

export interface InvoiceCheck {
  name: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  message?: string;
}

export interface InvoiceDiscrepancy {
  field: string;
  type: 'amount' | 'date' | 'rate' | 'quantity' | 'description';
  expected: unknown;
  actual: unknown;
  impact: number;
}

export interface BillingConfig {
  tolerancePercent: number;
  autoReconcile: boolean;
  alertThresholds: {
    underbilling: number;
    overbilling: number;
    timing: number;
  };
  rateValidation: boolean;
}

export interface BillingStats {
  totalAnalyses: number;
  anomaliesDetected: number;
  revenueRecovered: number;
  avgConfidence: number;
  invoicesValidated: number;
}

// ============================================================
// Billing Agent Implementation
// ============================================================

export class BillingAgent {
  private analyses: Map<string, BillingAnalysis> = new Map();
  private anomalies: Map<string, BillingAnomaly> = new Map();
  private validations: Map<string, InvoiceValidation> = new Map();
  private config: BillingConfig;
  private stats: BillingStats;

  constructor(config?: Partial<BillingConfig>) {
    this.config = {
      tolerancePercent: 1,
      autoReconcile: false,
      alertThresholds: {
        underbilling: 100,
        overbilling: 50,
        timing: 7,
      },
      rateValidation: true,
      ...config,
    };

    this.stats = {
      totalAnalyses: 0,
      anomaliesDetected: 0,
      revenueRecovered: 0,
      avgConfidence: 0,
      invoicesValidated: 0,
    };
  }

  /**
   * Analyze billing for a deal
   */
  analyzeDeal(dealId: string, dealData: Record<string, unknown>): BillingAnalysis {
    const findings: BillingFinding[] = [];
    const anomalies: BillingAnomaly[] = [];
    const recommendations: BillingRecommendation[] = [];
    let revenueImpact = 0;

    // Check for underbilling
    const underbilling = this.detectUnderbilling(dealData);
    if (underbilling) {
      findings.push(underbilling);
      revenueImpact += underbilling.amount;
    }

    // Check for overbilling
    const overbilling = this.detectOverbilling(dealData);
    if (overbilling) {
      findings.push(overbilling);
      revenueImpact -= overbilling.amount;
    }

    // Check for timing issues
    const timingIssues = this.detectTimingIssues(dealData);
    findings.push(...timingIssues);

    // Check for rate mismatches
    if (this.config.rateValidation) {
      const rateIssues = this.detectRateMismatch(dealData);
      findings.push(...rateIssues);
    }

    // Generate recommendations
    for (const finding of findings) {
      recommendations.push(this.generateRecommendation(finding));
    }

    const confidence = this.calculateConfidence(findings, dealData);

    const analysis: BillingAnalysis = {
      id: generateId(),
      timestamp: new Date(),
      dealId,
      findings,
      anomalies,
      recommendations,
      confidence,
      revenueImpact,
    };

    this.analyses.set(analysis.id, analysis);
    this.updateStats(analysis);

    return analysis;
  }

  /**
   * Validate an invoice
   */
  validateInvoice(
    invoiceId: string,
    dealId: string,
    invoiceData: Record<string, unknown>,
    dealData: Record<string, unknown>
  ): InvoiceValidation {
    const checks: InvoiceCheck[] = [];
    const discrepancies: InvoiceDiscrepancy[] = [];

    // Amount check
    const amountCheck = this.checkAmount(invoiceData, dealData);
    checks.push(amountCheck);
    if (!amountCheck.passed && amountCheck.expected !== amountCheck.actual) {
      discrepancies.push({
        field: 'amount',
        type: 'amount',
        expected: amountCheck.expected,
        actual: amountCheck.actual,
        impact: Math.abs(Number(amountCheck.expected) - Number(amountCheck.actual)),
      });
    }

    // Date check
    const dateCheck = this.checkDate(invoiceData, dealData);
    checks.push(dateCheck);

    // Rate check
    const rateCheck = this.checkRate(invoiceData, dealData);
    checks.push(rateCheck);

    // Quantity check
    const quantityCheck = this.checkQuantity(invoiceData, dealData);
    checks.push(quantityCheck);

    const allPassed = checks.every(c => c.passed);
    const hasDiscrepancies = discrepancies.length > 0;

    const validation: InvoiceValidation = {
      id: generateId(),
      invoiceId,
      dealId,
      status: allPassed ? 'valid' : hasDiscrepancies ? 'invalid' : 'needs_review',
      checks,
      discrepancies,
      validatedAt: new Date(),
    };

    this.validations.set(validation.id, validation);
    this.stats.invoicesValidated++;

    return validation;
  }

  /**
   * Detect billing patterns across multiple deals
   */
  detectPatterns(deals: Array<{ id: string; data: Record<string, unknown> }>): BillingAnomaly[] {
    const newAnomalies: BillingAnomaly[] = [];
    const amounts = deals.map(d => Number(d.data.amount) || 0);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.map(x => (x - mean) ** 2).reduce((a, b) => a + b) / amounts.length);

    // Find statistical outliers
    for (const deal of deals) {
      const amount = Number(deal.data.amount) || 0;
      const zScore = Math.abs((amount - mean) / stdDev);
      
      if (zScore > 2) {
        const anomaly: BillingAnomaly = {
          id: generateId(),
          type: 'statistical_outlier',
          pattern: `Amount ${amount} is ${zScore.toFixed(2)} standard deviations from mean`,
          deviation: zScore,
          frequency: 1,
          affectedDeals: [deal.id],
          estimatedImpact: Math.abs(amount - mean),
          detectedAt: new Date(),
        };
        newAnomalies.push(anomaly);
        this.anomalies.set(anomaly.id, anomaly);
      }
    }

    this.stats.anomaliesDetected += newAnomalies.length;
    return newAnomalies;
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(id: string): BillingAnalysis | undefined {
    return this.analyses.get(id);
  }

  /**
   * Get all anomalies
   */
  getAnomalies(): BillingAnomaly[] {
    return Array.from(this.anomalies.values());
  }

  /**
   * Get validation by ID
   */
  getValidation(id: string): InvoiceValidation | undefined {
    return this.validations.get(id);
  }

  /**
   * Get statistics
   */
  getStats(): BillingStats {
    return { ...this.stats };
  }

  // Private methods

  private detectUnderbilling(dealData: Record<string, unknown>): BillingFinding | null {
    const invoicedAmount = Number(dealData.invoiced_amount) || 0;
    const dealAmount = Number(dealData.amount) || 0;
    const tolerance = dealAmount * (this.config.tolerancePercent / 100);

    if (invoicedAmount < dealAmount - tolerance) {
      const difference = dealAmount - invoicedAmount;
      if (difference > this.config.alertThresholds.underbilling) {
        return {
          id: generateId(),
          type: 'underbilling',
          severity: difference > 1000 ? 'high' : difference > 500 ? 'medium' : 'low',
          description: `Deal underbilled by ${difference.toFixed(2)}`,
          amount: difference,
          evidence: [
            {
              source: 'deal',
              field: 'amount',
              expectedValue: dealAmount,
              actualValue: invoicedAmount,
              timestamp: new Date(),
            },
          ],
        };
      }
    }
    return null;
  }

  private detectOverbilling(dealData: Record<string, unknown>): BillingFinding | null {
    const invoicedAmount = Number(dealData.invoiced_amount) || 0;
    const dealAmount = Number(dealData.amount) || 0;
    const tolerance = dealAmount * (this.config.tolerancePercent / 100);

    if (invoicedAmount > dealAmount + tolerance) {
      const difference = invoicedAmount - dealAmount;
      if (difference > this.config.alertThresholds.overbilling) {
        return {
          id: generateId(),
          type: 'overbilling',
          severity: difference > 1000 ? 'critical' : difference > 500 ? 'high' : 'medium',
          description: `Deal overbilled by ${difference.toFixed(2)}`,
          amount: difference,
          evidence: [
            {
              source: 'deal',
              field: 'amount',
              expectedValue: dealAmount,
              actualValue: invoicedAmount,
              timestamp: new Date(),
            },
          ],
        };
      }
    }
    return null;
  }

  private detectTimingIssues(dealData: Record<string, unknown>): BillingFinding[] {
    const findings: BillingFinding[] = [];
    const closeDate = dealData.close_date ? new Date(String(dealData.close_date)) : null;
    const invoiceDate = dealData.invoice_date ? new Date(String(dealData.invoice_date)) : null;

    if (closeDate && invoiceDate) {
      const daysDiff = Math.abs((invoiceDate.getTime() - closeDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > this.config.alertThresholds.timing) {
        findings.push({
          id: generateId(),
          type: 'timing_issue',
          severity: daysDiff > 30 ? 'high' : 'medium',
          description: `Invoice date is ${Math.round(daysDiff)} days from close date`,
          amount: 0,
          evidence: [
            {
              source: 'deal',
              field: 'dates',
              expectedValue: closeDate.toISOString(),
              actualValue: invoiceDate.toISOString(),
              timestamp: new Date(),
            },
          ],
        });
      }
    }

    return findings;
  }

  private detectRateMismatch(dealData: Record<string, unknown>): BillingFinding[] {
    const findings: BillingFinding[] = [];
    const agreedRate = Number(dealData.agreed_rate) || 0;
    const billedRate = Number(dealData.billed_rate) || 0;

    if (agreedRate && billedRate && agreedRate !== billedRate) {
      const difference = Math.abs(agreedRate - billedRate);
      const percentDiff = (difference / agreedRate) * 100;

      if (percentDiff > this.config.tolerancePercent) {
        findings.push({
          id: generateId(),
          type: 'rate_mismatch',
          severity: percentDiff > 10 ? 'high' : percentDiff > 5 ? 'medium' : 'low',
          description: `Rate mismatch of ${percentDiff.toFixed(2)}%`,
          amount: difference,
          evidence: [
            {
              source: 'deal',
              field: 'rate',
              expectedValue: agreedRate,
              actualValue: billedRate,
              timestamp: new Date(),
            },
          ],
        });
      }
    }

    return findings;
  }

  private generateRecommendation(finding: BillingFinding): BillingRecommendation {
    const recommendations: Record<string, Partial<BillingRecommendation>> = {
      underbilling: {
        action: 'generate_additional_invoice',
        description: 'Generate additional invoice to capture missing revenue',
        automatable: true,
      },
      overbilling: {
        action: 'issue_credit_memo',
        description: 'Issue credit memo to correct overbilling',
        automatable: true,
      },
      timing_issue: {
        action: 'review_billing_schedule',
        description: 'Review and adjust billing schedule alignment',
        automatable: false,
      },
      rate_mismatch: {
        action: 'reconcile_rates',
        description: 'Reconcile rates between contract and billing system',
        automatable: false,
      },
      missing_charge: {
        action: 'add_line_item',
        description: 'Add missing charge to invoice',
        automatable: true,
      },
    };

    const rec = recommendations[finding.type] || {
      action: 'manual_review',
      description: 'Manual review required',
      automatable: false,
    };

    return {
      id: generateId(),
      priority: finding.severity === 'critical' ? 1 : finding.severity === 'high' ? 2 : finding.severity === 'medium' ? 3 : 4,
      action: rec.action || 'manual_review',
      description: rec.description || 'Manual review required',
      expectedRecovery: finding.amount,
      effort: finding.severity === 'low' ? 'low' : finding.severity === 'medium' ? 'medium' : 'high',
      automatable: rec.automatable || false,
    };
  }

  private calculateConfidence(findings: BillingFinding[], dealData: Record<string, unknown>): number {
    let confidence = 1.0;

    // Reduce confidence based on missing data
    const requiredFields = ['amount', 'invoiced_amount', 'close_date'];
    for (const field of requiredFields) {
      if (!dealData[field]) {
        confidence *= 0.8;
      }
    }

    // Adjust based on evidence strength
    const evidenceCount = findings.reduce((sum, f) => sum + f.evidence.length, 0);
    if (evidenceCount > 0) {
      confidence *= Math.min(1, 0.7 + evidenceCount * 0.1);
    }

    return Math.max(0.1, Math.min(1, confidence));
  }

  private checkAmount(invoiceData: Record<string, unknown>, dealData: Record<string, unknown>): InvoiceCheck {
    const invoiceAmount = Number(invoiceData.amount) || 0;
    const dealAmount = Number(dealData.amount) || 0;
    const tolerance = dealAmount * (this.config.tolerancePercent / 100);

    return {
      name: 'amount_match',
      passed: Math.abs(invoiceAmount - dealAmount) <= tolerance,
      expected: dealAmount,
      actual: invoiceAmount,
      message: Math.abs(invoiceAmount - dealAmount) <= tolerance ? undefined : `Amount difference: ${Math.abs(invoiceAmount - dealAmount).toFixed(2)}`,
    };
  }

  private checkDate(invoiceData: Record<string, unknown>, dealData: Record<string, unknown>): InvoiceCheck {
    const invoiceDate = invoiceData.date ? new Date(String(invoiceData.date)) : null;
    const closeDate = dealData.close_date ? new Date(String(dealData.close_date)) : null;

    if (!invoiceDate || !closeDate) {
      return {
        name: 'date_check',
        passed: false,
        expected: closeDate,
        actual: invoiceDate,
        message: 'Missing date information',
      };
    }

    const daysDiff = Math.abs((invoiceDate.getTime() - closeDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      name: 'date_check',
      passed: daysDiff <= this.config.alertThresholds.timing,
      expected: closeDate,
      actual: invoiceDate,
      message: daysDiff > this.config.alertThresholds.timing ? `Invoice date is ${Math.round(daysDiff)} days from close date` : undefined,
    };
  }

  private checkRate(invoiceData: Record<string, unknown>, dealData: Record<string, unknown>): InvoiceCheck {
    const invoiceRate = Number(invoiceData.rate) || 0;
    const dealRate = Number(dealData.agreed_rate) || Number(dealData.rate) || 0;

    if (!invoiceRate && !dealRate) {
      return {
        name: 'rate_check',
        passed: true,
        expected: null,
        actual: null,
        message: 'No rate information available',
      };
    }

    const tolerance = dealRate * (this.config.tolerancePercent / 100);

    return {
      name: 'rate_check',
      passed: Math.abs(invoiceRate - dealRate) <= tolerance,
      expected: dealRate,
      actual: invoiceRate,
      message: Math.abs(invoiceRate - dealRate) > tolerance ? `Rate mismatch: expected ${dealRate}, got ${invoiceRate}` : undefined,
    };
  }

  private checkQuantity(invoiceData: Record<string, unknown>, dealData: Record<string, unknown>): InvoiceCheck {
    const invoiceQty = Number(invoiceData.quantity) || 0;
    const dealQty = Number(dealData.quantity) || 0;

    if (!invoiceQty && !dealQty) {
      return {
        name: 'quantity_check',
        passed: true,
        expected: null,
        actual: null,
        message: 'No quantity information available',
      };
    }

    return {
      name: 'quantity_check',
      passed: invoiceQty === dealQty,
      expected: dealQty,
      actual: invoiceQty,
      message: invoiceQty !== dealQty ? `Quantity mismatch: expected ${dealQty}, got ${invoiceQty}` : undefined,
    };
  }

  private updateStats(analysis: BillingAnalysis): void {
    this.stats.totalAnalyses++;
    this.stats.anomaliesDetected += analysis.anomalies.length;
    
    const positiveImpact = Math.max(0, analysis.revenueImpact);
    this.stats.revenueRecovered += positiveImpact;

    // Update average confidence
    this.stats.avgConfidence = (
      (this.stats.avgConfidence * (this.stats.totalAnalyses - 1) + analysis.confidence) /
      this.stats.totalAnalyses
    );
  }
}

export default BillingAgent;
