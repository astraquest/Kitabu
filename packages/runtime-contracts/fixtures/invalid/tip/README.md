# Invalid TIP fixtures

These fixtures exercise Tutor Intervention Protocol trust boundaries. Dispatch
fixtures refer to the shared `highlight-valid` descriptor preset used by the
TIP test harness. That preset accepts `term-*` targets, requires a string
`color`, and permits the `ready.active` state.

`forged-assistance-semantics.json` is a schema fixture rather than a dispatch
fixture: assistance and evidence attribution belong to the component action
descriptor and cannot be supplied by authored scene permissions.
