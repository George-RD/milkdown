# Grid Table Interop Layer (Scaffold)

This directory now provides the clipboard interoperability layer for grid tables.

- `index.ts` re-exports `clipboardDomTransformsCtx` from
  `@milkdown/plugin-clipboard` as `gridTableDomTransformsCtx`. The shared
  clipboard plugin owns the slice; grid tables simply ensure it is installed
  when `gridTables` is used.
- `registerGridTableDomTransform(ctx, transform)` delegates to the clipboard
  helper so new transforms automatically flow through the shared clipboard
  pipeline. Use the exported `reset*` helpers in tests to clean up after
  yourself.
- `gridTableClipboardDomTransform` is the default transform that keeps the
  previous clipboard normalisation behaviour (grid table promotion, GFM header
  annotations).
  - When both GFM and grid tables are installed, the transform checks for spans
    (`rowspan`/`colspan`) or vertical alignment on cells. Tables requiring those
    features are upgraded to grid tables so remark-gfm never receives an
    unsupported layout.
  - Tables with ragged rows (different numbers of cells) are also promoted, as
    GFM serialisation expects rectangular matrices.
- `gridTableClipboardInterop` registers the default transform with the
  context. The clipboard plugin will iterate anything stored in this slice.
- `gridTableSerializeTransformsCtx` mirrors the clipboard slice but for the
  serializer path. Transforms registered here run before markdown output is
  produced so we can promote compatible grid tables to GFM in future work.
- `gridTableSerializerInterop` wraps the core serializer, applying registered
  transforms on every serialization call.

When new transforms or serialisation helpers are added, ensure they are
registered via `registerGridTableDomTransform` and document their behaviour
here so other contributors can trace the flow quickly. Remember to remove
transforms in tests via the exported `reset*` helpers to avoid cross-test
pollution.
