import { Editor, defaultValueCtx, editorViewCtx, schemaCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { SerializerState } from '@milkdown/transformer'
import { describe, expect, it } from 'vitest'

import { gridTables, remarkGridTablesNormalizeInline } from '..'
import { normalizeGridTableInlineMarkers } from '../remark-normalize-inline'

type MdastNode = {
  type: string
  children?: MdastNode[]
  marker?: unknown
}

const collectMarkers = (node: MdastNode, markers: string[] = []): string[] => {
  if (node.marker && typeof node.marker === 'string') {
    markers.push(node.marker)
  }

  if (!node.children) return markers

  for (const child of node.children) {
    collectMarkers(child, markers)
  }

  return markers
}

const gridTablesWithoutNormalization = gridTables.filter(
  (plugin) =>
    plugin !== remarkGridTablesNormalizeInline.options &&
    plugin !== remarkGridTablesNormalizeInline.plugin
)

const createEditor = (plugins = gridTables) => {
  const editor = Editor.make()
  editor.use(commonmark).use(plugins)
  return editor
}

describe('remark-gridtables marker offsets', () => {
  it('documents non canonical markers emitted by serializer before normalization', async () => {
    const editor = createEditor(gridTablesWithoutNormalization)
    editor.config((ctx) => {
      ctx.set(
        defaultValueCtx,
        `+----------------+----------------+
| *Inline Em*    | **Inline Str** |
+================+================+
| cell           | content        |
+----------------+----------------+`
      )
    })

    await editor.create()

    try {
      const schema = editor.ctx.get(schemaCtx)
      const view = editor.ctx.get(editorViewCtx)
      const serializer = new SerializerState(schema)
      serializer.run(view.state.doc)
      const mdast = serializer.build() as MdastNode

      const markers = collectMarkers(mdast)

      expect(markers).toEqual(['+', '+'])

      normalizeGridTableInlineMarkers(mdast)

      const normalized = collectMarkers(mdast)

      expect(normalized).toEqual(['*', '*'])
    } finally {
      await editor.destroy()
    }
  })
})
