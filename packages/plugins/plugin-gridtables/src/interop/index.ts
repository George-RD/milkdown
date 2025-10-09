import type { Ctx, MilkdownPlugin } from '@milkdown/ctx'
import type { Schema } from '@milkdown/prose/model'

import { $ctx } from '@milkdown/utils'

import { withMeta } from '../__internal__'

/**
 * Signature for DOM transforms that preprocess clipboard HTML before it enters
 * the ProseMirror parser. Transforms can mutate the provided DOM fragment in
 * place to normalize attributes or restructure nodes.
 */
export type TableDomTransform = (input: {
  dom: Node
  schema: Schema
}) => void

/** Context key for all registered grid table DOM transforms. */
export const GRID_TABLE_DOM_TRANSFORMS = 'gridTableDomTransforms' as const

/**
 * Context slice holding registered DOM transforms. Additional plugins can
 * contribute transforms via {@link registerGridTableDomTransform}.
 */
export const gridTableDomTransformsCtx = $ctx<TableDomTransform[]>(
  [],
  GRID_TABLE_DOM_TRANSFORMS
)

withMeta(gridTableDomTransformsCtx, {
  displayName: 'Ctx<gridTableDomTransforms>',
  group: 'GridTable',
})

/**
 * Register a DOM transform and return a disposer that removes it when invoked.
 */
export const registerGridTableDomTransform = (
  ctx: Ctx,
  transform: TableDomTransform
): (() => void) => {
  if (!ctx.isInjected(gridTableDomTransformsCtx.key)) {
    ctx.inject(gridTableDomTransformsCtx.key)
  }
  ctx.update(gridTableDomTransformsCtx.key, (existing) => [
    ...existing,
    transform,
  ])

  return () => {
    if (!ctx.isInjected(gridTableDomTransformsCtx.key)) return
    ctx.update(gridTableDomTransformsCtx.key, (existing) =>
      existing.filter((candidate) => candidate !== transform)
    )
  }
}

/** Reset all registered DOM transforms — primarily useful for tests. */
export const resetGridTableDomTransforms = (ctx: Ctx): void => {
  if (!ctx.isInjected(gridTableDomTransformsCtx.key)) return
  ctx.set(gridTableDomTransformsCtx.key, [])
}

/** Guard ensuring the DOM fragment can be queried for elements. */
const isDomSearchable = (node: Node): node is DocumentFragment | Element =>
  node instanceof DocumentFragment || node instanceof Element

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

  const shouldUpgradeToGrid = Boolean(gridTableType && !gfmTableType)
  const shouldAnnotateGfm = Boolean(gfmTableType)

  if (!shouldUpgradeToGrid && !shouldAnnotateGfm) return

  dom.querySelectorAll('table').forEach((table) => {
    if (!(table instanceof HTMLElement)) return
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
