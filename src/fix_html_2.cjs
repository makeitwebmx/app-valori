
const fs = require('fs');
const path = 'a:\\Valori\\4.5\\src\\legacy.js';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Fix closing tags
    content = content.replace(/<\/ div>/g, '</div>');
    content = content.replace(/<\/ ul>/g, '</ul>');
    content = content.replace(/<\/ tr>/g, '</tr>');
    content = content.replace(/<\/ option>/g, '</option>');
    content = content.replace(/<\/ i>/g, '</i>');
    content = content.replace(/<\/ button>/g, '</button>');

    // Fix any remaining open tags not caught
    content = content.replace(/< div/g, '<div');
    content = content.replace(/< tr/g, '<tr');
    content = content.replace(/< td/g, '<td');
    content = content.replace(/< th/g, '<th');
    content = content.replace(/< li/g, '<li');
    content = content.replace(/< ul/g, '<ul');
    content = content.replace(/< span/g, '<span');
    content = content.replace(/< button/g, '<button');
    content = content.replace(/< i/g, '<i');
    content = content.replace(/< input/g, '<input');
    content = content.replace(/< img/g, '<img');

    // Fix attributes spaces (e.g. data - lucide) - very aggressive, be careful?
    // Observed: data - lucide="..."
    content = content.replace(/data - lucide/g, 'data-lucide');
    content = content.replace(/class="/g, 'class="'); // sanity check

    // Fix closing tag with space after slash: < /div>
    content = content.replace(/<\/\s+div>/g, '</div>');
    content = content.replace(/<\/\s+span>/g, '</span>');
    content = content.replace(/<\/\s+button>/g, '</button>');

    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully fixed more HTML tags in legacy.js');
} catch (err) {
    console.error('Error fixing invalid HTML:', err);
}
