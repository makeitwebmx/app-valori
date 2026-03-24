
const fs = require('fs');
const path = 'a:\\Valori\\4.6\\src\\legacy.js';

try {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.includes('renderInvestorQuiz =')) {
            console.log(`Found renderInvestorQuiz at line ${index + 1}: ${line.trim()}`);
        }
    });

} catch (err) {
    console.error('Error:', err);
}
