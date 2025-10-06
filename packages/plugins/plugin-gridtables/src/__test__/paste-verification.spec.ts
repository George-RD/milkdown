import '@testing-library/jest-dom/vitest'
import { defaultValueCtx, Editor, editorViewCtx, parserCtx } from '@milkdown/core'
import { gfm } from '@milkdown/preset-gfm'
import { commonmark } from '@milkdown/preset-commonmark'
import { expect, it, describe } from 'vitest'

import { gridTables } from '../index'

describe('Paste Path Verification (HTML vs Plain Text)', () => {
  const gridTableText = `+-------------------+------+
| Table Headings    | Here |
+===================+======+
| cell              | more |
+-------------------+------+`

  it('should parse correctly via remark parser (plain text path) with GFM first', async () => {
    const editor = Editor.make()
    editor.use(commonmark).use(gfm).use(gridTables) // GFM first - allegedly problematic order

    editor.config((ctx) => {
      ctx.set(defaultValueCtx, '')
    })

    await editor.create()

    // Directly use the remark parser (simulates plain text paste path)
    const parser = editor.ctx.get(parserCtx)
    const doc = parser(gridTableText)

    // Check if it's a valid doc
    expect(doc).toBeTruthy()
    if (typeof doc === 'string') {
      throw new Error('Parser returned string instead of doc')
    }

    // Check if it contains a grid table node
    let hasGridTable = false
    doc.descendants((node) => {
      if (node.type.name === 'gridTable') {
        hasGridTable = true
      }
    })

    expect(hasGridTable).toBe(true)
  })

  it('should parse correctly via remark parser (plain text path) with gridTables first', async () => {
    const editor = Editor.make()
    editor.use(commonmark).use(gridTables).use(gfm) // gridTables first

    editor.config((ctx) => {
      ctx.set(defaultValueCtx, '')
    })

    await editor.create()

    // Directly use the remark parser (simulates plain text paste path)
    const parser = editor.ctx.get(parserCtx)
    const doc = parser(gridTableText)

    // Check if it's a valid doc
    expect(doc).toBeTruthy()
    if (typeof doc === 'string') {
      throw new Error('Parser returned string instead of doc')
    }

    // Check if it contains a grid table node
    let hasGridTable = false
    doc.descendants((node) => {
      if (node.type.name === 'gridTable') {
        hasGridTable = true
      }
    })

    expect(hasGridTable).toBe(true)
  })

  it('should show if remark parsing is plugin-order independent', async () => {
    // Create both editors
    const gfmFirstEditor = Editor.make()
      .use(commonmark)
      .use(gfm)
      .use(gridTables)
    const gridTablesFirstEditor = Editor.make()
      .use(commonmark)
      .use(gridTables)
      .use(gfm)

    gfmFirstEditor.config((ctx) => ctx.set(defaultValueCtx, ''))
    gridTablesFirstEditor.config((ctx) => ctx.set(defaultValueCtx, ''))

    await gfmFirstEditor.create()
    await gridTablesFirstEditor.create()

    // Parse the same text with both parsers
    const gfmFirstParser = gfmFirstEditor.ctx.get(parserCtx)
    const gridTablesFirstParser = gridTablesFirstEditor.ctx.get(parserCtx)

    const doc1 = gfmFirstParser(gridTableText)
    const doc2 = gridTablesFirstParser(gridTableText)

    // Both should produce the same result
    expect(typeof doc1).toBe(typeof doc2)
    if (typeof doc1 === 'string' || typeof doc2 === 'string') {
      throw new Error('Parser returned string')
    }

    // Count grid table nodes in both
    let count1 = 0
    let count2 = 0
    doc1.descendants((node) => {
      if (node.type.name === 'gridTable') count1++
    })
    doc2.descendants((node) => {
      if (node.type.name === 'gridTable') count2++
    })

    expect(count1).toBe(count2)
    expect(count1).toBe(1) // Both should have 1 grid table
  })
})
