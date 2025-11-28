/**
 * HubSpot Workflow Action Definitions
 * Custom workflow actions for leak detection and recovery
 */

export interface WorkflowActionDefinition {
  actionUrl: string;
  objectTypes: string[];
  inputFields: InputField[];
  outputFields: OutputField[];
  labels: {
    en: {
      actionName: string;
      actionDescription: string;
      actionCardContent: string;
    };
  };
}

interface InputField {
  typeDefinition: {
    name: string;
    type: 'string' | 'number' | 'enumeration' | 'bool';
    fieldType: 'text' | 'number' | 'dropdown' | 'checkbox';
    options?: { label: string; value: string }[];
  };
  supportedValueTypes: string[];
  isRequired: boolean;
}

interface OutputField {
  typeDefinition: {
    name: string;
    type: 'string' | 'number' | 'bool';
  };
}

/**
 * Run Leak Detection Scan
 * Triggers a leak detection scan for the enrolled object
 */
export const runLeakDetectionAction: WorkflowActionDefinition = {
  actionUrl: '/api/v1/workflows/run-detection',
  objectTypes: ['DEAL', 'CONTACT', 'COMPANY'],
  inputFields: [
    {
      typeDefinition: {
        name: 'scanType',
        type: 'enumeration',
        fieldType: 'dropdown',
        options: [
          { label: 'Full Scan', value: 'full' },
          { label: 'Quick Scan', value: 'quick' },
          { label: 'Specific Module', value: 'module' },
        ],
      },
      supportedValueTypes: ['STATIC_VALUE'],
      isRequired: true,
    },
    {
      typeDefinition: {
        name: 'module',
        type: 'enumeration',
        fieldType: 'dropdown',
        options: [
          { label: 'Underbilling', value: 'underbilling' },
          { label: 'Missed Renewals', value: 'missed_renewal' },
          { label: 'Cross-sell', value: 'crosssell' },
          { label: 'CS Handoff', value: 'cs_handoff' },
          { label: 'Lifecycle', value: 'lifecycle' },
          { label: 'Billing Gap', value: 'billing_gap' },
        ],
      },
      supportedValueTypes: ['STATIC_VALUE'],
      isRequired: false,
    },
  ],
  outputFields: [
    {
      typeDefinition: {
        name: 'leaksFound',
        type: 'number',
      },
    },
    {
      typeDefinition: {
        name: 'potentialRevenue',
        type: 'number',
      },
    },
    {
      typeDefinition: {
        name: 'hasCriticalLeak',
        type: 'bool',
      },
    },
  ],
  labels: {
    en: {
      actionName: 'Run Leak Detection',
      actionDescription: 'Scan the enrolled record for revenue leaks',
      actionCardContent: 'Scanning for revenue leaks...',
    },
  },
};

/**
 * Execute Recovery Action
 * Executes a predefined recovery action for a detected leak
 */
export const executeRecoveryAction: WorkflowActionDefinition = {
  actionUrl: '/api/v1/workflows/execute-recovery',
  objectTypes: ['DEAL', 'CONTACT', 'COMPANY'],
  inputFields: [
    {
      typeDefinition: {
        name: 'recoveryType',
        type: 'enumeration',
        fieldType: 'dropdown',
        options: [
          { label: 'Auto-fix (Low Risk)', value: 'auto_fix' },
          { label: 'Create Task', value: 'create_task' },
          { label: 'Send Notification', value: 'notify' },
          { label: 'Escalate to Manager', value: 'escalate' },
          { label: 'Update Property', value: 'update_property' },
        ],
      },
      supportedValueTypes: ['STATIC_VALUE'],
      isRequired: true,
    },
    {
      typeDefinition: {
        name: 'leakType',
        type: 'enumeration',
        fieldType: 'dropdown',
        options: [
          { label: 'Any Active Leak', value: 'any' },
          { label: 'Underbilling', value: 'underbilling' },
          { label: 'Missed Renewal', value: 'missed_renewal' },
          { label: 'Cross-sell', value: 'crosssell' },
          { label: 'CS Handoff', value: 'cs_handoff' },
          { label: 'Billing Gap', value: 'billing_gap' },
        ],
      },
      supportedValueTypes: ['STATIC_VALUE'],
      isRequired: false,
    },
    {
      typeDefinition: {
        name: 'assignee',
        type: 'string',
        fieldType: 'text',
      },
      supportedValueTypes: ['STATIC_VALUE', 'OBJECT_PROPERTY'],
      isRequired: false,
    },
  ],
  outputFields: [
    {
      typeDefinition: {
        name: 'actionExecuted',
        type: 'bool',
      },
    },
    {
      typeDefinition: {
        name: 'resultMessage',
        type: 'string',
      },
    },
  ],
  labels: {
    en: {
      actionName: 'Execute Recovery Action',
      actionDescription: 'Execute a recovery action for detected revenue leaks',
      actionCardContent: 'Executing recovery action...',
    },
  },
};

