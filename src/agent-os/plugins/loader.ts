/**
 * Plugin Loader Module
 * Manages loading, initialization, and lifecycle of plugins
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Plugin Loader Types
// ============================================================

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: PluginCategory;
  status: PluginStatus;
  config: PluginConfig;
  dependencies: PluginDependency[];
  hooks: string[];
  permissions: string[];
  installedAt: Date;
  updatedAt: Date;
}

export type PluginCategory = 
  | 'detection'
  | 'action'
  | 'integration'
  | 'visualization'
  | 'analytics'
  | 'automation'
  | 'governance';

export type PluginStatus = 
  | 'installed'
  | 'enabled'
  | 'disabled'
  | 'error'
  | 'updating';

export interface PluginConfig {
  enabled: boolean;
  settings: Record<string, unknown>;
  priority: number;
  autoStart: boolean;
}

export interface PluginInstance {
  plugin: Plugin;
  state: InstanceState;
  resources: InstanceResources;
  metrics: InstanceMetrics;
}

export interface InstanceState {
  status: 'starting' | 'running' | 'stopped' | 'error';
  lastError?: string;
  startedAt?: Date;
  stoppedAt?: Date;
}

export interface InstanceResources {
  memory: number;
  cpu: number;
  apiCalls: number;
  lastActivity?: Date;
}

export interface InstanceMetrics {
  invocations: number;
  successRate: number;
  avgLatency: number;
  errors: number;
}

export interface PluginDependency {
  pluginId: string;
  version: string;
  optional: boolean;
}

export interface LoaderConfig {
  maxPlugins: number;
  autoEnable: boolean;
  sandboxed: boolean;
  allowRemote: boolean;
}

export interface LoaderStats {
  totalPlugins: number;
  enabledPlugins: number;
  errorPlugins: number;
  totalInvocations: number;
}

// ============================================================
// Plugin Loader Implementation
// ============================================================

export class PluginLoader {
  private plugins: Map<string, Plugin> = new Map();
  private instances: Map<string, PluginInstance> = new Map();
  private config: LoaderConfig;
  private stats: LoaderStats;

  constructor(config?: Partial<LoaderConfig>) {
    this.config = {
      maxPlugins: 50,
      autoEnable: false,
      sandboxed: true,
      allowRemote: false,
      ...config,
    };

    this.stats = {
      totalPlugins: 0,
      enabledPlugins: 0,
      errorPlugins: 0,
      totalInvocations: 0,
    };
  }

  /**
   * Install a plugin
   */
  install(
    name: string,
    version: string,
    description: string,
    author: string,
    category: PluginCategory,
    options?: {
      dependencies?: PluginDependency[];
      hooks?: string[];
      permissions?: string[];
      settings?: Record<string, unknown>;
    }
  ): Plugin {
    if (this.plugins.size >= this.config.maxPlugins) {
      throw new Error(`Maximum plugin limit (${this.config.maxPlugins}) reached`);
    }

    // Check for existing plugin
    const existing = Array.from(this.plugins.values())
      .find(p => p.name === name);
    
    if (existing) {
      throw new Error(`Plugin ${name} is already installed`);
    }

    // Validate dependencies
    if (options?.dependencies) {
      for (const dep of options.dependencies) {
        if (!dep.optional && !this.plugins.has(dep.pluginId)) {
          throw new Error(`Required dependency ${dep.pluginId} not found`);
        }
      }
    }

    const plugin: Plugin = {
      id: generateId(),
      name,
      version,
      description,
      author,
      category,
      status: 'installed',
      config: {
        enabled: false,
        settings: options?.settings || {},
        priority: 0,
        autoStart: false,
      },
      dependencies: options?.dependencies || [],
      hooks: options?.hooks || [],
      permissions: options?.permissions || [],
      installedAt: new Date(),
      updatedAt: new Date(),
    };

    this.plugins.set(plugin.id, plugin);
    this.updateStats();

    // Auto-enable if configured
    if (this.config.autoEnable) {
      this.enable(plugin.id);
    }

    return plugin;
  }

  /**
   * Uninstall a plugin
   */
  uninstall(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Check for dependents
    const dependents = Array.from(this.plugins.values())
      .filter(p => p.dependencies.some(d => d.pluginId === pluginId && !d.optional));
    
    if (dependents.length > 0) {
      throw new Error(`Cannot uninstall: ${dependents.map(d => d.name).join(', ')} depend on this plugin`);
    }

    // Stop instance if running
    if (this.instances.has(pluginId)) {
      this.disable(pluginId);
    }

    this.plugins.delete(pluginId);
    this.updateStats();
  }

  /**
   * Enable a plugin
   */
  enable(pluginId: string): PluginInstance {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status === 'enabled') {
      return this.instances.get(pluginId)!;
    }

    // Enable dependencies first
    for (const dep of plugin.dependencies) {
      if (!dep.optional) {
        this.enable(dep.pluginId);
      }
    }

    // Create instance
    const instance: PluginInstance = {
      plugin,
      state: {
        status: 'running',
        startedAt: new Date(),
      },
      resources: {
        memory: 0,
        cpu: 0,
        apiCalls: 0,
      },
      metrics: {
        invocations: 0,
        successRate: 1,
        avgLatency: 0,
        errors: 0,
      },
    };

    plugin.status = 'enabled';
    plugin.config.enabled = true;
    this.instances.set(pluginId, instance);
    this.updateStats();

    return instance;
  }

  /**
   * Disable a plugin
   */
  disable(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Disable dependents first
    const dependents = Array.from(this.plugins.values())
      .filter(p => p.dependencies.some(d => d.pluginId === pluginId && !d.optional) && p.status === 'enabled');
    
    for (const dependent of dependents) {
      this.disable(dependent.id);
    }

    const instance = this.instances.get(pluginId);
    if (instance) {
      instance.state.status = 'stopped';
      instance.state.stoppedAt = new Date();
    }

    plugin.status = 'disabled';
    plugin.config.enabled = false;
    this.instances.delete(pluginId);
    this.updateStats();
  }

  /**
   * Invoke a plugin
   */
  invoke(
    pluginId: string,
    hook: string,
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const instance = this.instances.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not enabled`);
    }

    if (!instance.plugin.hooks.includes(hook)) {
      throw new Error(`Plugin ${pluginId} does not support hook ${hook}`);
    }

    const startTime = Date.now();

    try {
      // Simulate plugin execution
      const result = this.executeHook(instance, hook, data);

      // Update metrics
      const latency = Date.now() - startTime;
      instance.metrics.invocations++;
      instance.metrics.avgLatency = (
        (instance.metrics.avgLatency * (instance.metrics.invocations - 1) + latency) /
        instance.metrics.invocations
      );
      instance.resources.lastActivity = new Date();

      this.stats.totalInvocations++;

      return result;
    } catch (error) {
      instance.metrics.errors++;
      instance.metrics.successRate = (
        (instance.metrics.invocations - instance.metrics.errors) /
        instance.metrics.invocations
      );
      
      if (instance.metrics.successRate < 0.5) {
        instance.state.status = 'error';
        instance.state.lastError = String(error);
        instance.plugin.status = 'error';
        this.updateStats();
      }

      throw error;
    }
  }

  /**
   * Get plugin by ID
   */
  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: PluginCategory): Plugin[] {
    return Array.from(this.plugins.values())
      .filter(p => p.category === category);
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
      .filter(p => p.status === 'enabled');
  }

  /**
   * Get instance
   */
  getInstance(pluginId: string): PluginInstance | undefined {
    return this.instances.get(pluginId);
  }

  /**
   * Update plugin configuration
   */
  updateConfig(pluginId: string, settings: Record<string, unknown>): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.config.settings = { ...plugin.config.settings, ...settings };
    plugin.updatedAt = new Date();
  }

  /**
   * Get statistics
   */
  getStats(): LoaderStats {
    return { ...this.stats };
  }

  // Private methods

  private executeHook(
    instance: PluginInstance,
    hook: string,
    data: Record<string, unknown>
  ): Record<string, unknown> {
    // Simulate hook execution
    // In a real implementation, this would call the plugin's hook handler
    return {
      success: true,
      hook,
      plugin: instance.plugin.name,
      timestamp: new Date(),
      data: { ...data, processed: true },
    };
  }

  private updateStats(): void {
    const plugins = Array.from(this.plugins.values());
    
    this.stats.totalPlugins = plugins.length;
    this.stats.enabledPlugins = plugins.filter(p => p.status === 'enabled').length;
    this.stats.errorPlugins = plugins.filter(p => p.status === 'error').length;
  }
}

export default PluginLoader;
