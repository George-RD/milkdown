import type { Root } from 'mdast'

import { $remark } from '@milkdown/utils'

import { withMeta } from '../__internal__'

const allowedMarkers = new Set(['*', '_'])
const inlineTypes = new Set(['emphasis', 'strong'])

type MdastNode = {
  type: string
  children?: MdastNode[]
  [key: string]: unknown
}

type MarkerNode = MdastNode & {
  marker?: unknown
}

const normalizeMarkers = (node: MdastNode, insideGtCell: boolean): void => {
  const nextInsideGtCell = insideGtCell || node.type === 'gtCell'

  if (nextInsideGtCell && inlineTypes.has(node.type)) {
    const marker = (node as MarkerNode).marker
    if (typeof marker === 'string' && !allowedMarkers.has(marker)) {
      ;(node as MarkerNode).marker = '*'
    }
  }

  const { children } = node
  if (!Array.isArray(children)) return

  for (const child of children) {
    normalizeMarkers(child, nextInsideGtCell)
  }
}

export const normalizeGridTableInlineMarkers = (tree: Root): void => {
  normalizeMarkers(tree as unknown as MdastNode, false)
}

export const remarkGridTablesNormalizeInline = $remark(
  'remarkGridTablesNormalizeInline',
  () => () => normalizeGridTableInlineMarkers
)

withMeta(remarkGridTablesNormalizeInline.plugin, {
  displayName: 'Remark<remarkGridTablesNormalizeInline>',
  group: 'GridTable',
})

withMeta(remarkGridTablesNormalizeInline.options, {
  displayName: 'RemarkConfig<remarkGridTablesNormalizeInline>',
  group: 'GridTable',
})
