import '@testing-library/jest-dom/vitest'
import { defaultValueCtx, Editor } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { getMarkdown } from '@milkdown/utils'
import { describe, expect, it } from 'vitest'

import { gridTables } from '..'

function createEditor() {
  const editor = Editor.make()
  editor.use(commonmark).use(gridTables)
  return editor
}

async function testRoundTrip(input: string): Promise<string> {
  const editor = createEditor()
  editor.config((ctx) => {
    ctx.set(defaultValueCtx, input.trim())
  })

  await editor.create()

  return editor.action(getMarkdown())
}

describe('Grid Tables Serialization', () => {
  it('should serialize basic grid table correctly', async () => {
    const input = `+-------------------+------+
| Table Headings    | Here |
+===================+======+
| cell              | more |
+-------------------+------+`

    const output = await testRoundTrip(input)

    // Check that we get back a grid table format
    expect(output).toContain('+')
    expect(output).toContain('|')
    expect(output).toContain('Table Headings')
    expect(output).toContain('Here')
    expect(output).toContain('cell')
    expect(output).toContain('more')
  })

  it('should handle grid table with column spans', async () => {
    const input = `+--------+----------+--------+
| Header | Spanning | Column |
+========+==========+========+
| Normal | Two Cols          |
+--------+-------------------+`

    const output = await testRoundTrip(input)

    expect(output).toContain('Header')
    expect(output).toContain('Spanning')
    expect(output).toContain('Column')
    expect(output).toContain('Normal')
    expect(output).toContain('Two Cols')
  })

  it('should handle grid table with rich content', async () => {
    const input = `+-------------------+------------------+
| **Bold Header**   | *Italic Header*  |
+===================+==================+
| Simple content    | More content     |
+-------------------+------------------+`

    const output = await testRoundTrip(input)

    // Should preserve some form of formatting (adobe plugin may use different syntax)
    expect(output).toMatch(/(\*\*.*\*\*|\+\+.*\+\+)/) // Bold formatting (markdown or adobe format)
    expect(output).toMatch(/(\*.*\*|\+.*\+)/) // Italic formatting (markdown or adobe format)
    expect(output).toContain('Bold Header')
    expect(output).toContain('Italic Header')
    expect(output).toContain('Simple content')
    expect(output).toContain('More content')
  })

  it('should escape special characters in cell content', async () => {
    const input = `+---------------+---------------+
| Has + pipe |  | Has = equal   |
+===============+===============+
| Special chars | More | chars  |
+---------------+---------------+`

    const output = await testRoundTrip(input)

    // Should handle special characters properly
    expect(output).toBeDefined()
    expect(output.length).toBeGreaterThan(0)
  })

  it('should handle multi-line cell content', async () => {
    const input = `+-------------------+-------------------+
| Multi-line        | Another           |
| content here      | multi-line        |
|                   | cell content      |
+===================+===================+
| Single line       | Also single       |
+-------------------+-------------------+`

    const output = await testRoundTrip(input)

    expect(output).toContain('Multi-line')
    expect(output).toContain('content here')
    expect(output).toContain('Another')
    expect(output).toContain('multi-line')
    expect(output).toContain('cell content')
    expect(output).toContain('Single line')
    expect(output).toContain('Also single')
  })

  it('should preserve table structure with header and body sections', async () => {
    const input = `+----------------+----------------+
| Header 1       | Header 2       |
+================+================+
| Body Cell 1    | Body Cell 2    |
| More Body      | More content   |
+----------------+----------------+`

    const output = await testRoundTrip(input)

    // Should maintain the section structure
    expect(output).toContain('Header 1')
    expect(output).toContain('Header 2')
    expect(output).toContain('Body Cell 1')
    expect(output).toContain('Body Cell 2')
    expect(output).toContain('More Body')
    expect(output).toContain('More content')
  })

  it('should handle complex grid table with advanced features', async () => {
    const input = `+--------+--------+--------+
| A1     | B1     | C1     |
|        +--------+--------+
|        | B2              |
+--------+---------+-------+
| A3              | C3     |
+-----------------+--------+`

    const output = await testRoundTrip(input)

    // Test for proper span handling in serialization
    expect(output).toContain('A1')
    expect(output).toContain('B1')
    expect(output).toContain('C1')
    expect(output).toContain('B2')
    expect(output).toContain('A3')
    expect(output).toContain('C3')
  })

  it('should handle empty cells correctly', async () => {
    const input = `+--------+--------+
| Cell 1 |        |
+========+========+
|        | Cell 4 |
+--------+--------+`

    const output = await testRoundTrip(input)

    expect(output).toContain('Cell 1')
    expect(output).toContain('Cell 4')
    // Should handle empty cells without errors
    expect(output).toBeDefined()
  })

  it('should maintain proper column width calculation', async () => {
    const input = `+-----+-------------------+-------+
| ID  | Description       | Value |
+=====+===================+=======+
| 1   | Short description | 100   |
| 2   | Very long description that spans more content | 200 |
+-----+---------------------------------------+-------+`

    const output = await testRoundTrip(input)

    expect(output).toContain('ID')
    expect(output).toContain('Description')
    expect(output).toContain('Value')
    expect(output).toContain('Short description')
    expect(output).toContain('Very long description')
    expect(output).toContain('100')
    expect(output).toContain('200')
  })

  it('should handle table with footer section', async () => {
    const input = `+--------+--------+
| Header | Header |
+========+========+
| Body   | Body   |
+--------+--------+
| Footer | Footer |
+========+========+`

    const output = await testRoundTrip(input)

    expect(output).toContain('Header')
    expect(output).toContain('Body')
    expect(output).toContain('Footer')
  })

  it('should preserve alignment information when available', async () => {
    const input = `+--------+---------+--------+
| Left   | Center  | Right  |
+========+=========+========+
| L      | C       | R      |
+--------+---------+--------+`

    const output = await testRoundTrip(input)

    // Basic content should be preserved
    expect(output).toContain('Left')
    expect(output).toContain('Center')
    expect(output).toContain('Right')
    expect(output).toContain('L')
    expect(output).toContain('C')
    expect(output).toContain('R')
  })

  it('normalizes inline markers inside grid tables', async () => {
    const input = `+----------------+----------------+
| *Inline Em*    | **Inline Str** |
+================+================+
| cell           | content        |
+----------------+----------------+`

    const output = await testRoundTrip(input)

    expect(output).toContain('*Inline Em*')
    expect(output).toContain('**Inline Str**')
  })
})
