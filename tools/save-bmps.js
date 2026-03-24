const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../X32-Icons-4');
const destDir = path.join(__dirname, '../frontend/public/icons-bmp');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir).filter(f => f.toLowerCase().endsWith('.bmp'));
let count = 0;

for (const file of files) {
    const safeName = path.basename(file, '.bmp').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, `${safeName}.bmp`));
    count++;
}

console.log(`Successfully mapped ${count} raw BMP files to /frontend/public/icons-bmp/`);
