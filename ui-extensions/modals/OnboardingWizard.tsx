/**
 * Onboarding Wizard Modal Component
 * Multi-step setup wizard for configuring the Revenue Leak Detection Engine
 */

import React, { useState } from 'react';
import {
  AppConfig,
  IndustryTemplate,
  IntegrationsConfig,
  ComplianceConfig,
  AutomationConfig,
  ModulesConfig,
} from '../types';
import { saveAppConfig } from '../utils/api-client';

interface OnboardingWizardProps {
  onClose: () => void;
  onComplete: (config: AppConfig) => void;
  initialConfig?: Partial<AppConfig>;
}

type WizardStep =
  | 'welcome'
  | 'template'
  | 'integrations'
  | 'compliance'
  | 'automation'
  | 'modules'
  | 'summary';

interface WizardState {
  currentStep: WizardStep;
  selectedTemplate: string | null;
  integrations: IntegrationsConfig;
  compliance: ComplianceConfig;
  automation: AutomationConfig;
  modules: ModulesConfig;
  isSaving: boolean;
  error: string | null;
}

const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'saas',
    name: 'SaaS',
    description: 'Subscription metrics, churn detection, MRR tracking',
    icon: '📊',
    modules: {
      underbilling: { enabled: true, threshold: 1000 },
      missedRenewals: { enabled: true, alertDays: 60 },
      crossSell: { enabled: true },
      csHandoff: { enabled: true },
      lifecycle: { enabled: true },
      billingGap: { enabled: true },
    },
    integrations: {
      stripe: { enabled: true, connected: false },
      quickbooks: { enabled: false, connected: false },
      outlook: { enabled: true, connected: false },
      gmail: { enabled: false, connected: false },
      shopify: { enabled: false, connected: false },
      salesforce: { enabled: false, connected: false },
    },
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'Project billing, QuickBooks integration, utilization',
    icon: '🏢',
    modules: {
      underbilling: { enabled: true, threshold: 500 },
      missedRenewals: { enabled: false },
      crossSell: { enabled: true },
      csHandoff: { enabled: true },
      lifecycle: { enabled: false },
      billingGap: { enabled: true },
    },
    integrations: {
      stripe: { enabled: false, connected: false },
      quickbooks: { enabled: true, connected: false },
      outlook: { enabled: true, connected: false },
      gmail: { enabled: false, connected: false },
      shopify: { enabled: false, connected: false },
      salesforce: { enabled: false, connected: false },
    },
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'HIPAA compliance, patient data protection',
    icon: '🏥',
    modules: {
      underbilling: { enabled: true, threshold: 2000 },
      missedRenewals: { enabled: true, alertDays: 90 },
      crossSell: { enabled: false },
      csHandoff: { enabled: true },
      lifecycle: { enabled: true },
      billingGap: { enabled: true },
    },
    integrations: {
      stripe: { enabled: false, connected: false },
      quickbooks: { enabled: true, connected: false },
      outlook: { enabled: true, connected: false },
      gmail: { enabled: false, connected: false },
      shopify: { enabled: false, connected: false },
      salesforce: { enabled: true, connected: false },
    },
    compliance: {
      mode: 'hipaa',
      auditLogging: true,
      dataRetentionDays: 2190, // 6 years
      encryptSensitiveFields: true,
    },
  },
  {
    id: 'consulting',
    name: 'Consulting',
    description: 'Proposal stages, fixed-fee deals, utilization tracking',
    icon: '💼',
    modules: {
      underbilling: { enabled: true, threshold: 5000 },
      missedRenewals: { enabled: true, alertDays: 30 },
      crossSell: { enabled: true },
      csHandoff: { enabled: false },
      lifecycle: { enabled: true },
      billingGap: { enabled: true },
    },
    integrations: {
      stripe: { enabled: false, connected: false },
      quickbooks: { enabled: true, connected: false },
      outlook: { enabled: true, connected: false },
      gmail: { enabled: true, connected: false },
      shopify: { enabled: false, connected: false },
      salesforce: { enabled: true, connected: false },
    },
  },
  {
    id: 'retail',
    name: 'Retail / E-commerce',
    description: 'Shopify integration, inventory, order management',
    icon: '🛒',
    modules: {
      underbilling: { enabled: false },
      missedRenewals: { enabled: false },
      crossSell: { enabled: true },
      csHandoff: { enabled: false },
      lifecycle: { enabled: true },
      billingGap: { enabled: true },
    },
    integrations: {
      stripe: { enabled: true, connected: false },
      quickbooks: { enabled: false, connected: false },
      outlook: { enabled: false, connected: false },
      gmail: { enabled: false, connected: false },
      shopify: { enabled: true, connected: false },
      salesforce: { enabled: false, connected: false },
    },
  },
];

