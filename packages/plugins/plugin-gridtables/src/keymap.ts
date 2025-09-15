import { $useKeymap } from '@milkdown/utils'
import { commandsCtx } from '@milkdown/core'

import { withMeta } from './__internal__'
import {
  goToNextGridCellCommand,
  goToPrevGridCellCommand,
  exitGridTableCommand,
  addGridRowAfterCommand,
} from './commands'

/// Keymap for grid table navigation and manipulation
export const gridTableKeymap = $useKeymap('gridTableKeymap', {
  /// Navigate to next cell with Tab
  NextGridCell: {
    shortcuts: 'Tab',
    command: (ctx) => {
      const commands = ctx.get(commandsCtx)
      return () => commands.call(goToNextGridCellCommand.key)
    },
  },

  /// Navigate to previous cell with Shift-Tab
  PrevGridCell: {
    shortcuts: 'Shift-Tab',
    command: (ctx) => {
      const commands = ctx.get(commandsCtx)
      return () => commands.call(goToPrevGridCellCommand.key)
    },
  },

  /// Exit table and create new paragraph with Mod-Enter
  ExitGridTable: {
    shortcuts: 'Mod-Enter',
    command: (ctx) => {
      const commands = ctx.get(commandsCtx)
      return () => commands.call(exitGridTableCommand.key)
    },
  },

  /// Add new row with Enter at end of last cell
  AddRowAfter: {
    shortcuts: 'Mod-Shift-Enter',
    command: (ctx) => {
      const commands = ctx.get(commandsCtx)
      return () => commands.call(addGridRowAfterCommand.key)
    },
  },
})

withMeta(gridTableKeymap.ctx, {
  displayName: 'KeymapCtx<GridTable>',
  group: 'GridTable',
})

withMeta(gridTableKeymap.shortcuts, {
  displayName: 'Keymap<GridTable>',
  group: 'GridTable',
})

// The keymap is included in the main plugin array
