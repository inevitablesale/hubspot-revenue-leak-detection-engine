/**
 * Breeze Agent Memory and Context
 * Stores conversation history and leak context for AI-powered interactions
 */

import { RevenueLeak, LeakDetectionResult } from '../types';
import { generateId } from '../utils/helpers';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface LeakContext {
  leak: RevenueLeak;
  analysisNotes: string[];
  userFeedback: string[];
  resolutionAttempts: ResolutionAttempt[];
  priority: number;
}

export interface ResolutionAttempt {
  id: string;
  actionTaken: string;
  result: 'success' | 'partial' | 'failed';
  timestamp: Date;
  notes?: string;
}

export interface AgentSession {
  id: string;
  portalId: string;
  userId: string;
  startedAt: Date;
  lastActivityAt: Date;
  conversationHistory: ConversationMessage[];
  activeLeaks: Map<string, LeakContext>;
  preferences: AgentPreferences;
}

export interface AgentPreferences {
  defaultPriority: 'revenue' | 'severity' | 'age';
  notificationThreshold: 'all' | 'high' | 'critical';
  autoResolveEnabled: boolean;
  language: string;
}

export interface AgentMemory {
  shortTerm: ShortTermMemory;
  longTerm: LongTermMemory;
  workingContext: WorkingContext;
}

export interface ShortTermMemory {
  recentLeaks: RevenueLeak[];
  recentActions: string[];
  currentFocus?: RevenueLeak;
  conversationContext: string[];
}

export interface LongTermMemory {
  leakPatterns: Map<string, LeakPattern>;
  resolutionStrategies: Map<string, ResolutionStrategy>;
  userPreferences: Map<string, unknown>;
  historicalMetrics: HistoricalMetrics;
}

export interface LeakPattern {
  id: string;
  leakType: string;
  frequency: number;
  averageRevenue: number;
  commonCauses: string[];
  effectiveResolutions: string[];
}

export interface ResolutionStrategy {
  id: string;
  name: string;
  leakTypes: string[];
  steps: string[];
  successRate: number;
  averageResolutionTime: number;
}

export interface HistoricalMetrics {
  totalLeaksDetected: number;
  totalLeaksResolved: number;
  totalRevenueRecovered: number;
  averageResolutionTime: number;
  resolutionsByType: Map<string, number>;
}

export interface WorkingContext {
  currentObjective: string;
  activeEntities: string[];
  pendingActions: string[];
  constraints: string[];
}

export class BreezeAgentMemory {
  private sessions: Map<string, AgentSession> = new Map();
  private globalMemory: AgentMemory;

  constructor() {
    this.globalMemory = {
      shortTerm: {
        recentLeaks: [],
        recentActions: [],
        conversationContext: [],
      },
      longTerm: {
        leakPatterns: new Map(),
        resolutionStrategies: this.initializeDefaultStrategies(),
        userPreferences: new Map(),
        historicalMetrics: {
          totalLeaksDetected: 0,
          totalLeaksResolved: 0,
          totalRevenueRecovered: 0,
          averageResolutionTime: 0,
          resolutionsByType: new Map(),
        },
      },
      workingContext: {
        currentObjective: '',
        activeEntities: [],
        pendingActions: [],
        constraints: [],
      },
    };
  }

