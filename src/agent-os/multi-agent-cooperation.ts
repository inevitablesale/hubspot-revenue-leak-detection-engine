/**
 * Multi-Agent Cooperation Module
 * Enables all HubSpot apps to act as one ecosystem through inter-agent communication,
 * shared knowledge, collaborative decision making, and distributed task execution
 */

import { generateId } from '../utils/helpers';
import { RevenueLeak } from '../types';

// ============================================================
// Multi-Agent Cooperation Types
// ============================================================

export type AgentRole = 'coordinator' | 'detector' | 'analyzer' | 'executor' | 'reporter' | 'learner';
export type AgentState = 'idle' | 'busy' | 'waiting' | 'offline' | 'error';
export type MessagePriority = 'critical' | 'high' | 'normal' | 'low';
export type ConsensusAlgorithm = 'majority' | 'unanimous' | 'weighted' | 'leader';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  state: AgentState;
  capabilities: AgentCapability[];
  workload: number; // 0-100
  portalId: string;
  appId: string;
  version: string;
  lastHeartbeat: Date;
  metrics: AgentMetrics;
  config: AgentConfig;
  registeredAt: Date;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  inputTypes: string[];
  outputTypes: string[];
  cost: number; // Execution cost
  latency: number; // Expected latency in ms
  reliability: number; // Success rate 0-1
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  avgResponseTime: number;
  avgTaskDuration: number;
  messagesProcessed: number;
  collaborationsJoined: number;
  knowledgeContributions: number;
  reputation: number; // 0-100
}

export interface AgentConfig {
  maxConcurrentTasks: number;
  messageTimeout: number;
  heartbeatInterval: number;
  autoCollaborate: boolean;
  shareKnowledge: boolean;
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string | 'broadcast';
  type: MessageType;
  priority: MessagePriority;
  payload: unknown;
  correlationId?: string;
  replyTo?: string;
  timestamp: Date;
  expiresAt?: Date;
  acknowledged: boolean;
}

export type MessageType = 
  | 'task_request'
  | 'task_response'
  | 'knowledge_share'
  | 'knowledge_query'
  | 'consensus_propose'
  | 'consensus_vote'
  | 'collaboration_invite'
  | 'collaboration_accept'
  | 'collaboration_decline'
  | 'heartbeat'
  | 'alert'
  | 'status_update';

export interface Collaboration {
  id: string;
  name: string;
  purpose: string;
  initiator: string;
  participants: string[];
  state: 'forming' | 'active' | 'voting' | 'executing' | 'completed' | 'failed';
  sharedContext: SharedContext;
  decisions: CollaborationDecision[];
  tasks: CollaborativeTask[];
  createdAt: Date;
  completedAt?: Date;
}

export interface SharedContext {
  leaks: RevenueLeak[];
  insights: SharedInsight[];
  constraints: Record<string, unknown>;
  goals: string[];
  deadline?: Date;
}

export interface SharedInsight {
  id: string;
  contributorId: string;
  type: 'pattern' | 'anomaly' | 'recommendation' | 'warning';
  content: string;
  confidence: number;
  evidence: string[];
  timestamp: Date;
  endorsements: string[];
}

export interface CollaborationDecision {
  id: string;
  topic: string;
  options: DecisionOption[];
  votes: DecisionVote[];
  algorithm: ConsensusAlgorithm;
  status: 'pending' | 'voting' | 'decided' | 'rejected';
  selectedOption?: string;
  decidedAt?: Date;
}

export interface DecisionOption {
  id: string;
  description: string;
  proposer: string;
  impact: Record<string, number>;
  risks: string[];
  weight: number;
}

