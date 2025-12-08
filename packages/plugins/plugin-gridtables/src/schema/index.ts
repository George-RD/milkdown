import type { NodeType } from '@milkdown/prose/model'

import { $nodeAttr, $nodeSchema } from '@milkdown/utils'

import { withMeta } from '../__internal__'

// Grid table alignment types
export type GridTableAlign = 'left' | 'right' | 'center' | 'justify' | null
export type GridTableVAlign = 'top' | 'bottom' | 'middle' | null

/// Section type for grid table rows
export type GridTableSection = 'head' | 'body' | 'foot'

/// HTML attributes for grid table node.
export const gridTableAttr = $nodeAttr('gridTable')

withMeta(gridTableAttr, {
  displayName: 'Attr<gridTable>',
  group: 'GridTable',
})

/// Schema for grid table node.
/// Flat structure: table contains rows directly (like GFM tables).
/// Section info is stored in row attributes, not wrapper nodes.
export const gridTableSchema = $nodeSchema('gridTable', (_ctx) => ({
  content: 'gridTableRow+',
  group: 'block',
  isolating: true,
  tableRole: 'table' as const,
  parseDOM: [
    {
      tag: 'table[data-type="grid-table"]',
      priority: 60,
    },
  ],
  toDOM: () => [
    'table',
    {
      'data-type': 'grid-table',
    },
    0,
  ],
  parseMarkdown: {
    match: (node) => node.type === 'gridTable',
    runner: (state, node, type) => {
      state.openNode(type)
      // Flatten sections: markdown has gridTable -> section -> row -> cell
      // We want: gridTable -> row (with section attr) -> cell
      const children = (node.children || []) as Array<{
        type: string
        children?: Array<{ [key: string]: unknown }>
      }>
      for (const section of children) {
        const sectionType = section.type
        let sectionAttr: GridTableSection = 'body'
        if (sectionType === 'gtHeader') sectionAttr = 'head'
        else if (sectionType === 'gtFooter') sectionAttr = 'foot'

        // Tag each row with its section
        const rows = (section.children || []).map((row) => ({
          ...row,
          section: sectionAttr,
        }))
        state.next(rows as unknown as typeof node.children)
      }
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'gridTable',
    runner: (state, node) => {
      state.openNode('gridTable')
      // Group rows by section for markdown output
      const headRows: (typeof node)[] = []
      const bodyRows: (typeof node)[] = []
      const footRows: (typeof node)[] = []

      node.content.forEach((row) => {
        const section = (row.attrs.section as GridTableSection) || 'body'
        if (section === 'head') headRows.push(row)
        else if (section === 'foot') footRows.push(row)
        else bodyRows.push(row)
      })

      // Output sections in order: head, body, foot
      if (headRows.length > 0) {
        state.openNode('gtHeader')
        headRows.forEach((row) => state.next(row))
        state.closeNode()
      }
      if (bodyRows.length > 0) {
        state.openNode('gtBody')
        bodyRows.forEach((row) => state.next(row))
        state.closeNode()
      }
      if (footRows.length > 0) {
        state.openNode('gtFooter')
        footRows.forEach((row) => state.next(row))
        state.closeNode()
      }
      state.closeNode()
    },
  },
}))

withMeta(gridTableSchema.node, {
  displayName: 'NodeSchema<gridTable>',
  group: 'GridTable',
})

withMeta(gridTableSchema.ctx, {
  displayName: 'NodeSchemaCtx<gridTable>',
  group: 'GridTable',
})

/// HTML attributes for grid table row node.
export const gridTableRowAttr = $nodeAttr('gridTableRow')

withMeta(gridTableRowAttr, {
  displayName: 'Attr<gridTableRow>',
  group: 'GridTable',
})

/// Schema for grid table row node.
export const gridTableRowSchema = $nodeSchema('gridTableRow', (_ctx) => ({
  content: 'gridTableCell+',
  tableRole: 'row' as const,
  attrs: {
    section: { default: 'body' as GridTableSection },
  },
  parseDOM: [
    {
      tag: 'tr',
      priority: 60,
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false
        if (!dom.closest('table[data-type="grid-table"]')) return false

        // Detect section from data attribute or parent element
        let section: GridTableSection = 'body'
        if (dom.dataset.section) {
          section = dom.dataset.section as GridTableSection
        } else {
          const parent = dom.parentElement
          if (parent?.tagName === 'THEAD') section = 'head'
          else if (parent?.tagName === 'TFOOT') section = 'foot'
        }

        return { section }
      },
    },
  ],
  toDOM: (node) => [
    'tr',
    {
      'data-section': node.attrs.section,
    },
    0,
  ],
  parseMarkdown: {
    match: (node) => node.type === 'gtRow',
    runner: (state, node, type) => {
      const section = (node.section as GridTableSection) || 'body'
      state.openNode(type, { section })
      state.next(node.children)
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'gridTableRow',
    runner: (state, node) => {
      state.openNode('gtRow')
      state.next(node.content)
      state.closeNode()
    },
  },
}))

withMeta(gridTableRowSchema.node, {
  displayName: 'NodeSchema<gridTableRow>',
  group: 'GridTable',
})

withMeta(gridTableRowSchema.ctx, {
  displayName: 'NodeSchemaCtx<gridTableRow>',
  group: 'GridTable',
})

/// HTML attributes for grid table cell node.
export const gridTableCellAttr = $nodeAttr('gridTableCell')

withMeta(gridTableCellAttr, {
  displayName: 'Attr<gridTableCell>',
  group: 'GridTable',
})

/// Schema for grid table cell node.
export const gridTableCellSchema = $nodeSchema('gridTableCell', (ctx) => ({
  content: 'block+',
  tableRole: 'cell' as const,
  isolating: true,
  attrs: {
    colspan: { default: 1, validate: 'number' },
    rowspan: { default: 1, validate: 'number' },
    colwidth: { default: null },
    align: { default: null, validate: 'string|null' },
    valign: { default: null, validate: 'string|null' },
  },
  parseDOM: [
    {
      tag: 'td',
      priority: 60,
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false
        if (!dom.closest('table[data-type="grid-table"]')) return false

        const alignAttr =
          dom.getAttribute('data-align') || dom.getAttribute('align')
        const valignAttr =
          dom.getAttribute('data-valign') || dom.getAttribute('valign')

        const styleAlign = dom.style.textAlign || null
        const styleVAlign = dom.style.verticalAlign || null

        const colwidthAttr = dom.getAttribute('data-colwidth')
        const colwidth = colwidthAttr
          ? colwidthAttr.split(',').map((w) => Number(w))
          : null

        return {
          colspan: parseInt(dom.getAttribute('colspan') || '1', 10),
          rowspan: parseInt(dom.getAttribute('rowspan') || '1', 10),
          colwidth,
          align: alignAttr || styleAlign || null,
          valign: valignAttr || styleVAlign || null,
        }
      },
    },
    {
      tag: 'th',
      priority: 60,
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false
        if (!dom.closest('table[data-type="grid-table"]')) return false

        const alignAttr =
          dom.getAttribute('data-align') || dom.getAttribute('align')
        const valignAttr =
          dom.getAttribute('data-valign') || dom.getAttribute('valign')

        const styleAlign = dom.style.textAlign || null
        const styleVAlign = dom.style.verticalAlign || null

        const colwidthAttr = dom.getAttribute('data-colwidth')
        const colwidth = colwidthAttr
          ? colwidthAttr.split(',').map((w) => Number(w))
          : null

        return {
          colspan: parseInt(dom.getAttribute('colspan') || '1', 10),
          rowspan: parseInt(dom.getAttribute('rowspan') || '1', 10),
          colwidth,
          align: alignAttr || styleAlign || null,
          valign: valignAttr || styleVAlign || null,
        }
      },
    },
  ],
  toDOM: (node) => {
    const { colspan, rowspan, colwidth, align, valign } = node.attrs
    const attrs: Record<string, string> = {
      ...ctx.get(gridTableCellAttr.key)(node),
    }

    if (colspan > 1) attrs.colspan = String(colspan)
    if (rowspan > 1) attrs.rowspan = String(rowspan)
    if (colwidth) attrs['data-colwidth'] = colwidth.join(',')

    const styles: string[] = attrs.style
      ? attrs.style
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
    if (align) {
      attrs['data-align'] = align
      styles.push(`text-align: ${align}`)
    }
    if (valign) {
      attrs['data-valign'] = valign
      styles.push(`vertical-align: ${valign}`)
    }
    if (styles.length > 0) {
      attrs.style = styles.join('; ')
    }

    return ['td', attrs, 0]
  },
  parseMarkdown: {
    match: (node) => node.type === 'gtCell',
    runner: (state, node, type) => {
      // Handle inconsistent property naming:
      // - remark-gridtables uses camelCase (colSpan, rowSpan)
      // - markdown-it-gridtables and some legacy/custom parsers may use lowercase (colspan, rowspan)
      // We check both to ensure compatibility with all known sources.
      const colspan = node.colSpan ?? node.colspan ?? 1
      const rowspan = node.rowSpan ?? node.rowspan ?? 1
      const { align = null, valign = null } = node
      state.openNode(type, { colspan, rowspan, align, valign })
      if (node.children && node.children.length > 0) {
        state.next(node.children)
      } else {
        state.openNode(state.schema.nodes.paragraph as NodeType)
        state.closeNode()
      }
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'gridTableCell',
    runner: (state, node) => {
      const { colspan, rowspan, align, valign } = node.attrs
      state.openNode('gtCell', undefined, {
        colSpan: colspan > 1 ? colspan : undefined,
        rowSpan: rowspan > 1 ? rowspan : undefined,
        align: align || undefined,
        valign: valign || undefined,
      })
      state.next(node.content)
      state.closeNode()
    },
  },
}))

withMeta(gridTableCellSchema.node, {
  displayName: 'NodeSchema<gridTableCell>',
  group: 'GridTable',
})

withMeta(gridTableCellSchema.ctx, {
  displayName: 'NodeSchemaCtx<gridTableCell>',
  group: 'GridTable',
})
