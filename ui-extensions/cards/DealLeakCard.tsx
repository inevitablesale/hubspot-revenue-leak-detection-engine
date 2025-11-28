/**
 * Deal Leak Card Component
 * CRM card for displaying leak detection insights on Deal records
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LeakFlag, LeakSeverity, RecoveryAction } from '../types';
import { fetchLeaksForEntity, runDetectionScan, executeRecoveryAction } from '../utils/api-client';

interface DealLeakCardProps {
  context: {
    objectId: string;
    objectType: 'deal';
    portalId: string;
    userId: string;
  };
  runServerless: (options: { name: string; parameters: Record<string, unknown> }) => Promise<any>;
  sendAlert: (options: { message: string; type?: 'success' | 'warning' | 'danger' | 'info' }) => void;
}

interface LeakCardState {
  leaks: LeakFlag[];
  isLoading: boolean;
  isScanning: boolean;
  error: string | null;
  expandedLeakId: string | null;
}

const SEVERITY_COLORS: Record<LeakSeverity, string> = {
  critical: '#dc3545',
  high: '#fd7e14',
  medium: '#ffc107',
  low: '#28a745',
};

const SEVERITY_LABELS: Record<LeakSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const LEAK_TYPE_LABELS: Record<string, string> = {
  underbilling: 'Underbilling',
  missed_renewal: 'Missed Renewal',
  untriggered_crosssell: 'Cross-sell Opportunity',
  stalled_cs_handoff: 'Stalled CS Handoff',
  invalid_lifecycle_path: 'Lifecycle Skip',
  billing_gap: 'Billing Gap',
  stale_pipeline: 'Stale Pipeline',
  missed_handoff: 'Missed Handoff',
  data_quality: 'Data Quality Issue',
};

export const DealLeakCard: React.FC<DealLeakCardProps> = ({
  context,
  runServerless,
  sendAlert,
}) => {
  const [state, setState] = useState<LeakCardState>({
    leaks: [],
    isLoading: true,
    isScanning: false,
    error: null,
    expandedLeakId: null,
  });

  const loadLeaks = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await fetchLeaksForEntity('deal', context.objectId);
      if (response.success) {
        setState(prev => ({
          ...prev,
          leaks: response.data?.leaks || [],
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to load leaks',
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
  }, [context.objectId]);

  useEffect(() => {
    loadLeaks();
  }, [loadLeaks]);

  const handleRunScan = async () => {
    try {
      setState(prev => ({ ...prev, isScanning: true }));
      const response = await runDetectionScan({
        entityType: 'deal',
        entityId: context.objectId,
      });
      if (response.success) {
        sendAlert({ message: 'Scan completed successfully', type: 'success' });
        await loadLeaks();
      } else {
        sendAlert({ message: response.error || 'Scan failed', type: 'danger' });
      }
    } catch (err) {
      sendAlert({ message: (err as Error).message, type: 'danger' });
    } finally {
      setState(prev => ({ ...prev, isScanning: false }));
    }
  };

  const handleExecuteAction = async (action: RecoveryAction, leakId: string) => {
    try {
      const response = await executeRecoveryAction(action.id, leakId);
      if (response.success) {
        sendAlert({ message: `Action "${action.title}" executed successfully`, type: 'success' });
        await loadLeaks();
      } else {
        sendAlert({ message: response.error || 'Action failed', type: 'danger' });
      }
    } catch (err) {
      sendAlert({ message: (err as Error).message, type: 'danger' });
    }
  };

  const toggleExpand = (leakId: string) => {
    setState(prev => ({
      ...prev,
      expandedLeakId: prev.expandedLeakId === leakId ? null : leakId,
    }));
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTimeRemaining = (expiresAt?: Date): string | null => {
    if (!expiresAt) return null;
    const now = new Date();
    const diff = new Date(expiresAt).getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const renderSeverityBadge = (severity: LeakSeverity) => (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        backgroundColor: SEVERITY_COLORS[severity],
        color: severity === 'medium' ? '#333' : '#fff',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );

  const renderLeakCard = (leak: LeakFlag) => {
    const isExpanded = state.expandedLeakId === leak.id;
    const timeRemaining = formatTimeRemaining(leak.expiresAt);

    return (
      <div
        key={leak.id}
        style={{
          border: `1px solid ${SEVERITY_COLORS[leak.severity]}`,
          borderRadius: '8px',
          marginBottom: '12px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px',
            backgroundColor: `${SEVERITY_COLORS[leak.severity]}15`,
            cursor: 'pointer',
          }}
          onClick={() => toggleExpand(leak.id)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                {LEAK_TYPE_LABELS[leak.type] || leak.type}
              </div>
              {renderSeverityBadge(leak.severity)}
              <span style={{ marginLeft: '8px', color: '#666' }}>
                Urgency: {leak.urgencyScore}/100
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '16px', color: SEVERITY_COLORS[leak.severity] }}>
                {formatCurrency(leak.potentialRevenue)}
              </div>
              {timeRemaining && (
                <div style={{ fontSize: '12px', color: leak.severity === 'critical' ? '#dc3545' : '#666' }}>
                  ⏱ {timeRemaining}
                </div>
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div style={{ padding: '12px', borderTop: '1px solid #eee' }}>
            <p style={{ margin: '0 0 12px 0', color: '#333' }}>{leak.description}</p>
            <div
              style={{
                padding: '8px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                marginBottom: '12px',
              }}
            >
              <strong>Recommendation:</strong> {leak.recommendation}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  const defaultAction: RecoveryAction = {
                    id: `fix-${leak.id}`,
                    type: 'trigger_workflow',
                    title: 'Fix Now',
                    description: 'Apply recommended fix',
                    priority: leak.severity === 'critical' ? 'high' : 'medium',
                  };
                  handleExecuteAction(defaultAction, leak.id);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0070f3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Fix Now
              </button>
              <button
                onClick={() => {
                  const taskAction: RecoveryAction = {
                    id: `task-${leak.id}`,
                    type: 'create_task',
                    title: 'Create Task',
                    description: 'Create a follow-up task',
                    priority: 'medium',
                  };
                  handleExecuteAction(taskAction, leak.id);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Create Task
              </button>
              <button
                onClick={() => {
                  const notifyAction: RecoveryAction = {
                    id: `notify-${leak.id}`,
                    type: 'send_notification',
                    title: 'Notify Team',
                    description: 'Send notification to team',
                    priority: 'medium',
                  };
                  handleExecuteAction(notifyAction, leak.id);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#17a2b8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Notify Team
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (state.isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>Loading leak detection data...</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ color: '#dc3545', marginBottom: '12px' }}>Error: {state.error}</div>
        <button
          onClick={loadLeaks}
          style={{
            padding: '8px 16px',
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

  const totalPotentialRevenue = state.leaks.reduce((sum, leak) => sum + leak.potentialRevenue, 0);
  const criticalCount = state.leaks.filter(l => l.severity === 'critical').length;

  return (
    <div style={{ padding: '16px' }}>
      {/* Summary Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px 0' }}>Revenue Leak Detection</h3>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {state.leaks.length} leak{state.leaks.length !== 1 ? 's' : ''} detected
            {criticalCount > 0 && (
              <span style={{ color: '#dc3545', marginLeft: '8px' }}>
                ({criticalCount} critical)
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: totalPotentialRevenue > 0 ? '#dc3545' : '#28a745' }}>
            {formatCurrency(totalPotentialRevenue)}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Potential at risk</div>
        </div>
      </div>

      {/* Scan Button */}
      <button
        onClick={handleRunScan}
        disabled={state.isScanning}
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: state.isScanning ? '#ccc' : '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: state.isScanning ? 'not-allowed' : 'pointer',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {state.isScanning ? '⏳ Running Scan...' : '🔍 Run Scan'}
      </button>

      {/* Leak List */}
      {state.leaks.length === 0 ? (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
          <div style={{ fontWeight: 500 }}>No leaks detected</div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            This deal looks healthy! Run a scan to check for new issues.
          </div>
        </div>
      ) : (
        <div>
          {/* Sort by severity (critical first) */}
          {state.leaks
            .sort((a, b) => {
              const order: Record<LeakSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
              return order[a.severity] - order[b.severity];
            })
            .map(renderLeakCard)}
        </div>
      )}
    </div>
  );
};

export default DealLeakCard;