export interface DecisionVote {
  agentId: string;
  optionId: string;
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

export interface CollaborativeTask {
  id: string;
  name: string;
  assignedTo: string;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  input: unknown;
  output?: unknown;
  startedAt?: Date;
  completedAt?: Date;
}

export interface KnowledgeBase {
  patterns: Map<string, KnowledgePattern>;
  rules: Map<string, KnowledgeRule>;
  experiences: KnowledgeExperience[];
  ontology: KnowledgeOntology;
}

export interface KnowledgePattern {
  id: string;
  name: string;
  description: string;
  discoveredBy: string;
  conditions: Record<string, unknown>;
  frequency: number;
  confidence: number;
  examples: string[];
  createdAt: Date;
  lastSeenAt: Date;
}

export interface KnowledgeRule {
  id: string;
  name: string;
  source: 'learned' | 'shared' | 'predefined';
  contributorId: string;
  condition: string;
  action: string;
  priority: number;
  successRate: number;
  applications: number;
}

export interface KnowledgeExperience {
  id: string;
  agentId: string;
  situation: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  lessons: string[];
  timestamp: Date;
}

export interface KnowledgeOntology {
  concepts: Map<string, OntologyConcept>;
  relationships: OntologyRelationship[];
}

export interface OntologyConcept {
  id: string;
  name: string;
  description: string;
  properties: Record<string, string>;
  parentConcept?: string;
}

export interface OntologyRelationship {
  from: string;
  to: string;
  type: 'is_a' | 'has_a' | 'causes' | 'prevents' | 'related_to';
}

export interface MultiAgentConfig {
  enabled: boolean;
  maxAgents: number;
  heartbeatTimeout: number;
  consensusTimeout: number;
  minConsensusParticipants: number;
  autoDiscovery: boolean;
  knowledgeSharingEnabled: boolean;
}

// ============================================================
// Multi-Agent Cooperation Implementation
// ============================================================

export class MultiAgentCooperation {
  private agents: Map<string, Agent> = new Map();
  private messages: Map<string, AgentMessage> = new Map();
  private collaborations: Map<string, Collaboration> = new Map();
  private knowledgeBase: KnowledgeBase;
  private localAgentId: string;
  private config: MultiAgentConfig;
  private messageHandlers: Map<MessageType, ((msg: AgentMessage) => Promise<void>)[]> = new Map();

  constructor(localAgentId: string, config?: Partial<MultiAgentConfig>) {
    this.localAgentId = localAgentId;
    
    this.config = {
      enabled: true,
      maxAgents: 50,
      heartbeatTimeout: 30000,
      consensusTimeout: 60000,
      minConsensusParticipants: 3,
      autoDiscovery: true,
      knowledgeSharingEnabled: true,
      ...config,
    };

    this.knowledgeBase = {
      patterns: new Map(),
      rules: new Map(),
      experiences: [],
      ontology: {
        concepts: new Map(),
        relationships: [],
      },
    };

    this.initializeMessageHandlers();
    this.initializeKnowledgeBase();
    this.registerLocalAgent();
  }

  /**
   * Initialize message handlers
   */
  private initializeMessageHandlers(): void {
    const messageTypes: MessageType[] = [
      'task_request', 'task_response', 'knowledge_share', 'knowledge_query',
      'consensus_propose', 'consensus_vote', 'collaboration_invite',
      'collaboration_accept', 'collaboration_decline', 'heartbeat',
      'alert', 'status_update',
    ];

    for (const type of messageTypes) {
      this.messageHandlers.set(type, []);
    }
  }

  /**
   * Initialize knowledge base with base concepts
   */
  private initializeKnowledgeBase(): void {
    // Define ontology concepts
    const concepts: OntologyConcept[] = [
      { id: 'revenue_leak', name: 'Revenue Leak', description: 'Loss of potential revenue', properties: {} },
      { id: 'underbilling', name: 'Underbilling', description: 'Charging less than expected', properties: {}, parentConcept: 'revenue_leak' },
      { id: 'missed_renewal', name: 'Missed Renewal', description: 'Failed to renew contract', properties: {}, parentConcept: 'revenue_leak' },
      { id: 'recovery_action', name: 'Recovery Action', description: 'Action to recover revenue', properties: {} },
    ];

    for (const concept of concepts) {
      this.knowledgeBase.ontology.concepts.set(concept.id, concept);
    }

    // Define relationships
    this.knowledgeBase.ontology.relationships = [
      { from: 'underbilling', to: 'revenue_leak', type: 'is_a' },
      { from: 'missed_renewal', to: 'revenue_leak', type: 'is_a' },
      { from: 'recovery_action', to: 'revenue_leak', type: 'prevents' },
    ];

    // Add initial rules
    this.addKnowledgeRule({
      name: 'High Value Leak Priority',
      source: 'predefined',
      contributorId: 'system',
      condition: 'leak.potentialRevenue > 10000',
      action: 'prioritize_recovery',
      priority: 10,
      successRate: 0.85,
      applications: 0,
    });
  }

