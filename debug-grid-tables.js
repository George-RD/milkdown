import { Editor, defaultValueCtx, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gridTables } from '@milkdown/kit/plugin/gridtables'
import { nord } from '@milkdown/theme-nord'

const gridTableMarkdown = `
+----------------+--------+--------+
| Grid Tables    | Are    | Cool   |
+================+========+========+
| col 1 is       | left-  | $1600  |
| left-aligned   | align  |        |
+----------------+--------+--------+
| col 2 is       | cent-  | $12    |
| centered       | ered   |        |
+----------------+--------+--------+
| col 3 is right | right- | $1     |
| aligned        | align  |        |
+----------------+--------+--------+
`;

const testContainer = document.createElement('div');
document.body.appendChild(testContainer);

console.log('Testing grid tables parsing...');

const editor = Editor.make()
  .config(ctx => {
    ctx.set(rootCtx, testContainer);
    ctx.set(defaultValueCtx, gridTableMarkdown);
  })
  .config(nord)
  .use(gridTables)  // Load BEFORE commonmark
  .use(commonmark)
  
editor.create().then(() => {
  console.log('Editor created successfully');
  console.log('DOM content:', testContainer.innerHTML);
  
  // Check for tables
  const tables = testContainer.querySelectorAll('table');
  console.log('Tables found:', tables.length);
  
  // Check for unparsed markdown
  if (testContainer.textContent?.includes('+---') || testContainer.textContent?.includes('+===')) {
    console.log('⚠️  Grid table markdown appears unparsed!');
    console.log('Text content:', testContainer.textContent);
  } else {
    console.log('✅ Grid table appears to be parsed correctly');
  }
}).catch(err => {
  console.error('Editor creation failed:', err);
});