import { describe, expect, it } from 'vitest'

import { normalizeGridTableInlineMarkers } from '../remark-normalize-inline'

type MdastNode = {
  type: string
  children?: MdastNode[]
  [key: string]: unknown
}

type MarkerNode = MdastNode & {
  marker?: unknown
}

describe('remarkGridTablesNormalizeInline', () => {
  it('removes non canonical markers inside grid table cells', () => {
    const emphasis: MarkerNode = {
      type: 'emphasis',
      marker: '-',
      children: [{ type: 'text', value: 'italics' }],
    }

    const strong: MarkerNode = {
      type: 'strong',
      marker: '+',
      children: [{ type: 'text', value: 'bold' }],
    }

    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'gridTable',
          children: [
            {
              type: 'gtBody',
              children: [
                {
                  type: 'gtRow',
                  children: [
                    {
                      type: 'gtCell',
                      children: [
                        {
                          type: 'paragraph',
                          children: [emphasis, strong],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    normalizeGridTableInlineMarkers(tree)

    expect(emphasis.marker).toBe('*')
    expect(strong.marker).toBe('*')
  })

  it('keeps canonical markers and nodes outside gtCell untouched', () => {
    const insideCell: MarkerNode = {
      type: 'emphasis',
      marker: '*',
      children: [{ type: 'text', value: 'keep me' }],
    }

    const outsideCell: MarkerNode = {
      type: 'strong',
      marker: '+',
      children: [{ type: 'text', value: 'leave me' }],
    }

    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [outsideCell],
        },
        {
          type: 'gridTable',
          children: [
            {
              type: 'gtBody',
              children: [
                {
                  type: 'gtRow',
                  children: [
                    {
                      type: 'gtCell',
                      children: [
                        {
                          type: 'paragraph',
                          children: [insideCell],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    normalizeGridTableInlineMarkers(tree)

    expect(insideCell.marker).toBe('*')
    expect(outsideCell.marker).toBe('+')
  })
})
