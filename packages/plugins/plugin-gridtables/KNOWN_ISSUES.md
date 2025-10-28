# Known Issues

## Cross-Editor Paste from GridTables to GFM-Only

### Scenario

- **Editor A** has gridTables plugin loaded
- Copy a gridTable from Editor A (clipboard contains HTML with `data-type="grid-table"`)
- **Editor B** has GFM only (no gridTables plugin)
- Paste into Editor B → `TypeError: Cannot read properties of undefined (reading 'length')` in remark-gfm

### Root Cause

1. GridTable's `toDOM` outputs `<table data-type="grid-table">` with thead/tbody/tfoot structure
2. GFM-only editor ignores the `data-type` attribute (no gridTable schema to recognize it)
3. GFM's parseDOM tries to parse the HTML structure
4. Creates malformed table structures during paste that remark-gfm cannot serialize

### Impact

**Edge case**: Requires copying from gridTables-enabled editor to GFM-only editor.

**Does NOT affect:**
- Pasting ASCII grid tables (works fine)
- Copying/pasting within same editor
- Copying from GFM to gridTables
- Pasting between editors with same plugin configuration

### Potential Solutions (for future work)

#### 1. Cleaner HTML Output (Recommended)

Modify gridTable's clipboard serialization to output more standard table HTML:
- Strip gridTable-specific attributes for clipboard
- Would help with pasting into external applications too
- **Benefits**: Better compatibility across all paste scenarios

#### 2. GFM-Compatible toDOM

Make gridTable's HTML output more compatible with GFM parser:
- Ensure structure is always parseable by GFM
- May require structural changes to toDOM output
- **Benefits**: Works with any GFM parser

#### 3. Clipboard Detection

Add logic in clipboard plugin to detect and clean gridTable HTML when GFM-only:
- Would require clipboard plugin to know about gridTables
- **Drawback**: Violates modularity principle (gridTables should be self-contained)

### Recommended Approach

**Option 1 (cleaner HTML)** - Benefits both cross-editor paste and external application compatibility.

### Workaround

Use plain-text paste when copying between editors with different plugin configurations:

- **macOS**: `Cmd+Shift+V`
- **Windows/Linux**: `Ctrl+Shift+V`

This forces the clipboard to use plain-text markdown, which both editors can handle correctly.

### References

See troubleshooting section in `src/interop/AGENTS.md` for debugging steps if you encounter this issue.

