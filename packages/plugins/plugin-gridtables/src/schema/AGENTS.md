# Schema Module

- `index.ts` defines all grid-table node & attribute schemas and exports alignment types.
- Consumed by commands, ProseMirror plugins, tests, and package entry exports.
- Keep parse/serialize logic aligned with remark integration (`../remark`).
- Document any structural changes here and ensure tests in `../__test__` validate DOM/markdown round-trips.
