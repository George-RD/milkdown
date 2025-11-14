import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  defaultValueCtx,
  Editor,
  schemaCtx,
  serializerCtx,
  parserCtx,
} from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'

import {
  gridTables,
  gridTableDomTransformsCtx,
  gridTableClipboardDomTransform,
  registerGridTableDomTransform,
} from '../index'

const setupEditor = async (...plugins: Parameters<Editor['use']>) => {
  const editor = Editor.make()
  editor.use(commonmark)
  plugins.forEach((plugin) => editor.use(plugin))
  editor.config((ctx) => {
    ctx.set(defaultValueCtx, '')
  })
  await editor.create()
  return editor
}

describe('Grid table clipboard interop', () => {
  let cleanupEditor: Editor | null = null

  afterEach(async () => {
    if (cleanupEditor) {
      await cleanupEditor.destroy()
      cleanupEditor = null
    }
  })

  it('registers and unregisters DOM transforms', async () => {
    const editor = await setupEditor(gridTables)
    cleanupEditor = editor

    const ctx = editor.ctx
    const transformsBefore = ctx.get(gridTableDomTransformsCtx.key)
    expect(transformsBefore).toContain(gridTableClipboardDomTransform)

    const customTransform = vi.fn()
    const dispose = registerGridTableDomTransform(ctx, customTransform)

    const transformsAfter = ctx.get(gridTableDomTransformsCtx.key)
    expect(transformsAfter).toContain(customTransform)

    dispose()

    const transformsFinal = ctx.get(gridTableDomTransformsCtx.key)
    expect(transformsFinal).not.toContain(customTransform)
  })

  it('marks plain HTML tables as grid tables when grid tables are enabled', async () => {
    const editor = await setupEditor(gridTables)
    cleanupEditor = editor

    const ctx = editor.ctx
    const schema = ctx.get(schemaCtx)
    const transforms = ctx.get(gridTableDomTransformsCtx.key)

    const template = document.createElement('template')
    template.innerHTML = `
      <table>
        <thead>
          <tr>
            <th align="left">Fruit</th>
            <th align="center">Animal</th>
            <th align="right">Vegetable</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td align="left">Apple</td>
            <td align="center">Cat</td>
            <td align="right">Carrot</td>
          </tr>
        </tbody>
      </table>
    `

    const dom = template.content

    transforms.forEach((transform) => transform({ dom, schema }))

    const table = dom.querySelector('table') as HTMLElement | null
    expect(table?.getAttribute('data-type')).toBe('grid-table')

    const firstCell = table?.querySelector('td') as HTMLElement | null
    expect(firstCell?.getAttribute('data-align')).toBe('left')

    template.remove()
  })

  it('annotates GFM headers without converting to grid tables when both plugins are active', async () => {
    const editor = await setupEditor(gridTables, gfm)
    cleanupEditor = editor

    const ctx = editor.ctx
    const schema = ctx.get(schemaCtx)
    const transforms = ctx.get(gridTableDomTransformsCtx.key)

    const template = document.createElement('template')
    template.innerHTML = `
      <table>
        <thead>
          <tr>
            <th align="left">Fruit</th>
            <th align="center">Animal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td align="left">Apple</td>
            <td align="center">Cat</td>
          </tr>
        </tbody>
      </table>
    `

    const dom = template.content

    transforms.forEach((transform) => transform({ dom, schema }))

    const table = dom.querySelector('table') as HTMLElement | null
    expect(table?.getAttribute('data-type')).not.toBe('grid-table')

    const headerRow = table?.querySelector('thead tr') as HTMLElement | null
    expect(headerRow?.getAttribute('data-is-header')).toBe('true')

    const headerCell = table?.querySelector('th[align="center"]') as HTMLElement | null
    expect(headerCell?.style.textAlign).toBe('center')

    template.remove()
  })

  it('promotes tables with merged cells to grid tables when both plugins are active', async () => {
    const editor = await setupEditor(gridTables, gfm)
    cleanupEditor = editor

    const ctx = editor.ctx
    const schema = ctx.get(schemaCtx)
    const transforms = ctx.get(gridTableDomTransformsCtx.key)

    const template = document.createElement('template')
    template.innerHTML = `
      <table>
        <tbody>
          <tr>
            <td rowspan="2" valign="middle">Merged</td>
            <td>Top Right</td>
          </tr>
          <tr>
            <td>Bottom Right</td>
          </tr>
        </tbody>
      </table>
    `

    const dom = template.content

    transforms.forEach((transform) => transform({ dom, schema }))

    const table = dom.querySelector('table') as HTMLElement | null
    expect(table?.getAttribute('data-type')).toBe('grid-table')

    const mergedCell = table?.querySelector('td[rowspan="2"]') as HTMLElement | null
    expect(mergedCell?.getAttribute('data-valign')).toBe('middle')

    template.remove()
  })

  it('promotes ragged tables to grid tables when both plugins are active', async () => {
    const editor = await setupEditor(gridTables, gfm)
    cleanupEditor = editor

    const ctx = editor.ctx
    const schema = ctx.get(schemaCtx)
    const transforms = ctx.get(gridTableDomTransformsCtx.key)

    const template = document.createElement('template')
    template.innerHTML = `
      <table>
        <tbody>
          <tr>
            <td>R1C1</td>
            <td>R1C2</td>
            <td>R1C3</td>
          </tr>
          <tr>
            <td>R2C1</td>
            <td>R2C2</td>
          </tr>
        </tbody>
      </table>
    `

    const dom = template.content

    transforms.forEach((transform) => transform({ dom, schema }))

    const table = dom.querySelector('table') as HTMLElement | null
    expect(table?.getAttribute('data-type')).toBe('grid-table')

    template.remove()
  })

  it('promotes tables when ASCII grid markup lives inside nearby wrappers', async () => {
    const editor = await setupEditor(gridTables, gfm)
    cleanupEditor = editor

    const ctx = editor.ctx
    const schema = ctx.get(schemaCtx)
    const transforms = ctx.get(gridTableDomTransformsCtx.key)

    const hardbreakSpan =
      '<span data-type="hardbreak" data-is-inline="true"> </span>'
    const ascii = [
      '+------+------+',
      '| Foo  | Bar  |',
      '+======+======+',
      '| Baz  | Qux  |',
      '+------+------+',
    ]
      .map((line) => `${line}${hardbreakSpan}`)
      .join('')

    const template = document.createElement('template')
    template.innerHTML = `
      <section class="preview">
        <div class="code-block">
          <p>${ascii}</p>
        </div>
        <div class="table-wrapper">
          <table>
            <tbody>
              <tr>
                <td>R1C1</td>
                <td>R1C2</td>
              </tr>
              <tr>
                <td>R2C1</td>
                <td>R2C2</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    `

    const dom = template.content

    transforms.forEach((transform) => transform({ dom, schema }))

    const table = dom.querySelector('table') as HTMLElement | null
    expect(table?.getAttribute('data-type')).toBe('grid-table')

    template.remove()
  })
})

