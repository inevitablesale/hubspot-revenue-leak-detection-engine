/**
 * Event Bus Module
 * Central nervous system for real-time event processing in AgentOS
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Event Bus Types
// ============================================================

export type EventPriority = 'critical' | 'high' | 'normal' | 'low';
export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';

export interface BusEvent {
  id: string;
  type: string;
  source: string;
  priority: EventPriority;
  status: EventStatus;
  payload: unknown;
  metadata: EventMetadata;
  timestamp: Date;
  processedAt?: Date;
  expiresAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  portalId?: string;
  traceId?: string;
  tags: string[];
  version: number;
}

export interface EventSubscription {
  id: string;
  eventTypes: string[];
  handler: EventHandler;
  filter?: EventFilter;
  priority: number;
  config: SubscriptionConfig;
  stats: SubscriptionStats;
  createdAt: Date;
}

export type EventHandler = (event: BusEvent) => Promise<EventHandlerResult>;

export interface EventHandlerResult {
  success: boolean;
  data?: unknown;
  error?: string;
  shouldRetry?: boolean;
}

export interface EventFilter {
  sources?: string[];
  priorities?: EventPriority[];
  tags?: string[];
  payloadMatch?: Record<string, unknown>;
}

export interface SubscriptionConfig {
  async: boolean;
  batchSize: number;
  maxConcurrent: number;
  timeout: number;
  retryPolicy: RetryPolicy;
  deadLetterQueue: boolean;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface SubscriptionStats {
  eventsReceived: number;
  eventsProcessed: number;
  eventsFailed: number;
  avgProcessingTime: number;
  lastEventAt?: Date;
}

export interface Channel {
  id: string;
  name: string;
  type: 'topic' | 'queue' | 'broadcast';
  eventTypes: string[];
  subscribers: string[];
  config: ChannelConfig;
  stats: ChannelStats;
}

export interface ChannelConfig {
  maxSize: number;
  retentionMs: number;
  deduplicate: boolean;
  ordered: boolean;
}

export interface ChannelStats {
  messageCount: number;
  throughput: number;
  avgLatency: number;
  peakSize: number;
}

export interface EventBusConfig {
  maxQueueSize: number;
  defaultTimeout: number;
  enableDeadLetter: boolean;
  batchProcessing: boolean;
  defaultBatchSize: number;
  metricsInterval: number;
}

export interface EventBusMetrics {
  totalEvents: number;
  eventsPerSecond: number;
  avgLatency: number;
  queueDepth: number;
  deadLetterCount: number;
  activeSubscriptions: number;
  channelCount: number;
}

// ============================================================
// Event Bus Implementation
// ============================================================

export class EventBus {
  private eventQueue: BusEvent[] = [];
  private subscriptions: Map<string, EventSubscription> = new Map();
  private channels: Map<string, Channel> = new Map();
  private deadLetterQueue: BusEvent[] = [];
  private eventHistory: BusEvent[] = [];
  private config: EventBusConfig;
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private metrics: EventBusMetrics;
  private eventCounts: { timestamp: number; count: number }[] = [];

  constructor(config?: Partial<EventBusConfig>) {
    this.config = {
      maxQueueSize: 10000,
      defaultTimeout: 30000,
      enableDeadLetter: true,
      batchProcessing: true,
      defaultBatchSize: 10,
      metricsInterval: 1000,
      ...config,
    };

    this.metrics = {
      totalEvents: 0,
      eventsPerSecond: 0,
      avgLatency: 0,
      queueDepth: 0,
      deadLetterCount: 0,
      activeSubscriptions: 0,
      channelCount: 0,
    };

    this.initializeDefaultChannels();
  }

  /**
   * Initialize default channels
   */
  private initializeDefaultChannels(): void {
    // System events channel
    this.createChannel({
      name: 'system',
      type: 'broadcast',
      eventTypes: ['system.*', 'health.*', 'config.*'],
    });

    // Detection events channel
    this.createChannel({
      name: 'detection',
      type: 'topic',
      eventTypes: ['leak.*', 'anomaly.*', 'pattern.*'],
    });

    // Action events channel
    this.createChannel({
      name: 'actions',
      type: 'queue',
      eventTypes: ['action.*', 'recovery.*', 'fix.*'],
    });

    // Integration events channel
    this.createChannel({
      name: 'integrations',
      type: 'topic',
      eventTypes: ['hubspot.*', 'billing.*', 'finance.*', 'ats.*'],
    });
  }

  /**
   * Start the event bus
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    
    // Start processing loop
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 10);

    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, this.config.metricsInterval);
  }

  /**
   * Stop the event bus
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Publish an event to the bus
   */
  publish(params: {
    type: string;
    source: string;
    payload: unknown;
    priority?: EventPriority;
    metadata?: Partial<EventMetadata>;
    expiresIn?: number;
  }): BusEvent {
    const event: BusEvent = {
      id: generateId(),
      type: params.type,
      source: params.source,
      priority: params.priority || 'normal',
      status: 'pending',
      payload: params.payload,
      metadata: {
        correlationId: generateId(),
        tags: [],
        version: 1,
        ...params.metadata,
      },
      timestamp: new Date(),
      expiresAt: params.expiresIn ? new Date(Date.now() + params.expiresIn) : undefined,
      retryCount: 0,
      maxRetries: 3,
    };

    // Check queue capacity
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      // Drop low priority events first
      const lowPriorityIndex = this.eventQueue.findIndex(e => e.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.eventQueue.splice(lowPriorityIndex, 1);
      } else {
        throw new Error('Event queue is full');
      }
    }

    // Insert by priority
    this.insertByPriority(event);

    this.metrics.totalEvents++;
    this.eventCounts.push({ timestamp: Date.now(), count: 1 });

    return event;
  }

  /**
   * Insert event by priority
   */
  private insertByPriority(event: BusEvent): void {
    const priorityOrder: Record<EventPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    const insertIndex = this.eventQueue.findIndex(
      e => priorityOrder[e.priority] > priorityOrder[event.priority]
    );

    if (insertIndex === -1) {
      this.eventQueue.push(event);
    } else {
      this.eventQueue.splice(insertIndex, 0, event);
    }
  }

  /**
   * Subscribe to events
   */
  subscribe(params: {
    eventTypes: string[];
    handler: EventHandler;
    filter?: EventFilter;
    priority?: number;
    config?: Partial<SubscriptionConfig>;
  }): EventSubscription {
    const subscription: EventSubscription = {
      id: generateId(),
      eventTypes: params.eventTypes,
      handler: params.handler,
      filter: params.filter,
      priority: params.priority || 0,
      config: {
        async: true,
        batchSize: this.config.defaultBatchSize,
        maxConcurrent: 5,
        timeout: this.config.defaultTimeout,
        retryPolicy: {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
        },
        deadLetterQueue: this.config.enableDeadLetter,
        ...params.config,
      },
      stats: {
        eventsReceived: 0,
        eventsProcessed: 0,
        eventsFailed: 0,
        avgProcessingTime: 0,
      },
      createdAt: new Date(),
    };

    this.subscriptions.set(subscription.id, subscription);
    this.metrics.activeSubscriptions = this.subscriptions.size;

    // Add to relevant channels
    for (const eventType of params.eventTypes) {
      for (const [_, channel] of this.channels) {
        if (this.matchesEventType(eventType, channel.eventTypes)) {
          if (!channel.subscribers.includes(subscription.id)) {
            channel.subscribers.push(subscription.id);
          }
        }
      }
    }

    return subscription;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    this.subscriptions.delete(subscriptionId);
    this.metrics.activeSubscriptions = this.subscriptions.size;

    // Remove from channels
    for (const [_, channel] of this.channels) {
      const index = channel.subscribers.indexOf(subscriptionId);
      if (index !== -1) {
        channel.subscribers.splice(index, 1);
      }
    }

    return true;
  }

  /**
   * Create a channel
   */
  createChannel(params: {
    name: string;
    type: Channel['type'];
    eventTypes: string[];
    config?: Partial<ChannelConfig>;
  }): Channel {
    const channel: Channel = {
      id: generateId(),
      name: params.name,
      type: params.type,
      eventTypes: params.eventTypes,
      subscribers: [],
      config: {
        maxSize: 10000,
        retentionMs: 86400000, // 24 hours
        deduplicate: true,
        ordered: params.type === 'queue',
        ...params.config,
      },
      stats: {
        messageCount: 0,
        throughput: 0,
        avgLatency: 0,
        peakSize: 0,
      },
    };

    this.channels.set(channel.id, channel);
    this.metrics.channelCount = this.channels.size;

    return channel;
  }

  /**
   * Process the event queue
   */
  private async processQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batchSize = this.config.batchProcessing ? this.config.defaultBatchSize : 1;
    const batch = this.eventQueue.splice(0, batchSize);

    for (const event of batch) {
      // Check expiration
      if (event.expiresAt && event.expiresAt < new Date()) {
        event.status = 'failed';
        continue;
      }

      await this.processEvent(event);
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: BusEvent): Promise<void> {
    event.status = 'processing';
    const startTime = Date.now();

    // Find matching subscriptions
    const matchingSubscriptions = this.findMatchingSubscriptions(event);

    if (matchingSubscriptions.length === 0) {
      event.status = 'completed';
      event.processedAt = new Date();
      this.addToHistory(event);
      return;
    }

    // Sort by priority
    matchingSubscriptions.sort((a, b) => b.priority - a.priority);

    let allSucceeded = true;

    for (const subscription of matchingSubscriptions) {
      try {
        subscription.stats.eventsReceived++;

        const result = await this.executeHandler(subscription, event);

        if (result.success) {
          subscription.stats.eventsProcessed++;
        } else {
          subscription.stats.eventsFailed++;
          allSucceeded = false;

          if (result.shouldRetry && event.retryCount < event.maxRetries) {
            event.retryCount++;
            this.scheduleRetry(event, subscription.config.retryPolicy);
            return;
          }
        }

        // Update avg processing time
        const processingTime = Date.now() - startTime;
        subscription.stats.avgProcessingTime = 
          subscription.stats.avgProcessingTime + 
          (processingTime - subscription.stats.avgProcessingTime) / subscription.stats.eventsProcessed;
        subscription.stats.lastEventAt = new Date();

      } catch (error) {
        subscription.stats.eventsFailed++;
        allSucceeded = false;

        if (event.retryCount < event.maxRetries) {
          event.retryCount++;
          this.scheduleRetry(event, subscription.config.retryPolicy);
          return;
        }
      }
    }

    if (allSucceeded) {
      event.status = 'completed';
    } else {
      event.status = 'failed';
      if (this.config.enableDeadLetter) {
        this.sendToDeadLetter(event);
      }
    }

    event.processedAt = new Date();
    this.addToHistory(event);
    this.updateLatency(Date.now() - startTime);
  }

  /**
   * Execute handler with timeout
   */
  private async executeHandler(subscription: EventSubscription, event: BusEvent): Promise<EventHandlerResult> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Handler timeout', shouldRetry: true });
      }, subscription.config.timeout);

      subscription.handler(event)
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          resolve({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            shouldRetry: true 
          });
        });
    });
  }

  /**
   * Find subscriptions matching an event
   */
  private findMatchingSubscriptions(event: BusEvent): EventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => {
      // Check event type match
      const typeMatches = sub.eventTypes.some(type => this.matchesEventType(event.type, [type]));
      if (!typeMatches) return false;

      // Check filter
      if (sub.filter) {
        if (sub.filter.sources && !sub.filter.sources.includes(event.source)) return false;
        if (sub.filter.priorities && !sub.filter.priorities.includes(event.priority)) return false;
        if (sub.filter.tags && !sub.filter.tags.some(tag => event.metadata.tags.includes(tag))) return false;
      }

      return true;
    });
  }

  /**
   * Check if event type matches patterns
   */
  private matchesEventType(eventType: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      if (pattern === eventType) return true;
      if (pattern.endsWith('.*')) {
        const prefix = pattern.slice(0, -2);
        return eventType.startsWith(prefix);
      }
      if (pattern === '*') return true;
      return false;
    });
  }

  /**
   * Schedule event retry
   */
  private scheduleRetry(event: BusEvent, policy: RetryPolicy): void {
    const delay = Math.min(
      policy.initialDelay * Math.pow(policy.backoffMultiplier, event.retryCount - 1),
      policy.maxDelay
    );

    setTimeout(() => {
      event.status = 'pending';
      this.insertByPriority(event);
    }, delay);
  }

  /**
   * Send event to dead letter queue
   */
  private sendToDeadLetter(event: BusEvent): void {
    event.status = 'dead_letter';
    this.deadLetterQueue.push(event);
    this.metrics.deadLetterCount = this.deadLetterQueue.length;

    // Emit dead letter event
    this.publish({
      type: 'system.dead_letter',
      source: 'event_bus',
      payload: { originalEvent: event },
      priority: 'low',
    });
  }

  /**
   * Add event to history
   */
  private addToHistory(event: BusEvent): void {
    this.eventHistory.push(event);
    
    // Trim history
    if (this.eventHistory.length > 10000) {
      this.eventHistory.shift();
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Calculate events per second
    this.eventCounts = this.eventCounts.filter(c => c.timestamp > oneSecondAgo);
    this.metrics.eventsPerSecond = this.eventCounts.reduce((sum, c) => sum + c.count, 0);

    // Update queue depth
    this.metrics.queueDepth = this.eventQueue.length;

    // Update channel stats
    for (const [_, channel] of this.channels) {
      if (channel.stats.messageCount > channel.stats.peakSize) {
        channel.stats.peakSize = channel.stats.messageCount;
      }
    }
  }

  /**
   * Update latency metric
   */
  private updateLatency(latency: number): void {
    const processed = this.metrics.totalEvents;
    this.metrics.avgLatency = this.metrics.avgLatency + (latency - this.metrics.avgLatency) / processed;
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): BusEvent | undefined {
    return this.eventHistory.find(e => e.id === eventId) ||
           this.eventQueue.find(e => e.id === eventId);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string, limit?: number): BusEvent[] {
    const events = this.eventHistory.filter(e => this.matchesEventType(e.type, [type]));
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): EventSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Get all subscriptions
   */
  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get channel by ID
   */
  getChannel(channelId: string): Channel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get all channels
   */
  getChannels(): Channel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(): BusEvent[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Replay dead letter event
   */
  replayDeadLetter(eventId: string): BusEvent | null {
    const index = this.deadLetterQueue.findIndex(e => e.id === eventId);
    if (index === -1) return null;

    const event = this.deadLetterQueue.splice(index, 1)[0];
    event.status = 'pending';
    event.retryCount = 0;
    this.insertByPriority(event);
    this.metrics.deadLetterCount = this.deadLetterQueue.length;

    return event;
  }

  /**
   * Get metrics
   */
  getMetrics(): EventBusMetrics {
    return { ...this.metrics };
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEvents: number;
    queuedEvents: number;
    processedEvents: number;
    failedEvents: number;
    deadLetterEvents: number;
    eventsPerSecond: number;
    avgLatencyMs: number;
    subscriptions: number;
    channels: number;
    isRunning: boolean;
  } {
    const processedEvents = this.eventHistory.filter(e => e.status === 'completed').length;
    const failedEvents = this.eventHistory.filter(e => e.status === 'failed').length;

    return {
      totalEvents: this.metrics.totalEvents,
      queuedEvents: this.eventQueue.length,
      processedEvents,
      failedEvents,
      deadLetterEvents: this.deadLetterQueue.length,
      eventsPerSecond: this.metrics.eventsPerSecond,
      avgLatencyMs: Math.round(this.metrics.avgLatency * 100) / 100,
      subscriptions: this.subscriptions.size,
      channels: this.channels.size,
      isRunning: this.isRunning,
    };
  }
}

export default EventBus;
