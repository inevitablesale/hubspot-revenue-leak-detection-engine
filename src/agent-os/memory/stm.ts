/**
 * Short-Term Memory (STM) Module
 * Ephemeral signal buffer for immediate context and recent events
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// STM Types
// ============================================================

export interface STMEntry {
  id: string;
  type: string;
  data: unknown;
  priority: number;
  accessCount: number;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  associations: string[];
}

export interface STMConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'priority';
}

export interface STMStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  avgAccessTime: number;
}

// ============================================================
// STM Implementation
// ============================================================

export class ShortTermMemory {
  private entries: Map<string, STMEntry> = new Map();
  private typeIndex: Map<string, Set<string>> = new Map();
  private config: STMConfig;
  private stats: STMStats = { size: 0, hits: 0, misses: 0, evictions: 0, avgAccessTime: 0 };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<STMConfig>) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      evictionPolicy: 'lru',
      ...config,
    };

    this.startCleanup();
  }

  /**
   * Store an entry in STM
   */
  store(type: string, data: unknown, options?: { ttl?: number; priority?: number }): STMEntry {
    const id = generateId();
    const now = new Date();
    const ttl = options?.ttl || this.config.defaultTTL;

    // Check capacity and evict if needed
    if (this.entries.size >= this.config.maxSize) {
      this.evict();
    }

    const entry: STMEntry = {
      id,
      type,
      data,
      priority: options?.priority || 0,
      accessCount: 0,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: new Date(now.getTime() + ttl),
      associations: [],
    };

    this.entries.set(id, entry);
    this.indexByType(type, id);
    this.stats.size = this.entries.size;

    return entry;
  }

  /**
   * Retrieve an entry from STM
   */
  get(id: string): STMEntry | undefined {
    const entry = this.entries.get(id);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check expiration
    if (entry.expiresAt < new Date()) {
      this.remove(id);
      this.stats.misses++;
      return undefined;
    }

    entry.accessCount++;
    entry.lastAccessedAt = new Date();
    this.stats.hits++;

    return entry;
  }

  /**
   * Query entries by type
   */
  queryByType(type: string): STMEntry[] {
    const ids = this.typeIndex.get(type) || new Set();
    const entries: STMEntry[] = [];

    for (const id of ids) {
      const entry = this.get(id);
      if (entry) entries.push(entry);
    }

    return entries;
  }

  /**
   * Get most recent entries
   */
  getRecent(limit: number = 10): STMEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.expiresAt > new Date())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get most accessed entries
   */
  getMostAccessed(limit: number = 10): STMEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.expiresAt > new Date())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Associate two entries
   */
  associate(id1: string, id2: string): void {
    const entry1 = this.entries.get(id1);
    const entry2 = this.entries.get(id2);

    if (entry1 && !entry1.associations.includes(id2)) {
      entry1.associations.push(id2);
    }
    if (entry2 && !entry2.associations.includes(id1)) {
      entry2.associations.push(id1);
    }
  }

  /**
   * Get associated entries
   */
  getAssociated(id: string): STMEntry[] {
    const entry = this.entries.get(id);
    if (!entry) return [];

    return entry.associations
      .map(assocId => this.get(assocId))
      .filter((e): e is STMEntry => e !== undefined);
  }

  /**
   * Remove an entry
   */
  remove(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    // Remove from type index
    const typeIds = this.typeIndex.get(entry.type);
    if (typeIds) {
      typeIds.delete(id);
    }

    // Remove from associations
    for (const assocId of entry.associations) {
      const assocEntry = this.entries.get(assocId);
      if (assocEntry) {
        const index = assocEntry.associations.indexOf(id);
        if (index !== -1) assocEntry.associations.splice(index, 1);
      }
    }

    this.entries.delete(id);
    this.stats.size = this.entries.size;

    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
    this.typeIndex.clear();
    this.stats.size = 0;
  }

  /**
   * Extend TTL for an entry
   */
  touch(id: string, additionalTTL?: number): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    const extension = additionalTTL || this.config.defaultTTL;
    entry.expiresAt = new Date(Date.now() + extension);
    entry.lastAccessedAt = new Date();

    return true;
  }

  /**
   * Get statistics
   */
  getStats(): STMStats & { hitRate: number; types: string[] } {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;

    return {
      ...this.stats,
      hitRate,
      types: Array.from(this.typeIndex.keys()),
    };
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // Private methods

  private indexByType(type: string, id: string): void {
    let ids = this.typeIndex.get(type);
    if (!ids) {
      ids = new Set();
      this.typeIndex.set(type, ids);
    }
    ids.add(id);
  }

  private evict(): void {
    let toEvict: string | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru':
        // Least recently used
        let oldest: { id: string; time: number } | null = null;
        for (const [id, entry] of this.entries) {
          if (!oldest || entry.lastAccessedAt.getTime() < oldest.time) {
            oldest = { id, time: entry.lastAccessedAt.getTime() };
          }
        }
        toEvict = oldest?.id || null;
        break;

      case 'lfu':
        // Least frequently used
        let leastUsed: { id: string; count: number } | null = null;
        for (const [id, entry] of this.entries) {
          if (!leastUsed || entry.accessCount < leastUsed.count) {
            leastUsed = { id, count: entry.accessCount };
          }
        }
        toEvict = leastUsed?.id || null;
        break;

      case 'fifo':
        // First in first out
        let firstIn: { id: string; time: number } | null = null;
        for (const [id, entry] of this.entries) {
          if (!firstIn || entry.createdAt.getTime() < firstIn.time) {
            firstIn = { id, time: entry.createdAt.getTime() };
          }
        }
        toEvict = firstIn?.id || null;
        break;

      case 'priority':
        // Lowest priority first
        let lowestPriority: { id: string; priority: number } | null = null;
        for (const [id, entry] of this.entries) {
          if (!lowestPriority || entry.priority < lowestPriority.priority) {
            lowestPriority = { id, priority: entry.priority };
          }
        }
        toEvict = lowestPriority?.id || null;
        break;
    }

    if (toEvict) {
      this.remove(toEvict);
      this.stats.evictions++;
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = new Date();
      const toRemove: string[] = [];

      for (const [id, entry] of this.entries) {
        if (entry.expiresAt < now) {
          toRemove.push(id);
        }
      }

      for (const id of toRemove) {
        this.remove(id);
      }
    }, this.config.cleanupInterval);
  }
}

export default ShortTermMemory;
