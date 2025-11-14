import type { Ctx } from '@milkdown/ctx'
import type { Selection } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'

import { editorViewCtx } from '@milkdown/core'
import { browser } from '@milkdown/prose'
import { NodeSelection } from '@milkdown/prose/state'
import { throttle } from 'lodash-es'

import type { FilterNodes } from './block-config'
import type { ActiveNode } from './types'

import { selectRootNodeByDom } from './__internal__/select-node-by-dom'
import { blockConfig } from './block-config'

const brokenClipboardAPI =
  (browser.ie && <number>browser.ie_version < 15) ||
  (browser.ios && browser.webkit_version < 604)

const buffer = 20

/// @internal
export type BlockServiceMessageType =
  | {
      type: 'hide'
    }
  | {
      type: 'show'
      active: ActiveNode
    }

/// @internal
export type BlockServiceMessage = (message: BlockServiceMessageType) => void

/// @internal
/// The block service, provide events and methods for block plugin.
/// Generally you don't need to use this class directly.
export class BlockService {
  /// @internal
  #ctx?: Ctx

  /// @internal
  #createSelection: () => null | Selection = () => {
    if (!this.#active) return null
    const result = this.#active
    const view = this.#view

    if (view && NodeSelection.isSelectable(result.node)) {
      const nodeSelection = NodeSelection.create(
        view.state.doc,
        result.$pos.pos
      )
      view.dispatch(view.state.tr.setSelection(nodeSelection))
      view.focus()
      this.#activeSelection = nodeSelection
      return nodeSelection
    }
    return null
  }

  /// @internal
  #activeSelection: null | Selection = null
  /// @internal
  #active: null | ActiveNode = null
  /// @internal
  #activeDOMRect: undefined | DOMRect = undefined

  /// @internal
  #dragging = false

