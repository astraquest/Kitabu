import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
const apiDir = path.resolve(import.meta.dirname, '..', '..');
loadEnv({ path: path.join(apiDir, '.env') });

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function filesUnder(root, relativeInput) {
  const absolute = path.resolve(root, relativeInput);
  const details = await stat(absolute);
  if (details.isFile()) return [absolute];
  if (!details.isDirectory()) throw new Error(`Unsupported deployment input: ${relativeInput}`);

  const files = [];
  for (const entry of await readdir(absolute, { withFileTypes: true })) {
    const child = path.join(absolute, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(root, path.relative(root, child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

export async function digestInputs(root, relativeInputs) {
  const files = (await Promise.all(relativeInputs.map(input => filesUnder(root, input))))
    .flat()
    .sort((left, right) => left.localeCompare(right));
  const digest = createHash('sha256');
  for (const file of files) {
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const contents = await readFile(file);
    digest.update(relative);
    digest.update('\0');
    digest.update(String(contents.length));
    digest.update('\0');
    digest.update(contents);
    digest.update('\0');
  }
  return digest.digest('hex');
}

function gradeDirectory(grade) {
  if (grade <= 9) return `data/curriculum/KEN/CBC/kicd-2024-grade-${grade}`;
  if (grade <= 11) return `data/curriculum/KEN/CBC/kicd-2025-grade-${grade}`;
  return 'data/curriculum/KEN/CBC/kicd-2026-grade-12';
}

export function operationDefinitions() {
  const lowerSource = 'data/curriculum/KEN/CBC/kicd-2024-grade-1-3/normalized-curriculum.json';
  const definitions = [
    {
      key: 'curriculum-lower-primary-import',
      inputs: [lowerSource, 'scripts/curriculum/import-kicd-grade1-3.mjs'],
      preview: [['scripts/curriculum/import-kicd-grade1-3.mjs', '--dry-run']],
      apply: [['scripts/curriculum/import-kicd-grade1-3.mjs']],
    },
  ];

  for (const grade of [1, 2, 3]) {
    definitions.push({
      key: `curriculum-lower-primary-grade-${grade}-repair`,
      state: { kind: 'lower-primary-grade', grade: `Grade ${grade}` },
      dependencies: ['curriculum-lower-primary-import'],
      inputs: [
        lowerSource,
        'scripts/curriculum/repair-lower-primary-from-preserved-source.mjs',
        'scripts/curriculum/repair-lower-primary-language-hierarchy.mjs',
      ],
      preview: [
        ['scripts/curriculum/repair-lower-primary-from-preserved-source.mjs', lowerSource, String(grade), '--dry-run'],
        ['scripts/curriculum/repair-lower-primary-language-hierarchy.mjs', lowerSource, String(grade), '--dry-run'],
      ],
      apply: [
        ['scripts/curriculum/repair-lower-primary-from-preserved-source.mjs', lowerSource, String(grade)],
        ['scripts/curriculum/repair-lower-primary-language-hierarchy.mjs', lowerSource, String(grade)],
      ],
    });
  }

  for (const grade of [4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const directory = gradeDirectory(grade);
    definitions.push({
      key: `curriculum-grade-${grade}`,
      state: { kind: 'upper-grade', grade: `Grade ${grade}` },
      inputs: [
        directory,
        'scripts/curriculum/import-kicd-corpus.mjs',
        'scripts/curriculum/repair-upper-grade-curriculum.mjs',
      ],
      execution: [
        { phase: 'preview', command: ['scripts/curriculum/import-kicd-corpus.mjs', '--dry-run', '--grade-dir', directory] },
        { phase: 'apply', command: ['scripts/curriculum/import-kicd-corpus.mjs', '--grade-dir', directory] },
        { phase: 'preview', command: ['scripts/curriculum/repair-upper-grade-curriculum.mjs', '--dry-run', '--grade-dir', directory] },
        { phase: 'apply', command: ['scripts/curriculum/repair-upper-grade-curriculum.mjs', '--grade-dir', directory] },
      ],
    });
  }

  definitions.push({
    key: 'quiz-bank-import',
    state: { kind: 'quiz-bank' },
    inputs: [
      'data/quiz-bank',
      'scripts/quiz-bank/validate-quiz-bank.mjs',
      'scripts/quiz-bank/import-quiz-bank.mjs',
    ],
    preview: [
      ['scripts/quiz-bank/validate-quiz-bank.mjs'],
      ['scripts/quiz-bank/import-quiz-bank.mjs', '--dry-run'],
    ],
    apply: [['scripts/quiz-bank/import-quiz-bank.mjs']],
  });
  return definitions;
}

export async function resolveOperationDigests(definitions, root = apiDir) {
  const resolved = [];
  const digestByKey = new Map();
  for (const definition of definitions) {
    const inputDigest = await digestInputs(root, definition.inputs);
    const dependencies = (definition.dependencies ?? []).map(key => {
      const digest = digestByKey.get(key);
      if (!digest) throw new Error(`${definition.key} has unresolved dependency ${key}.`);
      return { key, digest };
    });
    const digest = sha256(canonicalJson({
      schema: 1,
      key: definition.key,
      inputDigest,
      dependencies,
      preview: definition.preview,
      apply: definition.apply,
      execution: definition.execution,
    }));
    digestByKey.set(definition.key, digest);
    resolved.push({ ...definition, digest });
  }
  return resolved;
}

export function selectPendingOperations(operations, checkpoints, forceKeys = new Set(), stateDigests = new Map()) {
  return operations.map(operation => {
    const checkpoint = checkpoints.get(operation.key);
    const forced = forceKeys.has(operation.key);
    const inputMatches = checkpoint?.inputSha256 === operation.digest;
    const stateMatches = !operation.state || (
      checkpoint?.databaseStateSha256 && checkpoint.databaseStateSha256 === stateDigests.get(operation.key)
    );
    const action = !forced && inputMatches && stateMatches ? 'skip' : 'apply';
    return {
      ...operation,
      action,
      reason: forced
        ? 'forced'
        : action === 'skip'
          ? 'checkpoint-match'
          : !checkpoint
            ? 'no-checkpoint'
            : !inputMatches
              ? 'input-changed'
              : 'database-state-changed',
    };
  });
}

function normalizedSqlChecksum(sql) {
  return sha256(sql.replace(/\r\n/g, '\n'));
}

async function pendingMigrations(client) {
  const migrationFiles = (await readdir(path.join(apiDir, 'sql')))
    .filter(file => file.endsWith('.sql'))
    .sort();
  const exists = await client.query(`SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present`);
  if (!exists.rows[0]?.present) return migrationFiles;
  const applied = await client.query('SELECT filename, checksum FROM schema_migrations');
  const appliedByName = new Map(applied.rows.map(row => [row.filename, row.checksum]));
  const pending = [];
  for (const filename of migrationFiles) {
    const sql = await readFile(path.join(apiDir, 'sql', filename), 'utf8');
    const expected = normalizedSqlChecksum(sql);
    const current = appliedByName.get(filename);
    if (!current) pending.push(filename);
    else if (current !== expected) throw new Error(`${filename} checksum changed after it was applied.`);
  }
  return pending;
}

async function readCheckpoints(client) {
  const exists = await client.query(`SELECT to_regclass('public.deployment_data_operation_checkpoints') IS NOT NULL AS present`);
  if (!exists.rows[0]?.present) return new Map();
  const result = await client.query(
    `SELECT operation_key, input_sha256, database_state_sha256, release_sha, completed_at
     FROM deployment_data_operation_checkpoints`,
  );
  return new Map(result.rows.map(row => [row.operation_key, {
    inputSha256: row.input_sha256,
    databaseStateSha256: row.database_state_sha256,
    releaseSha: row.release_sha,
    completedAt: row.completed_at,
  }]));
}

async function stateRows(client, state) {
  if (state.kind === 'lower-primary-grade') {
    const result = await client.query(
      `SELECT
         cs.id, cs.subject_id, cs.subject_name, cs.number, cs.title, cs.position, cs.is_active,
         css.id AS sub_strand_id, css.strand_id, css.number AS sub_strand_number,
         css.title AS sub_strand_title, css.position AS sub_strand_position,
         css.outcomes, css.inquiry_questions, css.is_active AS sub_strand_active,
         ct.id AS topic_id, ct.code AS topic_code, ct.title AS topic_title,
         ct.position AS topic_position, ct.source_kind, ct.source_reference, ct.is_active AS topic_active
       FROM curriculum_strands cs
       LEFT JOIN curriculum_sub_strands css ON css.strand_id = cs.id
       LEFT JOIN curriculum_topics ct ON ct.sub_strand_id = css.id
         AND ct.source_kind = 'official_sub_strand_root'
       WHERE cs.country_code = 'KEN' AND cs.curriculum_code = 'CBC' AND cs.grade_level = $1
       ORDER BY cs.id, css.id, ct.id`,
      [state.grade],
    );
    return result.rows;
  }

  if (state.kind === 'upper-grade') {
    const subjects = await client.query(
      `SELECT grade_level, subject_code, display_name, source_codes, active_source_release_id
       FROM curriculum_grade_subject_identities
       WHERE country_code = 'KEN' AND curriculum_code = 'CBC' AND grade_level = $1
       ORDER BY subject_code`,
      [state.grade],
    );
    const strands = await client.query(
      `SELECT grade_level, subject_code, canonical_key, code, title, position,
              active_source_release_id, source_reference, is_active
       FROM curriculum_canonical_strands
       WHERE country_code = 'KEN' AND curriculum_code = 'CBC' AND grade_level = $1
       ORDER BY subject_code, canonical_key`,
      [state.grade],
    );
    const topics = await client.query(
      `SELECT ct.id, ct.canonical_key, ct.code, ct.title, ct.position, ct.display_order,
              ct.is_active, ccs.subject_code, ccs.grade_level
       FROM curriculum_topics ct
       JOIN curriculum_canonical_strands ccs ON ccs.id = ct.canonical_strand_id
       WHERE ccs.country_code = 'KEN' AND ccs.curriculum_code = 'CBC'
         AND ccs.grade_level = $1 AND ct.canonical_key IS NOT NULL
       ORDER BY ccs.subject_code, ct.canonical_key`,
      [state.grade],
    );
    return { subjects: subjects.rows, strands: strands.rows, topics: topics.rows };
  }

  if (state.kind === 'quiz-bank') {
    const result = await client.query(
      `SELECT country_code, curriculum_code, grade_level, subject_id, subject_name,
              strand_title, sub_strand_title, learning_outcome, question_number, type,
              prompt, options, correct_answer, explanation, difficulty, cognitive_level,
              feature_tags, source
       FROM quiz_bank_questions
       WHERE country_code = 'KEN' AND curriculum_code = 'CBC'
       ORDER BY grade_level, subject_id, question_number`,
    );
    return result.rows;
  }

  throw new Error(`Unknown database state scope: ${state.kind}`);
}

async function databaseStateDigest(client, operation) {
  if (!operation.state) return null;
  return sha256(canonicalJson(await stateRows(client, operation.state)));
}

async function readStateDigests(client, operations) {
  const entries = [];
  for (const operation of operations) {
    if (operation.state) entries.push([operation.key, await databaseStateDigest(client, operation)]);
  }
  return new Map(entries);
}

export async function buildPlan(client, { forceKeys = new Set() } = {}) {
  const operations = await resolveOperationDigests(operationDefinitions());
  const checkpointTable = await client.query(
    `SELECT to_regclass('public.deployment_data_operation_checkpoints') IS NOT NULL AS present`,
  );
  const checkpoints = checkpointTable.rows[0]?.present ? await readCheckpoints(client) : new Map();
  const stateDigests = checkpointTable.rows[0]?.present ? await readStateDigests(client, operations) : new Map();
  const selected = selectPendingOperations(operations, checkpoints, forceKeys, stateDigests);
  const migrations = await pendingMigrations(client);
  return {
    schema: 1,
    pendingMigrations: migrations,
    operations: selected.map(({ key, digest, action, reason }) => ({ key, inputSha256: digest, action, reason })),
    mutatesData: migrations.length > 0 || selected.some(operation => operation.action === 'apply'),
    resolvedOperations: selected,
  };
}

async function sampleRssKiB(pid) {
  try {
    const status = await readFile(`/proc/${pid}/status`, 'utf8');
    const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

export async function runNodeCommand(args, { memoryBudgetMiB = 900 } = {}) {
  const startedAt = Date.now();
  const child = spawn(process.execPath, args, {
    cwd: apiDir,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let peakRssKiB = 0;
  let outputTail = '';
  const capture = chunk => {
    const text = chunk.toString();
    outputTail = (outputTail + text).slice(-8192);
    return text;
  };
  child.stdout.on('data', chunk => process.stdout.write(capture(chunk)));
  child.stderr.on('data', chunk => process.stderr.write(capture(chunk)));
  const sampler = setInterval(async () => {
    peakRssKiB = Math.max(peakRssKiB, await sampleRssKiB(child.pid));
  }, 50);
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  clearInterval(sampler);
  peakRssKiB = Math.max(peakRssKiB, await sampleRssKiB(child.pid));
  const result = { args, durationMs: Date.now() - startedAt, peakRssKiB, exitCode };
  if (exitCode !== 0) throw new Error(`Data command failed with exit ${exitCode}: node ${args.join(' ')}\n${outputTail}`);
  if (peakRssKiB > memoryBudgetMiB * 1024) {
    throw new Error(`Data command exceeded its ${memoryBudgetMiB} MiB RSS budget: node ${args.join(' ')} used ${Math.ceil(peakRssKiB / 1024)} MiB.`);
  }
  return result;
}

async function writeCheckpoint(client, operation, releaseSha, results) {
  const databaseStateSha256 = await databaseStateDigest(client, operation);
  await client.query(
    `INSERT INTO deployment_data_operation_checkpoints (
       operation_key, input_sha256, database_state_sha256, release_sha,
       output_summary, completed_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
     ON CONFLICT (operation_key) DO UPDATE SET
       input_sha256 = EXCLUDED.input_sha256,
       database_state_sha256 = EXCLUDED.database_state_sha256,
       release_sha = EXCLUDED.release_sha,
       output_summary = EXCLUDED.output_summary,
       completed_at = NOW(),
       updated_at = NOW()`,
    [operation.key, operation.digest, databaseStateSha256, releaseSha, JSON.stringify({ commands: results })],
  );
}

export async function executeOperationPlan({
  client,
  operations,
  releaseSha,
  memoryBudgetMiB = 900,
  commandRunner = runNodeCommand,
  checkpointWriter = writeCheckpoint,
  failAfter = null,
}) {
  const completed = [];
  for (const operation of operations.filter(item => item.action === 'apply')) {
    const results = [];
    const execution = operation.execution ?? [
      ...(operation.preview ?? []).map(command => ({ phase: 'preview', command })),
      ...(operation.apply ?? []).map(command => ({ phase: 'apply', command })),
    ];
    let applyMarkerWritten = false;
    console.log(`KITABU_DATA_OPERATION_PREFLIGHT:${operation.key}`);
    for (const [stepIndex, step] of execution.entries()) {
      if (step.phase === 'apply' && !applyMarkerWritten) {
        console.log(`KITABU_DATA_OPERATION_APPLY:${operation.key}`);
        applyMarkerWritten = true;
      }
      console.log(`KITABU_DATA_OPERATION_STEP:${operation.key}:${step.phase}:${stepIndex + 1}:${path.basename(step.command[0])}`);
      results.push({ phase: step.phase, ...await commandRunner(step.command, { memoryBudgetMiB }) });
    }
    await checkpointWriter(client, operation, releaseSha, results);
    completed.push(operation.key);
    const peakRssKiB = Math.max(0, ...results.map(result => result.peakRssKiB ?? 0));
    console.log(`KITABU_DATA_OPERATION_COMPLETE:${operation.key}:peak_rss_mib=${Math.ceil(peakRssKiB / 1024)}`);
    if (failAfter !== null && completed.length >= failAfter) {
      throw new Error(`Injected failure after ${completed.length} completed data operations.`);
    }
  }
  return completed;
}

function parseArgs(argv) {
  const options = { mode: 'plan', forceKeys: new Set(), failAfter: null, requireNoMutations: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--plan') options.mode = 'plan';
    else if (value === '--apply') options.mode = 'apply';
    else if (value === '--force-operation') options.forceKeys.add(argv[++index]);
    else if (value === '--fail-after') options.failAfter = Number(argv[++index]);
    else if (value === '--require-no-mutations') options.requireNoMutations = true;
    else throw new Error(`Unknown option: ${value}`);
  }
  return options;
}

function publicPlan(plan) {
  return {
    schema: plan.schema,
    pendingMigrations: plan.pendingMigrations,
    operations: plan.operations,
    mutatesData: plan.mutatesData,
  };
}

export async function main(argv = process.argv.slice(2)) {
  if (!process.env.KITABU_DATABASE_URL) throw new Error('KITABU_DATABASE_URL is required.');
  const options = parseArgs(argv);
  const releaseSha = process.env.KITABU_RELEASE_SHA ?? 'local-uncommitted';
  const memoryBudgetMiB = Number(process.env.KITABU_DATA_OPERATION_MEMORY_BUDGET_MIB ?? 900);
  const pool = new Pool({ connectionString: process.env.KITABU_DATABASE_URL });
  const client = await pool.connect();
  try {
    const plan = await buildPlan(client, options);
    console.log(`KITABU_DATA_PLAN:${canonicalJson(publicPlan(plan))}`);
    if (options.mode === 'plan') return publicPlan(plan);
    if (plan.pendingMigrations.length > 0) {
      throw new Error(`Apply pending migrations before data operations: ${plan.pendingMigrations.join(', ')}`);
    }
    if (options.requireNoMutations && plan.resolvedOperations.some(operation => operation.action === 'apply')) {
      throw new Error('Database state changed after the read-only deployment plan; refusing an unbacked data mutation. Re-plan and establish a recovery point.');
    }
    const checkpointTable = await client.query(
      `SELECT to_regclass('public.deployment_data_operation_checkpoints') IS NOT NULL AS present`,
    );
    if (!checkpointTable.rows[0]?.present) throw new Error('Deployment checkpoint migration is not applied.');
    const completed = await executeOperationPlan({
      client,
      operations: plan.resolvedOperations,
      releaseSha,
      memoryBudgetMiB,
      failAfter: options.failAfter,
    });
    if (completed.length === 0) console.log('KITABU_DATA_OPERATIONS_SKIPPED');
    return { ...publicPlan(plan), completed };
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
