import type { $Remark } from '@milkdown/utils'

import { $remark } from '@milkdown/utils'
import remarkGridTables from '@adobe/remark-gridtables'

import { withMeta } from './__internal__'

/**
 * Composition-aware remark plugin for grid tables.
 *
 * This creates a proper Milkdown remark plugin that can be used with $remark.
 * The adobe/remark-gridtables plugin handles micromark extension composition internally,
 * so it works correctly when loaded after commonmark/gfm.
 */
export const remarkGridTablesComposed: $Remark<'remarkGridTablesComposed', never> =
  $remark('remarkGridTablesComposed', () => remarkGridTables)

withMeta(remarkGridTablesComposed.plugin, {
  displayName: 'Remark<remarkGridTablesComposed>',
  group: 'GridTable',
})

withMeta(remarkGridTablesComposed.options, {
  displayName: 'RemarkConfig<remarkGridTablesComposed>',
  group: 'GridTable',
})

/**
 * Legacy remark plugin for backward compatibility.
 *
 * This maintains the existing direct adobe/remark-gridtables usage
 * for cases where pre-commonmark loading is required.
 */
export const remarkGridTablesLegacy: $Remark<'remarkGridTablesLegacy', never> =
  $remark('remarkGridTablesLegacy', () => remarkGridTables)

withMeta(remarkGridTablesLegacy.plugin, {
  displayName: 'Remark<remarkGridTablesLegacy>',
  group: 'GridTable',
})

withMeta(remarkGridTablesLegacy.options, {
  displayName: 'RemarkConfig<remarkGridTablesLegacy>',
  group: 'GridTable',
})

