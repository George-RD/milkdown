import type { Ctx } from '@milkdown/ctx'
import type { Node } from '@milkdown/prose/model'
import type {
  EditorView,
  NodeView,
  NodeViewConstructor,
  ViewMutationRecord,
} from '@milkdown/prose/view'

import { gridTableSchema } from '@milkdown/plugin-gridtables'
import { tableSchema } from '@milkdown/preset-gfm'
import { findParent } from '@milkdown/prose'
import { NodeSelection, TextSelection } from '@milkdown/prose/state'
import { CellSelection } from '@milkdown/prose/tables'
import { $view } from '@milkdown/utils'
import { createApp, shallowRef, type App, type ShallowRef } from 'vue'

import type { TableCommandBridge } from '../../table-block/types'

import { withMeta } from '../../__internal__/meta'
import { createGfmCommandBridge } from '../../table-block/bridges/gfm-bridge'
import { createGridCommandBridge } from '../bridges'
import { gridTableBlockConfig } from '../config'
import { GridTableBlock } from './component'

type TableType = 'grid' | 'gfm'

/**
 * Unified table node view that works with both GFM and Grid tables.
 * Detects the table type and uses the appropriate command bridge.
 */
export class UnifiedTableNodeView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  app: App

  nodeRef: ShallowRef<Node>
  tableType: TableType

  // For GFM tables, we need to keep a reference to the table wrapper
  private gfmTableWrapper?: HTMLTableElement

  constructor(
    public ctx: Ctx,
    public node: Node,
    public view: EditorView,
    public getPos: () => number | undefined,
    tableType: TableType
  ) {
    this.tableType = tableType

    const dom = document.createElement('div')
    // Use consistent class name for unified styling
    dom.className = 'milkdown-table-block'

    // Create contentDOM based on table type
    let contentDOM: HTMLElement
    if (tableType === 'grid') {
      // Grid tables have <thead>/<tbody>/<tfoot> sections, so contentDOM must be the table itself
      contentDOM = document.createElement('table')
      contentDOM.setAttribute('data-type', 'grid-table')
      contentDOM.classList.add('children')
    } else {
      // GFM tables use tbody as contentDOM, wrapped in a proper table element
      contentDOM = document.createElement('tbody')
    }

    this.contentDOM = contentDOM
    contentDOM.setAttribute('data-content-dom', 'true')
    contentDOM.classList.add('content-dom')
    this.nodeRef = shallowRef(node)

    // Create the appropriate command bridge based on table type
    let bridge: TableCommandBridge
    if (tableType === 'grid') {
      bridge = createGridCommandBridge(ctx, getPos)
    } else {
      bridge = createGfmCommandBridge(ctx, getPos)
    }

    const app = createApp(GridTableBlock, {
      view,
      ctx,
      getPos,
      config: ctx.get(gridTableBlockConfig.key),
      onMount: (wrapper: Element) => {
        if (tableType === 'grid') {
          // For grid tables, append the table contentDOM directly to the wrapper
          wrapper.appendChild(contentDOM)
        } else {
          // For GFM tables, create a proper table wrapper and append tbody inside it
          const tableWrapper = document.createElement('table')
          tableWrapper.classList.add('children')
          tableWrapper.appendChild(contentDOM)
          wrapper.appendChild(tableWrapper)
          this.gfmTableWrapper = tableWrapper
        }
      },
      node: this.nodeRef,
      bridge,
    })
    app.mount(dom)
    this.app = app

    this.dom = dom
  }

  update(node: Node) {
    if (node.type !== this.node.type) return false

    if (node.sameMarkup(this.node) && node.content.eq(this.node.content))
      return false

    this.node = node
    this.nodeRef.value = node

    return true
  }

  #handleClick(event: PointerEvent) {
    const view = this.view
    if (!view.editable) return false

    const { state, dispatch } = view
    const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })

    if (!pos) return false

    const $pos = state.doc.resolve(pos.inside)

    // Find cell based on table type
    const cellTypes =
      this.tableType === 'grid'
        ? ['gridTableCell']
        : ['table_cell', 'table_header']

    const node = findParent((node) => cellTypes.includes(node.type.name))($pos)

    if (!node) return false

    // if the selection is a text selection, and the current node is the same as the node, return false
    if (state.selection instanceof TextSelection) {
      const currentNode = findParent((node) =>
        cellTypes.includes(node.type.name)
      )(state.selection.$from)
      if (currentNode?.node === node.node) return false
    }

    const { from } = node

    const selection = NodeSelection.create(state.doc, from + 1)
    if (state.selection.eq(selection)) return false

    if (state.selection instanceof CellSelection) {
      setTimeout(() => {
        dispatch(state.tr.setSelection(selection).scrollIntoView())
      }, 20)
    } else {
      requestAnimationFrame(() => {
        dispatch(state.tr.setSelection(selection).scrollIntoView())
      })
    }
    return true
  }

  stopEvent(e: Event) {
    if (e.type === 'drop' || e.type.startsWith('drag')) return true

    if (e.type === 'mousedown' || e.type === 'pointerdown') {
      if (e.target instanceof Element && e.target.closest('button')) return true

      const target = e.target
      if (
        target instanceof HTMLElement &&
        (target.closest('th') || target.closest('td'))
      ) {
        const event = e as PointerEvent
        return this.#handleClick(event)
      }
    }

    return false
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    if (!this.dom || !this.contentDOM) return true

    if ((mutation.type as unknown) === 'selection') return false

    if (this.contentDOM === mutation.target && mutation.type === 'attributes')
      return true

    if (this.contentDOM.contains(mutation.target)) return false

    return true
  }

  destroy() {
    this.app.unmount()
    this.dom.remove()
    this.contentDOM.remove()
    this.gfmTableWrapper?.remove()
  }
}

// Legacy export for backward compatibility
export { UnifiedTableNodeView as GridTableNodeView }

/**
 * View for Grid tables
 */
export const gridTableBlockView = $view(
  gridTableSchema.node,
  (ctx): NodeViewConstructor => {
    return (initialNode, view, getPos) => {
      return new UnifiedTableNodeView(ctx, initialNode, view, getPos, 'grid')
    }
  }
)

withMeta(gridTableBlockView, {
  displayName: 'NodeView<grid-table-block>',
  group: 'GridTableBlock',
})

/**
 * View for GFM tables (using the unified component)
 * This allows the grid-table-block to also handle GFM tables.
 */
export const gfmTableBlockView = $view(
  tableSchema.node,
  (ctx): NodeViewConstructor => {
    return (initialNode, view, getPos) => {
      return new UnifiedTableNodeView(ctx, initialNode, view, getPos, 'gfm')
    }
  }
)

withMeta(gfmTableBlockView, {
  displayName: 'NodeView<gfm-table-block>',
  group: 'GridTableBlock',
})
