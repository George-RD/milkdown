import type { Ctx } from '@milkdown/ctx'
import type { Schema } from '@milkdown/prose/model'

import { createSlice } from '@milkdown/ctx'

/**
 * Grid table compatibility layer scaffolding.
 *
 * Future work will register DOM transforms (paste-time preprocessing) and
 * serialization hooks here so the shared clipboard plugin can stay generic.
 */

// Placeholder signature for DOM transforms that preprocess clipboard HTML.
export type TableDomTransform = (input: {
  dom: Node
  schema: Schema
}) => void

// Slice storing registered DOM transforms. Initial refactor will populate this.
export const tableDomTransformsCtx = createSlice<TableDomTransform[]>(
  [],
  'gridTableDomTransforms'
)

// Helper to register a transform. Real implementation will handle dedupe/lifecycle.
export const registerTableDomTransform = (
  ctx: Ctx,
  transform: TableDomTransform
): void => {
  const current = ctx.get(tableDomTransformsCtx)
  ctx.set(tableDomTransformsCtx, [...current, transform])
}

// Helper to clear transforms; useful for tests and future branch resets.
export const resetTableDomTransforms = (ctx: Ctx): void => {
  ctx.set(tableDomTransformsCtx, [])
}
