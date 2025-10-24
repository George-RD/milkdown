import type { Ctx, MilkdownPlugin } from '@milkdown/ctx'
import type { Node as ProseNode, Schema } from '@milkdown/prose/model'
import type { Serializer } from '@milkdown/transformer'
import {
  clipboardDomTransformsCtx,
  registerClipboardDomTransform,
  resetClipboardDomTransforms,
  type ClipboardDomTransform,
} from '@milkdown/plugin-clipboard'

import { serializerCtx, SerializerReady } from '@milkdown/core'
import { $ctx } from '@milkdown/utils'

import { withMeta } from '../__internal__'

/**
 * Signature for DOM transforms that preprocess clipboard HTML before it enters
 * the ProseMirror parser. Transforms can mutate the provided DOM fragment in
 * place to normalize attributes or restructure nodes.
 */
export type TableDomTransform = ClipboardDomTransform

export const gridTableDomTransformsCtx = clipboardDomTransformsCtx

/**
 * Register a DOM transform and return a disposer that removes it when invoked.
 * Delegates to the shared clipboard registry so the clipboard plugin remains
 * unaware of grid table specifics.
 */
export const registerGridTableDomTransform = (
  ctx: Ctx,
  transform: TableDomTransform
) => registerClipboardDomTransform(ctx, transform)

/** Reset all registered DOM transforms — primarily useful for tests. */
export const resetGridTableDomTransforms = (ctx: Ctx): void => {
  resetClipboardDomTransforms(ctx)
}

/**
 * Signature for transforms that run before serializing ProseMirror documents
 * back to markdown. These transforms can return a new document instance to
 * adjust table representations (e.g. promote to GFM) prior to serialization.
 */
export type TableSerializeTransform = (input: {
  doc: ProseNode
  schema: Schema
}) => ProseNode

/** Context key for registered serializer transforms. */
export const GRID_TABLE_SERIALIZE_TRANSFORMS =
  'gridTableSerializeTransforms' as const

/**
 * Context slice storing serializer transforms. Consumers can register hooks via
 * {@link registerGridTableSerializeTransform} to inspect or replace tables
 * before the markdown serializer runs.
 */
export const gridTableSerializeTransformsCtx = $ctx<TableSerializeTransform[]>(
  [],
  GRID_TABLE_SERIALIZE_TRANSFORMS
)

withMeta(gridTableSerializeTransformsCtx, {
  displayName: 'Ctx<gridTableSerializeTransforms>',
  group: 'GridTable',
})

/**
 * Register a serializer transform and return a disposer that removes it.
 */
export const registerGridTableSerializeTransform = (
  ctx: Ctx,
  transform: TableSerializeTransform
): (() => void) => {
  if (!ctx.isInjected(gridTableSerializeTransformsCtx.key)) {
    ctx.inject(gridTableSerializeTransformsCtx.key)
  }

  ctx.update(gridTableSerializeTransformsCtx.key, (existing) => [
    ...existing,
    transform,
  ])

  return () => {
    if (!ctx.isInjected(gridTableSerializeTransformsCtx.key)) return
    ctx.update(gridTableSerializeTransformsCtx.key, (existing) =>
      existing.filter((candidate) => candidate !== transform)
    )
  }
}

/** Reset registered serializer transforms — primarily used by tests. */
export const resetGridTableSerializeTransforms = (ctx: Ctx): void => {
  if (!ctx.isInjected(gridTableSerializeTransformsCtx.key)) return
  ctx.set(gridTableSerializeTransformsCtx.key, [])
}

/** Guard ensuring the DOM fragment can be queried for elements. */
const isDomSearchable = (node: Node): node is DocumentFragment | Element =>
  node instanceof DocumentFragment || node instanceof Element