const DEFAULT_INTEGRATIONS: IntegrationsConfig = {
  stripe: { enabled: false, connected: false },
  quickbooks: { enabled: false, connected: false },
  outlook: { enabled: false, connected: false },
  gmail: { enabled: false, connected: false },
  shopify: { enabled: false, connected: false },
  salesforce: { enabled: false, connected: false },
};

const DEFAULT_MODULES: ModulesConfig = {
  underbilling: { enabled: true, threshold: 1000 },
  missedRenewals: { enabled: true, alertDays: 60 },
  crossSell: { enabled: true },
  csHandoff: { enabled: true },
  lifecycle: { enabled: true },
  billingGap: { enabled: true },
};

const DEFAULT_COMPLIANCE: ComplianceConfig = {
  mode: 'none',
  auditLogging: true,
  dataRetentionDays: 365,
  encryptSensitiveFields: false,
};

const DEFAULT_AUTOMATION: AutomationConfig = {
  scanFrequency: 'daily',
  autoRecover: false,
  notifyOnCritical: true,
  notifyChannels: ['email', 'hubspot'],
};

const STEPS: WizardStep[] = [
  'welcome',
  'template',
  'integrations',
  'compliance',
  'automation',
  'modules',
  'summary',
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onClose,
  onComplete,
  initialConfig,
}) => {
  const [state, setState] = useState<WizardState>({
    currentStep: 'welcome',
    selectedTemplate: null,
    integrations: initialConfig?.integrations || DEFAULT_INTEGRATIONS,
    compliance: initialConfig?.compliance || DEFAULT_COMPLIANCE,
    automation: initialConfig?.automation || DEFAULT_AUTOMATION,
    modules: initialConfig?.modules || DEFAULT_MODULES,
    isSaving: false,
    error: null,
  });

  const currentStepIndex = STEPS.indexOf(state.currentStep);

  const goToStep = (step: WizardStep) => {
    setState(prev => ({ ...prev, currentStep: step, error: null }));
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      goToStep(STEPS[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      goToStep(STEPS[prevIndex]);
    }
  };

  const selectTemplate = (templateId: string) => {
    const template = INDUSTRY_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setState(prev => ({
        ...prev,
        selectedTemplate: templateId,
        modules: { ...DEFAULT_MODULES, ...template.modules } as ModulesConfig,
        integrations: { ...DEFAULT_INTEGRATIONS, ...template.integrations } as IntegrationsConfig,
        compliance: template.compliance ? { ...DEFAULT_COMPLIANCE, ...template.compliance } : prev.compliance,
      }));
    }
  };

  const toggleIntegration = (key: keyof IntegrationsConfig) => {
    setState(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [key]: {
          ...prev.integrations[key],
          enabled: !prev.integrations[key].enabled,
        },
      },
    }));
  };

  const toggleModule = (key: keyof ModulesConfig) => {
    setState(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [key]: {
          ...prev.modules[key],
          enabled: !prev.modules[key].enabled,
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      setState(prev => ({ ...prev, isSaving: true, error: null }));
      
      const config: AppConfig = {
        hubspot: {},
        modules: state.modules,
        integrations: state.integrations,
        compliance: state.compliance,
        automation: state.automation,
      };

      const response = await saveAppConfig(config);
      if (response.success) {
        onComplete(config);
      } else {
        setState(prev => ({ ...prev, error: response.error || 'Failed to save configuration' }));
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: (err as Error).message }));
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  };

  const renderProgressBar = () => (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        {STEPS.map((step, index) => (
          <div
            key={step}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '12px',
              color: index <= currentStepIndex ? '#0070f3' : '#999',
              fontWeight: index === currentStepIndex ? 600 : 400,
            }}
          >
            {index + 1}. {step.charAt(0).toUpperCase() + step.slice(1)}
          </div>
        ))}
      </div>
      <div style={{ height: '4px', backgroundColor: '#eee', borderRadius: '2px' }}>
        <div
          style={{
            height: '100%',
            width: `${((currentStepIndex + 1) / STEPS.length) * 100}%`,
            backgroundColor: '#0070f3',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );

  const renderWelcomeStep = () => (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
      <h2 style={{ margin: '0 0 12px 0' }}>Welcome to Revenue Leak Detection</h2>
      <p style={{ color: '#666', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
        Let's configure your leak detection engine to identify hidden revenue opportunities
        and protect your business from underbilling, missed renewals, and more.
      </p>
      <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 8px 0' }}>What you'll configure:</h4>
        <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '20px' }}>
          <li>Industry template for pre-configured settings</li>
          <li>Integration connections (Stripe, QuickBooks, etc.)</li>
          <li>Compliance requirements (HIPAA, GDPR, SOC2)</li>
          <li>Automation and notification preferences</li>
          <li>Detection modules and thresholds</li>
        </ul>
      </div>
    </div>
  );

  const renderTemplateStep = () => (
    <div>
      <h3 style={{ margin: '0 0 8px 0' }}>Select Industry Template</h3>
      <p style={{ color: '#666', margin: '0 0 16px 0' }}>
        Choose a template that best matches your business type for optimized settings.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {INDUSTRY_TEMPLATES.map(template => (
          <div
            key={template.id}
            onClick={() => selectTemplate(template.id)}
            style={{
              padding: '16px',
              border: state.selectedTemplate === template.id ? '2px solid #0070f3' : '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: state.selectedTemplate === template.id ? '#f0f7ff' : '#fff',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{template.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{template.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{template.description}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderIntegrationsStep = () => (
    <div>
      <h3 style={{ margin: '0 0 8px 0' }}>Configure Integrations</h3>
      <p style={{ color: '#666', margin: '0 0 16px 0' }}>
        Enable integrations to pull data from your connected services.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(Object.keys(state.integrations) as Array<keyof IntegrationsConfig>).map(key => (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
            }}
          >
            <div>
              <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{key}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {state.integrations[key].connected ? '✅ Connected' : '⚪ Not connected'}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={state.integrations[key].enabled}
                onChange={() => toggleIntegration(key)}
                style={{ marginRight: '8px' }}
              />
              Enable
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderComplianceStep = () => (
    <div>
      <h3 style={{ margin: '0 0 8px 0' }}>Compliance Settings</h3>
      <p style={{ color: '#666', margin: '0 0 16px 0' }}>
        Configure compliance mode based on your regulatory requirements.
      </p>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Compliance Mode</label>
        <select
          value={state.compliance.mode}
          onChange={e =>
            setState(prev => ({
              ...prev,
              compliance: { ...prev.compliance, mode: e.target.value as ComplianceConfig['mode'] },
            }))
          }
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="none">None</option>
          <option value="hipaa">HIPAA (Healthcare)</option>
          <option value="gdpr">GDPR (EU)</option>
          <option value="soc2">SOC2</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={state.compliance.auditLogging}
            onChange={e =>
              setState(prev => ({
                ...prev,
                compliance: { ...prev.compliance, auditLogging: e.target.checked },
              }))
            }
            style={{ marginRight: '8px' }}
          />
          Enable Audit Logging
        </label>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={state.compliance.encryptSensitiveFields}
            onChange={e =>
              setState(prev => ({
                ...prev,
                compliance: { ...prev.compliance, encryptSensitiveFields: e.target.checked },
              }))
            }
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
            value={state.compliance.dataRetentionDays}
            onChange={e =>
              setState(prev => ({
                ...prev,
                compliance: { ...prev.compliance, dataRetentionDays: parseInt(e.target.value) || 365 },
              }))
            }
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '150px' }}
          />
        </div>
      </div>
    </div>
  );

  const renderAutomationStep = () => (
    <div>
      <h3 style={{ margin: '0 0 8px 0' }}>Automation Settings</h3>
      <p style={{ color: '#666', margin: '0 0 16px 0' }}>
        Configure how often scans run and notification preferences.
      </p>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Scan Frequency</label>
        <select
          value={state.automation.scanFrequency}
          onChange={e =>
            setState(prev => ({
              ...prev,
              automation: {
                ...prev.automation,
                scanFrequency: e.target.value as AutomationConfig['scanFrequency'],
              },
            }))
          }
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
            checked={state.automation.autoRecover}
            onChange={e =>
              setState(prev => ({
                ...prev,
                automation: { ...prev.automation, autoRecover: e.target.checked },
              }))
            }
            style={{ marginRight: '8px' }}
          />
          Enable Auto-Recovery (for low-risk issues)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={state.automation.notifyOnCritical}
            onChange={e =>
              setState(prev => ({
                ...prev,
                automation: { ...prev.automation, notifyOnCritical: e.target.checked },
              }))
            }
            style={{ marginRight: '8px' }}
          />
          Notify on Critical Issues
        </label>
      </div>
      <div style={{ marginTop: '16px' }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>
          Notification Channels
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(['email', 'slack', 'hubspot'] as const).map(channel => (
            <label key={channel} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={state.automation.notifyChannels.includes(channel)}
                onChange={e => {
                  const channels = e.target.checked
                    ? [...state.automation.notifyChannels, channel]
                    : state.automation.notifyChannels.filter(c => c !== channel);
                  setState(prev => ({
                    ...prev,
                    automation: { ...prev.automation, notifyChannels: channels },
                  }));
                }}
                style={{ marginRight: '4px' }}
              />
              {channel.charAt(0).toUpperCase() + channel.slice(1)}
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderModulesStep = () => (
    <div>
      <h3 style={{ margin: '0 0 8px 0' }}>Detection Modules</h3>
      <p style={{ color: '#666', margin: '0 0 16px 0' }}>
        Enable or disable specific leak detection modules.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(Object.keys(state.modules) as Array<keyof ModulesConfig>).map(key => (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={state.modules[key].enabled}
                onChange={() => toggleModule(key)}
                style={{ marginRight: '8px' }}
              />
              Enable
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSummaryStep = () => {
    const enabledModules = Object.entries(state.modules)
      .filter(([_, v]) => v.enabled)
      .map(([k]) => k);
    const enabledIntegrations = Object.entries(state.integrations)
      .filter(([_, v]) => v.enabled)
      .map(([k]) => k);

    return (
      <div>
        <h3 style={{ margin: '0 0 8px 0' }}>Configuration Summary</h3>
        <p style={{ color: '#666', margin: '0 0 16px 0' }}>
          Review your settings before saving.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Template</div>
            <div>{state.selectedTemplate ? INDUSTRY_TEMPLATES.find(t => t.id === state.selectedTemplate)?.name : 'Custom'}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Detection Modules ({enabledModules.length})</div>
            <div>{enabledModules.join(', ') || 'None'}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Integrations ({enabledIntegrations.length})</div>
            <div>{enabledIntegrations.join(', ') || 'None'}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Compliance</div>
            <div>{state.compliance.mode === 'none' ? 'Standard' : state.compliance.mode.toUpperCase()}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Automation</div>
            <div>Scan: {state.automation.scanFrequency}, Auto-recover: {state.automation.autoRecover ? 'Yes' : 'No'}</div>
          </div>
        </div>
        {state.error && (
          <div style={{ color: '#dc3545', marginTop: '16px', padding: '12px', backgroundColor: '#fee', borderRadius: '8px' }}>
            {state.error}
          </div>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 'welcome':
        return renderWelcomeStep();
      case 'template':
        return renderTemplateStep();
      case 'integrations':
        return renderIntegrationsStep();
      case 'compliance':
        return renderComplianceStep();
      case 'automation':
        return renderAutomationStep();
      case 'modules':
        return renderModulesStep();
      case 'summary':
        return renderSummaryStep();
      default:
        return null;
    }
  };

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
          maxWidth: '700px',
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
          <h2 style={{ margin: 0 }}>Setup Wizard</h2>
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
          {renderProgressBar()}
          {renderStepContent()}
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={goBack}
            disabled={currentStepIndex === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: currentStepIndex === 0 ? '#ccc' : '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Back
          </button>
          {state.currentStep === 'summary' ? (
            <button
              onClick={handleSave}
              disabled={state.isSaving}
              style={{
                padding: '10px 20px',
                backgroundColor: state.isSaving ? '#ccc' : '#0070f3',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: state.isSaving ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              {state.isSaving ? 'Saving...' : 'Complete Setup'}
            </button>
          ) : (
            <button
              onClick={goNext}
              style={{
                padding: '10px 20px',
                backgroundColor: '#0070f3',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
