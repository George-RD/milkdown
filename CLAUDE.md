# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm install` - Install dependencies (uses corepack with pnpm)
- `pnpm build` - Build all packages (`pnpm build:tsc && pnpm build:post`)
- `pnpm start` - Start storybook development server
- `pnpm test` - Run all tests (lint + unit tests)
- `pnpm test:unit` - Run unit tests with vitest
- `pnpm test:unit:watch` - Run unit tests in watch mode
- `pnpm test:lint` - Run oxlint linting
- `pnpm test:e2e` - Run end-to-end tests
- `pnpm test:e2e:debug` - Run e2e tests with UI
- `pnpm fix` - Format code with prettier
- `pnpm clear` - Remove all build artifacts and node_modules
- `pnpm commit` - Run commit with git hooks (conventional commits)

## Architecture Overview

Milkdown is a **plugin-driven WYSIWYG markdown editor** built on ProseMirror and remark. The codebase is organized as a monorepo with the following key packages:

### Core Architecture
- **`@milkdown/core`** - Core editor functionality
- **`@milkdown/ctx`** - Context and dependency injection system for plugins
- **`@milkdown/prose`** - ProseMirror integration layer
- **`@milkdown/utils`** - Shared utilities and composables
- **`@milkdown/transformer`** - Markdown transformation (remark integration)

### Plugin System
- **`packages/plugins/`** - Contains all official plugins (18+ plugins)
- **Plugin Structure**: Each plugin typically exports:
  - Plugin spec (configuration)
  - Plugin service (business logic)
  - Plugin instance
  - Type definitions
- **Plugin Types**: `plugin-*` (functionality), `preset-*` (plugin collections), `theme-*` (styling)
- **Key Plugins**: block, clipboard, history, slash, tooltip, emoji, prism, etc.

### Plugin Development Pattern
```typescript
// Typical plugin export structure
export const myPlugin = [
  pluginSpec,        // $Ctx<PluginSpec>
  pluginConfig,      // $Ctx<Config>
  pluginService,     // $Ctx<() => Service>
  pluginInstance,    // $Ctx<Service>
  pluginProse,       // $Prose
] as MyPlugin
```

### Integration Layers
- **`packages/integrations/react`** - React integration
- **`packages/integrations/vue`** - Vue integration
- **`packages/components`** - Reusable UI components
- **`packages/kit`** - High-level editor kit

## Build System

- **TypeScript**: Project references in `tsconfig.json` with per-package configs
- **Vite**: Each package uses vite for building (`vite build`)
- **pnpm workspaces**: Monorepo dependency management
- **Source**: Packages export from `src/index.ts`, build to `lib/`
- **Dev config**: Shared vite configuration in `@milkdown/dev/vite`

## Code Quality

- **Linting**: oxlint (fast rust-based linter) + custom rules
- **Formatting**: prettier
- **Testing**: vitest for unit tests, custom e2e setup
- **Commit**: Conventional commits with git hooks (husky)
- **File naming**: kebab-case enforced by unicorn/filename-case rule

## Development Workflow

1. `pnpm install` to install dependencies
2. `pnpm build` to build all packages
3. `pnpm start` for storybook development
4. Run `pnpm test` before submitting PRs
5. Use `pnpm commit` for conventional commits

## Plugin Development Guidelines

- Study existing plugins in `packages/plugins/` for patterns
- Use the context system (`@milkdown/ctx`) for dependency injection
- Follow the standard plugin structure with spec, config, service, and instance
- Each plugin should export a typed array with `.key` and `.pluginKey` properties
- Dependencies should use `workspace:*` for internal packages
- Build configuration should use shared vite config from `@milkdown/dev/vite`

## Grid Tables Plugin Development

### Active Development Task
The **Grid Tables Plugin** is currently under development to implement all features of [adobe/remark-gridtables](https://github.com/adobe/remark-gridtables) as a Milkdown plugin.

### Development Instructions
When asked to "continue with the grid tables plugin" or similar:

1. **Check Progress**: Read `GRIDTABLES_PLUGIN_TRACKER.md` for current status
2. **Run as Orchestrator**: Create sub-agents for specific tasks using the Task tool
3. **Follow Standards**: 
   - Adhere strictly to `PLUGIN_DEVELOPMENT_GUIDE.md`
   - Match quality of existing plugins in `packages/plugins/`
   - No hacky fixes - proper solutions only
4. **Update Documentation**: After each task completion:
   - Update `GRIDTABLES_PLUGIN_TRACKER.md` with progress
   - Note how each task followed the development guide
   - Document any architectural decisions
5. **Guide Updates**: If the development guide needs updates:
   - STOP work immediately
   - Explain what needs updating and why
   - Wait for user guidance before proceeding

### Quality Requirements
- **Architecture**: Array-based plugin pattern with composables
- **Debugging**: Use withMeta() for all exports
- **Testing**: Comprehensive unit tests matching existing plugins
- **Documentation**: Complete API docs and examples
- **Code Style**: Follow existing patterns exactly

### Current Phase Tracking
See `GRIDTABLES_PLUGIN_TRACKER.md` for:
- Current development phase
- Completed tasks
- Pending work
- Issues and blockers
- Compliance notes for each task

### Sub-Agent Task Pattern
When creating sub-agents for grid tables development:
```
Task: [Specific phase/task from tracker]
Requirements:
1. Follow PLUGIN_DEVELOPMENT_GUIDE.md patterns
2. Match existing plugin quality in packages/plugins/
3. Document all decisions and code
4. Report back with:
   - What was implemented
   - How it follows the guide
   - Any issues or uncertainties
   - Code snippets for review
```