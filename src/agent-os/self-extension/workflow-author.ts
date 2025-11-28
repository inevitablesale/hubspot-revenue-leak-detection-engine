/**
 * Workflow Author Module
 * Enables AgentOS to generate, optimize, and deploy new workflows
 * for automated revenue leak detection and recovery
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Workflow Author Types
// ============================================================

export type WorkflowStatus = 'draft' | 'testing' | 'active' | 'paused' | 'deprecated';
export type NodeType = 'trigger' | 'condition' | 'action' | 'delay' | 'split' | 'merge' | 'loop' | 'end';
export type TriggerType = 'schedule' | 'event' | 'webhook' | 'manual' | 'threshold';

export interface AuthoredWorkflow {
  id: string;
  name: string;
  description: string;
  version: number;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  metadata: WorkflowMetadata;
  performance: WorkflowPerformance;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
}

export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  config: TriggerConfig;
  conditions?: TriggerCondition[];
}

export interface TriggerConfig {
  schedule?: string; // cron expression
  event?: string;
  webhookPath?: string;
  threshold?: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
  };
}

export interface TriggerCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  config: NodeConfig;
  position: { x: number; y: number };
  inputs: string[];
  outputs: string[];
}

export interface NodeConfig {
  action?: string;
  actionParams?: Record<string, unknown>;
  condition?: string;
  conditionParams?: Record<string, unknown>;
  delay?: number;
  delayUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
  loopConfig?: {
    maxIterations: number;
    condition: string;
  };
  splitType?: 'parallel' | 'conditional';
  [key: string]: unknown;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue?: unknown;
  scope: 'input' | 'output' | 'internal';
}

export interface WorkflowMetadata {
  author: 'agent' | 'user' | 'system';
  purpose: string;
  tags: string[];
  category: string;
  estimatedDuration: number;
  complexity: 'simple' | 'moderate' | 'complex';
  dependencies: string[];
}

export interface WorkflowPerformance {
  executions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgDuration: number;
  avgNodesExecuted: number;
  lastExecutedAt?: Date;
  errorRate: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  placeholders: TemplatePlaceholder[];
}

export interface TemplatePlaceholder {
  name: string;
  nodeId: string;
  field: string;
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  nodeExecutions: NodeExecution[];
  variables: Record<string, unknown>;
  error?: string;
}

export interface NodeExecution {
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  input?: unknown;
  output?: unknown;
  error?: string;
}

export interface WorkflowOptimization {
  id: string;
  workflowId: string;
  type: 'remove_redundant' | 'parallelize' | 'merge_nodes' | 'add_caching' | 'optimize_conditions';
  description: string;
  impact: {
    durationReduction: number;
    errorReduction: number;
    resourceSavings: number;
  };
  changes: WorkflowChange[];
  applied: boolean;
  appliedAt?: Date;
}

export interface WorkflowChange {
  type: 'add_node' | 'remove_node' | 'modify_node' | 'add_edge' | 'remove_edge' | 'modify_edge';
  target: string;
  before?: unknown;
  after?: unknown;
}

// ============================================================
// Workflow Author Implementation
// ============================================================

export class WorkflowAuthor {
  private workflows: Map<string, AuthoredWorkflow> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private optimizations: Map<string, WorkflowOptimization> = new Map();

  constructor() {
    this.initializeTemplates();
    this.initializeDefaultWorkflows();
  }

  /**
   * Initialize workflow templates
   */
  private initializeTemplates(): void {
    // Leak detection workflow template
    this.templates.set('leak-detection', {
      id: 'leak-detection-template',
      name: 'Revenue Leak Detection',
      description: 'Standard workflow for detecting revenue leaks',
      category: 'detection',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          name: 'Start',
          config: {},
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: ['fetch-1'],
        },
        {
          id: 'fetch-1',
          type: 'action',
          name: 'Fetch Data',
          config: { action: 'fetch_entities', actionParams: { entityType: '{{entityType}}' } },
          position: { x: 200, y: 0 },
          inputs: ['trigger-1'],
          outputs: ['analyze-1'],
        },
        {
          id: 'analyze-1',
          type: 'action',
          name: 'Analyze',
          config: { action: 'run_detection', actionParams: { detectorType: '{{detectorType}}' } },
          position: { x: 400, y: 0 },
          inputs: ['fetch-1'],
          outputs: ['condition-1'],
        },
        {
          id: 'condition-1',
          type: 'condition',
          name: 'Leaks Found?',
          config: { condition: 'leaks.length > 0' },
          position: { x: 600, y: 0 },
          inputs: ['analyze-1'],
          outputs: ['notify-1', 'end-1'],
        },
        {
          id: 'notify-1',
          type: 'action',
          name: 'Notify',
          config: { action: 'send_notification', actionParams: { channel: '{{notifyChannel}}' } },
          position: { x: 800, y: -50 },
          inputs: ['condition-1'],
          outputs: ['end-1'],
        },
        {
          id: 'end-1',
          type: 'end',
          name: 'End',
          config: {},
          position: { x: 1000, y: 0 },
          inputs: ['condition-1', 'notify-1'],
          outputs: [],
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'fetch-1' },
        { id: 'e2', source: 'fetch-1', target: 'analyze-1' },
        { id: 'e3', source: 'analyze-1', target: 'condition-1' },
        { id: 'e4', source: 'condition-1', target: 'notify-1', condition: 'true', label: 'Yes' },
        { id: 'e5', source: 'condition-1', target: 'end-1', condition: 'false', label: 'No' },
        { id: 'e6', source: 'notify-1', target: 'end-1' },
      ],
      variables: [
        { name: 'entityType', type: 'string', scope: 'input' },
        { name: 'detectorType', type: 'string', scope: 'input' },
        { name: 'leaks', type: 'array', scope: 'internal' },
      ],
      placeholders: [
        { name: 'entityType', nodeId: 'fetch-1', field: 'actionParams.entityType', description: 'Type of entity to fetch', required: true },
        { name: 'detectorType', nodeId: 'analyze-1', field: 'actionParams.detectorType', description: 'Detector to run', required: true },
        { name: 'notifyChannel', nodeId: 'notify-1', field: 'actionParams.channel', description: 'Notification channel', required: false, defaultValue: 'email' },
      ],
    });

    // Recovery workflow template
    this.templates.set('recovery', {
      id: 'recovery-template',
      name: 'Leak Recovery',
      description: 'Standard workflow for recovering from revenue leaks',
      category: 'recovery',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          name: 'Start',
          config: {},
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: ['validate-1'],
        },
        {
          id: 'validate-1',
          type: 'action',
          name: 'Validate Leak',
          config: { action: 'validate_leak' },
          position: { x: 200, y: 0 },
          inputs: ['trigger-1'],
          outputs: ['condition-1'],
        },
        {
          id: 'condition-1',
          type: 'condition',
          name: 'Valid?',
          config: { condition: 'isValid' },
          position: { x: 400, y: 0 },
          inputs: ['validate-1'],
          outputs: ['fix-1', 'end-1'],
        },
        {
          id: 'fix-1',
          type: 'action',
          name: 'Apply Fix',
          config: { action: 'apply_fix', actionParams: { fixType: '{{fixType}}' } },
          position: { x: 600, y: -50 },
          inputs: ['condition-1'],
          outputs: ['verify-1'],
        },
        {
          id: 'verify-1',
          type: 'action',
          name: 'Verify Fix',
          config: { action: 'verify_fix' },
          position: { x: 800, y: -50 },
          inputs: ['fix-1'],
          outputs: ['end-1'],
        },
        {
          id: 'end-1',
          type: 'end',
          name: 'End',
          config: {},
          position: { x: 1000, y: 0 },
          inputs: ['condition-1', 'verify-1'],
          outputs: [],
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'validate-1' },
        { id: 'e2', source: 'validate-1', target: 'condition-1' },
        { id: 'e3', source: 'condition-1', target: 'fix-1', condition: 'true', label: 'Valid' },
        { id: 'e4', source: 'condition-1', target: 'end-1', condition: 'false', label: 'Invalid' },
        { id: 'e5', source: 'fix-1', target: 'verify-1' },
        { id: 'e6', source: 'verify-1', target: 'end-1' },
      ],
      variables: [
        { name: 'leakId', type: 'string', scope: 'input' },
        { name: 'fixType', type: 'string', scope: 'input' },
        { name: 'isValid', type: 'boolean', scope: 'internal' },
      ],
      placeholders: [
        { name: 'fixType', nodeId: 'fix-1', field: 'actionParams.fixType', description: 'Type of fix to apply', required: true },
      ],
    });
  }

  /**
   * Initialize default workflows
   */
  private initializeDefaultWorkflows(): void {
    // Daily leak scan workflow
    this.createWorkflow({
      name: 'Daily Leak Scan',
      description: 'Scans for revenue leaks daily',
      trigger: {
        id: generateId(),
        type: 'schedule',
        config: { schedule: '0 6 * * *' }, // 6 AM daily
      },
      nodes: [
        {
          id: 'start',
          type: 'trigger',
          name: 'Daily Trigger',
          config: {},
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: ['scan-deals'],
        },
        {
          id: 'scan-deals',
          type: 'action',
          name: 'Scan Deals',
          config: { action: 'scan_deals' },
          position: { x: 200, y: 0 },
          inputs: ['start'],
          outputs: ['scan-contracts'],
        },
        {
          id: 'scan-contracts',
          type: 'action',
          name: 'Scan Contracts',
          config: { action: 'scan_contracts' },
          position: { x: 400, y: 0 },
          inputs: ['scan-deals'],
          outputs: ['analyze'],
        },
        {
          id: 'analyze',
          type: 'action',
          name: 'Analyze Results',
          config: { action: 'analyze_results' },
          position: { x: 600, y: 0 },
          inputs: ['scan-contracts'],
          outputs: ['report'],
        },
        {
          id: 'report',
          type: 'action',
          name: 'Generate Report',
          config: { action: 'generate_report' },
          position: { x: 800, y: 0 },
          inputs: ['analyze'],
          outputs: ['end'],
        },
        {
          id: 'end',
          type: 'end',
          name: 'End',
          config: {},
          position: { x: 1000, y: 0 },
          inputs: ['report'],
          outputs: [],
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'scan-deals' },
        { id: 'e2', source: 'scan-deals', target: 'scan-contracts' },
        { id: 'e3', source: 'scan-contracts', target: 'analyze' },
        { id: 'e4', source: 'analyze', target: 'report' },
        { id: 'e5', source: 'report', target: 'end' },
      ],
      category: 'detection',
    });

    // Alert response workflow
    this.createWorkflow({
      name: 'Alert Response',
      description: 'Responds to critical leak alerts',
      trigger: {
        id: generateId(),
        type: 'event',
        config: { event: 'critical_leak_detected' },
      },
      nodes: [
        {
          id: 'start',
          type: 'trigger',
          name: 'Alert Trigger',
          config: {},
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: ['validate'],
        },
        {
          id: 'validate',
          type: 'action',
          name: 'Validate Alert',
          config: { action: 'validate_alert' },
          position: { x: 200, y: 0 },
          inputs: ['start'],
          outputs: ['check'],
        },
        {
          id: 'check',
          type: 'condition',
          name: 'Is Critical?',
          config: { condition: 'severity === "critical"' },
          position: { x: 400, y: 0 },
          inputs: ['validate'],
          outputs: ['escalate', 'notify'],
        },
        {
          id: 'escalate',
          type: 'action',
          name: 'Escalate',
          config: { action: 'escalate_to_manager' },
          position: { x: 600, y: -50 },
          inputs: ['check'],
          outputs: ['end'],
        },
        {
          id: 'notify',
          type: 'action',
          name: 'Notify Owner',
          config: { action: 'notify_owner' },
          position: { x: 600, y: 50 },
          inputs: ['check'],
          outputs: ['end'],
        },
        {
          id: 'end',
          type: 'end',
          name: 'End',
          config: {},
          position: { x: 800, y: 0 },
          inputs: ['escalate', 'notify'],
          outputs: [],
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'validate' },
        { id: 'e2', source: 'validate', target: 'check' },
        { id: 'e3', source: 'check', target: 'escalate', condition: 'true', label: 'Critical' },
        { id: 'e4', source: 'check', target: 'notify', condition: 'false', label: 'Non-Critical' },
        { id: 'e5', source: 'escalate', target: 'end' },
        { id: 'e6', source: 'notify', target: 'end' },
      ],
      category: 'response',
    });
  }

  /**
   * Create a new workflow
   */
  createWorkflow(params: {
    name: string;
    description: string;
    trigger: WorkflowTrigger;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    variables?: WorkflowVariable[];
    category?: string;
    metadata?: Partial<WorkflowMetadata>;
  }): AuthoredWorkflow {
    const workflow: AuthoredWorkflow = {
      id: generateId(),
      name: params.name,
      description: params.description,
      version: 1,
      status: 'draft',
      trigger: params.trigger,
      nodes: params.nodes,
      edges: params.edges,
      variables: params.variables || [],
      metadata: {
        author: 'agent',
        purpose: params.description,
        tags: [],
        category: params.category || 'general',
        estimatedDuration: this.estimateDuration(params.nodes),
        complexity: this.assessComplexity(params.nodes, params.edges),
        dependencies: [],
        ...params.metadata,
      },
      performance: {
        executions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        avgDuration: 0,
        avgNodesExecuted: 0,
        errorRate: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  /**
   * Create workflow from template
   */
  createFromTemplate(templateId: string, params: Record<string, unknown>): AuthoredWorkflow {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    // Clone and fill template
    const nodes = JSON.parse(JSON.stringify(template.nodes)) as WorkflowNode[];
    const edges = JSON.parse(JSON.stringify(template.edges)) as WorkflowEdge[];
    const variables = JSON.parse(JSON.stringify(template.variables)) as WorkflowVariable[];

    // Apply placeholder values
    for (const placeholder of template.placeholders) {
      const value = params[placeholder.name] ?? placeholder.defaultValue;
      const node = nodes.find(n => n.id === placeholder.nodeId);
      if (node) {
        this.setNestedValue(node.config, placeholder.field, value);
      }
    }

    return this.createWorkflow({
      name: `${template.name} - ${new Date().toISOString().split('T')[0]}`,
      description: template.description,
      trigger: {
        id: generateId(),
        type: 'manual',
        config: {},
      },
      nodes,
      edges,
      variables,
      category: template.category,
    });
  }

  /**
   * Generate workflow from natural language description
   */
  generateWorkflow(description: string, options: {
    triggerType?: TriggerType;
    category?: string;
  } = {}): AuthoredWorkflow {
    // Parse description to extract key actions
    const actions = this.parseDescription(description);
    
    // Build nodes and edges
    const nodes: WorkflowNode[] = [];
    const edges: WorkflowEdge[] = [];

    // Start trigger
    const startNode: WorkflowNode = {
      id: 'start',
      type: 'trigger',
      name: 'Start',
      config: {},
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    };
    nodes.push(startNode);

    let prevNodeId = 'start';
    let xPos = 200;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const nodeId = `action-${i + 1}`;

      const node: WorkflowNode = {
        id: nodeId,
        type: action.type as NodeType,
        name: action.name,
        config: action.config,
        position: { x: xPos, y: 0 },
        inputs: [prevNodeId],
        outputs: [],
      };
      nodes.push(node);

      // Update previous node outputs
      const prevNode = nodes.find(n => n.id === prevNodeId);
      if (prevNode) {
        prevNode.outputs.push(nodeId);
      }

      // Create edge
      edges.push({
        id: `e-${i + 1}`,
        source: prevNodeId,
        target: nodeId,
      });

      prevNodeId = nodeId;
      xPos += 200;
    }

    // End node
    const endNode: WorkflowNode = {
      id: 'end',
      type: 'end',
      name: 'End',
      config: {},
      position: { x: xPos, y: 0 },
      inputs: [prevNodeId],
      outputs: [],
    };
    nodes.push(endNode);

    // Update last action node
    const lastActionNode = nodes.find(n => n.id === prevNodeId);
    if (lastActionNode) {
      lastActionNode.outputs.push('end');
    }

    edges.push({
      id: `e-${actions.length + 1}`,
      source: prevNodeId,
      target: 'end',
    });

    return this.createWorkflow({
      name: `Generated: ${description.slice(0, 50)}`,
      description,
      trigger: {
        id: generateId(),
        type: options.triggerType || 'manual',
        config: {},
      },
      nodes,
      edges,
      category: options.category || 'generated',
    });
  }

  /**
   * Optimize a workflow
   */
  optimizeWorkflow(workflowId: string): WorkflowOptimization[] {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }

    const optimizations: WorkflowOptimization[] = [];

    // Check for parallelizable nodes
    const parallelOptimization = this.findParallelizableNodes(workflow);
    if (parallelOptimization) {
      optimizations.push(parallelOptimization);
      this.optimizations.set(parallelOptimization.id, parallelOptimization);
    }

    // Check for redundant nodes
    const redundantOptimization = this.findRedundantNodes(workflow);
    if (redundantOptimization) {
      optimizations.push(redundantOptimization);
      this.optimizations.set(redundantOptimization.id, redundantOptimization);
    }

    // Check for condition optimizations
    const conditionOptimization = this.optimizeConditions(workflow);
    if (conditionOptimization) {
      optimizations.push(conditionOptimization);
      this.optimizations.set(conditionOptimization.id, conditionOptimization);
    }

    return optimizations;
  }

  /**
   * Apply an optimization to a workflow
   */
  applyOptimization(optimizationId: string): AuthoredWorkflow {
    const optimization = this.optimizations.get(optimizationId);
    if (!optimization) {
      throw new Error(`Optimization '${optimizationId}' not found`);
    }

    const workflow = this.workflows.get(optimization.workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${optimization.workflowId}' not found`);
    }

    // Apply changes
    for (const change of optimization.changes) {
      this.applyChange(workflow, change);
    }

    optimization.applied = true;
    optimization.appliedAt = new Date();
    workflow.version++;
    workflow.updatedAt = new Date();

    return workflow;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string, input?: Record<string, unknown>): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }

    const execution: WorkflowExecution = {
      id: generateId(),
      workflowId,
      status: 'running',
      startedAt: new Date(),
      nodeExecutions: [],
      variables: { ...input },
    };

    this.executions.set(execution.id, execution);

    try {
      // Find start node
      const startNode = workflow.nodes.find(n => n.type === 'trigger');
      if (!startNode) {
        throw new Error('No trigger node found');
      }

      // Execute nodes in order
      await this.executeNode(workflow, startNode, execution);

      execution.status = 'completed';
      execution.completedAt = new Date();

      // Update workflow performance
      workflow.performance.executions++;
      workflow.performance.successfulExecutions++;
      this.updateWorkflowMetrics(workflow, execution);

    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      
      workflow.performance.executions++;
      workflow.performance.failedExecutions++;
    }

    workflow.performance.errorRate = 
      workflow.performance.failedExecutions / workflow.performance.executions;
    workflow.performance.lastExecutedAt = new Date();

    return execution;
  }

  /**
   * Activate a workflow
   */
  activateWorkflow(workflowId: string): AuthoredWorkflow {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }

    workflow.status = 'active';
    workflow.activatedAt = new Date();
    workflow.updatedAt = new Date();

    return workflow;
  }

  /**
   * Pause a workflow
   */
  pauseWorkflow(workflowId: string): AuthoredWorkflow {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }

    workflow.status = 'paused';
    workflow.updatedAt = new Date();

    return workflow;
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): AuthoredWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all workflows
   */
  getWorkflows(): AuthoredWorkflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflows by status
   */
  getWorkflowsByStatus(status: WorkflowStatus): AuthoredWorkflow[] {
    return this.getWorkflows().filter(w => w.status === status);
  }

  /**
   * Get workflows by category
   */
  getWorkflowsByCategory(category: string): AuthoredWorkflow[] {
    return this.getWorkflows().filter(w => w.metadata.category === category);
  }

  /**
   * Get templates
   */
  getTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get executions for a workflow
   */
  getExecutions(workflowId: string): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(e => e.workflowId === workflowId);
  }

  /**
   * Get optimizations for a workflow
   */
  getOptimizations(workflowId: string): WorkflowOptimization[] {
    return Array.from(this.optimizations.values()).filter(o => o.workflowId === workflowId);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalWorkflows: number;
    activeWorkflows: number;
    totalExecutions: number;
    successRate: number;
    avgDuration: number;
    templatesAvailable: number;
    optimizationsApplied: number;
  } {
    const workflows = this.getWorkflows();
    const executions = Array.from(this.executions.values());
    const successfulExecutions = executions.filter(e => e.status === 'completed');

    const totalDuration = successfulExecutions.reduce((sum, e) => {
      return sum + (e.completedAt ? e.completedAt.getTime() - e.startedAt.getTime() : 0);
    }, 0);

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter(w => w.status === 'active').length,
      totalExecutions: executions.length,
      successRate: executions.length > 0 ? successfulExecutions.length / executions.length : 0,
      avgDuration: successfulExecutions.length > 0 ? totalDuration / successfulExecutions.length : 0,
      templatesAvailable: this.templates.size,
      optimizationsApplied: Array.from(this.optimizations.values()).filter(o => o.applied).length,
    };
  }

  // Private helper methods

  private estimateDuration(nodes: WorkflowNode[]): number {
    // Estimate based on node types
    let duration = 0;
    for (const node of nodes) {
      switch (node.type) {
        case 'action':
          duration += 5000;
          break;
        case 'condition':
          duration += 100;
          break;
        case 'delay':
          duration += (node.config.delay || 0) * 1000;
          break;
        case 'loop':
          duration += 10000;
          break;
        default:
          duration += 100;
      }
    }
    return duration;
  }

  private assessComplexity(nodes: WorkflowNode[], edges: WorkflowEdge[]): 'simple' | 'moderate' | 'complex' {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const conditionalCount = nodes.filter(n => n.type === 'condition').length;
    const loopCount = nodes.filter(n => n.type === 'loop').length;

    const score = nodeCount + edgeCount * 0.5 + conditionalCount * 2 + loopCount * 3;

    if (score < 10) return 'simple';
    if (score < 25) return 'moderate';
    return 'complex';
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    
    current[parts[parts.length - 1]] = value;
  }

  private parseDescription(description: string): Array<{ type: string; name: string; config: NodeConfig }> {
    const actions: Array<{ type: string; name: string; config: NodeConfig }> = [];
    const words = description.toLowerCase();

    // Simple keyword-based parsing
    if (words.includes('fetch') || words.includes('get')) {
      actions.push({ type: 'action', name: 'Fetch Data', config: { action: 'fetch_data' } });
    }
    if (words.includes('analyze') || words.includes('detect')) {
      actions.push({ type: 'action', name: 'Analyze', config: { action: 'analyze' } });
    }
    if (words.includes('notify') || words.includes('alert')) {
      actions.push({ type: 'action', name: 'Notify', config: { action: 'notify' } });
    }
    if (words.includes('fix') || words.includes('recover')) {
      actions.push({ type: 'action', name: 'Apply Fix', config: { action: 'apply_fix' } });
    }
    if (words.includes('report')) {
      actions.push({ type: 'action', name: 'Generate Report', config: { action: 'generate_report' } });
    }

    // Default action if nothing detected
    if (actions.length === 0) {
      actions.push({ type: 'action', name: 'Process', config: { action: 'process' } });
    }

    return actions;
  }

  private findParallelizableNodes(workflow: AuthoredWorkflow): WorkflowOptimization | null {
    // Find nodes with same parent that could run in parallel
    const nodeParents: Record<string, string[]> = {};
    
    for (const edge of workflow.edges) {
      if (!nodeParents[edge.source]) {
        nodeParents[edge.source] = [];
      }
      nodeParents[edge.source].push(edge.target);
    }

    for (const [parent, children] of Object.entries(nodeParents)) {
      if (children.length >= 2) {
        const parentNode = workflow.nodes.find(n => n.id === parent);
        if (parentNode && parentNode.type !== 'condition') {
          return {
            id: generateId(),
            workflowId: workflow.id,
            type: 'parallelize',
            description: `Nodes ${children.join(', ')} can run in parallel after ${parent}`,
            impact: {
              durationReduction: 0.3,
              errorReduction: 0,
              resourceSavings: 0.1,
            },
            changes: [],
            applied: false,
          };
        }
      }
    }

    return null;
  }

  private findRedundantNodes(workflow: AuthoredWorkflow): WorkflowOptimization | null {
    // Find consecutive action nodes with same action
    for (let i = 0; i < workflow.nodes.length - 1; i++) {
      const current = workflow.nodes[i];
      const next = workflow.nodes[i + 1];
      
      if (current.type === 'action' && next.type === 'action' &&
          current.config.action === next.config.action) {
        return {
          id: generateId(),
          workflowId: workflow.id,
          type: 'remove_redundant',
          description: `Redundant action '${current.name}' can be merged with '${next.name}'`,
          impact: {
            durationReduction: 0.1,
            errorReduction: 0,
            resourceSavings: 0.05,
          },
          changes: [
            { type: 'remove_node', target: next.id },
          ],
          applied: false,
        };
      }
    }

    return null;
  }

  private optimizeConditions(workflow: AuthoredWorkflow): WorkflowOptimization | null {
    // Find nested conditions that could be simplified
    const conditions = workflow.nodes.filter(n => n.type === 'condition');
    
    for (const condition of conditions) {
      const outputs = workflow.edges.filter(e => e.source === condition.id);
      if (outputs.length > 2) {
        return {
          id: generateId(),
          workflowId: workflow.id,
          type: 'optimize_conditions',
          description: `Condition '${condition.name}' has ${outputs.length} branches, consider simplifying`,
          impact: {
            durationReduction: 0.05,
            errorReduction: 0.1,
            resourceSavings: 0,
          },
          changes: [],
          applied: false,
        };
      }
    }

    return null;
  }

  private applyChange(workflow: AuthoredWorkflow, change: WorkflowChange): void {
    switch (change.type) {
      case 'add_node':
        workflow.nodes.push(change.after as WorkflowNode);
        break;
      case 'remove_node':
        workflow.nodes = workflow.nodes.filter(n => n.id !== change.target);
        workflow.edges = workflow.edges.filter(e => e.source !== change.target && e.target !== change.target);
        break;
      case 'modify_node':
        const nodeIndex = workflow.nodes.findIndex(n => n.id === change.target);
        if (nodeIndex !== -1) {
          workflow.nodes[nodeIndex] = { ...workflow.nodes[nodeIndex], ...(change.after as Partial<WorkflowNode>) };
        }
        break;
      case 'add_edge':
        workflow.edges.push(change.after as WorkflowEdge);
        break;
      case 'remove_edge':
        workflow.edges = workflow.edges.filter(e => e.id !== change.target);
        break;
      case 'modify_edge':
        const edgeIndex = workflow.edges.findIndex(e => e.id === change.target);
        if (edgeIndex !== -1) {
          workflow.edges[edgeIndex] = { ...workflow.edges[edgeIndex], ...(change.after as Partial<WorkflowEdge>) };
        }
        break;
    }
  }

  private async executeNode(
    workflow: AuthoredWorkflow,
    node: WorkflowNode,
    execution: WorkflowExecution
  ): Promise<void> {
    const nodeExecution: NodeExecution = {
      nodeId: node.id,
      nodeName: node.name,
      status: 'running',
      startedAt: new Date(),
    };

    execution.nodeExecutions.push(nodeExecution);

    try {
      // Simulate node execution based on type
      switch (node.type) {
        case 'trigger':
        case 'end':
          // No-op for trigger and end nodes
          break;
        case 'action':
          await this.simulateAction(node.config);
          break;
        case 'condition':
          // Evaluate condition
          const conditionResult = this.evaluateCondition(node.config.condition || 'true', execution.variables);
          nodeExecution.output = conditionResult;
          break;
        case 'delay':
          const delayMs = (node.config.delay || 0) * 
            (node.config.delayUnit === 'minutes' ? 60000 : 
             node.config.delayUnit === 'hours' ? 3600000 :
             node.config.delayUnit === 'days' ? 86400000 : 1000);
          await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 100))); // Cap for testing
          break;
      }

      nodeExecution.status = 'completed';
      nodeExecution.completedAt = new Date();

      // Find and execute next nodes
      const outgoingEdges = workflow.edges.filter(e => e.source === node.id);
      for (const edge of outgoingEdges) {
        // Check edge condition if present
        if (edge.condition) {
          const shouldContinue = this.evaluateCondition(edge.condition, { 
            ...execution.variables, 
            output: nodeExecution.output 
          });
          if (!shouldContinue) continue;
        }

        const nextNode = workflow.nodes.find(n => n.id === edge.target);
        if (nextNode) {
          await this.executeNode(workflow, nextNode, execution);
        }
      }

    } catch (error) {
      nodeExecution.status = 'failed';
      nodeExecution.completedAt = new Date();
      nodeExecution.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async simulateAction(config: NodeConfig): Promise<unknown> {
    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    return { success: true, action: config.action };
  }

  private evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
    // Simple condition evaluation
    if (condition === 'true') return true;
    if (condition === 'false') return false;
    
    // Try to evaluate as expression
    try {
      const keys = Object.keys(variables);
      const values = Object.values(variables);
      const fn = new Function(...keys, `return ${condition}`);
      return Boolean(fn(...values));
    } catch {
      return true;
    }
  }

  private updateWorkflowMetrics(workflow: AuthoredWorkflow, execution: WorkflowExecution): void {
    const duration = execution.completedAt 
      ? execution.completedAt.getTime() - execution.startedAt.getTime()
      : 0;

    const n = workflow.performance.successfulExecutions;
    workflow.performance.avgDuration = 
      workflow.performance.avgDuration + (duration - workflow.performance.avgDuration) / n;

    workflow.performance.avgNodesExecuted = 
      workflow.performance.avgNodesExecuted + 
      (execution.nodeExecutions.length - workflow.performance.avgNodesExecuted) / n;
  }
}

export default WorkflowAuthor;
