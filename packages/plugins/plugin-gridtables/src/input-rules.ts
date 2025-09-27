import { InputRule } from '@milkdown/prose/inputrules'
import { $inputRule } from '@milkdown/utils'

import { withMeta } from './__internal__'
import { createGridTable } from './commands'

const GRID_TABLE_DEFAULT_ROWS = 3
const GRID_TABLE_DEFAULT_COLS = 3
const GRID_TABLE_MAX_ROWS = 20
const GRID_TABLE_MAX_COLS = 10

type GridTableRuleOptions = {
  name: 'gridTableInputRule' | 'gridTableFullInputRule'
  pattern: RegExp
  minRows: number
  hasHeader: boolean
  hasFooter: boolean
}

const createGridTableInputRule = ({
  name,
  pattern,
  minRows,
  hasHeader,
  hasFooter,
}: GridTableRuleOptions) => {
  const rule = $inputRule((ctx) => {
    return new InputRule(pattern, (state, match, start, end) => {
      const [, rowsStr, colsStr] = match
      const rows = rowsStr ? parseInt(rowsStr, 10) : GRID_TABLE_DEFAULT_ROWS
      const cols = colsStr ? parseInt(colsStr, 10) : GRID_TABLE_DEFAULT_COLS

      if (
        rows < minRows ||
        rows > GRID_TABLE_MAX_ROWS ||
        cols < 1 ||
        cols > GRID_TABLE_MAX_COLS
      ) {
        return null
      }

      const table = createGridTable(ctx, rows, cols, hasHeader, hasFooter)
      return state.tr.replaceWith(start, end, table)
    })
  })

  withMeta(rule, {
    displayName: `InputRule<${name}>`,
    group: 'GridTable',
  })

  return rule
}

/// Input rule to create a grid table with simple syntax
/// Usage: |grid-table| creates a basic 3x3 grid table
export const gridTableInputRule = createGridTableInputRule({
  name: 'gridTableInputRule',
  pattern: /^\|grid-table(?:\s+(\d+)x(\d+))?\|\s$/,
  minRows: 1,
  hasHeader: true,
  hasFooter: false,
})

/// Input rule for grid table with header and footer
/// Usage: |grid-table-full 4x3| creates a 4x3 table with header and footer
export const gridTableFullInputRule = createGridTableInputRule({
  name: 'gridTableFullInputRule',
  pattern: /^\|grid-table-full(?:\s+(\d+)x(\d+))?\|\s$/,
  minRows: 2,
  hasHeader: true,
  hasFooter: true,
})

/// All grid table input rules
export const gridTableInputRules = [
  gridTableInputRule,
  gridTableFullInputRule,
].flat()
