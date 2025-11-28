/**
 * Cross Portal Learning Module
 * Aggregates learnings across multiple portals for collective intelligence
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Cross Portal Learning Types
// ============================================================

export interface PortalIntelligence {
  id: string;
  portalId: string;
  industry: string;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  metrics: PortalMetrics;
  patterns: PortalPattern[];
  dna: PortalDNA;
  lastUpdated: Date;
}

export interface PortalMetrics {
  dealVolume: number;
  winRate: number;
  avgDealSize: number;
  cycleTime: number;
  pipelineCoverage: number;
  leakageRate: number;
  recoveryRate: number;
}

export interface PortalPattern {
  id: string;
  type: string;
  frequency: number;
  impact: number;
  description: string;
}

export interface PortalDNA {
  salesMotion: 'inbound' | 'outbound' | 'hybrid';
  dealComplexity: 'transactional' | 'consultative' | 'enterprise';
  marketSegment: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface LearningInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'benchmark' | 'recommendation';
  source: string;
  applicableTo: string[];
  insight: string;
  confidence: number;
  evidence: string[];
  createdAt: Date;
}

export interface CrossPortalPattern {
  id: string;
  name: string;
  description: string;
  occurrences: number;
  avgImpact: number;
  industries: string[];
  portalsAffected: number;
  recommendations: string[];
}

export interface LearningConfig {
  minPortalsForPattern: number;
  confidenceThreshold: number;
  anonymizeData: boolean;
  shareInsights: boolean;
}

export interface LearningStats {
  portalsConnected: number;
  patternsDiscovered: number;
  insightsGenerated: number;
  avgConfidence: number;
}

// ============================================================
// Cross Portal Learning Implementation
// ============================================================

export class CrossPortalLearning {
  private portals: Map<string, PortalIntelligence> = new Map();
  private insights: Map<string, LearningInsight> = new Map();
  private crossPatterns: Map<string, CrossPortalPattern> = new Map();
  private config: LearningConfig;
  private stats: LearningStats;

  constructor(config?: Partial<LearningConfig>) {
    this.config = {
      minPortalsForPattern: 3,
      confidenceThreshold: 0.7,
      anonymizeData: true,
      shareInsights: true,
      ...config,
    };

    this.stats = {
      portalsConnected: 0,
      patternsDiscovered: 0,
      insightsGenerated: 0,
      avgConfidence: 0,
    };
  }

  /**
   * Register a portal for learning
   */
  registerPortal(
    portalId: string,
    industry: string,
    size: PortalIntelligence['size'],
    metrics: PortalMetrics,
    patterns: PortalPattern[],
    dna: Partial<PortalDNA>
  ): PortalIntelligence {
    const intelligence: PortalIntelligence = {
      id: generateId(),
      portalId: this.config.anonymizeData ? this.anonymizeId(portalId) : portalId,
      industry,
      size,
      metrics,
      patterns,
      dna: {
        salesMotion: dna.salesMotion || 'hybrid',
        dealComplexity: dna.dealComplexity || 'consultative',
        marketSegment: dna.marketSegment || [],
        strengths: dna.strengths || [],
        weaknesses: dna.weaknesses || [],
      },
      lastUpdated: new Date(),
    };

    this.portals.set(intelligence.id, intelligence);
    this.stats.portalsConnected = this.portals.size;

    // Trigger cross-portal learning
    this.analyzeCrossPortalPatterns();

    return intelligence;
  }

  /**
   * Update portal intelligence
   */
  updatePortal(
    intelligenceId: string,
    metrics: Partial<PortalMetrics>,
    patterns?: PortalPattern[]
  ): void {
    const portal = this.portals.get(intelligenceId);
    if (!portal) return;

    portal.metrics = { ...portal.metrics, ...metrics };
    if (patterns) {
      portal.patterns = patterns;
    }
    portal.lastUpdated = new Date();

    // Re-analyze patterns
    this.analyzeCrossPortalPatterns();
  }

  /**
   * Get insights for a portal
   */
  getInsightsForPortal(portalId: string): LearningInsight[] {
    const portal = Array.from(this.portals.values())
      .find(p => p.portalId === portalId || p.id === portalId);

    if (!portal) return [];

    return Array.from(this.insights.values())
      .filter(i => 
        i.applicableTo.includes(portal.industry) ||
        i.applicableTo.includes(portal.size) ||
        i.applicableTo.includes('all')
      )
      .filter(i => i.confidence >= this.config.confidenceThreshold);
  }

  /**
   * Get cross-portal patterns
   */
  getCrossPortalPatterns(): CrossPortalPattern[] {
    return Array.from(this.crossPatterns.values())
      .sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Generate benchmark comparison
   */
  generateBenchmark(portalId: string): {
    portal: PortalMetrics;
    industryAvg: PortalMetrics;
    percentile: Record<string, number>;
    recommendations: string[];
  } {
    const portal = Array.from(this.portals.values())
      .find(p => p.portalId === portalId || p.id === portalId);

    if (!portal) {
      throw new Error('Portal not found');
    }

    // Calculate industry averages
    const sameIndustry = Array.from(this.portals.values())
      .filter(p => p.industry === portal.industry);

    const industryAvg = this.calculateAverageMetrics(sameIndustry);
    const percentile = this.calculatePercentiles(portal.metrics, sameIndustry);
    const recommendations = this.generateBenchmarkRecommendations(portal, industryAvg, percentile);

    return {
      portal: portal.metrics,
      industryAvg,
      percentile,
      recommendations,
    };
  }

  /**
   * Get portal DNA analysis
   */
  analyzeDNA(portalId: string): {
    dna: PortalDNA;
    similarPortals: number;
    uniqueStrengths: string[];
    improvementAreas: string[];
  } {
    const portal = Array.from(this.portals.values())
      .find(p => p.portalId === portalId || p.id === portalId);

    if (!portal) {
      throw new Error('Portal not found');
    }

    // Find similar portals
    const similar = Array.from(this.portals.values())
      .filter(p => p.id !== portal.id)
      .filter(p => 
        p.dna.salesMotion === portal.dna.salesMotion ||
        p.dna.dealComplexity === portal.dna.dealComplexity
      );

    // Find unique strengths (strengths not common in similar portals)
    const commonStrengths = similar.flatMap(p => p.dna.strengths);
    const uniqueStrengths = portal.dna.strengths.filter(
      s => !commonStrengths.includes(s) || commonStrengths.filter(c => c === s).length < similar.length * 0.3
    );

    // Identify improvement areas
    const topPerformers = similar
      .filter(p => p.metrics.winRate > portal.metrics.winRate)
      .flatMap(p => p.dna.strengths);
    
    const improvementAreas = [...new Set(topPerformers)]
      .filter(s => !portal.dna.strengths.includes(s))
      .slice(0, 5);

    return {
      dna: portal.dna,
      similarPortals: similar.length,
      uniqueStrengths,
      improvementAreas,
    };
  }

  /**
   * Get statistics
   */
  getStats(): LearningStats {
    return { ...this.stats };
  }

  // Private methods

  private anonymizeId(id: string): string {
    // Simple anonymization - in production, use proper hashing
    return `portal_${generateId().substring(0, 8)}`;
  }

  private analyzeCrossPortalPatterns(): void {
    const patternCounts = new Map<string, {
      count: number;
      impacts: number[];
      industries: Set<string>;
      portals: Set<string>;
    }>();

    // Aggregate patterns across portals
    for (const portal of this.portals.values()) {
      for (const pattern of portal.patterns) {
        if (!patternCounts.has(pattern.type)) {
          patternCounts.set(pattern.type, {
            count: 0,
            impacts: [],
            industries: new Set(),
            portals: new Set(),
          });
        }
        const data = patternCounts.get(pattern.type)!;
        data.count++;
        data.impacts.push(pattern.impact);
        data.industries.add(portal.industry);
        data.portals.add(portal.id);
      }
    }

    // Create cross-portal patterns
    for (const [type, data] of patternCounts) {
      if (data.count >= this.config.minPortalsForPattern) {
        const avgImpact = data.impacts.reduce((a, b) => a + b, 0) / data.impacts.length;

        const crossPattern: CrossPortalPattern = {
          id: generateId(),
          name: type,
          description: `Pattern detected across ${data.portals.size} portals`,
          occurrences: data.count,
          avgImpact,
          industries: Array.from(data.industries),
          portalsAffected: data.portals.size,
          recommendations: this.generatePatternRecommendations(type, avgImpact),
        };

        this.crossPatterns.set(type, crossPattern);

        // Generate insight
        this.createInsight(crossPattern);
      }
    }

    this.stats.patternsDiscovered = this.crossPatterns.size;
  }

  private createInsight(pattern: CrossPortalPattern): void {
    const insight: LearningInsight = {
      id: generateId(),
      type: 'pattern',
      source: 'cross_portal_analysis',
      applicableTo: pattern.industries.length > 3 ? ['all'] : pattern.industries,
      insight: `${pattern.name} pattern affects ${pattern.portalsAffected} portals with avg impact of ${pattern.avgImpact.toFixed(2)}`,
      confidence: Math.min(0.95, 0.5 + pattern.portalsAffected / 20),
      evidence: pattern.recommendations,
      createdAt: new Date(),
    };

    this.insights.set(insight.id, insight);
    this.stats.insightsGenerated = this.insights.size;

    // Update average confidence
    const confidences = Array.from(this.insights.values()).map(i => i.confidence);
    this.stats.avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  private calculateAverageMetrics(portals: PortalIntelligence[]): PortalMetrics {
    if (portals.length === 0) {
      return {
        dealVolume: 0,
        winRate: 0,
        avgDealSize: 0,
        cycleTime: 0,
        pipelineCoverage: 0,
        leakageRate: 0,
        recoveryRate: 0,
      };
    }

    return {
      dealVolume: Math.round(portals.reduce((sum, p) => sum + p.metrics.dealVolume, 0) / portals.length),
      winRate: portals.reduce((sum, p) => sum + p.metrics.winRate, 0) / portals.length,
      avgDealSize: Math.round(portals.reduce((sum, p) => sum + p.metrics.avgDealSize, 0) / portals.length),
      cycleTime: Math.round(portals.reduce((sum, p) => sum + p.metrics.cycleTime, 0) / portals.length),
      pipelineCoverage: portals.reduce((sum, p) => sum + p.metrics.pipelineCoverage, 0) / portals.length,
      leakageRate: portals.reduce((sum, p) => sum + p.metrics.leakageRate, 0) / portals.length,
      recoveryRate: portals.reduce((sum, p) => sum + p.metrics.recoveryRate, 0) / portals.length,
    };
  }

  private calculatePercentiles(
    metrics: PortalMetrics,
    allPortals: PortalIntelligence[]
  ): Record<string, number> {
    const percentiles: Record<string, number> = {};

    for (const key of Object.keys(metrics) as (keyof PortalMetrics)[]) {
      const values = allPortals.map(p => p.metrics[key]).sort((a, b) => a - b);
      const value = metrics[key];
      const below = values.filter(v => v < value).length;
      percentiles[key] = Math.round((below / values.length) * 100);
    }

    return percentiles;
  }

  private generateBenchmarkRecommendations(
    portal: PortalIntelligence,
    industryAvg: PortalMetrics,
    percentiles: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    if (percentiles.winRate < 50) {
      recommendations.push('Win rate below industry median - focus on sales effectiveness');
    }

    if (percentiles.cycleTime > 70) {
      recommendations.push('Cycle time longer than most peers - streamline sales process');
    }

    if (percentiles.leakageRate > 60) {
      recommendations.push('Higher leakage rate than peers - improve revenue capture');
    }

    if (percentiles.pipelineCoverage < 40) {
      recommendations.push('Pipeline coverage below peers - increase lead generation');
    }

    if (portal.metrics.recoveryRate < industryAvg.recoveryRate) {
      recommendations.push('Recovery rate below average - enhance recovery processes');
    }

    return recommendations;
  }

  private generatePatternRecommendations(type: string, impact: number): string[] {
    const recommendations: string[] = [];

    if (impact > 0.5) {
      recommendations.push(`Address ${type} pattern urgently - high impact detected`);
    }

    recommendations.push(`Implement automated detection for ${type} pattern`);
    recommendations.push(`Create playbook for handling ${type} situations`);

    return recommendations;
  }
}

export default CrossPortalLearning;
