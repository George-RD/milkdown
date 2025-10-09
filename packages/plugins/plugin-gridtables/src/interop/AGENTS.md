# Grid Table Interop Layer (Scaffold)

This directory now provides the clipboard interoperability layer for grid tables.

- `index.ts` exposes `gridTableDomTransformsCtx`, a context slice that stores
  DOM preprocessing transforms. The slice is installed automatically when
  `gridTables` is used.
- `registerGridTableDomTransform(ctx, transform)` appends transforms and
  returns a disposer; use this when adding additional clipboard transforms in
  future refactors.
- `gridTableClipboardDomTransform` is the default transform that keeps the
  previous clipboard normalisation behaviour (grid table promotion, GFM header
  annotations).
- `gridTableClipboardInterop` registers the default transform with the
  context. The clipboard plugin will iterate anything stored in this slice.

When new transforms or serialisation helpers are added, ensure they are
registered via `registerGridTableDomTransform` and document their behaviour
here so other contributors can trace the flow quickly.
