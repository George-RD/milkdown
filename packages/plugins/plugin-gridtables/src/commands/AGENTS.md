# Commands Module

- Contains all grid table ProseMirror commands (`index.ts`).
- Depends on schema exports in `../schema` and shared helpers in `../__internal__`.
- Consumers: keymap (`../keymap`), input rules (`../input-rules`), and external plugins importing commands from the package entry.
- When modifying commands or adding new ones, update this note and ensure accompanying tests in `../__test__` cover the behaviour.
