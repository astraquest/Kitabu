import { config as loadEnv } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

loadEnv({ path: new URL('../.env', import.meta.url) });

if (!process.env.KITABU_DEEPSEEK_API_KEY?.trim() && process.env.DEEPSEEK_API_KEY?.trim()) {
  process.env.KITABU_DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
}

const requiredEnv = [
  'KITABU_DATABASE_URL',
  'KITABU_OPENAI_API_KEY'
];

const warnings = [];
const failures = [];
const supportedGrades = ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Form 3', 'Form 4'];
const canonicalGrades = ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

function isLocalDatabaseUrl(databaseUrl) {
  try {
    const host = new URL(databaseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === 'postgres';
  } catch {
    return false;
  }
}

function loadDatabaseCa() {
  const candidates = [
    path.resolve(process.cwd(), 'certs', 'supabase-root-2021-ca.pem'),
    path.resolve(process.cwd(), 'apps', 'api', 'certs', 'supabase-root-2021-ca.pem'),
    fileURLToPath(new URL('../certs/supabase-root-2021-ca.pem', import.meta.url))
  ];

  const certPath = candidates.find(candidate => existsSync(candidate));
  return certPath ? readFileSync(certPath, 'utf8') : undefined;
}

function databaseConnectionString(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
      parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

function databaseSslOptions(databaseUrl) {
  const sslMode = process.env.KITABU_DATABASE_SSL_MODE?.trim() || 'auto';

  if (sslMode === 'disable') {
    return undefined;
  }

  if (sslMode === 'require') {
    return { rejectUnauthorized: false };
  }

  if (sslMode === 'verify-full') {
    return {
      ca: loadDatabaseCa(),
      rejectUnauthorized: true
    };
  }

  return isLocalDatabaseUrl(databaseUrl)
    ? undefined
    : {
        ca: loadDatabaseCa(),
        rejectUnauthorized: true
      };
}

function hasValue(name) {
  return Boolean(process.env[name]?.trim());
}

function validateProductionUrl(name, fallback, expectedOrigin, expectedPath) {
  const rawValue = process.env[name]?.trim() || fallback;
  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    failures.push(`${name} must be a valid URL`);
    return;
  }

  if (parsed.protocol !== 'https:') {
    failures.push(`${name} must use https`);
  }

  if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    failures.push(`${name} points to ${parsed.hostname}; production must use deployed public links`);
  }

  if (parsed.origin !== expectedOrigin || parsed.pathname !== expectedPath) {
    failures.push(`${name} must be ${expectedOrigin}${expectedPath}`);
  }
}

for (const name of requiredEnv) {
  if (!hasValue(name)) {
    failures.push(`${name} is not set`);
  }
}

if (!hasValue('KITABU_DEEPSEEK_API_KEY') && !hasValue('KITABU_NVIDIA_API_KEY')) {
  failures.push('Set KITABU_DEEPSEEK_API_KEY or KITABU_NVIDIA_API_KEY for DeepSeek v4 flash fallback');
}

validateProductionUrl(
  'KITABU_PASSWORD_RESET_URL',
  'https://app.kitabu.ai/reset-password',
  'https://app.kitabu.ai',
  '/reset-password'
);
validateProductionUrl(
  'KITABU_EMAIL_VERIFICATION_URL',
  'https://app.kitabu.ai/verify-email',
  'https://app.kitabu.ai',
  '/verify-email'
);

let databaseHost = null;
if (hasValue('KITABU_DATABASE_URL')) {
  try {
    databaseHost = new URL(process.env.KITABU_DATABASE_URL).hostname;
    if (['localhost', '127.0.0.1'].includes(databaseHost)) {
      failures.push(`KITABU_DATABASE_URL points to ${databaseHost}; production must use the Docker service host or a managed database host`);
    }
  } catch {
    failures.push('KITABU_DATABASE_URL is not a valid URL');
  }
}

const smsProvider = process.env.KITABU_SMS_PROVIDER?.trim() || 'none';
if (smsProvider !== 'africastalking') {
  warnings.push('KITABU_SMS_PROVIDER is not africastalking; production phone OTP will not send SMS');
} else {
  for (const name of ['KITABU_AFRICASTALKING_USERNAME', 'KITABU_AFRICASTALKING_API_KEY']) {
    if (!hasValue(name)) {
      failures.push(`${name} is required when KITABU_SMS_PROVIDER=africastalking`);
    }
  }
}

