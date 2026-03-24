const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.startsWith('legacy_') && f.endsWith('.js'));

for (const f of files) {
    const filePath = path.join(dir, f);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Fix spaces around <div and </div>
    let updated = content
        .replace(/<\s+div/g, '<div')
        .replace(/<\/\s+div\s*>/g, '</div>');
        
    // Fix spaces around < !-- -->
    updated = updated
        .replace(/<\s+!--/g, '<!--')
        .replace(/--\s+>/g, '-->');

    if (content !== updated) {
        fs.writeFileSync(filePath, updated);
        console.log(`Fixed HTML syntax in ${f}`);
    } else {
        console.log(`No fixes needed for ${f}`);
    }
}
