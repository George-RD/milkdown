# Keymap

- `index.ts` maps keyboard shortcuts to grid-table commands.
- Imports command keys from `../commands` and registers metadata via `$useKeymap`.
- Keep shortcuts in sync with user docs and update tests when adding/removing bindings.
- Update this file whenever command wiring or shortcuts change.
