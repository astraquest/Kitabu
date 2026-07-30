import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.KITABU_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('KITABU_DATABASE_URL or DATABASE_URL is required');
}

const schema = `m069_ci_${process.pid}_${Date.now()}`;
const client = new Client({ connectionString });
await client.connect();
try {
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET search_path TO "${schema}"`);
  await client.query(`CREATE TABLE totp_credentials (id uuid PRIMARY KEY, secret text NOT NULL)`);
  const migration = await readFile(new URL('../sql/069_secure_totp_enrollment.sql', import.meta.url), 'utf8');
  await client.query(migration);
  const { rows } = await client.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'totp_credentials' AND column_name = 'pending_secret'`,
    [schema],
  );
  assert.equal(rows.length, 1, 'migration 069 must add pending_secret');
  assert.equal(rows[0].data_type, 'text');
  console.log(JSON.stringify({ status: 'ok', migration: '069_secure_totp_enrollment.sql', schema }));
} finally {
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.end();
}
