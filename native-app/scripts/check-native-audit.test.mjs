import assert from 'node:assert/strict';
import test from 'node:test';
import { compareAuditToBaseline } from './check-native-audit.mjs';

const imageSizeAdvisory = 'https://github.com/advisories/GHSA-w3rx-r6r6-pgpr';
const secondImageSizeAdvisory = 'https://github.com/advisories/GHSA-5p2g-fcmc-qvqq';
const jsYamlAdvisory = 'https://github.com/advisories/GHSA-5p4m-2wfm-xmqj';

const baseline = {
  schemaVersion: 1,
  expiresOn: '2026-08-22',
  owner: 'Test owner',
  reason: 'Fixture only',
  remediation: 'KITABU-TEST-1: replace fixture advisories',
  findings: [
    { package: '@expo/metro', advisories: [imageSizeAdvisory, secondImageSizeAdvisory] },
    { package: 'image-size', advisories: [imageSizeAdvisory, secondImageSizeAdvisory] },
    { package: 'js-yaml', advisories: [jsYamlAdvisory] }
  ]
};

function makeReport() {
  return {
    auditReportVersion: 2,
    vulnerabilities: {
      '@expo/metro': { severity: 'high', via: ['image-size'] },
      'image-size': {
        severity: 'high',
        via: [
          { name: 'image-size', url: imageSizeAdvisory },
          { name: 'image-size', url: secondImageSizeAdvisory }
        ]
      },
      'js-yaml': { severity: 'high', via: [{ name: 'js-yaml', url: jsYamlAdvisory }] }
    },
    metadata: { vulnerabilities: { high: 3, critical: 0 } }
  };
}

test('accepts the exact fixture advisory and transitive package paths', () => {
  assert.deepEqual(compareAuditToBaseline(makeReport(), baseline, '2026-08-09'), {
    highPackagePaths: 3,
    packageAdvisoryKeys: 5,
    criticalFindings: 0
  });
});

test('rejects an expired baseline', () => {
  assert.throws(
    () => compareAuditToBaseline(makeReport(), { ...baseline, expiresOn: '2026-08-08' }, '2026-08-09'),
    /baseline expired/
  );
});

test('rejects an unexpected package or advisory', () => {
  const changedReport = makeReport();
  changedReport.vulnerabilities.nanoid = {
    severity: 'high',
    via: [{ name: 'nanoid', url: 'https://github.com/advisories/GHSA-2v37-7h3g-55p8' }]
  };
  changedReport.metadata.vulnerabilities.high = 4;
  assert.throws(
    () => compareAuditToBaseline(changedReport, baseline, '2026-08-09'),
    /native audit baseline mismatch.*unexpected/
  );
});

test('rejects critical findings even when the package is baselined', () => {
  const criticalReport = makeReport();
  criticalReport.vulnerabilities['image-size'].severity = 'critical';
  criticalReport.metadata.vulnerabilities.high = 2;
  criticalReport.metadata.vulnerabilities.critical = 1;
  assert.throws(
    () => compareAuditToBaseline(criticalReport, baseline, '2026-08-09'),
    /critical findings are not allowed/
  );
});
