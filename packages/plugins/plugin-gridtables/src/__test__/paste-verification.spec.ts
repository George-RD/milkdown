import '@testing-library/jest-dom/vitest'
import {
  defaultValueCtx,
  Editor,
  editorViewCtx,
  parserCtx,
  serializerCtx,
} from '@milkdown/core'
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

  const complexGridTableText = `+-------------------+------+
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
|        | \`code\`           |
| multi  | and contain     |
| line   | blocks          |
| cells  | \`code\`           |
+========+=========:+======+
| footer |    cells |      |
+--------+----------+------+`

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

    const serializer = editor.ctx.get(serializerCtx)
    expect(() => serializer(doc)).not.toThrow()

    // Check if it contains a grid table node
    let hasGridTable = false
    doc.descendants((node) => {
      if (node.type.name === 'gridTable') {
        hasGridTable = true
      }
    })

    expect(hasGridTable).toBe(true)
  })

  it('serializes complex grid tables without triggering gfm errors (gfm first)', async () => {
    const editor = Editor.make()
    editor.use(commonmark).use(gfm).use(gridTables)

    editor.config((ctx) => {
      ctx.set(defaultValueCtx, '')
    })

    await editor.create()

    const parser = editor.ctx.get(parserCtx)
    const doc = parser(complexGridTableText)

    expect(doc).toBeTruthy()
    if (typeof doc === 'string') throw new Error('Parser returned string instead of doc')

    let gridTableCount = 0
    let gfmTableCount = 0
    doc.descendants((node) => {
      if (node.type.name === 'gridTable') gridTableCount += 1
      if (node.type.name === 'table') gfmTableCount += 1
    })
    expect(gridTableCount).toBe(1)
    expect(gfmTableCount).toBe(0)

    const serializer = editor.ctx.get(serializerCtx)
    expect(() => serializer(doc)).not.toThrow()
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

    const serializer = editor.ctx.get(serializerCtx)
    expect(() => serializer(doc)).not.toThrow()

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

    const serializer1 = gfmFirstEditor.ctx.get(serializerCtx)
    const serializer2 = gridTablesFirstEditor.ctx.get(serializerCtx)
    expect(() => serializer1(doc1)).not.toThrow()
    expect(() => serializer2(doc2)).not.toThrow()
  })
})