  /// @internal
  get #filterNodes(): FilterNodes | undefined {
    try {
      return this.#ctx?.get(blockConfig.key).filterNodes
    } catch {
      return undefined
    }
  }

  /// @internal
  get #view() {
    return this.#ctx?.get(editorViewCtx)
  }

  /// @internal
  #notify?: BlockServiceMessage

  /// @internal
  #hide = () => {
    this.#notify?.({ type: 'hide' })
    this.#active = null
  }

  /// @internal
  #show = (active: ActiveNode) => {
    this.#active = active
    this.#notify?.({ type: 'show', active })
  }

  /// Bind editor context and notify function to the service.
  bind = (ctx: Ctx, notify: BlockServiceMessage) => {
    this.#ctx = ctx
    this.#notify = notify
  }

  /// Add mouse event to the dom.
  addEvent = (dom: HTMLElement) => {
    dom.addEventListener('mousedown', this.#handleMouseDown)
    dom.addEventListener('mouseup', this.#handleMouseUp)
    dom.addEventListener('dragstart', this.#handleDragStart)
  }

  /// Remove mouse event to the dom.
  removeEvent = (dom: HTMLElement) => {
    dom.removeEventListener('mousedown', this.#handleMouseDown)
    dom.removeEventListener('mouseup', this.#handleMouseUp)
    dom.removeEventListener('dragstart', this.#handleDragStart)
  }

  /// Unbind the notify function.
  unBind = () => {
    this.#notify = undefined
  }

  /// @internal
  #handleMouseDown = () => {
    this.#activeDOMRect = this.#active?.el.getBoundingClientRect()
    this.#createSelection()
  }

  /// @internal
  #handleMouseUp = () => {
    if (!this.#dragging) {
      requestAnimationFrame(() => {
        if (!this.#activeDOMRect) return
        this.#view?.focus()
      })

      return
    }
    this.#dragging = false
    this.#activeSelection = null
  }

  /// @internal
  #handleDragStart = (event: DragEvent) => {
    this.#dragging = true

    const view = this.#view
    if (!view) return
    view.dom.dataset.dragging = 'true'

    const selection = this.#activeSelection
    if (event.dataTransfer && selection) {
      const slice = selection.content()
      event.dataTransfer.effectAllowed = 'copyMove'
      const { dom, text } = view.serializeForClipboard(slice)
      event.dataTransfer.clearData()
      event.dataTransfer.setData(
        brokenClipboardAPI ? 'Text' : 'text/html',
        dom.innerHTML
      )
      if (!brokenClipboardAPI) event.dataTransfer.setData('text/plain', text)
      const activeEl = this.#active?.el
      if (activeEl) event.dataTransfer.setDragImage(activeEl, 0, 0)

      view.dragging = {
        slice,
        move: true,
      }
    }
  }

  /// @internal
  keydownCallback = (view: EditorView) => {
    this.#hide()

    this.#dragging = false
    view.dom.dataset.dragging = 'false'
    return false
  }

  /// @internal
  #mousemoveCallback = throttle((view: EditorView, event: MouseEvent) => {
    if (!view.editable) return

    const rect = view.dom.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const mouseX = event.clientX
    const mouseY = event.clientY

    // Check if mouse is within editor bounds (with margin for handle area)
    // The handle is typically positioned to the left of blocks, so we allow
    // a margin to the left of the editor for handle interaction
    const handleMargin = 100 // Approximate width of handle + gap
    const isWithinEditorBounds =
      mouseX >= rect.left - handleMargin &&
      mouseX <= rect.right &&
      mouseY >= rect.top &&
      mouseY <= rect.bottom

    // If mouse is outside editor bounds (including handle area), hide handle
    if (!isWithinEditorBounds) {
      this.#hide()
      return
    }

    // Use actual mouse position for elementFromPoint to detect what's really under the cursor
    // This is critical when moving from cells towards handles - we need to know
    // if we're actually over a table cell or over empty space/handle area
    const dom = view.root.elementFromPoint(mouseX, mouseY)
    
    // Check if the element is the handle itself (handle is outside editor DOM)
    const isHandleElement = dom instanceof Element && 
      (dom.classList.contains('milkdown-block-handle') || 
       dom.closest('.milkdown-block-handle'))
    
    // If mouse is over the handle itself, keep showing the current active block
    if (isHandleElement && this.#active) {
      this.#show(this.#active)
      return
    }
    
    // If elementFromPoint returns null or element is not part of editor DOM, 
    // try with center X to detect the block
    if (!(dom instanceof Element) || !view.dom.contains(dom)) {
      const centerDom = view.root.elementFromPoint(centerX, mouseY)
      if (!(centerDom instanceof Element) || !view.dom.contains(centerDom)) {
        // If we have an active block and mouse is in handle area, keep it visible
        // This prevents handles from disappearing when moving from cells towards handles
        if (this.#active && mouseX < rect.left && mouseX >= rect.left - handleMargin) {
          this.#show(this.#active)
          return
        }
        this.#hide()
        return
      }
    }

    const filterNodes = this.#filterNodes
    if (!filterNodes) return

    // Use center X for posAtCoords to ensure consistent block detection
    // This ensures handles appear consistently on the left side of blocks
    const result = selectRootNodeByDom(
      view,
      { x: centerX, y: mouseY },
      filterNodes
    )

    if (!result) {
      // If we have an active block and mouse is in handle area, keep it visible
      // This prevents handles from disappearing when moving from cells towards handles
      if (this.#active && mouseX < rect.left && mouseX >= rect.left - handleMargin) {
        this.#show(this.#active)
        return
      }
      this.#hide()
      return
    }
    this.#show(result)
  }, 200)

  /// @internal
  mousemoveCallback = (view: EditorView, event: MouseEvent) => {
    if (view.composing || !view.editable) return false

    this.#mousemoveCallback(view, event)

    return false
  }

  /// @internal
  dragoverCallback = (view: EditorView, event: DragEvent) => {
    if (this.#dragging) {
      const root = this.#view?.dom.parentElement
      if (!root) return false

      const hasHorizontalScrollbar = root.scrollHeight > root.clientHeight

      const rootRect = root.getBoundingClientRect()
      if (hasHorizontalScrollbar) {
        if (root.scrollTop > 0 && Math.abs(event.y - rootRect.y) < buffer) {
          const top = root.scrollTop > 10 ? root.scrollTop - 10 : 0
          root.scrollTop = top
          return false
        }
        const totalHeight = Math.round(view.dom.getBoundingClientRect().height)
        const scrollBottom = Math.round(root.scrollTop + rootRect.height)
        if (
          scrollBottom < totalHeight &&
          Math.abs(event.y - (rootRect.height + rootRect.y)) < buffer
        ) {
          const top = root.scrollTop + 10
          root.scrollTop = top
          return false
        }
      }
    }
    return false
  }

  /// @internal
  dragenterCallback = (view: EditorView) => {
    if (!view.dragging) return

    this.#dragging = true
    view.dom.dataset.dragging = 'true'
  }

  /// @internal
  dragleaveCallback = (view: EditorView, event: DragEvent) => {
    const x = event.clientX
    const y = event.clientY
    // if cursor out of the editor
    if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
      this.#active = null
      this.#dragEnd(view)
    }
  }

  /// @internal
  dropCallback = (view: EditorView) => {
    this.#dragEnd(view)

    return false
  }

  /// @internal
  dragendCallback = (view: EditorView) => {
    this.#dragEnd(view)
  }

  /// @internal
  #dragEnd = (view: EditorView) => {
    this.#dragging = false
    view.dom.dataset.dragging = 'false'
  }
}
