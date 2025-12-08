import type { MilkdownPlugin } from '@milkdown/ctx'

import { tableBlockConfig } from './config'
import { tableBlockView } from './view'

export * from './view'
export * from './config'
export * from './types'
export * from './bridges'

/**
 * Table block plugin for GFM tables.
 *
 * **Priority Note**: If `grid-table-block` is also loaded, it will handle
 * GFM tables instead (via `UnifiedTableNodeView`) to provide consistent UX
 * and full grid features. To ensure `grid-table-block` takes precedence,
 * load it **after** `table-block`:
 *
 * ```typescript
 * Editor.make()
 *   .use(tableBlock)      // Registers view for GFM tables
 *   .use(gridTableBlock)  // Replaces view with UnifiedTableNodeView
 * ```
 *
 * When both are present, `grid-table-block`'s view will be used for GFM tables,
 * ensuring grid features (merge, split, v-align) are available even for
 * tables that will serialize as GFM.
 */
export const tableBlock: MilkdownPlugin[] = [tableBlockConfig, tableBlockView]
