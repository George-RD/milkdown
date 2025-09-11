import type { NodeType } from '@milkdown/prose/model'
import type { MarkdownNode } from '@milkdown/transformer'

import { $nodeAttr, $nodeSchema } from '@milkdown/utils'

import { withMeta } from './__internal__'

// Grid table alignment types
export type GridTableAlign = 'left' | 'right' | 'center' | 'justify' | null
export type GridTableVAlign = 'top' | 'bottom' | 'middle' | null

/// HTML attributes for grid table node.
export const gridTableAttr = $nodeAttr('gridTable')

withMeta(gridTableAttr, {
  displayName: 'Attr<gridTable>',
  group: 'GridTable',
})

/// Schema for grid table node.
export const gridTableSchema = $nodeSchema('gridTable', (ctx) => ({
  content: 'gridTableHead? gridTableBody gridTableFoot?',
  group: 'block',
  isolating: true,
  parseDOM: [
    {
      tag: 'table[data-type="grid-table"]',
    },
  ],
  toDOM: () => [
    'table',
    {
      'data-type': 'grid-table',
      ...ctx.get(gridTableAttr.key)(),
    },
    0,
  ],
  parseMarkdown: {
    match: (node) => node.type === 'gridTable',
    runner: (state, node, type) => {
      state.openNode(type)
      state.next(node.children)
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'gridTable',
    runner: (state, node) => {
      state.openNode('gridTable')
      state.next(node.content)
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

/// HTML attributes for grid table head node.
export const gridTableHeadAttr = $nodeAttr('gridTableHead')

withMeta(gridTableHeadAttr, {
  displayName: 'Attr<gridTableHead>',
  group: 'GridTable',
})

/// Schema for grid table head node.
export const gridTableHeadSchema = $nodeSchema('gridTableHead', (ctx) => ({
  content: 'gridTableRow+',
  parseDOM: [{ tag: 'thead' }],
  toDOM: () => [
    'thead',
    ctx.get(gridTableHeadAttr.key)(),
    0,
  ],
  parseMarkdown: {
    match: (node) => node.type === 'gtHeader',
    runner: (state, node, type) => {
      state.openNode(type)
      state.next(node.children)
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'gridTableHead',
    runner: (state, node) => {
      state.openNode('gtHeader')
      state.next(node.content)
      state.closeNode()
    },
  },
}))

withMeta(gridTableHeadSchema.node, {
  displayName: 'NodeSchema<gridTableHead>',
  group: 'GridTable',
})

withMeta(gridTableHeadSchema.ctx, {
  displayName: 'NodeSchemaCtx<gridTableHead>',
  group: 'GridTable',
})

/// HTML attributes for grid table body node.
export const gridTableBodyAttr = $nodeAttr('gridTableBody')

withMeta(gridTableBodyAttr, {
  displayName: 'Attr<gridTableBody>',
  group: 'GridTable',
})

/// Schema for grid table body node.
export const gridTableBodySchema = $nodeSchema('gridTableBody', (ctx) => ({
  content: 'gridTableRow+',
  parseDOM: [{ tag: 'tbody' }],
  toDOM: () => [
    'tbody',
    ctx.get(gridTableBodyAttr.key)(),
    0,
  ],
  parseMarkdown: {
    match: (node) => node.type === 'gtBody',
    runner: (state, node, type) => {
      state.openNode(type)
      state.next(node.children)
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'gridTableBody',
    runner: (state, node) => {
      state.openNode('gtBody')
      state.next(node.content)
      state.closeNode()
    },
  },
}))

withMeta(gridTableBodySchema.node, {
  displayName: 'NodeSchema<gridTableBody>',
  group: 'GridTable',
})

withMeta(gridTableBodySchema.ctx, {
  displayName: 'NodeSchemaCtx<gridTableBody>',
  group: 'GridTable',
})

/// HTML attributes for grid table foot node.
export const gridTableFootAttr = $nodeAttr('gridTableFoot')

withMeta(gridTableFootAttr, {
  displayName: 'Attr<gridTableFoot>',
  group: 'GridTable',
})

/// Schema for grid table foot node.
export const gridTableFootSchema = $nodeSchema('gridTableFoot', (ctx) => ({
  content: 'gridTableRow+',
  parseDOM: [{ tag: 'tfoot' }],
  toDOM: () => [
    'tfoot',
    ctx.get(gridTableFootAttr.key)(),
    0,
  ],
  parseMarkdown: {
    match: (node) => node.type === 'gtFooter',
    runner: (state, node, type) => {
      state.openNode(type)
      state.next(node.children)
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'gridTableFoot',
    runner: (state, node) => {
      state.openNode('gtFooter')
      state.next(node.content)
      state.closeNode()
    },
  },
}))

withMeta(gridTableFootSchema.node, {
  displayName: 'NodeSchema<gridTableFoot>',
  group: 'GridTable',
})

withMeta(gridTableFootSchema.ctx, {
  displayName: 'NodeSchemaCtx<gridTableFoot>',
  group: 'GridTable',
})

/// HTML attributes for grid table row node.
export const gridTableRowAttr = $nodeAttr('gridTableRow')

withMeta(gridTableRowAttr, {
  displayName: 'Attr<gridTableRow>',
  group: 'GridTable',
})

/// Schema for grid table row node.
export const gridTableRowSchema = $nodeSchema('gridTableRow', (ctx) => ({
  content: 'gridTableCell+',
  parseDOM: [{ tag: 'tr' }],
  toDOM: () => [
    'tr',
    ctx.get(gridTableRowAttr.key)(),
    0,
  ],
  parseMarkdown: {
    match: (node) => node.type === 'gtRow',
    runner: (state, node, type) => {
      state.openNode(type)
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
  attrs: {
    colSpan: { default: 1, validate: 'number' },
    rowSpan: { default: 1, validate: 'number' },
    align: { default: null, validate: 'string|null' },
    valign: { default: null, validate: 'string|null' },
  },
  parseDOM: [
    {
      tag: 'td',
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false
        
        return {
          colSpan: parseInt(dom.getAttribute('colspan') || '1', 10),
          rowSpan: parseInt(dom.getAttribute('rowspan') || '1', 10),
          align: dom.getAttribute('data-align') || null,
          valign: dom.getAttribute('data-valign') || null,
        }
      },
    },
    {
      tag: 'th',
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false
        
        return {
          colSpan: parseInt(dom.getAttribute('colspan') || '1', 10),
          rowSpan: parseInt(dom.getAttribute('rowspan') || '1', 10),
          align: dom.getAttribute('data-align') || null,
          valign: dom.getAttribute('data-valign') || null,
        }
      },
    },
  ],
  toDOM: (node) => {
    const { colSpan, rowSpan, align, valign } = node.attrs
    const attrs: Record<string, string> = {
      ...ctx.get(gridTableCellAttr.key)(node),
    }

    if (colSpan > 1) attrs.colspan = String(colSpan)
    if (rowSpan > 1) attrs.rowspan = String(rowSpan)
    if (align) {
      attrs['data-align'] = align
      attrs.style = `text-align: ${align}`
    }
    if (valign) {
      attrs['data-valign'] = valign
      attrs.style = (attrs.style || '') + `;vertical-align: ${valign}`
    }

    return ['td', attrs, 0]
  },
  parseMarkdown: {
    match: (node) => node.type === 'gtCell',
    runner: (state, node, type) => {
      const { colSpan = 1, rowSpan = 1, align = null, valign = null } = node
      state.openNode(type, { colSpan, rowSpan, align, valign })
      // Grid table cells can contain full markdown content
      if (node.children && node.children.length > 0) {
        state.next(node.children)
      } else {
        // Create empty paragraph if no content
        state.openNode(state.schema.nodes.paragraph as NodeType)
        state.closeNode()
      }
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'gridTableCell',
    runner: (state, node) => {
      const { colSpan, rowSpan, align, valign } = node.attrs
      state.openNode('gtCell', undefined, {
        colSpan: colSpan > 1 ? colSpan : undefined,
        rowSpan: rowSpan > 1 ? rowSpan : undefined,
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