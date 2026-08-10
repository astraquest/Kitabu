import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const repositoryRoot = path.resolve(import.meta.dirname, '..', '..', '..', '..');

test('Compose one-off commands used by the SSH deployment cannot consume its script', async () => {
  const backup = await readFile(path.join(repositoryRoot, 'infra', 'backup.sh'), 'utf8');
  const workflow = await readFile(path.join(repositoryRoot, '.github', 'workflows', 'deploy-api.yml'), 'utf8');

  assert.match(
    backup,
    /docker compose exec -T postgres pg_dump[^\n]+<\/dev\/null \| gzip/,
    'backup pg_dump must close stdin before it is called from an SSH heredoc',
  );
  assert.match(workflow, /run-data-operations\.mjs --plan <\/dev\/null/);
  assert.match(workflow, /apply-migrations\.mjs <\/dev\/null/);
  assert.match(workflow, /run-data-operations\.mjs --apply \$data_apply_guard <\/dev\/null/);
  assert.match(workflow, /NODE_OPTIONS=--max-old-space-size=640/);
  assert.match(workflow, /verify-production-readiness\.mjs <\/dev\/null/);
  assert.match(workflow, /docker compose exec -T caddy caddy reload[^\n]+<\/dev\/null/);
  assert.doesNotMatch(
    workflow,
    /(?:curl|printf)[^\n]*\|\s*grep\s+-q/,
    'deployment smoke checks must not let grep -q close a producer pipe under pipefail',
  );
});

test('deployment preserves server-local educational assets', async () => {
  const workflow = await readFile(path.join(repositoryRoot, '.github', 'workflows', 'deploy-api.yml'), 'utf8');
  assert.equal(
    (workflow.match(/--exclude 'apps\/api\/var\/educational-assets\/'/g) ?? []).length,
    2,
    'both release-staging and production activation rsync commands must preserve runtime educational assets',
  );
});
