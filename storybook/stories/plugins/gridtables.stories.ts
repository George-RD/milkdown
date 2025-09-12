import type { Meta, StoryObj } from '@storybook/html'

import { gridTables } from '@milkdown/kit/plugin/gridtables'
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

const sampleGridTable = `
+----------------+--------+--------+
| Grid Tables    | Are    | Cool   |
+================+========+========+
| col 1 is       | left-  | \$1600 |
| left-aligned   | align  |        |
+----------------+--------+--------+
| col 2 is       | cent-  | \$12   |
| centered       | ered   |        |
+----------------+--------+--------+
| col 3 is right | right- | \$1    |
| aligned        | align  |        |
+----------------+--------+--------+
`

const complexGridTable = `
+-------------------------+--------+--------+--------+
| Header Cell (spans 4)                             |
+=========================+========+========+========+
| **Bold Text**           | *Italic*    | \`code\` |
+-------------------------+--------+--------+--------+
| Multi-line              | Cell    | Cell    | Cell |
| cell with               | 2       | 3       | 4    |
| line breaks             |         |         |      |
+-------------------------+--------+--------+--------+
| - List item 1           | Normal  | Normal  | End  |
| - List item 2           | Cell    | Cell    |      |
+-------------------------+--------+--------+--------+
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
      console.log('Grid Tables Debug - DOM content:', wrapper.innerHTML)
      console.log('Grid Tables Debug - Default value was:', args.defaultValue)
      
      // Check if any tables exist
      const tables = wrapper.querySelectorAll('table')
      console.log('Grid Tables Debug - Tables found:', tables.length)
      tables.forEach((table, i) => {
        console.log(`Table ${i}:`, table.outerHTML)
        // Check if it's a grid table
        if (table.getAttribute('data-type') === 'grid-table') {
          console.log(`✅ Found grid table ${i}`)
        } else {
          console.log(`⚠️  Found regular table ${i}`)
        }
      })
      
      // Check for any text content that might be unparsed markdown
      const textContent = wrapper.textContent
      if (textContent?.includes('+---') || textContent?.includes('+===')) {
        console.log('❌ Grid Tables Debug - Found unparsed grid table markdown in text content')
        console.log('Unparsed content:', textContent.substring(0, 200))
      } else {
        console.log('✅ Grid Tables Debug - No unparsed grid table markdown found')
      }
      
      // Test the editor's transformation capabilities
      const editorValue = editor.action(ctx => ctx.get(defaultValueCtx))
      console.log('Editor value:', editorValue)
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
    defaultValue: 'Try creating a grid table! Type `|grid-table|` or `|grid-table-full|`',
  },
}