import type { Meta, StoryObj } from '@storybook/html'

import type { Editor } from '@milkdown/kit/core'
import { EditorStatus } from '@milkdown/kit/core'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import {
  gridTables,
  insertGridTableCommand,
  exitGridTableCommand,
  goToNextGridCellCommand,
  goToPrevGridCellCommand,
  addGridRowAfterCommand,
  addGridRowBeforeCommand,
  deleteGridRowCommand,
  addGridColumnAfterCommand,
  addGridColumnBeforeCommand,
  deleteGridColumnCommand,
  setGridCellAlignCommand,
  setGridCellVAlignCommand,
  mergeGridCellRightCommand,
  splitGridCellCommand,
} from '@milkdown/kit/plugin/gridtables'
import { gfm } from '@milkdown/kit/preset/gfm'
import { callCommand } from '@milkdown/kit/utils'

import type { CommonArgs } from '../utils/shadow'
import { setupMilkdown } from '../utils/shadow'

const meta: Meta<CommonArgs> = {
  title: 'Plugins/Grid Tables',
  parameters: {
    docs: {
      description: {
        component: `Focused scenarios for validating clipboard + table interop.
Each story differs only by plugin registration order so behaviour regressions are easy to spot.`,
      },
    },
  },
}

export default meta

type Story = StoryObj<CommonArgs>

const gfmTableSample = `| Fruit  | Animal | Vegetable |
| ------ | :----: | --------: |
| Apple  |   Cat  |    Carrot |
| Banana |   Dog  |   Cabbage |
| Cherry |  Horse |    Celery |`

const gridTableSample = `+-------------------+------+
| Table Headings    | Here |
+===================+======+
| cell              | more |
+-------------------+------+`

const complexGridTable = `+-------------------+------+
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
+--------+----------+------+`

const instructions = `Paste the samples below to validate clipboard + table interop.

GFM Table:
${gfmTableSample}

Grid Table:
${gridTableSample}

Complex Grid Table:
${complexGridTable}`

const createPluginOrderStory = (
  label: string,
  plugins: Array<typeof clipboard | typeof gridTables | typeof gfm>
): Story => ({
  name: label,
  render: (args) =>
    setupMilkdown([], args, (editor) => {
      plugins.forEach((plugin) => editor.use(plugin))
    }),
  args: {
    defaultValue: instructions,
  },
  parameters: {
    docs: {
      description: {
        story: `Plugin load order: ${label}`,
      },
    },
  },
})

export const ClipboardGridTables = createPluginOrderStory(
  'clipboard → gridTables',
  [clipboard, gridTables]
)

export const ClipboardGfmGridTables = createPluginOrderStory(
  'clipboard → gfm → gridTables',
  [clipboard, gfm, gridTables]
)

export const ClipboardGridTablesGfm = createPluginOrderStory(
  'clipboard → gridTables → gfm',
  [clipboard, gridTables, gfm]
)

export const GridTablesGfmClipboard = createPluginOrderStory(
  'gridTables → gfm → clipboard',
  [gridTables, gfm, clipboard]
)

export const GfmGridTablesClipboard = createPluginOrderStory(
  'gfm → gridTables → clipboard',
  [gfm, gridTables, clipboard]
)

export const ClipboardGfmOnly = createPluginOrderStory(
  'clipboard → gfm (baseline, no gridTables)',
  [clipboard, gfm]
)

// Default table for command testing
const testTable = `+---+---+---+
| A | B | C |
+===+===+===+
| 1 | 2 | 3 |
+---+---+---+
| 4 | 5 | 6 |
+---+---+---+`

export const CommandTesting: Story = {
  name: 'Command Testing',
  render: (args) => {
    // Create a container that will hold both the control panel and editor
    const container = document.createElement('div')
    container.style.cssText = 'display: flex; flex-direction: column; width: 100%;'

    const root = setupMilkdown([], args, (editor, rootElement, wrapper) => {
      editor.use(gridTables)

      // Wait for editor to be created before adding controls
      editor.onStatusChange((status) => {
        if (status === EditorStatus.Created) {
          const controlPanel = createControlPanel(editor)
          container.insertBefore(controlPanel, container.firstChild)
        }
      })
    })

    // Add the editor root to the container
    container.appendChild(root)

    return container
  },
  args: {
    defaultValue: testTable,
  },
  parameters: {
    docs: {
      description: {
        story: `Interactive command testing interface for grid tables.

**How to use:**
1. Click buttons to test commands
2. Place cursor in table cells first for cell-specific commands
3. Verify results visually in the editor
4. Test edge cases (delete last row, merge/split, etc.)

**Command Categories:**
- **Table Creation**: Insert new tables with custom dimensions
- **Navigation**: Move between cells, exit table
- **Row Operations**: Add/delete rows
- **Column Operations**: Add/delete columns
- **Cell Alignment**: Set horizontal and vertical alignment
- **Cell Merging**: Merge and split cells`,
      },
    },
  },
}

function createSection(title: string, parent: HTMLElement) {
  const section = document.createElement('div')
  section.style.cssText = 'margin-bottom: 16px;'

  const sectionTitle = document.createElement('h4')
  sectionTitle.textContent = title
  sectionTitle.style.cssText = 'margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;'
  section.appendChild(sectionTitle)

  const buttonContainer = document.createElement('div')
  buttonContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px;'
  section.appendChild(buttonContainer)

  parent.appendChild(section)
  return buttonContainer
}

