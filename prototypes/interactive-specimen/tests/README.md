# Interactive specimen contract tests

These tests use Node's built-in test runner and have no third-party test
dependencies.

Run them from the repository root:

```powershell
node --test prototypes/interactive-specimen/tests/*.test.mjs
```

`contract-validators.mjs` keeps the checks independent of a rendering engine.
`prototype-contract.test.mjs` applies them to production data and uses focused
static assertions for browser-only behavior, avoiding a heavy browser harness.
