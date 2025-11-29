/**
 * Benchmarks API Routes
 * Cross-portal intelligence and industry comparisons
 */

import { Router, Request, Response } from 'express';
import { CrossPortalIntelligenceService, BenchmarkMetrics } from '../../intelligence/cross-portal';
import { LeakType, LeakSeverity } from '../../types';

const router = Router();
const benchmarkService = new CrossPortalIntelligenceService();

/**
 * GET /benchmarks
 * Get available benchmark industries and stats
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const stats = benchmarkService.getStats();

    res.json({
      success: true,
      data: {
        availableIndustries: stats.availableIndustries,
        totalSampleSize: stats.totalSampleSize,
        lastUpdated: stats.lastUpdated,
        optInStatus: stats.optInStatus
      }
    });
  } catch (error) {
    console.error('Get benchmarks error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get benchmarks'
    });
  }
});

/**
 * GET /benchmarks/:industry
 * Get benchmark data for a specific industry
 */
router.get('/:industry', (req: Request, res: Response) => {
  try {
    const { industry } = req.params;
    const benchmark = benchmarkService.getIndustryBenchmark(industry);

    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: `Industry benchmark not found: ${industry}`
      });
    }

    res.json({
      success: true,
      data: {
        industry: benchmark.industry,
        sampleSize: benchmark.sampleSize,
        period: benchmark.period,
        metrics: {
          leakRate: formatMetric(benchmark.metrics.leakRate),
          recoveryRate: formatMetric(benchmark.metrics.recoveryRate),
          avgResolutionTime: formatMetric(benchmark.metrics.avgResolutionTime),
          revenueAtRiskPercentage: formatMetric(benchmark.metrics.revenueAtRiskPercentage),
          preventionEffectiveness: formatMetric(benchmark.metrics.preventionEffectiveness),
          automationCoverage: formatMetric(benchmark.metrics.automationCoverage)
        },
        topLeakTypes: benchmark.topLeakTypes,
        lastUpdated: benchmark.lastUpdated
      }
    });
  } catch (error) {
    console.error('Get industry benchmark error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get industry benchmark'
    });
  }
});

/**
 * POST /benchmarks/compare
 * Compare portal metrics against industry benchmarks
 */
router.post('/compare', (req: Request, res: Response) => {
  try {
    const { metrics, industry = 'all' } = req.body;

    if (!metrics) {
      return res.status(400).json({
        success: false,
        error: 'Portal metrics are required'
      });
    }

    // Create default metrics if some are missing
    const portalMetrics: BenchmarkMetrics = {
      leakRate: metrics.leakRate || 0,
      recoveryRate: metrics.recoveryRate || 0,
      avgResolutionTime: metrics.avgResolutionTime || 0,
      revenueAtRiskPercentage: metrics.revenueAtRiskPercentage || 0,
      leakDistribution: metrics.leakDistribution || {} as Record<LeakType, number>,
      severityDistribution: metrics.severityDistribution || {} as Record<LeakSeverity, number>,
      preventionEffectiveness: metrics.preventionEffectiveness || 0,
      automationCoverage: metrics.automationCoverage || 0
    };

    const report = benchmarkService.generateBenchmarkReport(portalMetrics, industry);

    res.json({
      success: true,
      data: {
        id: report.id,
        generatedAt: report.generatedAt,
        industry: report.industry,
        overallScore: report.overallScore,
        overallRank: report.overallRank,
        comparisons: report.comparisons.map(c => ({
          metricName: c.metricName,
          yourValue: c.yourValue,
          industryAverage: c.industryAverage,
          industryMedian: c.industryMedian,
          yourPercentileRank: Math.round(c.yourPercentileRank),
          trend: c.trend,
          insights: c.insights
        })),
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        topRecommendations: report.topRecommendations
      }
    });
  } catch (error) {
    console.error('Compare benchmarks error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compare benchmarks'
    });
  }
});

/**
 * GET /benchmarks/opt-in/status
 * Get opt-in configuration status
 */
router.get('/opt-in/status', (req: Request, res: Response) => {
  try {
    const config = benchmarkService.getOptInConfig();

    res.json({
      success: true,
      data: {
        enabled: config.enabled,
        shareMetrics: config.shareMetrics,
        shareTrends: config.shareTrends,
        industry: config.industry,
        companySize: config.companySize,
        consentDate: config.consentDate
      }
    });
  } catch (error) {
    console.error('Get opt-in status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get opt-in status'
    });
  }
});

