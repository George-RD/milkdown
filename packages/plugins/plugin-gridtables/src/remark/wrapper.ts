import type { $Remark } from '@milkdown/utils'

import { $remark } from '@milkdown/utils'
import remarkGridTablesAdobe from '@adobe/remark-gridtables'

import { withMeta } from '../__internal__'

/**
 * Remark plugin for grid tables.
 *
 * This creates a proper Milkdown remark plugin that can be used with $remark.
 * The adobe/remark-gridtables plugin handles micromark extension composition internally,
 * so it works correctly in both loading patterns:
 * - Post-commonmark: .use(commonmark).use(gridTables) (recommended)
 * - Pre-commonmark: .use(gridTables).use(commonmark) (legacy compatibility)
 */
export const remarkGridTables: $Remark<'remarkGridTables', never> = $remark(
  'remarkGridTables',
  () => remarkGridTablesAdobe
)

withMeta(remarkGridTables.plugin, {
  displayName: 'Remark<remarkGridTables>',
  group: 'GridTable',
})

withMeta(remarkGridTables.options, {
  displayName: 'RemarkConfig<remarkGridTables>',
  group: 'GridTable',
})
