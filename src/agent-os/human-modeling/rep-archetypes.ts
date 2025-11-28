/**
 * Rep Archetypes Module
 * Categorizes sales and CS representatives into behavioral archetypes
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Rep Archetypes Types
// ============================================================

export interface Archetype {
  id: string;
  name: string;
  description: string;
  traits: ArchetypeTraits;
  strengths: string[];
  weaknesses: string[];
  optimalDeals: string[];
  recommendations: string[];
}

export interface ArchetypeTraits {
  aggressiveness: number;
  methodical: number;
  relationship: number;
  technical: number;
  responsive: number;
  hunter: number;
  farmer: number;
  closer: number;
}

export interface ArchetypeMatch {
  userId: string;
  userName: string;
  primaryArchetype: string;
  secondaryArchetype: string;
  confidence: number;
  traitScores: ArchetypeTraits;
  recommendations: string[];
}

export interface TeamComposition {
  archetypeDistribution: Record<string, number>;
  gaps: string[];
  strengths: string[];
  recommendations: string[];
  balanceScore: number;
}

export interface ArchetypeConfig {
  minConfidence: number;
  traitWeights: Record<string, number>;
}

export interface ArchetypeStats {
  profilesMatched: number;
  dominantArchetype: string;
  avgConfidence: number;
}

// ============================================================
// Predefined Archetypes
// ============================================================

const PREDEFINED_ARCHETYPES: Archetype[] = [
  {
    id: 'hunter',
    name: 'The Hunter',
    description: 'Aggressive prospector who excels at finding and pursuing new opportunities',
    traits: {
      aggressiveness: 0.9,
      methodical: 0.4,
      relationship: 0.5,
      technical: 0.4,
      responsive: 0.7,
      hunter: 0.95,
      farmer: 0.2,
      closer: 0.7,
    },
    strengths: ['New business development', 'Cold outreach', 'Pipeline generation', 'Competitive selling'],
    weaknesses: ['Account management', 'Long-term relationships', 'Complex implementations'],
    optimalDeals: ['New logos', 'Competitive takeouts', 'High velocity deals'],
    recommendations: ['Pair with farmer for expansion', 'Focus on early-stage pipeline', 'Set prospecting quotas'],
  },
  {
    id: 'farmer',
    name: 'The Farmer',
    description: 'Relationship builder focused on growing existing accounts',
    traits: {
      aggressiveness: 0.3,
      methodical: 0.7,
      relationship: 0.95,
      technical: 0.5,
      responsive: 0.8,
      hunter: 0.2,
      farmer: 0.95,
      closer: 0.5,
    },
    strengths: ['Account expansion', 'Customer retention', 'Upselling', 'Relationship building'],
    weaknesses: ['New business hunting', 'Aggressive negotiations', 'Short sales cycles'],
    optimalDeals: ['Expansion opportunities', 'Renewals', 'Strategic accounts'],
    recommendations: ['Assign existing accounts', 'Focus on NRR goals', 'Partner with hunters for new business'],
  },
  {
    id: 'closer',
    name: 'The Closer',
    description: 'Expert negotiator who excels at sealing deals',
    traits: {
      aggressiveness: 0.8,
      methodical: 0.6,
      relationship: 0.6,
      technical: 0.5,
      responsive: 0.9,
      hunter: 0.5,
      farmer: 0.4,
      closer: 0.95,
    },
    strengths: ['Negotiation', 'Objection handling', 'Deal acceleration', 'Executive engagement'],
    weaknesses: ['Early-stage nurturing', 'Technical deep dives', 'Long-term planning'],
    optimalDeals: ['Late-stage opportunities', 'Stalled deals', 'Complex negotiations'],
    recommendations: ['Bring in for final stages', 'Use for deal rescue', 'Pair with technical resource'],
  },
  {
    id: 'consultant',
    name: 'The Consultant',
    description: 'Technical expert who guides customers through complex solutions',
    traits: {
      aggressiveness: 0.4,
      methodical: 0.9,
      relationship: 0.7,
      technical: 0.95,
      responsive: 0.6,
      hunter: 0.3,
      farmer: 0.6,
      closer: 0.5,
    },
    strengths: ['Technical selling', 'Solution design', 'Complex implementations', 'Value engineering'],
    weaknesses: ['High-velocity sales', 'Aggressive prospecting', 'Quick closing'],
    optimalDeals: ['Enterprise deals', 'Technical evaluations', 'Complex requirements'],
    recommendations: ['Assign technical accounts', 'Partner with closer for negotiations', 'Lead proof of concepts'],
  },
  {
    id: 'challenger',
    name: 'The Challenger',
    description: 'Thought leader who teaches customers new perspectives',
    traits: {
      aggressiveness: 0.7,
      methodical: 0.6,
      relationship: 0.5,
      technical: 0.7,
      responsive: 0.5,
      hunter: 0.6,
      farmer: 0.4,
      closer: 0.7,
    },
    strengths: ['Insight selling', 'Reframing problems', 'Executive conversations', 'Differentiation'],
    weaknesses: ['Transactional deals', 'Quick turnarounds', 'Relationship-based sales'],
    optimalDeals: ['Strategic accounts', 'Complex problems', 'Innovative solutions'],
    recommendations: ['Lead strategic initiatives', 'Develop thought leadership content', 'Train team on challenger approach'],
  },
  {
    id: 'responder',
    name: 'The Responder',
    description: 'Highly responsive rep who excels at inbound and service-led growth',
    traits: {
      aggressiveness: 0.3,
      methodical: 0.5,
      relationship: 0.8,
      technical: 0.5,
      responsive: 0.95,
      hunter: 0.3,
      farmer: 0.7,
      closer: 0.4,
    },
    strengths: ['Fast response times', 'Customer service', 'Inbound conversion', 'Product demonstrations'],
    weaknesses: ['Outbound prospecting', 'Long enterprise cycles', 'Aggressive negotiations'],
    optimalDeals: ['Inbound leads', 'Product-led opportunities', 'SMB segments'],
    recommendations: ['Handle inbound queue', 'Set response time SLAs', 'Support PLG motions'],
  },
];

// ============================================================
// Rep Archetypes Implementation
// ============================================================

export class RepArchetypes {
  private archetypes: Map<string, Archetype> = new Map();
  private matches: Map<string, ArchetypeMatch> = new Map();
  private config: ArchetypeConfig;
  private stats: ArchetypeStats;

  constructor(config?: Partial<ArchetypeConfig>) {
    this.config = {
      minConfidence: 0.6,
      traitWeights: {
        aggressiveness: 0.15,
        methodical: 0.1,
        relationship: 0.15,
        technical: 0.1,
        responsive: 0.15,
        hunter: 0.15,
        farmer: 0.1,
        closer: 0.1,
      },
      ...config,
    };

    // Initialize with predefined archetypes
    for (const archetype of PREDEFINED_ARCHETYPES) {
      this.archetypes.set(archetype.id, archetype);
    }

    this.stats = {
      profilesMatched: 0,
      dominantArchetype: '',
      avgConfidence: 0,
    };
  }

  /**
   * Match a user to archetypes based on their behavior data
   */
  matchArchetype(
    userId: string,
    userName: string,
    behaviorData: {
      dealsWon: number;
      dealsLost: number;
      newLogos: number;
      expansions: number;
      avgDealSize: number;
      avgCycleTime: number;
      responseTime: number;
      technicalDeals: number;
      activitiesPerDay: number;
    }
  ): ArchetypeMatch {
    // Calculate trait scores from behavior data
    const traitScores = this.calculateTraitScores(behaviorData);

    // Find best matching archetypes
    const archetypeScores: Array<{ archetype: Archetype; score: number }> = [];

    for (const archetype of this.archetypes.values()) {
      const score = this.calculateArchetypeMatch(traitScores, archetype.traits);
      archetypeScores.push({ archetype, score });
    }

    archetypeScores.sort((a, b) => b.score - a.score);

    const primary = archetypeScores[0];
    const secondary = archetypeScores[1];

    const recommendations = this.generateMatchRecommendations(
      primary.archetype,
      secondary.archetype,
      traitScores
    );

    const match: ArchetypeMatch = {
      userId,
      userName,
      primaryArchetype: primary.archetype.name,
      secondaryArchetype: secondary.archetype.name,
      confidence: primary.score,
      traitScores,
      recommendations,
    };

    this.matches.set(userId, match);
    this.updateStats(match);

    return match;
  }

  /**
   * Get archetype by ID
   */
  getArchetype(id: string): Archetype | undefined {
    return this.archetypes.get(id);
  }

  /**
   * Get all archetypes
   */
  getAllArchetypes(): Archetype[] {
    return Array.from(this.archetypes.values());
  }

  /**
   * Get match for user
   */
  getMatch(userId: string): ArchetypeMatch | undefined {
    return this.matches.get(userId);
  }

  /**
   * Analyze team composition
   */
  analyzeTeamComposition(userIds: string[]): TeamComposition {
    const distribution: Record<string, number> = {};
    const matches = userIds.map(id => this.matches.get(id)).filter(Boolean) as ArchetypeMatch[];

    // Count archetype distribution
    for (const match of matches) {
      distribution[match.primaryArchetype] = (distribution[match.primaryArchetype] || 0) + 1;
    }

    // Identify gaps
    const gaps: string[] = [];
    const strengths: string[] = [];
    const idealDistribution = ['The Hunter', 'The Farmer', 'The Closer', 'The Consultant'];

    for (const archetype of idealDistribution) {
      if (!distribution[archetype] || distribution[archetype] === 0) {
        gaps.push(`Missing ${archetype} archetype`);
      }
    }

    // Identify strengths (over-represented archetypes)
    const totalMatches = matches.length;
    for (const [archetype, count] of Object.entries(distribution)) {
      const percentage = (count / totalMatches) * 100;
      if (percentage > 40) {
        strengths.push(`Strong ${archetype} presence (${percentage.toFixed(0)}%)`);
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (gaps.length > 0) {
      recommendations.push(`Consider hiring or developing ${gaps.join(', ')}`);
    }

    if (!distribution['The Hunter'] || distribution['The Hunter'] < totalMatches * 0.2) {
      recommendations.push('Pipeline may suffer - add hunting capacity');
    }

    if (!distribution['The Farmer'] || distribution['The Farmer'] < totalMatches * 0.2) {
      recommendations.push('Expansion revenue at risk - add account management focus');
    }

    // Calculate balance score
    const expectedPerArchetype = totalMatches / 4;
    let variance = 0;
    for (const count of Object.values(distribution)) {
      variance += Math.pow(count - expectedPerArchetype, 2);
    }
    const balanceScore = Math.max(0, 100 - (Math.sqrt(variance / 4) / expectedPerArchetype) * 50);

    return {
      archetypeDistribution: distribution,
      gaps,
      strengths,
      recommendations,
      balanceScore: Math.round(balanceScore),
    };
  }

  /**
   * Get optimal deal assignment
   */
  getOptimalAssignment(
    dealType: string,
    dealSize: number,
    complexity: 'low' | 'medium' | 'high'
  ): string[] {
    const idealArchetypes: string[] = [];

    if (dealType === 'new_logo') {
      idealArchetypes.push('The Hunter');
      if (complexity === 'high') idealArchetypes.push('The Consultant');
    } else if (dealType === 'expansion' || dealType === 'renewal') {
      idealArchetypes.push('The Farmer');
      if (dealSize > 50000) idealArchetypes.push('The Closer');
    } else if (dealType === 'competitive') {
      idealArchetypes.push('The Challenger');
      idealArchetypes.push('The Closer');
    } else if (dealType === 'technical') {
      idealArchetypes.push('The Consultant');
      if (complexity === 'high') idealArchetypes.push('The Challenger');
    }

    // Find reps matching these archetypes
    const assignees: string[] = [];
    for (const [userId, match] of this.matches) {
      if (idealArchetypes.includes(match.primaryArchetype)) {
        assignees.push(userId);
      }
    }

    return assignees;
  }

  /**
   * Get statistics
   */
  getStats(): ArchetypeStats {
    return { ...this.stats };
  }

  // Private methods

  private calculateTraitScores(behaviorData: {
    dealsWon: number;
    dealsLost: number;
    newLogos: number;
    expansions: number;
    avgDealSize: number;
    avgCycleTime: number;
    responseTime: number;
    technicalDeals: number;
    activitiesPerDay: number;
  }): ArchetypeTraits {
    const totalDeals = behaviorData.dealsWon + behaviorData.dealsLost;
    const winRate = totalDeals > 0 ? behaviorData.dealsWon / totalDeals : 0.5;

    return {
      aggressiveness: Math.min(1, behaviorData.activitiesPerDay / 50),
      methodical: Math.min(1, (100 - behaviorData.avgCycleTime) / 100 + winRate),
      relationship: Math.min(1, behaviorData.expansions / Math.max(behaviorData.newLogos, 1)),
      technical: Math.min(1, behaviorData.technicalDeals / Math.max(totalDeals, 1)),
      responsive: Math.min(1, 1 - behaviorData.responseTime / 120),
      hunter: Math.min(1, behaviorData.newLogos / Math.max(totalDeals, 1)),
      farmer: Math.min(1, behaviorData.expansions / Math.max(totalDeals, 1)),
      closer: Math.min(1, winRate + 0.2),
    };
  }

  private calculateArchetypeMatch(
    traitScores: ArchetypeTraits,
    archetypeTraits: ArchetypeTraits
  ): number {
    let totalWeight = 0;
    let weightedScore = 0;

    for (const [trait, weight] of Object.entries(this.config.traitWeights)) {
      const userScore = traitScores[trait as keyof ArchetypeTraits];
      const archetypeScore = archetypeTraits[trait as keyof ArchetypeTraits];
      
      // Similarity score (1 - absolute difference)
      const similarity = 1 - Math.abs(userScore - archetypeScore);
      
      weightedScore += similarity * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  private generateMatchRecommendations(
    primary: Archetype,
    secondary: Archetype,
    traitScores: ArchetypeTraits
  ): string[] {
    const recommendations = [...primary.recommendations];

    // Add development recommendations based on weak traits
    const weakTraits = Object.entries(traitScores)
      .filter(([_, score]) => score < 0.4)
      .map(([trait]) => trait);

    if (weakTraits.includes('aggressiveness') && primary.id !== 'farmer') {
      recommendations.push('Consider training on assertive selling techniques');
    }

    if (weakTraits.includes('responsive')) {
      recommendations.push('Implement response time monitoring and improvement');
    }

    if (weakTraits.includes('technical') && traitScores.technical < 0.3) {
      recommendations.push('Pair with technical resources for complex deals');
    }

    // Leverage secondary archetype
    recommendations.push(`Leverage ${secondary.name} tendencies for versatility`);

    return recommendations;
  }

  private updateStats(match: ArchetypeMatch): void {
    this.stats.profilesMatched = this.matches.size;

    // Calculate dominant archetype
    const archetypeCounts: Record<string, number> = {};
    for (const m of this.matches.values()) {
      archetypeCounts[m.primaryArchetype] = (archetypeCounts[m.primaryArchetype] || 0) + 1;
    }

    let maxCount = 0;
    for (const [archetype, count] of Object.entries(archetypeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        this.stats.dominantArchetype = archetype;
      }
    }

    // Calculate average confidence
    const confidences = Array.from(this.matches.values()).map(m => m.confidence);
    this.stats.avgConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;
  }
}

export default RepArchetypes;
