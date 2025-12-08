import type { Ctx } from '@milkdown/ctx'

import { editorViewCtx } from '@milkdown/core'
import { onMounted, onUnmounted } from 'vue'

import type { TableCommandBridge } from '../types'
import type { CellIndex, Refs } from './types'

import {
  createDragColHandler,
  createDragRowHandler,
} from '../dnd/create-drag-handler'
import { createDragOverHandler } from '../dnd/drag-over-handler'
import {
  computeColHandlePositionByIndex,
  computeRowHandlePositionByIndex,
} from './utils'

export function useDragHandlers(
  refs: Refs,
  ctx: Ctx | undefined,
  bridge: TableCommandBridge | undefined
) {
  const { dragPreviewRef, yLineHandleRef, xLineHandleRef, dragInfo } = refs

  const dragRow = createDragRowHandler(refs, ctx)
  const dragCol = createDragColHandler(refs, ctx)

  const onDragEnd = () => {
    const preview = dragPreviewRef.value
    if (!preview) return

    if (preview.dataset.show === 'false') return

    const previewRoot = preview?.querySelector('tbody')

    while (previewRoot?.firstChild)
      previewRoot?.removeChild(previewRoot.firstChild)

    if (preview) preview.dataset.show = 'false'
  }

  const onDrop = () => {
    const preview = dragPreviewRef.value
    if (!preview) return
    const yHandle = yLineHandleRef.value
    if (!yHandle) return
    const xHandle = xLineHandleRef.value
    if (!xHandle) return
    const info = dragInfo.value
    if (!info) return
    if (!bridge) return
    if (preview.dataset.show === 'false') return
    const colHandle = refs.colHandleRef.value
    if (!colHandle) return
    const rowHandle = refs.rowHandleRef.value
    if (!rowHandle) return

    yHandle.dataset.show = 'false'
    xHandle.dataset.show = 'false'

    if (info.startIndex === info.endIndex) return

    if (info.type === 'col') {
      bridge.selectCol(info.startIndex)
      bridge.moveCol(info.startIndex, info.endIndex)
      const index: CellIndex = [0, info.endIndex]
      computeColHandlePositionByIndex({
        refs,
        index,
      })
    } else {
      bridge.selectRow(info.startIndex)
      bridge.moveRow(info.startIndex, info.endIndex)
      const index: CellIndex = [info.endIndex, 0]
      computeRowHandlePositionByIndex({
        refs,
        index,
      })
    }

    if (ctx) {
      requestAnimationFrame(() => {
        ctx.get(editorViewCtx).focus()
      })
    }
  }
  const onDragOver = createDragOverHandler(refs)

  onMounted(() => {
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragend', onDragEnd)
    window.addEventListener('drop', onDrop)
  })

  onUnmounted(() => {
    window.removeEventListener('dragover', onDragOver)
    window.removeEventListener('dragend', onDragEnd)
    window.removeEventListener('drop', onDrop)
  })

  return {
    dragRow,
    dragCol,
  }
}