function createButton(text: string, onClick: () => void) {
  const button = document.createElement('button')
  button.textContent = text
  button.style.cssText = `
    padding: 6px 12px;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  `
  button.addEventListener('mouseenter', () => {
    button.style.background = '#f0f0f0'
    button.style.borderColor = '#999'
  })
  button.addEventListener('mouseleave', () => {
    button.style.background = '#fff'
    button.style.borderColor = '#ccc'
  })
  button.addEventListener('click', (e) => {
    e.preventDefault()
    onClick()
  })
  return button
}

function createControlPanel(editor: Editor) {
  const panel = document.createElement('div')
  panel.style.cssText = `
    padding: 16px;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    max-height: 400px;
    overflow-y: auto;
  `

  const title = document.createElement('h3')
  title.textContent = 'Grid Table Commands'
  title.style.cssText = 'margin: 0 0 16px 0; font-size: 16px; font-weight: 600;'
  panel.appendChild(title)

  // Table Creation
  const createSectionContainer = createSection('Table Creation', panel)
  const insertBtn = createButton('Insert Table (3x3)', () => {
    editor.action(callCommand(insertGridTableCommand.key))
  })
  const insertCustomBtn = createButton('Insert Table (4x5, no header)', () => {
    editor.action(
      callCommand(insertGridTableCommand.key, {
        rows: 4,
        cols: 5,
        hasHeader: false,
        hasFooter: false,
      })
    )
  })
  const insertWithFooterBtn = createButton('Insert Table (3x3, with footer)', () => {
    editor.action(
      callCommand(insertGridTableCommand.key, {
        rows: 3,
        cols: 3,
        hasHeader: true,
        hasFooter: true,
      })
    )
  })
  createSectionContainer.appendChild(insertBtn)
  createSectionContainer.appendChild(insertCustomBtn)
  createSectionContainer.appendChild(insertWithFooterBtn)

  // Navigation
  const navSection = createSection('Navigation', panel)
  const nextCellBtn = createButton('Next Cell (Tab)', () => {
    editor.action(callCommand(goToNextGridCellCommand.key))
  })
  const prevCellBtn = createButton('Previous Cell (Shift+Tab)', () => {
    editor.action(callCommand(goToPrevGridCellCommand.key))
  })
  const exitBtn = createButton('Exit Table (Mod+Enter)', () => {
    editor.action(callCommand(exitGridTableCommand.key))
  })
  navSection.appendChild(nextCellBtn)
  navSection.appendChild(prevCellBtn)
  navSection.appendChild(exitBtn)

  // Row Operations
  const rowSection = createSection('Row Operations', panel)
  const addRowAfterBtn = createButton('Add Row After', () => {
    editor.action(callCommand(addGridRowAfterCommand.key))
  })
  const addRowBeforeBtn = createButton('Add Row Before', () => {
    editor.action(callCommand(addGridRowBeforeCommand.key))
  })
  const deleteRowBtn = createButton('Delete Row', () => {
    editor.action(callCommand(deleteGridRowCommand.key))
  })
  rowSection.appendChild(addRowAfterBtn)
  rowSection.appendChild(addRowBeforeBtn)
  rowSection.appendChild(deleteRowBtn)

  // Column Operations
  const colSection = createSection('Column Operations', panel)
  const addColAfterBtn = createButton('Add Column After', () => {
    editor.action(callCommand(addGridColumnAfterCommand.key))
  })
  const addColBeforeBtn = createButton('Add Column Before', () => {
    editor.action(callCommand(addGridColumnBeforeCommand.key))
  })
  const deleteColBtn = createButton('Delete Column', () => {
    editor.action(callCommand(deleteGridColumnCommand.key))
  })
  colSection.appendChild(addColAfterBtn)
  colSection.appendChild(addColBeforeBtn)
  colSection.appendChild(deleteColBtn)

  // Cell Alignment - Horizontal
  const alignHSection = createSection('Cell Alignment (Horizontal)', panel)
  const alignLeftBtn = createButton('Align Left', () => {
    editor.action(callCommand(setGridCellAlignCommand.key, 'left'))
  })
  const alignCenterBtn = createButton('Align Center', () => {
    editor.action(callCommand(setGridCellAlignCommand.key, 'center'))
  })
  const alignRightBtn = createButton('Align Right', () => {
    editor.action(callCommand(setGridCellAlignCommand.key, 'right'))
  })
  const alignJustifyBtn = createButton('Align Justify', () => {
    editor.action(callCommand(setGridCellAlignCommand.key, 'justify'))
  })
  alignHSection.appendChild(alignLeftBtn)
  alignHSection.appendChild(alignCenterBtn)
  alignHSection.appendChild(alignRightBtn)
  alignHSection.appendChild(alignJustifyBtn)

  // Cell Alignment - Vertical
  const alignVSection = createSection('Cell Alignment (Vertical)', panel)
  const valignTopBtn = createButton('Align Top', () => {
    editor.action(callCommand(setGridCellVAlignCommand.key, 'top'))
  })
  const valignMiddleBtn = createButton('Align Middle', () => {
    editor.action(callCommand(setGridCellVAlignCommand.key, 'middle'))
  })
  const valignBottomBtn = createButton('Align Bottom', () => {
    editor.action(callCommand(setGridCellVAlignCommand.key, 'bottom'))
  })
  alignVSection.appendChild(valignTopBtn)
  alignVSection.appendChild(valignMiddleBtn)
  alignVSection.appendChild(valignBottomBtn)

  // Cell Merging
  const mergeSection = createSection('Cell Merging', panel)
  const mergeBtn = createButton('Merge Cell Right', () => {
    editor.action(callCommand(mergeGridCellRightCommand.key))
  })
  const splitBtn = createButton('Split Cell', () => {
    editor.action(callCommand(splitGridCellCommand.key))
  })
  mergeSection.appendChild(mergeBtn)
  mergeSection.appendChild(splitBtn)

  return panel
}
