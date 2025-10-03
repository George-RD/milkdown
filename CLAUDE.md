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
  pluginSpec, // $Ctx<PluginSpec>
  pluginConfig, // $Ctx<Config>
  pluginService, // $Ctx<() => Service>
  pluginInstance, // $Ctx<Service>
  pluginProse, // $Prose
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

## Grid Tables Plugin Maintenance

The **Grid Tables Plugin** is feature-complete, implementing [adobe/remark-gridtables](https://github.com/adobe/remark-gridtables) for Milkdown. Focus is now on maintenance, bug fixes, and documentation updates.

### Plugin Status

- **Location**: `packages/plugins/plugin-gridtables/`
- **Status**: Feature-complete, in maintenance mode
- **Tracker**: `packages/plugins/plugin-gridtables/GRIDTABLES_PLUGIN_TRACKER.md` (current work log)
- **Development Guide**: `packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md` (standards)

### API Documentation Maintenance

The plugin uses Milkdown's automated API documentation system:

**Source Code Comments**:
- Use `///` triple-slash JSDoc comments above all exports
- Format: `/// Description of what this export does`
- Located in: `packages/plugins/plugin-gridtables/src/*.ts`

**API Template**:
- File: `docs/api/plugin-gridtables.md`
- Contains usage examples, high-level descriptions
- References exports with `@symbolName` (e.g., `@insertGridTableCommand`)
- Update this file when changing plugin structure or examples

**Build Documentation**:
```bash
pnpm --filter=@milkdown/docs build
```
- Parses TypeScript exports and JSDoc comments
- Expands `@symbolName` references in template
- Outputs to `docs/lib/plugin-gridtables.md` (published docs)

### Maintenance Workflow

When fixing bugs or adding features:

1. **Follow Standards**: Adhere to `packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md`
2. **Update JSDoc**: Add/update `///` comments for new/changed exports
3. **Update API Template**: Modify `docs/api/plugin-gridtables.md` if structure changes
4. **Rebuild Docs**: Run `pnpm --filter=@milkdown/docs build`
5. **Update Tracker**: Log changes in `GRIDTABLES_PLUGIN_TRACKER.md`
6. **Test**: Run `pnpm --filter=@milkdown/plugin-gridtables test`

### Quality Standards

- Array-based plugin pattern with composables
- withMeta() for all exports (debugging)
- Comprehensive unit tests
- Complete JSDoc documentation
- Follow existing plugin patterns