/**
 * POST /benchmarks/opt-in/configure
 * Configure opt-in settings for benchmark sharing
 */
router.post('/opt-in/configure', (req: Request, res: Response) => {
  try {
    const { enabled, shareMetrics, shareTrends, industry, companySize, userId } = req.body;

    benchmarkService.configureOptIn({
      enabled,
      shareMetrics,
      shareTrends,
      industry,
      companySize,
      consentUserId: userId
    });

    const updatedConfig = benchmarkService.getOptInConfig();

    res.json({
      success: true,
      data: updatedConfig,
      message: enabled 
        ? 'Successfully opted into anonymous benchmark sharing'
        : 'Benchmark sharing has been disabled'
    });
  } catch (error) {
    console.error('Configure opt-in error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to configure opt-in'
    });
  }
});

/**
 * POST /benchmarks/submit
 * Submit portal metrics for benchmarking (requires opt-in)
 */
router.post('/submit', (req: Request, res: Response) => {
  try {
    const { portalId, industry, companySize, metrics } = req.body;

    const config = benchmarkService.getOptInConfig();
    if (!config.enabled || !config.shareMetrics) {
      return res.status(403).json({
        success: false,
        error: 'Please opt-in to benchmark sharing before submitting metrics'
      });
    }

    benchmarkService.submitPortalMetrics({
      portalId,
      industry: industry || config.industry,
      companySize: companySize || config.companySize as 'small' | 'medium' | 'large' | 'enterprise',
      metrics,
      collectedAt: new Date(),
      isAnonymized: true
    });

    res.json({
      success: true,
      message: 'Metrics submitted successfully (anonymized)'
    });
  } catch (error) {
    console.error('Submit metrics error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit metrics'
    });
  }
});

/**
 * GET /benchmarks/insights
 * Get AI-generated insights based on benchmark comparison
 */
router.get('/insights', (req: Request, res: Response) => {
  try {
    const { industry = 'all' } = req.query;
    const benchmark = benchmarkService.getIndustryBenchmark(industry as string);

    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: `Industry not found: ${industry}`
      });
    }

    const insights = [];

    // Generate insights based on top leak types
    if (benchmark.topLeakTypes.length > 0) {
      const topType = benchmark.topLeakTypes[0];
      const leakTypeLabels: Record<string, string> = {
        missed_renewal: 'Missed Renewals',
        stalled_cs_handoff: 'CS Handoff Issues',
        untriggered_crosssell: 'Cross-sell Opportunities',
        billing_gap: 'Billing Gaps',
        underbilling: 'Underbilling',
        stale_pipeline: 'Stale Pipeline',
        data_quality: 'Data Quality'
      };
      
      insights.push({
        type: 'industry_trend',
        title: `${leakTypeLabels[topType.type] || topType.type} is the #1 issue in ${industry}`,
        description: `${topType.percentage}% of all leaks in the ${industry} industry are ${leakTypeLabels[topType.type]?.toLowerCase() || topType.type}. Consider focusing prevention efforts here.`,
        priority: 'high'
      });
    }

    // Add recovery rate insight
    insights.push({
      type: 'metric_insight',
      title: `Industry average recovery rate: ${benchmark.metrics.recoveryRate.average}%`,
      description: `Top performers achieve ${benchmark.metrics.recoveryRate.percentile75}% recovery rate. Focus on automation and timely escalation to improve.`,
      priority: 'medium'
    });

    // Add automation insight
    insights.push({
      type: 'automation_insight',
      title: `Automation coverage varies widely in ${industry}`,
      description: `Industry average is ${benchmark.metrics.automationCoverage.average}%, but leaders achieve ${benchmark.metrics.automationCoverage.percentile75}%. Increasing automation can improve recovery speed.`,
      priority: 'medium'
    });

    res.json({
      success: true,
      data: {
        industry,
        sampleSize: benchmark.sampleSize,
        insights
      }
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get insights'
    });
  }
});

/**
 * Format statistical summary for API response
 */
function formatMetric(metric: { average: number; median: number; percentile25: number; percentile75: number }) {
  return {
    average: metric.average,
    median: metric.median,
    percentile25: metric.percentile25,
    percentile75: metric.percentile75
  };
}

export default router;
