import { $ctx } from '@milkdown/utils'

import { withMeta } from '../__internal__/meta'

export type RenderType =
  | 'add_row'
  | 'add_col'
  | 'delete_row'
  | 'delete_col'
  | 'align_col_left'
  | 'align_col_center'
  | 'align_col_right'
  | 'align_col_justify'
  | 'align_cell_top'
  | 'align_cell_middle'
  | 'align_cell_bottom'
  | 'merge_cell'
  | 'split_cell'
  | 'col_drag_handle'
  | 'row_drag_handle'

export interface GridTableBlockConfig {
  renderButton: (renderType: RenderType) => string
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
      case 'align_col_justify':
        return 'justify'
      case 'align_cell_top':
        return 'top'
      case 'align_cell_middle':
        return 'middle'
      case 'align_cell_bottom':
        return 'bottom'
      case 'merge_cell':
        return 'merge'
      case 'split_cell':
        return 'split'
      case 'col_drag_handle':
        return '='
      case 'row_drag_handle':
        return '='
    }
  },
}

export const gridTableBlockConfig = $ctx(
  { ...defaultGridTableBlockConfig },
  'gridTableBlockConfigCtx'
)

withMeta(gridTableBlockConfig, {
  displayName: 'Config<grid-table-block>',
  group: 'GridTableBlock',
})