  /**
   * Register local agent
   */
  private registerLocalAgent(): void {
    const localAgent: Agent = {
      id: this.localAgentId,
      name: 'Local Agent OS',
      role: 'coordinator',
      state: 'idle',
      capabilities: [
        {
          id: 'detect',
          name: 'Leak Detection',
          description: 'Detect revenue leaks',
          inputTypes: ['deal', 'contact', 'contract'],
          outputTypes: ['leak'],
          cost: 1,
          latency: 1000,
          reliability: 0.95,
        },
        {
          id: 'analyze',
          name: 'Analysis',
          description: 'Analyze patterns and anomalies',
          inputTypes: ['leak'],
          outputTypes: ['insight'],
          cost: 2,
          latency: 2000,
          reliability: 0.90,
        },
        {
          id: 'recover',
          name: 'Recovery',
          description: 'Execute recovery actions',
          inputTypes: ['leak', 'action'],
          outputTypes: ['result'],
          cost: 5,
          latency: 5000,
          reliability: 0.80,
        },
      ],
      workload: 0,
      portalId: 'local',
      appId: 'agent-os',
      version: '1.0.0',
      lastHeartbeat: new Date(),
      metrics: {
        tasksCompleted: 0,
        tasksFailed: 0,
        avgResponseTime: 0,
        avgTaskDuration: 0,
        messagesProcessed: 0,
        collaborationsJoined: 0,
        knowledgeContributions: 0,
        reputation: 100,
      },
      config: {
        maxConcurrentTasks: 5,
        messageTimeout: 30000,
        heartbeatInterval: 10000,
        autoCollaborate: true,
        shareKnowledge: true,
      },
      registeredAt: new Date(),
    };

    this.agents.set(localAgent.id, localAgent);
  }

  /**
   * Register an external agent
   */
  registerAgent(agentInfo: Omit<Agent, 'metrics' | 'registeredAt'>): Agent {
    if (this.agents.size >= this.config.maxAgents) {
      throw new Error('Maximum number of agents reached');
    }

    const agent: Agent = {
      ...agentInfo,
      metrics: {
        tasksCompleted: 0,
        tasksFailed: 0,
        avgResponseTime: 0,
        avgTaskDuration: 0,
        messagesProcessed: 0,
        collaborationsJoined: 0,
        knowledgeContributions: 0,
        reputation: 50, // Start with neutral reputation
      },
      registeredAt: new Date(),
    };

    this.agents.set(agent.id, agent);
    
    // Broadcast registration
    this.broadcast('status_update', { type: 'agent_registered', agentId: agent.id });

    return agent;
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    if (agentId === this.localAgentId) {
      throw new Error('Cannot unregister local agent');
    }

    const result = this.agents.delete(agentId);
    if (result) {
      this.broadcast('status_update', { type: 'agent_unregistered', agentId });
    }
    return result;
  }

  /**
   * Send a message to another agent
   */
  async sendMessage(
    to: string | 'broadcast',
    type: MessageType,
    payload: unknown,
    options: {
      priority?: MessagePriority;
      correlationId?: string;
      replyTo?: string;
      ttlMs?: number;
    } = {}
  ): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: generateId(),
      from: this.localAgentId,
      to,
      type,
      priority: options.priority || 'normal',
      payload,
      correlationId: options.correlationId,
      replyTo: options.replyTo,
      timestamp: new Date(),
      expiresAt: options.ttlMs ? new Date(Date.now() + options.ttlMs) : undefined,
      acknowledged: false,
    };

    this.messages.set(message.id, message);

    // Route message
    if (to === 'broadcast') {
      await this.broadcast(type, payload, options);
    } else {
      await this.deliverMessage(message);
    }

    // Update local agent metrics
    const localAgent = this.agents.get(this.localAgentId);
    if (localAgent) {
      localAgent.metrics.messagesProcessed++;
    }

