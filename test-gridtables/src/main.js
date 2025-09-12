import { Editor, rootCtx, defaultValueCtx } from '../../packages/core/lib/index.js';
import { commonmark } from '../../packages/plugins/preset-commonmark/lib/index.js';
import { history } from '../../packages/plugins/plugin-history/lib/index.js';
import { clipboard } from '../../packages/plugins/plugin-clipboard/lib/index.js';
import { gridTables } from '../../packages/plugins/plugin-gridtables/lib/index.js';
import { nord } from '../../packages/plugins/theme-nord/lib/index.js';
import '../../packages/plugins/theme-nord/lib/style.css';

let editor;

const defaultContent = `# Grid Tables Test

## Simple Table

+-------+-------+-------+
| Col 1 | Col 2 | Col 3 |
+=======+=======+=======+
| A     | B     | C     |
+-------+-------+-------+
| D     | E     | F     |
+-------+-------+-------+

## Regular Markdown

You can mix grid tables with regular markdown content.

- List item 1
- List item 2
- **Bold text** and *italic text*

## Complex Grid Table

+---------------+---------------+---------------+
| Feature       | Status        | Notes         |
+===============+===============+===============+
| Grid Tables   | Testing       | In progress   |
+---------------+---------------+---------------+
| Parsing       | Complete      | Works well    |
+---------------+---------------+---------------+
| Rendering     | Complete      | Looks good    |
+---------------+---------------+---------------+
| Editing       | In Progress   | Being tested  |
+---------------+---------------+---------------+
`;

async function createEditor() {
    editor = Editor.make()
        .config(ctx => {
            ctx.set(rootCtx, document.getElementById('editor'));
            ctx.set(defaultValueCtx, defaultContent);
        })
        .config(nord)
        .use(commonmark)
        .use(gridTables)
        .use(history)
        .use(clipboard);
    
    await editor.create();
    console.log('Editor initialized with gridtables plugin');
    return editor;
}

// Initialize editor
createEditor().catch(console.error);

// Button event listeners
document.getElementById('insert-simple').addEventListener('click', () => {
    const table = `
+-------+-------+-------+
| Col A | Col B | Col C |
+=======+=======+=======+
| 1     | 2     | 3     |
+-------+-------+-------+
| 4     | 5     | 6     |
+-------+-------+-------+

`;
    console.log('Inserting simple table');
});

document.getElementById('insert-complex').addEventListener('click', () => {
    const table = `
+------------------+------------------+------------------+
| **Feature**      | **Status**       | **Priority**     |
+==================+==================+==================+
| Grid Tables      | ✅ Implemented   | High             |
+------------------+------------------+------------------+
| Cell Spanning    | 🚧 In Progress   | Medium           |
+------------------+------------------+------------------+
| Auto-formatting  | 📋 Planned       | Low              |
+------------------+------------------+------------------+
| Keyboard Nav     | 🚧 In Progress   | High             |
+------------------+------------------+------------------+

`;
    console.log('Inserting complex table');
});

document.getElementById('get-markdown').addEventListener('click', () => {
    console.log('Getting markdown output');
});

document.getElementById('clear').addEventListener('click', () => {
    console.log('Clearing editor');
});