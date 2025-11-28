/**
 * Plugin SDK Module
 * SDK for developing AgentOS plugins
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Plugin SDK Types
// ============================================================

export interface SDKContext {
  pluginId: string;
  pluginName: string;
  version: string;
  config: Record<string, unknown>;
  permissions: string[];
  state: Record<string, unknown>;
}

export interface SDKHooks {
  onInit: () => Promise<void>;
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
  onConfig: (config: Record<string, unknown>) => Promise<void>;
  onEvent: (event: string, data: unknown) => Promise<unknown>;
}

export interface SDKServices {
  logger: LoggerService;
  storage: StorageService;
  api: APIService;
  events: EventService;
  metrics: MetricsService;
}

export interface PluginAPI {
  context: SDKContext;
  services: SDKServices;
  hooks: Partial<SDKHooks>;
  execute: (action: string, params: Record<string, unknown>) => Promise<unknown>;
}

export interface LoggerService {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}

export interface StorageService {
  get: <T>(key: string) => Promise<T | undefined>;
  set: <T>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: () => Promise<string[]>;
}

export interface APIService {
  call: <T>(endpoint: string, options?: APIOptions) => Promise<T>;
  hubspot: HubSpotAPI;
}

export interface APIOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

export interface HubSpotAPI {
  deals: CRUDOperations;
  contacts: CRUDOperations;
  companies: CRUDOperations;
  tickets: CRUDOperations;
}

export interface CRUDOperations {
  get: (id: string) => Promise<Record<string, unknown>>;
  list: (params?: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
  create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  delete: (id: string) => Promise<void>;
}

export interface EventService {
  emit: (event: string, data: unknown) => void;
  on: (event: string, handler: (data: unknown) => void) => () => void;
  once: (event: string, handler: (data: unknown) => void) => void;
}

export interface MetricsService {
  counter: (name: string, value?: number, tags?: Record<string, string>) => void;
  gauge: (name: string, value: number, tags?: Record<string, string>) => void;
  histogram: (name: string, value: number, tags?: Record<string, string>) => void;
  timing: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
}

export interface PluginBuilder {
  name: string;
  version: string;
  hooks: Partial<SDKHooks>;
  actions: Map<string, ActionHandler>;
  detectors: Map<string, DetectorHandler>;
}

export type ActionHandler = (params: Record<string, unknown>, context: SDKContext) => Promise<unknown>;
export type DetectorHandler = (data: Record<string, unknown>[], context: SDKContext) => Promise<DetectionResult[]>;

export interface DetectionResult {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entityId: string;
  description: string;
  data: Record<string, unknown>;
}

// ============================================================
// Plugin SDK Implementation
// ============================================================

export class PluginSDK {
  private plugins: Map<string, PluginBuilder> = new Map();
  private contexts: Map<string, SDKContext> = new Map();
  private storage: Map<string, Map<string, unknown>> = new Map();
  private eventHandlers: Map<string, Array<(data: unknown) => void>> = new Map();

  /**
   * Create a new plugin
   */
  createPlugin(name: string, version: string): PluginBuilder {
    const builder: PluginBuilder = {
      name,
      version,
      hooks: {},
      actions: new Map(),
      detectors: new Map(),
    };

    this.plugins.set(name, builder);
    return builder;
  }

  /**
   * Register a hook
   */
  registerHook(
    pluginName: string,
    hookName: keyof SDKHooks,
    handler: SDKHooks[keyof SDKHooks]
  ): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    (plugin.hooks as Record<string, unknown>)[hookName] = handler;
  }

  /**
   * Register an action
   */
  registerAction(
    pluginName: string,
    actionName: string,
    handler: ActionHandler
  ): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    plugin.actions.set(actionName, handler);
  }

  /**
   * Register a detector
   */
  registerDetector(
    pluginName: string,
    detectorName: string,
    handler: DetectorHandler
  ): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    plugin.detectors.set(detectorName, handler);
  }

  /**
   * Build plugin API
   */
  buildAPI(pluginName: string, config?: Record<string, unknown>): PluginAPI {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    const context: SDKContext = {
      pluginId: generateId(),
      pluginName: plugin.name,
      version: plugin.version,
      config: config || {},
      permissions: [],
      state: {},
    };

    this.contexts.set(context.pluginId, context);

    const services = this.createServices(context.pluginId);

    return {
      context,
      services,
      hooks: plugin.hooks,
      execute: async (action: string, params: Record<string, unknown>) => {
        const handler = plugin.actions.get(action);
        if (!handler) {
          throw new Error(`Action ${action} not found in plugin ${pluginName}`);
        }
        return handler(params, context);
      },
    };
  }

  /**
   * Execute detector
   */
  async executeDetector(
    pluginName: string,
    detectorName: string,
    data: Record<string, unknown>[]
  ): Promise<DetectionResult[]> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    const handler = plugin.detectors.get(detectorName);
    if (!handler) {
      throw new Error(`Detector ${detectorName} not found in plugin ${pluginName}`);
    }

    const context = this.contexts.get(pluginName) || {
      pluginId: generateId(),
      pluginName: plugin.name,
      version: plugin.version,
      config: {},
      permissions: [],
      state: {},
    };

    return handler(data, context);
  }

  /**
   * Get plugin
   */
  getPlugin(name: string): PluginBuilder | undefined {
    return this.plugins.get(name);
  }

  /**
   * List plugins
   */
  listPlugins(): PluginBuilder[] {
    return Array.from(this.plugins.values());
  }

  // Private methods

  private createServices(pluginId: string): SDKServices {
    return {
      logger: this.createLoggerService(pluginId),
      storage: this.createStorageService(pluginId),
      api: this.createAPIService(),
      events: this.createEventService(),
      metrics: this.createMetricsService(pluginId),
    };
  }

  private createLoggerService(pluginId: string): LoggerService {
    const prefix = `[Plugin:${pluginId}]`;
    return {
      debug: (message: string, data?: unknown) => {
        console.debug(prefix, message, data || '');
      },
      info: (message: string, data?: unknown) => {
        console.info(prefix, message, data || '');
      },
      warn: (message: string, data?: unknown) => {
        console.warn(prefix, message, data || '');
      },
      error: (message: string, data?: unknown) => {
        console.error(prefix, message, data || '');
      },
    };
  }

  private createStorageService(pluginId: string): StorageService {
    if (!this.storage.has(pluginId)) {
      this.storage.set(pluginId, new Map());
    }
    const pluginStorage = this.storage.get(pluginId)!;

    return {
      get: async <T>(key: string): Promise<T | undefined> => {
        return pluginStorage.get(key) as T | undefined;
      },
      set: async <T>(key: string, value: T): Promise<void> => {
        pluginStorage.set(key, value);
      },
      delete: async (key: string): Promise<void> => {
        pluginStorage.delete(key);
      },
      list: async (): Promise<string[]> => {
        return Array.from(pluginStorage.keys());
      },
    };
  }

  private createAPIService(): APIService {
    const mockCRUD: CRUDOperations = {
      get: async (id: string) => ({ id }),
      list: async () => [],
      create: async (data) => ({ id: generateId(), ...data }),
      update: async (id, data) => ({ id, ...data }),
      delete: async () => { /* no-op */ },
    };

    return {
      call: async <T>(endpoint: string, options?: APIOptions): Promise<T> => {
        // Mock implementation
        return { endpoint, options } as unknown as T;
      },
      hubspot: {
        deals: mockCRUD,
        contacts: mockCRUD,
        companies: mockCRUD,
        tickets: mockCRUD,
      },
    };
  }

  private createEventService(): EventService {
    return {
      emit: (event: string, data: unknown) => {
        const handlers = this.eventHandlers.get(event) || [];
        for (const handler of handlers) {
          handler(data);
        }
      },
      on: (event: string, handler: (data: unknown) => void) => {
        if (!this.eventHandlers.has(event)) {
          this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)!.push(handler);
        
        // Return unsubscribe function
        return () => {
          const handlers = this.eventHandlers.get(event) || [];
          const index = handlers.indexOf(handler);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        };
      },
      once: (event: string, handler: (data: unknown) => void) => {
        const wrapper = (data: unknown) => {
          handler(data);
          const handlers = this.eventHandlers.get(event) || [];
          const index = handlers.indexOf(wrapper);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        };
        
        if (!this.eventHandlers.has(event)) {
          this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)!.push(wrapper);
      },
    };
  }

  private createMetricsService(pluginId: string): MetricsService {
    return {
      counter: (name: string, value?: number, tags?: Record<string, string>) => {
        // Mock implementation - in production, send to metrics backend
        console.debug(`[Metrics:${pluginId}] Counter: ${name} = ${value || 1}`, tags);
      },
      gauge: (name: string, value: number, tags?: Record<string, string>) => {
        console.debug(`[Metrics:${pluginId}] Gauge: ${name} = ${value}`, tags);
      },
      histogram: (name: string, value: number, tags?: Record<string, string>) => {
        console.debug(`[Metrics:${pluginId}] Histogram: ${name} = ${value}`, tags);
      },
      timing: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
        const start = Date.now();
        try {
          return await fn();
        } finally {
          const duration = Date.now() - start;
          console.debug(`[Metrics:${pluginId}] Timing: ${name} = ${duration}ms`);
        }
      },
    };
  }
}

export default PluginSDK;
