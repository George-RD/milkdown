import { remark } from '../node_modules/remark/index.js';
import remarkGridTables from '../node_modules/@adobe/remark-gridtables/index.js';

const markdown = `
+-------+-------+-------+
| Col 1 | Col 2 | Col 3 |
+=======+=======+=======+
| A     | B     | C     |
+-------+-------+-------+
| D     | E     | F     |
+-------+-------+-------+
`;

async function test() {
    console.log('Testing remark-gridtables parser...\n');
    console.log('Input markdown:');
    console.log(markdown);
    
    try {
        const processor = remark().use(remarkGridTables);
        const ast = await processor.run(processor.parse(markdown));
        
        console.log('\nParsed AST:');
        console.log(JSON.stringify(ast, null, 2));
        
        // Check if gridTable nodes exist
        const hasGridTable = JSON.stringify(ast).includes('gridTable');
        console.log('\n✓ Has gridTable nodes:', hasGridTable);
        
        if (!hasGridTable) {
            console.log('\n✗ Grid table was NOT parsed correctly!');
            console.log('The AST should contain nodes with type "gridTable"');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

test();