# Grid Table Interop Layer

This directory provides the clipboard and serialization interoperability layer for grid tables.

## Clipboard Interop (`index.ts`)

- `gridTableDomTransformsCtx` re-exports `clipboardDomTransformsCtx` from
  `@milkdown/plugin-clipboard`. The shared clipboard plugin owns the slice;
  grid tables simply ensure it is installed when `gridTables` is used.
- `registerGridTableDomTransform(ctx, transform)` delegates to the clipboard
  helper so new transforms automatically flow through the shared clipboard
  pipeline. Use the exported `reset*` helpers in tests to clean up after
  yourself.
- `gridTableClipboardDomTransform` is the default transform that normalizes
  pasted tables:
  - Detects tables with ASCII grid markup context (via `hasAsciiGridContext`)
  - When both GFM and grid tables are installed, checks for spans
    (`rowspan`/`colspan`) or vertical alignment on cells
  - Tables requiring grid-table features are marked with `data-type="grid-table"`
    so remark-gfm never receives unsupported layouts
  - Tables with ragged rows (different cell counts) are also promoted, as
    GFM serialization expects rectangular matrices
  - Simple tables without grid features remain unmarked for GFM parsing
- `gridTableClipboardInterop` registers the default transform with the
  context. The clipboard plugin iterates all registered transforms.

## Serialization Interop (`index.ts` + `promotion.ts`)

- `gridTableSerializeTransformsCtx` provides a context slice for custom
  serialization transforms. Transforms registered here run before markdown
  output is produced.
- `gridTableSerializerInterop` wraps the core serializer:
  1. **Automatic GFM promotion** (via `promoteGridTablesToGfm`): When both GFM
     and gridTable schemas exist, compatible gridTables are converted to GFM
     table nodes before serialization. This prevents remark-gfm from
     encountering incompatible mdast structures.
  2. **Custom transforms**: Runs any registered serializer transforms
  3. **Markdown generation**: Calls the original serializer with the
     transformed document

## Promotion Logic (`promotion.ts`)

