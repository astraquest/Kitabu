import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(packageRoot, relativePath), 'utf8')) as unknown;
}

function sceneProps(relativePath: string): unknown {
  const scene = readJson(relativePath) as { props?: unknown };
  assert.ok(scene.props, `${relativePath} must contain props`);
  return scene.props;
}

function compile(relativePath: string): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  addFormats(ajv);
  return ajv.compile(readJson(relativePath));
}

function formatErrors(validate: ValidateFunction): string {
  return (validate.errors ?? [])
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
    .join('; ');
}

const structuredResponse = compile(
  'schemas/interactive-learning/props/structured-response.schema.json',
);
const rankedList = compile(
  'schemas/interactive-learning/props/classify-sort-match-rank.schema.json',
);

test('Grade 6 structured-response scene props satisfy their component schema', () => {
  const props = sceneProps('fixtures/grade-6/whole-numbers-structured-response.scene.json');
  assert.equal(structuredResponse(props), true, formatErrors(structuredResponse));
});

test('Grade 6 ranked-list scene props satisfy their component schema', () => {
  const props = sceneProps('fixtures/grade-6/whole-numbers-rank.scene.json');
  assert.equal(rankedList(props), true, formatErrors(rankedList));
});

test('structured-response rejects answer keys and grading configuration in learner props', () => {
  const validProps = sceneProps(
    'fixtures/grade-6/whole-numbers-structured-response.scene.json',
  ) as object;
  const props = {
    ...validProps,
    answer: 700_000,
  };

  assert.equal(structuredResponse(props), false);
  assert.ok(structuredResponse.errors?.some((error) => error.keyword === 'additionalProperties'));
  assert.equal(
    structuredResponse({
      ...validProps,
      graderRef: { graderId: 'sealed-numeric-answer', graderVersion: '1.0.0' },
    }),
    false,
  );
});

test('structured-response rejects unsupported modes and missing input labels', () => {
  const props = sceneProps('fixtures/grade-6/whole-numbers-structured-response.scene.json') as Record<
    string,
    unknown
  >;

  assert.equal(structuredResponse({ ...props, mode: 'numeric-with-explanation' }), false);
  assert.equal(structuredResponse({ ...props, accessibility: {} }), false);
});

test('ranked-list rejects grader details, embedded answer keys, and out-of-scope values', () => {
  const props = sceneProps('fixtures/grade-6/whole-numbers-rank.scene.json') as Record<string, unknown>;
  const items = props.items as Array<Record<string, unknown>>;

  assert.equal(
    rankedList({
      ...props,
      orderingRules: { direction: 'ascending', expectedItemIds: items.map((item) => item.id) },
    }),
    false,
  );
  assert.equal(rankedList({ ...props, graderRef: 'ordered-item-ids' }), false);
  assert.equal(
    rankedList({ ...props, items: [{ ...items[0], value: 100_001 }, ...items.slice(1)] }),
    false,
  );
});

test('ranked-list requires a non-drag keyboard interaction path', () => {
  const props = sceneProps('fixtures/grade-6/whole-numbers-rank.scene.json') as Record<string, unknown>;
  const { keyboardMoveModel: _omitted, ...withoutKeyboardPath } = props;

  assert.equal(rankedList(withoutKeyboardPath), false);
  assert.ok(rankedList.errors?.some((error) => error.keyword === 'required'));
});
