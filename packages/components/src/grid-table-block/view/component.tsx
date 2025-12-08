import type { Ctx } from '@milkdown/ctx'
import type { Node } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'

import {
  defineComponent,
  Fragment,
  h,
  onMounted,
  ref,
  type Ref,
  type VNodeRef,
} from 'vue'

// @ts-expect-error - h and Fragment are used by JSX with jsx: "preserve", but TypeScript doesn't detect this
// The following variable is intentionally defined to suppress TypeScript errors when using JSX with `jsx: "preserve"` in tsconfig.
// TypeScript does not detect usage of `h` and `Fragment` in JSX unless they are explicitly referenced, which can cause type errors.
// By defining `_jsxRuntime`, we ensure that TypeScript recognizes these imports for JSX transformation, even though the variable is not used directly.
// See: https://github.com/microsoft/TypeScript/issues/37582 for more details.
// If you change the JSX runtime or TypeScript configuration, you may be able to remove this workaround.
const _jsxRuntime = { h, Fragment }

import type { TableCommandBridge } from '../../table-block/types'
import type { CellIndex, DragInfo, Refs } from '../../table-block/view/types'
import type { GridTableBlockConfig } from '../config'

import { Icon } from '../../__internal__/components/icon'
import { usePointerHandlers } from '../../table-block/view/pointer'
import { recoveryStateBetweenUpdate } from '../../table-block/view/utils'
import { useDragHandlers } from './drag'
import { useOperation } from './operation'

type GridTableBlockProps = {
  view: EditorView
  ctx: Ctx
  getPos: () => number | undefined
  config: GridTableBlockConfig
  onMount: (div: Element) => void
  node: Ref<Node>
  bridge: TableCommandBridge
}

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
    onMount: {
      type: Function,
      required: true,
    },
    node: {
      type: Object,
      required: true,
    },
    bridge: {
      type: Object,
      required: true,
    },
  },
  setup({ view, node, ctx, config, onMount, bridge }) {
    const contentWrapperRef = ref<HTMLElement>()
    const contentWrapperFunctionRef: VNodeRef = (div) => {
      if (div == null) return
      if (div instanceof HTMLElement) {
        contentWrapperRef.value = div
        onMount(div)
      } else {
        contentWrapperRef.value = undefined
      }
    }
    const colHandleRef = ref<HTMLDivElement>()
    const rowHandleRef = ref<HTMLDivElement>()
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
      hoverIndex,
      lineHoverIndex,
      dragInfo,
    }

    const { pointerLeave, pointerMove } = usePointerHandlers(refs, view, {
      allowHeaderRowInsertion: true,
    })
    const { dragRow, dragCol } = useDragHandlers(refs, ctx, bridge)
    const {
      onAddRow,
      onAddCol,
      selectCol,
      selectRow,
      deleteRow,
      deleteCol,
      onAlign,
      onVAlign,
      onMergeCell,
      onSplitCell,
    } = useOperation(refs, ctx, bridge)

    onMounted(() => {
      requestAnimationFrame(() => {
        if (view.editable) recoveryStateBetweenUpdate(refs, view, node.value)
      })
    })

    return () => {
      const showVAlign = config.showVAlignControls && bridge.setVAlign
      const showMerge = config.showMergeControls && bridge.mergeCellRight

      return (
        <div
          onDragstart={(e) => e.preventDefault()}
          onDragover={(e) => e.preventDefault()}
          onDragleave={(e) => e.preventDefault()}
          onPointermove={(e) => {
            e.stopPropagation() // Prevent grid table plugin hover handlers
            pointerMove(e)
          }}
          onPointerleave={(e) => {
            e.stopPropagation() // Prevent grid table plugin hover handlers
            pointerLeave()
          }}
          onMouseover={(e) => {
            // Stop mouseover events from reaching the grid table plugin's handlers
            // This prevents conflicting state updates that cause re-renders
            e.stopPropagation()
          }}
          onMouseout={(e) => {
            // Stop mouseout events from reaching the grid table plugin's handlers
            // This prevents conflicting state updates that cause re-renders
            e.stopPropagation()
          }}
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
              {/* Horizontal alignment */}
              <button type="button" onPointerdown={onAlign('left')}>
                <Icon icon={config.renderButton('align_col_left')} />
              </button>
              <button type="button" onPointerdown={onAlign('center')}>
                <Icon icon={config.renderButton('align_col_center')} />
              </button>
              <button type="button" onPointerdown={onAlign('right')}>
                <Icon icon={config.renderButton('align_col_right')} />
              </button>
              {/* Vertical alignment (grid-specific) */}
              {showVAlign && (
                <>
                  <button type="button" onPointerdown={onVAlign('top')}>
                    <Icon icon={config.renderButton('align_col_top')} />
                  </button>
                  <button type="button" onPointerdown={onVAlign('middle')}>
                    <Icon icon={config.renderButton('align_col_middle')} />
                  </button>
                  <button type="button" onPointerdown={onVAlign('bottom')}>
                    <Icon icon={config.renderButton('align_col_bottom')} />
                  </button>
                </>
              )}
              {/* Merge/Split (grid-specific) */}
              {showMerge && (
                <>
                  <button type="button" onPointerdown={onMergeCell}>
                    <Icon icon={config.renderButton('merge_cell')} />
                  </button>
                  <button type="button" onPointerdown={onSplitCell}>
                    <Icon icon={config.renderButton('split_cell')} />
                  </button>
                </>
              )}
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
          <div class="table-wrapper" ref={tableWrapperRef}>
            <div
              data-show="false"
              class="drag-preview"
              data-direction="vertical"
              ref={dragPreviewRef}
            >
              <table>
                <tbody></tbody>
              </table>
            </div>
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
            <table ref={contentWrapperFunctionRef} class="children"></table>
          </div>
        </div>
      )
    }
  },
})

