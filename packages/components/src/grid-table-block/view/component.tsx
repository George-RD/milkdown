import type { Ctx } from '@milkdown/ctx'
import type { Node } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'

import {
  defineComponent,
  ref,
  type VNodeRef,
  h,
  onMounted,
  type Ref,
} from 'vue'

import type { GridTableBlockConfig } from '../config'
import type { CellIndex, DragInfo, Refs } from './types'

import { Icon } from '../../__internal__/components/icon'
import { useDragHandlers } from './drag'
import { useOperation } from './operation'
import { usePointerHandlers } from './pointer'
import { recoveryStateBetweenUpdate } from './utils'

export type GridTableBlockProps = {
  view: EditorView
  ctx: Ctx
  getPos: () => number | undefined
  config: GridTableBlockConfig
  tableDOM: HTMLTableElement
  node: Ref<Node>
}

h

export const GridTableBlock = defineComponent<GridTableBlockProps>({
  props: {
    view: {
      type: Object,
      required: true,
    },
    ctx: {
      type: Object,
      required: true,
    },
    getPos: {
      type: Function,
      required: true,
    },
    config: {
      type: Object,
      required: true,
    },
    tableDOM: {
      type: Object,
      required: true,
    },
    node: {
      type: Object,
      required: true,
    },
  },
  setup({ view, node, ctx, config, tableDOM }) {
    const tableHostRef = ref<HTMLElement>()
    const contentWrapperRef = ref<HTMLTableElement>()
    const tableHostFunctionRef: VNodeRef = (div) => {
      if (!div) return
      if (div instanceof HTMLElement) {
        tableHostRef.value = div
        if (!div.contains(tableDOM)) {
          div.innerHTML = ''
          div.appendChild(tableDOM)
        }
        contentWrapperRef.value = tableDOM
      }
    }

    const colHandleRef = ref<HTMLDivElement>()
    const rowHandleRef = ref<HTMLDivElement>()
    const cellHandleRef = ref<HTMLDivElement>()
    const xLineHandleRef = ref<HTMLDivElement>()
    const yLineHandleRef = ref<HTMLDivElement>()
    const tableWrapperRef = ref<HTMLDivElement>()
    const dragPreviewRef = ref<HTMLDivElement>()
    const hoverIndex = ref<CellIndex>([0, 0])
    const lineHoverIndex = ref<CellIndex>([-1, -1])
    const dragInfo = ref<DragInfo>()

    const refs: Refs = {
      dragPreviewRef,
      tableWrapperRef,
      contentWrapperRef,
      yLineHandleRef,
      xLineHandleRef,
      colHandleRef,
      rowHandleRef,
      cellHandleRef,
      hoverIndex,
      lineHoverIndex,
      dragInfo,
    }

    const { pointerLeave, pointerMove } = usePointerHandlers(refs, view)
    const { dragRow, dragCol } = useDragHandlers(refs, ctx)
    const {
      onAddRow,
      onAddCol,
      selectCol,
      selectRow,
      selectCellHandle,
      deleteRow,
      deleteCol,
      onAlign,
      onVAlign,
      mergeCell,
      splitCell,
    } = useOperation(refs, ctx)

    onMounted(() => {
      requestAnimationFrame(() => {
        if (view.editable) recoveryStateBetweenUpdate(refs, view, node.value)
      })
    })

    return () => {
      return (
        <div
          onDragstart={(e) => e.preventDefault()}
          onDragover={(e) => e.preventDefault()}
          onDragleave={(e) => e.preventDefault()}
          onPointermove={pointerMove}
          onPointerleave={pointerLeave}
        >
          <button
            type="button"
            data-show="false"
            contenteditable="false"
            draggable="true"
            data-role="col-drag-handle"
            class="handle cell-handle"
            onDragstart={dragCol}
            onClick={selectCol}
            onPointerdown={(e: PointerEvent) => e.stopPropagation()}
            onPointermove={(e: PointerEvent) => e.stopPropagation()}
            ref={colHandleRef}
          >
            <Icon icon={config.renderButton('col_drag_handle')} />
            <div
              data-show="false"
              class="button-group"
              onPointermove={(e: PointerEvent) => e.stopPropagation()}
            >
              <button type="button" onPointerdown={onAlign('left')}>
                <Icon icon={config.renderButton('align_col_left')} />
              </button>
              <button type="button" onPointerdown={onAlign('center')}>
                <Icon icon={config.renderButton('align_col_center')} />
              </button>
              <button type="button" onPointerdown={onAlign('right')}>
                <Icon icon={config.renderButton('align_col_right')} />
              </button>
              <button type="button" onPointerdown={onAlign('justify')}>
                <Icon icon={config.renderButton('align_col_justify')} />
              </button>
              <button type="button" onPointerdown={deleteCol}>
                <Icon icon={config.renderButton('delete_col')} />
              </button>
            </div>
          </button>
          <button
            type="button"
            data-show="false"
            contenteditable="false"
            draggable="true"
            data-role="row-drag-handle"
            class="handle cell-handle"
            onDragstart={dragRow}
            onClick={selectRow}
            onPointerdown={(e: PointerEvent) => e.stopPropagation()}
            onPointermove={(e: PointerEvent) => e.stopPropagation()}
            ref={rowHandleRef}
          >
            <Icon icon={config.renderButton('row_drag_handle')} />
            <div
              data-show="false"
              class="button-group"
              onPointermove={(e: PointerEvent) => e.stopPropagation()}
            >
              <button type="button" onPointerdown={deleteRow}>
                <Icon icon={config.renderButton('delete_row')} />
              </button>
            </div>
          </button>
          <button
            type="button"
            data-show="false"
            contenteditable="false"
            data-role="cell-handle"
            class="handle cell-handle"
            onClick={selectCellHandle}
            onPointerdown={(e: PointerEvent) => e.stopPropagation()}
            onPointermove={(e: PointerEvent) => e.stopPropagation()}
            ref={cellHandleRef}
          >
            <Icon icon={config.renderButton('align_cell_middle')} />
            <div
              data-show="false"
              class="button-group"
              onPointermove={(e: PointerEvent) => e.stopPropagation()}
            >
              <button type="button" onPointerdown={onVAlign('top')}>
                <Icon icon={config.renderButton('align_cell_top')} />
              </button>
              <button type="button" onPointerdown={onVAlign('middle')}>
                <Icon icon={config.renderButton('align_cell_middle')} />
              </button>
              <button type="button" onPointerdown={onVAlign('bottom')}>
                <Icon icon={config.renderButton('align_cell_bottom')} />
              </button>
              <button
                type="button"
                data-action="merge"
                onPointerdown={mergeCell}
              >
                <Icon icon={config.renderButton('merge_cell')} />
              </button>
              <button
                type="button"
                data-action="split"
                onPointerdown={splitCell}
              >
                <Icon icon={config.renderButton('split_cell')} />
              </button>
            </div>
          </button>
          <div class="table-wrapper" ref={tableWrapperRef}>
            <div
              data-show="false"
              contenteditable="false"
              data-display-type="tool"
              data-role="x-line-drag-handle"
              class="handle line-handle"
              onPointermove={(e: PointerEvent) => e.stopPropagation()}
              ref={xLineHandleRef}
            >
              <button type="button" onClick={onAddRow} class="add-button">
                <Icon icon={config.renderButton('add_row')} />
              </button>
            </div>
            <div
              data-show="false"
              contenteditable="false"
              data-display-type="tool"
              data-role="y-line-drag-handle"
              class="handle line-handle"
              onPointermove={(e: PointerEvent) => e.stopPropagation()}
              ref={yLineHandleRef}
            >
              <button type="button" onClick={onAddCol} class="add-button">
                <Icon icon={config.renderButton('add_col')} />
              </button>
            </div>
            <div class="table-host" ref={tableHostFunctionRef}></div>
          </div>
        </div>
      )
    }
  },
})