- `canPromoteToGfm(gridTable)`: Detects if a gridTable can be represented as
  GFM. Checks for:
  - No cell spans (all `colSpan=1`, `rowSpan=1`)
  - Rectangular structure (all rows have same cell count)
  - Single header row in gtHead
  - No footer section (GFM doesn't support footers)
  - No vertical alignment attributes
  - Each cell contains exactly one paragraph (GFM constraint)
- `promoteToGfmTable(gridTable, schema)`: Converts a compatible gridTable PM
  node to a GFM table PM node:
  - Maps gtHeader → table_header_row with table_header cells
  - Maps gtBody rows → table_row with table_cell cells
  - Preserves alignment (`'left'`, `'center'`, `'right'`; maps `'justify'` → `'left'`)
  - Transfers paragraph content from gridTableCells
- `promoteGridTablesToGfm(doc, schema)`: Recursively walks the document and
  promotes all compatible gridTables. Returns a new document with promoted
  tables.

## Data Flow & Architecture

### Paste Flow (Plain Text)

When pasting plain ASCII grid table markdown:

1. **Clipboard receives plain text** containing ASCII grid table syntax
2. **Markdown parsing**: Remark pipeline processes the text
   - `remark-gridtables` recognizes ASCII patterns
   - Creates mdast nodes: `gridTable` → `gtHeader`/`gtBody`/`gtFooter` → etc.
3. **mdast → HTML conversion**: mdast is converted to HTML
   - Result: `<table data-type="grid-table"><thead>...</thead><tbody>...</tbody></table>`
4. **clipboardDomTransform runs**: `gridTableClipboardDomTransform` processes HTML
   - Already has `data-type="grid-table"` from step 3
   - May perform additional normalization (alignment hoisting, etc.)
5. **DOM → ProseMirror parsing**: ProseMirror's DOM parser converts HTML to nodes
   - **Critical**: Both GFM and gridTable parseDOM rules may match the same `<table>`
   - **Solution**: gridTable parseDOM rules use `priority: 60` (higher than default 50)
   - gridTable parser wins for tables with `data-type="grid-table"`
   - Result: `gridTable` ProseMirror node

### Paste Flow (HTML from Editor)

When copying from the editor and pasting:

1. **Clipboard receives HTML** directly from editor's toDOM
   - Includes `data-type="grid-table"` attribute
   - Has proper `<thead>`, `<tbody>`, `<tfoot>` structure
2. **clipboardDomTransform runs**: Normalizes as needed
3. **DOM → ProseMirror parsing**: Same as step 5 above
   - parseDOM priority ensures correct parser is used

### Critical: parseDOM Priority

The gridTable schema uses `priority: 60` on ALL parseDOM rules:
- `gridTableSchema` (`<table[data-type="grid-table"]>`)
- `gridTableHeadSchema`, `gridTableBodySchema`, `gridTableFootSchema` (`<thead>`, `<tbody>`, `<tfoot>`)
- `gridTableRowSchema` (`<tr>`)
- `gridTableCellSchema` (`<td>`, `<th>`)

**Why this matters**: When both GFM and gridTable plugins are loaded, GFM's
rules (`<table>`, `<tr>`, `<td>`, etc.) would match the same HTML elements.
Without priority, ProseMirror would create malformed hybrid structures (empty
GFM tables + broken gridTables). Higher priority ensures gridTable parser wins
when `data-type="grid-table"` is present.

**Testing parseDOM conflicts**: Use the "clipboard → gfm (baseline, no gridTables)"
storybook story to verify GFM works independently. Then compare with stories
that load both plugins to ensure no interference.

## Behaviour

When both plugins are loaded (regardless of order):
- **Paste**: Complex tables → marked as grid-table → parse as gridTable nodes
- **Paste**: Simple tables → unmarked → parse as GFM table nodes
- **Serialize**: gridTable nodes that are simple → promoted to GFM table nodes
  → output as pipe tables
- **Serialize**: gridTable nodes with complex features → remain as gridTable
  → output as ASCII grid tables
- **Result**: Tables dynamically use the simplest representation that supports
  their features

When new transforms or serialization helpers are added, ensure they are
registered appropriately and document their behaviour here. Remember to remove
transforms in tests via the exported `reset*` helpers to avoid cross-test
pollution.

## Troubleshooting

For known cross-editor compatibility issues, see [KNOWN_ISSUES.md](../../../KNOWN_ISSUES.md).

### TypeError in remark-gfm during serialization

**Symptom**: `TypeError: Cannot read properties of undefined (reading 'length')`
in `handleTableRowAsData` when pasting tables with GFM loaded.

**Root cause**: The serializer is outputting mdast `gridTable` nodes that
remark-gfm cannot process.

**Solution**: Ensure `gridTableSerializerInterop` is loaded and the promotion
logic is working. Check that both GFM and gridTable schemas are present in the
schema.

**Debug steps**:
1. Add logging to `promoteGridTablesToGfm` to verify it's running
2. Check the mdast tree before serialization (log in `SerializerState.toString`)
3. Verify compatible gridTables are being promoted to GFM tables

### Tables parsing as individual paragraphs

**Symptom**: Pasted table appears as separate text paragraphs instead of a table.

**Root cause**: Either:
- The markdown parser doesn't recognize the table syntax
- The DOM parser is failing to create table nodes

**Debug steps**:
1. Check clipboard HTML (log in `gridTableClipboardDomTransform`)
2. Verify `data-type="grid-table"` is present on the `<table>` element
3. Check that parseDOM rules have correct priority
4. Use baseline "clipboard → gfm" story to verify GFM works independently

### Tables creating malformed hybrid structures

**Symptom**: Empty GFM tables + nested/broken gridTables in the document.

**Root cause**: parseDOM priority conflict between GFM and gridTable parsers.

**Solution**: Verify all gridTable parseDOM rules have `priority: 60` in
`packages/plugins/plugin-gridtables/src/schema/index.ts`:
- `gridTableSchema`
- `gridTableHeadSchema`, `gridTableBodySchema`, `gridTableFootSchema`
- `gridTableRowSchema`
- `gridTableCellSchema` (both `<td>` and `<th>` rules)

**Debug steps**:
1. Check the generated HTML structure (log in `gridTableClipboardDomTransform`)
2. Verify `<thead>`, `<tbody>`, `<tfoot>` sections are preserved
3. Ensure `data-type="grid-table"` is present
4. Test with both plugin orders (GFM first vs gridTables first)

### Simple gridTable not converting to GFM

**Symptom**: A table without spans/footers remains as ASCII grid table instead
of converting to pipe table format.

**Root cause**: Promotion heuristic is too strict or table has hidden complexity.

**Debug steps**:
1. Check `canPromoteToGfm` logic in `promotion.ts`
2. Verify all cells have exactly one paragraph (GFM requirement)
3. Check for `valign` attributes (GFM doesn't support vertical alignment)
4. Ensure header has exactly one row
