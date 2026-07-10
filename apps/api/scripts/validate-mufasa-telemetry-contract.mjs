import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const schema = JSON.parse(readFileSync(resolve(process.cwd(), '../../contracts/kitabu-telemetry.v1.json'), 'utf8'));
assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.additionalProperties, false);
assert.deepEqual(schema.required, ['contract', 'event_id', 'ts', 'type', 'payload']);
assert.equal(schema.properties.contract.const, 'kitabu-telemetry/v1');
for (const type of ['payment.succeeded', 'payment.failed', 'subscription.renewed', 'subscription.lapsed', 'usage.session']) {
  assert(schema.properties.type.enum.includes(type), `missing telemetry event type: ${type}`);
}
console.log(JSON.stringify({ ok: true, contract: schema.properties.contract.const, eventTypes: schema.properties.type.enum.length }));
