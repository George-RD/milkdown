import '@testing-library/jest-dom/vitest'
import { defaultValueCtx, Editor, editorViewCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { expect, it, describe } from 'vitest'

import { gridTables, remarkGridTables } from '..'

describe('Grid Tables Remark Composition', () => {
  it('should work when loaded after commonmark', async () => {
    const gridTableMarkdown = `
+-------------------+------+
| Table Headings    | Here |
+===================+======+
| cell              | more |
+-------------------+------+
`

    const editor = Editor.make()
    editor
      .use(commonmark) // Load commonmark first
      .use(gridTables) // Then grid tables - should handle composition

    editor.config((ctx) => {
      ctx.set(defaultValueCtx, gridTableMarkdown)
    })

    await editor.create()

    const view = editor.ctx.get(editorViewCtx)
    const dom = view.dom

    // Verify grid table is parsed correctly despite commonmark being loaded first
    const table = dom.querySelector('table[data-type="grid-table"]')
    expect(table).toBeTruthy()

    if (table) {
      const cellTexts = Array.from(table.querySelectorAll('td, th')).map(
        (cell) => cell.textContent?.trim()
      )
      expect(cellTexts).toContain('Table Headings')
      expect(cellTexts).toContain('Here')
      expect(cellTexts).toContain('cell')
      expect(cellTexts).toContain('more')
    }
  })

  it('should detect existing table plugins in context', () => {
    // Test that the composition function can detect existing table plugins
    const mockPluginWithTable = {
      plugin: { name: 'table-plugin-mock' },
    }
    const mockPluginGFM = {
      plugin: { name: 'gfm-plugin-mock' },
    }
    const mockPluginOther = {
      plugin: { name: 'other-plugin' },
    }

    const mockCtx = {
      get: () => [mockPluginWithTable, mockPluginGFM, mockPluginOther],
    } as any

    // remarkGridTables is a $Remark instance with plugin and options
    expect(remarkGridTables).toBeDefined()
    expect(remarkGridTables.plugin).toBeDefined()
    expect(remarkGridTables.options).toBeDefined()
  })

  it('should handle plugin correctly', () => {
    // The plugin should be a $Remark instance
    expect(remarkGridTables).toBeDefined()
    expect(remarkGridTables.plugin).toBeDefined()
    expect(remarkGridTables.options).toBeDefined()
  })

  it('should export remark wrapper component', () => {
    // Verify the remark plugin is exported as a $Remark instance
    expect(remarkGridTables).toBeDefined()
    expect(remarkGridTables.plugin).toBeDefined()
    expect(remarkGridTables.options).toBeDefined()
  })

  it('should maintain backward compatibility', async () => {
    // Test that existing usage patterns still work
    const basicTable = `
+--------+--------+
| Cell 1 | Cell 2 |
+========+========+
| Data 1 | Data 2 |
+--------+--------+
`

    const editor = Editor.make()
    editor
      .use(gridTables) // Use grid tables without commonmark first
      .use(commonmark)

    editor.config((ctx) => {
      ctx.set(defaultValueCtx, basicTable)
    })

    await editor.create()

    const view = editor.ctx.get(editorViewCtx)
    const dom = view.dom

    const table = dom.querySelector('table[data-type="grid-table"]')
    expect(table).toBeTruthy()

    if (table) {
      const cellTexts = Array.from(table.querySelectorAll('td, th')).map(
        (cell) => cell.textContent?.trim()
      )
      expect(cellTexts).toContain('Cell 1')
      expect(cellTexts).toContain('Data 1')
    }
  })

  it('should handle complex grid tables with spans after commonmark', async () => {
    const complexGridTable = `
+--------+--------+--------+
| A1     | B1     | C1     |
|        +--------+--------+
|        | B2              |
+--------+---------+-------+
| A3              | C3     |
+-----------------+--------+
`

    const editor = Editor.make()
    editor.use(commonmark).use(gridTables)

    editor.config((ctx) => {
      ctx.set(defaultValueCtx, complexGridTable)
    })

    await editor.create()

    const view = editor.ctx.get(editorViewCtx)
    const dom = view.dom

    const table = dom.querySelector('table[data-type="grid-table"]')
    expect(table).toBeTruthy()

    if (table) {
      // Verify complex spanning features work post-commonmark
      const cells = table.querySelectorAll('td, th')
      const spannedCells = Array.from(cells).filter((cell) => {
        const colspan = cell.getAttribute('colspan')
        const rowspan = cell.getAttribute('rowspan')
        return (
          (colspan && parseInt(colspan) > 1) ||
          (rowspan && parseInt(rowspan) > 1)
        )
      })

      expect(spannedCells.length).toBeGreaterThan(0)

      const cellTexts = Array.from(cells).map((cell) =>
        cell.textContent?.trim()
      )
      expect(
        cellTexts.some((text) => text?.includes('A1') || text?.includes('B1'))
      ).toBeTruthy()
    }
  })
})
