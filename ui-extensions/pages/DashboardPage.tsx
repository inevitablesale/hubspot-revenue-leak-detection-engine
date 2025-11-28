/**
 * Dashboard Page Component
 * Full-width private app page with metrics and analytics
 */

import React, { useState, useEffect } from 'react';
import { DashboardMetrics, LeakType, LeakSeverity } from '../types';
import { getDashboardMetrics, exportData, runDetectionScan } from '../utils/api-client';

interface DashboardPageProps {
  context: {
    portalId: string;
    userId: string;
  };
}

interface DashboardState {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  isScanning: boolean;
  error: string | null;
  selectedTimeRange: '7d' | '30d' | '90d' | '1y';
  isExporting: boolean;
}

const LEAK_TYPE_LABELS: Record<LeakType, string> = {
  underbilling: 'Underbilling',
  missed_renewal: 'Missed Renewal',
  untriggered_crosssell: 'Cross-sell',
  stalled_cs_handoff: 'CS Handoff',
  invalid_lifecycle_path: 'Lifecycle',
  billing_gap: 'Billing Gap',
  stale_pipeline: 'Stale Pipeline',
  missed_handoff: 'Missed Handoff',
  data_quality: 'Data Quality',
};

const SEVERITY_COLORS: Record<LeakSeverity, string> = {
  critical: '#dc3545',
  high: '#fd7e14',
  medium: '#ffc107',
  low: '#28a745',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ context }) => {
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    isLoading: true,
    isScanning: false,
    error: null,
    selectedTimeRange: '30d',
    isExporting: false,
  });

  useEffect(() => {
    loadMetrics();
  }, [state.selectedTimeRange]);

  const loadMetrics = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await getDashboardMetrics();
      if (response.success) {
        setState(prev => ({
          ...prev,
          metrics: response.data,
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to load metrics',
          isLoading: false,
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: (err as Error).message,
        isLoading: false,
      }));
    }
  };

  const handleRunFullScan = async () => {
    try {
      setState(prev => ({ ...prev, isScanning: true }));
      const response = await runDetectionScan({ fullScan: true });
      if (response.success) {
        await loadMetrics();
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: (err as Error).message }));
    } finally {
      setState(prev => ({ ...prev, isScanning: false }));
    }
  };

  const handleExport = async (format: 'csv' | 'html') => {
    try {
      setState(prev => ({ ...prev, isExporting: true }));
      const response = await exportData(format, 'dashboard');
      if (response.success && response.data) {
        const url = URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revenue-leak-report.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: (err as Error).message }));
    } finally {
      setState(prev => ({ ...prev, isExporting: false }));
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    subtitle?: string,
    color?: string,
    icon?: string
  ) => (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      {icon && <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>}
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 600, color: color || '#333' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{subtitle}</div>}
    </div>
  );

  const renderLeakTypeChart = () => {
    if (!state.metrics) return null;
    const maxCount = Math.max(...Object.values(state.metrics.leaksByType));

    return (
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0' }}>Leaks by Type</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(Object.entries(state.metrics.leaksByType) as [LeakType, number][])
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <div key={type}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>{LEAK_TYPE_LABELS[type]}</span>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{count}</span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#eee', borderRadius: '4px' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(count / maxCount) * 100}%`,
                      backgroundColor: '#0070f3',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  const renderSeverityChart = () => {
    if (!state.metrics) return null;
    const total = Object.values(state.metrics.leaksBySeverity).reduce((a, b) => a + b, 0);

    return (
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0' }}>Leaks by Severity</h3>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', height: '24px' }}>
          {(Object.entries(state.metrics.leaksBySeverity) as [LeakSeverity, number][]).map(
            ([severity, count]) =>
              count > 0 && (
                <div
                  key={severity}
                  style={{
                    flex: count,
                    backgroundColor: SEVERITY_COLORS[severity],
                    borderRadius: '4px',
                  }}
                  title={`${severity}: ${count}`}
                />
              )
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {(Object.entries(state.metrics.leaksBySeverity) as [LeakSeverity, number][]).map(
            ([severity, count]) => (
              <div key={severity} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: SEVERITY_COLORS[severity],
                    borderRadius: '2px',
                  }}
                />
                <span style={{ fontSize: '14px', textTransform: 'capitalize' }}>
                  {severity}: {count} ({total > 0 ? formatPercent(count / total) : '0%'})
                </span>
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  const renderTrendsChart = () => {
    if (!state.metrics || !state.metrics.trendsOverTime.length) return null;
    const maxValue = Math.max(...state.metrics.trendsOverTime.map(t => t.leakCount));

    return (
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0' }}>Leak Trends Over Time</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '150px' }}>
          {state.metrics.trendsOverTime.map((trend, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${(trend.leakCount / maxValue) * 100}%`,
                  backgroundColor: '#0070f3',
                  borderRadius: '4px 4px 0 0',
                  minHeight: '4px',
                }}
              />
              <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTopPipelines = () => {
    if (!state.metrics || !state.metrics.topAffectedPipelines.length) return null;

    return (
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0' }}>Top Affected Pipelines</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #eee' }}>Pipeline</th>
              <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>Leaks</th>
              <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>At Risk</th>
            </tr>
          </thead>
          <tbody>
            {state.metrics.topAffectedPipelines.map(pipeline => (
              <tr key={pipeline.pipelineId}>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{pipeline.pipelineName}</td>
                <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>
                  {pipeline.leakCount}
                </td>
                <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee', color: '#dc3545' }}>
                  {formatCurrency(pipeline.potentialRevenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAutonomyScore = () => {
    if (!state.metrics) return null;
    const score = state.metrics.autonomyScore;
    const getScoreColor = (s: number) => {
      if (s >= 80) return '#28a745';
      if (s >= 60) return '#ffc107';
      if (s >= 40) return '#fd7e14';
      return '#dc3545';
    };

    return (
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0' }}>Portal Autonomy Score</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: `8px solid ${getScoreColor(score)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 600,
            }}
          >
            {score}
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              Your portal's governance and automation coverage
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#666' }}>
              <li>Higher scores indicate better leak prevention</li>
              <li>Review critical issues to improve score</li>
              <li>Enable automation for faster recovery</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  if (state.isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#dc3545', marginBottom: '16px' }}>Error: {state.error}</div>
        <button
          onClick={loadMetrics}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0' }}>Revenue Leak Dashboard</h1>
          <div style={{ color: '#666' }}>Monitor and recover hidden revenue leaks</div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={state.selectedTimeRange}
            onChange={e => setState(prev => ({ ...prev, selectedTimeRange: e.target.value as DashboardState['selectedTimeRange'] }))}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={handleRunFullScan}
            disabled={state.isScanning}
            style={{
              padding: '8px 16px',
              backgroundColor: state.isScanning ? '#ccc' : '#0070f3',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: state.isScanning ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            {state.isScanning ? 'Scanning...' : '🔍 Run Full Scan'}
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => handleExport('csv')}
              disabled={state.isExporting}
              style={{
                padding: '8px 16px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: state.isExporting ? 'not-allowed' : 'pointer',
              }}
            >
              📥 Export CSV
            </button>
          </div>
          <button
            onClick={() => handleExport('html')}
            disabled={state.isExporting}
            style={{
              padding: '8px 16px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: state.isExporting ? 'not-allowed' : 'pointer',
            }}
          >
            📄 Export HTML
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {renderMetricCard(
          'Total Leaks',
          state.metrics?.totalLeaks || 0,
          'Active revenue leaks',
          undefined,
          '🔍'
        )}
        {renderMetricCard(
          'Revenue at Risk',
          formatCurrency(state.metrics?.totalPotentialRevenue || 0),
          'Potential recoverable value',
          '#dc3545',
          '💰'
        )}
        {renderMetricCard(
          'Recovery Rate',
          formatPercent(state.metrics?.recoveryRate || 0),
          `${state.metrics?.resolvedCount || 0} leaks resolved`,
          '#28a745',
          '📈'
        )}
        {renderMetricCard(
          'Autonomy Score',
          state.metrics?.autonomyScore || 0,
          'Governance coverage',
          undefined,
          '🎯'
        )}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {renderLeakTypeChart()}
        {renderSeverityChart()}
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {renderTrendsChart()}
        {renderTopPipelines()}
      </div>

      {/* Autonomy Score */}
      <div style={{ marginBottom: '24px' }}>{renderAutonomyScore()}</div>
    </div>
  );
};

export default DashboardPage;
