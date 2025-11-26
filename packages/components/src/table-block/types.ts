/**
 * TableCommandBridge - Abstract interface for table operations
 *
 * This interface decouples the table-block UI component from specific
 * table implementations (GFM tables vs Grid tables), allowing the same
 * UI to work with both.
 */
export interface TableCommandBridge {
  // Selection commands
  selectRow(index: number): void
  selectCol(index: number): void

  // Row operations
  addRowBefore(): void
  addRowAfter(): void
  deleteRow(): void

  // Column operations
  addColBefore(): void
  addColAfter(): void
  deleteCol(): void

  // Alignment
  setAlign(direction: 'left' | 'center' | 'right'): void

  // Drag and drop
  moveRow(from: number, to: number): void
  moveCol(from: number, to: number): void

  // Delete selected cells (row or column selection)
  deleteSelectedCells(): void

  // Grid-table specific extensions (optional)
  // These return false if not supported
  setVAlign?(direction: 'top' | 'middle' | 'bottom'): void
  mergeCellRight?(): void
  splitCell?(): void
}

/**
 * Feature flags for table UI capabilities
 *
 * Controls which UI elements are shown based on the underlying
 * table implementation's capabilities.
 */
export interface TableFeatureFlags {
  /** Whether vertical alignment controls should be shown */
  supportsVAlign: boolean
  /** Whether merge/split cell controls should be shown */
  supportsMerge: boolean
  /** Whether the table supports multiple sections (header/body/footer) */
  supportsSections: boolean
  /** Whether row drag-and-drop is supported */
  supportsRowDrag: boolean
  /** Whether column drag-and-drop is supported */
  supportsColDrag: boolean
}

/**
 * Default feature flags for GFM tables
 */
export const gfmFeatureFlags: TableFeatureFlags = {
  supportsVAlign: false,
  supportsMerge: false,
  supportsSections: false,
  supportsRowDrag: true,
  supportsColDrag: true,
}

/**
 * Default feature flags for Grid tables
 */
export const gridFeatureFlags: TableFeatureFlags = {
  supportsVAlign: true,
  supportsMerge: true,
  supportsSections: true,
  supportsRowDrag: true,
  supportsColDrag: true,
}

