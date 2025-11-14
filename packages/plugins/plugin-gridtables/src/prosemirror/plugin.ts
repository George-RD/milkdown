// import type { EditorView } from '@milkdown/prose/view'
import type { Node as ProsemirrorNode } from '@milkdown/prose/model'

import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'
import { $prose, $ctx } from '@milkdown/utils'

import { withMeta } from '../__internal__'
// import { gridTableSchema, gridTableCellSchema } from './schema'
// import { isInGridTable } from './commands'

/// Plugin state for grid table enhancements
interface GridTablePluginState {
  decorations: DecorationSet
  hoveredCell: number | null
}

/// Configuration for the grid table plugin
export const gridTablePluginConfig = $ctx(
  {
    enableCellHover: true,
    enableColumnResize: false, // Future feature
    cellHoverClass: 'grid-table-cell-hover',
  },
  'gridTablePluginConfig'
)

withMeta(gridTablePluginConfig, {
  displayName: 'Config<gridTablePluginConfig>',
  group: 'GridTable',
})

/// The main ProseMirror plugin for grid table enhancements
export const gridTableProseMirrorPlugin = $prose((ctx) => {
  const config = ctx.get(gridTablePluginConfig.key)

  return new Plugin<GridTablePluginState>({
    key: new PluginKey('gridTable'),

    state: {
      init() {
        return {
          decorations: DecorationSet.empty,
          hoveredCell: null,
        }
      },

      apply(tr, state) {
        let { decorations, hoveredCell } = state

        // Update decorations if document changed
        if (tr.docChanged) {
          decorations = decorations.map(tr.mapping, tr.doc)
        }

        // Handle meta transactions for hover state
        const newHoveredCell = tr.getMeta('gridTableHover')
        if (newHoveredCell !== undefined) {
          hoveredCell = newHoveredCell
          decorations = updateHoverDecorations(
            tr.doc,
            hoveredCell,
            config.cellHoverClass
          )
        }

        return { decorations, hoveredCell }
      },
    },

    props: {
      decorations(state) {
        return this.getState(state)?.decorations
      },

      handleDOMEvents: {
        mouseover(view, event) {
          if (!config.enableCellHover) return false

          const target = event.target as Element
          const cellElement = target.closest('td, th') as HTMLElement

          if (cellElement && isInGridTableDOM(cellElement)) {
            const pos = view.posAtDOM(cellElement, 0)
            if (pos >= 0) {
              const tr = view.state.tr.setMeta('gridTableHover', pos)
              view.dispatch(tr)
            }
          }

          return false
        },

        mouseout(view, event) {
          if (!config.enableCellHover) return false

          const target = event.target as Element
          const cellElement = target.closest('td, th') as HTMLElement

          if (cellElement && isInGridTableDOM(cellElement)) {
            const tr = view.state.tr.setMeta('gridTableHover', null)
            view.dispatch(tr)
          }

          return false
        },
      },
    },

    view(_editorView) {
      return {
        update(_view, _prevState) {
          // Handle view updates if needed
        },

        destroy() {
          // Cleanup if needed
        },
      }
    },
  })
})

withMeta(gridTableProseMirrorPlugin, {
  displayName: 'Prose<gridTableProseMirrorPlugin>',
  group: 'GridTable',
})

/// Check if a DOM element is within a grid table
function isInGridTableDOM(element: HTMLElement): boolean {
  return !!element.closest('table[data-type="grid-table"]')
}

/// Update hover decorations for grid table cells
function updateHoverDecorations(
  doc: ProsemirrorNode,
  hoveredCellPos: number | null,
  hoverClass: string
): DecorationSet {
  if (hoveredCellPos === null) {
    return DecorationSet.empty
  }

  try {
    const resolvedPos = doc.resolve(hoveredCellPos)
    const cellNode = resolvedPos.parent

    if (cellNode.type.name === 'gridTableCell') {
      const decoration = Decoration.node(
        resolvedPos.before(),
        resolvedPos.after(),
        { class: hoverClass }
      )
      return DecorationSet.create(doc, [decoration])
    }
  } catch (error) {
    // Position might be invalid, return empty decorations
    if (process.env.NODE_ENV === 'development') {
      console.warn('Invalid position for grid table hover decoration:', error)
    }
  }

  return DecorationSet.empty
}

/// All grid table ProseMirror plugins
export const gridTableProseMirrorPlugins = [
  gridTablePluginConfig,
  gridTableProseMirrorPlugin,
].flat()
