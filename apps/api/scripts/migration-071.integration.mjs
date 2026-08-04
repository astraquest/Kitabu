import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.KITABU_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('KITABU_DATABASE_URL or DATABASE_URL is required');
}

const migration = await readFile(new URL('../sql/071_consolidate_demo_account.sql', import.meta.url), 'utf8');
const legacyEmails = [
  'student@kitabu.ai',
  'teacher@kitabu.ai',
  'parent@kitabu.ai',
  'demostudent@kitabu.ai',
  'demoteacher@kitabu.ai',
  'demoparent@kitabu.ai',
];
const canonicalEmail = 'demoaccount@kitabu.ai';
const canonicalId = '20000000-0000-0000-0000-000000000001';
const planId = '30000000-0000-0000-0000-000000000001';
const canonicalSubscriptionId = '40000000-0000-0000-0000-000000000001';
const legacySubscriptionIds = legacyEmails.map((_, index) => `40000000-0000-0000-0000-0000000001${String(index + 1).padStart(2, '0')}`);
const nonActiveSubscriptionIds = [
  '40000000-0000-0000-0000-000000000201',
  '40000000-0000-0000-0000-000000000202',
];

const setupSql = `
  CREATE TYPE user_role AS ENUM ('student', 'teacher', 'school_admin', 'platform_admin', 'parent');
  CREATE TYPE billing_cycle AS ENUM ('weekly', 'monthly', 'annual');

  CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    PRIMARY KEY (user_id, role)
  );
  CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    billing_cycle billing_cycle NOT NULL,
    price_ksh_cents BIGINT NOT NULL,
    is_pro BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    billing_cycle billing_cycle NOT NULL,
    price_ksh_cents BIGINT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX uq_subscriptions_one_active_per_user
    ON subscriptions (user_id)
    WHERE status = 'active';

  CREATE TABLE user_billing_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE totp_credentials (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE learner_subject_display_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE user_auth_identities (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_subject TEXT NOT NULL
  );
  CREATE TABLE classes (id UUID PRIMARY KEY);
  CREATE TABLE class_teachers (
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (class_id, teacher_id)
  );
  CREATE TABLE class_students (
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (class_id, student_id)
  );
  CREATE TABLE account_deletion_requests (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fulfilled_at TIMESTAMPTZ
  );
  CREATE TABLE chess_matches (
    id UUID PRIMARY KEY,
    challenger_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE parent_students (
    parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_user_id, student_user_id)
  );
`;

function databaseUrl(databaseUrl, databaseName) {
  const parsed = new URL(databaseUrl);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

async function runScenario({ canonicalActive }) {
  const databaseName = `kitabu_m071_${process.pid}_${Date.now()}_${canonicalActive ? 'canonical' : 'legacy'}`;
  const adminClient = new Client({ connectionString: databaseUrl(connectionString, 'postgres') });
  let databaseCreated = false;
  let client;

  try {
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
    databaseCreated = true;

    client = new Client({ connectionString: databaseUrl(connectionString, databaseName) });
    await client.connect();
    await client.query(setupSql);

    const users = [
      [canonicalId, canonicalEmail, 'Canonical Demo Account', new Date('2026-01-01T00:00:00Z')],
      ...legacyEmails.map((email, index) => [
        `21000000-0000-0000-0000-00000000000${index + 1}`,
        email,
        `Legacy Demo ${index + 1}`,
        new Date(`2026-01-0${index + 2}T00:00:00Z`),
      ]),
    ];
    for (const [id, email, fullName, createdAt] of users) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, created_at, updated_at)
         VALUES ($1, $2, 'test-hash', $3, $4, $4)`,
        [id, email, fullName, createdAt],
      );
    }
    await client.query(
      `INSERT INTO subscription_plans (id, code, name, billing_cycle, price_ksh_cents)
       VALUES ($1, 'weekly', 'Weekly', 'weekly', 10000)`,
      [planId],
    );

    const subscriptions = [];
    if (canonicalActive) {
      subscriptions.push([canonicalSubscriptionId, canonicalId, 'active', new Date('2026-01-01T00:00:00Z')]);
    }
    subscriptions.push(
      ...legacySubscriptionIds.map((id, index) => [
        id,
        users[index + 1][0],
        'active',
        new Date(`2026-02-0${index + 1}T00:00:00Z`),
      ]),
      [nonActiveSubscriptionIds[0], canonicalId, 'cancelled', new Date('2025-12-01T00:00:00Z')],
      [nonActiveSubscriptionIds[1], users[1][0], 'expired', new Date('2025-12-02T00:00:00Z')],
    );
    for (const [id, userId, status, createdAt] of subscriptions) {
      await client.query(
        `INSERT INTO subscriptions
          (id, user_id, plan_id, billing_cycle, price_ksh_cents, period_start, period_end, status, created_at)
         VALUES ($1, $2, $3, 'weekly', 10000, $4::timestamptz, $4::timestamptz + INTERVAL '7 days', $5, $4::timestamptz)`,
        [id, userId, planId, createdAt, status],
      );
    }

    const before = await client.query(
      `SELECT id, user_id, status FROM subscriptions
       WHERE user_id IN (SELECT id FROM users WHERE lower(email) = ANY($1::text[]))
       ORDER BY id`,
      [[canonicalEmail, ...legacyEmails]],
    );
    await client.query(migration);

    const after = await client.query(
      `SELECT id, user_id, status FROM subscriptions ORDER BY id`,
    );
    const canonical = await client.query(
      `SELECT id FROM users WHERE lower(email) = $1`,
      [canonicalEmail],
    );
    const legacy = await client.query(
      `SELECT COUNT(*)::int AS count FROM users WHERE lower(email) = ANY($1::text[])`,
      [legacyEmails],
    );
    const active = await client.query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND status = 'active'`,
      [canonicalId],
    );
    const index = await client.query(
      `SELECT pg_get_expr(indpred, indrelid) AS predicate
       FROM pg_index
       WHERE indexrelid = 'uq_subscriptions_one_active_per_user'::regclass`,
    );

    assert.equal(canonical.rows.length, 1);
    assert.equal(canonical.rows[0].id, canonicalId);
    assert.equal(legacy.rows[0].count, 0);
    assert.equal(after.rows.length, before.rows.length, 'subscription rows must be preserved');
    assert.deepEqual(after.rows.map(row => row.id), before.rows.map(row => row.id));
    assert.equal(active.rows.length, 1);
    assert.equal(active.rows[0].id, canonicalActive ? canonicalSubscriptionId : legacySubscriptionIds[0]);
    assert.ok(after.rows.every(row => row.user_id === canonicalId), 'all demo subscriptions must be canonical');
    assert.ok(index.rows.length === 1 && index.rows[0].predicate.includes('status'), 'partial active index must remain');

    const duplicateStatuses = await client.query(
      `SELECT status FROM subscriptions WHERE id = ANY($1::uuid[]) ORDER BY id`,
      [canonicalActive ? legacySubscriptionIds : legacySubscriptionIds.slice(1)],
    );
    assert.ok(duplicateStatuses.rows.every(row => row.status === 'cancelled'));

    return { canonicalActive, subscriptions: after.rows.length, survivor: active.rows[0].id };
  } finally {
    await client?.end().catch(() => {});
    if (databaseCreated) {
      await adminClient.query(`DROP DATABASE "${databaseName}"`);
    }
    await adminClient.end().catch(() => {});
  }
}

const results = [
  await runScenario({ canonicalActive: true }),
  await runScenario({ canonicalActive: false }),
];
console.log(JSON.stringify({ status: 'ok', migration: '071_consolidate_demo_account.sql', scenarios: results }));
