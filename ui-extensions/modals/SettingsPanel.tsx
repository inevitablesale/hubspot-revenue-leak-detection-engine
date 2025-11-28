/**
 * Settings Panel Component
 * Configuration management panel accessible from CRM objects
 */

import React, { useState, useEffect } from 'react';
import { AppConfig, ModulesConfig, IntegrationsConfig, ComplianceConfig, AutomationConfig } from '../types';
import { getAppConfig, saveAppConfig, getIntegrationStatus } from '../utils/api-client';

interface SettingsPanelProps {
  onClose: () => void;
  onSave: (config: AppConfig) => void;
}

type SettingsTab = 'modules' | 'integrations' | 'compliance' | 'automation' | 'advanced';

interface SettingsState {
  config: AppConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  activeTab: SettingsTab;
  advancedJson: string;
  jsonError: string | null;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onSave }) => {
  const [state, setState] = useState<SettingsState>({
    config: null,
    isLoading: true,
    isSaving: false,
    error: null,
    activeTab: 'modules',
    advancedJson: '',
    jsonError: null,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await getAppConfig();
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          config: response.data,
          advancedJson: JSON.stringify(response.data, null, 2),
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to load configuration',
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

  const handleSave = async () => {
    if (!state.config) return;

    try {
      setState(prev => ({ ...prev, isSaving: true, error: null }));
      const response = await saveAppConfig(state.config);
      if (response.success) {
        onSave(state.config);
      } else {
        setState(prev => ({ ...prev, error: response.error || 'Failed to save configuration' }));
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: (err as Error).message }));
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  };

  const updateConfig = (updates: Partial<AppConfig>) => {
    setState(prev => ({
      ...prev,
      config: prev.config ? { ...prev.config, ...updates } : null,
      advancedJson: JSON.stringify(prev.config ? { ...prev.config, ...updates } : {}, null, 2),
    }));
  };

  const updateModules = (key: keyof ModulesConfig, updates: Partial<ModulesConfig[keyof ModulesConfig]>) => {
    if (!state.config) return;
    const newModules = {
      ...state.config.modules,
      [key]: { ...state.config.modules[key], ...updates },
    };
    updateConfig({ modules: newModules });
  };

  const updateIntegrations = (key: keyof IntegrationsConfig, updates: Partial<IntegrationsConfig[keyof IntegrationsConfig]>) => {
    if (!state.config) return;
    const newIntegrations = {
      ...state.config.integrations,
      [key]: { ...state.config.integrations[key], ...updates },
    };
    updateConfig({ integrations: newIntegrations });
  };

  const updateCompliance = (updates: Partial<ComplianceConfig>) => {
    if (!state.config) return;
    updateConfig({ compliance: { ...state.config.compliance, ...updates } });
  };

  const updateAutomation = (updates: Partial<AutomationConfig>) => {
    if (!state.config) return;
    updateConfig({ automation: { ...state.config.automation, ...updates } });
  };

  const handleJsonChange = (json: string) => {
    setState(prev => ({ ...prev, advancedJson: json, jsonError: null }));
    try {
      const parsed = JSON.parse(json);
      setState(prev => ({ ...prev, config: parsed }));
    } catch (err) {
      setState(prev => ({ ...prev, jsonError: 'Invalid JSON' }));
    }
  };

  const renderTabs = () => (
    <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '16px' }}>
      {(['modules', 'integrations', 'compliance', 'automation', 'advanced'] as SettingsTab[]).map(tab => (
        <button
          key={tab}
          onClick={() => setState(prev => ({ ...prev, activeTab: tab }))}
          style={{
            padding: '12px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: state.activeTab === tab ? '2px solid #0070f3' : '2px solid transparent',
            color: state.activeTab === tab ? '#0070f3' : '#666',
            fontWeight: state.activeTab === tab ? 600 : 400,
          }}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );

  const renderModulesTab = () => {
    if (!state.config) return null;
    return (
      <div>
        <h4 style={{ margin: '0 0 16px 0' }}>Detection Modules</h4>
        {(Object.keys(state.config.modules) as Array<keyof ModulesConfig>).map(key => (
          <div
            key={key}
            style={{
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 500 }}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={state.config.modules[key].enabled}
                  onChange={e => updateModules(key, { enabled: e.target.checked })}
                  style={{ marginRight: '8px' }}
                />
                Enabled
              </label>
            </div>
            {state.config.modules[key].threshold !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px', color: '#666' }}>Threshold ($):</label>
                <input
                  type="number"
                  value={state.config.modules[key].threshold}
                  onChange={e => updateModules(key, { threshold: parseInt(e.target.value) || 0 })}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', width: '100px' }}
                />
              </div>
            )}
            {state.config.modules[key].alertDays !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <label style={{ fontSize: '14px', color: '#666' }}>Alert Days:</label>
                <input
                  type="number"
                  value={state.config.modules[key].alertDays}
                  onChange={e => updateModules(key, { alertDays: parseInt(e.target.value) || 0 })}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', width: '100px' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderIntegrationsTab = () => {
    if (!state.config) return null;
    return (
      <div>
        <h4 style={{ margin: '0 0 16px 0' }}>Integrations</h4>
        {(Object.keys(state.config.integrations) as Array<keyof IntegrationsConfig>).map(key => (
          <div
            key={key}
            style={{
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{key}</span>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {state.config.integrations[key].connected ? (
                    <span style={{ color: '#28a745' }}>✅ Connected</span>
                  ) : (
                    <span style={{ color: '#999' }}>⚪ Not connected</span>
                  )}
                  {state.config.integrations[key].lastSync && (
                    <span style={{ marginLeft: '8px' }}>
                      Last sync: {new Date(state.config.integrations[key].lastSync!).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={state.config.integrations[key].enabled}
                  onChange={e => updateIntegrations(key, { enabled: e.target.checked })}
                  style={{ marginRight: '8px' }}
                />
                Enabled
              </label>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderComplianceTab = () => {
    if (!state.config) return null;
    return (
      <div>
        <h4 style={{ margin: '0 0 16px 0' }}>Compliance Settings</h4>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Compliance Mode</label>
          <select
            value={state.config.compliance.mode}
            onChange={e => updateCompliance({ mode: e.target.value as ComplianceConfig['mode'] })}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="none">None</option>
            <option value="hipaa">HIPAA</option>
            <option value="gdpr">GDPR</option>
            <option value="soc2">SOC2</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={state.config.compliance.auditLogging}
              onChange={e => updateCompliance({ auditLogging: e.target.checked })}
              style={{ marginRight: '8px' }}
            />
            Enable Audit Logging
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={state.config.compliance.encryptSensitiveFields}
              onChange={e => updateCompliance({ encryptSensitiveFields: e.target.checked })}
              style={{ marginRight: '8px' }}
            />
            Encrypt Sensitive Fields
          </label>
          <div>
            <label style={{ fontWeight: 500, display: 'block', marginBottom: '4px' }}>
              Data Retention (days)
            </label>
            <input
              type="number"
              value={state.config.compliance.dataRetentionDays}
              onChange={e => updateCompliance({ dataRetentionDays: parseInt(e.target.value) || 365 })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '150px' }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderAutomationTab = () => {
    if (!state.config) return null;
    return (
      <div>
        <h4 style={{ margin: '0 0 16px 0' }}>Automation Settings</h4>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Scan Frequency</label>
          <select
            value={state.config.automation.scanFrequency}
            onChange={e => updateAutomation({ scanFrequency: e.target.value as AutomationConfig['scanFrequency'] })}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="manual">Manual Only</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={state.config.automation.autoRecover}
              onChange={e => updateAutomation({ autoRecover: e.target.checked })}
              style={{ marginRight: '8px' }}
            />
            Enable Auto-Recovery
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={state.config.automation.notifyOnCritical}
              onChange={e => updateAutomation({ notifyOnCritical: e.target.checked })}
              style={{ marginRight: '8px' }}
            />
            Notify on Critical Issues
          </label>
        </div>
      </div>
    );
  };

  const renderAdvancedTab = () => (
    <div>
      <h4 style={{ margin: '0 0 8px 0' }}>Advanced Configuration (JSON)</h4>
      <p style={{ color: '#666', fontSize: '14px', margin: '0 0 16px 0' }}>
        Edit the raw configuration JSON. Changes will be validated before saving.
      </p>
      <textarea
        value={state.advancedJson}
        onChange={e => handleJsonChange(e.target.value)}
        style={{
          width: '100%',
          height: '400px',
          fontFamily: 'monospace',
          fontSize: '12px',
          padding: '12px',
          border: state.jsonError ? '1px solid #dc3545' : '1px solid #ddd',
          borderRadius: '4px',
          resize: 'vertical',
        }}
      />
      {state.jsonError && (
        <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '8px' }}>{state.jsonError}</div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (state.activeTab) {
      case 'modules':
        return renderModulesTab();
      case 'integrations':
        return renderIntegrationsTab();
      case 'compliance':
        return renderComplianceTab();
      case 'automation':
        return renderAutomationTab();
      case 'advanced':
        return renderAdvancedTab();
      default:
        return null;
    }
  };

  if (state.isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading configuration...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0 }}>Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {renderTabs()}
          {state.error && (
            <div
              style={{
                color: '#dc3545',
                padding: '12px',
                backgroundColor: '#fee',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              {state.error}
            </div>
          )}
          {renderTabContent()}
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={state.isSaving || !!state.jsonError}
            style={{
              padding: '10px 20px',
              backgroundColor: state.isSaving || state.jsonError ? '#ccc' : '#0070f3',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: state.isSaving || state.jsonError ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            {state.isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
