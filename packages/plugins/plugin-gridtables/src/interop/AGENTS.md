# Grid Table Interop Layer (Scaffold)

This directory holds the upcoming compatibility helpers that will:

- Collect DOM preprocessing transforms from grid tables (and optional collaborators).
- Allow the clipboard plugin to remain generic by iterating registered transforms.
- Later expose serialization helpers for grid table → GFM promotion.

Current status: only the context slice and registration helpers are stubbed out. The
refactor task will flesh these out and integrate them with the clipboard plugin.

Please update this file whenever new transforms, serializer hooks, or context
contracts are added so future agents know how the interop layer fits together.
