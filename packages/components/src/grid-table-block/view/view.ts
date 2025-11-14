import type { Ctx } from '@milkdown/ctx'
import type { Node } from '@milkdown/prose/model'
import type {
  EditorView,
  NodeView,
  NodeViewConstructor,
  ViewMutationRecord,
} from '@milkdown/prose/view'

import { findParent } from '@milkdown/prose'
import { TextSelection } from '@milkdown/prose/state'
import { $view } from '@milkdown/utils'
import { gridTableSchema } from '@milkdown/plugin-gridtables'
import { createApp, shallowRef, type App, type ShallowRef } from 'vue'

import { withMeta } from '../../__internal__/meta'
import { gridTableBlockConfig } from '../config'
import { GridTableBlock } from './component'

export class GridTableNodeView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  app: App

  nodeRef: ShallowRef<Node>

  constructor(
    public ctx: Ctx,
    public node: Node,
    public view: EditorView,
    public getPos: () => number | undefined
  ) {
    const dom = document.createElement('div')
    dom.className = 'milkdown-grid-table-block'

    const contentDOM = document.createElement('table')
    contentDOM.setAttribute('data-type', 'grid-table')
    contentDOM.classList.add('content-dom')
    this.contentDOM = contentDOM
    this.nodeRef = shallowRef(node)

    const app = createApp(GridTableBlock, {
      view,
      ctx,
      getPos,
      config: ctx.get(gridTableBlockConfig.key),
      tableDOM: contentDOM,
      node: this.nodeRef,
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
    const cell = findParent((node) => node.type.name === 'gridTableCell')($pos)

    if (!cell) return false

    const { from } = cell
    const selection = TextSelection.near(state.doc.resolve(from + 1))

    if (state.selection.eq(selection)) return false

    requestAnimationFrame(() => {
      dispatch(state.tr.setSelection(selection).scrollIntoView())
    })

    return true
  }

  stopEvent(e: Event) {
    if (e.type === 'drop' || e.type.startsWith('drag')) return true

    if (e.type === 'mousedown' || e.type === 'pointerdown') {
      if (e.target instanceof Element && e.target.closest('button')) return true

      const target = e.target
      if (target instanceof HTMLElement && target.closest('td')) {
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
  }
}

export const gridTableBlockView = $view(
  gridTableSchema.node,
  (ctx): NodeViewConstructor => {
    return (initialNode, view, getPos) => {
      return new GridTableNodeView(ctx, initialNode, view, getPos)
    }
  }
)

withMeta(gridTableBlockView, {
  displayName: 'NodeView<grid-table-block>',
  group: 'GridTableBlock',
})
