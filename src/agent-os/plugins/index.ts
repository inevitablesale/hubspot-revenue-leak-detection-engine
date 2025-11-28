/**
 * Plugins Module
 * Plugin system for extending AgentOS with modular capabilities
 */

export { PluginLoader } from './loader';
export { PluginManifest } from './manifest';
export { PluginSDK } from './plugin-sdk';

// Re-export types
export type {
  Plugin,
  PluginConfig,
  PluginInstance,
  PluginDependency,
} from './loader';

export type {
  Manifest,
  ManifestPermission,
  ManifestCapability,
  ManifestHook,
} from './manifest';

export type {
  SDKContext,
  SDKHooks,
  SDKServices,
  PluginAPI,
} from './plugin-sdk';
