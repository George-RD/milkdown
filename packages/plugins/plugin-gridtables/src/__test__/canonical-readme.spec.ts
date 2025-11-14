import '@testing-library/jest-dom/vitest'
import { defaultValueCtx, Editor, editorViewCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { describe, it, expect } from 'vitest'

import { gridTables } from '..'

function createEditor() {
  const editor = Editor.make()
  editor.use(commonmark).use(gridTables)
  return editor
}

describe('Grid Tables – Canonical and Malformed Samples', () => {
  it('parses canonical README complex table', async () => {
    const canonical = `
-------------------+------+
| Table Headings    | Here |
+--------+----------+------+
| Sub    | Headings | Too  |
+========+=================+
| cell   | column spanning |
| spans  +---------:+------+
| rows   |   normal | cell |
+---v----+:---------------:+
|        | cells can be    |
|        | *formatted*     |
|        | **paragraphs**  |
|        | \`\`\`             |
| multi  | and contain     |
| line   | blocks          |
| cells  | \`\`\`             |
+========+=========:+======+
| footer |    cells |      |
+--------+----------+------+
`

    const editor = createEditor()
    editor.config((ctx) => ctx.set(defaultValueCtx, canonical))
    await editor.create()

    const view = editor.ctx.get(editorViewCtx)
    const table = view.dom.querySelector('table[data-type="grid-table"]')
    expect(table).toBeTruthy()

    // basic shape sanity
    expect(table?.querySelectorAll('tr').length).toBeGreaterThan(0)
    expect(table?.querySelectorAll('td, th').length).toBeGreaterThan(0)
  })

  it('does not parse malformed ASCII (old story sample) and leaves text as-is', async () => {
    const malformed = `
----------------+--------+--------+
| Grid Tables    | Are    | Cool   |
+================+========+========+
| col 1 is       | left-  | $1600 |
| left-aligned   | align  |        |
+----------------+--------+--------+
| col 2 is       | cent-  | $12   |
| centered       | ered   |        |
+----------------+--------+--------+
| col 3 is right | right- | $1    |
| aligned        | align  |        |
+----------------+--------+--------+
`

    const editor = createEditor()
    editor.config((ctx) => ctx.set(defaultValueCtx, malformed))
    await editor.create()

    const view = editor.ctx.get(editorViewCtx)
    const gridTables = view.dom.querySelectorAll(
      'table[data-type="grid-table"]'
    )
    expect(gridTables.length).toBe(0)

    // Ensure raw ASCII remains in text content to confirm non-parsed state
    const text = view.dom.textContent || ''
    expect(text.includes('+===')).toBe(true)
  })
})
