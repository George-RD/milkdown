# Grid Tables Plugin — Issues Plan

This plan outlines high‑level issues to complete the Grid Tables plugin, keeping parity with packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md. Each issue includes a goal, development guidance, acceptance criteria, and notes. Scope is intentionally high level; implementers should follow the dev guide for patterns (array‑based composables, $command/$view/$remark, withMeta, typed APIs), repo conventions, and testing standards.

## Issue 1: UI Controls for Rows/Columns and Merge/Split

- Goal
  - Provide in‑editor UI (handles/buttons) to add/remove rows and columns, set alignment/valign, and merge/split cells for grid tables, comparable to the existing table UI but supporting grid table spans and sections (head/body/foot).
- Development
  - Mirror existing table UI patterns (see components table‑block + crepe feature/table) and adapt for `data-type="grid-table"` and grid commands.
  - Expose operations via grid table commands: addGridRowAfter/Before, deleteGridRow, addGridColumnAfter/Before, deleteGridColumn, setGridCellAlign, setGridCellVAlign, mergeGridCellRight, splitGridCell, navigation commands.
  - Provide stable CSS hooks and class names; ensure styles are theme‑friendly and scoped.
  - Add a $view plugin or component wrapper to render controls near selection/hover, respecting editability.
  - Place unit tests under `src/__test__/` with Vitest; add basic e2e flows for major actions.
- Acceptance Criteria
  - Hover/selection affordances appear only on grid tables; actions execute the corresponding grid commands and update the document.
  - Works across table head/body/foot and respects colSpan/rowSpan.
  - Keyboard navigation remains functional; no regressions to standard table behavior.
  - Storybook demos show the controls working; jsdom unit tests cover the operations; e2e covers add/remove row/column and merge/split.
- Notes
  - Follow Plugin Development Guide for $view, CSS naming, and command patterns; avoid cross‑package private imports. Prefer export from package entry. Type‑only imports where applicable.

## Issue 2: Slash Command Support (Insert Grid Table)

- Goal
  - Add slash‑menu entries (via `@milkdown/kit/plugin/slash`) to insert grid tables with common presets (e.g., 3×3, with/without header/footer) and optional dimension input.
- Development
  - Provide items that call `insertGridTableCommand` with sensible defaults and variants.
  - Use existing slash provider patterns (crepe/block‑edit menu consumes slash factory) and ensure accessibility/keyboard support.
  - Keep plugin loading order guidance clear: `.use(gridTables).use(commonmark)`.
- Acceptance Criteria
  - Typing “/grid” (and table‑related keywords) shows grid table items; selecting inserts the chosen variant.
  - Items respect readonly state and do not appear or act when editor is not editable.
  - Storybook story demonstrates discovery and insertion via slash menu.
- Notes
  - Consider combining with Issue 3 if workload is small; otherwise ship independently. Follow dev guide’s slash patterns and testing guidance.

## Issue 3: Menu Items and Integration with Block Edit Menu

- Goal
  - Add menu items for grid tables in the block‑edit menu (crepe feature) under a “Table” group alongside or distinct from standard tables.
- Development
  - Reuse the slash factory–based menu integration used by crepe. Provide icons with reasonable defaults; allow override via config where consistent with existing table UI.
  - Ensure items call grid table commands and are visible only when relevant.
- Acceptance Criteria
  - Grid table entries appear in block‑edit menu and perform expected actions (insert, basic ops or deep‑link to UI from Issue 1).
  - Menu is keyboard accessible and styled consistently with theme.
- Notes
  - Maintain small public API surface; export from package entry only. Align naming and grouping with existing menu patterns.

## Issue 4: Storybook Styling and CSS Validation

- Goal
  - Investigate and fix styling issues seen in Storybook for grid tables (determine whether plugin or Storybook integration is at fault). Ensure styles render correctly across themes and stories.
- Development
  - Verify DOM structure and attributes: `table[data-type="grid-table"]`, `td[colspan]`, `td[rowspan]`, `data-align`, `data-valign`.
  - Scope styles to grid tables and avoid collisions with standard table styles; prefer theme variables where available.
  - Confirm Storybook examples load plugins in correct order and remove any debug noise.
- Acceptance Criteria
  - Basic/Complex/Empty grid table stories render correctly with expected alignment, spans, and spacing; no unparsed grid syntax present.
  - No stylesheet collisions with standard tables; visuals consistent under Nord theme and default.
  - Lint passes; unit snapshot(s) for structural CSS hooks as needed.
- Notes
  - Reference Theme and Styling Patterns in the dev guide. Keep CSS class names stable for e2e selectors.

## General Guidance (applies to all issues)

- Follow Plugin Development Guide patterns (array‑based composables, withMeta on exports, typed contexts, $command/$view/$remark usage, markdown parse/serialize symmetry).
- Respect monorepo conventions: kebab‑case files, type‑only imports, export via package entry. No cross‑package private imports.
- Tests: place unit tests under `src/__test__/` (Vitest/jsdom) and extend Playwright e2e where relevant. Prefer role/text selectors.
- Docs/Stories: update Storybook and docs when behavior changes; ensure plugin load order guidance is explicit.
- Quality gates: lint/format must pass (`pnpm test`), and add a changeset for user‑facing changes.
