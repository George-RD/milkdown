import type { MilkdownPlugin } from '@milkdown/ctx'

import { gridTableBlockConfig } from './config'
import { gridTableBlockView } from './view'

export * from './config'
export * from './view'

export const gridTableBlock: MilkdownPlugin[] = [
  gridTableBlockConfig,
  gridTableBlockView,
]
