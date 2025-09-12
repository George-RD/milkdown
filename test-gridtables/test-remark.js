import { remark } from 'remark';
import remarkGridTables from '@adobe/remark-gridtables';

const markdown = `
# Test Grid Table

+-------+-------+-------+
| Col 1 | Col 2 | Col 3 |
+=======+=======+=======+
| A     | B     | C     |
+-------+-------+-------+
| D     | E     | F     |
+-------+-------+-------+
`;

async function test() {
    const processor = remark().use(remarkGridTables);
    const ast = processor.parse(markdown);
    console.log('AST:', JSON.stringify(ast, null, 2));
    
    // Check if gridTable nodes exist
    const hasGridTable = JSON.stringify(ast).includes('gridTable');
    console.log('Has gridTable nodes:', hasGridTable);
}

test().catch(console.error);