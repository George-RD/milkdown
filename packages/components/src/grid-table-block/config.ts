import { $ctx } from '@milkdown/utils'

import { withMeta } from '../__internal__/meta'

/**
 * Render types for grid table block buttons.
 * Extends the base table-block types with grid-specific actions.
 */
export type GridRenderType =
  // Base table operations (shared with GFM)
  | 'add_row'
  | 'add_col'
  | 'delete_row'
  | 'delete_col'
  | 'align_col_left'
  | 'align_col_center'
  | 'align_col_right'
  | 'col_drag_handle'
  | 'row_drag_handle'
  // Grid-table specific operations
  | 'align_col_top'
  | 'align_col_middle'
  | 'align_col_bottom'
  | 'merge_cell'
  | 'split_cell'

export interface GridTableBlockConfig {
  /**
   * Function to render button content for each action type.
   * Returns a string (text or HTML) to display in the button.
   */
  renderButton: (renderType: GridRenderType) => string

  /**
   * Whether to show vertical alignment controls.
   * @default true
   */
  showVAlignControls: boolean

  /**
   * Whether to show merge/split cell controls.
   * @default true
   */
  showMergeControls: boolean
}

const defaultGridTableBlockConfig: GridTableBlockConfig = {
  renderButton: (renderType) => {
    switch (renderType) {
      case 'add_row':
        return '+'
      case 'add_col':
        return '+'
      case 'delete_row':
        return '-'
      case 'delete_col':
        return '-'
      case 'align_col_left':
        return 'left'
      case 'align_col_center':
        return 'center'
      case 'align_col_right':
        return 'right'
      case 'col_drag_handle':
        return '='
      case 'row_drag_handle':
        return '='
      // Grid-specific
      case 'align_col_top':
        return 'top'
      case 'align_col_middle':
        return 'middle'
      case 'align_col_bottom':
        return 'bottom'
      case 'merge_cell':
        return '⊞'
      case 'split_cell':
        return '⊟'
    }
  },
  showVAlignControls: true,
  showMergeControls: true,
}

export const gridTableBlockConfig = $ctx(
  { ...defaultGridTableBlockConfig },
  'gridTableBlockConfigCtx'
)

withMeta(gridTableBlockConfig, {
  displayName: 'Config<grid-table-block>',
  group: 'GridTableBlock',
})

