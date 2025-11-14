import type { Meta, StoryObj } from '@storybook/html'

import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { gridTables } from '@milkdown/kit/plugin/gridtables'
import { gfm } from '@milkdown/kit/preset/gfm'

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
