
const fs = require('fs');
const path = 'a:\\Valori\\4.6\\src\\legacy.js';

try {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    let found = false;
    lines.forEach((line, index) => {
        if (line.includes('const renderPortfolio') || line.includes('function renderPortfolio') || line.includes('renderPortfolio =')) {
            console.log(`Found at line ${index + 1}: ${line.trim()}`);
            found = true;
        }
    });
    if (!found) console.log("Not found definition.");

    // Also search for "arrow-left" to see the button code if it exists
    lines.forEach((line, index) => {
        if (line.includes('arrow-left') && line.includes('onclick')) {
            console.log(`Button at line ${index + 1}: ${line.trim()}`);
        }
    });

} catch (err) {
    console.error('Error:', err);
}
