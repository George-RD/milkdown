# Instructions for Next Agent - Grid Table Block Cleanup

## Context Summary

A grid table block component has been implemented that unifies GFM and Grid table handling. The implementation is **working** but contains ~220 lines of debug code that need to be removed.

**Current Status**: ✅ Committed working state with all functionality intact

## What Was Done

1. ✅ Created `grid-table-block` component that handles both GFM and Grid tables
2. ✅ Implemented `TableCommandBridge` pattern for schema-agnostic operations
3. ✅ Refactored `table-block` to use bridge pattern
4. ✅ Fixed handle positioning with colspan-aware cell detection
5. ✅ Added grid table row selection recovery for state updates
6. ⚠️ Contains debug logging code (~220 lines) that needs cleanup

## What Needs to Be Done Next

**Primary Task**: Remove debug code while maintaining functionality

Follow the **CLEANUP_PLAN.md** file step-by-step. It contains:
- 7 phases of cleanup with specific line counts
- Testing checkpoints after each phase
- Files to modify
- Expected results

## Key Reference Documents

1. **CLEANUP_PLAN.md** ⭐ - **START HERE** - Detailed cleanup steps with testing checkpoints
2. **NEXT_STEPS.md** - Quick reference for current work and priorities
3. **RECOMMENDATION.md** - Architecture decisions and approach summary

## Cleanup Overview

### Files to Clean Up

1. **`packages/components/src/table-block/view/utils.ts`**
   - Remove `DEBUG_POINTER` flag and all `console.log` statements (~150 lines)
   - Remove duplicate handle detection (~15 lines)
   - Remove visibility checks (~10 lines)
   - Test and remove forced reflows (~4 lines)

2. **`packages/components/src/table-block/view/pointer.ts`**
   - Remove `DEBUG_POINTER` flag and all `console.log` statements
   - Remove conditional ref update checks (~25 lines) - **Note**: The root cause fix was removing `hoverIndex.value = index` from compute functions in `utils.ts`, so these conditional checks may not be needed

3. **`packages/components/src/grid-table-block/view/component.tsx`**
   - Verify event propagation stopping (~15 lines) - test if `e.stopPropagation()` is needed

4. **`packages/components/src/grid-table-block/view/drag.ts`**
   - Replace entire file with: `export { useDragHandlers } from '../../table-block/view/drag'`

### Total to Remove: ~220 lines

## Important Notes

1. **Root Cause Fix**: The disappearing handles bug was fixed by removing `hoverIndex.value = index` assignments from `computeColHandlePositionByIndex` and `computeRowHandlePositionByIndex` in `utils.ts`. This is already done.

2. **Testing**: After each cleanup phase, test:
   - Grid table block hover/mouse interactions
   - GFM table block (ensure no regressions)
   - Verify handles appear on all cells (not just top-left)
   - Verify handles don't disappear on re-hover
   - Check browser console - no debug logs should appear

3. **Order Independence**: Lower priority - API instruction will be to not use `table-block` when `grid-table-block` is used.

4. **Keep These**:
   - ✅ Bridge pattern (types.ts, bridges/) - good abstraction
   - ✅ Colspan-aware cell detection (`findCellAtColumn` function) - **ESSENTIAL**
   - ✅ Grid table row selection recovery logic - **ESSENTIAL**
   - ✅ Event propagation stops (if needed for conflicts)

## Step-by-Step Process

1. **Read CLEANUP_PLAN.md** - Understand all phases
2. **Start with Phase 1** - Remove debug logging
3. **Test after each phase** - Use the testing checkpoints
4. **If something breaks** - Revert the phase and investigate
5. **Continue through all 7 phases**
6. **Final verification** - Run full test suite

## Success Criteria

- [ ] All debug code removed (~220 lines)
- [ ] All functionality works (handles, drag, operations)
- [ ] No console errors or warnings
- [ ] No console.log statements remain
- [ ] Code is clean and maintainable
- [ ] Ready for PR review

## Quick Start Command

```bash
# Read the cleanup plan
cat CLEANUP_PLAN.md

# Start with Phase 1: Remove debug logging from utils.ts and pointer.ts
# Test, then continue to Phase 2, etc.
```

## Questions?

- Check **CLEANUP_PLAN.md** for detailed instructions
- Check **RECOMMENDATION.md** for architecture context
- Check **NEXT_STEPS.md** for priority order

Good luck! The cleanup is straightforward - just follow the plan step-by-step and test after each phase.

