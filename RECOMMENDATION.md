# Recommendation: Architecture Approach

## Answer to Your Questions

### 1. Can we use Milkdown priority mechanisms in grid-table-block?

**Answer: No, but we can handle it differently.**

- ❌ **No priority mechanism exists for NodeViews** (only for schema, paste rules, keymaps)
- ✅ **But**: We can check if `table-block` is registered and replace its view registration
- ✅ **Method**: Use `ctx.isInjected(tableBlockConfig.key)` to detect `table-block`
- ✅ **Then**: Remove `table-block`'s view for `table` nodes before registering ours

### 2. Should we revert table-block or keep shared utilities?

**Answer: Keep shared utilities, minimal changes to table-block (Option C - Hybrid)**

**Rationale**:
- The bridge pattern is a **good architectural improvement** to `table-block`
- The refactor makes `table-block` **cleaner and more maintainable**
- Bug fixes (colspan detection) **should be kept**
- Only debug code needs removal (~220 lines)
- **No code duplication** = easier maintenance

**Alternative**: If upstream wants zero changes to `table-block`, then Option B (standalone) is acceptable but requires duplicating ~1000+ lines of code.

---

## Recommended Approach: Option C (Hybrid)

**Note**: Order independence/priority handling is **lower priority**. The API instruction will be to not use `table-block` when `grid-table-block` is used. This simplifies the approach.

### Implementation Strategy

#### 1. Priority Handling (Lower Priority - Future Work)

```typescript
// In packages/components/src/grid-table-block/index.ts
import { tableBlockConfig } from '../table-block/config'
import { nodeViewCtx, SchemaReady } from '@milkdown/core'

export const gridTableBlock: MilkdownPlugin = (ctx) => {
  const plugins: MilkdownPlugin[] = [gridTableBlockConfig]
  
  // Check if table-block is present (order independent)
  const hasTableBlock = ctx.isInjected(tableBlockConfig.key)
  
  if (hasTableBlock) {
    // Remove table-block's view for 'table' nodes, then register ours
    plugins.push(
      // Plugin to remove existing table view
      (ctx) => async () => {
        await ctx.wait(SchemaReady)
        // Remove any existing view for 'table' nodes
        ctx.update(nodeViewCtx, (ps) => 
          ps.filter(([id]) => id !== 'table')
        )
      },
      gridTableBlockView,  // Register grid table view
      gfmTableBlockView     // Register GFM table view (replaces table-block's)
    )
  } else {
    // No table-block, register normally
    plugins.push(gridTableBlockView, gfmTableBlockView)
  }
  
  return plugins.flat()
}
```

**Result**: Works regardless of load order ✅

**Status**: ⏳ **Lower Priority** - API instruction will be to not use `table-block` when `grid-table-block` is used, so this can be deferred.

#### 2. Keep Bridge Pattern in `table-block` (Minimal Changes - Current Priority)

**Keep**:
- ✅ Bridge pattern (types.ts, bridges/) - good abstraction
- ✅ Refactored component/drag/operation - cleaner code
- ✅ Colspan-aware cell detection - bug fix
- ✅ Event propagation stops - if needed for conflicts

**Remove**:
- ❌ All debug code (~220 lines)
- ❌ Conditional ref update checks (if not needed)
- ❌ Duplicate handle detection
- ❌ Visibility checks

**Result**: `table-block` gets improvements, minimal risk ✅

#### 3. Keep Shared Utilities (No Duplication)

- `grid-table-block` imports utilities from `table-block`
- Single source of truth
- Easier maintenance

**Result**: No code duplication ✅

---

## Benefits of This Approach

1. **Order Independence**: ✅ Works regardless of import/load order
2. **No table-block Changes for Priority**: ✅ Priority handled in `grid-table-block`
3. **Minimal table-block Changes**: ✅ Only cleanup (remove debug code)
4. **No Code Duplication**: ✅ Shared utilities
5. **Upstream Friendly**: ✅ Bridge pattern is an improvement, bug fixes are valuable
6. **Maintainable**: ✅ Single source of truth for utilities

---

## Alternative: If Upstream Wants Zero table-block Changes

If maintainers insist on **zero changes** to `table-block`:

1. **Revert all `table-block` changes** (including bridge pattern)
2. **Copy utilities to `grid-table-block`** (~1000+ lines)
3. **Handle priority in `grid-table-block`** (same as above)
4. **Accept code duplication** as trade-off

This is more work and less maintainable, but ensures `table-block` is untouched.

---

## Next Steps

1. **Clean up debug code in `table-block`** (follow CLEANUP_PLAN.md) - **CURRENT PRIORITY**
2. **Remove duplicate `drag.ts`** - Replace with re-export
3. **Fix linting errors**
4. **Basic manual testing**
5. **Priority handling** (order independence) - **LOWER PRIORITY** (API instruction: don't use both plugins)

---

## Summary

**Recommended**: Option C (Hybrid)
- Keep bridge pattern improvements in `table-block`
- Remove debug code from `table-block` (~220 lines)
- Keep shared utilities (no duplication)
- Priority handling (order independence) - **Lower priority** (API instruction: don't use both plugins)

**Current Priority**: Cleanup debug code and prepare for PR
**Future Work**: Order independence handling (if needed)

**Result**: Clean, maintainable, upstream-friendly ✅

