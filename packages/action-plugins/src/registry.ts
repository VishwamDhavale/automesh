import type { PluginManifest, PluginRunFn, PluginResult, PluginContext } from '@automesh/shared-types';

// ─── Plugin Registry ────────────────────────────────────────────

export interface RegisteredPlugin {
  manifest: PluginManifest;
  run: PluginRunFn;
}

const plugins: Map<string, RegisteredPlugin> = new Map();

/**
 * Register a plugin by name.
 */
export function registerPlugin(manifest: PluginManifest, run: PluginRunFn): void {
  plugins.set(manifest.name, { manifest, run });
}

/**
 * Get a plugin by name.
 */
export function getPlugin(name: string): RegisteredPlugin | undefined {
  return plugins.get(name);
}

/**
 * Get all registered plugins.
 */
export function getAllPlugins(): RegisteredPlugin[] {
  return Array.from(plugins.values());
}

/**
 * Execute a plugin action by name.
 */
export async function runAction(
  actionName: string,
  context: PluginContext,
  params: Record<string, unknown>
): Promise<PluginResult> {
  const plugin = plugins.get(actionName);

  if (!plugin) {
    return {
      success: false,
      data: {},
      error: `Plugin "${actionName}" not found. Available: ${Array.from(plugins.keys()).join(', ')}`,
    };
  }

  try {
    return await plugin.run(context, params);
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