if (hasValue('KITABU_DATABASE_URL')) {
  const pool = new Pool({
    connectionString: databaseConnectionString(process.env.KITABU_DATABASE_URL),
    ssl: databaseSslOptions(process.env.KITABU_DATABASE_URL)
  });
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users u
         JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'student'
         WHERE u.email ~ '^(grade[0-9]+|form[34])\.student[1-5]@students\.kitabu\.ai$') AS seeded_students,
        (SELECT COUNT(*)::int FROM class_students cs
         JOIN users u ON u.id = cs.student_id
         WHERE u.email ~ '^(grade[0-9]+|form[34])\.student[1-5]@students\.kitabu\.ai$') AS rostered_seeded_students,
        (SELECT COUNT(*)::int FROM schools
         WHERE slug IN ('kitabu-demo-school', 'kisii-demo-school', 'mombasa-demo-school', 'smoke-test-school')) AS demo_schools,
        (SELECT COUNT(*)::int FROM assignments
         WHERE description = 'Seeded assignment for production portal testing.') AS demo_assignments,
        (SELECT COUNT(*)::int FROM curriculum_strands
         WHERE grade_level = ANY($1)) AS curriculum_strands,
        (SELECT COUNT(*)::int FROM curriculum_sub_strands css
         JOIN curriculum_strands cs ON cs.id = css.strand_id
         WHERE cs.grade_level = ANY($1)) AS curriculum_sub_strands,
        (SELECT COUNT(*)::int FROM curriculum_grade_subject_identities
         WHERE grade_level = ANY($2)) AS canonical_subjects,
        (SELECT COUNT(*)::int FROM curriculum_canonical_strands
         WHERE grade_level = ANY($2) AND is_active = TRUE) AS canonical_strands,
        (SELECT COUNT(*)::int FROM curriculum_topics
         WHERE grade_level = ANY($2) AND is_active = TRUE) AS canonical_topics,
        (SELECT COUNT(*)::int FROM (
           SELECT grade_level, subject_code, canonical_key
           FROM curriculum_topics
           WHERE grade_level = ANY($2) AND is_active = TRUE
           GROUP BY grade_level, subject_code, canonical_key
           HAVING COUNT(*) > 1
         ) duplicates) AS duplicate_canonical_topics,
        (SELECT COUNT(*)::int FROM quiz_bank_questions) AS quiz_bank_questions
    `, [supportedGrades, canonicalGrades]);
    const row = result.rows[0];
    const expectedExact = {
      seeded_students: 0,
      rostered_seeded_students: 0,
      demo_schools: 0,
      demo_assignments: 0,
      canonical_subjects: 209,
      canonical_strands: 833,
      canonical_topics: 4341,
      duplicate_canonical_topics: 0
    };
    const expectedMinimum = {
      curriculum_strands: 162,
      curriculum_sub_strands: 810,
      quiz_bank_questions: 900
    };

    for (const [key, expected] of Object.entries(expectedExact)) {
      if (Number(row[key] ?? 0) !== expected) {
        failures.push(`${key} is ${row[key] ?? 0}, expected exactly ${expected}`);
      }
    }

    for (const [key, minimum] of Object.entries(expectedMinimum)) {
      if (Number(row[key] ?? 0) < minimum) {
        failures.push(`${key} is ${row[key] ?? 0}, expected at least ${minimum}`);
      }
    }

    console.log(JSON.stringify({
      databaseHost,
      smsProvider,
      counts: row,
      warnings,
      failures
    }, null, 2));
  } catch (error) {
    failures.push(`database readiness query failed: ${error instanceof Error ? error.message : String(error)}`);
    console.log(JSON.stringify({ databaseHost, smsProvider, warnings, failures }, null, 2));
  } finally {
    await pool.end().catch(() => {});
  }
} else {
  console.log(JSON.stringify({ databaseHost, smsProvider, warnings, failures }, null, 2));
}

if (failures.length > 0) {
  process.exitCode = 1;
}
