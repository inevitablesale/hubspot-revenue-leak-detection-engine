/**
 * Episodic Memory Module
 * Stores incidents, drift episodes, and recovery cycles for experiential learning
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Episodic Memory Types
// ============================================================

export interface Episode {
  id: string;
  type: EpisodeType;
  title: string;
  description: string;
  timeline: TimelineEvent[];
  actors: Actor[];
  context: EpisodeContext;
  outcome: EpisodeOutcome;
  lessons: Lesson[];
  metadata: EpisodeMetadata;
  startedAt: Date;
  endedAt?: Date;
}

export type EpisodeType = 
  | 'incident' 
  | 'drift' 
  | 'recovery' 
  | 'optimization' 
  | 'discovery' 
  | 'collaboration'
  | 'escalation';

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: string;
  description: string;
  actor?: string;
  data?: unknown;
  significance: number;
}

export interface Actor {
  id: string;
  type: 'agent' | 'user' | 'system' | 'external';
  name: string;
  role: string;
  actions: string[];
}

export interface EpisodeContext {
  portalId?: string;
  entityType?: string;
  entityId?: string;
  trigger: string;
  environment: Record<string, unknown>;
  relatedEpisodes: string[];
}

export interface EpisodeOutcome {
  status: 'success' | 'partial' | 'failure' | 'ongoing';
  impact: Impact;
  resolution?: string;
  preventionActions?: string[];
}

export interface Impact {
  severity: 'low' | 'medium' | 'high' | 'critical';
  scope: 'single' | 'limited' | 'widespread' | 'system';
  revenueImpact?: number;
  timeToResolve?: number;
  effortRequired?: number;
}

export interface Lesson {
  id: string;
  type: 'insight' | 'pattern' | 'best_practice' | 'anti_pattern' | 'root_cause';
  description: string;
  confidence: number;
  applicability: string[];
  actions: string[];
  createdAt: Date;
}

export interface EpisodeMetadata {
  source: string;
  domain: string;
  tags: string[];
  importance: number;
  accessCount: number;
  lastAccessedAt?: Date;
}

export interface EpisodeQuery {
  type?: EpisodeType;
  outcome?: EpisodeOutcome['status'];
  severity?: Impact['severity'];
  dateRange?: { start: Date; end: Date };
  tags?: string[];
  actors?: string[];
  hasLesson?: boolean;
}

export interface EpisodeSummary {
  totalEpisodes: number;
  byType: Record<EpisodeType, number>;
  byOutcome: Record<EpisodeOutcome['status'], number>;
  avgTimeToResolve: number;
  totalLessons: number;
  topPatterns: string[];
}

export interface EpisodeConfig {
  maxEpisodes: number;
  maxTimelineEvents: number;
  retentionDays: number;
  autoExtractLessons: boolean;
}

// ============================================================
// Episodic Memory Implementation
// ============================================================

export class EpisodicMemory {
  private episodes: Map<string, Episode> = new Map();
  private typeIndex: Map<EpisodeType, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private lessonIndex: Map<string, string[]> = new Map();
  private config: EpisodeConfig;

  constructor(config?: Partial<EpisodeConfig>) {
    this.config = {
      maxEpisodes: 10000,
      maxTimelineEvents: 100,
      retentionDays: 365,
      autoExtractLessons: true,
      ...config,
    };

    this.initializeIndexes();
  }

  /**
   * Initialize indexes
   */
  private initializeIndexes(): void {
    const types: EpisodeType[] = [
      'incident', 'drift', 'recovery', 'optimization', 
      'discovery', 'collaboration', 'escalation'
    ];
    for (const type of types) {
      this.typeIndex.set(type, new Set());
    }
  }

  /**
   * Start a new episode
   */
  startEpisode(params: {
    type: EpisodeType;
    title: string;
    description: string;
    trigger: string;
    context?: Partial<EpisodeContext>;
    actors?: Actor[];
  }): Episode {
    // Check capacity
    if (this.episodes.size >= this.config.maxEpisodes) {
      this.evictOldestEpisode();
    }

    const episode: Episode = {
      id: generateId(),
      type: params.type,
      title: params.title,
      description: params.description,
      timeline: [{
        id: generateId(),
        timestamp: new Date(),
        type: 'episode_started',
        description: `Episode started: ${params.title}`,
        significance: 0.5,
      }],
      actors: params.actors || [],
      context: {
        trigger: params.trigger,
        environment: {},
        relatedEpisodes: [],
        ...params.context,
      },
      outcome: {
        status: 'ongoing',
        impact: {
          severity: 'medium',
          scope: 'single',
        },
      },
      lessons: [],
      metadata: {
        source: 'system',
        domain: 'general',
        tags: [],
        importance: 0.5,
        accessCount: 0,
      },
      startedAt: new Date(),
    };

    this.episodes.set(episode.id, episode);
    this.typeIndex.get(params.type)?.add(episode.id);

    return episode;
  }

  /**
   * Add event to episode timeline
   */
  addEvent(
    episodeId: string,
    type: string,
    description: string,
    options?: {
      actor?: string;
      data?: unknown;
      significance?: number;
    }
  ): TimelineEvent {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      throw new Error(`Episode '${episodeId}' not found`);
    }

    const event: TimelineEvent = {
      id: generateId(),
      timestamp: new Date(),
      type,
      description,
      actor: options?.actor,
      data: options?.data,
      significance: options?.significance ?? 0.5,
    };

    episode.timeline.push(event);

    // Trim timeline if over limit
    if (episode.timeline.length > this.config.maxTimelineEvents) {
      // Keep first and last events, remove from middle
      const toKeep = Math.floor(this.config.maxTimelineEvents / 2);
      episode.timeline = [
        ...episode.timeline.slice(0, toKeep),
        ...episode.timeline.slice(-toKeep),
      ];
    }

    return event;
  }

  /**
   * Add actor to episode
   */
  addActor(episodeId: string, actor: Actor): void {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      throw new Error(`Episode '${episodeId}' not found`);
    }

    const existing = episode.actors.find(a => a.id === actor.id);
    if (existing) {
      existing.actions.push(...actor.actions);
    } else {
      episode.actors.push(actor);
    }
  }

  /**
   * End an episode
   */
  endEpisode(
    episodeId: string,
    outcome: {
      status: EpisodeOutcome['status'];
      resolution?: string;
      impact?: Partial<Impact>;
      preventionActions?: string[];
    }
  ): Episode {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      throw new Error(`Episode '${episodeId}' not found`);
    }

    episode.endedAt = new Date();
    episode.outcome = {
      status: outcome.status,
      impact: {
        ...episode.outcome.impact,
        ...outcome.impact,
        timeToResolve: episode.endedAt.getTime() - episode.startedAt.getTime(),
      },
      resolution: outcome.resolution,
      preventionActions: outcome.preventionActions,
    };

    // Add end event
    this.addEvent(episodeId, 'episode_ended', `Episode ended with status: ${outcome.status}`, {
      significance: 0.8,
    });

    // Auto-extract lessons
    if (this.config.autoExtractLessons) {
      this.extractLessons(episodeId);
    }

    return episode;
  }

  /**
   * Add lesson to episode
   */
  addLesson(
    episodeId: string,
    lesson: Omit<Lesson, 'id' | 'createdAt'>
  ): Lesson {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      throw new Error(`Episode '${episodeId}' not found`);
    }

    const newLesson: Lesson = {
      id: generateId(),
      ...lesson,
      createdAt: new Date(),
    };

    episode.lessons.push(newLesson);

    // Index lesson
    let lessonEpisodes = this.lessonIndex.get(newLesson.type);
    if (!lessonEpisodes) {
      lessonEpisodes = [];
      this.lessonIndex.set(newLesson.type, lessonEpisodes);
    }
    lessonEpisodes.push(episodeId);

    return newLesson;
  }

  /**
   * Link related episodes
   */
  linkEpisodes(episodeId1: string, episodeId2: string): void {
    const episode1 = this.episodes.get(episodeId1);
    const episode2 = this.episodes.get(episodeId2);

    if (episode1 && !episode1.context.relatedEpisodes.includes(episodeId2)) {
      episode1.context.relatedEpisodes.push(episodeId2);
    }
    if (episode2 && !episode2.context.relatedEpisodes.includes(episodeId1)) {
      episode2.context.relatedEpisodes.push(episodeId1);
    }
  }

  /**
   * Query episodes
   */
  query(query: EpisodeQuery): Episode[] {
    let results: Episode[] = [];

    // Start with type filter if specified
    if (query.type) {
      const ids = this.typeIndex.get(query.type) || new Set();
      results = Array.from(ids)
        .map(id => this.episodes.get(id))
        .filter((e): e is Episode => e !== undefined);
    } else {
      results = Array.from(this.episodes.values());
    }

    // Apply filters
    if (query.outcome) {
      results = results.filter(e => e.outcome.status === query.outcome);
    }

    if (query.severity) {
      results = results.filter(e => e.outcome.impact.severity === query.severity);
    }

    if (query.dateRange) {
      results = results.filter(e => 
        e.startedAt >= query.dateRange!.start && 
        e.startedAt <= query.dateRange!.end
      );
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(e => 
        query.tags!.some(t => e.metadata.tags.includes(t))
      );
    }

    if (query.actors && query.actors.length > 0) {
      results = results.filter(e =>
        query.actors!.some(a => e.actors.some(actor => actor.id === a))
      );
    }

    if (query.hasLesson) {
      results = results.filter(e => e.lessons.length > 0);
    }

    return results.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Find similar episodes
   */
  findSimilar(episodeId: string, limit: number = 5): Episode[] {
    const episode = this.episodes.get(episodeId);
    if (!episode) return [];

    return Array.from(this.episodes.values())
      .filter(e => e.id !== episodeId)
      .map(e => ({
        episode: e,
        similarity: this.calculateSimilarity(episode, e),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(r => r.episode);
  }

  /**
   * Get lessons by type
   */
  getLessonsByType(type: Lesson['type']): Lesson[] {
    const lessons: Lesson[] = [];
    const episodeIds = this.lessonIndex.get(type) || [];

    for (const id of episodeIds) {
      const episode = this.episodes.get(id);
      if (episode) {
        lessons.push(...episode.lessons.filter(l => l.type === type));
      }
    }

    return lessons.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get all lessons
   */
  getAllLessons(): Lesson[] {
    const lessons: Lesson[] = [];
    for (const [_, episode] of this.episodes) {
      lessons.push(...episode.lessons);
    }
    return lessons.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get episode by ID
   */
  getEpisode(episodeId: string): Episode | undefined {
    const episode = this.episodes.get(episodeId);
    if (episode) {
      episode.metadata.accessCount++;
      episode.metadata.lastAccessedAt = new Date();
    }
    return episode;
  }

  /**
   * Get recent episodes
   */
  getRecent(limit: number = 10): Episode[] {
    return Array.from(this.episodes.values())
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get ongoing episodes
   */
  getOngoing(): Episode[] {
    return Array.from(this.episodes.values())
      .filter(e => e.outcome.status === 'ongoing')
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Get episode summary
   */
  getSummary(): EpisodeSummary {
    const episodes = Array.from(this.episodes.values());
    
    const byType: Record<EpisodeType, number> = {} as Record<EpisodeType, number>;
    const byOutcome: Record<EpisodeOutcome['status'], number> = {} as Record<EpisodeOutcome['status'], number>;
    
    for (const [type, ids] of this.typeIndex) {
      byType[type] = ids.size;
    }

    let totalTimeToResolve = 0;
    let resolvedCount = 0;
    const patternCounts: Map<string, number> = new Map();

    for (const episode of episodes) {
      byOutcome[episode.outcome.status] = (byOutcome[episode.outcome.status] || 0) + 1;
      
      if (episode.outcome.impact.timeToResolve) {
        totalTimeToResolve += episode.outcome.impact.timeToResolve;
        resolvedCount++;
      }

      for (const lesson of episode.lessons) {
        if (lesson.type === 'pattern') {
          const count = patternCounts.get(lesson.description) || 0;
          patternCounts.set(lesson.description, count + 1);
        }
      }
    }

    const topPatterns = Array.from(patternCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);

    return {
      totalEpisodes: episodes.length,
      byType,
      byOutcome,
      avgTimeToResolve: resolvedCount > 0 ? totalTimeToResolve / resolvedCount : 0,
      totalLessons: episodes.reduce((sum, e) => sum + e.lessons.length, 0),
      topPatterns,
    };
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEpisodes: number;
    ongoingEpisodes: number;
    completedEpisodes: number;
    failedEpisodes: number;
    totalLessons: number;
    avgImportance: number;
    oldestEpisode?: Date;
  } {
    const episodes = Array.from(this.episodes.values());
    
    return {
      totalEpisodes: episodes.length,
      ongoingEpisodes: episodes.filter(e => e.outcome.status === 'ongoing').length,
      completedEpisodes: episodes.filter(e => e.outcome.status === 'success').length,
      failedEpisodes: episodes.filter(e => e.outcome.status === 'failure').length,
      totalLessons: episodes.reduce((sum, e) => sum + e.lessons.length, 0),
      avgImportance: episodes.length > 0
        ? episodes.reduce((sum, e) => sum + e.metadata.importance, 0) / episodes.length
        : 0,
      oldestEpisode: episodes.length > 0
        ? episodes.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())[0].startedAt
        : undefined,
    };
  }

  // Private methods

  private extractLessons(episodeId: string): void {
    const episode = this.episodes.get(episodeId);
    if (!episode) return;

    // Extract pattern lesson from successful episodes
    if (episode.outcome.status === 'success') {
      const significantEvents = episode.timeline.filter(e => e.significance > 0.7);
      if (significantEvents.length > 0) {
        this.addLesson(episodeId, {
          type: 'best_practice',
          description: `Successful ${episode.type}: ${significantEvents.map(e => e.description).join(' -> ')}`,
          confidence: 0.7,
          applicability: [episode.type],
          actions: episode.outcome.preventionActions || [],
        });
      }
    }

    // Extract anti-pattern from failed episodes
    if (episode.outcome.status === 'failure') {
      this.addLesson(episodeId, {
        type: 'anti_pattern',
        description: `Failed ${episode.type}: ${episode.description}`,
        confidence: 0.8,
        applicability: [episode.type],
        actions: ['Review and prevent similar issues'],
      });
    }

    // Extract root cause if resolution exists
    if (episode.outcome.resolution) {
      this.addLesson(episodeId, {
        type: 'root_cause',
        description: `Root cause: ${episode.outcome.resolution}`,
        confidence: 0.6,
        applicability: [episode.type],
        actions: episode.outcome.preventionActions || [],
      });
    }
  }

  private calculateSimilarity(e1: Episode, e2: Episode): number {
    let score = 0;
    let factors = 0;

    // Same type
    if (e1.type === e2.type) {
      score += 0.3;
    }
    factors++;

    // Same trigger pattern
    if (e1.context.trigger === e2.context.trigger) {
      score += 0.2;
    }
    factors++;

    // Same entity type
    if (e1.context.entityType && e1.context.entityType === e2.context.entityType) {
      score += 0.15;
    }
    factors++;

    // Similar severity
    if (e1.outcome.impact.severity === e2.outcome.impact.severity) {
      score += 0.15;
    }
    factors++;

    // Shared tags
    const sharedTags = e1.metadata.tags.filter(t => e2.metadata.tags.includes(t)).length;
    const maxTags = Math.max(e1.metadata.tags.length, e2.metadata.tags.length, 1);
    score += 0.2 * (sharedTags / maxTags);
    factors++;

    return score / factors * factors; // Normalize
  }

  private evictOldestEpisode(): void {
    let oldest: { id: string; date: Date } | null = null;

    for (const [id, episode] of this.episodes) {
      if (episode.outcome.status !== 'ongoing') {
        if (!oldest || episode.startedAt < oldest.date) {
          oldest = { id, date: episode.startedAt };
        }
      }
    }

    if (oldest) {
      this.removeEpisode(oldest.id);
    }
  }

  private removeEpisode(episodeId: string): boolean {
    const episode = this.episodes.get(episodeId);
    if (!episode) return false;

    this.typeIndex.get(episode.type)?.delete(episodeId);
    
    for (const tag of episode.metadata.tags) {
      this.tagIndex.get(tag)?.delete(episodeId);
    }

    this.episodes.delete(episodeId);
    return true;
  }
}

export default EpisodicMemory;
