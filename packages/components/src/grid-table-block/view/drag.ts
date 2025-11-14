import type { Ctx } from '@milkdown/ctx'

import type { Refs } from './types'

export function useDragHandlers(_refs: Refs, _ctx?: Ctx) {
  const dragRow = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const dragCol = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  return {
    dragRow,
    dragCol,
  }
}
