/**
 * Streaming Module
 * Real-Time Event-Driven RevOps Brain for AgentOS
 */

export { EventBus } from './event-bus';
export { EventNormalizer } from './event-normalizer';
export { ReactivePipelines } from './reactive-pipelines';
export { StreamingScheduler } from './streaming-scheduler';

// Re-export types
export type {
  BusEvent,
  EventSubscription,
  Channel,
  EventBusMetrics,
  EventPriority,
} from './event-bus';

export type {
  RawEvent,
  NormalizedEvent,
  NormalizationSchema,
  EventCategory,
  SourceSystem,
} from './event-normalizer';

export type {
  Pipeline,
  PipelineStage,
  StreamItem,
  StageProcessor,
  Window,
  Aggregation,
} from './reactive-pipelines';

export type {
  StreamTask,
  TaskHandler,
  TaskSchedule,
  TaskRun,
  Watermark,
  SchedulerMetrics,
} from './streaming-scheduler';