    return message;
  }

  /**
   * Broadcast message to all agents
   */
  private async broadcast(
    type: MessageType,
    payload: unknown,
    options: Partial<{ priority: MessagePriority; correlationId: string }> = {}
  ): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      if (agentId !== this.localAgentId && agent.state !== 'offline') {
        const message: AgentMessage = {
          id: generateId(),
          from: this.localAgentId,
          to: agentId,
          type,
          priority: options.priority || 'normal',
          payload,
          correlationId: options.correlationId,
          timestamp: new Date(),
          acknowledged: false,
        };
        await this.deliverMessage(message);
      }
    }
  }

  /**
   * Deliver message to target agent
   */
  private async deliverMessage(message: AgentMessage): Promise<void> {
    // In a real implementation, this would send over network
    // For now, simulate local delivery
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      for (const handler of handlers) {
        await handler(message);
      }
    }
  }

  /**
   * Register message handler
   */
  onMessage(type: MessageType, handler: (msg: AgentMessage) => Promise<void>): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.push(handler);
    }
  }

  /**
   * Start a collaboration
   */
  async startCollaboration(
    name: string,
    purpose: string,
    participantIds: string[],
    context: Partial<SharedContext> = {}
  ): Promise<Collaboration> {
    const collaboration: Collaboration = {
      id: generateId(),
      name,
      purpose,
      initiator: this.localAgentId,
      participants: [this.localAgentId],
      state: 'forming',
      sharedContext: {
        leaks: context.leaks || [],
        insights: context.insights || [],
        constraints: context.constraints || {},
        goals: context.goals || [],
        deadline: context.deadline,
      },
      decisions: [],
      tasks: [],
      createdAt: new Date(),
    };

    this.collaborations.set(collaboration.id, collaboration);

    // Invite participants
    for (const participantId of participantIds) {
      if (participantId !== this.localAgentId) {
        await this.sendMessage(participantId, 'collaboration_invite', {
          collaborationId: collaboration.id,
          name,
          purpose,
          context: collaboration.sharedContext,
        });
      }
    }

    return collaboration;
  }

  /**
   * Join a collaboration
   */
  async joinCollaboration(collaborationId: string): Promise<boolean> {
    const collaboration = this.collaborations.get(collaborationId);
    if (!collaboration) return false;

    if (!collaboration.participants.includes(this.localAgentId)) {
      collaboration.participants.push(this.localAgentId);
    }

    // Update local agent metrics
    const localAgent = this.agents.get(this.localAgentId);
    if (localAgent) {
      localAgent.metrics.collaborationsJoined++;
    }

    // Notify initiator
    await this.sendMessage(collaboration.initiator, 'collaboration_accept', {
      collaborationId,
    });

    // Transition to active if enough participants
    if (collaboration.participants.length >= this.config.minConsensusParticipants) {
      collaboration.state = 'active';
    }

    return true;
  }

  /**
   * Propose a decision in a collaboration
   */
  async proposeDecision(
    collaborationId: string,
    topic: string,
    options: Omit<DecisionOption, 'id'>[]
  ): Promise<CollaborationDecision> {
    const collaboration = this.collaborations.get(collaborationId);
    if (!collaboration) {
      throw new Error('Collaboration not found');
    }

    const decision: CollaborationDecision = {
      id: generateId(),
      topic,
      options: options.map(opt => ({ ...opt, id: generateId() })),
      votes: [],
      algorithm: 'majority',
      status: 'pending',
    };

    collaboration.decisions.push(decision);
    collaboration.state = 'voting';

    // Broadcast decision proposal
    for (const participantId of collaboration.participants) {
      if (participantId !== this.localAgentId) {
        await this.sendMessage(participantId, 'consensus_propose', {
          collaborationId,
          decision,
        });
      }
    }

    return decision;
  }

  /**
   * Vote on a decision
   */
  async vote(
    collaborationId: string,
    decisionId: string,
    optionId: string,
    confidence: number,
    reasoning: string
  ): Promise<DecisionVote> {
    const collaboration = this.collaborations.get(collaborationId);
    if (!collaboration) {
      throw new Error('Collaboration not found');
    }

    const decision = collaboration.decisions.find(d => d.id === decisionId);
    if (!decision) {
      throw new Error('Decision not found');
    }

    const vote: DecisionVote = {
      agentId: this.localAgentId,
      optionId,
      confidence,
      reasoning,
      timestamp: new Date(),
    };

    decision.votes.push(vote);

    // Broadcast vote
    for (const participantId of collaboration.participants) {
      if (participantId !== this.localAgentId) {
        await this.sendMessage(participantId, 'consensus_vote', {
          collaborationId,
          decisionId,
          vote,
        });
      }
    }

    // Check if consensus reached
    if (decision.votes.length >= collaboration.participants.length) {
      this.resolveDecision(decision);
    }

    return vote;
  }

  /**
   * Resolve a decision based on votes
   */
  private resolveDecision(decision: CollaborationDecision): void {
    const voteCounts = new Map<string, number>();
    
    for (const vote of decision.votes) {
      const current = voteCounts.get(vote.optionId) || 0;
      voteCounts.set(vote.optionId, current + vote.confidence);
    }

    let maxVotes = 0;
    let winner: string | undefined;

    for (const [optionId, votes] of voteCounts) {
      if (votes > maxVotes) {
        maxVotes = votes;
        winner = optionId;
      }
    }

    decision.selectedOption = winner;
    decision.status = 'decided';
    decision.decidedAt = new Date();
  }

  /**
   * Share knowledge with other agents
   */
  async shareKnowledge(
    knowledgeType: 'pattern' | 'rule' | 'experience',
    content: unknown
  ): Promise<void> {
    if (!this.config.knowledgeSharingEnabled) return;

    await this.broadcast('knowledge_share', {
      type: knowledgeType,
      content,
      contributorId: this.localAgentId,
    });

    // Update local agent metrics
    const localAgent = this.agents.get(this.localAgentId);
    if (localAgent) {
      localAgent.metrics.knowledgeContributions++;
    }
  }

  /**
   * Add a knowledge pattern
   */
  addKnowledgePattern(pattern: Omit<KnowledgePattern, 'id' | 'createdAt' | 'lastSeenAt'>): KnowledgePattern {
    const newPattern: KnowledgePattern = {
      ...pattern,
      id: generateId(),
      createdAt: new Date(),
      lastSeenAt: new Date(),
    };

    this.knowledgeBase.patterns.set(newPattern.id, newPattern);
    return newPattern;
  }

  /**
   * Add a knowledge rule
   */
  addKnowledgeRule(rule: Omit<KnowledgeRule, 'id'>): KnowledgeRule {
    const newRule: KnowledgeRule = {
      ...rule,
      id: generateId(),
    };

    this.knowledgeBase.rules.set(newRule.id, newRule);
    return newRule;
  }

  /**
   * Add a knowledge experience
   */
  addKnowledgeExperience(experience: Omit<KnowledgeExperience, 'id' | 'timestamp'>): KnowledgeExperience {
    const newExperience: KnowledgeExperience = {
      ...experience,
      id: generateId(),
      timestamp: new Date(),
    };

    this.knowledgeBase.experiences.push(newExperience);
    return newExperience;
  }

  /**
   * Query knowledge base
   */
  queryKnowledge(query: {
    type?: 'pattern' | 'rule' | 'experience';
    keywords?: string[];
    minConfidence?: number;
    limit?: number;
  }): {
    patterns: KnowledgePattern[];
    rules: KnowledgeRule[];
    experiences: KnowledgeExperience[];
  } {
    let patterns = Array.from(this.knowledgeBase.patterns.values());
    let rules = Array.from(this.knowledgeBase.rules.values());
    let experiences = [...this.knowledgeBase.experiences];

    // Filter by type
    if (query.type === 'pattern') {
      rules = [];
      experiences = [];
    } else if (query.type === 'rule') {
      patterns = [];
      experiences = [];
    } else if (query.type === 'experience') {
      patterns = [];
      rules = [];
    }

    // Filter by confidence
    if (query.minConfidence !== undefined) {
      patterns = patterns.filter(p => p.confidence >= query.minConfidence!);
      rules = rules.filter(r => r.successRate >= query.minConfidence!);
    }

    // Apply limit
    if (query.limit) {
      patterns = patterns.slice(0, query.limit);
      rules = rules.slice(0, query.limit);
      experiences = experiences.slice(0, query.limit);
    }

    return { patterns, rules, experiences };
  }

  /**
   * Find best agent for a capability
   */
  findAgentForCapability(
    capabilityName: string,
    options: {
      excludeAgents?: string[];
      maxWorkload?: number;
      minReliability?: number;
    } = {}
  ): Agent | undefined {
    let candidates = Array.from(this.agents.values()).filter(agent => {
      if (options.excludeAgents?.includes(agent.id)) return false;
      if (agent.state === 'offline' || agent.state === 'error') return false;
      if (options.maxWorkload && agent.workload > options.maxWorkload) return false;
      
      const capability = agent.capabilities.find(c => c.name === capabilityName);
      if (!capability) return false;
      if (options.minReliability && capability.reliability < options.minReliability) return false;
      
      return true;
    });

    if (candidates.length === 0) return undefined;

    // Sort by workload and reputation
    candidates.sort((a, b) => {
      const scoreA = (100 - a.workload) * 0.5 + a.metrics.reputation * 0.5;
      const scoreB = (100 - b.workload) * 0.5 + b.metrics.reputation * 0.5;
      return scoreB - scoreA;
    });

    return candidates[0];
  }

  /**
   * Delegate task to another agent
   */
  async delegateTask(
    agentId: string,
    taskName: string,
    input: unknown,
    timeout: number = 30000
  ): Promise<{ success: boolean; output?: unknown; error?: string }> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    if (agent.state !== 'idle' && agent.workload >= 100) {
      return { success: false, error: 'Agent is busy' };
    }

    const correlationId = generateId();
    
    await this.sendMessage(agentId, 'task_request', {
      taskName,
      input,
    }, {
      correlationId,
      ttlMs: timeout,
    });

    // In a real implementation, this would wait for response
    // Simulate immediate response for now
    return { success: true, output: { delegated: true, to: agentId } };
  }

  /**
   * Update agent heartbeat
   */
  updateHeartbeat(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.lastHeartbeat = new Date();
    if (agent.state === 'offline') {
      agent.state = 'idle';
    }

    return true;
  }

  /**
   * Check for offline agents
   */
  checkAgentHealth(): string[] {
    const offlineAgents: string[] = [];
    const now = Date.now();

    for (const [agentId, agent] of this.agents) {
      if (agentId === this.localAgentId) continue;

      const timeSinceHeartbeat = now - agent.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > this.config.heartbeatTimeout) {
        agent.state = 'offline';
        offlineAgents.push(agentId);
      }
    }

    return offlineAgents;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by role
   */
  getAgentsByRole(role: AgentRole): Agent[] {
    return this.getAgents().filter(a => a.role === role);
  }

  /**
   * Get collaboration by ID
   */
  getCollaboration(collaborationId: string): Collaboration | undefined {
    return this.collaborations.get(collaborationId);
  }

  /**
   * Get all collaborations
   */
  getCollaborations(): Collaboration[] {
    return Array.from(this.collaborations.values());
  }

  /**
   * Get knowledge base statistics
   */
  getKnowledgeStats(): {
    patterns: number;
    rules: number;
    experiences: number;
    concepts: number;
    relationships: number;
  } {
    return {
      patterns: this.knowledgeBase.patterns.size,
      rules: this.knowledgeBase.rules.size,
      experiences: this.knowledgeBase.experiences.length,
      concepts: this.knowledgeBase.ontology.concepts.size,
      relationships: this.knowledgeBase.ontology.relationships.length,
    };
  }

  /**
   * Get system statistics
   */
  getStats(): {
    totalAgents: number;
    onlineAgents: number;
    offlineAgents: number;
    activeCollaborations: number;
    completedCollaborations: number;
    totalMessages: number;
    knowledgeItems: number;
  } {
    const agents = this.getAgents();
    const collaborations = this.getCollaborations();
    const knowledge = this.getKnowledgeStats();

    return {
      totalAgents: agents.length,
      onlineAgents: agents.filter(a => a.state !== 'offline').length,
      offlineAgents: agents.filter(a => a.state === 'offline').length,
      activeCollaborations: collaborations.filter(c => c.state === 'active' || c.state === 'voting').length,
      completedCollaborations: collaborations.filter(c => c.state === 'completed').length,
      totalMessages: this.messages.size,
      knowledgeItems: knowledge.patterns + knowledge.rules + knowledge.experiences,
    };
  }
}

export default MultiAgentCooperation;
