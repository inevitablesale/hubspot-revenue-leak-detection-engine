/**
 * Data Quality Agent
 * Specialized agent for data quality assessment, validation, and remediation
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Data Quality Agent Types
// ============================================================

export interface DataQualityAnalysis {
  id: string;
  timestamp: Date;
  entityType: string;
  overallScore: DataQualityScore;
  issues: DataIssue[];
  recommendations: DataQualityRecommendation[];
  metrics: DataQualityMetrics;
}

export interface DataQualityScore {
  overall: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  uniqueness: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface DataIssue {
  id: string;
  type: 'missing' | 'invalid' | 'inconsistent' | 'duplicate' | 'outdated' | 'format';
  severity: 'low' | 'medium' | 'high' | 'critical';
  field: string;
  entityId?: string;
  description: string;
  affectedCount: number;
  impact: number;
  autoFixable: boolean;
}

export interface DataQualityRecommendation {
  id: string;
  priority: number;
  type: 'fix' | 'validation' | 'enrichment' | 'deduplication' | 'standardization';
  action: string;
  description: string;
  expectedImprovement: number;
  effort: 'low' | 'medium' | 'high';
  automatable: boolean;
}

export interface DataQualityMetrics {
  recordsAnalyzed: number;
  fieldsChecked: number;
  issuesFound: number;
  autoFixedCount: number;
  completenessRate: number;
  validityRate: number;
}

export interface DataQualityConfig {
  requiredFields: Record<string, string[]>;
  validationRules: ValidationRule[];
  qualityThresholds: {
    acceptable: number;
    warning: number;
    critical: number;
  };
  autoFix: boolean;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'enum' | 'custom';
  params?: Record<string, unknown>;
  message: string;
}

export interface DataQualityStats {
  totalAnalyses: number;
  avgScore: number;
  issuesResolved: number;
  autoFixesApplied: number;
  improvementRate: number;
}

// ============================================================
// Data Quality Agent Implementation
// ============================================================

export class DataQualityAgent {
  private analyses: Map<string, DataQualityAnalysis> = new Map();
  private entityScores: Map<string, DataQualityScore> = new Map();
  private config: DataQualityConfig;
  private stats: DataQualityStats;

  constructor(config?: Partial<DataQualityConfig>) {
    this.config = {
      requiredFields: {
        deal: ['name', 'amount', 'stage', 'close_date', 'owner'],
        contact: ['email', 'firstname', 'lastname'],
        company: ['name', 'domain'],
      },
      validationRules: [
        { field: 'email', type: 'format', params: { pattern: 'email' }, message: 'Invalid email format' },
        { field: 'amount', type: 'range', params: { min: 0 }, message: 'Amount must be positive' },
        { field: 'close_date', type: 'format', params: { pattern: 'date' }, message: 'Invalid date format' },
      ],
      qualityThresholds: {
        acceptable: 80,
        warning: 60,
        critical: 40,
      },
      autoFix: false,
      ...config,
    };

    this.stats = {
      totalAnalyses: 0,
      avgScore: 0,
      issuesResolved: 0,
      autoFixesApplied: 0,
      improvementRate: 0,
    };
  }

  /**
   * Analyze data quality for a set of records
   */
  analyzeData(
    entityType: string,
    records: Array<Record<string, unknown>>
  ): DataQualityAnalysis {
    const issues: DataIssue[] = [];
    let completenessSum = 0;
    let accuracySum = 0;
    let consistencySum = 0;
    let timelinessSum = 0;
    let uniquenessSum = 0;

    const requiredFields = this.config.requiredFields[entityType] || [];

    for (const record of records) {
      // Check completeness
      const completeness = this.checkCompleteness(record, requiredFields);
      completenessSum += completeness.score;
      issues.push(...completeness.issues);

      // Check accuracy (validation)
      const accuracy = this.checkAccuracy(record);
      accuracySum += accuracy.score;
      issues.push(...accuracy.issues);

      // Check timeliness
      const timeliness = this.checkTimeliness(record);
      timelinessSum += timeliness.score;
      issues.push(...timeliness.issues);
    }

    // Check consistency across records
    const consistency = this.checkConsistency(records);
    consistencySum = consistency.score;
    issues.push(...consistency.issues);

    // Check uniqueness
    const uniqueness = this.checkUniqueness(records);
    uniquenessSum = uniqueness.score;
    issues.push(...uniqueness.issues);

    const recordCount = records.length || 1;
    const score: DataQualityScore = {
      overall: 0,
      completeness: Math.round(completenessSum / recordCount),
      accuracy: Math.round(accuracySum / recordCount),
      consistency: consistencySum,
      timeliness: Math.round(timelinessSum / recordCount),
      uniqueness: uniquenessSum,
      trend: 'stable',
    };

    score.overall = Math.round(
      (score.completeness + score.accuracy + score.consistency + score.timeliness + score.uniqueness) / 5
    );

    const recommendations = this.generateRecommendations(issues, score);

    const analysis: DataQualityAnalysis = {
      id: generateId(),
      timestamp: new Date(),
      entityType,
      overallScore: score,
      issues: this.deduplicateIssues(issues),
      recommendations,
      metrics: {
        recordsAnalyzed: records.length,
        fieldsChecked: requiredFields.length + this.config.validationRules.length,
        issuesFound: issues.length,
        autoFixedCount: 0,
        completenessRate: score.completeness,
        validityRate: score.accuracy,
      },
    };

    this.analyses.set(analysis.id, analysis);
    this.entityScores.set(entityType, score);
    this.updateStats(analysis);

    return analysis;
  }

  /**
   * Auto-fix issues where possible
   */
  autoFix(analysisId: string): { fixed: number; failed: number; changes: Array<{ field: string; before: unknown; after: unknown }> } {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) {
      return { fixed: 0, failed: 0, changes: [] };
    }

    let fixed = 0;
    let failed = 0;
    const changes: Array<{ field: string; before: unknown; after: unknown }> = [];

    for (const issue of analysis.issues) {
      if (issue.autoFixable) {
        const result = this.applyFix(issue);
        if (result.success) {
          fixed++;
          changes.push(result.change!);
          this.stats.autoFixesApplied++;
        } else {
          failed++;
        }
      }
    }

    analysis.metrics.autoFixedCount = fixed;
    return { fixed, failed, changes };
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(id: string): DataQualityAnalysis | undefined {
    return this.analyses.get(id);
  }

  /**
   * Get score for entity type
   */
  getScore(entityType: string): DataQualityScore | undefined {
    return this.entityScores.get(entityType);
  }

  /**
   * Get critical issues
   */
  getCriticalIssues(): DataIssue[] {
    const critical: DataIssue[] = [];

    for (const analysis of this.analyses.values()) {
      for (const issue of analysis.issues) {
        if (issue.severity === 'critical' || issue.severity === 'high') {
          critical.push(issue);
        }
      }
    }

    return critical.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Get statistics
   */
  getStats(): DataQualityStats {
    return { ...this.stats };
  }

  // Private methods

  private checkCompleteness(
    record: Record<string, unknown>,
    requiredFields: string[]
  ): { score: number; issues: DataIssue[] } {
    const issues: DataIssue[] = [];
    let filledCount = 0;

    for (const field of requiredFields) {
      const value = record[field];
      if (value !== undefined && value !== null && value !== '') {
        filledCount++;
      } else {
        issues.push({
          id: generateId(),
          type: 'missing',
          severity: 'high',
          field,
          entityId: String(record.id || ''),
          description: `Missing required field: ${field}`,
          affectedCount: 1,
          impact: 10,
          autoFixable: false,
        });
      }
    }

    const score = requiredFields.length > 0 
      ? (filledCount / requiredFields.length) * 100 
      : 100;

    return { score, issues };
  }

  private checkAccuracy(
    record: Record<string, unknown>
  ): { score: number; issues: DataIssue[] } {
    const issues: DataIssue[] = [];
    let validCount = 0;
    let checkedCount = 0;

    for (const rule of this.config.validationRules) {
      const value = record[rule.field];
      if (value === undefined || value === null) continue;

      checkedCount++;
      const isValid = this.validateField(value, rule);

      if (isValid) {
        validCount++;
      } else {
        issues.push({
          id: generateId(),
          type: 'invalid',
          severity: 'medium',
          field: rule.field,
          entityId: String(record.id || ''),
          description: rule.message,
          affectedCount: 1,
          impact: 5,
          autoFixable: rule.type === 'format',
        });
      }
    }

    const score = checkedCount > 0 ? (validCount / checkedCount) * 100 : 100;
    return { score, issues };
  }

  private checkTimeliness(
    record: Record<string, unknown>
  ): { score: number; issues: DataIssue[] } {
    const issues: DataIssue[] = [];
    let score = 100;

    // Check last modified date
    const lastModified = record.updated_at || record.last_modified;
    if (lastModified) {
      const daysSinceUpdate = (Date.now() - new Date(String(lastModified)).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate > 365) {
        score = 30;
        issues.push({
          id: generateId(),
          type: 'outdated',
          severity: 'high',
          field: 'updated_at',
          entityId: String(record.id || ''),
          description: `Record not updated in ${Math.round(daysSinceUpdate)} days`,
          affectedCount: 1,
          impact: 8,
          autoFixable: false,
        });
      } else if (daysSinceUpdate > 180) {
        score = 60;
        issues.push({
          id: generateId(),
          type: 'outdated',
          severity: 'medium',
          field: 'updated_at',
          entityId: String(record.id || ''),
          description: `Record not updated in ${Math.round(daysSinceUpdate)} days`,
          affectedCount: 1,
          impact: 4,
          autoFixable: false,
        });
      } else if (daysSinceUpdate > 90) {
        score = 80;
      }
    }

    return { score, issues };
  }

  private checkConsistency(
    records: Array<Record<string, unknown>>
  ): { score: number; issues: DataIssue[] } {
    const issues: DataIssue[] = [];
    let inconsistencies = 0;

    // Check for inconsistent naming/formatting patterns
    const fieldPatterns: Map<string, Set<string>> = new Map();

    for (const record of records) {
      for (const [key, value] of Object.entries(record)) {
        if (typeof value !== 'string') continue;
        
        if (!fieldPatterns.has(key)) {
          fieldPatterns.set(key, new Set());
        }
        
        // Detect format patterns
        const pattern = this.getPattern(value);
        fieldPatterns.get(key)!.add(pattern);
      }
    }

    // Fields with multiple patterns indicate inconsistency
    for (const [field, patterns] of fieldPatterns) {
      if (patterns.size > 3) {
        inconsistencies++;
        issues.push({
          id: generateId(),
          type: 'inconsistent',
          severity: 'medium',
          field,
          description: `Inconsistent formatting detected in field: ${field}`,
          affectedCount: records.length,
          impact: 3,
          autoFixable: true,
        });
      }
    }

    const score = Math.max(0, 100 - inconsistencies * 10);
    return { score, issues };
  }

  private checkUniqueness(
    records: Array<Record<string, unknown>>
  ): { score: number; issues: DataIssue[] } {
    const issues: DataIssue[] = [];
    const seen = new Map<string, number>();
    let duplicates = 0;

    // Check for duplicates based on key fields
    for (const record of records) {
      const key = this.getRecordKey(record);
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);

      if (count > 0) {
        duplicates++;
      }
    }

    if (duplicates > 0) {
      issues.push({
        id: generateId(),
        type: 'duplicate',
        severity: 'high',
        field: 'record',
        description: `Found ${duplicates} potential duplicate records`,
        affectedCount: duplicates,
        impact: duplicates * 5,
        autoFixable: false,
      });
    }

    const score = records.length > 0 
      ? Math.max(0, 100 - (duplicates / records.length) * 100)
      : 100;

    return { score, issues };
  }

  private validateField(value: unknown, rule: ValidationRule): boolean {
    switch (rule.type) {
      case 'required':
        return value !== undefined && value !== null && value !== '';

      case 'format':
        if (typeof value !== 'string') return false;
        const pattern = rule.params?.pattern as string;
        if (pattern === 'email') {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }
        if (pattern === 'date') {
          return !isNaN(Date.parse(value));
        }
        if (pattern === 'phone') {
          return /^[\d\s\-+()]+$/.test(value);
        }
        return true;

      case 'range':
        const num = Number(value);
        if (isNaN(num)) return false;
        const min = rule.params?.min as number | undefined;
        const max = rule.params?.max as number | undefined;
        if (min !== undefined && num < min) return false;
        if (max !== undefined && num > max) return false;
        return true;

      case 'enum':
        const allowed = rule.params?.values as unknown[];
        return allowed?.includes(value) ?? true;

      default:
        return true;
    }
  }

  private getPattern(value: string): string {
    // Simplify to detect general patterns
    return value
      .replace(/[a-z]/g, 'a')
      .replace(/[A-Z]/g, 'A')
      .replace(/[0-9]/g, '0')
      .substring(0, 10);
  }

  private getRecordKey(record: Record<string, unknown>): string {
    const keyFields = ['email', 'name', 'domain', 'id'];
    const parts: string[] = [];

    for (const field of keyFields) {
      if (record[field]) {
        parts.push(String(record[field]).toLowerCase().trim());
      }
    }

    return parts.join('|');
  }

  private deduplicateIssues(issues: DataIssue[]): DataIssue[] {
    const seen = new Set<string>();
    const unique: DataIssue[] = [];

    for (const issue of issues) {
      const key = `${issue.type}-${issue.field}-${issue.description}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(issue);
      } else {
        // Increment affected count on existing issue
        const existing = unique.find(i => 
          i.type === issue.type && i.field === issue.field && i.description === issue.description
        );
        if (existing) {
          existing.affectedCount++;
        }
      }
    }

    return unique;
  }

  private generateRecommendations(
    issues: DataIssue[],
    score: DataQualityScore
  ): DataQualityRecommendation[] {
    const recommendations: DataQualityRecommendation[] = [];

    // Low completeness
    if (score.completeness < 80) {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'fix',
        action: 'fill_required_fields',
        description: 'Address missing required fields to improve completeness',
        expectedImprovement: 15,
        effort: 'medium',
        automatable: false,
      });
    }

    // Low accuracy
    if (score.accuracy < 80) {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'validation',
        action: 'implement_validation',
        description: 'Implement input validation to prevent invalid data entry',
        expectedImprovement: 20,
        effort: 'medium',
        automatable: true,
      });
    }

    // Low consistency
    if (score.consistency < 80) {
      recommendations.push({
        id: generateId(),
        priority: 2,
        type: 'standardization',
        action: 'standardize_formats',
        description: 'Standardize data formats across records',
        expectedImprovement: 15,
        effort: 'low',
        automatable: true,
      });
    }

    // Low uniqueness (duplicates)
    if (score.uniqueness < 90) {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'deduplication',
        action: 'merge_duplicates',
        description: 'Identify and merge duplicate records',
        expectedImprovement: 10,
        effort: 'high',
        automatable: false,
      });
    }

    // Low timeliness
    if (score.timeliness < 70) {
      recommendations.push({
        id: generateId(),
        priority: 3,
        type: 'enrichment',
        action: 'refresh_stale_data',
        description: 'Refresh outdated records with current information',
        expectedImprovement: 10,
        effort: 'medium',
        automatable: false,
      });
    }

    // Auto-fixable issues
    const autoFixable = issues.filter(i => i.autoFixable);
    if (autoFixable.length > 0) {
      recommendations.push({
        id: generateId(),
        priority: 1,
        type: 'fix',
        action: 'auto_fix_issues',
        description: `Apply automatic fixes to ${autoFixable.length} issues`,
        expectedImprovement: 5,
        effort: 'low',
        automatable: true,
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private applyFix(issue: DataIssue): { success: boolean; change?: { field: string; before: unknown; after: unknown } } {
    // Placeholder for actual fix logic
    // In a real implementation, this would modify the source data
    if (issue.type === 'format' || issue.type === 'inconsistent') {
      return {
        success: true,
        change: {
          field: issue.field,
          before: 'original_value',
          after: 'standardized_value',
        },
      };
    }
    return { success: false };
  }

  private updateStats(analysis: DataQualityAnalysis): void {
    this.stats.totalAnalyses++;

    const scores = Array.from(this.entityScores.values());
    this.stats.avgScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.overall, 0) / scores.length)
      : 0;

    // Calculate improvement rate based on trend
    const improving = scores.filter(s => s.trend === 'improving').length;
    this.stats.improvementRate = scores.length > 0
      ? (improving / scores.length) * 100
      : 0;
  }
}

export default DataQualityAgent;
