const fs = require('fs');
const path = require('path');

const dir = 'webapp/view/fragments/analytics/';
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (file.endsWith('.xml')) {
        let p = path.join(dir, file);
        let content = fs.readFileSync(p, 'utf8');

        // Remove button with press="onChartToggleFullScreen"
        let newContent = content.replace(/<Button[^>]*press="onChartToggleFullScreen"[\s\S]*?<\/Button>/g, '');
        
        fs.writeFileSync(p, newContent);
        console.log('Processed', file);
    }
});
