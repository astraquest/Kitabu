import { config as loadEnv } from 'dotenv';
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

function hasValue(name) {
  return Boolean(process.env[name]?.trim());
}

for (const name of requiredEnv) {
  if (!hasValue(name)) {
    failures.push(`${name} is not set`);
  }
}

if (!hasValue('KITABU_DEEPSEEK_API_KEY') && !hasValue('KITABU_NVIDIA_API_KEY')) {
  failures.push('Set KITABU_DEEPSEEK_API_KEY or KITABU_NVIDIA_API_KEY for DeepSeek v4 flash fallback');
}

let databaseHost = null;
if (hasValue('KITABU_DATABASE_URL')) {
  try {
    databaseHost = new URL(process.env.KITABU_DATABASE_URL).hostname;
    if (!/supabase|pooler|supavisor/i.test(databaseHost)) {
      failures.push(`KITABU_DATABASE_URL points to ${databaseHost}, not a Supabase host`);
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
  const pool = new Pool({ connectionString: process.env.KITABU_DATABASE_URL });
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users u
         JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'student'
         WHERE u.email LIKE 'grade%.student%@students.kitabu.ai'
            OR u.email LIKE 'form4.student%@students.kitabu.ai') AS seeded_students,
        (SELECT COUNT(*)::int FROM class_students cs
         JOIN classes c ON c.id = cs.class_id
         WHERE c.grade_level IN ('Grade 4', 'Grade 6', 'Grade 9', 'Form 4')) AS rostered_students,
        (SELECT COUNT(*)::int FROM curriculum_strands
         WHERE grade_level IN ('Grade 4', 'Grade 6', 'Grade 9', 'Form 4')) AS curriculum_strands,
        (SELECT COUNT(*)::int FROM curriculum_sub_strands css
         JOIN curriculum_strands cs ON cs.id = css.strand_id
         WHERE cs.grade_level IN ('Grade 4', 'Grade 6', 'Grade 9', 'Form 4')) AS curriculum_sub_strands,
        (SELECT COUNT(*)::int FROM quiz_bank_questions) AS quiz_bank_questions
    `);
    const row = result.rows[0];
    const expected = {
      seeded_students: 20,
      rostered_students: 20,
      curriculum_strands: 72,
      curriculum_sub_strands: 360,
      quiz_bank_questions: 400
    };

    for (const [key, minimum] of Object.entries(expected)) {
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
