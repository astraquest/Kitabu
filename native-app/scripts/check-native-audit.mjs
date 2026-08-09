import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const AUDIT_ARGS = ['audit', '--omit=dev', '--omit=optional', '--audit-level=high', '--json'];
const ADVISORY_URL_PATTERN = /^https:\/\/github\.com\/advisories\/GHSA-[a-z0-9-]+$/i;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string`);
}

function assertAdvisoryUrl(value, label) {
  assertNonEmptyString(value, label);
  if (!ADVISORY_URL_PATTERN.test(value)) throw new Error(`${label} must be a GitHub advisory URL`);
}

function parseDate(value, label) {
  assertNonEmptyString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a valid date`);
  }
  return parsed;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function findingKey(packageName, advisory) {
  return `${packageName}|${advisory}`;
}

function validateBaseline(baseline, today = new Date().toISOString().slice(0, 10)) {
  if (!isRecord(baseline) || baseline.schemaVersion !== 1) throw new Error('baseline schemaVersion must be 1');
  const todayDate = parseDate(today, 'today');
  const expiryDate = parseDate(baseline.expiresOn, 'baseline expiresOn');
  if (expiryDate <= todayDate) throw new Error(`baseline expired on ${baseline.expiresOn}`);
  if (expiryDate > addDays(todayDate, 14)) throw new Error('baseline expiry exceeds the 14-day maximum');
  assertNonEmptyString(baseline.owner, 'baseline owner');
  assertNonEmptyString(baseline.reason, 'baseline reason');
  assertNonEmptyString(baseline.remediation, 'baseline remediation');
  if (!Array.isArray(baseline.findings) || baseline.findings.length === 0) {
    throw new Error('baseline findings must be a non-empty array');
  }

  const keys = new Set();
  for (const [index, finding] of baseline.findings.entries()) {
    if (!isRecord(finding)) throw new Error(`baseline finding ${index} must be an object`);
    assertNonEmptyString(finding.package, `baseline finding ${index} package`);
    if (!Array.isArray(finding.advisories) || finding.advisories.length === 0) {
      throw new Error(`baseline finding ${index} advisories must be a non-empty array`);
    }
    for (const [advisoryIndex, advisory] of finding.advisories.entries()) {
      assertAdvisoryUrl(advisory, `baseline finding ${index} advisory ${advisoryIndex}`);
      const key = findingKey(finding.package, advisory);
      if (keys.has(key)) throw new Error(`baseline contains duplicate finding ${key}`);
      keys.add(key);
    }
  }
  return keys;
}

function resolveAdvisories(packageName, vulnerabilities, active = new Set()) {
  if (active.has(packageName)) return [];
  const vulnerability = vulnerabilities[packageName];
  if (!isRecord(vulnerability) || !Array.isArray(vulnerability.via)) {
    throw new Error(`audit report is missing via data for ${packageName}`);
  }
  const nextActive = new Set(active).add(packageName);
  const advisories = new Set();
  for (const via of vulnerability.via) {
    if (typeof via === 'string') {
      for (const advisory of resolveAdvisories(via, vulnerabilities, nextActive)) advisories.add(advisory);
      continue;
    }
    if (!isRecord(via) || typeof via.url !== 'string' || !ADVISORY_URL_PATTERN.test(via.url)) {
      throw new Error(`audit report contains malformed advisory data for ${packageName}`);
    }
    advisories.add(via.url);
  }
  return [...advisories].sort();
}

export function extractHighFindings(report) {
  if (!isRecord(report) || report.auditReportVersion !== 2 || !isRecord(report.vulnerabilities)) {
    throw new Error('audit output is not a valid npm audit v2 report');
  }
  const findings = [];
  const highPackages = [];
  const criticalPackages = [];
  for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities)) {
    if (!isRecord(vulnerability)) throw new Error(`audit report entry for ${packageName} is malformed`);
    if (vulnerability.severity === 'critical') criticalPackages.push(packageName);
    if (vulnerability.severity !== 'high') continue;
    highPackages.push(packageName);
    for (const advisory of resolveAdvisories(packageName, report.vulnerabilities)) {
      findings.push({ package: packageName, advisory });
    }
  }
  if (findings.length === 0 && highPackages.length > 0) {
    throw new Error('audit report high findings have no advisory URLs');
  }
  return { findings, highPackages: highPackages.sort(), criticalPackages: criticalPackages.sort() };
}

export function compareAuditToBaseline(report, baseline, today) {
  const expectedKeys = validateBaseline(baseline, today);
  const actual = extractHighFindings(report);
  if (actual.criticalPackages.length > 0) {
    throw new Error(`critical findings are not allowed: ${actual.criticalPackages.join(', ')}`);
  }
  const actualKeys = new Set(actual.findings.map(finding => findingKey(finding.package, finding.advisory)));
  const unexpected = [...actualKeys].filter(key => !expectedKeys.has(key)).sort();
  const missing = [...expectedKeys].filter(key => !actualKeys.has(key)).sort();
  if (unexpected.length > 0 || missing.length > 0) {
    const details = [];
    if (unexpected.length > 0) details.push(`unexpected: ${unexpected.join(', ')}`);
    if (missing.length > 0) details.push(`missing: ${missing.join(', ')}`);
    throw new Error(`native audit baseline mismatch (${details.join('; ')})`);
  }
  return {
    highPackagePaths: actual.highPackages.length,
    packageAdvisoryKeys: actualKeys.size,
    criticalFindings: actual.criticalPackages.length
  };
}

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function runAudit() {
  const isWindows = process.platform === 'win32';
  const npmCommand = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
  const npmArgs = isWindows
    ? ['/d', '/s', '/c', `npm.cmd ${AUDIT_ARGS.join(' ')}`]
    : AUDIT_ARGS;
  const result = spawnSync(npmCommand, npmArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  if (result.error) throw new Error(`npm audit could not run: ${result.error.message}`);
  const output = result.stdout?.trim() ?? '';
  if (output === '') throw new Error('npm audit returned no JSON output');
  return readJsonFromString(output, 'npm audit output');
}

function readJsonFromString(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function main() {
  const baselinePath = path.join(process.cwd(), 'security', 'audit-baseline.json');
  const baseline = readJson(baselinePath, 'native audit baseline');
  const report = runAudit();
  const summary = compareAuditToBaseline(report, baseline);
  console.log(`Native dependency audit baseline passed: ${summary.highPackagePaths} high package paths, ${summary.packageAdvisoryKeys} allowed package/advisory keys, ${summary.criticalFindings} critical.`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(`Native dependency audit baseline failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

export const __test = { validateBaseline, resolveAdvisories, findingKey };
