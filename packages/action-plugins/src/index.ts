export { registerPlugin, getPlugin, getAllPlugins, runAction } from './registry.js';
export type { RegisteredPlugin } from './registry.js';

// Auto-register built-in plugins
import { registerPlugin } from './registry.js';

import { manifest as sendEmailManifest, run as sendEmailRun } from './plugins/send-email/index.js';
import { manifest as createContactManifest, run as createContactRun } from './plugins/create-contact/index.js';
import { manifest as notifySlackManifest, run as notifySlackRun } from './plugins/notify-slack/index.js';
import { manifest as runMcpManifest, run as runMcpRun } from './plugins/run-mcp/index.js';

registerPlugin(sendEmailManifest, sendEmailRun);
registerPlugin(createContactManifest, createContactRun);
registerPlugin(notifySlackManifest, notifySlackRun);
registerPlugin(runMcpManifest, runMcpRun);