/** Detect tables that depend on grid-table semantics (spans, valign, etc.). */
const requiresGridTableHandling = (table: HTMLElement): boolean => {
  if (table.getAttribute('data-type') === 'grid-table') return true

  const cells = table.querySelectorAll('th, td')
  for (const cell of cells) {
    if (!(cell instanceof HTMLElement)) continue

    const colSpan = Number.parseInt(cell.getAttribute('colspan') || '1', 10)
    if (Number.isFinite(colSpan) && colSpan > 1) return true

    const rowSpan = Number.parseInt(cell.getAttribute('rowspan') || '1', 10)
    if (Number.isFinite(rowSpan) && rowSpan > 1) return true

    if (cell.hasAttribute('data-valign') || cell.getAttribute('valign')) {
      return true
    }
  }

  let minCellCount = Number.POSITIVE_INFINITY
  let maxCellCount = 0

  table.querySelectorAll('tr').forEach((row) => {
    if (!(row instanceof HTMLElement)) return
    const count = row.querySelectorAll('th, td').length
    if (count === 0) {
      maxCellCount = Math.max(maxCellCount, 0)
      minCellCount = Math.min(minCellCount, 0)
      return
    }
    maxCellCount = Math.max(maxCellCount, count)
    minCellCount = Math.min(minCellCount, count)
  })

  if (minCellCount !== Number.POSITIVE_INFINITY && maxCellCount !== minCellCount) {
    return true
  }

  return false
}

/**
 * Default clipboard transform that performs two responsibilities:
 *
 * 1. When the grid table schema is present without GFM tables, mark incoming
 *    `<table>` elements as grid tables and hoist cell alignment attributes.
 * 2. When both GFM and grid tables are available, annotate header rows so the
 *    GFM parser retains header semantics while grid tables can still read them.
 */
export const gridTableClipboardDomTransform: TableDomTransform = ({
  dom,
  schema,
}) => {
  if (!isDomSearchable(dom)) return

  const gridTableType = schema.nodes['gridTable']
  const gfmTableType = schema.nodes['table']

  const gridEnabled = Boolean(gridTableType)
  const gfmEnabled = Boolean(gfmTableType)

  if (!gridEnabled && !gfmEnabled) return

  dom.querySelectorAll('table').forEach((table) => {
    if (!(table instanceof HTMLElement)) return
    const isGridTable = table.getAttribute('data-type') === 'grid-table'

    const needsGridHandling =
      gridEnabled &&
      (!gfmEnabled || isGridTable || requiresGridTableHandling(table))

    if (needsGridHandling) {
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

    if (gfmEnabled && !needsGridHandling) {
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

      table.querySelectorAll('th, td').forEach((cell) => {
        if (!(cell instanceof HTMLElement)) return
        const alignAttr = cell.getAttribute('align')
        if (alignAttr && !cell.style.textAlign) {
          cell.style.textAlign = alignAttr
        }
        const valignAttr = cell.getAttribute('valign')
        if (valignAttr && !cell.style.verticalAlign) {
          cell.style.verticalAlign = valignAttr
        }
      })
    }
  })
}

/**
 * Plugin that registers the default clipboard transform so the shared
 * clipboard plugin can remain unaware of grid table specifics.
 */
export const gridTableClipboardInterop: MilkdownPlugin = (ctx) => () => {
  const unregister = registerGridTableDomTransform(
    ctx,
    gridTableClipboardDomTransform
  )

  return () => {
    unregister()
  }
}

withMeta(gridTableClipboardInterop, {
  displayName: 'Plugin<gridTableClipboardInterop>',
  group: 'GridTable',
})

const runSerializeTransforms = (
  ctx: Ctx,
  doc: ProseNode
): ProseNode => {
  if (!ctx.isInjected(gridTableSerializeTransformsCtx.key)) return doc

  const transforms = ctx.get(gridTableSerializeTransformsCtx.key)
  const schema = doc.type.schema

  return transforms.reduce<ProseNode>((acc, transform) => {
    try {
      const next = transform({ doc: acc, schema })
      return next ?? acc
    } catch (error) {
      console.warn('[milkdown/grid-table] serialize transform failed', error)
      return acc
    }
  }, doc)
}

/**
 * Plugin that wraps the core serializer so registered transforms can adjust
 * grid table nodes before they are converted to markdown. Promotion to GFM
 * tables will hook into this pipeline in a follow-up.
 */
export const gridTableSerializerInterop: MilkdownPlugin = (ctx) => async () => {
  await ctx.wait(SerializerReady)

  const original = ctx.get(serializerCtx)

  const wrapped: Serializer = (doc) => {
    const transformed = runSerializeTransforms(ctx, doc)
    return original(transformed)
  }

  ctx.update(serializerCtx, () => wrapped)

  return () => {
    if (!ctx.isInjected(serializerCtx)) return

    const current = ctx.get(serializerCtx)
    if (current === wrapped) {
      ctx.update(serializerCtx, () => original)
    }
  }
}

withMeta(gridTableSerializerInterop, {
  displayName: 'Plugin<gridTableSerializerInterop>',
  group: 'GridTable',
})
