/**
 * Mid-Term Memory (MTM) Module
 * Pattern storage and cluster signatures for intermediate-term retention
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// MTM Types
// ============================================================

export interface MTMPattern {
  id: string;
  type: string;
  signature: PatternSignature;
  instances: PatternInstance[];
  frequency: number;
  confidence: number;
  strength: number;
  metadata: PatternMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}

export interface PatternSignature {
  features: Feature[];
  hash: string;
  dimensionality: number;
}

export interface Feature {
  name: string;
  value: unknown;
  weight: number;
  type: 'numeric' | 'categorical' | 'temporal' | 'binary';
}

export interface PatternInstance {
  id: string;
  data: unknown;
  matchScore: number;
  observedAt: Date;
}

export interface PatternMetadata {
  source: string;
  category: string;
  tags: string[];
  leakTypes: string[];
  description?: string;
}

export interface Cluster {
  id: string;
  name: string;
  centroid: Feature[];
  members: string[];
  cohesion: number;
  separation: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MTMConfig {
  maxPatterns: number;
  maxInstancesPerPattern: number;
  retentionDays: number;
  minFrequency: number;
  minConfidence: number;
  consolidationInterval: number;
  similarityThreshold: number;
}

export interface MTMStats {
  totalPatterns: number;
  totalInstances: number;
  totalClusters: number;
  avgConfidence: number;
  avgFrequency: number;
  memoryUsage: number;
}

// ============================================================
// MTM Implementation
// ============================================================

export class MidTermMemory {
  private patterns: Map<string, MTMPattern> = new Map();
  private clusters: Map<string, Cluster> = new Map();
  private signatureIndex: Map<string, string> = new Map();
  private config: MTMConfig;
  private consolidationTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<MTMConfig>) {
    this.config = {
      maxPatterns: 10000,
      maxInstancesPerPattern: 100,
      retentionDays: 30,
      minFrequency: 3,
      minConfidence: 0.5,
      consolidationInterval: 3600000, // 1 hour
      similarityThreshold: 0.85,
      ...config,
    };

    this.startConsolidation();
  }

  /**
   * Store a pattern
   */
  storePattern(
    type: string,
    features: Feature[],
    metadata?: Partial<PatternMetadata>
  ): MTMPattern {
    // Generate signature
    const signature = this.generateSignature(features);

    // Check for existing similar pattern
    const existing = this.findSimilarPattern(signature);
    if (existing) {
      return this.reinforcePattern(existing.id, features);
    }

    // Create new pattern
    const pattern: MTMPattern = {
      id: generateId(),
      type,
      signature,
      instances: [],
      frequency: 1,
      confidence: 0.5,
      strength: 1,
      metadata: {
        source: 'observation',
        category: type,
        tags: [],
        leakTypes: [],
        ...metadata,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSeenAt: new Date(),
    };

    // Check capacity
    if (this.patterns.size >= this.config.maxPatterns) {
      this.evictWeakestPattern();
    }

    this.patterns.set(pattern.id, pattern);
    this.signatureIndex.set(signature.hash, pattern.id);

    return pattern;
  }

  /**
   * Reinforce an existing pattern
   */
  reinforcePattern(patternId: string, features?: Feature[]): MTMPattern {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      throw new Error(`Pattern '${patternId}' not found`);
    }

    pattern.frequency++;
    pattern.lastSeenAt = new Date();
    pattern.updatedAt = new Date();

    // Update strength (decay function with reinforcement)
    pattern.strength = Math.min(100, pattern.strength * 1.1 + 1);

    // Update confidence based on frequency
    pattern.confidence = Math.min(1, pattern.frequency / (pattern.frequency + 10));

    // Add instance if features provided
    if (features) {
      const instance: PatternInstance = {
        id: generateId(),
        data: features,
        matchScore: this.calculateMatchScore(pattern.signature.features, features),
        observedAt: new Date(),
      };

      pattern.instances.push(instance);

      // Trim instances if over limit
      if (pattern.instances.length > this.config.maxInstancesPerPattern) {
        pattern.instances = pattern.instances.slice(-this.config.maxInstancesPerPattern);
      }

      // Update signature with new features (rolling average)
      this.updateSignature(pattern, features);
    }

    return pattern;
  }

  /**
   * Query patterns by type
   */
  queryByType(type: string): MTMPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.type === type)
      .sort((a, b) => b.strength - a.strength);
  }

  /**
   * Query patterns by similarity
   */
  queryBySimilarity(features: Feature[], threshold?: number): MTMPattern[] {
    const minSimilarity = threshold || this.config.similarityThreshold;
    const matches: { pattern: MTMPattern; similarity: number }[] = [];

    for (const [_, pattern] of this.patterns) {
      const similarity = this.calculateSimilarity(pattern.signature.features, features);
      if (similarity >= minSimilarity) {
        matches.push({ pattern, similarity });
      }
    }

    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .map(m => m.pattern);
  }

  /**
   * Query patterns by metadata
   */
  queryByMetadata(query: Partial<PatternMetadata>): MTMPattern[] {
    return Array.from(this.patterns.values()).filter(pattern => {
      if (query.source && pattern.metadata.source !== query.source) return false;
      if (query.category && pattern.metadata.category !== query.category) return false;
      if (query.tags && !query.tags.every(t => pattern.metadata.tags.includes(t))) return false;
      if (query.leakTypes && !query.leakTypes.some(lt => pattern.metadata.leakTypes.includes(lt))) return false;
      return true;
    });
  }

  /**
   * Get strongest patterns
   */
  getStrongestPatterns(limit: number = 10): MTMPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.strength - a.strength)
      .slice(0, limit);
  }

  /**
   * Create a cluster
   */
  createCluster(name: string, patternIds: string[]): Cluster {
    const members = patternIds.filter(id => this.patterns.has(id));
    if (members.length === 0) {
      throw new Error('No valid patterns for cluster');
    }

    // Calculate centroid
    const centroid = this.calculateCentroid(members);

    const cluster: Cluster = {
      id: generateId(),
      name,
      centroid,
      members,
      cohesion: this.calculateCohesion(members, centroid),
      separation: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.clusters.set(cluster.id, cluster);

    // Calculate separation from other clusters
    this.updateClusterSeparations();

    return cluster;
  }

  /**
   * Add pattern to cluster
   */
  addToCluster(clusterId: string, patternId: string): Cluster {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) throw new Error(`Cluster '${clusterId}' not found`);
    if (!this.patterns.has(patternId)) throw new Error(`Pattern '${patternId}' not found`);

    if (!cluster.members.includes(patternId)) {
      cluster.members.push(patternId);
      cluster.centroid = this.calculateCentroid(cluster.members);
      cluster.cohesion = this.calculateCohesion(cluster.members, cluster.centroid);
      cluster.updatedAt = new Date();
      this.updateClusterSeparations();
    }

    return cluster;
  }

  /**
   * Get patterns in cluster
   */
  getClusterPatterns(clusterId: string): MTMPattern[] {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return [];

    return cluster.members
      .map(id => this.patterns.get(id))
      .filter((p): p is MTMPattern => p !== undefined);
  }

  /**
   * Find cluster for pattern
   */
  findClusterForPattern(features: Feature[]): Cluster | null {
    let bestCluster: Cluster | null = null;
    let bestSimilarity = 0;

    for (const [_, cluster] of this.clusters) {
      const similarity = this.calculateSimilarity(cluster.centroid, features);
      if (similarity > bestSimilarity && similarity >= this.config.similarityThreshold) {
        bestSimilarity = similarity;
        bestCluster = cluster;
      }
    }

    return bestCluster;
  }

  /**
   * Get pattern by ID
   */
  getPattern(patternId: string): MTMPattern | undefined {
    return this.patterns.get(patternId);
  }

  /**
   * Get cluster by ID
   */
  getCluster(clusterId: string): Cluster | undefined {
    return this.clusters.get(clusterId);
  }

  /**
   * Get all patterns
   */
  getPatterns(): MTMPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get all clusters
   */
  getClusters(): Cluster[] {
    return Array.from(this.clusters.values());
  }

  /**
   * Remove pattern
   */
  removePattern(patternId: string): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return false;

    this.signatureIndex.delete(pattern.signature.hash);
    this.patterns.delete(patternId);

    // Remove from clusters
    for (const [_, cluster] of this.clusters) {
      const index = cluster.members.indexOf(patternId);
      if (index !== -1) {
        cluster.members.splice(index, 1);
        cluster.centroid = this.calculateCentroid(cluster.members);
        cluster.cohesion = this.calculateCohesion(cluster.members, cluster.centroid);
      }
    }

    return true;
  }

  /**
   * Get statistics
   */
  getStats(): MTMStats {
    const patterns = Array.from(this.patterns.values());
    const totalInstances = patterns.reduce((sum, p) => sum + p.instances.length, 0);
    const avgConfidence = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      : 0;
    const avgFrequency = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.frequency, 0) / patterns.length
      : 0;

    return {
      totalPatterns: patterns.length,
      totalInstances,
      totalClusters: this.clusters.size,
      avgConfidence,
      avgFrequency,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Stop consolidation timer
   */
  destroy(): void {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
      this.consolidationTimer = null;
    }
  }

  // Private methods

  private generateSignature(features: Feature[]): PatternSignature {
    const sortedFeatures = [...features].sort((a, b) => a.name.localeCompare(b.name));
    const hash = this.hashFeatures(sortedFeatures);

    return {
      features: sortedFeatures,
      hash,
      dimensionality: sortedFeatures.length,
    };
  }

  private hashFeatures(features: Feature[]): string {
    const str = features.map(f => `${f.name}:${f.type}:${String(f.value)}`).join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private findSimilarPattern(signature: PatternSignature): MTMPattern | null {
    // Check exact hash match first
    const exactId = this.signatureIndex.get(signature.hash);
    if (exactId) return this.patterns.get(exactId) || null;

    // Check similarity
    for (const [_, pattern] of this.patterns) {
      const similarity = this.calculateSimilarity(pattern.signature.features, signature.features);
      if (similarity >= this.config.similarityThreshold) {
        return pattern;
      }
    }

    return null;
  }

  private calculateSimilarity(features1: Feature[], features2: Feature[]): number {
    if (features1.length === 0 || features2.length === 0) return 0;

    let matches = 0;
    let total = 0;

    const map2 = new Map(features2.map(f => [f.name, f]));

    for (const f1 of features1) {
      const f2 = map2.get(f1.name);
      if (f2) {
        const similarity = this.featureSimilarity(f1, f2);
        matches += similarity * f1.weight;
        total += f1.weight;
      }
    }

    return total > 0 ? matches / total : 0;
  }

  private featureSimilarity(f1: Feature, f2: Feature): number {
    if (f1.type !== f2.type) return 0;

    switch (f1.type) {
      case 'numeric':
        const n1 = Number(f1.value);
        const n2 = Number(f2.value);
        const maxVal = Math.max(Math.abs(n1), Math.abs(n2), 1);
        return 1 - Math.abs(n1 - n2) / maxVal;

      case 'categorical':
      case 'binary':
        return f1.value === f2.value ? 1 : 0;

      case 'temporal':
        const t1 = new Date(f1.value as string).getTime();
        const t2 = new Date(f2.value as string).getTime();
        const maxTime = Math.max(t1, t2, 1);
        return 1 - Math.abs(t1 - t2) / maxTime;

      default:
        return f1.value === f2.value ? 1 : 0;
    }
  }

  private calculateMatchScore(patternFeatures: Feature[], instanceFeatures: Feature[]): number {
    return this.calculateSimilarity(patternFeatures, instanceFeatures);
  }

  private updateSignature(pattern: MTMPattern, features: Feature[]): void {
    // Rolling average for numeric features
    for (const newFeature of features) {
      const existing = pattern.signature.features.find(f => f.name === newFeature.name);
      if (existing && existing.type === 'numeric' && typeof existing.value === 'number') {
        existing.value = existing.value + (Number(newFeature.value) - existing.value) / pattern.frequency;
      }
    }

    // Update hash
    pattern.signature.hash = this.hashFeatures(pattern.signature.features);
  }

  private calculateCentroid(memberIds: string[]): Feature[] {
    if (memberIds.length === 0) return [];

    const featureAccum: Map<string, { sum: number; count: number; type: Feature['type']; weight: number }> = new Map();

    for (const id of memberIds) {
      const pattern = this.patterns.get(id);
      if (!pattern) continue;

      for (const feature of pattern.signature.features) {
        if (feature.type === 'numeric') {
          const existing = featureAccum.get(feature.name);
          if (existing) {
            existing.sum += Number(feature.value);
            existing.count++;
          } else {
            featureAccum.set(feature.name, {
              sum: Number(feature.value),
              count: 1,
              type: feature.type,
              weight: feature.weight,
            });
          }
        }
      }
    }

    return Array.from(featureAccum.entries()).map(([name, data]) => ({
      name,
      value: data.sum / data.count,
      weight: data.weight,
      type: data.type,
    }));
  }

  private calculateCohesion(memberIds: string[], centroid: Feature[]): number {
    if (memberIds.length <= 1) return 1;

    let totalDistance = 0;
    for (const id of memberIds) {
      const pattern = this.patterns.get(id);
      if (pattern) {
        totalDistance += 1 - this.calculateSimilarity(centroid, pattern.signature.features);
      }
    }

    return 1 - (totalDistance / memberIds.length);
  }

  private updateClusterSeparations(): void {
    const clusterArr = Array.from(this.clusters.values());

    for (let i = 0; i < clusterArr.length; i++) {
      let minSeparation = Infinity;

      for (let j = 0; j < clusterArr.length; j++) {
        if (i === j) continue;
        const distance = 1 - this.calculateSimilarity(clusterArr[i].centroid, clusterArr[j].centroid);
        if (distance < minSeparation) {
          minSeparation = distance;
        }
      }

      clusterArr[i].separation = minSeparation === Infinity ? 1 : minSeparation;
    }
  }

  private evictWeakestPattern(): void {
    let weakest: { id: string; strength: number } | null = null;

    for (const [id, pattern] of this.patterns) {
      if (!weakest || pattern.strength < weakest.strength) {
        weakest = { id, strength: pattern.strength };
      }
    }

    if (weakest) {
      this.removePattern(weakest.id);
    }
  }

  private startConsolidation(): void {
    this.consolidationTimer = setInterval(() => {
      this.consolidate();
    }, this.config.consolidationInterval);
  }

  private consolidate(): void {
    const now = new Date();
    const retentionCutoff = new Date(now.getTime() - this.config.retentionDays * 86400000);

    // Remove old patterns
    for (const [id, pattern] of this.patterns) {
      if (pattern.lastSeenAt < retentionCutoff && pattern.frequency < this.config.minFrequency) {
        this.removePattern(id);
      }
    }

    // Decay strength for patterns not recently seen
    const decayCutoff = new Date(now.getTime() - 86400000); // 1 day
    for (const [_, pattern] of this.patterns) {
      if (pattern.lastSeenAt < decayCutoff) {
        pattern.strength *= 0.95; // 5% decay
      }
    }

    // Merge similar patterns
    this.mergeSimilarPatterns();
  }

  private mergeSimilarPatterns(): void {
    const patterns = Array.from(this.patterns.values());
    const merged = new Set<string>();

    for (let i = 0; i < patterns.length; i++) {
      if (merged.has(patterns[i].id)) continue;

      for (let j = i + 1; j < patterns.length; j++) {
        if (merged.has(patterns[j].id)) continue;

        const similarity = this.calculateSimilarity(
          patterns[i].signature.features,
          patterns[j].signature.features
        );

        if (similarity >= 0.95) {
          // Merge j into i
          patterns[i].frequency += patterns[j].frequency;
          patterns[i].strength += patterns[j].strength;
          patterns[i].instances.push(...patterns[j].instances);
          merged.add(patterns[j].id);
          this.removePattern(patterns[j].id);
        }
      }
    }
  }

  private estimateMemoryUsage(): number {
    let bytes = 0;
    for (const [_, pattern] of this.patterns) {
      bytes += JSON.stringify(pattern).length * 2; // Rough estimate
    }
    for (const [_, cluster] of this.clusters) {
      bytes += JSON.stringify(cluster).length * 2;
    }
    return bytes;
  }
}

export default MidTermMemory;
