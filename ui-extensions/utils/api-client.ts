/**
 * API Client for UI Extensions
 * Handles communication with the backend API
 */

const API_BASE_URL = process.env.API_BASE_URL || '/api/v1';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function fetchLeaksForEntity(
  entityType: 'deal' | 'contact' | 'company' | 'ticket',
  entityId: string
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/leaks/${entityType}/${entityId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function runDetectionScan(
  options: {
    entityType?: string;
    entityId?: string;
    fullScan?: boolean;
  } = {}
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/detect/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function executeRecoveryAction(
  actionId: string,
  leakId: string
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/actions/${actionId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ leakId }),
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function resolveLeak(
  leakId: string,
  resolution: string,
  resolvedBy?: string
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/actions/resolve-leak/${leakId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resolution, resolvedBy }),
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getAppConfig(): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function saveAppConfig(config: any): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getDashboardMetrics(): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getIntegrationStatus(
  integration: string
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/integrations/${integration}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function connectIntegration(
  integration: string,
  credentials: Record<string, string>
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/integrations/${integration}/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getAuditLog(
  options: {
    startDate?: string;
    endDate?: string;
    action?: string;
    limit?: number;
  } = {}
): Promise<ApiResponse<any>> {
  const params = new URLSearchParams();
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  if (options.action) params.append('action', options.action);
  if (options.limit) params.append('limit', options.limit.toString());

  try {
    const response = await fetch(`${API_BASE_URL}/audit?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function exportData(
  format: 'csv' | 'html',
  dataType: 'leaks' | 'audit' | 'dashboard'
): Promise<ApiResponse<Blob>> {
  try {
    const response = await fetch(`${API_BASE_URL}/export/${dataType}?format=${format}`, {
      method: 'GET',
    });
    const blob = await response.blob();
    return { success: true, data: blob };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