describe('Grid table serialization promotion', () => {
  let cleanupEditor: Editor | null = null

  afterEach(async () => {
    if (cleanupEditor) {
      await cleanupEditor.destroy()
      cleanupEditor = null
    }
  })

  it('promotes simple gridTable to GFM table during serialization', async () => {
    const editor = await setupEditor(gridTables, gfm)
    cleanupEditor = editor

    const ctx = editor.ctx

    // Simple grid table markdown
    const simpleGridTable = `+--------+-------+
| Fruit  | Color |
+========+=======+
| Apple  | Red   |
| Banana | Yellow|
+--------+-------+`

    const parser = ctx.get(parserCtx)
    const doc = parser(simpleGridTable)

    expect(doc).toBeTruthy()
    if (typeof doc === 'string') throw new Error('Parser returned string')

    // Should parse as gridTable initially
    let hasGridTable = false
    doc.descendants((node) => {
      if (node.type.name === 'gridTable') hasGridTable = true
    })
    expect(hasGridTable).toBe(true)

    // Serialize should produce GFM pipe table (not ASCII grid)
    const serializer = ctx.get(serializerCtx)
    const output = serializer(doc)

    // GFM pipe tables use | separators and --- for header
    expect(output).toContain('|')
    expect(output).toContain('---')
    // Should NOT contain ASCII grid borders
    expect(output).not.toContain('+===')
  })

  it('does not promote gridTable with cell spans', async () => {
    const editor = await setupEditor(gridTables, gfm)
    cleanupEditor = editor

    const ctx = editor.ctx

    // Grid table with colspan
    const gridTableWithSpan = `+--------+-------+
| Fruit  | Color |
+========+=======+
| Apple  | Red   |
+--------+-------+
| Banana         |
+----------------+`

    const parser = ctx.get(parserCtx)
    const doc = parser(gridTableWithSpan)

    expect(doc).toBeTruthy()
    if (typeof doc === 'string') throw new Error('Parser returned string')

    // Serialize should keep as ASCII grid (not promote to GFM)
    const serializer = ctx.get(serializerCtx)
    const output = serializer(doc)

    // Should still be ASCII grid table format
    expect(output).toContain('+===')
    expect(output).toContain('+---')
  })

  it('does not promote gridTable with footer', async () => {
    const editor = await setupEditor(gridTables, gfm)
    cleanupEditor = editor

    const ctx = editor.ctx

    // Grid table with footer section
    const gridTableWithFooter = `+--------+-------+
| Fruit  | Color |
+========+=======+
| Apple  | Red   |
+========+=======+
| Total  | 1     |
+--------+-------+`

    const parser = ctx.get(parserCtx)
    const doc = parser(gridTableWithFooter)

    expect(doc).toBeTruthy()
    if (typeof doc === 'string') throw new Error('Parser returned string')

    // Serialize should keep as ASCII grid
    const serializer = ctx.get(serializerCtx)
    const output = serializer(doc)

    // Should still be ASCII grid table format
    expect(output).toContain('+===')
  })

  it('serializes without errors when GFM loaded before gridTables', async () => {
    const editor = await setupEditor(gfm, gridTables) // GFM first!
    cleanupEditor = editor

    const ctx = editor.ctx

    const simpleGridTable = `+--------+-------+
| Fruit  | Color |
+========+=======+
| Apple  | Red   |
+--------+-------+`

    const parser = ctx.get(parserCtx)
    const doc = parser(simpleGridTable)

    expect(doc).toBeTruthy()
    if (typeof doc === 'string') throw new Error('Parser returned string')

    // This should NOT throw - the bug we're fixing
    const serializer = ctx.get(serializerCtx)
    expect(() => serializer(doc)).not.toThrow()

    const output = serializer(doc)
    expect(output).toBeTruthy()
    expect(typeof output).toBe('string')
  })

  it('preserves cell alignment when promoting to GFM', async () => {
    const editor = await setupEditor(gridTables, gfm)
    cleanupEditor = editor

    const ctx = editor.ctx

    // Grid table with alignment
    const gridTableWithAlign = `+--------:+:-------:+
| Fruit   | Color   |
+=========+=========+
| Apple   | Red     |
+---------+---------+`

    const parser = ctx.get(parserCtx)
    const doc = parser(gridTableWithAlign)

    expect(doc).toBeTruthy()
    if (typeof doc === 'string') throw new Error('Parser returned string')

    const serializer = ctx.get(serializerCtx)
    const output = serializer(doc)

    // GFM table should have alignment markers in separator row
    expect(output).toContain(':---:') // center alignment
    expect(output).toContain('---:')  // right alignment
  })
})
