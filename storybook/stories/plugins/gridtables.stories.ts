import type { Meta, StoryObj } from '@storybook/html'

import { callCommand } from '@milkdown/kit/utils'
import {
  gridTables,
  insertGridTableCommand,
  addGridRowAfterCommand,
  addGridColumnBeforeCommand,
  setGridCellAlignCommand,
  setGridCellVAlignCommand,
  mergeGridCellRightCommand,
  splitGridCellCommand,
  exitGridTableCommand,
} from '@milkdown/kit/plugin/gridtables'
import {
  Editor,
  defaultValueCtx,
  editorViewOptionsCtx,
  rootCtx,
} from '@milkdown/kit/core'
import { history } from '@milkdown/kit/plugin/history'
import { listener } from '@milkdown/kit/plugin/listener'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { nord } from '@milkdown/theme-nord'
import { gfm } from '@milkdown/kit/preset/gfm'
import { clipboard } from '@milkdown/kit/plugin/clipboard'

import type { CommonArgs } from '../utils/shadow'

import { setupMilkdown, wrapInShadowWithNord } from '../utils/shadow'

const meta: Meta<CommonArgs> = {
  title: 'Plugins/Grid Tables',
  parameters: {
    docs: {
      description: {
        component: `
Grid Tables plugin for Milkdown implementing advanced table features from @adobe/remark-gridtables.

## Features
- Multi-line cells with text wrapping
- Cell alignment (left, center, right)
- Vertical alignment (top, middle, bottom)
- Cell spanning and merging
- Complex table structures
- Interactive commands for table manipulation
        `,
      },
    },
  },
}

export default meta

type Story = StoryObj<CommonArgs>

// Canonical minimal example (alignment matters)
const sampleGridTable = `
+-------------------+------+
| Table Headings    | Here |
+===================+======+
| cell              | more |
+-------------------+------+
`

// Canonical complex example from adobe/remark-gridtables README
const complexGridTable = `
+-------------------+------+
| Table Headings    | Here |
+--------+----------+------+
| Sub    | Headings | Too  |
+========+=================+
| cell   | column spanning |
| spans  +---------:+------+
| rows   |   normal | cell |
+---v----+:---------------:+
|        | cells can be    |
|        | *formatted*     |
|        | **paragraphs**  |
|        | \`\`\`             |
| multi  | and contain     |
| line   | blocks          |
| cells  | \`\`\`             |
+========+=========:+======+
| footer |    cells |      |
+--------+----------+------+
`

export const Basic: Story = {
  render: (args) => {
    return setupMilkdown([], args, (editor) => {
      editor.use(gfm).use(gridTables).use(clipboard)
    })
  },
  args: {
    defaultValue: sampleGridTable,
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic grid table with standard table structure and formatting.',
      },
    },
  },
}

export const Complex: Story = {
  render: (args) => {
    return setupMilkdown([], args, (editor) => {
      editor.use(gridTables)
    })
  },
  args: {
    defaultValue: complexGridTable,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Complex grid table demonstrating cell spans, alignment, multi-line cells, and formatted content.',
      },
    },
  },
}

export const Empty: Story = {
  render: (args) => {
    return setupMilkdown([], args, (editor) => {
      editor.use(gridTables)
    })
  },
  args: {
    defaultValue:
      'Try pasting a valid ASCII grid table (see Basic/Complex examples above).',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Empty editor ready for grid table input via paste or interactive commands.',
      },
    },
  },
}

export const Interactive: Story = {
  render: (args) => {
    // Create custom setup for interactive toolbar
    const { wrapper, root, shadow } = wrapInShadowWithNord([])
    wrapper.classList.add('milkdown-storybook')

    // Create toolbar container
    const toolbar = document.createElement('div')
    toolbar.style.display = 'flex'
    toolbar.style.flexWrap = 'wrap'
    toolbar.style.gap = '8px'
    toolbar.style.margin = '8px 0'
    toolbar.style.borderBottom = '1px solid var(--color-nord3)'
    toolbar.style.paddingBottom = '8px'
    shadow.appendChild(toolbar)

    // Create markdown container (like setupMilkdown does)
    const markdownContainer = document.createElement('div')
    markdownContainer.classList.add('markdown-container')
    shadow.appendChild(markdownContainer)

    const mkBtn = (label: string, onClick: () => void) => {
      const btn = document.createElement('button')
      btn.textContent = label
      btn.onclick = onClick
      btn.style.padding = '4px 8px'
      btn.style.border = '1px solid var(--color-nord3)'
      btn.style.borderRadius = '4px'
      btn.style.background = 'transparent'
      btn.style.cursor = 'pointer'
      btn.style.fontSize = '12px'
      btn.onmouseenter = () => (btn.style.background = 'var(--color-nord1)')
      btn.onmouseleave = () => (btn.style.background = 'transparent')
      toolbar.appendChild(btn)
      return btn
    }

    // Set up editor similar to setupMilkdown but with gridTables
    const editor = Editor.make()
      .enableInspector(args.enableInspector ?? false)
      .config((ctx) => {
        ctx.set(rootCtx, wrapper)
        ctx.set(defaultValueCtx, args.defaultValue ?? '')
        ctx.set(editorViewOptionsCtx, {
          editable: () => !args.readonly,
        })
      })
      .config(nord)
      .use(listener)
      .use(commonmark)
      .use(gridTables) // Load gridTables after commonmark
      .use(history)

    // Wire up buttons after editor creation
    editor
      .create()
      .then(() => {
        args.instance = editor

        mkBtn('Insert 3x3', () => {
          args.instance.action(callCommand(insertGridTableCommand.key))
        })
        mkBtn('Insert 4x5 + footer', () => {
          args.instance.action(
            callCommand(insertGridTableCommand.key, {
              rows: 4,
              cols: 5,
              hasHeader: true,
              hasFooter: true,
            })
          )
        })

        mkBtn('Row: Add After', () => {
          args.instance.action(callCommand(addGridRowAfterCommand.key))
        })
        mkBtn('Col: Add Before', () => {
          args.instance.action(callCommand(addGridColumnBeforeCommand.key))
        })

        mkBtn('Align: Left', () => {
          args.instance.action(callCommand(setGridCellAlignCommand.key, 'left'))
        })
        mkBtn('Align: Center', () => {
          args.instance.action(
            callCommand(setGridCellAlignCommand.key, 'center')
          )
        })
        mkBtn('Align: Right', () => {
          args.instance.action(
            callCommand(setGridCellAlignCommand.key, 'right')
          )
        })

        mkBtn('VAlign: Top', () => {
          args.instance.action(callCommand(setGridCellVAlignCommand.key, 'top'))
        })
        mkBtn('VAlign: Middle', () => {
          args.instance.action(
            callCommand(setGridCellVAlignCommand.key, 'middle')
          )
        })
        mkBtn('VAlign: Bottom', () => {
          args.instance.action(
            callCommand(setGridCellVAlignCommand.key, 'bottom')
          )
        })

        mkBtn('Merge Right', () => {
          args.instance.action(callCommand(mergeGridCellRightCommand.key))
        })
        mkBtn('Split Cell', () => {
          args.instance.action(callCommand(splitGridCellCommand.key))
        })

        mkBtn('Exit Table', () => {
          args.instance.action(callCommand(exitGridTableCommand.key))
        })
      })
      .catch(console.error)

    return root
  },
  args: {
    defaultValue: sampleGridTable,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive grid table editor demonstrating all available commands: insert tables, add rows/columns, set alignment, merge/split cells.',
      },
    },
  },
}
