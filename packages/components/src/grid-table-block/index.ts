import type { MilkdownPlugin } from '@milkdown/ctx'

import { gridTableBlockConfig } from './config'
import { gfmTableBlockView, gridTableBlockView } from './view'

export * from './view'
export * from './config'
export * from './bridges'

/**
 * Unified table block plugin that handles both GFM and Grid tables.
 *
 * This plugin provides WYSIWYG table manipulation for:
 * - Grid tables (full features: merge/split, vertical alignment, sections)
 * - GFM tables (basic features: alignment, add/delete rows/columns)
 *
 * The appropriate UI controls are shown based on the table type.
 */
export const gridTableBlock: MilkdownPlugin[] = [
  gridTableBlockConfig,
  gridTableBlockView,
  gfmTableBlockView,
]