/**
 * Log Leak Event
 * Logs a leak detection or resolution event to the timeline
 */
export const logLeakEventAction: WorkflowActionDefinition = {
  actionUrl: '/api/v1/workflows/log-event',
  objectTypes: ['DEAL', 'CONTACT', 'COMPANY'],
  inputFields: [
    {
      typeDefinition: {
        name: 'eventType',
        type: 'enumeration',
        fieldType: 'dropdown',
        options: [
          { label: 'Leak Detected', value: 'detected' },
          { label: 'Recovery Started', value: 'recovery_started' },
          { label: 'Leak Resolved', value: 'resolved' },
          { label: 'Leak Dismissed', value: 'dismissed' },
          { label: 'Manual Review Required', value: 'manual_review' },
        ],
      },
      supportedValueTypes: ['STATIC_VALUE'],
      isRequired: true,
    },
    {
      typeDefinition: {
        name: 'details',
        type: 'string',
        fieldType: 'text',
      },
      supportedValueTypes: ['STATIC_VALUE', 'OBJECT_PROPERTY'],
      isRequired: false,
    },
  ],
  outputFields: [
    {
      typeDefinition: {
        name: 'eventLogged',
        type: 'bool',
      },
    },
  ],
  labels: {
    en: {
      actionName: 'Log Leak Event',
      actionDescription: 'Log a leak detection event to the record timeline',
      actionCardContent: 'Logging event to timeline...',
    },
  },
};

/**
 * Check Leak Status
 * Checks if the enrolled record has any active leaks
 */
export const checkLeakStatusAction: WorkflowActionDefinition = {
  actionUrl: '/api/v1/workflows/check-status',
  objectTypes: ['DEAL', 'CONTACT', 'COMPANY'],
  inputFields: [
    {
      typeDefinition: {
        name: 'severityThreshold',
        type: 'enumeration',
        fieldType: 'dropdown',
        options: [
          { label: 'Any Severity', value: 'any' },
          { label: 'Medium or Higher', value: 'medium' },
          { label: 'High or Critical', value: 'high' },
          { label: 'Critical Only', value: 'critical' },
        ],
      },
      supportedValueTypes: ['STATIC_VALUE'],
      isRequired: false,
    },
  ],
  outputFields: [
    {
      typeDefinition: {
        name: 'hasActiveLeaks',
        type: 'bool',
      },
    },
    {
      typeDefinition: {
        name: 'leakCount',
        type: 'number',
      },
    },
    {
      typeDefinition: {
        name: 'highestSeverity',
        type: 'string',
      },
    },
    {
      typeDefinition: {
        name: 'totalAtRisk',
        type: 'number',
      },
    },
  ],
  labels: {
    en: {
      actionName: 'Check Leak Status',
      actionDescription: 'Check if the record has any active revenue leaks',
      actionCardContent: 'Checking leak status...',
    },
  },
};

/**
 * Update Leak Property
 * Updates a custom property related to leak detection
 */
export const updateLeakPropertyAction: WorkflowActionDefinition = {
  actionUrl: '/api/v1/workflows/update-property',
  objectTypes: ['DEAL', 'CONTACT', 'COMPANY'],
  inputFields: [
    {
      typeDefinition: {
        name: 'property',
        type: 'enumeration',
        fieldType: 'dropdown',
        options: [
          { label: 'Leak Status', value: 'leak_detection_status' },
          { label: 'Last Scan Date', value: 'leak_last_scan_date' },
          { label: 'Potential Revenue at Risk', value: 'leak_potential_revenue' },
          { label: 'Leak Count', value: 'leak_count' },
          { label: 'Recovery Status', value: 'leak_recovery_status' },
        ],
      },
      supportedValueTypes: ['STATIC_VALUE'],
      isRequired: true,
    },
    {
      typeDefinition: {
        name: 'value',
        type: 'string',
        fieldType: 'text',
      },
      supportedValueTypes: ['STATIC_VALUE', 'OBJECT_PROPERTY', 'OUTPUT_FIELD'],
      isRequired: true,
    },
  ],
  outputFields: [
    {
      typeDefinition: {
        name: 'propertyUpdated',
        type: 'bool',
      },
    },
  ],
  labels: {
    en: {
      actionName: 'Update Leak Property',
      actionDescription: 'Update a leak detection property on the record',
      actionCardContent: 'Updating leak property...',
    },
  },
};

/**
 * All workflow action definitions
 */
export const workflowActions = {
  runLeakDetection: runLeakDetectionAction,
  executeRecovery: executeRecoveryAction,
  logLeakEvent: logLeakEventAction,
  checkLeakStatus: checkLeakStatusAction,
  updateLeakProperty: updateLeakPropertyAction,
};

export default workflowActions;
