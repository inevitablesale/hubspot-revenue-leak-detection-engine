/**
 * Long-Term Memory (LTM) Module
 * Persistent storage for strategies, rule evolution, and portal DNA
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// LTM Types
// ============================================================

export interface LTMEntry {
  id: string;
  category: LTMCategory;
  key: string;
  value: unknown;
  version: number;
  confidence: number;
  importance: number;
  associations: string[];
  history: LTMVersion[];
  metadata: LTMMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type LTMCategory = 
  | 'strategy' 
  | 'rule' 
  | 'model' 
  | 'baseline' 
  | 'config' 
  | 'dna' 
  | 'insight' 
  | 'relationship';

export interface LTMVersion {
  version: number;
  value: unknown;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

export interface LTMMetadata {
  source: string;
  domain: string;
  tags: string[];
  accessCount: number;
  lastAccessedAt?: Date;
  validFrom?: Date;
  validUntil?: Date;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: 'detection' | 'recovery' | 'optimization' | 'governance';
  rules: StrategyRule[];
  effectiveness: number;
  applicability: number;
  status: 'active' | 'learning' | 'deprecated';
}

export interface StrategyRule {
  condition: string;
  action: string;
  priority: number;
  confidence: number;
}

export interface PortalDNA {
  portalId: string;
  characteristics: DNACharacteristic[];
  behaviors: DNABehavior[];
  benchmarks: DNABenchmark[];
  fingerprint: string;
  updatedAt: Date;
}

export interface DNACharacteristic {
  name: string;
  value: unknown;
  stability: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
}

export interface DNABehavior {
  pattern: string;
  frequency: number;
  lastObserved: Date;
  predictability: number;
}

export interface DNABenchmark {
  metric: string;
  value: number;
  percentile: number;
  industry: string;
}

export interface Relationship {
  id: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  type: string;
  strength: number;
  bidirectional: boolean;
  metadata: Record<string, unknown>;
}

export interface LTMQuery {
  category?: LTMCategory;
  key?: string;
  tags?: string[];
  domain?: string;
  minConfidence?: number;
  minImportance?: number;
  validAt?: Date;
}

export interface LTMConfig {
  maxEntries: number;
  maxVersionHistory: number;
  consolidationInterval: number;
  importanceDecayRate: number;
}

// ============================================================
// LTM Implementation
// ============================================================

export class LongTermMemory {
  private entries: Map<string, LTMEntry> = new Map();
  private keyIndex: Map<string, string> = new Map();
  private categoryIndex: Map<LTMCategory, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private config: LTMConfig;
  private consolidationTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<LTMConfig>) {
    this.config = {
      maxEntries: 100000,
      maxVersionHistory: 50,
      consolidationInterval: 86400000, // 24 hours
      importanceDecayRate: 0.01,
      ...config,
    };

    this.initializeCategories();
    this.startConsolidation();
  }

  /**
   * Initialize category indexes
   */
  private initializeCategories(): void {
    const categories: LTMCategory[] = [
      'strategy', 'rule', 'model', 'baseline', 'config', 'dna', 'insight', 'relationship'
    ];
    for (const cat of categories) {
      this.categoryIndex.set(cat, new Set());
    }
  }

  /**
   * Store an entry in LTM
   */
  store(
    category: LTMCategory,
    key: string,
    value: unknown,
    options?: {
      confidence?: number;
      importance?: number;
      metadata?: Partial<LTMMetadata>;
    }
  ): LTMEntry {
    // Check for existing entry
    const existingId = this.keyIndex.get(`${category}:${key}`);
    if (existingId) {
      return this.update(existingId, value, options);
    }

    // Check capacity
    if (this.entries.size >= this.config.maxEntries) {
      this.evictLeastImportant();
    }

    const entry: LTMEntry = {
      id: generateId(),
      category,
      key,
      value,
      version: 1,
      confidence: options?.confidence ?? 0.5,
      importance: options?.importance ?? 0.5,
      associations: [],
      history: [{
        version: 1,
        value,
        changedAt: new Date(),
        changedBy: 'system',
      }],
      metadata: {
        source: 'direct',
        domain: 'general',
        tags: [],
        accessCount: 0,
        ...options?.metadata,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.entries.set(entry.id, entry);
    this.keyIndex.set(`${category}:${key}`, entry.id);
    this.indexEntry(entry);

    return entry;
  }

  /**
   * Update an existing entry
   */
  update(
    id: string,
    value: unknown,
    options?: {
      confidence?: number;
      importance?: number;
      reason?: string;
      changedBy?: string;
    }
  ): LTMEntry {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Entry '${id}' not found`);
    }

    // Store version history
    entry.history.push({
      version: entry.version + 1,
      value,
      changedAt: new Date(),
      changedBy: options?.changedBy || 'system',
      reason: options?.reason,
    });

    // Trim history
    if (entry.history.length > this.config.maxVersionHistory) {
      entry.history = entry.history.slice(-this.config.maxVersionHistory);
    }

    // Update entry
    entry.value = value;
    entry.version++;
    entry.updatedAt = new Date();

    if (options?.confidence !== undefined) {
      entry.confidence = options.confidence;
    }
    if (options?.importance !== undefined) {
      entry.importance = options.importance;
    }

    return entry;
  }

  /**
   * Retrieve an entry by ID
   */
  get(id: string): LTMEntry | undefined {
    const entry = this.entries.get(id);
    if (entry) {
      entry.metadata.accessCount++;
      entry.metadata.lastAccessedAt = new Date();
      
      // Boost importance on access
      entry.importance = Math.min(1, entry.importance + 0.01);
    }
    return entry;
  }

  /**
   * Retrieve by key
   */
  getByKey(category: LTMCategory, key: string): LTMEntry | undefined {
    const id = this.keyIndex.get(`${category}:${key}`);
    return id ? this.get(id) : undefined;
  }

  /**
   * Query entries
   */
  query(query: LTMQuery): LTMEntry[] {
    let results: LTMEntry[] = [];

    // Start with category filter if specified
    if (query.category) {
      const ids = this.categoryIndex.get(query.category) || new Set();
      results = Array.from(ids).map(id => this.entries.get(id)).filter((e): e is LTMEntry => e !== undefined);
    } else {
      results = Array.from(this.entries.values());
    }

    // Apply key filter
    if (query.key) {
      results = results.filter(e => e.key.includes(query.key!));
    }

    // Apply tag filter
    if (query.tags && query.tags.length > 0) {
      results = results.filter(e => query.tags!.some(t => e.metadata.tags.includes(t)));
    }

    // Apply domain filter
    if (query.domain) {
      results = results.filter(e => e.metadata.domain === query.domain);
    }

    // Apply confidence filter
    if (query.minConfidence !== undefined) {
      results = results.filter(e => e.confidence >= query.minConfidence!);
    }

    // Apply importance filter
    if (query.minImportance !== undefined) {
      results = results.filter(e => e.importance >= query.minImportance!);
    }

    // Apply validity filter
    if (query.validAt) {
      results = results.filter(e => {
        const validFrom = e.metadata.validFrom;
        const validUntil = e.metadata.validUntil;
        if (validFrom && validFrom > query.validAt!) return false;
        if (validUntil && validUntil < query.validAt!) return false;
        return true;
      });
    }

    return results.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Store a strategy
   */
  storeStrategy(strategy: Strategy): LTMEntry {
    return this.store('strategy', strategy.id, strategy, {
      importance: strategy.effectiveness,
      confidence: strategy.applicability,
      metadata: {
        domain: strategy.type,
        tags: ['strategy', strategy.type, strategy.status],
      },
    });
  }

  /**
   * Get strategies by type
   */
  getStrategies(type?: Strategy['type']): Strategy[] {
    const entries = this.query({ category: 'strategy' });
    const strategies = entries.map(e => e.value as Strategy);
    
    if (type) {
      return strategies.filter(s => s.type === type);
    }
    return strategies;
  }

  /**
   * Store portal DNA
   */
  storePortalDNA(dna: PortalDNA): LTMEntry {
    return this.store('dna', dna.portalId, dna, {
      importance: 1,
      confidence: 0.9,
      metadata: {
        domain: 'portal',
        tags: ['dna', 'portal', dna.portalId],
      },
    });
  }

  /**
   * Get portal DNA
   */
  getPortalDNA(portalId: string): PortalDNA | undefined {
    const entry = this.getByKey('dna', portalId);
    return entry?.value as PortalDNA | undefined;
  }

  /**
   * Create relationship between entries
   */
  createRelationship(
    sourceId: string,
    targetId: string,
    type: string,
    options?: {
      strength?: number;
      bidirectional?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Relationship {
    const source = this.entries.get(sourceId);
    const target = this.entries.get(targetId);

    if (!source || !target) {
      throw new Error('Source or target entry not found');
    }

    const relationship: Relationship = {
      id: generateId(),
      sourceId,
      sourceType: source.category,
      targetId,
      targetType: target.category,
      type,
      strength: options?.strength ?? 0.5,
      bidirectional: options?.bidirectional ?? false,
      metadata: options?.metadata ?? {},
    };

    this.relationships.set(relationship.id, relationship);

    // Update associations
    if (!source.associations.includes(targetId)) {
      source.associations.push(targetId);
    }
    if (relationship.bidirectional && !target.associations.includes(sourceId)) {
      target.associations.push(sourceId);
    }

    return relationship;
  }

  /**
   * Get relationships for an entry
   */
  getRelationships(entryId: string): Relationship[] {
    return Array.from(this.relationships.values())
      .filter(r => r.sourceId === entryId || (r.bidirectional && r.targetId === entryId));
  }

  /**
   * Get associated entries
   */
  getAssociated(entryId: string): LTMEntry[] {
    const entry = this.entries.get(entryId);
    if (!entry) return [];

    return entry.associations
      .map(id => this.entries.get(id))
      .filter((e): e is LTMEntry => e !== undefined);
  }

  /**
   * Get version history
   */
  getHistory(id: string): LTMVersion[] {
    const entry = this.entries.get(id);
    return entry?.history || [];
  }

  /**
   * Revert to previous version
   */
  revert(id: string, version: number): LTMEntry {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Entry '${id}' not found`);
    }

    const targetVersion = entry.history.find(h => h.version === version);
    if (!targetVersion) {
      throw new Error(`Version ${version} not found`);
    }

    return this.update(id, targetVersion.value, {
      reason: `Reverted to version ${version}`,
    });
  }

  /**
   * Remove an entry
   */
  remove(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    // Remove from indexes
    this.keyIndex.delete(`${entry.category}:${entry.key}`);
    this.categoryIndex.get(entry.category)?.delete(id);
    
    for (const tag of entry.metadata.tags) {
      this.tagIndex.get(tag)?.delete(id);
    }

    // Remove relationships
    for (const [relId, rel] of this.relationships) {
      if (rel.sourceId === id || rel.targetId === id) {
        this.relationships.delete(relId);
      }
    }

    // Remove from associations
    for (const [_, e] of this.entries) {
      const idx = e.associations.indexOf(id);
      if (idx !== -1) e.associations.splice(idx, 1);
    }

    this.entries.delete(id);
    return true;
  }

  /**
   * Export to JSON
   */
  export(): { entries: LTMEntry[]; relationships: Relationship[] } {
    return {
      entries: Array.from(this.entries.values()),
      relationships: Array.from(this.relationships.values()),
    };
  }

  /**
   * Import from JSON
   */
  import(data: { entries: LTMEntry[]; relationships: Relationship[] }): void {
    for (const entry of data.entries) {
      this.entries.set(entry.id, entry);
      this.keyIndex.set(`${entry.category}:${entry.key}`, entry.id);
      this.indexEntry(entry);
    }

    for (const rel of data.relationships) {
      this.relationships.set(rel.id, rel);
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEntries: number;
    byCategory: Record<LTMCategory, number>;
    totalRelationships: number;
    avgImportance: number;
    avgConfidence: number;
    avgVersionHistory: number;
  } {
    const entries = Array.from(this.entries.values());
    const byCategory: Record<LTMCategory, number> = {} as Record<LTMCategory, number>;

    for (const [cat, ids] of this.categoryIndex) {
      byCategory[cat] = ids.size;
    }

    return {
      totalEntries: entries.length,
      byCategory,
      totalRelationships: this.relationships.size,
      avgImportance: entries.length > 0
        ? entries.reduce((sum, e) => sum + e.importance, 0) / entries.length
        : 0,
      avgConfidence: entries.length > 0
        ? entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length
        : 0,
      avgVersionHistory: entries.length > 0
        ? entries.reduce((sum, e) => sum + e.history.length, 0) / entries.length
        : 0,
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

  private indexEntry(entry: LTMEntry): void {
    // Category index
    this.categoryIndex.get(entry.category)?.add(entry.id);

    // Tag index
    for (const tag of entry.metadata.tags) {
      let tagIds = this.tagIndex.get(tag);
      if (!tagIds) {
        tagIds = new Set();
        this.tagIndex.set(tag, tagIds);
      }
      tagIds.add(entry.id);
    }
  }

  private evictLeastImportant(): void {
    let leastImportant: { id: string; importance: number } | null = null;

    for (const [id, entry] of this.entries) {
      if (!leastImportant || entry.importance < leastImportant.importance) {
        leastImportant = { id, importance: entry.importance };
      }
    }

    if (leastImportant) {
      this.remove(leastImportant.id);
    }
  }

  private startConsolidation(): void {
    this.consolidationTimer = setInterval(() => {
      this.consolidate();
    }, this.config.consolidationInterval);
  }

  private consolidate(): void {
    // Decay importance for entries not recently accessed
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86400000);

    for (const [_, entry] of this.entries) {
      const lastAccess = entry.metadata.lastAccessedAt;
      if (!lastAccess || lastAccess < dayAgo) {
        entry.importance = Math.max(0.01, entry.importance * (1 - this.config.importanceDecayRate));
      }
    }

    // Remove expired entries
    for (const [id, entry] of this.entries) {
      if (entry.metadata.validUntil && entry.metadata.validUntil < now) {
        this.remove(id);
      }
    }

    // Remove very low importance entries
    for (const [id, entry] of this.entries) {
      if (entry.importance < 0.05 && entry.metadata.accessCount < 10) {
        this.remove(id);
      }
    }
  }
}

export default LongTermMemory;