  /**
   * Create a new agent session
   */
  createSession(portalId: string, userId: string): AgentSession {
    const session: AgentSession = {
      id: generateId(),
      portalId,
      userId,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      conversationHistory: [],
      activeLeaks: new Map(),
      preferences: {
        defaultPriority: 'revenue',
        notificationThreshold: 'high',
        autoResolveEnabled: false,
        language: 'en',
      },
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get or create session
   */
  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Add message to conversation history
   */
  addMessage(sessionId: string, role: ConversationMessage['role'], content: string): ConversationMessage {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const message: ConversationMessage = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
    };

    session.conversationHistory.push(message);
    session.lastActivityAt = new Date();

    // Update short-term memory
    this.globalMemory.shortTerm.conversationContext.push(content);
    if (this.globalMemory.shortTerm.conversationContext.length > 10) {
      this.globalMemory.shortTerm.conversationContext.shift();
    }

    return message;
  }

  /**
   * Add leak to session context
   */
  addLeakContext(sessionId: string, leak: RevenueLeak): LeakContext {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const context: LeakContext = {
      leak,
      analysisNotes: [],
      userFeedback: [],
      resolutionAttempts: [],
      priority: this.calculatePriority(leak, session.preferences),
    };

    session.activeLeaks.set(leak.id, context);
    
    // Update short-term memory
    this.globalMemory.shortTerm.recentLeaks.unshift(leak);
    if (this.globalMemory.shortTerm.recentLeaks.length > 20) {
      this.globalMemory.shortTerm.recentLeaks.pop();
    }

    // Update long-term patterns
    this.updateLeakPatterns(leak);

    return context;
  }

  /**
   * Record a resolution attempt
   */
  recordResolutionAttempt(
    sessionId: string,
    leakId: string,
    actionTaken: string,
    result: ResolutionAttempt['result'],
    notes?: string
  ): ResolutionAttempt {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const leakContext = session.activeLeaks.get(leakId);
    if (!leakContext) {
      throw new Error(`Leak ${leakId} not in session context`);
    }

    const attempt: ResolutionAttempt = {
      id: generateId(),
      actionTaken,
      result,
      timestamp: new Date(),
      notes,
    };

    leakContext.resolutionAttempts.push(attempt);

    // Update metrics
    if (result === 'success') {
      this.globalMemory.longTerm.historicalMetrics.totalLeaksResolved++;
      this.globalMemory.longTerm.historicalMetrics.totalRevenueRecovered += 
        leakContext.leak.potentialRevenue;
      
      const typeCount = this.globalMemory.longTerm.historicalMetrics.resolutionsByType;
      typeCount.set(leakContext.leak.type, (typeCount.get(leakContext.leak.type) || 0) + 1);
    }

    // Update short-term actions
    this.globalMemory.shortTerm.recentActions.unshift(actionTaken);
    if (this.globalMemory.shortTerm.recentActions.length > 10) {
      this.globalMemory.shortTerm.recentActions.pop();
    }

    return attempt;
  }

  /**
   * Set current focus leak
   */
  setFocus(leak: RevenueLeak): void {
    this.globalMemory.shortTerm.currentFocus = leak;
  }

  /**
   * Get current working context
   */
  getWorkingContext(): WorkingContext {
    return this.globalMemory.workingContext;
  }

  /**
   * Update working context
   */
  updateWorkingContext(updates: Partial<WorkingContext>): void {
    Object.assign(this.globalMemory.workingContext, updates);
  }

  /**
   * Get recommended resolution strategy
   */
  getRecommendedStrategy(leakType: string): ResolutionStrategy | undefined {
    for (const strategy of this.globalMemory.longTerm.resolutionStrategies.values()) {
      if (strategy.leakTypes.includes(leakType)) {
        return strategy;
      }
    }
    return undefined;
  }

  /**
   * Get leak patterns for a type
   */
  getLeakPattern(leakType: string): LeakPattern | undefined {
    return this.globalMemory.longTerm.leakPatterns.get(leakType);
  }

  /**
   * Generate context summary for AI prompt
   */
  generateContextSummary(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    const memory = this.globalMemory;
    
    let summary = '## Current Context\n\n';
    
    // Current focus
    if (memory.shortTerm.currentFocus) {
      summary += `**Current Focus:** ${memory.shortTerm.currentFocus.description}\n`;
      summary += `- Type: ${memory.shortTerm.currentFocus.type}\n`;
      summary += `- Severity: ${memory.shortTerm.currentFocus.severity}\n`;
      summary += `- Potential Revenue: $${memory.shortTerm.currentFocus.potentialRevenue}\n\n`;
    }
    
    // Recent leaks
    if (memory.shortTerm.recentLeaks.length > 0) {
      summary += `**Recent Leaks (${memory.shortTerm.recentLeaks.length}):**\n`;
      for (const leak of memory.shortTerm.recentLeaks.slice(0, 5)) {
        summary += `- ${leak.type}: ${leak.description.substring(0, 50)}...\n`;
      }
      summary += '\n';
    }
    
    // Session active leaks
    if (session && session.activeLeaks.size > 0) {
      summary += `**Active in Session (${session.activeLeaks.size}):**\n`;
      for (const [, context] of Array.from(session.activeLeaks.entries()).slice(0, 5)) {
        summary += `- ${context.leak.type} (Priority: ${context.priority})\n`;
      }
      summary += '\n';
    }
    
    // Historical metrics
    summary += '**Historical Performance:**\n';
    summary += `- Total Resolved: ${memory.longTerm.historicalMetrics.totalLeaksResolved}\n`;
    summary += `- Revenue Recovered: $${memory.longTerm.historicalMetrics.totalRevenueRecovered}\n`;
    
    return summary;
  }

  /**
   * Calculate leak priority
   */
  private calculatePriority(leak: RevenueLeak, preferences: AgentPreferences): number {
    let priority = 0;
    
    // Severity weight
    const severityWeights = { critical: 40, high: 30, medium: 20, low: 10 };
    priority += severityWeights[leak.severity];
    
    // Revenue weight (normalized to 0-40)
    priority += Math.min(40, leak.potentialRevenue / 1000);
    
    // Age weight (older = higher priority)
    const ageInDays = (Date.now() - leak.detectedAt.getTime()) / (1000 * 60 * 60 * 24);
    priority += Math.min(20, ageInDays * 2);
    
    return Math.round(priority);
  }

  /**
   * Update leak patterns from new leak
   */
  private updateLeakPatterns(leak: RevenueLeak): void {
    const patterns = this.globalMemory.longTerm.leakPatterns;
    let pattern = patterns.get(leak.type);
    
    if (!pattern) {
      pattern = {
        id: generateId(),
        leakType: leak.type,
        frequency: 0,
        averageRevenue: 0,
        commonCauses: [],
        effectiveResolutions: [],
      };
      patterns.set(leak.type, pattern);
    }
    
    // Update frequency and average
    pattern.frequency++;
    pattern.averageRevenue = 
      (pattern.averageRevenue * (pattern.frequency - 1) + leak.potentialRevenue) / pattern.frequency;
    
    this.globalMemory.longTerm.historicalMetrics.totalLeaksDetected++;
  }

  /**
   * Initialize default resolution strategies
   */
  private initializeDefaultStrategies(): Map<string, ResolutionStrategy> {
    const strategies = new Map<string, ResolutionStrategy>();
    
    strategies.set('underbilling-strategy', {
      id: 'underbilling-strategy',
      name: 'Underbilling Resolution',
      leakTypes: ['underbilling'],
      steps: [
        'Review pricing against contract terms',
        'Compare with pipeline averages',
        'Identify discount authorizations',
        'Schedule pricing review call',
        'Update deal amount or create adjustment invoice',
      ],
      successRate: 0.75,
      averageResolutionTime: 5,
    });
    
    strategies.set('renewal-strategy', {
      id: 'renewal-strategy',
      name: 'Missed Renewal Recovery',
      leakTypes: ['missed_renewal'],
      steps: [
        'Check contract renewal date and terms',
        'Review customer engagement history',
        'Prepare renewal proposal',
        'Schedule urgent customer call',
        'Process renewal or create new contract',
      ],
      successRate: 0.65,
      averageResolutionTime: 7,
    });
    
    strategies.set('crosssell-strategy', {
      id: 'crosssell-strategy',
      name: 'Cross-Sell Activation',
      leakTypes: ['untriggered_crosssell'],
      steps: [
        'Analyze customer product usage',
        'Identify expansion opportunities',
        'Prepare personalized offer',
        'Schedule discovery call',
        'Create expansion deal',
      ],
      successRate: 0.45,
      averageResolutionTime: 14,
    });
    
    strategies.set('handoff-strategy', {
      id: 'handoff-strategy',
      name: 'CS Handoff Recovery',
      leakTypes: ['stalled_cs_handoff'],
      steps: [
        'Assign CS owner immediately',
        'Review onboarding status',
        'Schedule kickoff meeting',
        'Start onboarding sequence',
        'Confirm customer satisfaction',
      ],
      successRate: 0.85,
      averageResolutionTime: 3,
    });
    
    strategies.set('billing-strategy', {
      id: 'billing-strategy',
      name: 'Billing Gap Resolution',
      leakTypes: ['billing_gap'],
      steps: [
        'Audit delivery records',
        'Compare with invoiced amounts',
        'Generate missing invoices',
        'Follow up on overdue payments',
        'Update billing automation',
      ],
      successRate: 0.80,
      averageResolutionTime: 4,
    });
    
    return strategies;
  }

  /**
   * Get historical metrics
   */
  getHistoricalMetrics(): HistoricalMetrics {
    return this.globalMemory.longTerm.historicalMetrics;
  }

  /**
   * Export memory state
   */
  exportMemory(): object {
    return {
      shortTerm: {
        recentLeaks: this.globalMemory.shortTerm.recentLeaks.length,
        recentActions: this.globalMemory.shortTerm.recentActions,
        currentFocus: this.globalMemory.shortTerm.currentFocus?.id,
      },
      longTerm: {
        patterns: Array.from(this.globalMemory.longTerm.leakPatterns.values()),
        metrics: this.globalMemory.longTerm.historicalMetrics,
      },
      activeSessions: this.sessions.size,
    };
  }
}

export default BreezeAgentMemory;
