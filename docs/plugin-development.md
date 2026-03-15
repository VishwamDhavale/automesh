# Plugin Development Guide

## Overview

Automesh actions are modular plugins. Each plugin is a directory containing a manifest, schema, and run function.

## Plugin Structure

```
plugins/
  my-plugin/
    index.ts      # Plugin implementation
    manifest.json # Optional: auto-generated from code
```

## Plugin Contract

Every plugin must export:

### `manifest`
```ts
export const manifest = {
  name: 'my_action',
  version: '1.0.0',
  description: 'What this plugin does',
  inputs: ['param1', 'param2'],
  outputs: ['result_field'],
};
```

### `run(context, params)`
```ts
import type { PluginContext, PluginResult } from '@automesh/shared-types';

export async function run(
  context: PluginContext,
  params: Record<string, unknown>
): Promise<PluginResult> {
  // Your plugin logic
  const result = await doSomething(params.param1);

  return {
    success: true,
    data: {
      result_field: result,
    },
  };
}
```

## Context Object

```ts
interface PluginContext {
  workflowId: string;     // Current workflow ID
  runId: string;          // Current run ID
  stepId: string;         // Current step ID
  state: Record<string, unknown>;  // Accumulated state from previous steps
  logger: PluginLogger;   // Structured logger
}
```

## Returning Results

```ts
// Success
return { success: true, data: { key: 'value' } };

// Failure
return { success: false, data: {}, error: 'What went wrong' };
```

## Registration

Plugins are auto-registered in `packages/action-plugins/src/index.ts`:

```ts
import { registerPlugin } from './registry.js';
import { manifest, run } from './plugins/my-plugin/index.js';

registerPlugin(manifest, run);
```

## Best Practices

1. **Mock mode**: Check for API keys and fall back to mock behavior when missing
2. **Error handling**: Always catch errors and return `{ success: false }`
3. **Logging**: Use `context.logger` for structured logs
4. **Outputs**: Return data that subsequent steps might need via state interpolation
