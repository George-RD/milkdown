---
title: Grid Tables
description: Grid tables plugin for Milkdown with spanning and alignment.
---

Grid tables for Milkdown, powered by @adobe/remark-gridtables. Provides table sections, spanning, horizontal/vertical alignment, and rich markdown inside cells.

## Usage

```ts
import { Editor } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gridTables } from '@milkdown/kit/plugin/gridtables'

Editor.make()
  .use(commonmark)
  .use(gridTables)
  .create()
```

## Commands

- @insertGridTableCommand
- @exitGridTableCommand
- @goToNextGridCellCommand
- @goToPrevGridCellCommand
- @addGridRowAfterCommand
- @addGridRowBeforeCommand
- @deleteGridRowCommand
- @addGridColumnAfterCommand
- @addGridColumnBeforeCommand
- @deleteGridColumnCommand
- @setGridCellAlignCommand
- @setGridCellVAlignCommand
- @mergeGridCellRightCommand
- @splitGridCellCommand

Example:

```ts
import { callCommand } from '@milkdown/kit/utils'
import { insertGridTableCommand } from '@milkdown/kit/plugin/gridtables'

editor.action(callCommand(insertGridTableCommand.key, { rows: 4, cols: 5 }))
```

## Schemas

- @gridTableSchema
- @gridTableHeadSchema
- @gridTableBodySchema
- @gridTableFootSchema
- @gridTableRowSchema
- @gridTableCellSchema

## Keymap

- @gridTableKeymap

## Input Rules

- @gridTableInputRules
