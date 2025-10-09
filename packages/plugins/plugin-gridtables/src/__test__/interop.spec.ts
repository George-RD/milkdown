import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  defaultValueCtx,
  Editor,
  schemaCtx,
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
})
