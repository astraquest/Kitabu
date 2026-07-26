# Invalid protocol fixtures

Each single-envelope fixture violates one focused transport rule. The
`duplicate-event-identity.json` fixture is intentionally different: both of its
envelopes are structurally valid, but the second must be rejected by the
duplicate guard because an event ID is globally single-use at a runtime
boundary.
