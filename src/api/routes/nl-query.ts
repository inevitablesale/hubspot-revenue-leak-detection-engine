/**
 * Natural Language Query API Routes
 * "Ask anything" interface for leak data
 */

import { Router, Request, Response } from 'express';
import { NaturalLanguageQueryService, QueryContext, NLQueryRequest } from '../../breeze/nl-query-service';
import { RevenueLeak } from '../../types';

const router = Router();
const nlQueryService = new NaturalLanguageQueryService();

/**
 * POST /nl-query
 * Process a natural language query about leak data
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { query, context: requestContext, leaks } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query string is required'
      });
    }

    const nlRequest: NLQueryRequest = {
      query,
      context: {
        portalId: requestContext?.portalId,
        userId: requestContext?.userId,
        timeRange: requestContext?.timeRange || '30d'
      }
    };

    // Build query context from provided leaks or use mock data
    const queryContext: QueryContext = {
      leaks: leaks || generateMockLeaks(),
      historicalData: {
        previousPeriodLeaks: [],
        trends: generateMockTrends()
      }
    };

    const response = await nlQueryService.processQuery(nlRequest, queryContext);

    res.json({
      success: true,
      data: {
        id: response.id,
        query: response.query,
        answer: response.answer,
        confidence: Math.round(response.confidence * 100),
        dataPoints: response.dataPoints,
        suggestedFollowUps: response.suggestedFollowUps,
        executedAt: response.executedAt
      }
    });
  } catch (error) {
    console.error('NL query error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process query'
    });
  }
});

/**
 * GET /nl-query/suggestions
 * Get suggested questions based on current leak state
 */
router.get('/suggestions', (req: Request, res: Response) => {
  try {
    const suggestions = [
      {
        category: 'Revenue Analysis',
        questions: [
          'How much ARR is stuck in renewal leaks this month?',
          'What is the total revenue at risk?',
          'Which leak type has the highest revenue impact?'
        ]
      },
      {
        category: 'Leak Overview',
        questions: [
          'How many leaks do we have?',
          'What types of leaks are most common?',
          'Show me only critical leaks'
        ]
      },
      {
        category: 'Performance',
        questions: [
          'What is our recovery rate?',
          'Are leaks trending up or down?',
          'How do we compare to last month?'
        ]
      },
      {
        category: 'Action Items',
        questions: [
          'What should I prioritize first?',
          'Give me an executive summary',
          'What do you recommend to improve?'
        ]
      }
    ];

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get suggestions'
    });
  }
});

/**
 * GET /nl-query/history
 * Get query history
 */
router.get('/history', (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const history = nlQueryService.getQueryHistory(Number(limit));

    res.json({
      success: true,
      data: {
        queries: history.map(h => ({
          id: h.id,
          query: h.query,
          answerPreview: h.answer.substring(0, 100) + (h.answer.length > 100 ? '...' : ''),
          confidence: Math.round(h.confidence * 100),
          executedAt: h.executedAt
        }))
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get history'
    });
  }
});

/**
 * POST /nl-query/summarize
 * Generate an AI-powered executive summary
 */
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const { leaks, format = 'brief' } = req.body;

    const queryContext: QueryContext = {
      leaks: leaks || generateMockLeaks(),
      historicalData: {
        previousPeriodLeaks: [],
        trends: generateMockTrends()
      }
    };

    const summaryQuery = format === 'detailed' 
      ? 'Give me a detailed executive report on our revenue leaks'
      : 'Give me an executive summary';

    const response = await nlQueryService.processQuery(
      { query: summaryQuery },
      queryContext
    );

    res.json({
      success: true,
      data: {
        summary: response.answer,
        dataPoints: response.dataPoints,
        recommendations: response.suggestedFollowUps,
        generatedAt: response.executedAt
      }
    });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate summary'
    });
  }
});

/**
 * POST /nl-query/analyze
 * Analyze a specific aspect of leaks
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { aspect, leaks } = req.body;

    const aspectQueries: Record<string, string> = {
      'revenue': 'How much total revenue is at risk?',
      'types': 'What types of leaks do we have?',
      'trends': 'Are leaks trending up or down?',
      'top': 'What are the top 5 biggest leaks?',
      'recovery': 'What is our recovery rate?',
      'recommendations': 'What do you recommend to improve?'
    };

    const query = aspectQueries[aspect] || 'Give me an overview';

    const queryContext: QueryContext = {
      leaks: leaks || generateMockLeaks()
    };

    const response = await nlQueryService.processQuery({ query }, queryContext);

    res.json({
      success: true,
      data: {
        aspect,
        analysis: response.answer,
        dataPoints: response.dataPoints,
        confidence: Math.round(response.confidence * 100)
      }
    });
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze'
    });
  }
});

/**
 * Generate mock leaks for testing
 */
function generateMockLeaks(): RevenueLeak[] {
  const leakTypes = ['underbilling', 'missed_renewal', 'untriggered_crosssell', 'stalled_cs_handoff', 'billing_gap'] as const;
  const severities = ['low', 'medium', 'high', 'critical'] as const;
  const leaks: RevenueLeak[] = [];

  for (let i = 0; i < 15; i++) {
    leaks.push({
      id: `leak_${i}`,
      type: leakTypes[Math.floor(Math.random() * leakTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      description: `Mock leak ${i}`,
      potentialRevenue: Math.floor(Math.random() * 100000) + 1000,
      affectedEntity: {
        type: 'deal',
        id: `deal_${i}`,
        name: `Mock Deal ${i}`
      },
      detectedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      suggestedActions: []
    });
  }

  return leaks;
}

/**
 * Generate mock trend data
 */
function generateMockTrends() {
  const trends = [];
  const now = new Date();

  for (let i = 7; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    trends.push({
      date,
      leakCount: Math.floor(Math.random() * 10) + 5,
      potentialRevenue: Math.floor(Math.random() * 500000) + 100000,
      resolvedCount: Math.floor(Math.random() * 5)
    });
  }

  return trends;
}

export default router;
