const fs = require('fs');
const path = require('path');

const files = [
    path.join(__dirname, 'legacy_V0.8.js'),
    path.join(__dirname, 'legacy_V0.9.js'),
    path.join(__dirname, 'legacy_v1.1.1.js')
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // 1. Add ID to the total cell in renderIdealBudget tfoot
    content = content.replace(
        /<td class="p-3 text-center">\$\{total\.toLocaleString\('es-MX', \{ style: 'currency', currency: 'MXN' \}\)\}<\/td>/g,
        '<td id="ideal-total-${category}" class="p-3 text-center">${total.toLocaleString(\'es-MX\', { style: \'currency\', currency: \'MXN\' })}</td>'
    );

    // 2. Client mode updateIdealBudgetRow: remove updateUI and replace with total calculation
    content = content.replace(
        /updateUI\(\); \/\/ Re-render totals/g,
        `const total = state.idealBudget[category].reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
            const totalTd = document.getElementById(\`ideal-total-\${category}\`);
            if (totalTd) totalTd.textContent = total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
            else updateUI();`
    );

    // 3. Coach mode updateIdealBudgetRow: remove updateUI and replace with total calculation
    let targetComment = `// We could update category totals here if there were specific footer IDs, 
                // but since renderIdealBudget is quite declarative, a full updateUI might be safer 
                // or we can add precise IDs. Let's trigger updateUI to be sure for now as it's not a huge table.
                updateUI();`;

    // We can just use a regex for the coach mode updateUI
    content = content.replace(
        /\/\/ We could update category totals here if there were specific footer IDs,\s*\/\/ but since renderIdealBudget is quite declarative, a full updateUI might be safer \s*\/\/ or we can add precise IDs\. Let's trigger updateUI to be sure for now as it's not a huge table\.\s*updateUI\(\);/g,
        `const total = state.budgetData.idealBudget[category].reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
                const totalTd = document.getElementById(\`ideal-total-\${category}\`);
                if (totalTd) totalTd.textContent = total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
                else updateUI();`
    );

    // 4. deleteIdealBudgetRow: we need to handle the removed row and recalculate the total
    // We already replaced tr.remove() in previous prompts to:
    // const tr = avgTd.closest('tr');
    // if (tr) tr.remove();
    // } else {
    //     updateUI();
    // }

    // So let's replace:
    // if (tr) tr.remove();
    // } else {
    // with:
    // if (tr) tr.remove();
    // const list = state.idealBudget[category] || state.budgetData.idealBudget[category];
    // const total = list ? list.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0) : 0;
    // const totalTd = document.getElementById(`ideal-total-${category}`);
    // if (totalTd) totalTd.textContent = total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    // } else {

    content = content.replace(
        /if \(tr\) tr\.remove\(\);\s*\}\s*else\s*\{/g,
        `if (tr) tr.remove();
            const list = state.idealBudget[category] || state.budgetData.idealBudget[category];
            const total = list ? list.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0) : 0;
            const totalTd = document.getElementById(\`ideal-total-\${category}\`);
            if (totalTd) totalTd.textContent = total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
        } else {`
    );

    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
});
