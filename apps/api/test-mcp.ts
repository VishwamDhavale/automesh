import { readFileSync } from 'fs';
import { parseWorkflow } from '@automesh/workflow-engine';
import { workflowQueue } from './src/queue/queue.js';
import { nanoid } from 'nanoid';
import { db, schema } from './src/db/index.js';

async function main() {
  console.log('Reading test workflow...');
  const yaml = readFileSync('../../test-mcp-workflow.yaml', 'utf-8');
  const definition = parseWorkflow(yaml);

  const workflowId = `wf_test_${nanoid()}`;
  const runId = `run_mcp_${nanoid()}`;

  // Fake inserting workflow to appease foreign keys
  await db.insert(schema.workflows).values({
    id: workflowId,
    name: 'Test MCP Workflow',
  });

  const versionId = `wv_${nanoid()}`;
  await db.insert(schema.workflowVersions).values({
    id: versionId,
    workflowId,
    version: 1,
    definition: definition as any,
  });

  await db.insert(schema.workflowRuns).values({
    id: runId,
    workflowId,
    versionId,
    status: 'pending',
  });

  console.log(`Enqueuing MCP run: ${runId}`);
  await workflowQueue.add('execute', {
    workflowId,
    runId,
    definition: definition as any,
    context: {},
  });

  console.log('Job enqueued. The worker should pick it up.');
  setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
