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
import { Editor, defaultValueCtx, editorViewOptionsCtx, rootCtx } from '@milkdown/kit/core'
import { history } from '@milkdown/kit/plugin/history'
import { listener } from '@milkdown/kit/plugin/listener'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { nord } from '@milkdown/theme-nord'

import type { CommonArgs } from '../utils/shadow'

import { wrapInShadowWithNord } from '../utils/shadow'

const meta: Meta<CommonArgs> = {
  title: 'Plugins/Grid Tables',
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

// Custom setup that loads grid tables BEFORE commonmark
function setupGridTablesEditor(styles: string[], args: CommonArgs) {
  const { wrapper, root } = wrapInShadowWithNord(styles)
  
  const editor = Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, wrapper)
      ctx.set(defaultValueCtx, args.defaultValue ?? '')
      ctx.set(editorViewOptionsCtx, {
        editable: () => !args.readonly,
      })
    })
    .config(nord)
    // CRITICAL: gridTables must load before commonmark to parse grid syntax
    .use(gridTables)
    .use(commonmark)
    .use(listener)
    .use(history)

  editor
    .create()
    .then(() => {
      args.instance = editor
      
      // Debug: Check what's in the DOM after creation
      console.warn('Grid Tables Debug - DOM content:', wrapper.innerHTML)
      console.warn('Grid Tables Debug - Default value was:', args.defaultValue)
      
      // Check if any tables exist
      const tables = wrapper.querySelectorAll('table')
      console.warn('Grid Tables Debug - Tables found:', tables.length)
      tables.forEach((table, i) => {
        console.warn(`Table ${i}:`, table.outerHTML)
        // Check if it's a grid table
        if (table.getAttribute('data-type') === 'grid-table') {
          console.warn(`✅ Found grid table ${i}`)
        } else {
          console.warn(`⚠️  Found regular table ${i}`)
        }
      })
      
      // Check for any text content that might be unparsed markdown
      const textContent = wrapper.textContent
      if (textContent?.includes('+---') || textContent?.includes('+===')) {
        console.warn('❌ Grid Tables Debug - Found unparsed grid table markdown in text content')
        console.warn('Unparsed content:', textContent.substring(0, 200))
      } else {
        console.warn('✅ Grid Tables Debug - No unparsed grid table markdown found')
      }
      
      // Test the editor's transformation capabilities
      const editorValue = editor.action(ctx => ctx.get(defaultValueCtx))
      console.warn('Editor value:', editorValue)
    })
    .catch((err) => {
      console.error('❌ Grid Tables Debug - Editor creation failed:', err)
    })

  return root
}

export const Basic: Story = {
  render: (args) => {
    return setupGridTablesEditor([], args)
  },
  args: {
    defaultValue: sampleGridTable,
  },
}

export const Complex: Story = {
  render: (args) => {
    return setupGridTablesEditor([], args)
  },
  args: {
    defaultValue: complexGridTable,
  },
}

export const Empty: Story = {
  render: (args) => {
    return setupGridTablesEditor([], args)
  },
  args: {
    defaultValue: 'Grid tables: try pasting a valid ASCII grid table (see Basic/Complex). Live typing input rules are disabled; slash-menu insertion coming later.',
  },
}

export const Interactive: Story = {
  render: (args) => {
    // Build a small toolbar with command buttons
    const { wrapper, root } = wrapInShadowWithNord([])

    // Editor area
    const editorHost = document.createElement('div')
    wrapper.appendChild(editorHost)

    // Toolbar
    const toolbar = document.createElement('div')
    toolbar.style.display = 'flex'
    toolbar.style.flexWrap = 'wrap'
    toolbar.style.gap = '8px'
    toolbar.style.margin = '8px 0'
    wrapper.prepend(toolbar)

    const mkBtn = (label: string, onClick: () => void) => {
      const btn = document.createElement('button')
      btn.textContent = label
      btn.onclick = onClick
      btn.style.padding = '4px 8px'
      btn.style.border = '1px solid var(--color-nord3)'
      btn.style.borderRadius = '4px'
      btn.style.background = 'transparent'
      btn.style.cursor = 'pointer'
      btn.onmouseenter = () => (btn.style.background = 'var(--color-nord1)')
      btn.onmouseleave = () => (btn.style.background = 'transparent')
      toolbar.appendChild(btn)
      return btn
    }

    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorHost)
        ctx.set(defaultValueCtx, args.defaultValue ?? '')
        ctx.set(editorViewOptionsCtx, { editable: () => !args.readonly })
      })
      .config(nord)
      // Load order: gridTables before commonmark
      .use(gridTables)
      .use(commonmark)
      .use(listener)
      .use(history)

    editor
      .create()
      .then(() => {
        args.instance = editor
      })
      .catch(console.error)

    // Wire buttons once editor is ready
    const ready = setInterval(() => {
      if (!args.instance) return
      clearInterval(ready)

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
        args.instance.action(callCommand(setGridCellAlignCommand.key, 'center'))
      })
      mkBtn('Align: Right', () => {
        args.instance.action(callCommand(setGridCellAlignCommand.key, 'right'))
      })

      mkBtn('VAlign: Top', () => {
        args.instance.action(callCommand(setGridCellVAlignCommand.key, 'top'))
      })
      mkBtn('VAlign: Middle', () => {
        args.instance.action(callCommand(setGridCellVAlignCommand.key, 'middle'))
      })
      mkBtn('VAlign: Bottom', () => {
        args.instance.action(callCommand(setGridCellVAlignCommand.key, 'bottom'))
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
    }, 50)

    return root
  },
  args: {
    defaultValue: sampleGridTable,
  },
}
