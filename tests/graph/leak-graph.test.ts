/**
 * Tests for Leak Graph Engine
 */

import { LeakGraphEngine } from '../../src/graph/leak-graph';
import { RevenueLeak, LeakType, LeakSeverity } from '../../src/types';

describe('LeakGraphEngine', () => {
  let engine: LeakGraphEngine;

  const createMockLeak = (
    id: string,
    type: LeakType,
    severity: LeakSeverity,
    potentialRevenue: number,
    entityId: string = 'entity-1'
  ): RevenueLeak => ({
    id,
    type,
    severity,
    potentialRevenue,
    description: `Test leak ${id}`,
    affectedEntity: {
      type: 'deal',
      id: entityId,
      name: `Deal ${entityId}`,
    },
    detectedAt: new Date(),
    suggestedActions: [],
  });

  beforeEach(() => {
    engine = new LeakGraphEngine();
  });

  describe('addLeak', () => {
    it('should add a leak to the graph', () => {
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 10000);
      
      engine.addLeak(leak);
      const graph = engine.getGraph();
      
      expect(graph.nodes.size).toBe(2); // leak node + entity node
      expect(graph.edges.size).toBe(1); // connection between them
    });

    it('should create entity node for affected entity', () => {
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 10000, 'deal-123');
      
      engine.addLeak(leak);
      const graph = engine.getGraph();
      
      expect(graph.nodes.has('deal:deal-123')).toBe(true);
    });
  });

  describe('buildFromLeaks', () => {
    it('should build graph from multiple leaks', () => {
      const leaks = [
        createMockLeak('leak-1', 'stalled_cs_handoff', 'high', 10000, 'deal-1'),
        createMockLeak('leak-2', 'missed_renewal', 'medium', 5000, 'deal-1'),
        createMockLeak('leak-3', 'underbilling', 'low', 2000, 'deal-2'),
      ];
      
      engine.buildFromLeaks(leaks);
      const graph = engine.getGraph();
      
      expect(graph.nodes.size).toBeGreaterThanOrEqual(5); // 3 leaks + 2 deals
    });

    it('should detect relationships between related leaks', () => {
      const leaks = [
        createMockLeak('leak-1', 'stalled_cs_handoff', 'high', 10000, 'deal-1'),
        createMockLeak('leak-2', 'missed_renewal', 'medium', 5000, 'deal-1'),
      ];
      
      engine.buildFromLeaks(leaks);
      const graph = engine.getGraph();
      
      // Should have edges connecting related leaks (same entity)
      expect(graph.edges.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('analyze', () => {
    it('should return analysis with root causes', () => {
      const leaks = [
        createMockLeak('leak-1', 'stalled_cs_handoff', 'high', 10000),
        createMockLeak('leak-2', 'missed_renewal', 'medium', 5000),
      ];
      
      engine.buildFromLeaks(leaks);
      const analysis = engine.analyze();
      
      expect(analysis.totalNodes).toBeGreaterThan(0);
      expect(analysis.rootCauses).toBeDefined();
      expect(analysis.cascadeRisks).toBeDefined();
      expect(analysis.impactPaths).toBeDefined();
    });

    it('should identify cascade risks', () => {
      const leaks = [
        createMockLeak('leak-1', 'stalled_cs_handoff', 'high', 10000, 'deal-1'),
        createMockLeak('leak-2', 'untriggered_crosssell', 'medium', 5000, 'deal-1'),
      ];
      
      engine.buildFromLeaks(leaks);
      const analysis = engine.analyze();
      
      expect(analysis.cascadeRisks).toBeDefined();
    });
  });

  describe('connectLeaks', () => {
    it('should connect two leaks with a relationship', () => {
      const leak1 = createMockLeak('leak-1', 'underbilling', 'high', 10000);
      const leak2 = createMockLeak('leak-2', 'billing_gap', 'medium', 5000);
      
      engine.addLeak(leak1);
      engine.addLeak(leak2);
      engine.connectLeaks('leak-1', 'leak-2', 'causes');
      
      const graph = engine.getGraph();
      
      // Should have the new edge
      const edges = Array.from(graph.edges.values());
      const connectionEdge = edges.find(e => 
        e.relationship === 'causes' && 
        e.sourceId.includes('leak-1') && 
        e.targetId.includes('leak-2')
      );
      
      expect(connectionEdge).toBeDefined();
    });
  });

  describe('toJSON', () => {
    it('should export graph as JSON', () => {
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 10000);
      engine.addLeak(leak);
      
      const json = engine.toJSON();
      
      expect(json).toHaveProperty('nodes');
      expect(json).toHaveProperty('edges');
      expect(json).toHaveProperty('clusters');
    });
  });

  describe('clear', () => {
    it('should clear the graph', () => {
      const leak = createMockLeak('leak-1', 'underbilling', 'high', 10000);
      engine.addLeak(leak);
      
      engine.clear();
      const graph = engine.getGraph();
      
      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.size).toBe(0);
    });
  });
});
