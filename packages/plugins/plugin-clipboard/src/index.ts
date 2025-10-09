import type { Ctx } from '@milkdown/ctx'
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
import { $ctx, $prose } from '@milkdown/utils'

import { isPureText } from './__internal__/is-pure-text'
import { withMeta } from './__internal__/with-meta'

export type ClipboardDomTransform = (input: {
  dom: Node
  schema: Schema
}) => void

export const CLIPBOARD_DOM_TRANSFORMS = 'clipboardDomTransforms' as const

export const clipboardDomTransformsCtx = $ctx<
  ClipboardDomTransform[],
  typeof CLIPBOARD_DOM_TRANSFORMS
>([], CLIPBOARD_DOM_TRANSFORMS)

withMeta(clipboardDomTransformsCtx, {
  displayName: 'Ctx<clipboardDomTransforms>',
  group: 'Clipboard',
})

export const registerClipboardDomTransform = (
  ctx: Ctx,
  transform: ClipboardDomTransform
): (() => void) => {
  if (!ctx.isInjected(clipboardDomTransformsCtx.key)) {
    ctx.inject(clipboardDomTransformsCtx.key)
  }

  ctx.update(clipboardDomTransformsCtx.key, (existing) => [
    ...existing,
    transform,
  ])

  return () => {
    if (!ctx.isInjected(clipboardDomTransformsCtx.key)) return
    ctx.update(clipboardDomTransformsCtx.key, (existing) =>
      existing.filter((candidate) => candidate !== transform)
    )
  }
}

export const resetClipboardDomTransforms = (ctx: Ctx): void => {
  if (!ctx.isInjected(clipboardDomTransformsCtx.key)) return
  ctx.set(clipboardDomTransformsCtx.key, [])
}

const runClipboardDomTransforms = (
  ctx: Ctx,
  dom: Node,
  schema: Schema
): void => {
  if (!ctx.isInjected(clipboardDomTransformsCtx.key)) return

  const transforms = ctx.get(clipboardDomTransformsCtx.key)

  transforms.forEach((transform) => {
    try {
      transform({ dom, schema })
    } catch (error) {
      console.warn('[milkdown/clipboard] DOM transform failed', error)
    }
  })
}

/// The prosemirror plugin for clipboard.
export const clipboard = $prose((ctx) => {
  const schema = ctx.get(schemaCtx)

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

        runClipboardDomTransforms(ctx, dom, schema)

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
