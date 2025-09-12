# Milkdown Plugin Development Guide

This comprehensive guide covers patterns and best practices for creating Milkdown plugins. Use this alongside the [official documentation](https://milkdown.dev/) to build plugins for the Milkdown ecosystem.

## Quick Navigation

- Start Here: [Plugin Overview](#plugin-architecture-overview)
- Build Plugins: [Patterns](#plugin-development-patterns)
- Parse & Serialize Markdown: [Transformer API](#the-transformer-api)
- Custom Views & Services: [View Plugins](#4-view-plugins-custom-dom-rendering), [Service Plugins](#3-service-plugins-complex-business-logic)
- Styling & Theming: [Theme and Styling](#theme-and-styling-patterns)
- Storybook & Testing: [Storybook](#storybook-guidance) · [Testing](#testing-playbook-unit--e2e)
- Planning & Scoping: [Planning a New Plugin](#planning-a-new-plugin)
- Framework Integrations: [React/Vue](#framework-integration-patterns)
- Debugging: [Inspector & withMeta](#debugging-and-development-tools)

## Plugin Architecture Overview

Milkdown plugins are typically exported as arrays of composable pieces:
```typescript
// Modern plugin pattern (arrays of composables)
export const myPlugin: MilkdownPlugin[] = [
  myAttr,
  mySchema, 
  myCommand,
  myInputRule,
  myKeymap,
].flat()
```

Plugins integrate through Milkdown's dependency injection system using contexts (`$ctx`) and composable utilities.

## Core Imports You'll Need

```typescript
// Essential utilities for all plugin types
import { $ctx, $command, $prose } from '@milkdown/utils'

// For schema-based plugins (nodes/marks)
import { $node, $nodeSchema, $nodeAttr } from '@milkdown/utils'
import { $mark, $markSchema, $markAttr } from '@milkdown/utils'

// For interactive features
import { $inputRule, $useKeymap, $view } from '@milkdown/utils'

// For markdown processing
import { $remark } from '@milkdown/utils'

// Core contexts you'll commonly use
import { commandsCtx, schemaCtx, editorViewCtx } from '@milkdown/core'

// ProseMirror APIs
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { InputRule } from '@milkdown/prose/inputrules'
import type { NodeViewConstructor, MarkViewConstructor } from '@milkdown/prose/view'

// Common debugging utility (add to plugins for better introspection)
import { withMeta } from './__internal__/with-meta'

// Optional: A tiny helper you can copy into your plugin at src/__internal__/with-meta.ts
// See the "withMeta Helper" section below for details.
```

## Plugin Development Patterns

### 1. Block Node Plugins (Adding New Document Structures)

**Use Case**: Creating new block-level elements like custom paragraphs, headers, code blocks, etc.

**Key Components**:
- Node attributes (`$nodeAttr`)
- Node schema with markdown parsing (`$nodeSchema`)
- Commands for creating/manipulating the node (`$command`)
- Input rules for markdown syntax (`$inputRule`)
- Keyboard shortcuts (`$useKeymap`)

**Example Pattern** (based on heading plugin):
```typescript
import { $nodeAttr, $nodeSchema, $command, $inputRule, $useKeymap } from '@milkdown/utils'
import { setBlockType } from '@milkdown/prose/commands'
import { textblockTypeInputRule } from '@milkdown/prose/inputrules'

// 1. Define HTML attributes
export const myBlockAttr = $nodeAttr('myBlock')

withMeta(myBlockAttr, {
  displayName: 'Attr<myBlock>',
  group: 'MyBlock',
})

// 2. Create the node schema
export const myBlockSchema = $nodeSchema('myBlock', (ctx) => ({
  content: 'inline*',        // What can be inside this node
  group: 'block',            // Node group (block/inline)
  defining: true,            // If it defines document structure
  attrs: {                   // Node attributes
    level: { default: 1, validate: 'number' }
  },
  parseDOM: [                // How to parse from HTML
    {
      tag: 'div[data-type="my-block"]',
      getAttrs: (dom) => ({ level: parseInt(dom.dataset.level || '1') })
    }
  ],
  toDOM: (node) => [          // How to render to HTML
    'div', 
    {
      'data-type': 'my-block',
      'data-level': node.attrs.level,
      ...ctx.get(myBlockAttr.key)(node)
    }, 
    0
  ],
  parseMarkdown: {           // How to parse from markdown
    match: ({ type }) => type === 'myCustomBlock',
    runner: (state, node, type) => {
      state.openNode(type, { level: node.level })
      state.next(node.children)
      state.closeNode()
    },
  },
  toMarkdown: {             // How to serialize to markdown
    match: (node) => node.type.name === 'myBlock',
    runner: (state, node) => {
      state.openNode('myCustomBlock', undefined, { level: node.attrs.level })
      // Serialize children
      state.closeNode()
    },
  },
}))

withMeta(myBlockSchema.node, {
  displayName: 'NodeSchema<myBlock>',
  group: 'MyBlock',
})

withMeta(myBlockSchema.ctx, {
  displayName: 'NodeSchemaCtx<myBlock>',
  group: 'MyBlock',
})

// 3. Create commands
export const wrapInMyBlockCommand = $command('WrapInMyBlock', (ctx) => {
  return (level = 1) => setBlockType(myBlockSchema.type(ctx), { level })
})

withMeta(wrapInMyBlockCommand, {
  displayName: 'Command<wrapInMyBlockCommand>',
  group: 'MyBlock',
})

// 4. Add input rules for markdown syntax
export const myBlockInputRule = $inputRule((ctx) => {
  return textblockTypeInputRule(
    /^(?<markers>@{1,6})\s$/,  // Matches @@ syntax
    myBlockSchema.type(ctx),
    (match) => ({ level: match.groups?.markers?.length || 1 })
  )
})

// 5. Define keyboard shortcuts
export const myBlockKeymap = $useKeymap('myBlockKeymap', {
  CreateMyBlock: {
    shortcuts: 'Mod-Shift-B',
    command: (ctx) => {
      const commands = ctx.get(commandsCtx)
      return () => commands.call(wrapInMyBlockCommand.key)
    },
  },
})

withMeta(myBlockKeymap.ctx, {
  displayName: 'KeymapCtx<MyBlock>',
  group: 'MyBlock',
})

withMeta(myBlockKeymap.shortcuts, {
  displayName: 'Keymap<MyBlock>',
  group: 'MyBlock',
})

// 6. Export the complete plugin
export const myBlock = [
  myBlockAttr,
  myBlockSchema, 
  wrapInMyBlockCommand,
  myBlockInputRule,
  myBlockKeymap,
].flat()
```

### 2. Inline Mark Plugins (Adding Text Formatting)

**Use Case**: Creating text formatting like bold, italic, highlights, links, etc.

**Key Components**:
- Mark attributes (`$markAttr`) 
- Mark schema (`$markSchema`)
- Toggle commands (`$command` with `toggleMark`)
- Input rules for markdown syntax (`$inputRule` with `markRule`)

**Example Pattern** (based on emphasis plugin):
```typescript
import { toggleMark } from '@milkdown/prose/commands'
import { markRule } from '@milkdown/prose'
import { $markAttr, $markSchema, $command, $inputRule, $useKeymap } from '@milkdown/utils'

// Import withMeta for debugging metadata
import { withMeta } from '../__internal__'

// 1. Define HTML attributes
export const myMarkAttr = $markAttr('myMark')

withMeta(myMarkAttr, {
  displayName: 'Attr<myMark>',
  group: 'MyMark',
})

// 2. Create the mark schema
export const myMarkSchema = $markSchema('myMark', (ctx) => ({
  attrs: {
    color: { default: 'yellow', validate: 'string' }
  },
  parseDOM: [
    { 
      tag: 'mark',
      getAttrs: (dom) => ({ color: dom.style.backgroundColor || 'yellow' })
    },
  ],
  toDOM: (mark) => [
    'mark', 
    { 
      style: `background-color: ${mark.attrs.color}`,
      ...ctx.get(myMarkAttr.key)(mark) 
    }
  ],
  parseMarkdown: {
    match: (node) => node.type === 'myHighlight',
    runner: (state, node, markType) => {
      state.openMark(markType, { color: node.color })
      state.next(node.children)
      state.closeMark(markType)
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === 'myMark',
    runner: (state, mark) => {
      state.withMark(mark, 'myHighlight', undefined, { 
        color: mark.attrs.color 
      })
    },
  },
}))

withMeta(myMarkSchema.mark, {
  displayName: 'MarkSchema<myMark>',
  group: 'MyMark',
})

withMeta(myMarkSchema.ctx, {
  displayName: 'MarkSchemaCtx<myMark>',
  group: 'MyMark',
})

// 3. Toggle command
export const toggleMyMarkCommand = $command('ToggleMyMark', (ctx) => () => {
  return toggleMark(myMarkSchema.type(ctx), { color: 'yellow' })
})

withMeta(toggleMyMarkCommand, {
  displayName: 'Command<toggleMyMarkCommand>',
  group: 'MyMark',
})

// 4. Input rules for ==text== syntax
export const myMarkInputRule = $inputRule((ctx) => {
  return markRule(
    /==([^=]+)==$/,
    myMarkSchema.type(ctx),
    { getAttr: () => ({ color: 'yellow' }) }
  )
})

// 5. Keyboard shortcuts
export const myMarkKeymap = $useKeymap('myMarkKeymap', {
  ToggleMyMark: {
    shortcuts: 'Mod-Shift-H',
    command: (ctx) => {
      const commands = ctx.get(commandsCtx)
      return () => commands.call(toggleMyMarkCommand.key)
    },
  },
})

withMeta(myMarkKeymap.ctx, {
  displayName: 'KeymapCtx<MyMark>',
  group: 'MyMark',
})

withMeta(myMarkKeymap.shortcuts, {
  displayName: 'Keymap<MyMark>',
  group: 'MyMark',
})

export const myMark = [
  myMarkAttr,
  myMarkSchema,
  toggleMyMarkCommand,
  myMarkInputRule,
  myMarkKeymap,
].flat()
```

### 3. Service Plugins (Complex Business Logic)

**Use Case**: Adding complex functionality like drag-and-drop, tooltips, collaborative editing, etc.

**Key Components**:
- Service factory (`$ctx` returning a function)
- Service instance storage (`$ctx` storing the actual service)
- ProseMirror plugin (`$prose`) for editor integration
- Service classes encapsulating business logic

**Example Pattern** (based on block plugin):
```typescript
import type { Ctx } from '@milkdown/ctx'
import type { EditorView } from '@milkdown/prose/view'
import type { PluginSpec } from '@milkdown/prose/state'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { $ctx, $prose } from '@milkdown/utils'

// 1. Define the service class
export class MyService {
  constructor(private ctx: Ctx) {}
  
  // Service methods
  public handleClick = (view: EditorView, event: MouseEvent) => {
    // Handle click events
    return false
  }
  
  public handleDragStart = (view: EditorView, event: DragEvent) => {
    // Handle drag events
    return false
  }
  
  public destroy() {
    // Cleanup logic
  }
}

// 2. Service factory
export const myService = $ctx(() => new MyService(), 'myService')

// 3. Service instance storage  
export const myServiceInstance = $ctx({} as MyService, 'myServiceInstance')

// 4. Plugin specification for customization
export const mySpec = $ctx<PluginSpec<any>, 'mySpec'>({}, 'mySpec')

// 5. Main plugin with ProseMirror integration
export const myPlugin = $prose((ctx) => {
  const service = ctx.get(myService.key)(ctx)
  ctx.set(myServiceInstance.key, service)
  const spec = ctx.get(mySpec.key)

  return new Plugin({
    key: new PluginKey('MY_PLUGIN'),
    ...spec,
    props: {
      ...spec.props,
      handleDOMEvents: {
        click: service.handleClick,
        dragstart: service.handleDragStart,
      },
    },
    // Plugin can also have state
    state: {
      init: () => ({ active: false }),
      apply: (tr, state) => {
        // Handle state updates
        return state
      }
    }
  })
})

export const myServicePlugin = [
  myService,
  myServiceInstance, 
  mySpec,
  myPlugin,
].flat()
```

### 4. View Plugins (Custom DOM Rendering)

**Use Case**: Custom rendering of nodes/marks with complex DOM structures, React/Vue components, etc.

**Key Components**:
- Node/Mark schema (existing)
- View constructor (`$view`)
- DOM management logic

**Example Pattern**:
```typescript
import { $view } from '@milkdown/utils'
import type { NodeViewConstructor } from '@milkdown/prose/view'

// Assumes you have a node schema already defined
export const myNodeView = $view(myNodeSchema, (ctx): NodeViewConstructor => {
  return (node, view, getPos) => {
    // Create DOM structure
    const dom = document.createElement('div')
    dom.className = 'my-custom-node'
    
    const contentDOM = document.createElement('div')
    contentDOM.className = 'my-node-content'
    dom.appendChild(contentDOM)
    
    // Add interactive elements
    const button = document.createElement('button')
    button.textContent = 'Click me'
    button.onclick = () => {
      // Handle interaction
      const commands = ctx.get(commandsCtx)
      commands.call(someCommand.key)
    }
    dom.appendChild(button)
    
    return {
      dom,
      contentDOM,
      // Optional: handle updates
      update: (node) => {
        // Update view when node changes
        return true
      },
      // Optional: handle selection
      selectNode: () => dom.classList.add('selected'),
      deselectNode: () => dom.classList.remove('selected'),
      // Optional: cleanup
      destroy: () => {
        button.onclick = null
      }
    }
  }
})

export const myCustomNodeWithView = [
  myNodeSchema,
  myNodeView,
].flat()
```

### 5. Syntax/Parser Plugins (Markdown Processing)

**Use Case**: Adding support for new markdown syntax, integrating with remark plugins, custom parsing logic.

**Key Components**:
- Remark plugin integration (`$remark`)
- Schema with custom parsing logic
- Input rules for live editing

**Example Pattern** (based on emoji plugin):
```typescript
import { $remark, $nodeSchema, $inputRule } from '@milkdown/utils'
import { InputRule } from '@milkdown/prose/inputrules'
import { visit } from 'unist-util-visit'

// 1. Integrate with remark ecosystem
export const remarkMyPlugin = $remark('remarkMyPlugin', () => {
  // Return a remark plugin
  return function remarkMyPlugin() {
    return (tree) => {
      // Transform markdown AST
      visit(tree, 'text', (node, index, parent) => {
        // Find and transform custom syntax
        const regex = /\[\[([^\]]+)\]\]/g
        // Replace with custom nodes
      })
    }
  }
})

// 2. Node schema with custom parsing
export const myCustomSchema = $nodeSchema('myCustom', (ctx) => ({
  group: 'inline',
  inline: true,
  atom: true,
  attrs: { 
    data: { default: '', validate: 'string' }
  },
  parseDOM: [{
    tag: 'span[data-type="my-custom"]',
    getAttrs: (dom) => ({ data: dom.dataset.value })
  }],
  toDOM: (node) => [
    'span', 
    { 
      'data-type': 'my-custom',
      'data-value': node.attrs.data 
    }, 
    node.attrs.data
  ],
  parseMarkdown: {
    match: ({ type }) => type === 'myCustomSyntax',
    runner: (state, node, type) => {
      state.addNode(type, { data: node.value })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'myCustom',
    runner: (state, node) => {
      state.addNode('myCustomSyntax', undefined, node.attrs.data)
    },
  },
}))

// 3. Live input rules
export const myCustomInputRule = $inputRule((ctx) => {
  return new InputRule(/\[\[([^\]]+)\]\]$/, (state, match, start, end) => {
    const [fullMatch, content] = match
    if (!content) return null
    
    const nodeType = myCustomSchema.type(ctx)
    return state.tr.replaceWith(start, end, nodeType.create({ data: content }))
  })
})

export const myCustomSyntax = [
  remarkMyPlugin,
  myCustomSchema,
  myCustomInputRule,
].flat()
```

### 6. Factory Plugins (Reusable Plugin Generators)

**Use Case**: Creating multiple instances of similar plugins with different configurations.

**Example Pattern** (based on tooltip factory):
```typescript
export function myPluginFactory<Id extends string, Config = any>(id: Id) {
  const mySpec = $ctx<PluginSpec<Config>, `${Id}_SPEC`>(
    {},
    `${id}_SPEC`
  )
  
  const myPlugin = $prose((ctx) => {
    const spec = ctx.get(mySpec.key)
    return new Plugin({
      key: new PluginKey(`${id}_PLUGIN`),
      ...spec,
    })
  })
  
  const result = [mySpec, myPlugin].flat()
  // Add convenience properties for accessing keys
  ;(result as any).key = mySpec.key
  ;(result as any).pluginKey = myPlugin.key
  
  return result
}

// Usage:
export const tooltipPlugin = myPluginFactory('tooltip')
export const modalPlugin = myPluginFactory('modal')
```

### 7. Preset/Bundle Plugins (Plugin Collections)

**Use Case**: Grouping related plugins together for easy import and consistent functionality.

**Example Pattern** (based on CommonMark preset):
```typescript
// Organize by category
const schema = [
  // Node schemas
  paragraphAttr, paragraphSchema,
  headingAttr, headingSchema,
  // Mark schemas  
  emphasisAttr, emphasisSchema,
  strongAttr, strongSchema,
].flat()

const commands = [
  turnIntoTextCommand,
  wrapInHeadingCommand,
  toggleEmphasisCommand,
  toggleStrongCommand,
].flat()

const inputRules = [
  wrapInHeadingInputRule,
  emphasisStarInputRule, 
  strongStarInputRule,
].flat()

const keymap = [
  paragraphKeymap,
  headingKeymap,
  emphasisKeymap,
  strongKeymap,
].flat()

// Export as complete bundle
export const myPreset: MilkdownPlugin[] = [
  schema,
  commands,
  inputRules,
  keymap,
].flat()
```

## Development Best Practices

### Package Structure
```
packages/plugins/plugin-my-feature/
├── src/
│   ├── index.ts           # Main exports
│   ├── my-feature.ts      # Core plugin logic
│   └── types.ts           # Type definitions
├── package.json
└── vite.config.ts         # Build configuration
```

### Dependencies Pattern
```json
{
  "dependencies": {
    "@milkdown/exception": "workspace:*",
    "@milkdown/core": "workspace:*", 
    "@milkdown/ctx": "workspace:*",
    "@milkdown/prose": "workspace:*",
    "@milkdown/utils": "workspace:*"
  }
}
```

### Build Configuration
Use the shared vite configuration:
```typescript
// vite.config.ts
import { pluginViteConfig } from '@milkdown/dev/vite'

export default pluginViteConfig(import.meta.url)
```

### Naming Conventions
- **Plugin files**: `kebab-case` (enforced by linting)
- **Plugin IDs**: `camelCase`
- **Context keys**: Match the plugin ID
- **Commands**: `PascalCase` for command names
- **Exports**: Use descriptive names and group related functionality

### Error Handling
```typescript
import { missingNodeInSchema } from '@milkdown/exception'

// Always check for missing schema elements
const nodeType = ctx.get(schemaCtx).nodes[id]
if (!nodeType) throw missingNodeInSchema(id)
```

### Testing
```typescript
// Use vitest for unit tests
import { describe, it, expect } from 'vitest'

describe('myPlugin', () => {
  it('should create node correctly', () => {
    // Test plugin functionality
  })
})
```

## Plugin Integration Examples

### Adding to Editor
```typescript
import { Editor } from '@milkdown/core'
import { myPlugin } from './my-plugin'

const editor = Editor
  .make()
  .use(myPlugin)
  .create()
```

### Configuring Plugin
```typescript
// Configure plugin options
editor.config(mySpec, {
  customOption: 'value',
  handler: (data) => { /* custom logic */ }
})
```

### Calling Commands
```typescript
import { callCommand } from '@milkdown/utils'

// In editor actions
editor.action(callCommand(myCommand.key, payload))
```

## Understanding Core APIs

### The Transformer API

The **transformer** package handles the bidirectional conversion between markdown and ProseMirror documents. It's the backbone of Milkdown's markdown processing.

**When to use the transformer API directly**:
- Building custom markdown syntax processors
- Creating plugins that need to transform content programmatically
- Implementing complex parsing/serialization logic

**Key Types**:
```typescript
import type { 
  NodeSchema, 
  MarkSchema, 
  NodeParserSpec, 
  NodeSerializerSpec,
  MarkParserSpec,
  MarkSerializerSpec 
} from '@milkdown/transformer'

// Extended ProseMirror schemas with markdown capabilities
interface NodeSchema extends NodeSpec {
  readonly toMarkdown: NodeSerializerSpec      // How to convert to markdown
  readonly parseMarkdown: NodeParserSpec       // How to parse from markdown
  readonly priority?: number                   // Parser priority (default: 50)
}

interface MarkSchema extends MarkSpec {
  readonly toMarkdown: MarkSerializerSpec
  readonly parseMarkdown: MarkParserSpec
}
```

**Usage Pattern**:
```typescript
// In your schema definitions
export const myNodeSchema = $nodeSchema('myNode', (ctx) => ({
  // Standard ProseMirror NodeSpec properties
  content: 'inline*',
  group: 'block',
  
  // Transformer-specific: markdown parsing
  parseMarkdown: {
    match: ({ type }) => type === 'customBlock',
    runner: (state, node, type) => {
      state.openNode(type, { level: node.depth })
      state.next(node.children)
      state.closeNode()
    },
  },
  
  // Transformer-specific: markdown serialization
  toMarkdown: {
    match: (node) => node.type.name === 'myNode',
    runner: (state, node) => {
      state.openNode('customBlock', undefined, { depth: node.attrs.level })
      // Serialize children...
      state.closeNode()
    },
  },
}))
```

### Preset Architecture (CommonMark & GFM)

**When to use presets**:
- Building a standard markdown editor
- Need a complete set of markdown features
- Want battle-tested, compatible markdown support

**CommonMark Preset** (`@milkdown/preset-commonmark`):
- Provides all basic markdown elements (headings, paragraphs, lists, emphasis, etc.)
- Follows the [CommonMark specification](https://commonmark.org/)
- Includes 15+ nodes and marks with full markdown support
- Organized by category: `schema`, `commands`, `inputRules`, `keymap`, `plugins`

**GFM Preset** (`@milkdown/preset-gfm`):
- Extends CommonMark with GitHub Flavored Markdown features
- Adds tables, task lists, strikethrough, autolinks
- Build on top of CommonMark (use both together)

**Usage Pattern**:
```typescript
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'

// For basic markdown editor
const editor = Editor.make().use(commonmark)

// For GitHub-style markdown editor  
const editor = Editor.make().use(commonmark).use(gfm)

// Customizing preset components - import individual pieces
import { 
  emphasisSchema, 
  strongSchema, 
  paragraphSchema 
} from '@milkdown/preset-commonmark'

// Use individual components from presets
const myCustomPreset: MilkdownPlugin[] = [
  paragraphSchema,
  emphasisSchema,
  strongSchema,
  // Add your custom plugins
  myCustomPlugin,
].flat()
```

### Context System (`@milkdown/ctx`)

The context system is Milkdown's dependency injection mechanism. Every plugin interacts with the editor through contexts.

**When to use contexts**:
- Storing plugin configuration
- Sharing data between plugins
- Accessing editor state and services
- Managing plugin lifecycle

**Key Context Types**:
```typescript
import { $ctx } from '@milkdown/utils'

// Configuration contexts
export const myPluginConfig = $ctx({ 
  enabled: true,
  color: 'blue' 
}, 'myPluginConfig')

// Service contexts
export const myService = $ctx(() => new MyService(), 'myService')

// Storage contexts  
export const myState = $ctx({} as MyState, 'myState')
```

### Exception Handling (`@milkdown/exception`)

Milkdown provides structured error handling with specific error types for different failure scenarios.

**Common Exceptions You Should Handle**:
```typescript
import { 
  missingNodeInSchema,
  missingMarkInSchema,
  contextNotFound,
  expectDomTypeError 
} from '@milkdown/exception'
import { ErrorCode, MilkdownError } from '@milkdown/exception'

// Always check for missing schema elements
const nodeType = ctx.get(schemaCtx).nodes[id]
if (!nodeType) throw missingNodeInSchema(id)

// Validate DOM elements in parseDOM
getAttrs: (node) => {
  if (!(node instanceof HTMLElement)) 
    throw expectDomTypeError(node)
  return { level: parseInt(node.dataset.level) }
}

// Handle missing contexts gracefully
try {
  const config = ctx.get(myConfig.key)
} catch (error) {
  if (error instanceof MilkdownError && error.code === ErrorCode.contextNotFound) {
    // Use defaults or handle gracefully
  }
}
```

### ProseMirror Integration (`@milkdown/prose`)

This package re-exports ProseMirror modules with Milkdown-specific utilities.

**Key Exports**:
```typescript
// Re-exports from ProseMirror packages
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { InputRule } from '@milkdown/prose/inputrules' 
import type { NodeViewConstructor } from '@milkdown/prose/view'
import { toggleMark, setBlockType } from '@milkdown/prose/commands'

// Milkdown-specific utilities
import { markRule } from '@milkdown/prose'  // Enhanced mark input rules
```

## Framework Integration Patterns

### React Integration (`@milkdown/integrations/react`)

**Key Hooks**:
```typescript
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/integrations/react'
import { Editor, defaultValueCtx, rootCtx, commandsCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'

function MyEditor() {
  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, 'Hello **world**!')
      })
      .use(commonmark)
  )

  const handleBold = () => {
    const editor = get()
    if (!editor) return
    editor.action((ctx) => {
      const commands = ctx.get(commandsCtx)
      // commands.call(yourCommand.key)
    })
  }

  return (
    <>
      <button onClick={handleBold}>Bold</button>
      <Milkdown />
    </>
  )
}

export default function App() {
  return (
    <MilkdownProvider>
      <MyEditor />
    </MilkdownProvider>
  )
}
```

### Vue Integration (`@milkdown/integrations/vue`)

**Key Composables**:
```typescript
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/integrations/vue'
import { Editor, defaultValueCtx, rootCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { defineComponent } from 'vue'

const MyEditor = defineComponent({
  setup() {
    useEditor((root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, 'Hello **world**!')
        })
        .use(commonmark)
    )

    return () => <Milkdown />
  },
})

export default defineComponent({
  setup() {
    return () => <MilkdownProvider>{() => <MyEditor />}</MilkdownProvider>
  },
})
```

## Testing Your Plugins

### Testing Setup

```typescript
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { Editor, defaultValueCtx, editorViewCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'

describe('myPlugin', () => {
  function createEditor(markdown = '') {
    return Editor.make()
      .config((ctx) => {
        ctx.set(defaultValueCtx, markdown)
      })
      .use(commonmark)
      .use(myPlugin)
  }

  it('should render correctly', async () => {
    const editor = createEditor('**bold text**')
    await editor.create()
    
    const view = editor.ctx.get(editorViewCtx)
    expect(view.dom.querySelector('strong')).toBeInTheDocument()
  })
  
  it('should handle commands', async () => {
    const editor = createEditor()
    await editor.create()
    
    const instance = editor.ctx.get(editorViewCtx)
    // Test command execution
    editor.action(callCommand(myCommand.key, { param: 'value' }))
    
    // Assert expected changes
    expect(instance.state.doc).toMatchSnapshot()
  })
})
```

### Plugin Lifecycle Testing

```typescript
it('should initialize and cleanup properly', async () => {
  const editor = createEditor()
  
  // Track plugin state
  let pluginInitialized = false
  let pluginDestroyed = false
  
  const trackingPlugin: MilkdownPlugin = (ctx) => async () => {
    pluginInitialized = true
    
    return () => {
      pluginDestroyed = true
    }
  }
  
  editor.use(trackingPlugin)
  await editor.create()
  
  expect(pluginInitialized).toBe(true)
  
  editor.destroy()
  expect(pluginDestroyed).toBe(true)
})
```

## Editor Utilities and Macros

Milkdown provides a rich set of utilities for common editor operations. These are pre-built functions that handle complex editor interactions.

### Macro Functions (`@milkdown/utils/macro`)

These utilities handle common editor operations programmatically:

```typescript
import { 
  callCommand, 
  getMarkdown, 
  insert, 
  getHTML,
  replaceAll,
  forceUpdate 
} from '@milkdown/utils'

// Command execution
editor.action(callCommand(boldCommand.key))

// Content extraction
const markdown = editor.action(getMarkdown())
const html = editor.action(getHTML())

// Content insertion
editor.action(insert('**New content**'))
editor.action(insert('_inline text_', true)) // inline insertion

// Content replacement
editor.action(replaceAll('old text', 'new text'))

// Force editor re-render
editor.action(forceUpdate())
```

**When to use macros**:
- Building editor toolbars and UI controls
- Implementing programmatic content manipulation
- Creating automation scripts or content processors
- Building editor integrations with external systems

### Advanced Content Manipulation

```typescript
import { insertPos, replaceRange, markdownToSlice } from '@milkdown/utils'

// Insert at specific position
editor.action(insertPos(100, 'content'))

// Replace specific range
editor.action(replaceRange({ from: 10, to: 20 }, 'replacement'))

// Convert markdown to ProseMirror slice
const slice = editor.action(markdownToSlice('**bold**'))
```

## High-Level Editor Patterns

### Crepe Editor (Advanced UI Framework)

Crepe is Milkdown's high-level framework for building feature-rich editors with pre-built UI components.

**When to use Crepe**:
- Building production editors with rich UI
- Need pre-built features (toolbars, menus, dialogs)
- Want rapid development with consistent UX
- Require advanced editor features out-of-the-box

```typescript
import { Crepe, CrepeFeature } from '@milkdown/crepe'

const editor = new Crepe({
  root: document.getElementById('editor'),
  defaultValue: 'Hello **world**!',
  
  // Enable/disable features
  features: {
    [CrepeFeature.Toolbar]: true,
    [CrepeFeature.ImageBlock]: true,
    [CrepeFeature.CodeBlock]: true,
    [CrepeFeature.ListItem]: true,
  },
  
  // Configure individual features
  featureConfigs: {
    [CrepeFeature.Toolbar]: {
      // Toolbar configuration
    }
  }
})

await editor.create()
```

**Available Crepe Features**:
- Toolbar with formatting buttons
- Image upload and management
- Code block with syntax highlighting
- Advanced list management
- Link editing interface
- And many more...

### Kit Package (Unified API Access)

The **@milkdown/kit** package provides a unified API surface for all Milkdown packages, allowing developers to import everything from a single package without managing multiple dependencies.

**When to integrate with kit**:
- Your plugin is stable and widely useful
- You want to provide the best developer experience
- The plugin should be easily discoverable
- It follows all development guide patterns

**Kit Integration Pattern**:

The kit package uses a simple re-export pattern where each plugin gets its own export path:

```typescript
// packages/kit/src/plugin/my-plugin.ts
export * from '@milkdown/plugin-my-plugin'
```

**Package.json Integration**:

Add your plugin to the kit's package.json in three places:

1. **Dependencies**: Add the workspace dependency
```json
{
  "dependencies": {
    "@milkdown/plugin-my-plugin": "workspace:*"
  }
}
```

2. **Exports**: Add the export path
```json
{
  "exports": {
    "./plugin/my-plugin": "./src/plugin/my-plugin.ts"
  },
  "publishConfig": {
    "exports": {
      "./plugin/my-plugin": {
        "types": "./lib/plugin/my-plugin.d.ts",
        "import": "./lib/plugin/my-plugin.js"
      }
    }
  },
  "typesVersions": {
    "*": {
      "plugin/my-plugin": ["lib/plugin/my-plugin.d.ts"]
    }
  }
}
```

**Usage Examples**:

After integration, developers can use your plugin via the kit:

```typescript
// Before: Multiple imports
import { Editor } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { myPlugin } from '@milkdown/plugin-my-plugin'

// After: Unified kit imports
import { Editor } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'  
import { myPlugin } from '@milkdown/kit/plugin/my-plugin'

const editor = Editor.make()
  .use(commonmark)
  .use(myPlugin)
  .create()
```

**Integration Categories**:

- **Plugins**: `@milkdown/kit/plugin/[name]` - Core functionality plugins
- **Presets**: `@milkdown/kit/preset/[name]` - Plugin bundles  
- **Components**: `@milkdown/kit/component/[name]` - UI components
- **Core APIs**: `@milkdown/kit/core`, `@milkdown/kit/utils`, etc.

**Kit Integration Benefits**:
- Single package dependency for users
- Better tree-shaking and bundling
- Consistent import patterns
- Easier plugin discovery
- Simplified dependency management

**Integration Steps for Plugin Developers**:

1. Create the re-export file in `packages/kit/src/plugin/[name].ts`
2. Add dependency to `packages/kit/package.json`
3. Add export paths to package.json (regular, publishConfig, typesVersions)
4. Update any documentation to show kit import examples
5. Test that build and imports work correctly

## Theme and Styling Patterns

### Theme Development

Milkdown uses CSS-based theming with context injection:

```typescript
import { editorViewOptionsCtx } from '@milkdown/core'
import clsx from 'clsx'

export function myTheme(ctx: Ctx): void {
  ctx.update(editorViewOptionsCtx, (prev) => {
    return {
      ...prev,
      attributes: (state) => {
        const prevAttrs = typeof prev.attributes === 'function' 
          ? prev.attributes(state) 
          : prev.attributes

        return {
          ...prevAttrs,
          class: clsx(
            'prose dark:prose-invert',
            'my-custom-theme',
            prevAttrs?.class || ''
          ),
        }
      },
    }
  })
}

// Usage
const editor = Editor.make()
  .config(myTheme)
  .use(commonmark)
```

**Theme Structure**:
```css
/* my-theme.css */
.my-custom-theme {
  /* Base editor styles */
}

.my-custom-theme .ProseMirror {
  /* Editor content styles */
}

.my-custom-theme .ProseMirror h1 {
  /* Heading styles */
}
```

## Editor Configuration and Lifecycle

### Editor Lifecycle Management

```typescript
import { Editor, EditorStatus } from '@milkdown/core'

const editor = Editor.make()
  .onStatusChange((status) => {
    switch (status) {
      case EditorStatus.Idle:
        console.log('Editor initialized')
        break
      case EditorStatus.OnCreate:
        console.log('Editor creating...')
        break  
      case EditorStatus.Created:
        console.log('Editor ready!')
        break
      case EditorStatus.OnDestroy:
        console.log('Editor destroying...')
        break
      case EditorStatus.Destroyed:
        console.log('Editor destroyed')
        break
    }
  })

// Plugin management
editor.use(myPlugin)           // Add plugin
await editor.remove(myPlugin)  // Remove plugin
await editor.create()          // Create editor
await editor.destroy()         // Destroy editor
await editor.destroy(true)     // Destroy and clear all plugins
```

### Configuration Patterns

```typescript
import { defaultValueCtx, rootCtx } from '@milkdown/core'

// Basic configuration
editor.config((ctx) => {
  ctx.set(rootCtx, document.getElementById('editor'))
  ctx.set(defaultValueCtx, '# Hello World')
})

// Multiple configs
const themeConfig = (ctx: Ctx) => {
  // Theme setup
}

const contentConfig = (ctx: Ctx) => {
  // Content setup  
}

editor
  .config(themeConfig)
  .config(contentConfig)

// Remove config
editor.removeConfig(themeConfig)
```

### Dynamic Plugin Management

```typescript
// Runtime plugin management
const editor = await Editor.make().use(commonmark).create()

// Add plugins dynamically
if (needsTableSupport) {
  editor.use(gfm)
}

// Remove plugins when not needed
if (!needsAdvancedFeatures) {
  await editor.remove(advancedPlugin)
}

// Hot reload during development
if (process.env.NODE_ENV === 'development') {
  // Remove old version
  await editor.remove(oldPlugin)
  // Add new version
  editor.use(newPlugin)
}
```

## Debugging and Development Tools

### Inspector for Plugin Development

The inspector provides runtime telemetry for plugin development and debugging:

```typescript
// Enable inspector during development
const editor = Editor.make()
  .enableInspector() // Enable telemetry collection
  .use(myPlugin)

await editor.create()

// Get inspection data
const telemetry = editor.inspect()
telemetry.forEach((data) => {
  console.log('Plugin:', data.metadata.displayName)
  console.log('Injected slices:', data.injectedSlices)
  console.log('Consumed slices:', data.consumedSlices)
  console.log('Timer performance:', data.recordedTimers)
})
```

**Telemetry Data**:
- **Metadata**: Plugin identification and grouping
- **Injected slices**: What contexts the plugin provides
- **Consumed slices**: What contexts the plugin uses
- **Timer performance**: Plugin initialization and runtime performance
- **Wait timers**: Async operation tracking

### Development Debugging

```typescript
// Plugin with debugging metadata
const myPlugin: MilkdownPlugin = (ctx) => async () => {
  // Plugin logic
}

// Add metadata for better debugging
myPlugin.meta = {
  displayName: 'My Custom Plugin',
  group: 'CustomFeatures'
}

// Use inspector in development
if (process.env.NODE_ENV === 'development') {
  editor.enableInspector()
  
  // Log performance after creation
  editor.onStatusChange((status) => {
    if (status === EditorStatus.Created) {
      console.table(editor.inspect())
    }
  })
}
```

This guide provides the foundation for creating robust, maintainable Milkdown plugins. Always refer to existing plugins in the codebase for real-world examples and consult the [official documentation](https://milkdown.dev/) for the latest API changes.

## withMeta Helper

Most first‑party packages add a package‑scoped withMeta helper to stamp consistent metadata for the inspector. Copy this into `src/__internal__/with-meta.ts` in your plugin package and import it wherever you call `withMeta()`.

```ts
import type { Meta, MilkdownPlugin } from '@milkdown/ctx'

export function withMeta<T extends MilkdownPlugin>(
  plugin: T,
  meta: Partial<Meta> & Pick<Meta, 'displayName'>
): T {
  Object.assign(plugin, {
    meta: {
      package: '@milkdown/plugin-your-plugin',
      ...meta,
    },
  })
  return plugin
}
```

Use it consistently on composables that benefit from clearer telemetry:
- Schemas: `withMeta(myNodeSchema.node, { displayName: 'NodeSchema<myNode>' })`
- Remark plugins: `withMeta(remarkFoo.plugin, { displayName: 'Remark<foo>' })`
- Commands/InputRules
- Keymaps: `withMeta(keymap.ctx, ...)` and `withMeta(keymap.shortcuts, ...)`

Note: Do not apply withMeta() to composite arrays; apply to their individual members.

## Plugin Styling

Aim for minimal, theme‑friendly styling. Prefer attributes and classes that themes or users can target; avoid heavy runtime CSS injection.

Recommended patterns
- Use `$nodeAttr`/`$markAttr` to expose classes/data attributes for styling.
  - Example: `data-type="grid-table"`, `class="md-grid-table"`.
- For view plugins, add a stable container class and inner slots.
  - Example: `.md-node-my-plugin`, `.md-node-my-plugin__content`.
- Integrate with themes via `editorViewOptionsCtx` (already shown in Theme section) or by documenting required classes.
- Keep CSS small; favor CSS variables or inherit from `.prose`.
- Ship CSS only if necessary; otherwise document selectors so users can style via their theme.

Storybook CSS
- Place temporary styles for demos under `storybook/stories/components/*.css` or alongside the story and import them there. Do not couple demo CSS with published packages unless it’s essential.

Example attributes via $nodeAttr
```ts
export const myBlockAttr = $nodeAttr('myBlock', () => ({
  container: { class: 'md-node-my-block', 'data-type': 'my-block' },
}))
```

## Storybook Guidance

Storybook is the quickest way to iterate on parsing, rendering, and UX.

Run
- `pnpm start` launches the `@milkdown/storybook` instance on port 6006.

Add a story
- Place stories under `storybook/stories/plugins/[plugin].stories.ts`.
- Use kit re‑exports (easiest for consumers): `@milkdown/kit/core`, `@milkdown/kit/preset/commonmark`, `@milkdown/kit/plugin/[name]`.

Parsing order matters
- Remark/syntax plugins often must load before presets that also touch the same syntax.
- Example (Grid Tables): `.use(gridTables).use(commonmark)` to ensure grid table markdown parses.

Provide valid sample markdown
- Ensure `defaultValue` is valid for your plugin’s parser. Invalid samples lead to “unparsed markdown” showing in the DOM, which looks like broken parsing.
- Include a simple sample and a complex sample to exercise edge cases.

Minimal story template
```ts
import type { Meta, StoryObj } from '@storybook/html'
import { Editor, defaultValueCtx, editorViewOptionsCtx, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { myPlugin } from '@milkdown/kit/plugin/my-plugin'

const meta: Meta = { title: 'Plugins/My Plugin' }
export default meta
type Story = StoryObj

export const Basic: Story = {
  render: () => {
    const container = document.createElement('div')
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, container)
        ctx.set(defaultValueCtx, 'Your valid markdown here')
        ctx.set(editorViewOptionsCtx, { editable: () => true })
      })
      .use(myPlugin)
      .use(commonmark)
    editor.create().catch(console.error)
    return container
  },
}
```

Debugging in stories
- Log DOM after create to verify parsed nodes exist.
- Search for unparsed markers (e.g., `+---` in grid tables) in `root.textContent`.
- Toggle readonly via `editorViewOptionsCtx` to test interactions.

## Testing Playbook (Unit + E2E)

Unit tests (Vitest)
- Required for all first‑party plugins going forward. Each new plugin must include unit tests that verify its core behavior.
- Co‑locate `*.spec.ts` next to the source they cover. Use `src/__test__/` for shared setup (`vitest.setup.ts`) and package‑level integration specs. Prefer `__test__` (singular) over `__tests__`.
- Use `Editor.make().use(commonmark).use(plugin)`; set `defaultValueCtx` to a precise sample.
- Assertions
  - DOM: query via `editorViewCtx`.
  - Commands: call `editor.action((ctx) => ctx.get(commandsCtx).call(cmd.key, args))`.
  - Round‑trip parse/serialize: set markdown → read back via serializer (or compare doc JSON).
- Regex input rules: add targeted tests for boundaries to avoid matching in URLs/paths.

Standard test layout
```text
packages/plugins/
  <plugin-name>/
    src/
      feature-a.ts
      feature-a.spec.ts         # co‑located unit test (preferred)
      __test__/                 # optional for setup/integration
        vitest.setup.ts         # shared setup (e.g. jest‑dom)
        integration.spec.ts     # package‑level integration tests
    vitest.config.ts            # required so root runner picks this package up
    tsconfig.json               # exclude tests from build (see below)
```

Per‑package Vitest config
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // If you have a setup file under src/__test__
    setupFiles: ['./src/__test__/vitest.setup.ts'],
  },
})
```

Root runner note: the repository root config uses `projects: ['packages/**/*/vitest.config.ts']`. A package’s unit tests are only executed if that package contains its own `vitest.config.ts`.

TypeScript build excludes (prevent emitting tests into `lib/`)
```jsonc
// tsconfig.json (per plugin)
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "lib",
    "emitDeclarationOnly": true,
    "tsBuildInfoFile": "./lib/tsconfig.tsbuildinfo"
  },
  "include": ["src"],
  "exclude": [
    "src/**/*.spec.ts",
    "src/**/*.test.ts",
    "src/__test__/**",
    "src/__tests__/**"
  ]
}
```

Minimum coverage by plugin type
- Schema/Markdown plugins (nodes/marks, remark integrations)
  - Round‑trip parse/serialize for representative samples.
  - Input rule boundary tests (avoid over‑matching, handle edges).
  - Basic command tests (create/toggle/set behavior).
  - Light DOM presence checks when rendering is relevant.
- Service/View/interaction‑heavy plugins (tooltips, slash, block, indent, upload, cursor, collab)
  - Unit tests validating core logic and DOM behavior in jsdom.
  - At least one E2E scenario for realistic typing/keyboard flows (see below).
- Presets
  - Smoke tests for composition and representative feature toggles.
- Themes
  - Unit tests optional; rely on Storybook/visual verification unless logic is added.

Round‑trip example (pattern used in repo)
```ts
import { Editor, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { getMarkdown } from '@milkdown/utils'

function createEditor() {
  return Editor.make().use(commonmark).use(myPlugin)
}

async function roundTrip(input: string): Promise<string> {
  const editor = createEditor()
  editor.config((ctx) => ctx.set(defaultValueCtx, input.trim()))
  await editor.create()
  return editor.action(getMarkdown())
}

it('should preserve structure', async () => {
  const output = await roundTrip('your markdown')
  expect(output).toContain('expected token')
})
```

E2E (Playwright)
- Put plugin scenarios under `e2e/tests/plugin/<plugin-name>.spec.ts`.
- Focus on realistic typing flows, keyboard shortcuts, and interactions that are difficult to validate via unit tests.
- Prefer role/text selectors; avoid brittle CSS selectors.
- Keep scenarios deterministic and fast. Use the smallest document that exercises the behavior.

Common pitfalls checklist
- [ ] Plugin order for remark/syntax is correct.
- [ ] `parseMarkdown.match` and `toMarkdown.match` align and are unique.
- [ ] Attributes have `validate` where used.
- [ ] Input rules don’t over‑match (use proper boundaries).
- [ ] Keymaps defined via `$useKeymap` expose configurable shortcuts.
- [ ] Storybook samples use valid markdown that exercises features.

## Planning A New Plugin

Use this scaffold to scope features and deliver incrementally.

1) Classify the plugin
- Schema plugin (node/mark), service plugin (ProseMirror Plugin), parser/syntax plugin (remark), or a composed set.

2) Define minimal scope (MVP)
- Markdown examples: 3–5 canonical inputs the plugin must support.
- Core behaviors: parsing, minimal DOM, one key command, one input rule if applicable.
- Serialization: ensure round‑trip for the canonical examples.

3) Decide integration points
- Context slices (`$ctx`) for config/state; attributes via `$nodeAttr/$markAttr`.
- Keymaps via `$useKeymap` (with metadata on ctx/shortcuts), and commands via `$command`.
- View needs (`$view`) if custom DOM/interaction is required.

4) Phase 2 extensions
- Additional commands, richer input rules, custom views, async services, UI components.

5) Validation
- Unit tests for parse/serialize, commands, input rules, and view updates.
- Storybook with valid and edge‑case markdown.
- Inspector enabled during development to confirm consumed/injected contexts and timers.

Regex input rule tips
- Use negative look‑behinds/aheads to avoid matching inside words, URLs, or file paths.
- Mirror patterns used by existing marks (e.g., strong/strikethrough) and add tests.
