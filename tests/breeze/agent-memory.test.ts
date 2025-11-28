/**
 * Tests for Breeze Agent Memory
 */

import { BreezeAgentMemory } from '../../src/breeze/agent-memory';
import { RevenueLeak, LeakType, LeakSeverity } from '../../src/types';

describe('BreezeAgentMemory', () => {
  let memory: BreezeAgentMemory;

  const createMockLeak = (
    id: string,
    type: LeakType,
    severity: LeakSeverity,
    potentialRevenue: number
  ): RevenueLeak => ({
    id,
    type,
    severity,
    potentialRevenue,
    description: `Test leak ${id}`,
    affectedEntity: {
      type: 'deal',
      id: 'deal-1',
      name: 'Test Deal',
    },
    detectedAt: new Date(),
    suggestedActions: [],
  });

  beforeEach(() => {
    memory = new BreezeAgentMemory();
  });

  describe('createSession', () => {
    it('should create a new session', () => {
      const session = memory.createSession('portal-1', 'user-1');
      
      expect(session.id).toBeDefined();
      expect(session.portalId).toBe('portal-1');
      expect(session.userId).toBe('user-1');
      expect(session.conversationHistory).toEqual([]);
      expect(session.activeLeaks.size).toBe(0);
    });

    it('should initialize with default preferences', () => {
      const session = memory.createSession('portal-1', 'user-1');
      
      expect(session.preferences.defaultPriority).toBe('revenue');
      expect(session.preferences.notificationThreshold).toBe('high');
      expect(session.preferences.autoResolveEnabled).toBe(false);
    });
  });

  describe('getSession', () => {
    it('should retrieve an existing session', () => {
      const created = memory.createSession('portal-1', 'user-1');
      const retrieved = memory.getSession(created.id);
      
      expect(retrieved).toBe(created);
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = memory.getSession('non-existent');
      
      expect(retrieved).toBeUndefined();
    });
  });

  describe('addMessage', () => {
    it('should add message to conversation history', () => {
      const session = memory.createSession('portal-1', 'user-1');
      const message = memory.addMessage(session.id, 'user', 'Hello');
      
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello');
      expect(session.conversationHistory.length).toBe(1);
    });

    it('should update lastActivityAt', () => {
      const session = memory.createSession('portal-1', 'user-1');
      const originalActivity = session.lastActivityAt;
      
      // Wait a bit to ensure time difference
      memory.addMessage(session.id, 'user', 'Hello');
      
      expect(session.lastActivityAt.getTime()).toBeGreaterThanOrEqual(originalActivity.getTime());
    });

    it('should throw for non-existent session', () => {
      expect(() => {
        memory.addMessage('non-existent', 'user', 'Hello');
      }).toThrow('Session non-existent not found');
    });
  });

  describe('addLeakContext', () => {
    it('should add leak to session context', () => {
      const session = memory.createSession('portal-1', 'user-1');
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 10000);
      
      const context = memory.addLeakContext(session.id, leak);
      
      expect(context.leak).toBe(leak);
      expect(context.priority).toBeGreaterThan(0);
      expect(session.activeLeaks.has('leak-1')).toBe(true);
    });

    it('should calculate priority based on leak properties', () => {
      const session = memory.createSession('portal-1', 'user-1');
      const criticalLeak = createMockLeak('leak-1', 'missed_renewal', 'critical', 50000);
      const lowLeak = createMockLeak('leak-2', 'underbilling', 'low', 1000);
      
      const criticalContext = memory.addLeakContext(session.id, criticalLeak);
      const lowContext = memory.addLeakContext(session.id, lowLeak);
      
      expect(criticalContext.priority).toBeGreaterThan(lowContext.priority);
    });
  });

  describe('recordResolutionAttempt', () => {
    it('should record a resolution attempt', () => {
      const session = memory.createSession('portal-1', 'user-1');
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 10000);
      memory.addLeakContext(session.id, leak);
      
      const attempt = memory.recordResolutionAttempt(
        session.id,
        'leak-1',
        'Updated pricing',
        'success'
      );
      
      expect(attempt.actionTaken).toBe('Updated pricing');
      expect(attempt.result).toBe('success');
    });

    it('should update metrics on successful resolution', () => {
      const session = memory.createSession('portal-1', 'user-1');
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 10000);
      memory.addLeakContext(session.id, leak);
      
      memory.recordResolutionAttempt(session.id, 'leak-1', 'Fixed', 'success');
      
      const metrics = memory.getHistoricalMetrics();
      expect(metrics.totalLeaksResolved).toBe(1);
      expect(metrics.totalRevenueRecovered).toBe(10000);
    });
  });

  describe('getRecommendedStrategy', () => {
    it('should return strategy for known leak type', () => {
      const strategy = memory.getRecommendedStrategy('underbilling');
      
      expect(strategy).toBeDefined();
      expect(strategy?.name).toBe('Underbilling Resolution');
      expect(strategy?.steps.length).toBeGreaterThan(0);
    });

    it('should return undefined for unknown leak type', () => {
      const strategy = memory.getRecommendedStrategy('unknown' as any);
      
      expect(strategy).toBeUndefined();
    });
  });

  describe('generateContextSummary', () => {
    it('should generate context summary', () => {
      const session = memory.createSession('portal-1', 'user-1');
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 10000);
      memory.addLeakContext(session.id, leak);
      memory.setFocus(leak);
      
      const summary = memory.generateContextSummary(session.id);
      
      expect(summary).toContain('Current Context');
      expect(summary).toContain('underbilling');
    });
  });

  describe('setFocus', () => {
    it('should set current focus leak', () => {
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 10000);
      
      memory.setFocus(leak);
      
      const session = memory.createSession('portal-1', 'user-1');
      const summary = memory.generateContextSummary(session.id);
      expect(summary).toContain('Current Focus');
    });
  });

  describe('exportMemory', () => {
    it('should export memory state', () => {
      const session = memory.createSession('portal-1', 'user-1');
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 10000);
      memory.addLeakContext(session.id, leak);
      
      const exported = memory.exportMemory();
      
      expect(exported).toHaveProperty('shortTerm');
      expect(exported).toHaveProperty('longTerm');
      expect(exported).toHaveProperty('activeSessions');
    });
  });
});
