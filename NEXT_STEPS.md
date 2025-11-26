# Next Steps - Grid Table Block Refactor

## ✅ Current Status

- **Committed**: Working state with all functionality intact
- **Architecture**: UnifiedTableNodeView handles both GFM and Grid tables
- **Root Cause Fixed**: Removed `hoverIndex.value = index` from compute functions in `utils.ts`
- **Plans**: All plan documents are up to date

## 📋 Current Priority: Cleanup

**Focus**: Remove debug code and prepare for PR

**Note**: Order independence/priority handling is **lower priority**. The API instruction will be to not use `table-block` when `grid-table-block` is used.

---

## 📋 Cleanup Tasks

**Reference**: See `CLEANUP_PLAN.md` for detailed step-by-step instructions

### Phase 1: Remove Debug Logging (~150 lines)
- Files: `utils.ts`, `pointer.ts`
- Remove `DEBUG_POINTER` flag and all `console.log` statements
- **Test checkpoint**: Verify handles work, no console logs

### Phase 2: Remove Conditional Ref Updates (~25 lines)
- File: `pointer.ts` (lines ~300-343)
- Remove `shouldUpdateHoverIndex` checks
- Simplify to direct assignment
- **Test checkpoint**: Verify no regressions

### Phase 3: Remove Duplicate Handle Detection (~15 lines)
- File: `utils.ts`
- Remove DOM queries and warning logs
- **Test checkpoint**: Verify handles work correctly

### Phase 4: Remove Visibility Checks (~10 lines)
- File: `utils.ts`
- Remove `offsetParent` checks from debug logs
- **Test checkpoint**: Verify handles position correctly

### Phase 5: Test and Remove Forced Reflows (~4 lines)
- File: `utils.ts`
- Remove `void colHandle.offsetHeight` and `void rowHandle.offsetHeight`
- **Test checkpoint**: If positioning breaks, keep with comment

### Phase 6: Verify Event Propagation (~15 lines)
- Files: `component.tsx` files
- Test if `e.stopPropagation()` is needed
- **Test checkpoint**: Verify no conflicts with grid plugin

### Phase 7: Remove Duplicate drag.ts
- File: `packages/components/src/grid-table-block/view/drag.ts`
- Replace with: `export { useDragHandlers } from '../../table-block/view/drag'`
- **Test checkpoint**: Verify drag-and-drop works

**Total to Remove**: ~220 lines of debugging code

---

## 🎯 Priority Order

1. **HIGH PRIORITY** (Before PR):
   - [ ] Complete cleanup (Phases 1-7)
   - [ ] Remove duplicate `drag.ts`
   - [ ] Fix linting errors
   - [ ] Basic manual testing

2. **MEDIUM PRIORITY** (For PR):
   - [ ] Add unit tests for bridges
   - [ ] Add E2E tests
   - [ ] Documentation updates
   - [ ] Storybook stories

3. **LOWER PRIORITY** (Future):
   - [ ] Order independence/priority handling (API instruction: don't use both plugins)
   - [ ] Cell-level alignment implementation
   - [ ] Colspan/rowspan handling improvements
   - [ ] Performance optimization

---

## 📄 Key Reference Documents

1. **RECOMMENDATION.md** ⭐ - **START HERE** - Recommended approach and summary
2. **CLEANUP_PLAN.md** - Detailed cleanup steps with testing checkpoints
3. **NEXT_STEPS.md** - This file - Quick reference for current work

---

## 🔑 Key Files to Modify

### Cleanup (Current Priority)
- `packages/components/src/table-block/view/utils.ts` - Remove debug code
- `packages/components/src/table-block/view/pointer.ts` - Remove debug code
- `packages/components/src/grid-table-block/view/component.tsx` - Verify event propagation
- `packages/components/src/grid-table-block/view/drag.ts` - Replace with re-export

---

## ✅ Success Criteria

- [ ] All debug code removed (~220 lines)
- [ ] All functionality works (handles, drag, operations)
- [ ] No console errors or warnings
- [ ] Tests pass (unit + E2E)
- [ ] Code is clean and maintainable
- [ ] Ready for PR review

---

## 🚀 Quick Start (When Ready)

1. **Follow `CLEANUP_PLAN.md` phase by phase**
2. **After each phase**: Run test checkpoint
3. **Final**: Run full test suite and prepare PR

**See `RECOMMENDATION.md` for the recommended approach**

