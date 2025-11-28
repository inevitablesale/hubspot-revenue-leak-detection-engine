/**
 * Leak Graph Engine
 * Tracks relationships between revenue leaks and entities
 * Enables root cause analysis and cascade detection
 */

import { RevenueLeak, Deal, Contact, Company, Contract } from '../types';
import { generateId } from '../utils/helpers';

export interface LeakNode {
  id: string;
  type: 'leak' | 'deal' | 'contact' | 'company' | 'contract' | 'invoice';
  entityId: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface LeakEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: 'causes' | 'related_to' | 'blocks' | 'depends_on' | 'leads_to';
  weight: number;
  metadata?: Record<string, unknown>;
}

export interface LeakGraph {
  nodes: Map<string, LeakNode>;
  edges: Map<string, LeakEdge>;
  leakClusters: LeakCluster[];
}

export interface LeakCluster {
  id: string;
  name: string;
  rootCause?: LeakNode;
  leaks: RevenueLeak[];
  totalPotentialRevenue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface GraphAnalysis {
  totalNodes: number;
  totalEdges: number;
  clusters: LeakCluster[];
  rootCauses: LeakNode[];
  cascadeRisks: CascadeRisk[];
  impactPaths: ImpactPath[];
}

export interface CascadeRisk {
  sourceLeakId: string;
  affectedLeaks: string[];
  totalCascadeRevenue: number;
  probability: number;
}

export interface ImpactPath {
  path: string[];
  totalRevenue: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class LeakGraphEngine {
  private graph: LeakGraph;

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      leakClusters: [],
    };
  }

  /**
   * Add a leak to the graph
   */
  addLeak(leak: RevenueLeak): LeakNode {
    const nodeId = `leak:${leak.id}`;
    const node: LeakNode = {
      id: nodeId,
      type: 'leak',
      entityId: leak.id,
      name: leak.description,
      metadata: {
        leakType: leak.type,
        severity: leak.severity,
        potentialRevenue: leak.potentialRevenue,
      },
    };
    
    this.graph.nodes.set(nodeId, node);
    
    // Add affected entity node
    const entityNodeId = `${leak.affectedEntity.type}:${leak.affectedEntity.id}`;
    if (!this.graph.nodes.has(entityNodeId)) {
      this.graph.nodes.set(entityNodeId, {
        id: entityNodeId,
        type: leak.affectedEntity.type as LeakNode['type'],
        entityId: leak.affectedEntity.id,
        name: leak.affectedEntity.name,
      });
    }
    
    // Create edge from entity to leak
    const edgeId = generateId();
    this.graph.edges.set(edgeId, {
      id: edgeId,
      sourceId: entityNodeId,
      targetId: nodeId,
      relationship: 'causes',
      weight: leak.potentialRevenue,
    });
    
    return node;
  }

  /**
   * Connect related leaks
   */
  connectLeaks(leakId1: string, leakId2: string, relationship: LeakEdge['relationship']): void {
    const node1Id = `leak:${leakId1}`;
    const node2Id = `leak:${leakId2}`;
    
    if (!this.graph.nodes.has(node1Id) || !this.graph.nodes.has(node2Id)) {
      return;
    }
    
    const edgeId = generateId();
    this.graph.edges.set(edgeId, {
      id: edgeId,
      sourceId: node1Id,
      targetId: node2Id,
      relationship,
      weight: 1,
    });
  }

  /**
   * Build graph from multiple leaks
   */
  buildFromLeaks(leaks: RevenueLeak[]): void {
    // Add all leaks
    for (const leak of leaks) {
      this.addLeak(leak);
    }
    
    // Auto-detect relationships
    this.detectRelationships(leaks);
    
    // Identify clusters
    this.identifyClusters();
  }

  /**
   * Auto-detect relationships between leaks
   */
  private detectRelationships(leaks: RevenueLeak[]): void {
    for (let i = 0; i < leaks.length; i++) {
      for (let j = i + 1; j < leaks.length; j++) {
        const leak1 = leaks[i];
        const leak2 = leaks[j];
        
        // Same entity - related
        if (leak1.affectedEntity.id === leak2.affectedEntity.id) {
          this.connectLeaks(leak1.id, leak2.id, 'related_to');
        }
        
        // Cause-effect patterns
        if (this.isCauseEffect(leak1, leak2)) {
          this.connectLeaks(leak1.id, leak2.id, 'causes');
        }
        
        // Blocking relationships
        if (this.isBlocking(leak1, leak2)) {
          this.connectLeaks(leak1.id, leak2.id, 'blocks');
        }
      }
    }
  }

