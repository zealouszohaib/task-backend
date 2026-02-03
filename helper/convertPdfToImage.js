const pdf = require('pdf-poppler');
const fs = require('fs');
const path = require('path');

async function convertPdfToImage(pdfPath) {
    const outDir = path.join(__dirname, '..', 'upload');
    const options = {
        format: 'png',
        out_dir: outDir,
        out_prefix: 'orgchart',
        scale: 5000,
    };

    try {
        await pdf.convert(pdfPath, options);

        // List all generated images
        const files = fs.readdirSync(outDir);
        const imagePaths = files
            .filter(file => file.startsWith('orgchart-') && file.endsWith('.png'))
            .map(file => path.join(outDir, file));

        return imagePaths;
    } catch (error) {
        console.error('❌ PDF conversion failed:', error);
        throw error;
    }
}

module.exports = convertPdfToImage;