import type { Node as ProsemirrorNode, Schema } from '@milkdown/prose/model'

import {
  editorViewOptionsCtx,
  parserCtx,
  schemaCtx,
  serializerCtx,
} from '@milkdown/core'
import { getNodeFromSchema, isTextOnlySlice } from '@milkdown/prose'
import { DOMParser, DOMSerializer, Slice } from '@milkdown/prose/model'
import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state'
import { $prose } from '@milkdown/utils'

import { isPureText } from './__internal__/is-pure-text'
import { withMeta } from './__internal__/with-meta'

const isDomSearchable = (node: Node): node is DocumentFragment | Element =>
  node instanceof DocumentFragment || node instanceof Element

const normalizeClipboardTables = (root: Node, schema: Schema): void => {
  if (!isDomSearchable(root)) return

  const gridTableType = schema.nodes['gridTable']
  const gfmTableType = schema.nodes['table']
  const shouldUpgradeToGrid = Boolean(gridTableType && !gfmTableType)
  const shouldAnnotateGfm = Boolean(gfmTableType)

  if (!shouldUpgradeToGrid && !shouldAnnotateGfm) return

  root.querySelectorAll('table').forEach((table) => {
    const isGridTable = table.getAttribute('data-type') === 'grid-table'

    if (shouldUpgradeToGrid) {
      table.setAttribute('data-type', 'grid-table')

      table.querySelectorAll('th, td').forEach((cell) => {
        if (!(cell instanceof HTMLElement)) return
        if (!cell.hasAttribute('data-align')) {
          const align = cell.getAttribute('align') || cell.style.textAlign
          if (align) cell.setAttribute('data-align', align)
        }
        if (!cell.hasAttribute('data-valign')) {
          const valign = cell.getAttribute('valign') || cell.style.verticalAlign
          if (valign) cell.setAttribute('data-valign', valign)
        }
      })
    }

    if (shouldAnnotateGfm && !isGridTable) {
      const headerRows = table.querySelectorAll('thead tr')
      if (headerRows.length > 0) {
        headerRows.forEach((row) => {
          row.setAttribute('data-is-header', 'true')
        })
      } else {
        const firstRow = table.querySelector('tr')
        const hasHeaderCell = firstRow?.querySelector('th')
        if (firstRow && hasHeaderCell) {
          firstRow.setAttribute('data-is-header', 'true')
        }
      }
    }
  })
}

/// The prosemirror plugin for clipboard.
export const clipboard = $prose((ctx) => {
  // Set editable props for https://github.com/Milkdown/milkdown/issues/190
  ctx.update(editorViewOptionsCtx, (prev) => ({
    ...prev,
    editable: prev.editable ?? (() => true),
  }))

  const key = new PluginKey('MILKDOWN_CLIPBOARD')
  const plugin = new Plugin({
    key,
    props: {
      handlePaste: (view, event) => {
        const schema = ctx.get(schemaCtx)
        const parser = ctx.get(parserCtx)
        const editable = view.props.editable?.(view.state)
        const { clipboardData } = event
        if (!editable || !clipboardData) return false

        const currentNode = view.state.selection.$from.node()
        if (currentNode.type.spec.code) return false

        const text = clipboardData.getData('text/plain')

        // if is copied from vscode, try to create a code block
        const vscodeData = clipboardData.getData('vscode-editor-data')
        if (vscodeData) {
          const data = JSON.parse(vscodeData)
          const language = data?.mode
          if (text && language) {
            const { tr } = view.state
            const codeBlock = getNodeFromSchema('code_block', schema)

            tr.replaceSelectionWith(codeBlock.create({ language }))
              .setSelection(
                TextSelection.near(
                  tr.doc.resolve(Math.max(0, tr.selection.from - 2))
                )
              )
              .insertText(text.replace(/\r\n?/g, '\n'))

            view.dispatch(tr)
            return true
          }
        }

        const html = clipboardData.getData('text/html')
        if (html.length === 0 && text.length === 0) return false

        const domParser = DOMParser.fromSchema(schema)
        let dom: Node
        if (html.length === 0) {
          const slice = parser(text)
          if (!slice || typeof slice === 'string') return false

          dom = DOMSerializer.fromSchema(schema).serializeFragment(
            slice.content
          )
        } else {
          const template = document.createElement('template')
          template.innerHTML = html
          dom = template.content.cloneNode(true)
          template.remove()
        }

        normalizeClipboardTables(dom, schema)

        let slice = domParser.parseSlice(dom)

        if (slice.openStart > 0 || slice.openEnd > 0) {
          const { firstChild, lastChild } = slice.content

          if (firstChild?.type.spec.isolating || lastChild?.type.spec.isolating) {
            const normalized = Slice.maxOpen(slice.content, false)
            if (normalized.openStart < slice.openStart || normalized.openEnd < slice.openEnd) {
              slice = normalized
            }
          }
        }
        const node = isTextOnlySlice(slice)
        if (node) {
          view.dispatch(view.state.tr.replaceSelectionWith(node, true))
          return true
        }

        try {
          view.dispatch(view.state.tr.replaceSelection(slice))
          return true
        } catch {
          return false
        }
      },
      clipboardTextSerializer: (slice) => {
        const schema = ctx.get(schemaCtx)
        const serializer = ctx.get(serializerCtx)
        const isText = isPureText(slice.content.toJSON())
        if (isText)
          return (slice.content as unknown as ProsemirrorNode).textBetween(
            0,
            slice.content.size,
            '\n\n'
          )

        const doc = schema.topNodeType.createAndFill(undefined, slice.content)
        if (!doc) return ''
        const value = serializer(doc)
        return value
      },
    },
  })

  return plugin
})

withMeta(clipboard, { displayName: 'Prose<clipboard>' })
