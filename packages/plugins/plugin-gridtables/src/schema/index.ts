import type { NodeType } from '@milkdown/prose/model'
// import type { MarkdownNode } from '@milkdown/transformer'

import { $nodeAttr, $nodeSchema } from '@milkdown/utils'

import { withMeta } from '../__internal__'

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
export const gridTableSchema = $nodeSchema('gridTable', (_ctx) => ({
  content: 'gridTableHead? gridTableBody gridTableFoot?',
  group: 'block',
  isolating: true,
  parseDOM: [
    {
      tag: 'table[data-type="grid-table"]',
      priority: 60, // Higher than default (50) to win over GFM table parser
    },
  ],
  toDOM: () => [
    'table',
    {
      'data-type': 'grid-table',
      // Table-level attributes handled by node
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

type GridTableSectionConfig = {
  name: 'gridTableHead' | 'gridTableBody' | 'gridTableFoot'
  htmlTag: 'thead' | 'tbody' | 'tfoot'
  markdownType: 'gtHeader' | 'gtBody' | 'gtFooter'
}

const createGridTableSectionSchema = ({
  name,
  htmlTag,
  markdownType,
}: GridTableSectionConfig) => {
  const schema = $nodeSchema(name, (_ctx) => ({
    content: 'gridTableRow+',
    parseDOM: [
      {
        tag: htmlTag,
        priority: 60, // Higher than default to win over GFM
        getAttrs: (dom) =>
          dom instanceof HTMLElement &&
          dom.closest('table[data-type="grid-table"]')
            ? null
            : false,
      },
    ],
    toDOM: () => [
      htmlTag,
      // Section-level attributes handled by node,
      0,
    ],
    parseMarkdown: {
      match: (node) => node.type === markdownType,
      runner: (state, node, type) => {
        state.openNode(type)
        state.next(node.children)
        state.closeNode()
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === name,
      runner: (state, node) => {
        state.openNode(markdownType)
        state.next(node.content)
        state.closeNode()
      },
    },
  }))

  withMeta(schema.node, {
    displayName: `NodeSchema<${name}>`,
    group: 'GridTable',
  })

  withMeta(schema.ctx, {
    displayName: `NodeSchemaCtx<${name}>`,
    group: 'GridTable',
  })

  return schema
}

/// Schema for grid table head node.
export const gridTableHeadSchema = createGridTableSectionSchema({
  name: 'gridTableHead',
  htmlTag: 'thead',
  markdownType: 'gtHeader',
})

/// HTML attributes for grid table body node.
export const gridTableBodyAttr = $nodeAttr('gridTableBody')

withMeta(gridTableBodyAttr, {
  displayName: 'Attr<gridTableBody>',
  group: 'GridTable',
})

/// Schema for grid table body node.
export const gridTableBodySchema = createGridTableSectionSchema({
  name: 'gridTableBody',
  htmlTag: 'tbody',
  markdownType: 'gtBody',
})

/// HTML attributes for grid table foot node.
export const gridTableFootAttr = $nodeAttr('gridTableFoot')

withMeta(gridTableFootAttr, {
  displayName: 'Attr<gridTableFoot>',
  group: 'GridTable',
})

/// Schema for grid table foot node.
export const gridTableFootSchema = createGridTableSectionSchema({
  name: 'gridTableFoot',
  htmlTag: 'tfoot',
  markdownType: 'gtFooter',
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
  parseDOM: [
    {
      tag: 'tr',
      priority: 60, // Higher than default to win over GFM
      getAttrs: (dom) =>
        dom instanceof HTMLElement &&
        dom.closest('table[data-type="grid-table"]')
          ? null
          : false,
    },
  ],
  toDOM: () => [
    'tr',
    // Row-level attributes handled by node,
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
      priority: 60, // Higher than default to win over GFM
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false
        if (!dom.closest('table[data-type="grid-table"]')) return false

        const alignAttr = dom.getAttribute('data-align') || dom.getAttribute('align')
        const valignAttr =
          dom.getAttribute('data-valign') || dom.getAttribute('valign')

        const styleAlign = dom.style.textAlign || null
        const styleVAlign = dom.style.verticalAlign || null

        return {
          colSpan: parseInt(dom.getAttribute('colspan') || '1', 10),
          rowSpan: parseInt(dom.getAttribute('rowspan') || '1', 10),
          align: alignAttr || styleAlign || null,
          valign: valignAttr || styleVAlign || null,
        }
      },
    },
    {
      tag: 'th',
      priority: 60, // Higher than default to win over GFM
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false
        if (!dom.closest('table[data-type="grid-table"]')) return false

        const alignAttr = dom.getAttribute('data-align') || dom.getAttribute('align')
        const valignAttr =
          dom.getAttribute('data-valign') || dom.getAttribute('valign')

        const styleAlign = dom.style.textAlign || null
        const styleVAlign = dom.style.verticalAlign || null

        return {
          colSpan: parseInt(dom.getAttribute('colspan') || '1', 10),
          rowSpan: parseInt(dom.getAttribute('rowspan') || '1', 10),
          align: alignAttr || styleAlign || null,
          valign: valignAttr || styleVAlign || null,
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
