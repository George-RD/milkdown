// Test the adobe remark-gridtables plugin directly
async function testAdobePlugin() {
    // Import from the actual installed package
    const remarkGridTables = (await import('@adobe/remark-gridtables')).default;
    const { remark } = await import('remark');
    
    const markdown = `
+-------+-------+-------+
| Col 1 | Col 2 | Col 3 |
+=======+=======+=======+
| A     | B     | C     |
+-------+-------+-------+
`;

    console.log('Testing @adobe/remark-gridtables directly...\n');
    console.log('Input markdown:');
    console.log(markdown);
    
    try {
        const processor = remark().use(remarkGridTables);
        const ast = processor.parse(markdown);
        const processedAst = await processor.run(ast);
        
        console.log('\nProcessed AST:');
        console.log(JSON.stringify(processedAst, null, 2));
        
        // Check for grid table nodes
        const hasGridTable = JSON.stringify(processedAst).includes('gridTable');
        console.log('\n✓ Has gridTable nodes:', hasGridTable);
        
        if (!hasGridTable) {
            console.log('\n✗ The @adobe/remark-gridtables plugin is NOT working!');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testAdobePlugin();