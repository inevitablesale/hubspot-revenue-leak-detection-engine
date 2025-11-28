/**
 * Export API Routes
 * Endpoints for exporting data in various formats
 */

import { Router, Request, Response } from 'express';
import { RevenueLeak, LeakType, LeakSeverity } from '../../types';

const router = Router();

/**
 * Generate CSV content from leaks data
 */
function generateCSV(leaks: RevenueLeak[]): string {
  const headers = [
    'ID',
    'Type',
    'Severity',
    'Description',
    'Potential Revenue',
    'Entity Type',
    'Entity ID',
    'Detected At',
  ].join(',');

  const rows = leaks.map(leak => [
    leak.id,
    leak.type,
    leak.severity,
    `"${leak.description.replace(/"/g, '""')}"`,
    leak.potentialRevenue,
    leak.affectedEntity.type,
    leak.affectedEntity.id,
    leak.detectedAt.toISOString(),
  ].join(','));

  return [headers, ...rows].join('\n');
}

/**
 * Generate HTML report from leaks data
 */
function generateHTML(leaks: RevenueLeak[], title: string): string {
  const totalRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
  const bySeverity = leaks.reduce((acc, l) => {
    acc[l.severity] = (acc[l.severity] || 0) + 1;
    return acc;
  }, {} as Record<LeakSeverity, number>);

  const severityColors: Record<LeakSeverity, string> = {
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#ffc107',
    low: '#28a745',
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: #fff; padding: 24px; border-radius: 8px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header h1 { margin-bottom: 8px; }
    .header .subtitle { color: #666; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .metric { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric-label { font-size: 14px; color: #666; margin-bottom: 4px; }
    .metric-value { font-size: 28px; font-weight: 600; }
    .table-container { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f9f9f9; padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    .severity { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .severity-critical { background: #dc3545; color: #fff; }
    .severity-high { background: #fd7e14; color: #fff; }
    .severity-medium { background: #ffc107; color: #333; }
    .severity-low { background: #28a745; color: #fff; }
    .revenue { font-weight: 600; color: #dc3545; }
    .footer { text-align: center; padding: 24px; color: #999; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="metrics">
      <div class="metric">
        <div class="metric-label">Total Leaks</div>
        <div class="metric-value">${leaks.length}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Revenue at Risk</div>
        <div class="metric-value" style="color: #dc3545;">$${totalRevenue.toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Critical Issues</div>
        <div class="metric-value" style="color: #dc3545;">${bySeverity.critical || 0}</div>
      </div>
      <div class="metric">
        <div class="metric-label">High Priority</div>
        <div class="metric-value" style="color: #fd7e14;">${bySeverity.high || 0}</div>
      </div>
    </div>
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Severity</th>
            <th>Description</th>
            <th>Revenue at Risk</th>
            <th>Entity</th>
            <th>Detected</th>
          </tr>
        </thead>
        <tbody>
          ${leaks.map(leak => `
            <tr>
              <td>${leak.type.replace(/_/g, ' ')}</td>
              <td><span class="severity severity-${leak.severity}">${leak.severity}</span></td>
              <td>${leak.description}</td>
              <td class="revenue">$${leak.potentialRevenue.toLocaleString()}</td>
              <td>${leak.affectedEntity.type} #${leak.affectedEntity.id}</td>
              <td>${new Date(leak.detectedAt).toLocaleDateString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <p>Revenue Leak Detection Engine - Confidential Report</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * GET /export/leaks
 * Export leaks data
 */
router.get('/leaks', (req: Request, res: Response) => {
  try {
    const { format = 'csv' } = req.query;
    
    // In production, fetch real leaks from storage
    const sampleLeaks: RevenueLeak[] = [
      {
        id: 'leak-1',
        type: 'underbilling',
        severity: 'high',
        description: 'Deal value 30% below pipeline average',
        potentialRevenue: 25000,
        affectedEntity: { type: 'deal', id: '123', name: 'Acme Corp Deal' },
        detectedAt: new Date(),
        suggestedActions: [],
      },
      {
        id: 'leak-2',
        type: 'missed_renewal',
        severity: 'critical',
        description: 'Contract renewal window closing in 14 days',
        potentialRevenue: 75000,
        affectedEntity: { type: 'deal', id: '456', name: 'BigCo Contract' },
        detectedAt: new Date(),
        suggestedActions: [],
      },
    ];
    
    if (format === 'html') {
      const html = generateHTML(sampleLeaks, 'Revenue Leak Report');
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'attachment; filename="revenue-leak-report.html"');
      res.send(html);
    } else {
      const csv = generateCSV(sampleLeaks);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="revenue-leak-report.csv"');
      res.send(csv);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * GET /export/dashboard
 * Export dashboard metrics
 */
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const { format = 'csv' } = req.query;
    
    // In production, fetch real metrics
    const sampleLeaks: RevenueLeak[] = [];
    
    if (format === 'html') {
      const html = generateHTML(sampleLeaks, 'Revenue Leak Dashboard Report');
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'attachment; filename="dashboard-report.html"');
      res.send(html);
    } else {
      const csv = generateCSV(sampleLeaks);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="dashboard-report.csv"');
      res.send(csv);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * GET /export/audit
 * Export audit log
 */
router.get('/audit', (req: Request, res: Response) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;
    
    // In production, fetch real audit log entries
    const headers = ['Timestamp', 'Action', 'User', 'Entity Type', 'Entity ID', 'Details'].join(',');
    const csv = headers;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export audit log' });
  }
});

export default router;
