const fsSync = require('fs');
const fs = require('fs/promises');
const path = require('path');
const potrace = require('potrace');
const Jimp = require('jimp');

const inputDirs = [
    { name: 'X32-Icons-4', invert: true },
    { name: 'X32-Icons-whiteBG/X32-Icons-whiteBG', invert: false }
];

const outputDir = path.join(__dirname, '../frontend/public/icons');

async function processIcon(inputPath, outputPath, invert) {
    return new Promise(async (resolve, reject) => {
        try {
            // Load BMP
            const image = await Jimp.read(inputPath);
            
            // X32 Native icons usually have white graphics on black or dark backgrounds.
            // Potrace natively traces Black shapes.
            if (invert) {
                image.invert();
            }

            // Aggressive border wipe
            const w = image.bitmap.width;
            const h = image.bitmap.height;
            // X32 BMPs have a thin bounding box around the perimeter. Mask the outer 4 pixels to WHITE (Potrace ignores white).
            image.scan(0, 0, w, h, function(x, y, idx) {
                if (x < 4 || x > w - 4 || y < 4 || y > h - 4) {
                    this.bitmap.data[idx + 0] = 255; // R
                    this.bitmap.data[idx + 1] = 255; // G
                    this.bitmap.data[idx + 2] = 255; // B
                }
            });

            // High contrast threshold extraction
            image.contrast(1);

            const buffer = await image.getBufferAsync(Jimp.MIME_PNG); // potrace parses PNG well
            
            potrace.trace(buffer, { color: 'currentColor', background: 'transparent' }, (err, svg) => {
                if (err) {
                    return reject(err);
                }
                
                // Save out vectorized SVG 
                fsSync.writeFileSync(outputPath, svg);
                resolve();
            });
        } catch(e) {
            reject(e);
        }
    });
}

async function runPipeline() {
    await fs.mkdir(outputDir, { recursive: true });
    
    let processedFiles = 0;

    for (const group of inputDirs) {
        const dirPath = path.join(__dirname, '..', group.name);
        try {
            const files = await fs.readdir(dirPath);
            console.log(`\nScanning [${group.name}]...`);
            for (const file of files) {
                if (file.toLowerCase().endsWith('.bmp')) {
                    const inputPath = path.join(dirPath, file);
                    const baseName = path.basename(file, path.extname(file));
                    const safeName = baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const outputPath = path.join(outputDir, `${safeName}.svg`);
                    
                    try {
                        await processIcon(inputPath, outputPath, group.invert);
                        processedFiles++;
                    } catch(e) {
                        console.error(`- Failed tracing ${file}:`, e.message);
                    }
                }
            }
        } catch(e) {
            console.error(`Failed to read directory [${dirPath}]:`, e.message);
        }
    }

    console.log(`\nSVG Conversion Pipeline Finished. Produced ${processedFiles} modular vector assets into /frontend/public/icons/`);
}

runPipeline();
