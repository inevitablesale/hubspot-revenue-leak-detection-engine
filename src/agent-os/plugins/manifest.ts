/**
 * Plugin Manifest Module
 * Defines and validates plugin manifests
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Plugin Manifest Types
// ============================================================

export interface Manifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: ManifestAuthor;
  license: string;
  category: string;
  tags: string[];
  permissions: ManifestPermission[];
  capabilities: ManifestCapability[];
  hooks: ManifestHook[];
  configuration: ManifestConfiguration;
  dependencies: ManifestDependency[];
  compatibility: ManifestCompatibility;
  resources: ManifestResources;
}

export interface ManifestAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface ManifestPermission {
  name: string;
  scope: 'read' | 'write' | 'execute' | 'admin';
  resource: string;
  required: boolean;
  description: string;
}

export interface ManifestCapability {
  name: string;
  type: 'detector' | 'action' | 'analyzer' | 'integration' | 'visualization';
  description: string;
  inputs: CapabilityIO[];
  outputs: CapabilityIO[];
}

export interface CapabilityIO {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ManifestHook {
  name: string;
  event: string;
  priority: number;
  async: boolean;
  description: string;
}

export interface ManifestConfiguration {
  schema: ConfigSchema[];
  defaults: Record<string, unknown>;
}

export interface ConfigSchema {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: unknown;
  description: string;
  validation?: string;
}

export interface ManifestDependency {
  name: string;
  version: string;
  optional: boolean;
}

export interface ManifestCompatibility {
  minVersion: string;
  maxVersion?: string;
  platforms: string[];
}

export interface ManifestResources {
  memory: number;
  cpu: number;
  timeout: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================================
// Plugin Manifest Implementation
// ============================================================

export class PluginManifest {
  private manifests: Map<string, Manifest> = new Map();

  /**
   * Create a new manifest
   */
  create(
    name: string,
    version: string,
    description: string,
    author: ManifestAuthor,
    options?: Partial<Omit<Manifest, 'id' | 'name' | 'version' | 'description' | 'author'>>
  ): Manifest {
    const manifest: Manifest = {
      id: generateId(),
      name,
      version,
      description,
      author,
      license: options?.license || 'MIT',
      category: options?.category || 'general',
      tags: options?.tags || [],
      permissions: options?.permissions || [],
      capabilities: options?.capabilities || [],
      hooks: options?.hooks || [],
      configuration: options?.configuration || { schema: [], defaults: {} },
      dependencies: options?.dependencies || [],
      compatibility: options?.compatibility || {
        minVersion: '1.0.0',
        platforms: ['all'],
      },
      resources: options?.resources || {
        memory: 128,
        cpu: 0.1,
        timeout: 30000,
      },
    };

    this.manifests.set(manifest.id, manifest);
    return manifest;
  }

  /**
   * Validate a manifest
   */
  validate(manifest: Manifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!manifest.name || manifest.name.length < 2) {
      errors.push({
        field: 'name',
        message: 'Plugin name is required and must be at least 2 characters',
        code: 'INVALID_NAME',
      });
    }

    if (!manifest.version || !this.isValidVersion(manifest.version)) {
      errors.push({
        field: 'version',
        message: 'Valid semantic version is required (e.g., 1.0.0)',
        code: 'INVALID_VERSION',
      });
    }

    if (!manifest.description || manifest.description.length < 10) {
      errors.push({
        field: 'description',
        message: 'Description must be at least 10 characters',
        code: 'INVALID_DESCRIPTION',
      });
    }

    if (!manifest.author || !manifest.author.name) {
      errors.push({
        field: 'author',
        message: 'Author name is required',
        code: 'INVALID_AUTHOR',
      });
    }

    // Validate permissions
    for (const permission of manifest.permissions) {
      if (!['read', 'write', 'execute', 'admin'].includes(permission.scope)) {
        errors.push({
          field: 'permissions',
          message: `Invalid permission scope: ${permission.scope}`,
          code: 'INVALID_PERMISSION_SCOPE',
        });
      }
    }

    // Validate capabilities
    for (const capability of manifest.capabilities) {
      if (!capability.inputs || capability.inputs.length === 0) {
        warnings.push({
          field: 'capabilities',
          message: `Capability ${capability.name} has no inputs defined`,
          suggestion: 'Consider defining inputs for better documentation',
        });
      }
    }

    // Validate hooks
    for (const hook of manifest.hooks) {
      if (hook.priority < 0 || hook.priority > 100) {
        warnings.push({
          field: 'hooks',
          message: `Hook ${hook.name} has unusual priority (${hook.priority})`,
          suggestion: 'Priority should typically be between 0 and 100',
        });
      }
    }

    // Validate resources
    if (manifest.resources.memory > 1024) {
      warnings.push({
        field: 'resources.memory',
        message: 'High memory requirement may limit plugin adoption',
        suggestion: 'Consider optimizing memory usage',
      });
    }

    if (manifest.resources.timeout > 60000) {
      warnings.push({
        field: 'resources.timeout',
        message: 'Long timeout may affect user experience',
        suggestion: 'Consider implementing progress indicators',
      });
    }

    // Validate dependencies
    for (const dep of manifest.dependencies) {
      if (!this.isValidVersion(dep.version)) {
        errors.push({
          field: 'dependencies',
          message: `Invalid version for dependency ${dep.name}: ${dep.version}`,
          code: 'INVALID_DEPENDENCY_VERSION',
        });
      }
    }

    // Validate configuration schema
    for (const schema of manifest.configuration.schema) {
      if (schema.required && schema.default === undefined) {
        warnings.push({
          field: 'configuration',
          message: `Required config ${schema.key} has no default value`,
          suggestion: 'Consider providing a sensible default',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Parse manifest from JSON
   */
  parse(json: string): Manifest {
    try {
      const data = JSON.parse(json);
      return this.fromObject(data);
    } catch (error) {
      throw new Error(`Failed to parse manifest: ${error}`);
    }
  }

  /**
   * Convert object to manifest
   */
  fromObject(data: Record<string, unknown>): Manifest {
    return {
      id: String(data.id || generateId()),
      name: String(data.name || ''),
      version: String(data.version || '0.0.0'),
      description: String(data.description || ''),
      author: data.author as ManifestAuthor || { name: 'Unknown' },
      license: String(data.license || 'MIT'),
      category: String(data.category || 'general'),
      tags: (data.tags as string[]) || [],
      permissions: (data.permissions as ManifestPermission[]) || [],
      capabilities: (data.capabilities as ManifestCapability[]) || [],
      hooks: (data.hooks as ManifestHook[]) || [],
      configuration: data.configuration as ManifestConfiguration || { schema: [], defaults: {} },
      dependencies: (data.dependencies as ManifestDependency[]) || [],
      compatibility: data.compatibility as ManifestCompatibility || {
        minVersion: '1.0.0',
        platforms: ['all'],
      },
      resources: data.resources as ManifestResources || {
        memory: 128,
        cpu: 0.1,
        timeout: 30000,
      },
    };
  }

  /**
   * Export manifest to JSON
   */
  toJSON(manifest: Manifest): string {
    return JSON.stringify(manifest, null, 2);
  }

  /**
   * Get manifest by ID
   */
  get(id: string): Manifest | undefined {
    return this.manifests.get(id);
  }

  /**
   * List all manifests
   */
  list(): Manifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Create a standard plugin manifest template
   */
  createTemplate(type: 'detector' | 'action' | 'integration'): Partial<Manifest> {
    const templates: Record<string, Partial<Manifest>> = {
      detector: {
        category: 'detection',
        permissions: [
          {
            name: 'read_deals',
            scope: 'read',
            resource: 'deals',
            required: true,
            description: 'Read access to deals for detection',
          },
        ],
        capabilities: [
          {
            name: 'detect',
            type: 'detector',
            description: 'Detect revenue leaks',
            inputs: [
              { name: 'deals', type: 'array', required: true, description: 'Deals to analyze' },
            ],
            outputs: [
              { name: 'leaks', type: 'array', required: true, description: 'Detected leaks' },
            ],
          },
        ],
        hooks: [
          { name: 'onDealCreated', event: 'deal.created', priority: 50, async: true, description: 'Triggered when deal created' },
          { name: 'onDealUpdated', event: 'deal.updated', priority: 50, async: true, description: 'Triggered when deal updated' },
        ],
      },
      action: {
        category: 'action',
        permissions: [
          {
            name: 'read_deals',
            scope: 'read',
            resource: 'deals',
            required: true,
            description: 'Read access to deals',
          },
          {
            name: 'write_deals',
            scope: 'write',
            resource: 'deals',
            required: true,
            description: 'Write access to update deals',
          },
        ],
        capabilities: [
          {
            name: 'execute',
            type: 'action',
            description: 'Execute remediation action',
            inputs: [
              { name: 'leak', type: 'object', required: true, description: 'Leak to remediate' },
            ],
            outputs: [
              { name: 'result', type: 'object', required: true, description: 'Action result' },
            ],
          },
        ],
      },
      integration: {
        category: 'integration',
        permissions: [
          {
            name: 'external_access',
            scope: 'execute',
            resource: 'external',
            required: true,
            description: 'Access to external systems',
          },
        ],
        capabilities: [
          {
            name: 'sync',
            type: 'integration',
            description: 'Sync data with external system',
            inputs: [
              { name: 'config', type: 'object', required: true, description: 'Integration config' },
            ],
            outputs: [
              { name: 'syncResult', type: 'object', required: true, description: 'Sync result' },
            ],
          },
        ],
      },
    };

    return templates[type] || {};
  }

  // Private methods

  private isValidVersion(version: string): boolean {
    const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
    return semverPattern.test(version);
  }
}

export default PluginManifest;
