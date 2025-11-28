/**
 * Dashboard API Routes
 * Endpoints for dashboard metrics and analytics
 */

import { Router, Request, Response } from 'express';
import { RevenueLeak, LeakType, LeakSeverity } from '../../types';

const router = Router();

// In-memory storage for demo (use database in production)
const leakStore = new Map<string, RevenueLeak>();

interface DashboardMetrics {
  totalLeaks: number;
  totalPotentialRevenue: number;
  recoveryRate: number;
  resolvedCount: number;
  leaksByType: Record<LeakType, number>;
  leaksBySeverity: Record<LeakSeverity, number>;
  trendsOverTime: Array<{
    date: string;
    leakCount: number;
    recoveredValue: number;
    newLeaks: number;
  }>;
  topAffectedPipelines: Array<{
    pipelineId: string;
    pipelineName: string;
    leakCount: number;
    potentialRevenue: number;
  }>;
  autonomyScore: number;
}

/**
 * Generate sample metrics (replace with real data in production)
 */
function generateMetrics(): DashboardMetrics {
  const leaks = Array.from(leakStore.values());
  
  const leaksByType: Record<LeakType, number> = {
    underbilling: 0,
    missed_renewal: 0,
    untriggered_crosssell: 0,
    stalled_cs_handoff: 0,
    invalid_lifecycle_path: 0,
    billing_gap: 0,
    stale_pipeline: 0,
    missed_handoff: 0,
    data_quality: 0,
  };

  const leaksBySeverity: Record<LeakSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  let totalPotentialRevenue = 0;

  for (const leak of leaks) {
    leaksByType[leak.type]++;
    leaksBySeverity[leak.severity]++;
    totalPotentialRevenue += leak.potentialRevenue;
  }

  // Generate sample trends
  const trendsOverTime = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    trendsOverTime.push({
      date: date.toISOString().split('T')[0],
      leakCount: Math.floor(Math.random() * 20) + 5,
      recoveredValue: Math.floor(Math.random() * 50000) + 10000,
      newLeaks: Math.floor(Math.random() * 10) + 1,
    });
  }

  // Sample pipelines
  const topAffectedPipelines = [
    { pipelineId: 'sales', pipelineName: 'Sales Pipeline', leakCount: 12, potentialRevenue: 125000 },
    { pipelineId: 'enterprise', pipelineName: 'Enterprise Pipeline', leakCount: 8, potentialRevenue: 350000 },
    { pipelineId: 'renewal', pipelineName: 'Renewal Pipeline', leakCount: 5, potentialRevenue: 75000 },
  ];

  return {
    totalLeaks: leaks.length || 25,
    totalPotentialRevenue: totalPotentialRevenue || 550000,
    recoveryRate: 0.72,
    resolvedCount: 18,
    leaksByType: leaks.length > 0 ? leaksByType : {
      underbilling: 5,
      missed_renewal: 8,
      untriggered_crosssell: 4,
      stalled_cs_handoff: 3,
      invalid_lifecycle_path: 2,
      billing_gap: 2,
      stale_pipeline: 1,
      missed_handoff: 0,
      data_quality: 0,
    },
    leaksBySeverity: leaks.length > 0 ? leaksBySeverity : {
      critical: 3,
      high: 7,
      medium: 10,
      low: 5,
    },
    trendsOverTime,
    topAffectedPipelines,
    autonomyScore: 72,
  };
}

/**
 * GET /dashboard/metrics
 * Get dashboard metrics
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const metrics = generateMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to load dashboard metrics' });
  }
});

/**
 * GET /dashboard/leaks
 * Get all active leaks for dashboard
 */
router.get('/leaks', (req: Request, res: Response) => {
  try {
    const { type, severity, limit = '50', offset = '0' } = req.query;
    let leaks = Array.from(leakStore.values());

    if (type) {
      leaks = leaks.filter(l => l.type === type);
    }

    if (severity) {
      leaks = leaks.filter(l => l.severity === severity);
    }

    // Sort by potential revenue (highest first)
    leaks.sort((a, b) => b.potentialRevenue - a.potentialRevenue);

    const total = leaks.length;
    const paginatedLeaks = leaks.slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string));

    res.json({
      leaks: paginatedLeaks,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Dashboard leaks error:', error);
    res.status(500).json({ error: 'Failed to load leaks' });
  }
});

/**
 * GET /dashboard/trends
 * Get leak trends over time
 */
router.get('/trends', (req: Request, res: Response) => {
  try {
    const { range = '30d' } = req.query;
    
    let days = 30;
    switch (range) {
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      case '1y': days = 365; break;
    }

    const trends = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      trends.push({
        date: date.toISOString().split('T')[0],
        leakCount: Math.floor(Math.random() * 20) + 5,
        recoveredValue: Math.floor(Math.random() * 50000) + 10000,
        newLeaks: Math.floor(Math.random() * 10) + 1,
      });
    }

    res.json({ trends, range });
  } catch (error) {
    console.error('Dashboard trends error:', error);
    res.status(500).json({ error: 'Failed to load trends' });
  }
});

/**
 * GET /dashboard/summary
 * Get executive summary
 */
router.get('/summary', (req: Request, res: Response) => {
  try {
    const metrics = generateMetrics();
    
    const summary = {
      headline: `${metrics.totalLeaks} active revenue leaks detected`,
      revenueAtRisk: metrics.totalPotentialRevenue,
      recoveryRate: metrics.recoveryRate,
      criticalIssues: metrics.leaksBySeverity.critical,
      topLeakType: Object.entries(metrics.leaksByType)
        .sort((a, b) => b[1] - a[1])[0],
      recommendations: [
        metrics.leaksBySeverity.critical > 0 && 'Address critical issues immediately',
        metrics.leaksByType.missed_renewal > 3 && 'Review renewal process',
        metrics.leaksByType.underbilling > 3 && 'Audit billing accuracy',
        metrics.autonomyScore < 70 && 'Improve automation coverage',
      ].filter(Boolean),
    };

    res.json(summary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

export default router;
