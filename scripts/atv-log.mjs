#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function nowIso() {
  // Keep simple ISO with offset; JS Date.toISOString() is UTC.
  // For MVP, UTC is acceptable; ATV renders ordering.
  return new Date().toISOString();
}

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });
}

function usageAndExit(msg) {
  if (msg) {
    process.stderr.write(`${msg}\n`);
  }
  process.stderr.write(
    [
      'Usage:',
      '  node scripts/atv-log.mjs --out runs/<file>.jsonl --run-id <id> --run-title-zh <title> --type <message|agent_status|artifact> [options]',
      '',
      'Options:',
      '  --stage <planning|build|verify|...>',
      '  --from-id <lead|planner|builder|reviewer>',
      '  --from-name <name>',
      '  --from-role <lead|planner|builder|reviewer|team>',
      '  --to-id <id> --to-name <name> --to-role <role>  (message only)',
      '  --content <text> --content-zh <text>           (message only)',
      '  --status-state <running|done|blocked>          (agent_status only)',
      '  --status-label-zh <text> --status-details-zh <text> (agent_status only)',
      '  --summary-zh <text>                            (artifact only)',
      '  --meta-leader-plan <path-to-md>                (message only; stored in meta.leader_plan)',
      '  --meta-task-breakdown-zh <path-to-md>          (message only; stored in meta.task_breakdown_zh)',
      '  --stdin                                        (read content_zh/summary_zh from stdin when not provided)',
      '',
    ].join('\n')
  );
  process.exit(2);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    if (k === 'stdin') {
      args.stdin = true;
      continue;
    }
    const v = argv[i + 1];
    i++;
    args[k] = v;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!args.out || !args['run-id'] || !args['run-title-zh'] || !args.type) {
  usageAndExit('Missing required flags.');
}

const outPath = path.resolve(process.cwd(), args.out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const base = {
  id: randomId('evt'),
  ts: nowIso(),
  run_id: args['run-id'],
  run_title_zh: args['run-title-zh'],
  type: args.type,
};

if (args.stage) base.stage = args.stage;

const from = {
  id: args['from-id'] || 'lead',
  name: args['from-name'] || 'Lead',
  role: args['from-role'] || (args['from-id'] === 'planner' ? 'planner' : 'lead'),
};
base.from = from;

async function main() {
  const stdinText = args.stdin ? (await readStdin()).trim() : '';

  if (args.type === 'message') {
    base.to = {
      id: args['to-id'] || 'all',
      name: args['to-name'] || 'Team',
      role: args['to-role'] || 'team',
    };
    base.channel = args.channel || 'instruction';
    base.content = args.content || '';
    base.content_zh = args['content-zh'] || stdinText || '';

    const meta = {};
    if (args['meta-leader-plan']) {
      meta.leader_plan = fs.readFileSync(path.resolve(process.cwd(), args['meta-leader-plan']), 'utf8');
    }
    if (args['meta-task-breakdown-zh']) {
      meta.task_breakdown_zh = fs.readFileSync(path.resolve(process.cwd(), args['meta-task-breakdown-zh']), 'utf8');
    }
    if (Object.keys(meta).length) {
      base.meta = meta;
    }
  } else if (args.type === 'agent_status') {
    base.agent_status = {
      state: args['status-state'] || 'running',
      label_zh: args['status-label-zh'] || (stdinText || ''),
      details_zh: args['status-details-zh'] || '',
    };
  } else if (args.type === 'artifact') {
    base.artifact = {
      summary_zh: args['summary-zh'] || stdinText || '',
    };
  } else {
    usageAndExit(`Unsupported type: ${args.type}`);
  }

  fs.appendFileSync(outPath, `${JSON.stringify(base)}\n`, 'utf8');
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});
