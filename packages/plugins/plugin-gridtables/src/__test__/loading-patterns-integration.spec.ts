import '@testing-library/jest-dom/vitest'
import { defaultValueCtx, Editor, editorViewCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { expect, it, describe } from 'vitest'

import { gridTables } from '../index'

describe('Grid Tables Loading Patterns Integration', () => {
  const testCases = [
    {
      name: 'Simple Grid Table',
      markdown: `
+-------------------+------+
| Table Headings    | Here |
+===================+======+
| cell              | more |
+-------------------+------+
`,
      expectedCells: ['Table Headings', 'Here', 'cell', 'more'],
    },
    {
      name: 'Multi-line Cells',
      markdown: `
+-------------------+------+
| Multi-line        | Here |
| content that      |      |
| spans rows        |      |
+===================+======+
| cell              | more |
+-------------------+------+
`,
      expectedCells: [
        'Multi-line content that spans rows',
        'Here',
        'cell',
        'more',
      ],
    },
    {
      name: 'Basic Table',
      markdown: `
+--------+--------+--------+
| Left   | Center | Right  |
+========+========+========+
| Data   | Data   | Data   |
+--------+--------+--------+
`,
      expectedCells: ['Left', 'Center', 'Right', 'Data'],
    },
    {
      name: 'Complex Grid Table with Spans',
      markdown: `
+--------+--------+--------+
| A1     | B1     | C1     |
|        +--------+--------+
|        | B2              |
+--------+-----------------+
| A3              | C3     |
+-----------------+--------+
`,
      expectedCells: ['A1', 'B1', 'C1', 'B2', 'A3', 'C3'],
    },
    {
      name: 'Grid Table with Formatting',
      markdown: `
+----------+----------+
| **Bold** | *Italic* |
+==========+==========+
| \`code\`   | [link]() |
+----------+----------+
`,
      expectedCells: ['Bold', 'Italic', 'code', 'link'],
    },
  ]

  describe('Post-commonmark Loading Pattern (.use(commonmark).use(gridTables))', () => {
    testCases.forEach(({ name, markdown, expectedCells }) => {
      it(`should parse ${name} correctly`, async () => {
        const editor = Editor.make()
        editor
          .use(commonmark) // Load commonmark first
          .use(gridTables) // Then grid tables (post-commonmark pattern)

        editor.config((ctx) => {
          ctx.set(defaultValueCtx, markdown)
        })

        await editor.create()

        const view = editor.ctx.get(editorViewCtx)
        const dom = view.dom

        // Verify grid table is parsed correctly
        const table = dom.querySelector('table[data-type="grid-table"]')
        expect(table).toBeTruthy()

        if (table) {
          const cellTexts = Array.from(table.querySelectorAll('td, th')).map(
            (cell) => cell.textContent?.trim().replace(/\s+/g, ' ')
          )
          expectedCells.forEach((expectedText) => {
            expect(
              cellTexts.some((text) => text?.includes(expectedText))
            ).toBeTruthy()
          })
        }
      })
    })
  })

  describe('Pre-commonmark Loading Pattern (.use(gridTables).use(commonmark))', () => {
    testCases.forEach(({ name, markdown, expectedCells }) => {
      it(`should parse ${name} correctly`, async () => {
        const editor = Editor.make()
        editor
          .use(gridTables) // Load grid tables first (pre-commonmark pattern)
          .use(commonmark) // Then commonmark

        editor.config((ctx) => {
          ctx.set(defaultValueCtx, markdown)
        })

        await editor.create()

        const view = editor.ctx.get(editorViewCtx)
        const dom = view.dom

        // Verify grid table is parsed correctly
        const table = dom.querySelector('table[data-type="grid-table"]')
        expect(table).toBeTruthy()

        if (table) {
          const cellTexts = Array.from(table.querySelectorAll('td, th')).map(
            (cell) => cell.textContent?.trim().replace(/\s+/g, ' ')
          )
          expectedCells.forEach((expectedText) => {
            expect(
              cellTexts.some((text) => text?.includes(expectedText))
            ).toBeTruthy()
          })
        }
      })
    })
  })

  describe('Loading Pattern Equivalence', () => {
    testCases.forEach(({ name, markdown }) => {
      it(`should produce identical results for ${name} with both loading patterns`, async () => {
        // Create two editors with different loading patterns
        const postEditor = Editor.make()
        postEditor.use(commonmark).use(gridTables)

        const preEditor = Editor.make()
        preEditor.use(gridTables).use(commonmark)

        // Configure both with the same content
        postEditor.config((ctx) => {
          ctx.set(defaultValueCtx, markdown)
        })
        preEditor.config((ctx) => {
          ctx.set(defaultValueCtx, markdown)
        })

        // Create both editors
        await postEditor.create()
        await preEditor.create()

        // Get DOMs for comparison
        const postView = postEditor.ctx.get(editorViewCtx)
        const preView = preEditor.ctx.get(editorViewCtx)

        const postTable = postView.dom.querySelector(
          'table[data-type="grid-table"]'
        )
        const preTable = preView.dom.querySelector(
          'table[data-type="grid-table"]'
        )

        // Both should have tables
        expect(postTable).toBeTruthy()
        expect(preTable).toBeTruthy()

        if (postTable && preTable) {
          // Compare cell contents
          const postCells = Array.from(
            postTable.querySelectorAll('td, th')
          ).map((cell) => cell.textContent?.trim().replace(/\s+/g, ' '))
          const preCells = Array.from(preTable.querySelectorAll('td, th')).map(
            (cell) => cell.textContent?.trim().replace(/\s+/g, ' ')
          )

          expect(postCells).toEqual(preCells)

          // Compare structure (row/column counts)
          const postRows = postTable.querySelectorAll('tr').length
          const preRows = preTable.querySelectorAll('tr').length
          expect(postRows).toBe(preRows)

          // Compare table attributes
          expect(postTable.getAttribute('data-type')).toBe(
            preTable.getAttribute('data-type')
          )
        }
      })
    })
  })

  describe('Complex Integration Scenarios', () => {
    it('should work with regular tables alongside grid tables (post-commonmark)', async () => {
      const mixedMarkdown = `
# Regular GFM Table
| GFM | Table |
|-----|-------|
| A   | B     |

# Grid Table
+-------+-------+
| Grid  | Table |
+=======+=======+
| C     | D     |
+-------+-------+
`

      const editor = Editor.make()
      editor.use(commonmark).use(gridTables)

      editor.config((ctx) => {
        ctx.set(defaultValueCtx, mixedMarkdown)
      })

      await editor.create()

      const view = editor.ctx.get(editorViewCtx)
      const dom = view.dom

      // Should have both regular tables and grid tables
      const allTables = dom.querySelectorAll('table')
      const gridTablesElements = dom.querySelectorAll(
        'table[data-type="grid-table"]'
      )

      expect(allTables.length).toBeGreaterThanOrEqual(1)
      expect(gridTablesElements.length).toBe(1)

      // Verify grid table content
      const gridTable = gridTablesElements[0]
      const gridCellTexts = Array.from(
        gridTable.querySelectorAll('td, th')
      ).map((cell) => cell.textContent?.trim())
      expect(gridCellTexts).toContain('Grid')
      expect(gridCellTexts).toContain('Table')
      expect(gridCellTexts).toContain('C')
      expect(gridCellTexts).toContain('D')
    })

    it('should work with regular tables alongside grid tables (pre-commonmark)', async () => {
      const mixedMarkdown = `
# Regular GFM Table
| GFM | Table |
|-----|-------|
| A   | B     |

# Grid Table
+-------+-------+
| Grid  | Table |
+=======+=======+
| C     | D     |
+-------+-------+
`

      const editor = Editor.make()
      editor.use(gridTables).use(commonmark)

      editor.config((ctx) => {
        ctx.set(defaultValueCtx, mixedMarkdown)
      })

      await editor.create()

      const view = editor.ctx.get(editorViewCtx)
      const dom = view.dom

      // Should have both regular tables and grid tables
      const allTables = dom.querySelectorAll('table')
      const gridTablesElements = dom.querySelectorAll(
        'table[data-type="grid-table"]'
      )

      expect(allTables.length).toBeGreaterThanOrEqual(1)
      expect(gridTablesElements.length).toBe(1)

      // Verify grid table content
      const gridTable = gridTablesElements[0]
      const gridCellTexts = Array.from(
        gridTable.querySelectorAll('td, th')
      ).map((cell) => cell.textContent?.trim())
      expect(gridCellTexts).toContain('Grid')
      expect(gridCellTexts).toContain('Table')
      expect(gridCellTexts).toContain('C')
      expect(gridCellTexts).toContain('D')
    })

    it('should handle edge cases: empty tables, single cell, etc.', async () => {
      const edgeCaseMarkdown = `
# Single Cell Table
+-------+
| Solo  |
+=======+
| Cell  |
+-------+

# Minimal Table
+---+---+
| A | B |
+===+===+
| 1 | 2 |
+---+---+
`

      // Test both patterns
      const patterns = [
        {
          name: 'post-commonmark',
          setup: (editor: Editor) => editor.use(commonmark).use(gridTables),
        },
        {
          name: 'pre-commonmark',
          setup: (editor: Editor) => editor.use(gridTables).use(commonmark),
        },
      ]

      for (const pattern of patterns) {
        const editor = Editor.make()
        pattern.setup(editor)

        editor.config((ctx) => {
          ctx.set(defaultValueCtx, edgeCaseMarkdown)
        })

        await editor.create()

        const view = editor.ctx.get(editorViewCtx)
        const dom = view.dom

        const tables = dom.querySelectorAll('table[data-type="grid-table"]')
        expect(tables.length).toBe(2) // Should parse both tables

        // Verify first table (single column)
        const firstTable = tables[0]
        const firstCells = Array.from(
          firstTable.querySelectorAll('td, th')
        ).map((cell) => cell.textContent?.trim())
        expect(firstCells).toContain('Solo')
        expect(firstCells).toContain('Cell')

        // Verify second table (minimal)
        const secondTable = tables[1]
        const secondCells = Array.from(
          secondTable.querySelectorAll('td, th')
        ).map((cell) => cell.textContent?.trim())
        expect(secondCells).toContain('A')
        expect(secondCells).toContain('B')
        expect(secondCells).toContain('1')
        expect(secondCells).toContain('2')
      }
    })
  })

  describe('Plugin Structure', () => {
    it('should have plugin keys defined', () => {
      expect(gridTables.key).toBeDefined()
      expect(gridTables.pluginKey).toBeDefined()
    })

    it('should have correct plugin array structure', () => {
      // Export should be an array with key/pluginKey properties
      expect(Array.isArray(gridTables)).toBeTruthy()
      expect(gridTables.length).toBeGreaterThan(0)
    })
  })
})
