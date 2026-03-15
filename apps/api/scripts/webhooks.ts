import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../../.env');
const envResult = config({ path: envPath });

console.log('--- DEBUG INFO ---');
console.log('__dirname:', __dirname);
console.log('Target .env path:', envPath);
console.log('Dotenv result:', envResult.error ? envResult.error.message : 'Success');
console.log('------------------');

import SmeeClient from 'smee-client';
import { nanoid } from 'nanoid';

const hasPermanentUrl = !!process.env.SMEE_WEBHOOK_URL;
const sourceUrl = process.env.SMEE_WEBHOOK_URL ?? `https://smee.io/${nanoid(16)}`;

const targetUrl = `http://localhost:${process.env.API_PORT ?? 4000}/api/webhooks/github`;

const smee = new SmeeClient({
  source: sourceUrl,
  target: targetUrl,
  logger: console,
});

console.log('\n======================================================');
console.log('🔗 Smee Webhook Proxy Started!');
console.log('');

if (!hasPermanentUrl) {
  console.log('⚠️  Notice: You are using a temporary, random Webhook URL.');
  console.log(`    To make it permanent, add this line to your .env file:`);
  console.log(`    SMEE_WEBHOOK_URL=${sourceUrl}`);
  console.log('');
} else {
  console.log('✅ Loaded permanent URL from .env (SMEE_WEBHOOK_URL)');
  console.log('');
}
console.log('📌 Your Webhook URL:');
console.log(`   ${sourceUrl}`);
console.log('');
console.log('👉 Add this URL to GitHub repository settings:');
console.log('   Settings -> Webhooks -> Add webhook');
console.log('   Payload URL:', sourceUrl);
console.log('   Content type: application/json');
console.log('======================================================\n');

// Start forwarding events
const events = smee.start();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nStopping Smee proxy...');
  const resolvedEvents = await events;
  resolvedEvents.close();
  process.exit(0);
});
