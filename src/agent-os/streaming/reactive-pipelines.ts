/**
 * Reactive Pipelines Module
 * Stream processing pipelines for real-time event transformation and analysis
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Reactive Pipelines Types
// ============================================================

export type PipelineStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed';
export type StageType = 'source' | 'transform' | 'filter' | 'aggregate' | 'join' | 'window' | 'sink';

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  status: PipelineStatus;
  stages: PipelineStage[];
  config: PipelineConfig;
  metrics: PipelineMetrics;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  type: StageType;
  processor: StageProcessor;
  config: StageConfig;
  nextStages: string[];
  errorHandler?: string;
  metrics: StageMetrics;
}

export type StageProcessor = (item: StreamItem, context: ProcessingContext) => Promise<StreamItem | StreamItem[] | null>;

export interface StageConfig {
  parallelism: number;
  batchSize: number;
  timeout: number;
  retries: number;
  backpressure: BackpressureStrategy;
  params: Record<string, unknown>;
}

export type BackpressureStrategy = 'drop' | 'buffer' | 'block' | 'sample';

export interface StageMetrics {
  inputCount: number;
  outputCount: number;
  errorCount: number;
  avgLatency: number;
  throughput: number;
  lastProcessed?: Date;
}

export interface StreamItem {
  id: string;
  data: unknown;
  metadata: ItemMetadata;
  timestamp: Date;
}

export interface ItemMetadata {
  source: string;
  pipelineId: string;
  stageId: string;
  correlationId: string;
  retryCount: number;
  tags: string[];
}

export interface ProcessingContext {
  pipelineId: string;
  stageId: string;
  timestamp: Date;
  state: Record<string, unknown>;
  emit: (item: StreamItem) => void;
  getState: <T>(key: string) => T | undefined;
  setState: <T>(key: string, value: T) => void;
}

export interface PipelineConfig {
  parallelism: number;
  bufferSize: number;
  checkpointInterval: number;
  errorPolicy: ErrorPolicy;
  monitoring: MonitoringConfig;
}

export interface ErrorPolicy {
  maxRetries: number;
  retryDelay: number;
  deadLetterEnabled: boolean;
  failFast: boolean;
}

export interface MonitoringConfig {
  metricsInterval: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  alertThresholds: AlertThreshold[];
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq';
  value: number;
  severity: 'warning' | 'critical';
}

export interface PipelineMetrics {
  totalInput: number;
  totalOutput: number;
  totalErrors: number;
  avgLatency: number;
  throughput: number;
  backpressureEvents: number;
  checkpoints: number;
  uptime: number;
}

export interface Window {
  id: string;
  type: 'tumbling' | 'sliding' | 'session';
  size: number;
  slide?: number;
  timeout?: number;
  items: StreamItem[];
  startTime: Date;
  endTime?: Date;
}

export interface Aggregation {
  field: string;
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'first' | 'last' | 'collect';
  alias: string;
}

export interface JoinConfig {
  leftKey: string;
  rightKey: string;
  type: 'inner' | 'left' | 'right' | 'full';
  windowMs: number;
}

// ============================================================
// Reactive Pipelines Implementation
// ============================================================

export class ReactivePipelines {
  private pipelines: Map<string, Pipeline> = new Map();
  private stageProcessors: Map<string, StageProcessor> = new Map();
  private buffers: Map<string, StreamItem[]> = new Map();
  private windows: Map<string, Window[]> = new Map();
  private state: Map<string, Record<string, unknown>> = new Map();
  private processingLoops: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeBuiltInProcessors();
  }

  /**
   * Initialize built-in stage processors
   */
  private initializeBuiltInProcessors(): void {
    // Map processor
    this.stageProcessors.set('map', async (item, ctx) => {
      const mapFn = ctx.state.mapFunction as (data: unknown) => unknown;
      if (mapFn) {
        return {
          ...item,
          data: mapFn(item.data),
          timestamp: new Date(),
        };
      }
      return item;
    });

    // Filter processor
    this.stageProcessors.set('filter', async (item, ctx) => {
      const filterFn = ctx.state.filterFunction as (data: unknown) => boolean;
      if (filterFn && !filterFn(item.data)) {
        return null;
      }
      return item;
    });

    // FlatMap processor
    this.stageProcessors.set('flatMap', async (item, ctx) => {
      const flatMapFn = ctx.state.flatMapFunction as (data: unknown) => unknown[];
      if (flatMapFn) {
        const results = flatMapFn(item.data);
        return results.map((data, index) => ({
          id: `${item.id}-${index}`,
          data,
          metadata: { ...item.metadata },
          timestamp: new Date(),
        }));
      }
      return item;
    });

    // Aggregate processor
    this.stageProcessors.set('aggregate', async (item, ctx) => {
      const aggregations = ctx.state.aggregations as Aggregation[];
      const groupKey = ctx.state.groupKey as string;
      
      if (!aggregations) return item;

      const key = groupKey ? this.extractValue(item.data, groupKey) : 'all';
      const aggState = ctx.getState<Record<string, Record<string, unknown>>>('aggregateState') || {};
      
      if (!aggState[String(key)]) {
        aggState[String(key)] = {};
      }

      const groupState = aggState[String(key)];

      for (const agg of aggregations) {
        const value = this.extractValue(item.data, agg.field);
        const currentValue = groupState[agg.alias] as number | unknown[] | undefined;

        switch (agg.operation) {
          case 'count':
            groupState[agg.alias] = ((currentValue as number) || 0) + 1;
            break;
          case 'sum':
            groupState[agg.alias] = ((currentValue as number) || 0) + (Number(value) || 0);
            break;
          case 'avg':
            const avgState = groupState[`_${agg.alias}_avg`] as { sum: number; count: number } || { sum: 0, count: 0 };
            avgState.sum += Number(value) || 0;
            avgState.count += 1;
            groupState[`_${agg.alias}_avg`] = avgState;
            groupState[agg.alias] = avgState.sum / avgState.count;
            break;
          case 'min':
            groupState[agg.alias] = currentValue === undefined 
              ? value 
              : Math.min(currentValue as number, Number(value));
            break;
          case 'max':
            groupState[agg.alias] = currentValue === undefined 
              ? value 
              : Math.max(currentValue as number, Number(value));
            break;
          case 'first':
            if (currentValue === undefined) groupState[agg.alias] = value;
            break;
          case 'last':
            groupState[agg.alias] = value;
            break;
          case 'collect':
            if (!Array.isArray(currentValue)) groupState[agg.alias] = [];
            (groupState[agg.alias] as unknown[]).push(value);
            break;
        }
      }

      ctx.setState('aggregateState', aggState);

      // Emit aggregated result
      return {
        id: generateId(),
        data: { key, ...groupState },
        metadata: item.metadata,
        timestamp: new Date(),
      };
    });

    // Window processor
    this.stageProcessors.set('window', async (item, ctx) => {
      const windowConfig = ctx.state.windowConfig as { type: Window['type']; size: number; slide?: number };
      if (!windowConfig) return item;

      const windowKey = `${ctx.pipelineId}:${ctx.stageId}`;
      let windows = this.windows.get(windowKey) || [];

      // Add item to active window
      let activeWindow = windows.find(w => !w.endTime);
      if (!activeWindow || (windowConfig.type === 'tumbling' && 
          Date.now() - activeWindow.startTime.getTime() >= windowConfig.size)) {
        // Close previous window
        if (activeWindow) {
          activeWindow.endTime = new Date();
        }
        // Create new window
        activeWindow = {
          id: generateId(),
          type: windowConfig.type,
          size: windowConfig.size,
          slide: windowConfig.slide,
          items: [],
          startTime: new Date(),
        };
        windows.push(activeWindow);
      }

      activeWindow.items.push(item);
      this.windows.set(windowKey, windows);

      // For sliding windows, emit on each item
      if (windowConfig.type === 'sliding') {
        return {
          id: generateId(),
          data: { window: activeWindow.items.map(i => i.data) },
          metadata: item.metadata,
          timestamp: new Date(),
        };
      }

      // For tumbling windows, check if window is complete
      if (Date.now() - activeWindow.startTime.getTime() >= windowConfig.size) {
        return {
          id: generateId(),
          data: { window: activeWindow.items.map(i => i.data) },
          metadata: item.metadata,
          timestamp: new Date(),
        };
      }

      return null; // Don't emit until window closes
    });

    // Deduplicate processor
    this.stageProcessors.set('deduplicate', async (item, ctx) => {
      const keyField = ctx.state.keyField as string || 'id';
      const windowMs = ctx.state.windowMs as number || 60000;
      
      const seenKey = `${ctx.pipelineId}:${ctx.stageId}:seen`;
      const seen = ctx.getState<Map<string, number>>(seenKey) || new Map();

      const key = String(this.extractValue(item.data, keyField));
      const now = Date.now();

      // Clean old entries
      for (const [k, timestamp] of seen) {
        if (now - timestamp > windowMs) {
          seen.delete(k);
        }
      }

      if (seen.has(key)) {
        return null; // Duplicate
      }

      seen.set(key, now);
      ctx.setState(seenKey, seen);

      return item;
    });

    // Enrich processor
    this.stageProcessors.set('enrich', async (item, ctx) => {
      const enrichFn = ctx.state.enrichFunction as (data: unknown) => Promise<unknown>;
      if (enrichFn) {
        const enriched = await enrichFn(item.data);
        return {
          ...item,
          data: { ...(item.data as Record<string, unknown>), ...enriched as Record<string, unknown> },
          timestamp: new Date(),
        };
      }
      return item;
    });

    // Split processor
    this.stageProcessors.set('split', async (item, ctx) => {
      const condition = ctx.state.condition as (data: unknown) => string;
      if (!condition) return item;

      const route = condition(item.data);
      return {
        ...item,
        metadata: {
          ...item.metadata,
          tags: [...item.metadata.tags, `route:${route}`],
        },
      };
    });

    // Merge processor
    this.stageProcessors.set('merge', async (item) => {
      // Simply pass through - merge happens at the stage level
      return item;
    });
  }

  /**
   * Create a new pipeline
   */
  createPipeline(params: {
    name: string;
    description?: string;
    config?: Partial<PipelineConfig>;
  }): Pipeline {
    const pipeline: Pipeline = {
      id: generateId(),
      name: params.name,
      description: params.description || '',
      status: 'idle',
      stages: [],
      config: {
        parallelism: 4,
        bufferSize: 1000,
        checkpointInterval: 30000,
        errorPolicy: {
          maxRetries: 3,
          retryDelay: 1000,
          deadLetterEnabled: true,
          failFast: false,
        },
        monitoring: {
          metricsInterval: 5000,
          logLevel: 'info',
          alertThresholds: [],
        },
        ...params.config,
      },
      metrics: {
        totalInput: 0,
        totalOutput: 0,
        totalErrors: 0,
        avgLatency: 0,
        throughput: 0,
        backpressureEvents: 0,
        checkpoints: 0,
        uptime: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pipelines.set(pipeline.id, pipeline);
    this.buffers.set(pipeline.id, []);
    this.state.set(pipeline.id, {});

    return pipeline;
  }

  /**
   * Add a stage to a pipeline
   */
  addStage(
    pipelineId: string,
    params: {
      name: string;
      type: StageType;
      processorName?: string;
      processor?: StageProcessor;
      config?: Partial<StageConfig>;
      nextStages?: string[];
    }
  ): PipelineStage {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`);
    }

    let processor: StageProcessor;
    if (params.processor) {
      processor = params.processor;
    } else if (params.processorName && this.stageProcessors.has(params.processorName)) {
      processor = this.stageProcessors.get(params.processorName)!;
    } else {
      processor = async (item) => item; // Pass-through
    }

    const stage: PipelineStage = {
      id: generateId(),
      name: params.name,
      type: params.type,
      processor,
      config: {
        parallelism: 1,
        batchSize: 1,
        timeout: 30000,
        retries: 3,
        backpressure: 'buffer',
        params: {},
        ...params.config,
      },
      nextStages: params.nextStages || [],
      metrics: {
        inputCount: 0,
        outputCount: 0,
        errorCount: 0,
        avgLatency: 0,
        throughput: 0,
      },
    };

    // Auto-connect stages if not specified
    if (pipeline.stages.length > 0 && stage.type !== 'source') {
      const lastStage = pipeline.stages[pipeline.stages.length - 1];
      if (!lastStage.nextStages.includes(stage.id)) {
        lastStage.nextStages.push(stage.id);
      }
    }

    pipeline.stages.push(stage);
    pipeline.updatedAt = new Date();

    return stage;
  }

  /**
   * Start a pipeline
   */
  start(pipelineId: string): Pipeline {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`);
    }

    if (pipeline.status === 'running') {
      return pipeline;
    }

    pipeline.status = 'running';
    pipeline.startedAt = new Date();
    pipeline.updatedAt = new Date();

    // Start processing loop
    const loop = setInterval(() => {
      this.processBuffer(pipelineId);
    }, 10);

    this.processingLoops.set(pipelineId, loop);

    return pipeline;
  }

  /**
   * Stop a pipeline
   */
  stop(pipelineId: string): Pipeline {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`);
    }

    const loop = this.processingLoops.get(pipelineId);
    if (loop) {
      clearInterval(loop);
      this.processingLoops.delete(pipelineId);
    }

    pipeline.status = 'completed';
    pipeline.updatedAt = new Date();

    return pipeline;
  }

  /**
   * Pause a pipeline
   */
  pause(pipelineId: string): Pipeline {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`);
    }

    const loop = this.processingLoops.get(pipelineId);
    if (loop) {
      clearInterval(loop);
      this.processingLoops.delete(pipelineId);
    }

    pipeline.status = 'paused';
    pipeline.updatedAt = new Date();

    return pipeline;
  }

  /**
   * Push data into a pipeline
   */
  push(pipelineId: string, data: unknown): StreamItem {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`);
    }

    const buffer = this.buffers.get(pipelineId) || [];

    // Check backpressure
    if (buffer.length >= pipeline.config.bufferSize) {
      const policy = pipeline.config.errorPolicy.deadLetterEnabled ? 'buffer' : 'drop';
      if (policy === 'drop') {
        pipeline.metrics.backpressureEvents++;
        throw new Error('Buffer full - item dropped');
      }
    }

    const item = this.createItem(pipelineId, data);
    buffer.push(item);
    this.buffers.set(pipelineId, buffer);

    pipeline.metrics.totalInput++;

    return item;
  }

  /**
   * Process items in the buffer
   */
  private async processBuffer(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    const buffer = this.buffers.get(pipelineId);

    if (!pipeline || !buffer || buffer.length === 0) return;
    if (pipeline.status !== 'running') return;

    // Get batch of items
    const batchSize = Math.min(pipeline.config.parallelism, buffer.length);
    const batch = buffer.splice(0, batchSize);

    // Process each item through the pipeline
    for (const item of batch) {
      try {
        await this.processItem(pipeline, item);
      } catch (error) {
        pipeline.metrics.totalErrors++;
        pipeline.status = pipeline.config.errorPolicy.failFast ? 'error' : 'running';
      }
    }
  }

  /**
   * Process a single item through the pipeline
   */
  private async processItem(pipeline: Pipeline, item: StreamItem): Promise<void> {
    // Find source stages
    const sourceStages = pipeline.stages.filter(s => s.type === 'source');
    const startStages = sourceStages.length > 0 ? sourceStages : [pipeline.stages[0]];

    if (!startStages[0]) return;

    // Process through stages
    for (const startStage of startStages) {
      await this.processStage(pipeline, startStage, item);
    }
  }

  /**
   * Process item through a stage
   */
  private async processStage(pipeline: Pipeline, stage: PipelineStage, item: StreamItem): Promise<void> {
    const startTime = Date.now();
    stage.metrics.inputCount++;

    // Create processing context
    const pipelineState = this.state.get(pipeline.id) || {};
    const context: ProcessingContext = {
      pipelineId: pipeline.id,
      stageId: stage.id,
      timestamp: new Date(),
      state: { ...stage.config.params, ...pipelineState },
      emit: (emitItem) => {
        this.push(pipeline.id, emitItem.data);
      },
      getState: <T>(key: string) => pipelineState[key] as T,
      setState: <T>(key: string, value: T) => {
        pipelineState[key] = value;
        this.state.set(pipeline.id, pipelineState);
      },
    };

    try {
      // Execute processor with timeout
      const result = await this.executeWithTimeout(
        stage.processor(item, context),
        stage.config.timeout
      );

      // Handle result
      if (result === null) {
        // Item filtered out
        return;
      }

      const outputs = Array.isArray(result) ? result : [result];
      stage.metrics.outputCount += outputs.length;
      pipeline.metrics.totalOutput += outputs.length;

      // Process through next stages
      for (const nextStageId of stage.nextStages) {
        const nextStage = pipeline.stages.find(s => s.id === nextStageId);
        if (nextStage) {
          for (const output of outputs) {
            await this.processStage(pipeline, nextStage, output);
          }
        }
      }

    } catch (error) {
      stage.metrics.errorCount++;
      
      // Retry logic
      if (item.metadata.retryCount < stage.config.retries) {
        item.metadata.retryCount++;
        const buffer = this.buffers.get(pipeline.id) || [];
        buffer.push(item);
        return;
      }

      // Error handling
      if (stage.errorHandler) {
        const errorStage = pipeline.stages.find(s => s.id === stage.errorHandler);
        if (errorStage) {
          await this.processStage(pipeline, errorStage, item);
        }
      }
    }

    // Update metrics
    const latency = Date.now() - startTime;
    stage.metrics.avgLatency = stage.metrics.avgLatency + 
      (latency - stage.metrics.avgLatency) / stage.metrics.inputCount;
    stage.metrics.throughput = stage.metrics.outputCount / 
      ((Date.now() - (pipeline.startedAt?.getTime() || Date.now())) / 1000);
    stage.metrics.lastProcessed = new Date();
  }

  /**
   * Execute with timeout
   */
  private executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Create a stream item
   */
  private createItem(pipelineId: string, data: unknown): StreamItem {
    return {
      id: generateId(),
      data,
      metadata: {
        source: 'push',
        pipelineId,
        stageId: '',
        correlationId: generateId(),
        retryCount: 0,
        tags: [],
      },
      timestamp: new Date(),
    };
  }

  /**
   * Extract value from nested object
   */
  private extractValue(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Get pipeline by ID
   */
  getPipeline(pipelineId: string): Pipeline | undefined {
    return this.pipelines.get(pipelineId);
  }

  /**
   * Get all pipelines
   */
  getPipelines(): Pipeline[] {
    return Array.from(this.pipelines.values());
  }

  /**
   * Get pipeline metrics
   */
  getMetrics(pipelineId: string): PipelineMetrics | undefined {
    return this.pipelines.get(pipelineId)?.metrics;
  }

  /**
   * Get stage metrics
   */
  getStageMetrics(pipelineId: string, stageId: string): StageMetrics | undefined {
    const pipeline = this.pipelines.get(pipelineId);
    return pipeline?.stages.find(s => s.id === stageId)?.metrics;
  }

  /**
   * Register a custom processor
   */
  registerProcessor(name: string, processor: StageProcessor): void {
    this.stageProcessors.set(name, processor);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalPipelines: number;
    runningPipelines: number;
    totalInput: number;
    totalOutput: number;
    totalErrors: number;
    avgThroughput: number;
    registeredProcessors: number;
  } {
    const pipelines = this.getPipelines();
    const runningPipelines = pipelines.filter(p => p.status === 'running');

    const totalInput = pipelines.reduce((sum, p) => sum + p.metrics.totalInput, 0);
    const totalOutput = pipelines.reduce((sum, p) => sum + p.metrics.totalOutput, 0);
    const totalErrors = pipelines.reduce((sum, p) => sum + p.metrics.totalErrors, 0);
    const avgThroughput = runningPipelines.length > 0
      ? runningPipelines.reduce((sum, p) => sum + p.metrics.throughput, 0) / runningPipelines.length
      : 0;

    return {
      totalPipelines: pipelines.length,
      runningPipelines: runningPipelines.length,
      totalInput,
      totalOutput,
      totalErrors,
      avgThroughput,
      registeredProcessors: this.stageProcessors.size,
    };
  }
}

export default ReactivePipelines;