  /**
   * Check if leak1 causes leak2
   */
  private isCauseEffect(leak1: RevenueLeak, leak2: RevenueLeak): boolean {
    // Stalled handoff can lead to missed renewal
    if (leak1.type === 'stalled_cs_handoff' && leak2.type === 'missed_renewal') {
      return true;
    }
    
    // Invalid lifecycle can lead to underbilling
    if (leak1.type === 'invalid_lifecycle_path' && leak2.type === 'underbilling') {
      return true;
    }
    
    // Missed cross-sell leads to billing gap
    if (leak1.type === 'untriggered_crosssell' && leak2.type === 'billing_gap') {
      return true;
    }
    
    return false;
  }

  /**
   * Check if leak1 blocks resolution of leak2
   */
  private isBlocking(leak1: RevenueLeak, leak2: RevenueLeak): boolean {
    // CS handoff issues block cross-sell
    if (leak1.type === 'stalled_cs_handoff' && leak2.type === 'untriggered_crosssell') {
      return true;
    }
    
    return false;
  }

  /**
   * Identify leak clusters using connected components
   */
  private identifyClusters(): void {
    const visited = new Set<string>();
    const clusters: LeakCluster[] = [];
    
    // Get all leak nodes
    const leakNodes = Array.from(this.graph.nodes.values())
      .filter(n => n.type === 'leak');
    
    for (const node of leakNodes) {
      if (visited.has(node.id)) {
        continue;
      }
      
      // BFS to find connected component
      const component = this.findConnectedComponent(node.id, visited);
      
      if (component.length > 0) {
        const totalRevenue = component.reduce((sum, nodeId) => {
          const n = this.graph.nodes.get(nodeId);
          return sum + ((n?.metadata?.potentialRevenue as number) || 0);
        }, 0);
        
        clusters.push({
          id: generateId(),
          name: `Cluster ${clusters.length + 1}`,
          leaks: [],
          totalPotentialRevenue: totalRevenue,
          severity: this.calculateClusterSeverity(totalRevenue, component.length),
        });
      }
    }
    
    this.graph.leakClusters = clusters;
  }

  /**
   * Find connected component starting from a node
   */
  private findConnectedComponent(startId: string, visited: Set<string>): string[] {
    const component: string[] = [];
    const queue: string[] = [startId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      
      if (visited.has(nodeId)) {
        continue;
      }
      
      visited.add(nodeId);
      const node = this.graph.nodes.get(nodeId);
      
      if (node?.type === 'leak') {
        component.push(nodeId);
      }
      
      // Find connected nodes
      for (const edge of this.graph.edges.values()) {
        if (edge.sourceId === nodeId && !visited.has(edge.targetId)) {
          queue.push(edge.targetId);
        }
        if (edge.targetId === nodeId && !visited.has(edge.sourceId)) {
          queue.push(edge.sourceId);
        }
      }
    }
    
    return component;
  }

  /**
   * Calculate cluster severity
   */
  private calculateClusterSeverity(revenue: number, count: number): 'low' | 'medium' | 'high' | 'critical' {
    if (revenue >= 100000 || count >= 10) return 'critical';
    if (revenue >= 50000 || count >= 5) return 'high';
    if (revenue >= 20000 || count >= 3) return 'medium';
    return 'low';
  }

  /**
   * Analyze the graph for insights
   */
  analyze(): GraphAnalysis {
    const rootCauses = this.findRootCauses();
    const cascadeRisks = this.calculateCascadeRisks();
    const impactPaths = this.findImpactPaths();
    
    return {
      totalNodes: this.graph.nodes.size,
      totalEdges: this.graph.edges.size,
      clusters: this.graph.leakClusters,
      rootCauses,
      cascadeRisks,
      impactPaths,
    };
  }

