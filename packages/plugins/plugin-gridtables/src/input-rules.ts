import { InputRule } from '@milkdown/prose/inputrules'
import { $inputRule } from '@milkdown/utils'

import { withMeta } from './__internal__'
import { createGridTable } from './commands'

/// Input rule to create a grid table with simple syntax
/// Usage: |grid-table| creates a basic 3x3 grid table
export const gridTableInputRule = $inputRule((ctx) => {
  return new InputRule(
    /^\|grid-table(?:\s+(\d+)x(\d+))?\|\s$/,
    (state, match, start, end) => {
      const [, rowsStr, colsStr] = match
      const rows = rowsStr ? parseInt(rowsStr, 10) : 3
      const cols = colsStr ? parseInt(colsStr, 10) : 3
      
      // Validate dimensions
      if (rows < 1 || rows > 20 || cols < 1 || cols > 10) {
        return null
      }

      const table = createGridTable(ctx, rows, cols, true, false)
      return state.tr.replaceWith(start, end, table)
    }
  )
})

withMeta(gridTableInputRule, {
  displayName: 'InputRule<gridTableInputRule>',
  group: 'GridTable',
})

/// Input rule for grid table with header and footer
/// Usage: |grid-table-full 4x3| creates a 4x3 table with header and footer
export const gridTableFullInputRule = $inputRule((ctx) => {
  return new InputRule(
    /^\|grid-table-full(?:\s+(\d+)x(\d+))?\|\s$/,
    (state, match, start, end) => {
      const [, rowsStr, colsStr] = match
      const rows = rowsStr ? parseInt(rowsStr, 10) : 3
      const cols = colsStr ? parseInt(colsStr, 10) : 3
      
      // Validate dimensions
      if (rows < 2 || rows > 20 || cols < 1 || cols > 10) {
        return null
      }

      const table = createGridTable(ctx, rows, cols, true, true)
      return state.tr.replaceWith(start, end, table)
    }
  )
})

withMeta(gridTableFullInputRule, {
  displayName: 'InputRule<gridTableFullInputRule>',
  group: 'GridTable',
})

/// All grid table input rules
export const gridTableInputRules = [
  gridTableInputRule,
  gridTableFullInputRule,
].flat()