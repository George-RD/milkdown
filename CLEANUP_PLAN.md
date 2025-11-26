# Grid Table Block Refactor - Cleanup Plan

## Current Status

✅ **Committed**: Working state with all functionality intact
⚠️ **Contains**: ~220 lines of debugging code that can be removed
🎯 **Goal**: Clean up debugging code while maintaining functionality

**Note**: Order independence/priority handling is lower priority. API instruction will be to not use `table-block` when `grid-table-block` is used.

## Cleanup Strategy

**Approach**: Incremental cleanup with testing checkpoints after each step to ensure nothing breaks.

---

## Phase 1: Remove Debug Logging (~150 lines)

### Files to modify:
- `packages/components/src/table-block/view/utils.ts`
- `packages/components/src/table-block/view/pointer.ts`

### Changes:
1. Remove `DEBUG_POINTER` constant
2. Remove `debugPointer` function
3. Remove all `if (DEBUG_POINTER) { console.log/console.warn(...) }` blocks (~30+ instances)

### Testing Checkpoint:
- [ ] Test grid table block hover/mouse interactions
- [ ] Test GFM table block (ensure no regressions)
- [ ] Verify handles appear on all cells (not just top-left)
- [ ] Verify handles don't disappear on re-hover
- [ ] Check browser console - no debug logs should appear

### Expected Result:
- All functionality works identically
- No console.log statements remain
- ~150 lines removed

---

## Phase 2: Remove Conditional Ref Update Checks (~25 lines)

### File to modify:
- `packages/components/src/table-block/view/pointer.ts` (lines ~300-343)

### Changes:
1. Remove `shouldUpdateHoverIndex` calculation
2. Remove `shouldUpdateLineHoverIndex` calculation  
3. Remove conditional `if (shouldUpdateHoverIndex)` check before setting `hoverIndex.value`
4. Simplify to direct assignment: `hoverIndex.value = index`
5. Simplify lineHoverIndex reset to direct assignment

### Why:
The root cause was in the compute functions (already fixed), not the pointer handler. The conditional checks were added during debugging but aren't necessary.

### Testing Checkpoint:
- [ ] Test grid table block hover/mouse interactions
- [ ] Test GFM table block
- [ ] Verify handles appear on all cells
- [ ] Verify handles don't disappear on re-hover
- [ ] Verify no performance regressions (check for excessive re-renders)

### Expected Result:
- All functionality works identically
- Simpler code
- ~25 lines removed

---

## Phase 3: Remove Duplicate Handle Detection (~15 lines)

### File to modify:
- `packages/components/src/table-block/view/utils.ts`

### Changes:
1. Remove DOM queries for `[data-role="col-drag-handle"]` and `[data-role="row-drag-handle"]`
2. Remove warning logs when multiple handles found

### Why:
Not needed if handles aren't duplicated. If duplication is a real issue, it should be fixed at the source.

### Testing Checkpoint:
- [ ] Test grid table block
- [ ] Test GFM table block
- [ ] Verify only one set of handles appears per table
- [ ] Verify handles work correctly

### Expected Result:
- All functionality works identically
- ~15 lines removed

---

## Phase 4: Remove Visibility/offsetParent Checks (~10 lines)

### File to modify:
- `packages/components/src/table-block/view/utils.ts`

### Changes:
1. Remove `colVisible: col.offsetParent !== null` from debug logs
2. Remove `handleVisible: colHandle.offsetParent !== null` from debug logs
3. Remove `rowVisible: row.offsetParent !== null` from debug logs
4. Remove `handleVisible: rowHandle.offsetParent !== null` from debug logs

### Why:
Debug-only, not used for logic

### Testing Checkpoint:
- [ ] Test grid table block
- [ ] Test GFM table block
- [ ] Verify handles position correctly

### Expected Result:
- All functionality works identically
- ~10 lines removed

---

## Phase 5: Test and Remove Forced Reflows (~4 lines)

### File to modify:
- `packages/components/src/table-block/view/utils.ts`

### Changes:
1. Remove `void colHandle.offsetHeight` (line ~292)
2. Remove `void rowHandle.offsetHeight` (line ~371)

### Testing Checkpoint:
- [ ] Test grid table block - verify handles position correctly
- [ ] Test GFM table block - verify handles position correctly
- [ ] Test with tables that have colspans/rowspans
- [ ] Test rapid mouse movements
- [ ] If positioning breaks, keep the reflows with a comment explaining why

### Expected Result:
- If positioning works without reflows: ~4 lines removed
- If positioning breaks: Keep reflows with explanatory comment

---

## Phase 6: Verify Event Propagation Stopping (~15 lines)

### Files to check:
- `packages/components/src/grid-table-block/view/component.tsx` (lines ~135-150)
- `packages/components/src/table-block/view/component.tsx` (lines ~125-131)
- `packages/components/src/grid-table-block/view/view.ts` (lines ~161-172)

### Testing:
1. Temporarily comment out `e.stopPropagation()` calls
2. Test if grid table plugin hover handlers conflict
3. If conflicts occur, keep the stops
4. If no conflicts, remove them

### Testing Checkpoint:
- [ ] Test grid table block without stopPropagation
- [ ] Check if plugin hover decorations interfere with handles
- [ ] Check if handles disappear or flicker
- [ ] If issues occur, restore stopPropagation

### Expected Result:
- Either keep stops (if needed) or remove them (~15 lines)
- Document decision

---

## Phase 7: Code Duplication Cleanup

### Task 1: Remove Duplicate `drag.ts`

**File**: `packages/components/src/grid-table-block/view/drag.ts`

**Change**: Replace entire file with:
```typescript
export { useDragHandlers } from '../../table-block/view/drag'
```

**Testing Checkpoint**:
- [ ] Test grid table drag-and-drop
- [ ] Test GFM table drag-and-drop
- [ ] Verify row/column dragging works

### Task 2: Consider Consolidating `operation.ts`

**Files**:
- `packages/components/src/table-block/view/operation.ts`
- `packages/components/src/grid-table-block/view/operation.ts`

**Options**:
1. Keep separate (grid adds 3 methods: `onVAlign`, `onMergeCell`, `onSplitCell`)
2. Use composition/factory pattern
3. Make grid methods optional extensions

**Decision**: Defer to later - low priority, works fine as-is

---

## Summary

### Total Lines to Remove: ~220 lines

1. Debug logging: ~150 lines
2. Conditional ref updates: ~25 lines
3. Duplicate handle detection: ~15 lines
4. Visibility checks: ~10 lines
5. Forced reflows: ~4 lines (test first)
6. Event propagation: ~15 lines (verify first)

### Keep Essential Code (~130 lines)

- ✅ `getRelatedDOM` colspan fix (`findCellAtColumn` function) - **ESSENTIAL**
- ✅ Extended boundary logic for handle tracking - **USEFUL**
- ✅ Column boundary calculation accounting for colspans - **USEFUL**
- ✅ Hysteresis logic for boundary detection - **USEFUL** for smooth UX

---

## Testing Strategy

After each phase:
1. Run the test suite (if available)
2. Manual testing in Storybook
3. Test both GFM and Grid tables
4. Verify no console errors/warnings
5. Check for performance regressions

If anything breaks:
1. Revert the phase
2. Investigate why
3. Fix or keep the code with a comment

---

## Final Checklist

- [ ] All debug code removed
- [ ] All functionality works
- [ ] No console errors
- [ ] Code is clean and maintainable
- [ ] Tests pass (if applicable)
- [ ] Ready for PR review

