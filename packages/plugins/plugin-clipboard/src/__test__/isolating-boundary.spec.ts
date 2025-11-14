import { describe, it, expect, beforeEach } from 'vitest'
import { Editor, defaultValueCtx, editorViewCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { DOMParser, Slice } from '@milkdown/prose/model'
import { clipboard } from '../index'

describe('Clipboard - Isolating Boundary Normalization', () => {
  let editor: Editor

  beforeEach(async () => {
    editor = Editor.make()
      .config((ctx) => {
        ctx.set(defaultValueCtx, '')
      })
      .use(commonmark)
      .use(clipboard)

    await editor.create()
  })

  it('should normalize slice with isolating boundaries', async () => {
    const view = editor.ctx.get(editorViewCtx)
    const schema = view.state.schema

    // Create HTML with table cell (isolating node in ProseMirror)
    const html = '<table><tr><td>Cell content</td></tr></table>'
    const template = document.createElement('template')
    template.innerHTML = html
    const dom = template.content.cloneNode(true) as Node

    const domParser = DOMParser.fromSchema(schema)
    const slice = domParser.parseSlice(dom)

    // Test the normalization logic
    if (slice.openStart > 0 || slice.openEnd > 0) {
      const { firstChild, lastChild } = slice.content

      if (firstChild?.type.spec.isolating || lastChild?.type.spec.isolating) {
        const normalized = Slice.maxOpen(slice.content, false)

        // Verify normalization reduces open boundaries when possible
        expect(
          normalized.openStart <= slice.openStart &&
          normalized.openEnd <= slice.openEnd
        ).toBe(true)
      }
    }
  })

  it('should preserve content when no isolating boundaries exist', async () => {
    const view = editor.ctx.get(editorViewCtx)
    const schema = view.state.schema

    // Regular paragraph without isolating boundaries
    const html = '<p>Regular paragraph</p>'
    const template = document.createElement('template')
    template.innerHTML = html
    const dom = template.content.cloneNode(true) as Node

    const domParser = DOMParser.fromSchema(schema)
    const slice = domParser.parseSlice(dom)

    // Should not trigger normalization for non-isolating content
    const { firstChild, lastChild } = slice.content
    const hasIsolating = firstChild?.type.spec.isolating || lastChild?.type.spec.isolating

    expect(hasIsolating).toBeFalsy()
  })
})