  /**
   * Find root cause leaks (no incoming "causes" edges)
   */
  private findRootCauses(): LeakNode[] {
    const hasIncomingCause = new Set<string>();
    
    for (const edge of this.graph.edges.values()) {
      if (edge.relationship === 'causes') {
        hasIncomingCause.add(edge.targetId);
      }
    }
    
    return Array.from(this.graph.nodes.values())
      .filter(n => n.type === 'leak' && !hasIncomingCause.has(n.id));
  }

  /**
   * Calculate cascade risks
   */
  private calculateCascadeRisks(): CascadeRisk[] {
    const risks: CascadeRisk[] = [];
    
    for (const node of this.graph.nodes.values()) {
      if (node.type !== 'leak') continue;
      
      const affected = this.findDownstreamLeaks(node.id);
      
      if (affected.length > 0) {
        const totalRevenue = affected.reduce((sum, id) => {
          const n = this.graph.nodes.get(id);
          return sum + ((n?.metadata?.potentialRevenue as number) || 0);
        }, 0);
        
        risks.push({
          sourceLeakId: node.entityId,
          affectedLeaks: affected.map(id => {
            const n = this.graph.nodes.get(id);
            return n?.entityId || id;
          }),
          totalCascadeRevenue: totalRevenue,
          probability: Math.min(0.9, 0.3 + affected.length * 0.1),
        });
      }
    }
    
    return risks.sort((a, b) => b.totalCascadeRevenue - a.totalCascadeRevenue);
  }

  /**
   * Find leaks downstream from a given leak
   */
  private findDownstreamLeaks(startId: string): string[] {
    const downstream: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [startId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      for (const edge of this.graph.edges.values()) {
        if (edge.sourceId === nodeId && edge.relationship === 'causes') {
          const targetNode = this.graph.nodes.get(edge.targetId);
          if (targetNode?.type === 'leak' && !visited.has(edge.targetId)) {
            downstream.push(edge.targetId);
            queue.push(edge.targetId);
          }
        }
      }
    }
    
    return downstream;
  }

  /**
   * Find critical impact paths
   */
  private findImpactPaths(): ImpactPath[] {
    const paths: ImpactPath[] = [];
    const rootCauses = this.findRootCauses();
    
    for (const root of rootCauses) {
      const path = this.dfsPath(root.id, [], new Set());
      if (path.length > 1) {
        const totalRevenue = path.reduce((sum, id) => {
          const n = this.graph.nodes.get(id);
          return sum + ((n?.metadata?.potentialRevenue as number) || 0);
        }, 0);
        
        paths.push({
          path: path.map(id => {
            const n = this.graph.nodes.get(id);
            return n?.entityId || id;
          }),
          totalRevenue,
          riskLevel: this.calculatePathRisk(totalRevenue, path.length),
        });
      }
    }
    
    return paths.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * DFS to find longest path
   */
  private dfsPath(nodeId: string, currentPath: string[], visited: Set<string>): string[] {
    if (visited.has(nodeId)) return currentPath;
    
    visited.add(nodeId);
    currentPath.push(nodeId);
    
    let longestPath = [...currentPath];
    
    for (const edge of this.graph.edges.values()) {
      if (edge.sourceId === nodeId && edge.relationship === 'causes') {
        const newPath = this.dfsPath(edge.targetId, [...currentPath], new Set(visited));
        if (newPath.length > longestPath.length) {
          longestPath = newPath;
        }
      }
    }
    
    return longestPath;
  }

  /**
   * Calculate path risk level
   */
  private calculatePathRisk(revenue: number, length: number): 'low' | 'medium' | 'high' | 'critical' {
    if (revenue >= 50000 || length >= 5) return 'critical';
    if (revenue >= 25000 || length >= 4) return 'high';
    if (revenue >= 10000 || length >= 3) return 'medium';
    return 'low';
  }

  /**
   * Get the full graph
   */
  getGraph(): LeakGraph {
    return this.graph;
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      leakClusters: [],
    };
  }

  /**
   * Export graph as JSON
   */
  toJSON(): object {
    return {
      nodes: Array.from(this.graph.nodes.values()),
      edges: Array.from(this.graph.edges.values()),
      clusters: this.graph.leakClusters,
    };
  }
}

export default LeakGraphEngine;
