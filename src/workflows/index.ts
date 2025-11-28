/**
 * Workflows Module Exports
 */

export { BreezeWorkflowEngine } from './breeze-workflows';
export type {
  WorkflowStep,
  Workflow,
  WorkflowTrigger,
  WorkflowExecution,
  WorkflowStepResult,
  WorkflowContext,
  BatchRecoveryResult,
  LeakRecoveryDetail,
} from './breeze-workflows';

export { TrendTracker } from './trend-tracker';
export type {
  TrendSnapshot,
  TrendMetrics,
  TypeTrendMetrics,
  EntityTrend,
  TrendAnalysis,
  TrendHighlight,
  TrendPrediction,
  TrendAlert,
  TrendConfig,
} from './trend-tracker';

export { LeakBookmarkManager } from './bookmarks';
export type {
  Bookmark,
  BookmarkFolder,
  BookmarkFilter,
  BookmarkStats,
} from './bookmarks';
