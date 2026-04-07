const fs = require('fs');
const path = require('path');

const dir = 'webapp/view/fragments/analytics/';
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (file.endsWith('.xml')) {
        let p = path.join(dir, file);
        let content = fs.readFileSync(p, 'utf8');
        
        // Remove button that has icon=sap-icon://filter and its contents correctly.
        // We will use a regex to match from <Button to </Button> where it contains sap-icon://filter
        
        let newContent = content.replace(/<Button[^>]*icon="sap-icon:\/\/filter"[\s\S]*?<\/Button>/g, '');
        // Also remove <ToolbarSeparator /> right before it if we want it to look clean, but let's stick to just the button first, or maybe the separator too.
        
        // Let's refine:
        newContent = newContent.replace(/<ToolbarSeparator \/>\s*<Button[^>]*icon="sap-icon:\/\/filter"[\s\S]*?<\/Button>/g, '');
        
        fs.writeFileSync(p, newContent);
        console.log('Processed', file);
    }
});
